//-----------------------------------------------
// NON TABLE FOR EASE OF ACCESS
//-----------------------------------------------
import { schema, table, t, SenderError  } from 'spacetimedb/server';

export const Coordinates3D = t.object('Coordinate3D', {
  x: t.f64(),
  y: t.f64(),
  z: t.f64(),
});

//-----------------------------------------------
// Box parameters
//-----------------------------------------------
// Box parameters: width, height, depth
export const Box3DParams = t.object('BoxParams', {
  width: t.f32(),
  height: t.f32(),
  depth: t.f32()
});
//-----------------------------------------------
// Sphere parameters: just radius
//-----------------------------------------------
export const Sphere3DParams = t.object('SphereParams', {
  radius: t.f32()
});
//-----------------------------------------------
// ENUM {Box, Sphere}
//-----------------------------------------------
export const Shape3D = t.enum('Shape', {
  Box: Box3DParams,
  Sphere: Sphere3DParams
});





