//-----------------------------------------------
// table for user input
//-----------------------------------------------
import { schema, table, t, SenderError  } from 'spacetimedb/server';
//-----------------------------------------------
// user input from client
//-----------------------------------------------
export const userInput = table(
  { name: 'user_input', public: true },
  {
    identity: t.identity().primaryKey(),
    directionX: t.f32(),   // -1..1 left/right (or WASD/analog)
    directionY: t.f32(),   // -1..1 forward/back (for top-down 2D)
    directionZ: t.f32(),   // test
    jump: t.bool(),        // pressed this tick?
    lastUpdated: t.timestamp(),  // ctx.timestamp millis, for optional expiry
  }
);

