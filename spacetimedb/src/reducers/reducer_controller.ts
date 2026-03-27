import { schema, table, t, SenderError  } from 'spacetimedb/server';
import spacetimedb from '../module';

//-----------------------------------------------
// PLAYER INPUT
//-----------------------------------------------
// Client calls this to send/update their input
export const update_input = spacetimedb.reducer(
  {
    x: t.f32(),
    y: t.f32(),
    jump: t.bool(),
  },
  (ctx, args) => {
    const id = ctx.sender; // or ctx.caller if different
    // console.log("input id: ", id);
    // if (!id) throw new SenderError("Not authenticated");
    if (!id) return;

    const player_input = ctx.db.PlayerInput.identity.find(id);
    if(player_input){// update
    //   console.log("update input x: ", args.x, " y: ", args.y, " Jump:", args.jump);
      ctx.db.PlayerInput.identity.update({...player_input,
        directionX:args.x,
        directionY:args.y,
        jump:args.jump
      });
    }else{// create
    //   console.log("create input");
      ctx.db.PlayerInput.insert({
        identity: id,
        directionX: args.x,
        directionY: args.y,
        jump: args.jump,
        lastUpdated: ctx.timestamp,
      });
    }
  }
);