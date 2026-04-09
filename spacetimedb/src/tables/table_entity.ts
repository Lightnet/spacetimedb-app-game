//-----------------------------------------------
// TABLE ENTITY
//-----------------------------------------------
import { schema, table, t, SenderError  } from 'spacetimedb/server';
import { Coordinates3D, Shape3D } from '../types';
//-----------------------------------------------
// PLAYER
//-----------------------------------------------
export const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),
    entityId: t.string().optional(),
  }
);
//-----------------------------------------------
// ENTITY
//-----------------------------------------------
export const entity = table(
  { name: 'entity', public: true },
  {
    id: t.string().primaryKey(),
    created_at:t.timestamp(),
  }
);
//-----------------------------------------------
// TRANSFORM 3D
//-----------------------------------------------
export const transform3d = table(
  { name: 'transform3d', public: true },
  {
    entityId: t.string().primaryKey(),
    parentId:t.string().optional(),
    position:Coordinates3D,
    velocity:Coordinates3D,
    scale:Coordinates3D,
    rotation:Coordinates3D,
    // quaternion: Coordinates3D,
  }
);
//-----------------------------------------------
// PHYSICS
// idea prototype need more state, status....
//-----------------------------------------------
//-----------------------------------------------
// Body 3D
//-----------------------------------------------
export const body3d = table(
  { name: 'body3d', public: true },
  {
    entityId: t.string().primaryKey(),
    name: t.string(),
    params: Shape3D // This column now accepts BoxParams OR SphereParams
  }
);
//-----------------------------------------------
// N/A
//-----------------------------------------------
export const sensor = table({
  name: 'sensor', public: true
},{
  entityId: t.uuid(),
  type:t.string().default('POINT'),
  mass:t.f32().default(0),
  size:Coordinates3D.default({x:1,y:1,z:1})
});