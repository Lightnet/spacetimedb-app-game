// main entry point browser

import van from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.6.0.min.js"

import { DbConnection, tables } from './module_bindings';
// import { Identity } from 'spacetimedb';
// import * as stdb from 'spacetimedb';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
// import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js';
import { Pane } from 'tweakpane';
// import { plugins as TweakpaneTablePlugin } from 'tweakpane-table';
// import { CompactKitBundle } from 'tweakpane-compact-kit';
// console.log(stdb);

const PARAMS = {
  speed: 0.5,
  message: 'hello, world',
  selectedId:"",
  theme: '',
  hidden: true,
  background: {r: 255, g: 0, b: 55},
  tint: {r: 0, g: 255, b: 214, a: 0.5},
  offset: {x: 50, y: 25},
  tick:0,
  tick_rate:0,
  msSinceLastServerTick:0,
  lastServerTickTimeMs:0,

  wall_x:0,
  wall_y:0,
  wall_z:0,

  block_x:1.0,
  block_y:0,
  block_z:0,

  update1:()=>{
    updateList(newItems);
  },
  update2:()=>{
    updateList(newItems2);
  },
};


// import { Value } from 'three/examples/jsm/inspector/ui/Values.js';
// spacetime sql --server local spacetimedb-app-game "SELECT * FROM message"

const {div, button, label, input, li, ul} = van.tags;

const HOST = 'ws://localhost:3000';
const DB_NAME = 'spacetime-app-game';

const keys = {
  forward:  false,
  backward: false,
  left:     false,
  right:    false,
  // jump:  false,   ← add later when you need it
};
// GRID
const size = 10;
const divisions = 10;
// MESSAGES
const chat_messages = div({style:`background-color:gray;`});
const chat_box = div({style:`background-color:gray;`});
const entity_position = div({style:`background-color:gray;`});
const wall_positions = div({style:`background-color:gray;`});

const el_status = van.state('None');
const username = van.state('Guest');
//-----------------------------------------------
// THREEJS
//-----------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 5;
camera.position.y = 5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// scene.background = new THREE.Color(0x87CEEB); // Sky blue color

function apply_user(ctx){
  // console.log("apply");
  // console.log(`Ready with ${ctx.db.user.count()} users`);
  // console.log(ctx);
}

function apply_messages(ctx){
  // console.log("apply");
  // console.log(`Ready with ${ctx.db.message.count()} messages`);
  // console.log(ctx);
}

function check_position(row){
  const elEntity = document.getElementById(row.identity.toHexString())
  //entity_position
  if(elEntity){
    elEntity.remove();
    van.add(entity_position,div({id:row.identity.toHexString()},
      label('entity:' + row.identity.toHexString().substring(0,16)),
      label(" x: ",row.x.toFixed(4)),
      label(" y: ",row.y.toFixed(4)),
      label(" z: ",row.z.toFixed(4))
    ))
  }else{
    van.add(entity_position,div({id:row.identity.toHexString()},
      label('entity:' + row.identity.toHexString().substring(0,16)),
      label(" x: ",row.x.toFixed(4)),
      label(" y: ",row.y.toFixed(4)),
      label(" z: ",row.z.toFixed(4))
    ))
  }
}

