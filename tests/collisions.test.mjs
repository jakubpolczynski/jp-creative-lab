import assert from 'node:assert/strict';
import {createCollisionWorld,boxCollider,segmentBoxHit} from '../collisions.js';
import {buildRoom} from '../room-world.js';
import {ASCII_ROOM} from '../rooms.js';
const wall=boxCollider([0,1,0],[.1,2,4],'wall');
assert.ok(segmentBoxHit([-1,1,0],[1,1,0],wall,.085),'A segment hits a wall even when both endpoints are outside');
assert.equal(segmentBoxHit([-1,1,3],[1,1,3],wall,.085),null);
assert.ok(segmentBoxHit([.1,1,0],[.1,1,2],wall,.085),'Cable radius counts');
const world=createCollisionWorld([wall,boxCollider([2,.5,0],[.2,1,.2],'leg')]);
assert.equal(world.segmentHit([-1,1,0],[1,1,0],.085).collider.id,'wall');
assert.equal(world.segmentHit([1,.5,0],[3,.5,0],.085).collider.id,'leg');
assert.ok(world.segmentHit([-1,1,0],[3,1,0],.085,{ids:new Set(['wall']),near:[-1,1,0],length:5})?.collider.id==='leg','Port exception is collider-specific');
assert.equal(world.segmentHit([-1,1,3],[3,1,3],.085),null,'Open space stays open');
const union=createCollisionWorld([boxCollider([0,0,0],[2,.2,2],'floor'),boxCollider([0,.3,0],[.2,1,.2],'leg')]);
const escaped=union.project([0,0,0],[0,0,0],.085);
assert.equal(union.segmentHit(escaped,escaped,.085),null,'Intersecting solids cannot trap a projected rope point');
for(const direction of [-1,1]){
  const old=boxCollider([-2*direction,1,0],[.1,2,3],'moving');
  const current={...boxCollider([2*direction,1,0],[.1,2,3],'moving'),previous:old};
  const moving=createCollisionWorld([current]),p=moving.project([0,1,0],[0,1,0],.085);
  assert.ok(p[0]*direction>2.13,'A wall pushes material AHEAD of its motion, never through to the rear face');
}
const old=boxCollider([0,1,-1],[.2,2,.1],'crossing');
const crossing=createCollisionWorld([{...boxCollider([0,1,1],[.2,2,.1],'crossing'),previous:old}]);
assert.ok(crossing.sweptSegment([-2,1,0],[2,1,0],[-2,1,0],[2,1,0],.085),'Moving obstacle hits the middle even with both endpoints outside');
const mesh=buildRoom(ASCII_ROOM);
assert.ok(mesh.boxes.length>50,'Collision solids are recorded from the actual model');
console.log('PASS full-radius segment collisions, sparse-wall crossing, open space and narrow port exception');
