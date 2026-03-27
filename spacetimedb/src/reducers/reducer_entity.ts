// 


import { schema, table, t, SenderError  } from 'spacetimedb/server';
import spacetimedb from "../module";

export const set_player_position = spacetimedb.reducer({
  x:t.f64(),
  y:t.f64(),
  z:t.f64(),
},(ctx, args) => {
  const entity = ctx.db.Entity.identity.find(ctx.sender);
  console.log("entity: ", entity);
  if(entity){
    entity.position.x = 0;
    entity.position.y = 0;
    entity.position.z = 0;
    ctx.db.Entity.identity.update(entity);
  }
});

export const create_obstacle = spacetimedb.reducer({
  x:t.f64(),
  y:t.f64(),
  z:t.f64(),
},(ctx, args) => {
  // console.log("create obstacle");
  ctx.db.Obstacle3D.insert({
    position: {x:args.x,y:args.y,z:args.z},
    size: {x:1,y:1,z:1},
    id: 0n
  });
});

export const update_obstacle_position_id = spacetimedb.reducer({
  id:t.u64(),
  x:t.f64(),
  y:t.f64(),
  z:t.f64(),
},(ctx, args) => {
  // console.log("update obstacle")
  let obstacle = ctx.db.Obstacle3D.id.find(args.id);
  if(obstacle){
    ctx.db.Obstacle3D.id.update({...obstacle,
      position: {x:args.x,y:args.y,z:args.z}
    });
  }
});

export const delete_obstacle = spacetimedb.reducer({
  id: t.u64()
},(ctx, {id})=>{
  console.log("delete id:", id);
  ctx.db.Obstacle3D.id.delete(id);
})

export const get_entity_shape = spacetimedb.reducer(
  {shapeType:t.string()},
  (ctx, args)=>{
    // ctx.db.SampleEntity.iter(). //nope
    // ctx.db.SampleEntity.id //nope

    // ctx.db.SampleEntity.id.find();//
    // ctx.db.SampleEntity.where(join)// nope

    // ctx.db.SampleEntity.id.find
    ctx.db.SampleEntity.shapeType.filter('SPHERE');
})