# spacetime-app-game

# Licence: MIT

# SpaceTimeDB:
- spacetime cli 2.0.5
- npm spacetimedb 2.0.4

# Program Languages:
- Typescript
- Javascript

# Packages:
- spacetimedb 2.0.4
- three 0.183.2
- typescript 5.9.3
- vite 8.0.0
- vanjs 1.6.0

# Game Features:
- input move (wip)
- entity (wip)
- collision ( n/a )

# render type:
- 2d
- 2.5d
- 3d


# Notes:
- reviewing how to create game logics in database api.
- 

# Information:
 Work on sample 2.5 world movement and collision test. By using the SpaceTimeDB to handle the server and database all one package. Which can use table and loop schedule table.


# SpaceTimeDB:
  Work in progress.

  This topic focus on database, server, typescript, javascript and client browser.
  
  Using SpaceTimeDB, Bun js and browser client to keep things simple to run applications. Web server to host site for statics files.
  
  SpaceTimeDB is Database but with the server with web assembly module. You can think of the server module as plugins for database that support Typescript to able to run game logic which is direct access database to query. Like PostgresQL that need to connect to stand alone server game network. Which SpaceTimeDB was build for it.

```
          SpaceTimeDB
             (one unit)

   +---------------------+
   |                     |
   |     Database        |
   |   + Module Logic    |  ← Reducers run here (server-side logic)
   |     (Tables)        |
   |                     |
   +----------^----------+
              │
              │ WebSocket + auto-sync (subscriptions)
              │
   +----------v----------+
   |   Browser Client    |  ← or native client, game engine, etc.
   +---------------------+
```

# User token and auth:
  Spacetime use web socket browser as it does not track ip and default create token. You can read more in SpaceTimeDB docs. The reason is simple as access the browser but in web socket access. As well the dev coder have own way to custom how handle identity.

# Design:
  Simple test how player move in the world by using the SpaceTimeDB (Database and Server) without need for simulation the world by browser client.

  By using the Schedule API and query table names.

  By using threejs to build 3D for 2.5D?

  Just a prototype build.

# Ideas base on others:

  I can think of those postgresql or sqlite since they trigger conditions. But limited without module scripts access.
  
  You can search for DOOMQL that someone made pure sql build of the game.

# Server Web Assembly Module:
  There are some restriction when building game server module. It base on webassembly which act as server module. Global varaible can't use in webassembly so the only way is sql table. There is features like schedule, event and others. For the game logics would be using the schedule feature since it does loop but it would need query the tables.

  The simple example is the input from the client, player position to move by input from query table. Which will loop in schedule tables.

  There is event can be use for damage event trigger. Found in the spacetimedb docs.

# Base on ideas:
  This remind of the someone made a Linux Kernel Port console boot as terminal. As well Doom was port SQL which name DOOMQL that found in github repo made by other user.

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

## Start Application:
- required bun binary
- install packages
- install spacetimedb

```
spacetime start
```
- start database and server application.
- note it need to run on terminal.

```
spacetime dev --server local
```
- Note this flag for local server.
- This is dev mode that watch changes, update and logs.
- note this required config for spacetime.json, spacetime.local.json
```
bun run dev
```
- run the web server

## spacetime publish server mode: 
```
spacetime publish --server local --module-path spacetimedb spacetime-app-game
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
spacetime publish --server local --module-path spacetimedb spacetime-app-game --delete-data
```
``` 
spacetime publish --server local spacetime-app-game --delete-data
```
# spacetime SQL:
```
spacetime sql --server local spacetime-app-game "SELECT * FROM user"
```
```
spacetime sql --server local spacetime-app-game "SELECT * FROM message"
```
```
spacetime sql --server local spacetime-app-game "SELECT * FROM player_input"
```
```
spacetime sql --server local spacetime-app-game "SELECT * FROM simulation_tick"
```

# SpaceTimeDB Config:
- https://spacetimedb.com/docs/2.0.0-rc1/cli-reference/standalone-config/
- https://spacetimedb.com/docs/2.0.0-rc1/databases/building-publishing
- https://spacetimedb.com/docs/2.0.0-rc1/databases/cheat-sheet
- https://spacetimedb.com/docs/2.0.0-rc1/cli-reference
- 
- 

```
spacetime publish --delete-data <DATABASE_NAME>
```
- reset your database and delete all data

```
ctx.db                  // Database access
ctx.sender              // Identity of caller
ctx.connectionId        // ConnectionId | undefined
ctx.timestamp           // Timestamp
ctx.identity            // Module's identity
```

```
// Type builders
t.bool(), t.string(), t.f32(), t.f64()
t.i8(), t.i16(), t.i32(), t.i64(), t.i128()
t.u8(), t.u16(), t.u32(), t.u64(), t.u128()

// Collections
t.option(T), t.array(T)

// SpacetimeDB types
t.identity(), t.connectionId(), t.timestamp(), t.timeDuration(), t.scheduleAt()

// Structured types
t.object('Name', { field: t.type() })
t.enum('Name', ['Variant1', 'Variant2'])
```
## database path:
```
mkdir /stdb
spacetime --root-dir="" start
```
- this required binary path for pacetimedb-cli.exe



```
spacetime dev --server local
```



# Refs:
- https://spacetimedb.com/docs/functions/views
- https://spacetimedb.com/docs/functions/procedures
- https://spacetimedb.com/docs/tutorials/chat-app/
- 

# Notes:
- Anything is possible to build on database and server module.
- 