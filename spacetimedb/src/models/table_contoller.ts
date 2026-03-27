// 

// import { ScheduleAt } from 'spacetimedb';
import { schema, table, t, SenderError  } from 'spacetimedb/server';

export const PlayerInput = table(
  { name: 'player_input', public: true },
  {
    identity: t.identity().primaryKey(),
    directionX: t.f32(),   // -1..1 left/right (or WASD/analog)
    directionY: t.f32(),   // -1..1 forward/back (for top-down 2D)
    jump: t.bool(),        // pressed this tick?
    lastUpdated: t.timestamp(),  // ctx.timestamp millis, for optional expiry
  }
);



