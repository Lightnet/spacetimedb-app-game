// server api

import { ScheduleAt } from 'spacetimedb';
import { schema, table, t, SenderError  } from 'spacetimedb/server';
import { user } from './models/table_user';
import { message } from './models/table_message';
import { Entity, Obstacle3D } from './models/table_entity';
import { PlayerInput } from './models/table_contoller';
import { SampleBox, SampleEntity, SampleSphere } from './models/table_physics';


// import { checkAABBOverlap3D, PLAYER_RADIUS_XZ, PLAYER_RADIUS_Y } from './reducers/reducer_physics';
// import { update_simulation_tick_collision3d } from './reducers/reducer_physics';

console.log("spacetime-app-physics");

const PLAYER_RADIUS_XZ = 0.45;     // horizontal radius
const PLAYER_RADIUS_Y  = 0.45;     // vertical (can be 0.9–1.0 if capsule-like)

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
// TABLE SimulationTick
// typescript circular dependency files
//-----------------------------------------------
export const SimulationTick = table({ 
  name: 'simulation_tick',
  // scheduled: (): any => update_simulation_tick
  scheduled: (): any => update_simulation_tick_collision3d
},{
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
  last_tick_timestamp:t.timestamp(),
  dt:t.f32(),
});


//-----------------------------------------------
// SPACETIMEDB SCHEMA TABLES
//-----------------------------------------------
const spacetimedb = schema({
  user,
  message,
  Entity,
  Obstacle3D,
  // Transform3D,
  PlayerInput,
  SimulationTick,

  SampleEntity,
  SampleBox,
  SampleSphere,
});


export const update_simulation_tick_collision3d = spacetimedb.reducer({ arg: SimulationTick.rowType }, (ctx, { arg }) => {
  // Invoked automatically by the scheduler
  // arg.message, arg.scheduled_at, arg.scheduled_id
  // console.log('update_simulation_tick');
  // console.log(arg);
  const now = ctx.timestamp;                    // current wall time
  let dt = 0;                       // we'll compute this

  if (arg.last_tick_timestamp) {        // not first tick
    const elapsed_ms = now.since(arg.last_tick_timestamp).millis;
    // console.log("elapsed_ms: ", elapsed_ms);
    dt = elapsed_ms / 1000.0;       // in seconds
  } else {
    dt = 0.033;                     // first tick guess / fallback
  }
  // console.log("PlayerInput coutns: ",ctx.db.PlayerInput.count());
  for (const input_player of ctx.db.PlayerInput.iter()){
    // console.log(input_player);
    if(!input_player){
      return;
    }

    // console.log("delta time: ", dt);
    const entity = ctx.db.Entity.identity.find(input_player.identity);
    // console.log(entity);
    // console.log(entity?.position.x, " : ", entity?.position.y);

    if(entity){
      // console.log("entity???")
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
        identity: input_player.identity, // use input_player.identity
        position:{x: 0, y: 0, z: 0},
        velocity:{x: 0, y: 0, z: 0},
        size:{x: 1, y: 1, z: 1},
        direction:{x: 0, y: 0, z: 0},
      })
    }
  }

  // ── Save the time for next call ─────────────────────────────────────────
  ctx.db.SimulationTick.scheduled_id.update({
    ...arg,
    last_tick_timestamp: now,
    dt:dt,
    // accumulator: arg.accumulator   // if using fixed style
  });
});

//-----------------------------------------------
// init
//-----------------------------------------------
export const init = spacetimedb.init(ctx => {
  console.log("[ ====::: INIT SPACETIMEDB APP PHYSICS:::==== ]");
  ctx.db.SimulationTick.insert({
    scheduled_id: 0n,
    // scheduled_at: ScheduleAt.interval(5_000_000n),// Schedule to run every 5 seconds (5,000,000 microseconds)
    scheduled_at: ScheduleAt.interval(33_333n),// Schedule to run every 1 seconds (1,000,000 microseconds)
    last_tick_timestamp: ctx.timestamp,
    dt:0.0,
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
