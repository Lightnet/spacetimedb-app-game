# spacetime-app-game

# Licence: MIT

# SpaceTimeDB:
- spacetime cli 2.0.5
- npm spacetimedb 2.0.4

# Program Languages:
- Typescript
- Javascript

# Information:
  Work in progress.

  This topic focus on database, server, typescript, javascript and client browser.
  
  Using SpaceTimeDB, typescript, javascript and other packages to run sample browser game. Still need to have web server to host javascript and other files for statics site.
  
  SpaceTimeDB is Database but with the server with module. You can think of database with add on features of the server to expose api calls for use client. Which spacetime cli can export Typescript. Need to code typescipt server api module and later export to client typescript. As well the server module need to export to SpaceTimeDB to run and access the database with the name database. Required to use command lines to start spacetimedb services, publish server module and export client module.

# User token and auth:
  Spacetime use web socket browser as it does not track ip and default create token. You can read more in SpaceTimeDB docs. For reason for default anonymous identity are created by default. As well the dev coder have own way to custom how handle identity.

# Design:
  Simple test how player move in the world by using the SpaceTimeDB (Database and Server) without need for simulation the world by client.

  By using the Schedule API and query table names.

  I can think of those postgresql or sqlite since they trigger conditions. But limited without module scripts access.

# Ideas base on others:
  
  You can search for DOOMQL that someone made pure sql build of the game.

# SpaceTimeDB Features:
- Schedule Table
- Event Table
- 

# Set Up and Configs:

  SpaceTimeDB set up for server and database application.

```
spacetime start
```
- start database and server application.
- note it need to run on terminal.
```
spacetime publish --server local --module-path spacetimedb spacetime-app-game
```
- run spacetime to push module app
- This support Typescript to push to module to run server for clients to access web socket.
```
spacetime logs -s local -f spacetime-app-game 
```
- Note this run another terminal to access spacetimedb client to log for database name.
- log datbase spacetime-app-game debug 

```
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
```
- generate typescript for client
- note this export typescript.
- it can be use for export to client

```
spacetime publish --server local --module-path spacetimedb spacetime-app-game --delete-data
```
- clear data

``` 
spacetime publish --server local --delete-data spacetime-app-game
```

```
spacetime delete spacetime-app-game --server local
```
# Database CMD and Checks:
```
spacetime publish --delete-data spacetime-app-game --server local
```

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

# Refs:
- https://spacetimedb.com/docs/functions/views
- https://spacetimedb.com/docs/functions/procedures
- https://spacetimedb.com/docs/tutorials/chat-app/
- 
