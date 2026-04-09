//-----------------------------------------------
// table for logging
//-----------------------------------------------
import { schema, table, t, SenderError  } from 'spacetimedb/server';
//-----------------------------------------------
// 
//-----------------------------------------------
export const logging = table(
  { name: 'logging', public: true },
  {
    type: t.string(),
    text: t.string(),
    sent: t.timestamp(),
  }
);