// https://spacetimedb.com/docs/clients/api/
// 
// spacetime sql --server local spacetime-app-map "SELECT * FROM user"
var current_id = null;
const conn = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(localStorage.getItem('auth_token') || undefined)
  .onConnect((conn, identity, token) => {
    localStorage.setItem('auth_token', token);
    console.log('Connected with identity:', identity.toHexString());
    el_status.val = 'Connected';
    console.log("identity: ", identity);
    // const user = conn.db.user.identity.find(identity);//nope
    // const user = conn.db.user.identity.find('0x'+identity.toHexString());
    // const user = conn.db.user.identity.find('0x'+identity.toHexString());
    // console.log("user: ",user);
    current_id = identity;
    // const user = conn.db.user.identity.find(identity);//nope
    // console.log("user: ",user);

    conn
      .subscriptionBuilder()
        .onApplied((ctx) => apply_user(ctx))
        .onError((ctx, error) => {
          console.error(`Subscription failed: ${error}`);
        })
        .subscribe(tables.user);

    conn
      .subscriptionBuilder()
        .onApplied((ctx) => apply_messages(ctx))
        .onError((ctx, error) => {
          console.error(`Subscription failed: ${error}`);
        })
        .subscribe(tables.message);

    conn
      .subscriptionBuilder()
      .subscribe(tables.Entity);
    conn
      .subscriptionBuilder()
      .subscribe(tables.game_current_tick);

    conn.db.user.onInsert((ctx, row)=>{
      // console.log('insert user row');
      // console.log(row);
      // console.log(row.identity.toHexString());
      //console.log(ctx.identity);//nope, does not exist
      // console.log(conn.identity.toHexString());
      // check if current user client to update their name display
      if(row.identity.toHexString() == conn.identity.toHexString()){
        // console.log("found current ID:", conn.identity.toHexString());
        username.val = row.name;
      }
    });

    // any change on user.
    conn.db.user.onUpdate((ctx, oldRow, newRow)=>{
      // console.log("update???");
      // console.log("oldRow:", oldRow);
      // console.log("newRow:", newRow);
    })

    //add message on first and if there old message will be added here.
    conn.db.message.onInsert((ctx, row)=>{
      // console.log('insert message row');
      // console.log(`Message:`, row.text);
      // console.log(row)
      van.add(chat_messages,div(
        label(row.sender.toHexString().substring(0, 8)),
        label(' Msg:'),
        label(row.text),
      ))

    });

    conn.db.Entity.onInsert((ctx, row)=>{
      // console.log('insert entity row');
      // console.log(row);
      check_position(row);
      update_model_player(row);
    });

    // any change on user.
    conn.db.Entity.onUpdate((ctx, oldRow, newRow)=>{
      // console.log("update???");
      // console.log("oldRow:", oldRow);
      // console.log("newRow:", newRow);
      check_position(newRow);
      update_model_player(newRow);
    })

    conn
      .subscriptionBuilder()
      .subscribe(tables.Obstacle3D);

    conn.db.Obstacle3D.onInsert((ctx, row)=>{
      // console.log('insert Obstacle3D row');
      // console.log(row);
      update_wall(row);
      update_model_wall(row);
    });


    conn.db.Obstacle3D.onDelete((ctx, row)=>{
      // console.log('delete Obstacle3D row');
      // console.log(row);
      delete_wall(row);
      // update_model_wall(row);
    });

    conn.db.game_current_tick.onUpdate((ctx, oldRow, newRow)=>{
      // console.log("update???");
      // console.log("oldRow:", oldRow);
      console.log("newRow:", newRow);
    })

    conn.db.game_current_tick.onInsert((ctx, row)=>{
      // console.log('insert Obstacle3D row');
      
      // console.log(row);
      // const millis = Number(row.lastTickTimestamp.toMillis());
      // console.log(millis)
      // const date = new Date(millis);  
      // console.log("Last tick as Date:", date.toISOString());

      // guess work???
      // if (row) {
      //   const ts = row.lastTickTimestamp;                    // Timestamp type
      //   const millisBig = ts.toMillis();                       // bigint
      //   const millisNum = Number(millisBig);                   // safe here (far from Number.MAX_SAFE_INTEGER)
      //   const now = Date.now();
      //   const msAgo = now - millisNum;
      //   PARAMS.tick_rate = msAgo;
      // }
      if (row) {
        const lastServerTickMs = Number(row.lastTickTimestamp.toMillis());

        const nowMs = Date.now();
        const msSinceLastServerTick = nowMs - lastServerTickMs;

        // Most useful value for client prediction / interpolation:
        PARAMS.msSinceLastServerTick = msSinceLastServerTick;

        // Optional: also keep the absolute server time if needed later
        PARAMS.lastServerTickTimeMs = lastServerTickMs;

        // Debug / monitoring
        // console.log(`Server last tick was ${msSinceLastServerTick.toFixed(0)} ms ago`);

      }
    });

  })
  .onDisconnect(() => {
    console.log('Disconnected from SpacetimeDB');
    el_status.val = 'Disconnected';
  })
  .onConnectError((_ctx, error) => {
    console.error('Connection error:', error);
    // statusEl.textContent = 'Error: ' + error.message;
    // statusEl.style.color = 'red';
  })
  .build();

