// server api

import { ScheduleAt } from 'spacetimedb';
import { schema, table, t, SenderError  } from 'spacetimedb/server';
//console.log("db game");

// Add near top (or in module scope)
const PLAYER_RADIUS = 0.45;        // tune this

const PLAYER_RADIUS_XZ = 0.45;     // horizontal radius
const PLAYER_RADIUS_Y  = 0.45;     // vertical (can be 0.9–1.0 if capsule-like)

// Helper function — pure math, no DB access
// 2D. 3D three js top view in 2D for x,z ???
function checkAABBOverlap(
  px: number, pz: number,           // player center
  ox: number, oz: number,           // obstacle center
  hw: number, hd: number            // obstacle half-width, half-depth
): boolean {
  const left   = ox - hw;
  const right  = ox + hw;
  const top    = oz + hd;           // assuming +z = "forward" ???
  const bottom = oz - hd;

  return px + PLAYER_RADIUS > left   &&
         px - PLAYER_RADIUS < right  &&
         pz + PLAYER_RADIUS > bottom &&
         pz - PLAYER_RADIUS < top;
}

function checkAABBOverlap3D(
  px: number, py: number, pz: number,           // player center
  ox: number, oy: number, oz: number,           // obstacle center
  hw: number, hh: number, hd: number            // obstacle half-sizes: x,y,z
): boolean {
  return (
    px + PLAYER_RADIUS_XZ > ox - hw &&
    px - PLAYER_RADIUS_XZ < ox + hw &&
    py + PLAYER_RADIUS_Y  > oy - hh &&
    py - PLAYER_RADIUS_Y  < oy + hh &&
    pz + PLAYER_RADIUS_XZ > oz - hd &&
    pz - PLAYER_RADIUS_XZ < oz + hd
  );
}



//-----------------------------------------------
// OBJECT
//-----------------------------------------------
// https://spacetimedb.com/docs/tables/column-types
// Define a nested object type for coordinates
const Coordinates3D = t.object('Coordinate3D', {
  x: t.f64(),
  y: t.f64(),
  z: t.f64(),
});
//-----------------------------------------------
// TABLES
//-----------------------------------------------
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
    position: Coordinates3D,
    velocity: Coordinates3D,
    size: Coordinates3D,
    direction: Coordinates3D,
  }
);

const Obstacle3D = table({
  name: 'obstacle3d', public: true
},{
  id: t.u64().primaryKey().autoInc(),
  position: Coordinates3D,
  size:Coordinates3D
});

const SimulationTick = table({ 
  name: 'simulation_tick',
  // scheduled: (): any => update_simulation_tick
  scheduled: (): any => update_simulation_tick_collision2d
},{
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
  // lastTickTs: t.u64(),                   // ctx.timestamp.millis of last tick ???
  last_tick_timestamp:t.timestamp()
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
  const now = ctx.timestamp;                    // current wall time
  let dt_accumulator_s = 0;                       // we'll compute this

  // ── Option A: Most common & simplest (variable timestep) ────────────────
  //     Good enough for movement, not perfect for physics/collisions

  if (arg.last_tick_timestamp) {        // not first tick
    const elapsed_ms = now.since(arg.last_tick_timestamp).millis;
    // console.log("elapsed_ms: ", elapsed_ms);
    dt_accumulator_s = elapsed_ms / 1000.0;       // in seconds
  } else {
    dt_accumulator_s = 0.033;                     // first tick guess / fallback
  }
  // console.log("dt_accumulator_s: ", dt_accumulator_s);

  // const fixedDtMs = 50;           // your fixed tick rate
  // const dt = fixedDtMs / 1000;    // in seconds

  for (const player of ctx.db.PlayerInput.iter()){
    // console.log(player);
    // console.log(player.identity.toHexString(), " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);
    // console.log("player input >>", " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);

    const entity = ctx.db.Entity.identity.find(player.identity);
    // console.log(entity);
    if(entity){

      const speed = 5.0; // units per second
      if(player.directionX == 0){
        entity.velocity.x = 0;
      }else{
        entity.velocity.x += player.directionX * speed * dt_accumulator_s;
      }

      if(player.directionY == 0){
        entity.velocity.z = 0;
      }else{
        entity.velocity.z += player.directionY * speed * dt_accumulator_s;
      }
      
      // Integrate position
      entity.position.x += entity.velocity.x * dt_accumulator_s;
      entity.position.z += entity.velocity.z * dt_accumulator_s;

      //update data from table row match
      ctx.db.Entity.identity.update({
        ...entity,
      })
      // console.log("Position x: ", entity.x , " z: ", entity.z );

    }else{// if does not exist create tmp
       ctx.db.Entity.insert({
         identity: player.identity,
         position:{x: 0, y: 0, z: 0 },
         velocity:{x: 0, y: 0, z: 0 },
         size:{x: 1, y: 1, z: 1 },
         direction:{x: 0, y: 0, z: 0 },
       });
    }
  }


  // ── Save the time for next call ─────────────────────────────────────────
  ctx.db.SimulationTick.scheduled_id.update({
    ...arg,
    last_tick_timestamp: now,
    // accumulator: arg.accumulator   // if using fixed style
  });
});

