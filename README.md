# spacetime-app-physics

# Licence: MIT

# SpaceTimeDB:
- spacetime cli 2.1.0
- npm spacetimedb 2.1.0

# Program Languages:
- Typescript
- Javascript

# Packages:
- spacetimedb 2.1.0
- three 0.183.2
- typescript 5.9.3
- vite 8.0.0
- vanjs 1.6.0

# Game Features:
- input move ( simple )
- entity ( simple)
- collision 3d ( simple )

# Notes:
- This is just a prototype test.
- Simple 3D collision.
- Need simple physics collision.
- typescript circular dependency files
    - it need table -> scheduled -> spacetimedb -> reducer
    - as testing to keep files apart to easy but files error loop handle.
- typescript circular dependency files
    - scheduled required table and reducer.


# Information:
  Work in progress.

  Simple collision 3D input controller test with the player and block.

# SpacetimeDB ( Database / Server Module ):

  This topic focus on database, server, typescript, javascript and client browser.
  
  Using SpaceTimeDB, Bun js for web server and browser client to keep things simple to run applications. Web server to host site for statics files.
  
  SpaceTimeDB is is all one for tools, database and server with module plugins. SpaceTimeDB has build cli for tool, template projects, export and import web assembly as server module api. Well there should be at least two binary one for the server and other is the tool utility. 

  SpaceTimeDB use web socket for the browser client. It base on server typescript module plugin that export to client. It use table names or view to subscribe and can be filter the tables as long it public table. It use reducer from server to client to call. Since it sandbox it would be bridge between the server and client module.

# Physics:
  Work in progress.

  Note it use Web Assembly SandBox module for database add on plugin. So libraries can't use from nodejs. The array will be use as sql table to store, load, update and delete.

  Will keep the physics simple by using the min and max bounding box checks. It will not use vertices checks which add more cpu load.

  - https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection

# Module files:
  Note there typescript circular dependency files errors. Due to how table scheduled need reducer function call.

  There will be break up into some tables and reducers for easy management. 

## Single:
```ts
export const SimulationTick = table({ 
  name: 'simulation_tick',
  // scheduled: (): any => update_simulation_tick
  scheduled: (): any => update_simulation_tick_collision3d
},{
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
  last_tick_timestamp:t.timestamp(),
  dt:t.f32(),
});
//...
const spacetimedb = schema({
  user,
  SimulationTick,
  //...
});
//...
export const update_simulation_tick_collision3d = spacetimedb.reducer({ arg: SimulationTick.rowType }, (ctx, { arg }) => {
//...
});
```
  This is strip down version of simple collision test. Single file.
## Multiples:
Table physics
```ts
import {update_simulation_tick_collision3d} from './reducers/reducer_physics'; // it need file.
//...
export const SimulationTick = table({ 
  name: 'simulation_tick',
  // scheduled: (): any => update_simulation_tick
  scheduled: (): any => update_simulation_tick_collision3d
},{
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
  last_tick_timestamp:t.timestamp(),
  dt:t.f32(),
});
```
```ts
// module.ts
//
const spacetimedb = schema({
  user,
  SimulationTick,
  //...
});
//...
export const init = spacetimedb.init(ctx => {
  console.log("[ ====::: INIT SPACETIMEDB APP PHYSICS:::==== ]");
  ctx.db.SimulationTick.insert({
    scheduled_id: 0n,
    scheduled_at: ScheduleAt.interval(33_333n),// Schedule to run every 1 seconds (1,000,000 microseconds)
    last_tick_timestamp: ctx.timestamp,
    dt:0.0,
  });
});
```
```ts
import {SimulationTick} from './model/table_physics'; // it need file.
import spacetimedb from './module'

export const update_simulation_tick_collision3d = spacetimedb.reducer({ arg: SimulationTick.rowType }, (ctx, { arg }) => {
//...
});
```
  The result of the typescript circular dependency files.

# Files / Url:
- threesql.html
  - Using the local sql to emulator quick test. 
- index
  - simple collision test from server to client.


## Collision checks:
- Axis-Aligned Bounding Box (AABB)
- Oriented Bounding Box (OBB)

```
```

# SpaceTimeDB Features:
- table
- Schedule Table
  - loop
  - one time trigger
  - time 
- Event Table
- Procedure 
  - for use access out for http fetch request like api auth.
  - table can use but require call func with in to run it.
- Reducers
  - use for client to access action
  - access table
- views
  - read only
  - it can filter out for player can see table data
- Lifecycle
 - server module
    - init
    - onConnect 
    - onDisconnect 
- https://spacetimedb.com/docs/databases/cheat-sheet

# Set Up and Configs:

  SpaceTimeDB set up for server and database application.

## start app:
```
spacetime start
```
- start database and server application.
- note it need to run on terminal.

## spacetime publish server mode: 
```
spacetime publish --server local --module-path spacetimedb spacetime-app-physics
```
- run spacetime to push module app
- This support Typescript to push to module to run server for clients to access web socket.

## spacetime log:
```
spacetime logs -s local -f spacetime-app-game 
```
- Note this run another terminal to access spacetimedb client to log for database name.
- log datbase spacetime-app-game debug 

## spacetime export client module:
```
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
```
- generate typescript for client
- note this export typescript.
- it can be use for export to client

## spacetime database delete:
  Note that clear database in case of update change on tables that error.
```
spacetime publish --server local --module-path spacetimedb spacetime-app-physics --delete-data
```
``` 
spacetime publish --server local spacetime-app-physics --delete-data
```
# spacetime SQL:
```
spacetime sql --server local spacetime-app-physics "SELECT * FROM user"
```
```
spacetime sql --server local spacetime-app-physics "SELECT * FROM message"
```
```
spacetime sql --server local spacetime-app-physics "SELECT * FROM player_input"
```
```
spacetime sql --server local spacetime-app-physics "SELECT * FROM simulation_tick"
```

# Refs:
- https://spacetimedb.com/docs/functions/views
- https://spacetimedb.com/docs/functions/procedures
- https://spacetimedb.com/docs/tutorials/chat-app/
- 

# Notes:
- Anything is possible to build on database and server module.
- 