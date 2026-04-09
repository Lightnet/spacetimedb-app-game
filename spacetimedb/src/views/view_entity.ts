// 

import { schema, table, t, SenderError  } from 'spacetimedb/server';
import { player } from '../tables/table_entity';
import spacetimedb from '../module';


export const my_player = spacetimedb.view(
 { name: 'my_player', public: true },
  t.option(player.rowType),
  (ctx) => {
    const row = ctx.db.player.identity.find(ctx.sender);
    return row ?? undefined;
  }
);