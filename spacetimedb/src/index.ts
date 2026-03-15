// server api

import { ScheduleAt } from 'spacetimedb';
import { schema, table, t, SenderError  } from 'spacetimedb/server';

console.log("db test");

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
});

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
  for (const player of ctx.db.PlayerInput.iter()){
    // console.log(player);
    console.log(player.identity.toHexString(), " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);
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
// 
//-----------------------------------------------

//-----------------------------------------------
// 
//-----------------------------------------------

//-----------------------------------------------
// 
//-----------------------------------------------

//-----------------------------------------------
// init
//-----------------------------------------------
export const init = spacetimedb.init(ctx => {
  console.log("===============INIT SPACETIMEDB APP NAME:::=========");

  ctx.db.SimulationTick.insert({
    scheduled_id: 0n,
    // scheduled_at: ScheduleAt.interval(5_000_000n),// Schedule to run every 5 seconds (5,000,000 microseconds)
    scheduled_at: ScheduleAt.interval(1_000_000n),// Schedule to run every 1 seconds (1,000,000 microseconds)
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
