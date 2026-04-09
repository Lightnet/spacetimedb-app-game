//-----------------------------------------------
// module
//-----------------------------------------------
import { ScheduleAt } from 'spacetimedb';
import { schema, table, t, SenderError  } from 'spacetimedb/server';
import { message } from './tables/table_message';
import { 
  player,
  entity,
  transform3d,
  body3d,
   
} from './tables/table_entity';
import { userInput } from './tables/table_input';
import { users } from './tables/table_user';
import { messageEvent } from './tables/table_event';
import { generateRandomString } from './helper';
//console.log("db game");

// Add near top (or in module scope)
// const PLAYER_RADIUS = 0.45;        // tune this
const PLAYER_RADIUS_XZ = 0.45;     // horizontal radius
const PLAYER_RADIUS_Y  = 0.45;     // vertical (can be 0.9–1.0 if capsule-like)

// Helper function — pure math, no DB access
// 2D. 3D three js top view in 2D for x,z ???
// function checkAABBOverlap(
//   px: number, pz: number,           // player center
//   ox: number, oz: number,           // obstacle center
//   hw: number, hd: number            // obstacle half-width, half-depth
// ): boolean {
//   const left   = ox - hw;
//   const right  = ox + hw;
//   const top    = oz + hd;           // assuming +z = "forward" ???
//   const bottom = oz - hd;
//   return px + PLAYER_RADIUS > left   &&
//          px - PLAYER_RADIUS < right  &&
//          pz + PLAYER_RADIUS > bottom &&
//          pz - PLAYER_RADIUS < top;
// }

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

//===============================================
// this has be here due to circle deps
//===============================================
export const SimulationTick = table({ 
  name: 'simulation_tick',
  // scheduled: (): any => update_simulation_tick
  scheduled: (): any => update_simulation_tick_collision3d
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
  users,
  message,
  messageEvent,
  player,
  entity,
  userInput,
  transform3d,
  body3d,
  SimulationTick,
});

