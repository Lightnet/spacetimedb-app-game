// server api

import { ScheduleAt } from 'spacetimedb';
import { schema, table, t, SenderError  } from 'spacetimedb/server';
// import { 
//   // nanoid 
//   customAlphabet
// } from 'nanoid';
// const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);
console.log("spacetime-app-physics");

const Coordinates3D = t.object('Coordinate3D', {
  x: t.f64(),
  y: t.f64(),
  z: t.f64(),
});

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
    senderId: t.identity(),
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
    position:Coordinates3D,
    velocity:Coordinates3D,
    size:Coordinates3D,
    direction: Coordinates3D,
  }
);

const Transform3D = table(
  { name: 'transform3d', public: true },
  {
    identity: t.identity().primaryKey(),
    position:Coordinates3D,
    velocity:Coordinates3D,
    size:Coordinates3D,
  }
);

// const Body2D = table(
//   { name: 'body_2d', public: true },
//   {
//     identity: t.identity().primaryKey(),
//     x: t.f64().default(0),
//     y: t.f64().default(0),          // in your case: y = up in 3D view, but gameplay plane x/z?
//     z: t.f64().default(0),          // if full 3D → store z too
//     vx: t.f64().default(0),         // velocity
//     vy: t.f64().default(0),
//     vz: t.f64().default(0),
//     ax: t.f64().default(0),         // acceleration
//     ay: t.f64().default(0),
//     az: t.f64().default(0),
//     size_x: t.f64().default(1),
//     size_y: t.f64().default(1),
//     mass: t.f64().default(1),
//     isStatic: t.bool().default(false),
//     isKinematic: t.bool().default(false),
//     restitution: t.f64().default(0.4),
//     friction: t.f64().default(0.8),
//   }
// );

// const Test2D = table(
//   { name: 'test_2d', public: true },
//   {
//     identity: t.identity().primaryKey(),
//     // Composite types
//     position: Vector3D,
//   }
// );

//-----------------------------------------------
// TABLE SimulationTick
//-----------------------------------------------
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
  Transform3D,
  PlayerInput,
  SimulationTick,
});

/*
spacetimedb.reducer('add_test_2d', { x: t.f64(), y: t.f64(), z: t.f64() }, (ctx, { x, y, z }) => {
  ctx.db.test_2d.insert({
    // identity: ctx.sender, // Example: Use the caller's identity
    position: { x, y, z }    // Match the Coordinates object structure
  });
});
*/

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
    senderId: ctx.sender,
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
  // console.log("update_simulation_tick");
  // console.log("player input counts:", ctx.db.PlayerInput.count());

  for (const player of ctx.db.PlayerInput.iter()){
    // console.log(player);
    // console.log(player.identity.toHexString(), " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);
    // console.log("player input >>", " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);

    const entity = ctx.db.Entity.identity.find(player.identity);
    // const entity = ctx.db.Transform3D.identity.find(player.identity);
    // console.log(entity);
    if(entity){

      const speed = 5.0; // units per second
      if(player.directionX == 0){
        entity.velocity.x = 0;
      }else{
        entity.velocity.x += player.directionX * speed * dt;
      }

      if(player.directionY == 0){
        entity.velocity.z = 0;
      }else{
        entity.velocity.z += player.directionY * speed * dt;
      }
      
      // Integrate position
      entity.position.x += entity.velocity.x * dt;
      entity.position.z += entity.velocity.z * dt;

      //update data from table row match
      ctx.db.Entity.identity.update(entity)
      // ctx.db.Entity.identity.update({
      //   ...entity,
      // })

      // ctx.db.Transform3D.update({...entity,})
      // ctx.db.Transform3D.identity.update(entity);

      // console.log("Position x: ", entity.position.x , " z: ", entity.position.z );

    }else{// if does not exist create tmp
       ctx.db.Entity.insert({
         identity: player.identity,
         position: { x: 0.0, y: 0.0, z: 0.0 },
         velocity: { x: 0.0, y: 0.0, z: 0.0 },
         size: { x: 1.0, y: 1.0, z: 1.0 },
         direction: { x: 1.0, y: 1.0, z: 1.0 },
       });

      // ctx.db.Transform3D.insert({
      //    identity: player.identity,
      //    position: { x: 0.0, y: 0.0, z: 0.0 },
      //    velocity: { x: 0.0, y: 0.0, z: 0.0 },
      //    size: { x: 1.0, y: 1.0, z: 1.0 }
      // });
    }
  }
});
//-----------------------------------------------
// PLAYER INPUT
//-----------------------------------------------
// Client calls this to send/update their input
export const update_input = spacetimedb.reducer(
  {
    x: t.f32(),
    y: t.f32(),
    jump: t.bool(),
  },
  (ctx, args) => {
    const id = ctx.sender; // or ctx.caller if different
    // console.log("input id: ", id);
    // if (!id) throw new SenderError("Not authenticated");
    if (!id) return;

    const player_input = ctx.db.PlayerInput.identity.find(id);
    if(player_input){// update
      // console.log("update input x: ", args.x, " y: ", args.y, " Jump:", args.jump);
      ctx.db.PlayerInput.identity.update({...player_input,
        directionX:args.x,
        directionY:args.y,
        jump:args.jump
      });
    }else{// create
      // console.log("create input");
      ctx.db.PlayerInput.insert({
        identity: id,
        directionX: args.x,
        directionY: args.y,
        jump: args.jump,
        lastUpdated: ctx.timestamp,
      });
    }
  }
);
//-----------------------------------------------
// TEST FOO
//-----------------------------------------------
export const test_foo = spacetimedb.reducer({},(ctx, args) => {
  console.log("test")
});
//-----------------------------------------------
// SET PLAYER POSITION
//-----------------------------------------------
export const set_player_position = spacetimedb.reducer({
  x:t.f64(),
  y:t.f64(),
  z:t.f64(),
},(ctx, args) => {
  const entity = ctx.db.Entity.identity.find(ctx.sender);
  console.log("entity: ", entity);
  if(entity){
    entity.position.x = 0;
    entity.position.y = 0;
    entity.position.z = 0;
    ctx.db.Entity.identity.update(entity);
  }
});
//-----------------------------------------------
// init
//-----------------------------------------------
export const init = spacetimedb.init(ctx => {
  console.log("===============INIT SPACETIMEDB APP NAME:::=========");
  ctx.db.SimulationTick.insert({
    scheduled_id: 0n,
    // scheduled_at: ScheduleAt.interval(5_000_000n),// Schedule to run every 5 seconds (5,000,000 microseconds)
    scheduled_at: ScheduleAt.interval(33_333n),// Schedule to run every 1 seconds (1,000,000 microseconds)
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
// console.log("end set up: spacetime-app-physics");
