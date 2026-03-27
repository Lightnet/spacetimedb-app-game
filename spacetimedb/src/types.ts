import { schema, table, t, SenderError  } from 'spacetimedb/server';

export const Coordinates3D = t.object('Coordinate3D', {
  x: t.f64(),
  y: t.f64(),
  z: t.f64(),
});