//-----------------------------------------------
// UPDATE SIMULATION TICK COLLISION
//-----------------------------------------------
export const update_simulation_tick_collision3d = spacetimedb.reducer({ arg: SimulationTick.rowType }, (ctx, { arg }) => {
  const now = ctx.timestamp;                    // current wall time
  let dt = 0;                       // we'll compute this
  if (arg.last_tick_timestamp) {        // not first tick
    const elapsed_ms = now.since(arg.last_tick_timestamp).millis;
    // console.log("elapsed_ms: ", elapsed_ms);
    dt = elapsed_ms / 1000.0;       // in seconds
  } else {
    dt = 0.033;                     // first tick guess / fallback
  }

  // t.unit(),
  // t.object()

  //---------------------------------------------
  // logic
  //---------------------------------------------

  //curent one player
  // console.log(player);
  // console.log(player.identity.toHexString(), " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);
  // console.log("player input >>", " x:", player.directionX, " y:", player.directionY, " Jump:", player.jump);
  // console.log(ctx.sender);
  // const input_player = ctx.db.PlayerInput.identity.find(ctx.identity);
  // ctx.db.PlayerInput.iter()
  // console.log("Input Count: ",  ctx.db.PlayerInput.count());
  for (const input_player of ctx.db.userInput.iter()){
    // console.log(input_player);
    if(!input_player){
      continue;
    }
    const _player = ctx.db.player.identity.find(input_player.identity);
    if(!_player) continue
    if(!_player.entityId) continue;

    const _transform = ctx.db.transform3d.entityId.find(_player.entityId);
    if(!_transform) continue
    // console.log(entity);
    // console.log(entity?.x, " : ", entity?.y);
    
    if(entity){

      const speed = 5.0; // units per second
      let isMove = false;
      // ── Apply input acceleration ───────────────────────────────────────
      if(input_player.directionX == 0){
        _transform.velocity.x = 0;
      }else{
        _transform.velocity.x += input_player.directionX * speed * dt;
        isMove=true;
      }
      if(input_player.directionY == 0){
        _transform.velocity.z = 0;
      }else{
        _transform.velocity.z += input_player.directionY * speed * dt;
        isMove=true;
      }
      
      // ── Movement prediction + collision ────────────────────────────────────────
      let newPos = {
        x: _transform.position.x + _transform.velocity.x * dt,
        y: _transform.position.y + _transform.velocity.y * dt,
        z: _transform.position.z + _transform.velocity.z * dt,
      };

      let collided = false;

      // ctx.db.Obstacle3D

      // console.log(ctx.newUuidV7());
      // console.log(ctx.newUuidV4());

      // for (const _body3d of ctx.db.body3d.iter()) {
      //   const otherTransform = ctx.db.transform3d.entityId.find(_body3d.entityId);
      //   if(!otherTransform) continue;
      //   let otherBox;
      //   let otherSphere;
      //   if(_body3d.params.tag == 'Box'){
      //     otherBox = _body3d.params;
      //   }
      //   if(_body3d.params.tag == 'Sphere'){
      //     otherSphere = _body3d.params;
      //   }
      //   if(!otherBox) continue;
      //   const hx = otherBox.value.width / 2;
      //   const hy = otherBox.value.height / 2;
      //   const hz = otherBox.value.depth / 2;
      //   if (!checkAABBOverlap3D(
      //     newPos.x, newPos.y, newPos.z,
      //     otherTransform.position.x, otherTransform.position.y, otherTransform.position.z,
      //     hx, hy, hz
      //   )) {
      //     continue;
      //   }
      //   collided = true;
      //   // ── Compute signed penetration on each axis ───────────────────────
      //   const penX = [
      //     (newPos.x + PLAYER_RADIUS_XZ) - (otherTransform.position.x - hx),   // left/negative x
      //     (otherTransform.position.x + hx) - (newPos.x - PLAYER_RADIUS_XZ),   // right/positive x
      //   ];
      //   const penY = [
      //     (newPos.y + PLAYER_RADIUS_Y)  - (otherTransform.position.y - hy),
      //     (otherTransform.position.y + hy)  - (newPos.y - PLAYER_RADIUS_Y),
      //   ];
      //   const penZ = [
      //     (newPos.z + PLAYER_RADIUS_XZ) - (otherTransform.position.z - hz),
      //     (otherTransform.position.z + hz) - (newPos.z - PLAYER_RADIUS_XZ),
      //   ];

      //   // Pick the smallest **positive** penetration
      //   let minPen = Infinity;
      //   let bestAxis: 'x' | 'y' | 'z' | null = null;
      //   let bestSign = 0; // which side

      //   // X
      //   if (penX[0] > 0 && penX[0] < minPen) { minPen = penX[0]; bestAxis = 'x'; bestSign = -1; }
      //   if (penX[1] > 0 && penX[1] < minPen) { minPen = penX[1]; bestAxis = 'x'; bestSign = +1; }
      //   // Y
      //   if (penY[0] > 0 && penY[0] < minPen) { minPen = penY[0]; bestAxis = 'y'; bestSign = -1; }
      //   if (penY[1] > 0 && penY[1] < minPen) { minPen = penY[1]; bestAxis = 'y'; bestSign = +1; }
      //   // Z
      //   if (penZ[0] > 0 && penZ[0] < minPen) { minPen = penZ[0]; bestAxis = 'z'; bestSign = -1; }
      //   if (penZ[1] > 0 && penZ[1] < minPen) { minPen = penZ[1]; bestAxis = 'z'; bestSign = +1; }

      //   if (bestAxis && minPen < Infinity) {
      //     // ── Correct only one axis (the one with least penetration) ─────
      //     if (bestAxis === 'x') {
      //       newPos.x = _transform.position.x;           // full revert, or: -= minPen * bestSign
      //       _transform.velocity.x *= 0.1;               // strong damping
      //     } else if (bestAxis === 'y') {
      //       newPos.y = _transform.position.y;
      //       _transform.velocity.y *= 0.1;
      //       // If you later add gravity: can set velocity.y = 0 when hitting floor (bestSign < 0)
      //     } else if (bestAxis === 'z') {
      //       newPos.z = _transform.position.z;
      //       _transform.velocity.z *= 0.1;
      //     }
      //   }
      //   // You can continue checking other obstacles (multi-collision)
      //   // or break; if you want to handle only first collision per tick
      // }

      // ── Commit new position ─────────────────────────────────────────────
      _transform.position.x = newPos.x;
      _transform.position.y = newPos.y;
      _transform.position.z = newPos.z;
      // if controller is move than update.
      // if(isMove){
        // update player position
        ctx.db.transform3d.entityId.update({ ..._transform });
      // }

    }
  }
    
  // ── Save the time for next call ─────────────────────────────────────────
  ctx.db.SimulationTick.scheduled_id.update({
    ...arg,
    last_tick_timestamp: now,
    // accumulator: arg.accumulator   // if using fixed style
  });

})

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
  const user = ctx.db.users.identity.find(ctx.sender);
  console.log("SENDER: ",ctx.sender);
  if (user) {
    ctx.db.users.identity.update({ ...user, online: true });
  } else {
    console.log("test");
    // New user → generate a unique random name
    let name: string;
    // name = generateRandomString(ctx, 24);

    name = String( ctx.newUuidV7() ).replaceAll("-","");
    // let check = ctx.db.user.name.find(name);
    // console.log("check: ",check)
    // do {
    //   name = generateRandomString(ctx, 24);
    //   console.log("NAME:", name);
    // } while (ctx.db.user.name.find(name) !== null);   // Check if name exists

    ctx.db.users.insert({
      identity: ctx.sender,
      // name: generateRandomString(ctx, 24),
      name: name,
      online: true,
    });

  }
});
//-----------------------------------------------
// onDisconnect
//-----------------------------------------------
export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  const user = ctx.db.users.identity.find(ctx.sender);
  if (user) {
    ctx.db.users.identity.update({ ...user, online: false });
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
