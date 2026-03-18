// main entry point browser

import van from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.6.0.min.js"

import { DbConnection, tables } from './module_bindings';
import { Identity } from 'spacetimedb';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

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
      label(" x: ",row.x),
      label(" y: ",row.y),
      label(" z: ",row.z)
    ))
  }else{
    van.add(entity_position,div({id:row.identity.toHexString()},
      label('entity:' + row.identity.toHexString().substring(0,16)),
      label(" x: ",row.x),
      label(" y: ",row.y),
      label(" z: ",row.z)
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
        // button({onclick:()=>test()},"test"),
        // button({onclick:()=>testHello()},"hello"),
        // button({onclick:()=>addTask()},"Add"),
        // button({onclick:()=>deleteTask()},"Delete"),
        // input({value:text_content,oninput:(e)=>text_content.val=e.target.value}),

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

const gui = new GUI();

const app_game = {
  name:"spacetimedb-app-game",
  move:'W,A,S,D',
  camera:'mouse move',
  reset_player:'R = Key, 0,0,0',
  addtest:()=>{
    conn.procedures.addTwoNumbers({ lhs: 10, rhs: 20 })
    .then(sum => {
        console.log(`The sum is: ${sum}`); // sum will be 30n (BigInt)
    })
    .catch(err => {
        console.error("Procedure failed:", err);
    });
  },
  add_block:()=>{
    console.log("added");
    conn.reducers.createObstacle({
      x:3.0,
      y:0.0,
      z:2.0
    });
  },
  start_tick:()=>{
    conn.reducers.gameStartTick({tick:30});
  },
  stop_tick:()=>{
    conn.reducers.gameStopTick({tick:30});
  },
  set_tick:()=>{
    conn.reducers.gameSetTickRate({tick:30});
  },
}
gui.add( app_game, 'name' ).disable();   // Text Field
gui.add( app_game, 'move' ).disable();
gui.add( app_game, 'camera' ).disable();
gui.add( app_game, 'reset_player' ).disable();
gui.add( app_game, 'addtest' );
gui.add( app_game, 'add_block' );

gui.add( app_game, 'start_tick' );
gui.add( app_game, 'stop_tick' );
gui.add( app_game, 'set_tick' );

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
      label(' x:' + row.position.x +' y:' + row.position.x +' z:' + row.position.x),
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

