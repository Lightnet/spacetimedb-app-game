# spacetime-app-game

# Licence: MIT

# SpaceTimeDB:
- binary application 2.0.5
- npm 2.0.4
- 

# Information:
  Work in progress just empty project base on spacetimedb and typescript.

# set up and config

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

# refs:
- https://spacetimedb.com/docs/functions/views
- https://spacetimedb.com/docs/functions/procedures
- 
