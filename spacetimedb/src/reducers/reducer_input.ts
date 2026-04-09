//-----------------------------------------------
// user input functions types
//-----------------------------------------------
import { schema, table, t, SenderError  } from 'spacetimedb/server';
import spacetimedb from '../module';
//-----------------------------------------------
// PLAYER INPUT
//-----------------------------------------------
// Client calls this to send/update their input
export const update_input = spacetimedb.reducer(
  {
    directionX: t.f32(),
    directionY: t.f32(),
    directionZ: t.f32(),
    jump: t.bool(),
  },
  (ctx, args) => {
    const id = ctx.sender; // or ctx.caller if different
    if (!id) throw new SenderError("Not authenticated");

    const player_input = ctx.db.userInput.identity.find(id);
    if(player_input){// update
      console.log("update input x: ", args.directionX, " y: ", args.directionY, " Jump:", args.jump);
      ctx.db.userInput.identity.update({...player_input,
        directionX:args.directionX,
        directionY:args.directionY,
        jump:args.jump
      });
    }else{// create
      // console.log("create input");
      ctx.db.userInput.insert({
        identity: id,
        directionX: args.directionX,
        directionY: args.directionY,
        jump: args.jump,
        lastUpdated: ctx.timestamp,
        directionZ: args.directionZ
      });
    }
  }
);