// console.log("conn.reducers");
// console.log(conn.reducers);
// console.log("vanjs test");

function App(){
  const isEdit = van.state(false);
  const message = van.state('');
  const text_content = van.state('');
  // const isDone = van.state(false);
  const isDone = van.state(true);

    function test(){
        console.log("test");
        console.log(conn.reducers);
        // conn.reducers.sayHello();
    }

    const render_name = van.derive(()=>{
      if(isEdit.val){
        return input({value:username,oninput:e=>username.val=e.target.value})
      }else{
        return label(username.val)
      }
    });

    // update name
    function update_name(){
      console.log("update name");
      conn.reducers.setName({name:username.val})
      isEdit.val = false;
    }

    const name_mode =  van.derive(()=>{
      if(isEdit.val){
        return button({onclick:update_name},'Update')
      }else{
        return button({onclick:()=>isEdit.val=!isEdit.val},'Edit')
      }
    });

    function click_sent(){
      console.log("message: ", message.val);

      conn.reducers.sendMessage({
          text:message.val
        });
    }

    function typing_message(e){
      if (e.key === "Enter") {
        console.log("Input Value:", e.target.value)
        // Add your logic here
        conn.reducers.sendMessage({
          text:e.target.value
        });
      }
    }

    function setup(){
      van.add(chat_box, input({value:message,oninput:e=>message.val=e.target.value,onkeydown:e=>typing_message(e)}))
      van.add(chat_box, button({onclick:click_sent},'Send'))
    }

    setup();
    //{style:`background-color:gray;`}
    return div({style:`position: fixed; top: 0; left: 0;background-color:gray;`},
      div(
        label("Status: "),
        el_status
      ),
      div(
        name_mode,
        label('Name: '),
        render_name,
      ),

      chat_box,
      chat_messages,
      entity_position,
      wall_positions
    )
}

van.add(document.body, App());

function updateMovement() {
  const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const dy = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);

  conn.reducers.updateInput({
    directionX: dx,
    directionY: -dy,
    jump: false   // ← change when you add jump
  });
}

window.addEventListener('keydown', e => {
  // Prevent repeating keys from browser (very important!)
  if (e.repeat) return;

  switch (e.code) {
    case 'KeyW': keys.forward  = true; break;
    case 'KeyS': keys.backward = true; break;
    case 'KeyA': keys.left     = true; break;
    case 'KeyD': keys.right    = true; break;
    case 'KeyR':
      console.log('reset');
      conn.reducers.setPlayerPosition({ x: 0, y: 0, z: 0 });
      return; // no need to update movement
  }

  updateMovement();
});

window.addEventListener('keyup', e => {
  switch (e.code) {
    case 'KeyW': keys.forward  = false; break;
    case 'KeyS': keys.backward = false; break;
    case 'KeyA': keys.left     = false; break;
    case 'KeyD': keys.right    = false; break;
    // KeyR doesn't affect movement → ignore
  }
  updateMovement();
});

// Optional: also handle lost focus (very common bug source)
window.addEventListener('blur', () => {
  // Reset all keys when tab/window loses focus
  Object.keys(keys).forEach(k => keys[k] = false);
  updateMovement();
});

//-----------------------------------------------
// 
//-----------------------------------------------
// const geometry = new THREE.BoxGeometry( 1, 1, 1 );
// const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
// const cube = new THREE.Mesh( geometry, material );
// scene.add( cube );

const gridHelper = new THREE.GridHelper( size, divisions );
scene.add( gridHelper );

const controls = new OrbitControls( camera, renderer.domElement );

