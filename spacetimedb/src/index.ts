// server api

import { ScheduleAt } from 'spacetimedb';
import { schema, table, t, SenderError  } from 'spacetimedb/server';

console.log("db game");

const user = table(
  { 
    name: 'user', 
    public: true,
  },
  {
    identity: t.identity().primaryKey(),
    name: t.string().optional(),
    online: t.bool(),
  }
);

const message = table(
  { name: 'message', public: true },
  {
    sender: t.identity(),
    sent: t.timestamp(),
    text: t.string(),
  }
);

const PlayerInput = table(
  { name: 'player_input', public: true },
  {
    identity: t.identity().primaryKey(),
    directionX: t.f32(),   // -1..1 left/right (or WASD/analog)
    directionY: t.f32(),   // -1..1 forward/back (for top-down 2D)
    jump: t.bool(),        // pressed this tick?
    lastUpdated: t.timestamp(),  // ctx.timestamp millis, for optional expiry
  }
);

const Entity = table(
  { name: 'entity', public: true },
  {
    identity: t.identity().primaryKey(),
    x: t.f64(),
    y: t.f64(),          // in your case: y = up in 3D view, but gameplay plane x/z?
    z: t.f64(),          // if full 3D → store z too
    vx: t.f64(),         // velocity
    vy: t.f64(),
    vz: t.f64(),
  }
);
// https://spacetimedb.com/docs/tables/column-types
// Define a nested object type for coordinates
const Coordinates3D = t.object('Coordinate3D', {
  x: t.f64(),
  y: t.f64(),
  z: t.f64(),
});

const Obstacle3D = table({
  name: 'obstacle3d', public: true
},{
  id: t.u64().primaryKey().autoInc(),
  position: Coordinates3D,
  size:Coordinates3D
});

const SimulationTick = table({ 
  name: 'simulation_tick',
  scheduled: (): any => update_simulation_tick
},{
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
  lastTickTs: t.u64(),                   // ctx.timestamp.millis of last tick ???
});

//-----------------------------------------------
// SPACETIMEDB SCHEMA TABLES
//-----------------------------------------------
const spacetimedb = schema({
  user,
  message,
  Entity,
  PlayerInput,
  SimulationTick,
  Obstacle3D
});

export const add_two_numbers = spacetimedb.procedure(
    { lhs: t.u32(), rhs: t.u32() },
    t.u64(),
    (ctx, { lhs, rhs }) => BigInt(lhs) + BigInt(rhs),
);

function validateName(name: string) {
  if (!name) {
    throw new SenderError('Names must not be empty');
  }
}
//-----------------------------------------------
// SET USER NAME
//-----------------------------------------------
export const set_name = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
  // console.info("Name: ",name);
  validateName(name);
  const user = ctx.db.user.identity.find(ctx.sender);
  if (!user) {
    throw new SenderError('Cannot set name for unknown user');
  }
  ctx.db.user.identity.update({ ...user, name });
});

function validateMessage(text: string) {
  if (!text) {
    throw new SenderError('Messages must not be empty');
  }
}
//-----------------------------------------------
// SEND MESSAGE
//-----------------------------------------------
export const send_message = spacetimedb.reducer({ text: t.string() }, (ctx, { text }) => {
  validateMessage(text);
  console.info(`User ${ctx.sender}: ${text}`);
  ctx.db.message.insert({
    sender: ctx.sender,
    text,
    sent: ctx.timestamp,
  });
});

//-----------------------------------------------
// UPDATE SIMULATION TICK
//-----------------------------------------------
export const update_simulation_tick = spacetimedb.reducer({ arg: SimulationTick.rowType }, (ctx, { arg }) => {
  // Invoked automatically by the scheduler
  // arg.message, arg.scheduled_at, arg.scheduled_id
  // console.log('update_simulation_tick');
  // console.log(arg);

  const fixedDtMs = 50;           // your fixed tick rate
  const dt = fixedDtMs / 1000;    // in seconds

  for (const player of ctx.db.PlayerInput.iter()){
    // console.log(player);
    // console.log(player.identity.toHexString(), " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);
    // console.log("player input >>", " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);

    const entity = ctx.db.Entity.identity.find(player.identity);
    // console.log(entity);
    if(entity){

      const speed = 5.0; // units per second
      if(player.directionX == 0){
        entity.vx = 0;
      }else{
        entity.vx += player.directionX * speed * dt;
      }

      if(player.directionY == 0){
        entity.vz = 0;
      }else{
        entity.vz += player.directionY * speed * dt;
      }
      
      // Integrate position
      entity.x += entity.vx * dt;
      entity.z += entity.vz * dt;

      //update data from table row match
      ctx.db.Entity.identity.update({
        ...entity,
      })
      // console.log("Position x: ", entity.x , " z: ", entity.z );

    }else{// if does not exist create tmp
       ctx.db.Entity.insert({
         identity: player.identity,
         x: 0,
         y: 0,
         z: 0,
         vx: 0,
         vy: 0,
         vz: 0
       });
    }
  }
});
//-----------------------------------------------
// PLAYER INPUT
//-----------------------------------------------
// Client calls this to send/update their input
export const update_input = spacetimedb.reducer(
  {
    directionX: t.f32(),
    directionY: t.f32(),
    jump: t.bool(),
  },
  (ctx, args) => {
    const id = ctx.sender; // or ctx.caller if different
    if (!id) throw new SenderError("Not authenticated");

    const player_input = ctx.db.PlayerInput.identity.find(id);
    if(player_input){// update
      console.log("update input x: ", args.directionX, " y: ", args.directionY, " Jump:", args.jump);
      ctx.db.PlayerInput.identity.update({...player_input,
        directionX:args.directionX,
        directionY:args.directionY,
        jump:args.jump
      });
    }else{// create
      console.log("create input");
      ctx.db.PlayerInput.insert({
        identity: id,
        directionX: args.directionX,
        directionY: args.directionY,
        jump: args.jump,
        lastUpdated: ctx.timestamp,
      });
    }
  }
);

