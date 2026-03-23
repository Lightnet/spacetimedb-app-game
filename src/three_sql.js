// sqlite wasm
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.183.2/+esm';
import van from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.6.0.min.js"
import sqlite3InitModule from 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.51.2-build8/+esm';

const log = console.log;
const error = console.error;
var sqlite3;
var db;

var scene = null;
var camera = null;
var renderer = null;

const initializeSQLite = async () => {
  try {
      log('Loading and initializing SQLite3 module...');
      sqlite3 = await sqlite3InitModule({
          locateFile: (filename, scriptDirectory) => {
          // Most common cases:
          if (filename.endsWith('.wasm')) {
            // return 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.51.2-build8/sqlite3.wasm';  // ← your custom path
            return 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.51.2-build8/dist/sqlite3.wasm';  // ← your custom path
            // or relative: return '/assets/sqlite3.wasm';
          }
          // fallback — important for other files (e.g. .js if any)
          return scriptDirectory + filename;
        },
        // Optional: useful for debugging
        print: console.log,
        printErr: console.error
      });
      log('Done initializing. Running demo...');
      start(sqlite3);
    } catch (err) {
      console.error('Initialization error:', err.name, err.message);
    }
};

const start = (sqlite3) => {
  log('Running SQLite3 version', sqlite3.version.libVersion);
  db =
    'opfs' in sqlite3
      ? new sqlite3.oo1.OpfsDb('/mydb.sqlite3')
      : new sqlite3.oo1.DB('/mydb.sqlite3', 'ct');
  log(
    'opfs' in sqlite3
      ? `OPFS is available, created persisted database at ${db.filename}`
      : `OPFS is not available, created transient database ${db.filename}`,
  );
  // Your SQLite code here.
  // console.log(db);
  runCrubDemo(db);
};

function runCrubDemo(db){

  // Setup schema & data (exec supports multi-statement strings)
  db.exec(`
    CREATE TABLE entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      radius REAL DEFAULT 1.0
    );

    INSERT INTO entities (type, x, y, z, radius) VALUES
      ('player',   0, 0, 0, 1.2),
      ('obstacle', 5, 0, 0, 2.0),
      ('obstacle',-4, 0, 3, 1.5);
  `);

  setup_init();
  setup_three();
  syncScene();
  animate();
}

const keys = {};

function setup_init(){
  
  addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

  // Optional: log version
  console.log('SQLite version:', sqlite3.version.libVersion);
}

function setup_three(){
  // ────────────────────────────────────────
  // Three.js setup (sync from DB)
  // ────────────────────────────────────────
  // console.log("threejs");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 12);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(10, 15, 7);
  scene.add(dirLight, new THREE.AmbientLight(0x404060));

  renderer.setSize(innerWidth, innerHeight);
  // console.log(renderer);
  // document.body.appendChild(renderer.domElement);
  van.add(document.body, renderer.domElement);
  window.addEventListener('resize', resizeWindow)
}

function resizeWindow(event){
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  // Update the camera's aspect ratio
  camera.aspect = newWidth / newHeight;
  // Call updateProjectionMatrix() to apply the camera changes
  camera.updateProjectionMatrix();
  // Update the renderer's size
  renderer.setSize(innerWidth, innerHeight);
}

function animate(){
  const speed = 0.12;
  let moved = false;
  
  if (keys['w']) { tryMoveEntity(1,  0, 0, -speed); moved = true; }
  if (keys['s']) { tryMoveEntity(1,  0, 0,  speed); moved = true; }
  if (keys['a']) { tryMoveEntity(1, -speed, 0, 0); moved = true; }
  if (keys['d']) { tryMoveEntity(1,  speed, 0, 0); moved = true; }

  if (moved) syncScene();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const meshes = new Map();

function syncScene(){
  let entities = getEntities();
  // console.log(entities);

  // Cleanup deleted
  for (const [idStr, mesh] of meshes) {
    const id = +idStr;
    if (!entities.some(e => e.id === id)) {
      scene.remove(mesh);
      meshes.delete(idStr);
    }
  }

  // Update/create
  for (const e of entities) {
    let mesh = meshes.get(String(e.id));
    if (!mesh) {
      const geo = new THREE.SphereGeometry(e.radius || 1, 16, 12);
      const color = e.type === 'player' ? 0x44ff44 : 0xff4444;
      mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color }));
      scene.add(mesh);
      meshes.set(String(e.id), mesh);
    }
    mesh.position.set(e.x, e.y, e.z);
  }

}

// Helper: get all entities as array of plain objects
function getEntities() {
  const rows = [];
  db.exec({
    sql: 'SELECT * FROM entities',
    rowMode: 'object',
    callback: row => rows.push(row)
  });
  return rows;
}

function tryMoveEntity(id, dx, dy, dz) {
  // console.log("move...");
  const row  = db.selectObject('SELECT x, y, z, radius FROM entities WHERE id=?',[id]);
  console.log(row );
  if (row === undefined) {
    console.log(`Entity id=${id} not found`);
    return false;
  }
  console.log("Current position & radius:", row);

  const { x, y, z, radius } = row;

  // Now do your collision check / new position calculation here...
  const newX = x + dx;
  const newY = y + dy;
  const newZ = z + dz;
  console.log("newX: ",newX)

  // Example update (only if movement is valid)
  // _db.exec('UPDATE entities SET x=?, y=?, z=? WHERE id=?', [newX, newY, newZ, id]);
  db.exec({
    sql:'UPDATE entities SET x=?, y=?, z=? WHERE id=?',
    bind:[newX, newY, newZ, id]
  });


  // ── Parameterized UPDATE ───────────────────────────────────────
  // const updateStmt = _db.prepare(`
  //   UPDATE entities
  //   SET x = ?, y = ?, z = ?
  //   WHERE id = ?
  // `);
  // updateStmt.bind([newX, newY, newZ, id]);
  // updateStmt.step();          // executes the update (returns true if ok)
  // updateStmt.finalize();
  // ──-----------------------───────────────────────────────────────


}

initializeSQLite();