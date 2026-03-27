// 

import { schema, table, t, SenderError  } from 'spacetimedb/server';

export const message = table(
  { name: 'message', public: true },
  {
    senderId: t.identity(),
    sent: t.timestamp(),
    text: t.string(),
  }
);