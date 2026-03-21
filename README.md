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
- collision 2d ( wip, simple 3d)
- helper preview cube

# Render type:
- 2d ( n/a )
- 2.5d ( wip )
- 3d ( n/a )

# Notes:
- Learning how to create game logics in database api.
- This topic focus on database, server, typescript, javascript and client browser.


# Information:
  This is just prototype sample build. To build 2.5D world in 2D plane collision 2D. Simple input direction with collision 2d plane.
  
  By using the SpaceTimeDB to handle database and server plugin module ( web assembly ) with typescript. Which can use tables and run schedule table loop logics.

  The browser will use three js, van js, spacetimedb and other packages. To keep it very simple with javascript module type for development testing.

# Collision Logic:
  Well there 3D collision on 2D plane for level height when using the ramp going up or down to make sure the collision 3D work later on the build.

  There no detect yet build.

# SpaceTimeDB:
  Work in progress.
  
  Using SpaceTimeDB, Bun js and browser client to keep things simple to run applications. Web server to host site for statics files.
  
  SpaceTimeDB is all one with Database and server with web assembly module. You can think of the server module as plugins for database that support Typescript to able to run game logic which is direct access database to query.

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
   /-------------/             +----------v----------+
   / web server  / ----------- |   Browser Client    |  ← or native client, game engine, etc.
   /-------------/             +---------------------+
```


```
            SpaceTimeDB
             (one unit)
      +----------------------+
      |                      |
      |     Database         |
      |  |----------------|  |    +----------------+
      |  | + Web Assembly |  |    | + Module Logic |
      |  | + Module Logic |  |----|   Client       |
      |  |   (api)        |  |    |   (api)        |
      |  |   (Tables)     |  |    |   (Tables)     |
      |  |----------------|  |    +----------------+
      |                      |
      +----------^-----------+
```
  It reuqired user to code server module to export to client module to create user input to move entity object in space to able to use database tables to update and send to client to reflect in player movement. Note there are some restrict to prevent client to update but use Reducers which expose to client side to call from server.

# User token and auth:
  SpacetimeDB use web socket connect to browser client as it does not track ip and default create string token. You can read more in SpaceTimeDB docs and blog from their post. The reason treat any connection as identity. Another point they forge fake ip address so it be treat as identity. Without the SpacetimeDB generate token they will not have access to database if scripted with auth. So string token is the only access identify your access to SpaceTimeDB if the person is same identity.
  
  The developer has code their own way to how handle the identity and authority.

# Server Web Assembly Module:
  There are some restriction when building game server module. It base on webassembly which act as server module. Global varaible can't use in webassembly so the only way is sql table. There is features like schedule, event and others. For the game logics would be using the schedule feature since it does loop but it would need query the tables.

  The simple example is the input from the client, player position to move by input from query table. Which will loop in schedule tables.

  There is event can be use for damage event trigger. Found in the spacetimedb docs.

# Base on ideas:
  This remind of the someone made a Linux Kernel Port console boot as terminal on browser client. As well Doom was port SQL which name DOOMQL that found in github repo made by other user.

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
- Bun binary ( required )
- install packages with bun for vitejs.
- install spacetimedb binary.

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

# Refs:
- https://spacetimedb.com/docs/functions/views
- https://spacetimedb.com/docs/functions/procedures
- https://spacetimedb.com/docs/tutorials/chat-app/


# Notes:
- Anything is possible to build on database and server module.
- 