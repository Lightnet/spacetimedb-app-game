//-----------------------------------------------
// table for sample message event
//-----------------------------------------------
import { schema, table, t, SenderError  } from 'spacetimedb/server';
//-----------------------------------------------
// 
//-----------------------------------------------
export const messageEvent = table(
  { name: 'message_event', public: true, event: true, },
  {
    senderId: t.identity(),
    text: t.string(),
    sent: t.timestamp(),
  }
);

