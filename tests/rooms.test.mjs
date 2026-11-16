import assert from 'node:assert/strict';
import {ROOMS,worldBounds,roomFrame} from '../rooms.js';
import {buildRoom} from '../room-world.js';
import {cableEndpoints} from '../cable-physics.js';
import {PROJECTS} from '../projects.js';
assert.equal(ROOMS.length,4);
assert.equal(new Set(ROOMS.map(r=>r.id)).size,4);
let triangles=0;
for(const room of ROOMS){
  const mesh=buildRoom(room);
  assert.ok(mesh.positions.length>500);
  assert.equal(mesh.positions.length,mesh.colors.length);
  assert.equal(mesh.positions.length,mesh.normals.length);
  assert.ok(mesh.positions.every(Number.isFinite));
  triangles+=mesh.positions.length/9;
  assert.ok(Math.abs(room.port[0]-(-4.8+1.37))<1e-8);
  assert.deepEqual(cableEndpoints(room).b,[room.center[0]-2.33,1.84,room.center[2]-.45]);
  for(const size of [[1440,1000],[390,844],[844,390]]){
    const frame=roomFrame(room,...size);
    assert.ok(Number.isFinite(frame.height)&&frame.height>.76,'Camera zoom fits the physical computer screen');
  }
}
assert.ok(triangles<16000,{triangles});
const bounds=worldBounds({min:[-6,-1,-4],max:[9,6,4]});
for(const room of ROOMS)for(const j of [0,2]){
  const extent=j===0?3.3:2.8;
  assert.ok(bounds.min[j]<=room.center[j]-extent);
  assert.ok(bounds.max[j]>=room.center[j]+extent);
}
assert.equal(PROJECTS.length,1);
assert.equal(PROJECTS[0].title,'JP Creative Lab');
assert.equal(new URL(PROJECTS[0].repository).hostname,'github.com');
console.log(`rooms: 4 distinct rooms, ${triangles} triangles, bounds/cables/framing and genuine portfolio PASS`);
