// 

import { schema, table, t, SenderError  } from 'spacetimedb/server';

export const user = table(
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



