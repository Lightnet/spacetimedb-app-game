// 

import { schema, table, t, SenderError  } from 'spacetimedb/server';
import spacetimedb from '../module';

export const test_foo = spacetimedb.reducer({},(ctx, args) => {
  console.log("test")
});