const newItems = [
  { id: '101', name: 'Updated Item A' },
  { id: '102', name: 'Updated Item B' }
];

const newItems2 = [
  { id: '102', name: 'Updated Item C' },
  { id: '104', name: 'Updated Item D' }
];


// https://tweakpane.github.io/docs/input-bindings/#number

const pane = new Pane();
// pane.element.parentElement.classList = 'tableContainer';
// pane.registerPlugin(TweakpaneTablePlugin);
// pane.registerPlugin(CompactKitBundle);

// pane.addBinding(PARAMS, 'speed');
// pane.addBinding(PARAMS, 'message');
// pane.addBinding(PARAMS, 'theme', {
//   options: {
//     none: '',
//     dark: 'dark-theme.json',
//     light: 'light-theme.json',
//   },
// });
// pane.addBinding(PARAMS, 'hidden');
// pane.addBinding(PARAMS, 'background');
// pane.addBinding(PARAMS, 'tint');
// pane.addBinding(PARAMS, 'offset');

const application = pane.addFolder({
  title: 'Application',
  rows: 5,
});

const app_tick = application.addFolder({
  title: 'Tick',
  rows: 5,
});

app_tick.addBinding(PARAMS, 'msSinceLastServerTick',{
  readonly: true, 
  label:'Server Tick(ms):',
  view: 'graph',
  min: 0,
  // max: 300,
  // max: 100,
  max: 60,
});

app_tick.addButton({
  title: 'Start',
  // label: 'Tick',   // optional
}).on('click', () => {
  conn.reducers.gameStartTick({});
});
app_tick.addButton({
  title: 'Stop',
  // label: 'Tick',   // optional
}).on('click', () => {
  conn.reducers.gameStopTick({});
});
app_tick.addBinding(PARAMS, 'tick', {
  min: 1,
  max: 120
});
app_tick.addButton({
  title: 'Set',
  // label: 'Tick',   // optional
}).on('click', () => {
  console.log("tick:", PARAMS.tick);
  conn.reducers.gameSetTickRate({tick:PARAMS.tick})
});

const playerPane = pane.addFolder({
  title: 'Player',
  rows: 5,
});

playerPane.addButton({
  title: 'Reset',
  label: 'Position',   // optional
});

const block = pane.addFolder({
  title: 'Block',
  rows: 5,
});

block.addBinding(PARAMS, 'block_x',{label:'x'});
block.addBinding(PARAMS, 'block_y',{label:'y'});
block.addBinding(PARAMS, 'block_z',{label:'z'});
block.addButton({
  title: ' Block',
  label: 'Spawn',   // optional
}).on('click', () => {
  console.log("spawn x:", PARAMS.block_x, " y: ", PARAMS.block_y ," z:", PARAMS.block_z);
  conn.reducers.createObstacle({
      x: PARAMS.block_x,
      y: PARAMS.block_y,
      z: PARAMS.block_z
    });
});


// pane.addBinding(PARAMS, 'wave', {
//   // readonly: true,
//   // bufferSize: 10,
//   multiline: true,
//   rows: 5,
// });

// const btn = pane.addButton({
//   title: 'test',
//   label: 'counter',   // optional
// });
// btn.on('click', () => {
//   updateList(newItems);
// });
// const btn2 = pane.addButton({
//   title: 'test',
//   label: 'counter',   // optional
// });
// btn2.on('click', () => {
//   updateList(newItems2);
// });

// const folderdd = pane.addFolder({ title: 'Dynamic Data' });
// function updateList(newData) {
//   // Dispose of all items in this specific folder
//   folderdd.children.forEach(child => child.dispose());

//   // Re-add the binding inside the folder
//   folderdd.addBinding(PARAMS, 'selectedId', {
//     label:'test',
//     options: newData.map(i => ({ text: i.name, value: i.id }))
//   });
// }

// updateList(newItems);

// const f1 = pane.addFolder({
//   title: 'Basic',
//   rows: 5,
// });

// f1.addBinding(PARAMS, 'speed');

