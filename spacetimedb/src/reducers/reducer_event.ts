//-----------------------------------------------
// sameple message event functions
//-----------------------------------------------
import { t, SenderError  } from 'spacetimedb/server';
import spacetimedb from '../module';
import { validateMessage } from '../helper';
//-----------------------------------------------
// 
//-----------------------------------------------
export const send_message_event = spacetimedb.reducer({ text: t.string() }, (ctx, { text }) => {
  validateMessage(text);
  console.info(`User ${ctx.sender}: ${text}`);
  // Publish the event
  ctx.db.messageEvent.insert({
    senderId: ctx.sender,
    text,
    sent: ctx.timestamp,
  });
});

// conn.db.messageEvent.onInsert((ctx, event) => {
//   console.log(`senderId: ${event.senderId} text: ${event.text} sent: ${event.sent}`);
// });