//-----------------------------------------------
// UPDATE SIMULATION TICK COLLISION
//-----------------------------------------------
export const update_simulation_tick_collision2d = spacetimedb.reducer({ arg: SimulationTick.rowType }, (ctx, { arg }) => {
  const now = ctx.timestamp;                    // current wall time
  let dt = 0;                       // we'll compute this
  if (arg.last_tick_timestamp) {        // not first tick
    const elapsed_ms = now.since(arg.last_tick_timestamp).millis;
    // console.log("elapsed_ms: ", elapsed_ms);
    dt = elapsed_ms / 1000.0;       // in seconds
  } else {
    dt = 0.033;                     // first tick guess / fallback
  }
  //---------------------------------------------
  // logic
  //---------------------------------------------

  //curent one player
  // console.log(player);
  // console.log(player.identity.toHexString(), " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);
  // console.log("player input >>", " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);
  // console.log(ctx.sender);
  const input_player = ctx.db.PlayerInput.identity.find(ctx.identity);
  // console.log(input_player);
  if(!input_player){
    return;
  }

  const entity = ctx.db.Entity.identity.find(ctx.identity);
  // console.log(entity);
  // console.log(entity?.x, " : ", entity?.y);
  
  if(entity){

    const speed = 5.0; // units per second

    // ── Apply input acceleration ───────────────────────────────────────
    if(input_player.directionX == 0){
      entity.velocity.x = 0;
    }else{
      entity.velocity.x += input_player.directionX * speed * dt;
    }
    if(input_player.directionY == 0){
      entity.velocity.z = 0;
    }else{
      entity.velocity.z += input_player.directionY * speed * dt;
    }
    
    // ── Movement prediction + collision ────────────────────────────────────────
    let newPos = {
      x: entity.position.x + entity.velocity.x * dt,
      y: entity.position.y + entity.velocity.y * dt,
      z: entity.position.z + entity.velocity.z * dt,
    };

    let collided = false;

    for (const obs of ctx.db.Obstacle3D.iter()) {
      const hx = obs.size.x / 2;
      const hy = obs.size.y / 2;
      const hz = obs.size.z / 2;

      if (!checkAABBOverlap3D(
        newPos.x, newPos.y, newPos.z,
        obs.position.x, obs.position.y, obs.position.z,
        hx, hy, hz
      )) {
        continue;
      }

      collided = true;

      // ── Compute signed penetration on each axis ───────────────────────
      const penX = [
        (newPos.x + PLAYER_RADIUS_XZ) - (obs.position.x - hx),   // left/negative x
        (obs.position.x + hx) - (newPos.x - PLAYER_RADIUS_XZ),   // right/positive x
      ];
      const penY = [
        (newPos.y + PLAYER_RADIUS_Y)  - (obs.position.y - hy),
        (obs.position.y + hy)  - (newPos.y - PLAYER_RADIUS_Y),
      ];
      const penZ = [
        (newPos.z + PLAYER_RADIUS_XZ) - (obs.position.z - hz),
        (obs.position.z + hz) - (newPos.z - PLAYER_RADIUS_XZ),
      ];

      // Pick the smallest **positive** penetration
      let minPen = Infinity;
      let bestAxis: 'x' | 'y' | 'z' | null = null;
      let bestSign = 0; // which side

      // X
      if (penX[0] > 0 && penX[0] < minPen) { minPen = penX[0]; bestAxis = 'x'; bestSign = -1; }
      if (penX[1] > 0 && penX[1] < minPen) { minPen = penX[1]; bestAxis = 'x'; bestSign = +1; }
      // Y
      if (penY[0] > 0 && penY[0] < minPen) { minPen = penY[0]; bestAxis = 'y'; bestSign = -1; }
      if (penY[1] > 0 && penY[1] < minPen) { minPen = penY[1]; bestAxis = 'y'; bestSign = +1; }
      // Z
      if (penZ[0] > 0 && penZ[0] < minPen) { minPen = penZ[0]; bestAxis = 'z'; bestSign = -1; }
      if (penZ[1] > 0 && penZ[1] < minPen) { minPen = penZ[1]; bestAxis = 'z'; bestSign = +1; }

      if (bestAxis && minPen < Infinity) {
        // ── Correct only one axis (the one with least penetration) ─────
        if (bestAxis === 'x') {
          newPos.x = entity.position.x;           // full revert, or: -= minPen * bestSign
          entity.velocity.x *= 0.1;               // strong damping
        } else if (bestAxis === 'y') {
          newPos.y = entity.position.y;
          entity.velocity.y *= 0.1;
          // If you later add gravity: can set velocity.y = 0 when hitting floor (bestSign < 0)
        } else if (bestAxis === 'z') {
          newPos.z = entity.position.z;
          entity.velocity.z *= 0.1;
        }
      }

      // You can continue checking other obstacles (multi-collision)
      // or break; if you want to handle only first collision per tick
    }

    // ── Commit new position ─────────────────────────────────────────────
    entity.position.x = newPos.x;
    entity.position.y = newPos.y;
    entity.position.z = newPos.z;
    
    // update player position
    ctx.db.Entity.identity.update({ ...entity });

  }else{
    ctx.db.Entity.insert({
      identity: ctx.sender,
      position:{x: 0, y: 0, z: 0},
      velocity:{x: 0, y: 0, z: 0},
      size:{x: 1, y: 1, z: 1},
      direction:{x: 0, y: 0, z: 0},
    })
  }
    
  // ── Save the time for next call ─────────────────────────────────────────
  ctx.db.SimulationTick.scheduled_id.update({
    ...arg,
    last_tick_timestamp: now,
    // accumulator: arg.accumulator   // if using fixed style
  });

})

