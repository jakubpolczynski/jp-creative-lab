import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASCII_ROOM,ROOMS,WORLD_ROOMS,LAB_MONITOR} from '../rooms.js';
import {buildRoom,ROOM_SIGNS} from '../room-world.js';
import {cableEndpoints} from '../cable-physics.js';
import {rackIndexCount} from '../scene-geometry.js';

assert.equal(WORLD_ROOMS.length,5);
assert.equal(ASCII_ROOM.id,'monitor');
assert.deepEqual(ROOM_SIGNS.monitor,['ASCI','ART']);
const ascii=buildRoom(ASCII_ROOM),other=buildRoom(ROOMS[0]);
const sign=ascii.parts.find(p=>p.name==='wall-sign'),otherSign=other.parts.find(p=>p.name==='wall-sign');
assert.deepEqual(ascii.positions.slice(0,sign.start*3),other.positions.slice(0,otherSign.start*3),'Same floor, walls and trims');
for(const name of ['desk','computer','keyboard','mouse','chair']){
  const part=ascii.parts.find(p=>p.name===name),reference=other.parts.find(p=>p.name===name);
  assert.deepEqual(ascii.positions.slice(part.start*3,(part.start+part.count)*3),other.positions.slice(reference.start*3,(reference.start+reference.count)*3),name+' uses the identical template');
}
const endpoints=cableEndpoints(ASCII_ROOM),last=endpoints.b;
assert.deepEqual(endpoints.a,[-3.43,.727,.20],'Lowest rack shelf');
assert.deepEqual(last,[ASCII_ROOM.center[0]-2.33,1.84,ASCII_ROOM.center[2]-.45]);
assert.ok(last[0]<ASCII_ROOM.center[0]+LAB_MONITOR.center[0],'Cable ends behind screen');
assert.equal('cable' in ASCII_ROOM,false,'Only ports, never a hand-authored intermediate route');

// Read the real GLB, without importing its side-effectful Python generator.
const bytes=readFileSync(new URL('../room-server.44b95fcd4e41.glb',import.meta.url));
const size=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+size)),base=28+size;
function array(id,Type){
  const a=doc.accessors[id],v=doc.bufferViews[a.bufferView];
  return new Type(bytes.buffer,bytes.byteOffset+base+(v.byteOffset||0)+(a.byteOffset||0),a.count);
}
for(const p of doc.meshes[0].primitives){
  const indices=array(p.indices,Uint32Array),buttons=array(p.attributes._BUTTON,Float32Array);
  const count=rackIndexCount(buttons,indices);
  assert.ok(count>0&&count<indices.length&&count%3===0);
  for(const i of indices.slice(0,count))assert.equal(buttons[i],0);
  const firstRoom=buttons.findIndex(v=>v===1);
  assert.ok(indices.slice(0,count).every(i=>i<firstRoom),'Legacy cable appended after room is not drawn either');
}
assert.equal(rackIndexCount(new Float32Array([0,0,0,1,1,1]),new Uint32Array([0,1,2,3,4,5,0,1,2])),3);
assert.throws(()=>rackIndexCount(new Float32Array([0,0,0]),new Uint32Array([0,1,2])),/boundary/);
console.log('PASS: ASCII shared body, physical cable, endpoint attachment and rack-only legacy draw');
