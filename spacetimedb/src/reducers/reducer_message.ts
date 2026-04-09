//-----------------------------------------------
// sameple message functions
//-----------------------------------------------
import { t, SenderError  } from 'spacetimedb/server';
import spacetimedb from '../module';
import { validateMessage } from '../helper';
//-----------------------------------------------
// 
//-----------------------------------------------
export const send_message = spacetimedb.reducer({ text: t.string() }, (ctx, { text }) => {
  validateMessage(text);
  console.info(`User ${ctx.sender}: ${text}`);
  ctx.db.message.insert({
    sender: ctx.sender,
    text,
    sent: ctx.timestamp,
  });
});