// 
// export const update_simulation_tick_blank = spacetimedb.reducer({ arg: SimulationTick.rowType }, (ctx, { arg }) => {
//   const now = ctx.timestamp;                    // current wall time
//   let dt_accumulator_s = 0;                       // we'll compute this
//   if (arg.last_tick_timestamp) {        // not first tick
//     const elapsed_ms = now.since(arg.last_tick_timestamp).millis;
//     // console.log("elapsed_ms: ", elapsed_ms);
//     dt_accumulator_s = elapsed_ms / 1000.0;       // in seconds
//   } else {
//     dt_accumulator_s = 0.033;                     // first tick guess / fallback
//   }
//   //---------------------------------------------
//   // logic
//   //---------------------------------------------
//   // ── Save the time for next call ─────────────────────────────────────────
//   ctx.db.SimulationTick.scheduled_id.update({
//     ...arg,
//     last_tick_timestamp: now,
//   });
// })


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
    const id = ctx.identity; // or ctx.caller if different
    if (!id) throw new SenderError("Not authenticated");

    const player_input = ctx.db.PlayerInput.identity.find(id);
    if(player_input){// update
      // console.log("update input x: ", args.directionX, " y: ", args.directionY, " Jump:", args.jump);
      ctx.db.PlayerInput.identity.update({...player_input,
        directionX:args.directionX,
        directionY:args.directionY,
        jump:args.jump
      });
    }else{// create
      // console.log("create input");
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
  const entity = ctx.db.Entity.identity.find(ctx.identity);
  console.log("entity: ", entity);
  if(entity){
    entity.position.x = 0;
    entity.position.y = 0;
    entity.position.z = 0;
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
  // console.log("create obstacle");
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
  // console.log("update obstacle")
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
  // if (ctx.db.SimulationTick.count() == 0n){}
  if(isFound == false){
    ctx.db.SimulationTick.insert({
      scheduled_id: 0n,
      // scheduled_at: ScheduleAt.interval(5_000_000n),// Schedule to run every 5 seconds (5,000,000 microseconds)
      scheduled_at: ScheduleAt.interval(33_333n), // 30 tick sec???
      // lastTickTs: 0n,
      last_tick_timestamp: ctx.timestamp,       // start "now"
    });
  }
});

