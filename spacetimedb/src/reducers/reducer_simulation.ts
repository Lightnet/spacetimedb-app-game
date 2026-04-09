//-----------------------------------------------
// THIS IS REF DOES NOT WORK HERE. DUE CIRCLE DEPS
//-----------------------------------------------
import { ScheduleAt } from 'spacetimedb';
import { t, SenderError  } from 'spacetimedb/server';
import spacetimedb, { SimulationTick } from '../module';
//-----------------------------------------------
// Testing
//-----------------------------------------------
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
//-----------------------------------------------
// Game Stop Tick
//-----------------------------------------------
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
//-----------------------------------------------
// Game Set Tick Rate
//-----------------------------------------------
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
});
//-----------------------------------------------
// Game Current Tick
//-----------------------------------------------
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

