// main entry point browser

import van from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.6.0.min.js"
import { DbConnection, tables } from './module_bindings';
// import { Identity } from 'spacetimedb';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ViewportGizmo } from "three-viewport-gizmo";
import { Pane } from "tweakpane";

// import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
// import { Value } from 'three/examples/jsm/inspector/ui/Values.js';

// spacetime sql --server local spacetimedb-app-physics "SELECT * FROM message"

const HOST = 'ws://localhost:3000';
const DB_NAME = 'spacetime-app-physics';

const {div, button, label, input, li, ul} = van.tags;

const PARAMS = {
  key:"WASD = MOVEMENT",
  key1:"R = Rest Position",
  key2:"X = Test Foo",
  block_position:{x:0,y:0,z:0}
}

const wall_positions = div({style:`background-color:gray;`});
const size = 10;
const divisions = 10;
const chat_messages = div();
const chat_box = div();
const entity_position = div({style:`background-color:gray;`});
const el_status = van.state('None');
const username = van.state('Guest');
//-----------------------------------------------
// THREE JS
//-----------------------------------------------
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x87CEEB); // Sky blue color
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 5;
camera.position.y = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
const controls = new OrbitControls( camera, renderer.domElement );
const gizmo = new ViewportGizmo(camera, renderer,{
  placement: "bottom-right",
});
gizmo.attachControls(controls);

//-----------------------------------------------
// 
//-----------------------------------------------
function create_cube_wireframe(){
  const cgeometry = new THREE.BoxGeometry( 1, 1, 1 );
  // const cmaterial = new THREE.MeshBasicMaterial({
  const cmaterial = new THREE.MeshStandardMaterial({
    // color: 0x000000,
    color: 0x00bfff,// blue
    wireframe:true
  });
  const ccube = new THREE.Mesh( cgeometry, cmaterial );
  // scene.add( cube );
  return ccube;
}

const ph_cube = create_cube_wireframe();


const axesHelper = new THREE.AxesHelper(2);
axesHelper.add(ph_cube);
scene.add(axesHelper);



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
      label('[entity:' + row.identity.toHexString().substring(0,16) + " ]"),
      label(" x: ",row.position.x.toFixed(4)),
      label(" y: ",row.position.y.toFixed(4)),
      label(" z: ",row.position.z.toFixed(4))
    ))
  }else{
    van.add(entity_position,div({id:row.identity.toHexString()},
      label('[ entity:' + row.identity.toHexString().substring(0,16) + " ]"),
      label(" x: ",row.position.x.toFixed(4)),
      label(" y: ",row.position.y.toFixed(4)),
      label(" z: ",row.position.z.toFixed(4))
    ))
  }
}