export const game_stop_tick = spacetimedb.reducer({tick:t.i8()},(ctx,{tick})=>{
  console.log("prototype");
  // if (ctx.db.SimulationTick.count() == 0n){}
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
  // console.log("prototype");
  // Remove old scheduled tick if exists
  for (const old of ctx.db.SimulationTick.iter()) {
    ctx.db.SimulationTick.scheduled_id.delete(old.scheduled_id);
  }

  let interval_us: bigint;

  switch (tick) {
    case 20:
      interval_us = 50_000n;
      break;
    case 30:
      interval_us = 33_333n;     // ← most people use this for 30 Hz
      break;
    case 50:
      interval_us = 20_000n;
      break;
    case 60:
      interval_us = 16_667n;     // ← slightly more accurate than 16_666
      break;
    default:
      interval_us = 33_333n;     // fallback
      console.warn(`Unsupported tick rate ${tick}, using 30 Hz`);
  }

  ctx.db.SimulationTick.insert({
    scheduled_id: 0n,
    scheduled_at: ScheduleAt.interval(interval_us),
    // lastTickTs: 0n,   // or ctx.timestamp() if you want to start now
    last_tick_timestamp: ctx.timestamp,       // start "now"
  });

  console.log(`Game tick rate set to ${tick} Hz (${interval_us} μs)`);

  // const allTicks = Array.from(ctx.db.SimulationTick.iter());
  // if(allTicks.length > 0){
  //   ctx.db.SimulationTick.scheduled_id.delete(allTicks[0].scheduled_id);
  // }

  // ctx.db.SimulationTick.insert({
  //   scheduled_id: 0n,
  //   // scheduled_at: ScheduleAt.interval(5_000_000n),// Schedule to run every 5 seconds (5,000,000 microseconds)
  //   scheduled_at: ScheduleAt.interval(33_333n), // 30 tick sec???
  //   lastTickTs: 0n,
  // });
});

export const game_current_tick = spacetimedb.view(
  { name: 'game_current_tick', public: true },
  t.option(SimulationTick.rowType),//return row data if exist
  (ctx) => {
    // console.log("log tick???")
    // Option 1: Most common during prototyping
    for (const tick of ctx.db.SimulationTick.iter()) {
      // console.log("tick: ",tick.last_tick_timestamp);
      return tick;   // return first row found, or undefined if none
    }
    // const simulation_tick = ctx.db.SimulationTick.iter();
    // return undefined;
  }
)

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
    // lastTickTs: 0n,
    last_tick_timestamp: ctx.timestamp,       // start "now"
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
