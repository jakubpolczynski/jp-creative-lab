import assert from 'node:assert/strict';
import {boxCollider,createCollisionWorld,segmentBoxHit,segmentIntersects} from '../collisions.js';
import {createRoomMotion,stepRoomMotion} from '../interaction.js';
import {createCableWorld} from '../cable-world.js';
import {createRoomLayout} from '../room-layout.js';
import {WORLD_ROOMS} from '../rooms.js';
import {buildCableTube} from '../cable-mesh.js';

let seed=17;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
const point=()=>Array.from({length:3},()=>random()*8-4);
for(let i=0;i<4000;i++){
  const box=boxCollider(point(),[random()*3+.01,random()*3+.01,random()*3+.01],'test'),a=point(),b=i%9?point():a,r=random()*.2;
  assert.equal(segmentIntersects(a,b,box,r),Boolean(segmentBoxHit(a,b,box,r)),'Fast predicate must retain the contact solver semantics');
}
const obstacle=boxCollider([.5,.5,.5],[.2,.2,.2],'wall'),collision=createCollisionWorld([obstacle]);
assert.equal(collision.segmentClear([0,0,0],[.1,.1,.1],.085),true);
assert.equal(collision.segmentClear([.4,.5,.5],[.6,.5,.5],.085),false,'Same cached cell, different exact segment');
assert.equal(collision.bendClear([0,.5,.5],[.5,.5,.5],[1,.5,.5],.085),false);
collision.set([boxCollider([10,0,0],[.1,2,2],'moved')]);
assert.equal(collision.segmentClear([.4,.5,.5],[.6,.5,.5],.085),true,'Changed solids invalidate cached cell unions');
for(const x of [-200000,200000]){
  collision.set([boxCollider([x,0,0],[.1,2,2],'distant')]);
  assert.equal(collision.segmentClear([x-1,0,0],[x+1,0,0],.085),false,'Packed cell keys retain an unbounded-coordinate fallback');
}
for(const direction of [-1,1]){
  const old=boxCollider([-direction,1,0],[.25,2,2],'touching');
  const touching={...boxCollider([-.25*direction,1,0],[.25,2,2],'touching'),previous:old};
  collision.set([touching]);
  const p=collision.project([0,1,0],[0,1,0],.125);
  assert.ok(p[0]*direction>=.003-1e-10,'CCD retains contact exactly at the end of a step');
  collision.set([{...boxCollider([.25*direction,1,0],[.25,2,2],'touching'),previous:touching}]);
  const pushed=collision.project(p,p,.125);
  assert.ok(pushed[0]*direction>.5,'Subsequent crossing pushes material ahead rather than tunneling from the touching face');
}
const state=createRoomMotion();
for(let i=0;i<600;i++)stepRoomMotion(state,{hover:true,pressed:false},1/165);
assert.deepEqual(state,{lift:.16,velocity:0,scale:1,glow:1},'Settled hover cannot rebuild transformed solids forever');
const world=createCableWorld({layout:createRoomLayout(WORLD_ROOMS)});
world.advance(0);
const version=world.collision.version;
world.advance(1/240);
const mesh=world.frame.cables[0].mesh,rope=world.frame.cables[0].rope,v=rope.version;
world.advance(1/120);
assert.equal(rope.version,v+1,'120 Hz physics runs independently of a 240 Hz RAF');
assert.equal(world.collision.version,version,'Stationary solids keep the same spatial index');
const oldPoints=rope.points.map(p=>[...p]);
for(let i=2;i<=120;i++)world.advance(i/120);
assert.notDeepEqual(rope.points,oldPoints,'Optimization must not freeze the physical chain');
const view=buildCableTube(rope),copy=view.positions.slice();
rope.points[2][1]+=.01;
assert.equal(buildCableTube(rope,view),view,'Same topology refills existing typed storage');
assert.notDeepEqual(view.positions,copy,'Reused mesh contains the newly simulated positions');
assert.ok(mesh.positions instanceof Float32Array);
console.log('PASS exact cached collisions, distant coordinates, spring settling, fixed live physics and reusable GPU mesh');