// const items = [
//   { id: 'uid-10', name: 'Alpha' },
//   { id: 'uid-20', name: 'Beta' },
// ];

// // Convert to Tweakpane format
// const dynamicOptions = items.map(item => ({
//   text: item.name, 
//   value: item.id
// }));

// pane.addBinding(PARAMS, 'selectedId', {
//   options: dynamicOptions,
// });


// scene.traverse((obj) => {
//   if (obj.userData.disposeMe) {
//     toRemove.push(obj);
//   }
// });

// // or even shorter with for...of (but only direct children)
// for (const obj of scene.children) {
//   // no recursion
// }

//-----------------------------------------------
// PLAYER
//-----------------------------------------------
function create_cube(row){
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshBasicMaterial( { 
    // color: 0x00ffff //green light
    color: 0x008000 //green
  });
  const cube = new THREE.Mesh( geometry, material );
  cube.userData.row = row;
  cube.position.x = row.x;
  cube.position.y = row.y;
  cube.position.z = row.z;
  scene.add( cube );
}

function update_model_player(row){
  let isFound = false;
  // console.log("check====================:", isFound);
  // scene.traverse()
  for (const obj_model of scene.children) {
    // no recursion
    // console.log(obj_model.userData)
    if (obj_model.userData?.row){
      if (obj_model.userData.row.identity.toHexString() == row.identity.toHexString()){
        isFound = true;
        obj_model.userData.row = row;
        obj_model.position.x = row.x;
        obj_model.position.z = row.z;
        break;
      }
    }
  }
  // console.log("isFound:", isFound);
  if(isFound){
  }else{
    // console.log('create cube');
    create_cube(row);
  }
}
//-----------------------------------------------
// WALL
//-----------------------------------------------

function click_wall_delete(id){
  console.log("delete id:", id);
  conn.reducers.deleteObstacle({id});
}

function delete_wall(row){
  const el_item = document.getElementById(row.id);
  el_item.remove()
}

function update_wall(row){

  const el_item = document.getElementById(row.id);

  if(!el_item){
    
    van.add(wall_positions,div({id:row.id},
      label('ID:', row.id),
      label(' x:' + row.position.x.toFixed(2) +' y:' + row.position.y.toFixed(2) +' z:' + row.position.z.toFixed(2)),
      button({onclick:()=>click_wall_delete(row.id)},'delete')
    ));
  }else{
    el_item.remove();
    van.add(wall_positions,div({id:row.id},
      label('ID:', row.id),
      label(' x:' + row.position.x +' y:' + row.position.x +' z:' + row.position.x),
      button({onclick:()=>click_wall_delete(row.id)},'delete')
    ));
  }
}

function create_wall(row){
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshBasicMaterial( { 
    // color: 0x00ffff //green light
    color: 0xFF0000 //red
  });
  const cube = new THREE.Mesh( geometry, material );
  console.log("wall row");
  console.log(row);
  cube.userData.row = row;
  cube.position.x = row.position.x;
  cube.position.y = row.position.y;
  cube.position.z = row.position.z;
  console.log(cube.position);
  scene.add( cube );
}

function update_model_wall(row){
  let isFound = false;
  // console.log("check====================:", isFound);
  // scene.traverse()
  for (const obj_model of scene.children) {
    // no recursion
    // console.log(obj_model.userData)
    if (obj_model.userData?.row){
      if (obj_model.userData.row?.id == row.id){
        isFound = true;
        obj_model.userData.row = row;
        obj_model.position.x = row.x;
        obj_model.position.z = row.z;
        break;
      }
    }
  }
  console.log("isFound:", isFound);
  if(isFound){
  }else{
    // console.log('create cube');
    create_wall(row);
  }
}

function animate( time ) {

  if(controls){
    controls.update();
  }
  renderer.render( scene, camera );
  // cube.rotation.x = time / 2000;
  // cube.rotation.y = time / 1000;
}
renderer.setAnimationLoop( animate );

function onWindowResize(event){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener('resize',onWindowResize);

