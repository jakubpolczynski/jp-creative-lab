import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_ROOMS} from '../rooms.js';
import {createRoomLayout} from '../room-layout.js';
import {createCableWorld} from '../cable-world.js';
import {rackColliders} from '../scene-geometry.js';
const bytes=readFileSync(new URL('../room-server.44b95fcd4e41.glb',import.meta.url));
const size=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+size)),binary=bytes.subarray(28+size);
const layout=createRoomLayout(WORLD_ROOMS),world=createCableWorld({layout,rackBoxes:rackColliders(doc,binary)});
for(let n=0;n<=300;n++)world.advance(n/30);
for(const {id,rope} of world.frame.cables){
  assert.ok(rope.points.length<400,id+' stable topology without runaway material loops');
  assert.ok(rope.points.flat().every(Number.isFinite));
  for(let i=2;i<rope.points.length-1;i++)assert.equal(world.collision.segmentHit(rope.points[i-1],rope.points[i],.085),null,id+': segment/radius clearance');
}
const version=world.ropes.get('monitor').version;world.advance(10);assert.equal(world.ropes.get('monitor').version,version,'A second render pass must not step physics');
layout.move('gallery',[-15,0,-18]);world.advance(10.033);
for(const {id,rope} of world.frame.cables)assert.deepEqual(rope.points.at(-1),layout.room(id).center.map((v,j)=>v+[-2.33,1.84,-.45][j]));
const staticWorld=createCableWorld({layout:createRoomLayout(WORLD_ROOMS)});
staticWorld.advance(0,{monitor:{lift:0,scale:1,glow:0}},undefined,{},true);
const staticVersion=staticWorld.ropes.get('monitor').version;
staticWorld.advance(.1,{monitor:{lift:0,scale:1,glow:1}},undefined,{},true);
assert.equal(staticWorld.ropes.get('monitor').version,staticVersion,'Hover/click glow must not change reduced-motion cable geometry');
console.log('PASS 10 seconds of five-cable stability, real rack/furniture capsule clearance, no double step, moved endpoints');