//-----------------------------------------------
// PLAYER SET POSITION
//-----------------------------------------------

export const set_player_position = spacetimedb.reducer({
  x:t.f64(),
  y:t.f64(),
  z:t.f64(),
},(ctx, args) => {
  const entity = ctx.db.Entity.identity.find(ctx.sender);
  console.log("entity: ", entity);
  if(entity){
    entity.x = 0;
    entity.y = 0;
    entity.z = 0;
    ctx.db.Entity.identity.update(entity);
  }
});

//-----------------------------------------------
// SPAWN OBSTACLE
//-----------------------------------------------
export const create_obstacle = spacetimedb.reducer({
  x:t.f64(),
  y:t.f64(),
  z:t.f64(),
},(ctx, args) => {
  console.log("create obstacle");


  ctx.db.Obstacle3D.insert({
    position: {x:args.x,y:args.y,z:args.z},
    size: {x:1,y:1,z:1},
    id: 0n
  });
});

export const update_obstacle_position_id = spacetimedb.reducer({
  id:t.u64(),
  x:t.f64(),
  y:t.f64(),
  z:t.f64(),
},(ctx, args) => {
  console.log("update obstacle")
  let obstacle = ctx.db.Obstacle3D.id.find(args.id);
  if(obstacle){
    ctx.db.Obstacle3D.id.update({...obstacle,
      position: {x:args.x,y:args.y,z:args.z}
    });
  }
});

export const delete_obstacle = spacetimedb.reducer({
  id: t.u64()
},(ctx, {id})=>{
  console.log("delete id:", id);
  ctx.db.Obstacle3D.id.delete(id);
})


//-----------------------------------------------
// shop list
//-----------------------------------------------
export const shop_check_inventory = spacetimedb.reducer({},(ctx,{})=>{
  console.log("check shop inventory");
});


//-----------------------------------------------
// game config
//-----------------------------------------------
// prototype view range render for props
// min to max
export const game_view_range = spacetimedb.reducer({},(ctx,{})=>{
  console.log("prototype");
});

// Testing
export const game_start_tick = spacetimedb.reducer({tick:t.i8()},(ctx,{tick})=>{
  console.log("prototype");
  let isFound = false;
  console.log("SimulationTick Counts:", ctx.db.SimulationTick.count())

  if(ctx.db.SimulationTick.count() > 0n){
    console.info("There is already sim run!!!");
    return;
  }

  if (ctx.db.SimulationTick.count() == 0n){

  }

  if(isFound == false){
    ctx.db.SimulationTick.insert({
      scheduled_id: 0n,
      // scheduled_at: ScheduleAt.interval(5_000_000n),// Schedule to run every 5 seconds (5,000,000 microseconds)
      scheduled_at: ScheduleAt.interval(33_333n), // 30 tick sec???
      lastTickTs: 0n,
    });
  }
});

export const game_stop_tick = spacetimedb.reducer({tick:t.i8()},(ctx,{tick})=>{
  console.log("prototype");

  if (ctx.db.SimulationTick.count() == 0n){
    
  }

  // ctx.db.SimulationTick.scheduled_id.delete(some_scheduled_id);
  // const allTicks = Array.from(ctx.db.simulation_tick.iter());
  // testing...
  const allTicks = Array.from(ctx.db.SimulationTick.iter());
  console.log(allTicks);
  if(allTicks.length > 0){
    ctx.db.SimulationTick.scheduled_id.delete(allTicks[0].scheduled_id);
  }

});

// Game tick set
export const game_set_tick_rate = spacetimedb.reducer({tick:t.i8()},
(ctx,{tick})=>{
  console.log("prototype");



});



//-----------------------------------------------
// init
//-----------------------------------------------

// scheduled_at: ScheduleAt.interval(16_666n),   // 60 ticks/second
// scheduled_at: ScheduleAt.interval(33_333n),   // 30 ticks/second
export const init = spacetimedb.init(ctx => {
  console.log("=============== INIT SPACETIMEDB APP NAME =========");

  ctx.db.SimulationTick.insert({
    scheduled_id: 0n,
    // scheduled_at: ScheduleAt.interval(5_000_000n),// Schedule to run every 5 seconds (5,000,000 microseconds)
    scheduled_at: ScheduleAt.interval(33_333n), // 30 tick sec???
    lastTickTs: 0n,
  });

});

//-----------------------------------------------
// onConnect
//-----------------------------------------------
export const onConnect = spacetimedb.clientConnected(ctx => {
  const user = ctx.db.user.identity.find(ctx.sender);
  console.log("SENDER: ",ctx.sender);
  if (user) {
    ctx.db.user.identity.update({ ...user, online: true });
  } else {
    ctx.db.user.insert({
      identity: ctx.sender,
      name: undefined,
      online: true,
    });
  }

});
//-----------------------------------------------
// onDisconnect
//-----------------------------------------------
export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  const user = ctx.db.user.identity.find(ctx.sender);
  if (user) {
    ctx.db.user.identity.update({ ...user, online: false });
  } else {
    console.warn(
      `Disconnect event for unknown user with identity ${ctx.sender}`
    );
  }
});
//-----------------------------------------------
// EXPORT SPACETIMEDB
//-----------------------------------------------
export default spacetimedb;
console.log("spacetime-app-game");