// https://spacetimedb.com/docs/clients/api/
// 
// spacetime sql --server local spacetime-app-map "SELECT * FROM user"
// var current_id = null;
const conn = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(localStorage.getItem('auth_token') || undefined)
  .onConnect((conn, identity, token) => {
    // localStorage.setItem('auth_token', token);
    // console.log('Connected with identity:', identity.toHexString());
    el_status.val = 'Connected';
    setupDBListen();
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

function setupDBListen(){
  setupDBUser();
  //setupDBMessages()
  setupDBEntities();
  setupDBObstacle();

    // conn
    //   .subscriptionBuilder()
    //     .onApplied((ctx) => apply_messages(ctx))
    //     .onError((ctx, error) => {
    //       console.error(`Subscription failed: ${error}`);
    //     })
    //     .subscribe(tables.message);
}

function setupDBUser(){
  conn
    .subscriptionBuilder()
    .onApplied((ctx) => apply_user(ctx))
    .onError((ctx, error) => {
      console.error(`Subscription failed: ${error}`);
    })
    .subscribe(tables.user);

    conn.db.user.onInsert((ctx, row)=>{
      // console.log('insert user row');
      // console.log(row);
      // check if current user client to update their name display
      if(row.identity.toHexString() == conn.identity.toHexString()){
        // console.log("found current ID:", conn.identity.toHexString());
        username.val = row.name;
      }
    });

    // any change on user.
    conn.db.user.onUpdate((ctx, oldRow, newRow)=>{
      console.log("update???");
      console.log("oldRow:", oldRow);
      console.log("newRow:", newRow);
    })
}

function setupDBMessages(){
  //add message on first and if there old message will be added here.
  // conn.db.message.onInsert((ctx, row)=>{
  //   // console.log('insert message row');
  //   // console.log(`Message:`, row.text);
  //   // console.log(row)
  //   van.add(chat_messages,div(
  //     label(row.sender.toHexString().substring(0, 8)),
  //     label(' Msg:'),
  //     label(row.text),
  //   ))
  // });
}

function setupDBEntities(){
  // conn
  //   .subscriptionBuilder()
  //   .subscribe(tables.PlayerInput);
  // conn
  //   .subscriptionBuilder()
  //   .subscribe(tables.Transform3D);

  conn
    .subscriptionBuilder()
    .subscribe(tables.Entity);

  conn.db.Entity.onInsert((ctx, row)=>{
    console.log('insert Entity row');
    // console.log(row);
    check_position(row);
    update_model_player(row);
  });

  conn.db.Entity.onUpdate((ctx, oldRow, newRow)=>{
    // console.log("update Entity");
    // console.log("oldRow:", oldRow);
    // console.log("newRow:", newRow);
    check_position(newRow);
    update_model_player(newRow);
  })

  // conn.db.Transform3D.onUpdate((ctx, oldRow, newRow)=>{
  //   console.log("update Transform3D");
  //   // console.log("oldRow:", oldRow);
  //   // console.log("newRow:", newRow);
  // })

  // conn
  //   .subscriptionBuilder()
  //   // .onApplied((ctx) => apply_user(ctx))
  //   // .onError((ctx, error) => {
  //   //   console.error(`Subscription failed: ${error}`);
  //   // })
  //   .subscribe(tables.Entity);

  // conn.db.Entity.onInsert((ctx, row)=>{
  //   // console.log('insert entity row');
  //   // console.log(row);
  //   // check_position(row);
  //   // update_model_player(row);
  // });

  // any change on user.
  // conn.db.Entity.onUpdate((ctx, oldRow, newRow)=>{
  //   // console.log("update???");
  //   // console.log("oldRow:", oldRow);
  //   // console.log("newRow:", newRow);
  //   // check_position(newRow);
  //   // update_model_player(newRow);
  // })

}

//-----------------------------------------------
// WALL
//-----------------------------------------------
function click_wall_delete(id){
  console.log("delete id:", id);
  conn.reducers.deleteObstacle({id});
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

function delete_wall(row){
  const el_item = document.getElementById(row.id);
  el_item.remove();

  scene.traverse((obj) => {
    if (obj.userData?.row?.id == row.id) {
      // obj.remove(); // nope...
      scene.remove(obj)
      console.log(obj.userData);
      console.log("found????")
      // toRemove.push(obj);
    }
  });
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
        obj_model.position.x = row.position.x;
        obj_model.position.y = row.position.y;
        obj_model.position.z = row.position.z;
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

function setupDBObstacle(){
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
  });
}

//-----------------------------------------------
// APP
//-----------------------------------------------
function App(){
  const isEdit = van.state(false);
  const message = van.state('');
  const text_content = van.state('');
  // const isDone = van.state(false);
  const isDone = van.state(true);

    // function test(){
    //     console.log("test");
    //     console.log(conn.reducers);
    //     // conn.reducers.sayHello();
    // }

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

    return div({style:`position: fixed; top: 0; left: 0;background-color:gray;`},
        div(
          label("Status: "),
          el_status
        ),
        // div(
        //   name_mode,
        //   label('Name: '),
        //   render_name,
        // ),
        // chat_box,
        // chat_messages,
        entity_position,
        wall_positions
    )
}

van.add(document.body, App());
// ======================
// KEYBOARD CONTROLS (Normalized Diagonal Movement)
// ======================

const MOVEMENT_SPEED = 1.0;

// Track which keys are currently pressed
const pressedKeys = new Set();

// Current input state
let currentInput = {
  x: 0.0,
  y: 0.0,
  jump: false
};

// Normalize vector so diagonal movement isn't faster
function normalizeMovement(x, y) {
  const length = Math.sqrt(x * x + y * y);
  if (length === 0) return { x: 0, y: 0 };
  
  return {
    x: (x / length) * MOVEMENT_SPEED,
    y: (y / length) * MOVEMENT_SPEED
  };
}

// Send input to your game/connection
function updateInput() {
  try {
    conn.reducers.updateInput(currentInput);
  } catch (error) {
    console.error("Failed to update input:", error);
  }
}

// ====================
// KEY DOWN
// ====================
function handleKeyDown(event) {
  const key = event.code;

  // Add to pressed keys
  pressedKeys.add(key);

  // Handle movement keys
  if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(key)) {
    updateMovementDirection();
  }

  // Special actions
  if (key === 'KeyR') {
    console.log('Reset player position');
    conn.reducers.setPlayerPosition({ x: 0, y: 0, z: 0 });
  }

  if (key === 'KeyX') {
    console.log('Testing testFoo...');
    console.log('Reducers available:', Object.keys(conn.reducers || {}));
    try {
      conn.reducers.testFoo({});
    } catch (err) {
      console.error("testFoo failed:", err);
    }
  }
}

// ====================
// KEY UP
// ====================
function handleKeyUp(event) {
  const key = event.code;
  pressedKeys.delete(key);

  // Only recalculate if it was a movement key
  if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(key)) {
    updateMovementDirection();
  }
}

