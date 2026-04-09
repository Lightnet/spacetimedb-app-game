//-----------------------------------------------
// user
//-----------------------------------------------
import { schema, table, t, SenderError  } from 'spacetimedb/server';
import spacetimedb from '../module';
import { validateName } from '../helper';
//-----------------------------------------------
// Set Name
//-----------------------------------------------
export const set_name = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
  // console.info("Name: ",name);
  validateName(name);
  const user = ctx.db.users.identity.find(ctx.sender);
  if (!user) {
    throw new SenderError('Cannot set name for unknown user');
  }
  ctx.db.users.identity.update({ ...user, name });
});
//-----------------------------------------------
// 
//-----------------------------------------------
