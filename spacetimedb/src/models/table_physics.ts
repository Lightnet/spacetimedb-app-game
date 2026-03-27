//

import { schema, table, t, SenderError  } from 'spacetimedb/server';
import { Coordinates3D } from '../types';
// import { update_simulation_tick_collision3d } from '../reducers/reducer_physics';

export const SampleEntity = table(
  { name: 'sample_entity', public: true },
  {
    id: t.i64().index('btree').autoInc().primaryKey(),
    shapeType:t.string().index('btree').default('SPHERE'),
    isStatic:t.bool().default(true),
    position:Coordinates3D,
    velocity:Coordinates3D,
  }
);

export const SampleBox = table(
  { name: 'sample_box', public: true },
  {
    entityId: t.i64().primaryKey(),
    size:Coordinates3D,
  }
);

export const SampleSphere = table(
  { name: 'sample_sphere', public: true },
  {
    entityId: t.i64().primaryKey(),
    radius: t.f32(),
  }
);

//-----------------------------------------------
// TABLE SimulationTick
//-----------------------------------------------
// export const SimulationTick = table({ 
//   name: 'simulation_tick',
//   // scheduled: (): any => update_simulation_tick
//   scheduled: (): any => update_simulation_tick_collision3d
// },{
//   scheduled_id: t.u64().primaryKey().autoInc(),
//   scheduled_at: t.scheduleAt(),
//   // lastTickTs: t.u64(),                   // ctx.timestamp.millis of last tick ???
//   last_tick_timestamp:t.timestamp(),
//   dt:t.f32(),
// });

