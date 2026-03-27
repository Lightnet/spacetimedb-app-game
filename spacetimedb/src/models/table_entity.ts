// 

import { ScheduleAt } from 'spacetimedb';
import { schema, table, t, SenderError  } from 'spacetimedb/server';
import { Coordinates3D } from '../types';

export const Entity = table(
  { name: 'entity', public: true },
  {
    identity: t.identity().primaryKey(),
    position:Coordinates3D,
    velocity:Coordinates3D,
    size:Coordinates3D,
    direction: Coordinates3D,
  }
);

export const Obstacle3D = table({
  name: 'obstacle3d', public: true
},{
  id: t.u64().primaryKey().autoInc(),
  position: Coordinates3D,
  size:Coordinates3D
});