// ====================
// CALCULATE MOVEMENT
// ====================
function updateMovementDirection() {
  let moveX = 0;
  let moveY = 0;

  if (pressedKeys.has('KeyW')) moveY -= 1;
  if (pressedKeys.has('KeyS')) moveY += 1;
  if (pressedKeys.has('KeyA')) moveX -= 1;
  if (pressedKeys.has('KeyD')) moveX += 1;

  // Normalize for consistent speed (including diagonals)
  const normalized = normalizeMovement(moveX, moveY);

  currentInput.x = normalized.x;
  currentInput.y = normalized.y;
  // currentInput.jump remains false unless you add jump logic

  updateInput();
}

// ====================
// INIT
// ====================
function initKeyboardControls() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  console.log("✅ Keyboard controls initialized (normalized diagonal movement)");
}

// Call this once when your app starts
initKeyboardControls();

//-----------------------------------------------
// 
//-----------------------------------------------
function addLights(){
  // Add a HemisphereLight for subtle ambient lighting
  const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
  scene.add(ambientLight);

  // Set up the DirectionalLight
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Set up the shadow
  directionalLight.castShadow = true;

  // Optional: Adjust shadow camera for better control and performance (e.g., tighten frustum)
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
}
addLights();
function addGridHelper(){
  const gridHelper = new THREE.GridHelper( size, divisions );
  scene.add( gridHelper );
}
addGridHelper()

// const gui = new GUI();
// const app_game = {
//   name:"lil-gui"
// }
// gui.add( app_game, 'name' );   // Text Field
function createPlaneFloor(){
  const planeGeometry = new THREE.PlaneGeometry(10, 10);
  const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
  plane.position.y = -1;
  // Plane (receives shadows)
  plane.receiveShadow = true; // Object can receive shadows
  scene.add(plane);
}

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
// 
//-----------------------------------------------
function create_cube(row){
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshStandardMaterial( { 
    // color: 0x00ffff //green light
    color: 0x008000 //green
  });
  const cube = new THREE.Mesh( geometry, material );
  cube.castShadow = true; // Object can receive shadows
  cube.userData.row = row;
  cube.position.x = row.position.x;
  cube.position.y = row.position.y;
  cube.position.z = row.position.z;
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
        obj_model.position.x = row.position.x;
        obj_model.position.z = row.position.z;
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

function animate( time ) {
  if(controls){
    controls.update();
  }
  renderer.render( scene, camera );
  gizmo.render();
  // cube.rotation.x = time / 2000;
  // cube.rotation.y = time / 1000;
}

function onWindowResize(event){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
  gizmo.update();
}

window.addEventListener('resize',onWindowResize);


document.body.appendChild( renderer.domElement );
renderer.setAnimationLoop( animate );

function setupPane(){
  const pane = new Pane();


  const keysPane = pane.addFolder({
    title: 'Keys',
  });
  keysPane.addBinding(PARAMS, 'key',{disabled:true})
  keysPane.addBinding(PARAMS, 'key1',{disabled:true})
  keysPane.addBinding(PARAMS, 'key2',{disabled:true})


  const blockPane = pane.addFolder({
    title: 'Block',
  });

  blockPane.addBinding(PARAMS, 'block_position',{
    label:'Position'
  }).on('change', (ev) => {
    // console.log(PARAMS.block_position);
    axesHelper.position.set(
      PARAMS.block_position.x,
      PARAMS.block_position.y,
      PARAMS.block_position.z
    );
  });

  blockPane.addButton({title:'Spawn Block'})
    .on('click',()=>{
      console.log("Spawn Block");
      console.log("spawn x:", PARAMS.block_position.x, " y: ", PARAMS.block_position.y ," z:", PARAMS.block_position.z);
      conn.reducers.createObstacle({
        x: PARAMS.block_position.x,
        y: PARAMS.block_position.y,
        z: PARAMS.block_position.z
      });
    })
}

setupPane()
// end