import assert from 'node:assert/strict';
import {WORLD_ROOMS} from '../rooms.js';
import {createRoomLayout} from '../room-layout.js';
import {createCableWorld} from '../cable-world.js';
import {buildRoom} from '../room-world.js';
import {roomColliders,transformBox,pointInside} from '../collisions.js';
import {cableEndpoints} from '../cable-physics.js';

const layout=createRoomLayout(WORLD_ROOMS),world=createCableWorld({layout}),neutral={lift:0,scale:1};
const local=new Map(WORLD_ROOMS.map(r=>[r.id,roomColliders(buildRoom(r),r.id)]));
let time=0;
function near(actual,expected,message){for(let j=0;j<3;j++)assert.ok(Math.abs(actual[j]-expected[j])<1e-10,message)}
function verify(poses={},chairs={}){
  const before=world.ropes.get('monitor').version;
  world.advance(time,poses,neutral,chairs);
  const rotating=Object.values(chairs).some(c=>Math.abs(c.angle)>.03);
  if(time>0&&!rotating&&Object.keys(poses).length===0&&Object.keys(chairs).length===0){
    assert.ok(world.ropes.get('monitor').version-before<=12,'Translation is handled by CCD, not a cursor-speed multiplier on all physics');
  }
  time+=1/30;
  const actual=new Map(world.collision.boxes.map(b=>[b.id,b]));
  assert.equal(world.collision.moving,false,'Delivery clears temporal motion state');
  assert.ok(world.collision.boxes.every(b=>!b.previous),'No previous bounds remain indexed as physical solids');
  for(const room of layout.all()){
    for(const b of local.get(room.id)){
      const expected=transformBox(b,room.center,poses[room.id]||neutral,chairs[room.id]),observed=actual.get(b.id);
      near(observed.min,expected.min,`${b.id}: current owner transform`);
      near(observed.max,expected.max,`${b.id}: no stale chair/pose cache`);
    }
    const rope=world.ropes.get(room.id),e=cableEndpoints(room,room.center,poses[room.id]||neutral,neutral);
    near(rope.points[0],e.a,'Pinned rack endpoint');
    near(rope.points.at(-1),e.b,'Pinned monitor endpoint');
    for(let i=2;i<rope.points.length-1;i++)assert.equal(world.collision.segmentHit(rope.points[i-1],rope.points[i],.085),null,`${room.id}: full-radius clearance after motion`);
  }
}
verify();
const crossed=[...world.ropes.get('gallery').points.find(p=>p[2]<-7&&p[2]>-7.2)];
assert.ok(layout.move('particles',[6,0,crossed[2]]));verify();
assert.ok(layout.move('particles',[crossed[0]+3.1,0,crossed[2]]));verify();
assert.ok(world.collision.boxes.some(b=>b.owner==='particles'&&pointInside(crossed,b,.085)),'The moved foreign wall occupies a point on the old gallery cable');
verify({particles:{lift:.28,scale:1.01}},{particles:{angle:.35,x:.17,z:.12},gallery:{angle:-.2,x:.1,z:.2}});
verify({particles:{lift:.12,scale:.99}},{particles:{angle:-.25,x:-.1,z:.2}});
verify();
assert.ok(layout.move('particles',[6,0,crossed[2]]));verify();
assert.ok(layout.move('particles',WORLD_ROOMS.find(r=>r.id==='particles').center));verify();

// One temporal step: a foreign wall passes COMPLETELY over cable material and
// ends clear of it. Endpoint pinning/final-position repair alone cannot pass.
const passingLayout=createRoomLayout(WORLD_ROOMS);
passingLayout.restore('particles',[-4.36,0,-7.05]);
const passing=createCableWorld({layout:passingLayout});passing.advance(0);
const oldWall=passing.collision.boxes.find(b=>b.owner==='particles'&&Math.abs(b.max[0]-b.min[0]-.22)<1e-9&&b.max[1]-b.min[1]>3);
assert.ok(oldWall);
const beforePoints=passing.ropes.get('gallery').points.map(p=>[...p]),
  nextCenter=[-6.56,0,-7.05],nextForeign=local.get('particles').map(b=>transformBox(b,nextCenter,neutral));
const ahead=p=>q=>q[0]<=oldWall.min[0]-2.2-.085&&Math.abs(q[2]-p[2])<.5&&Math.abs(q[1]-p[1])<.5;
const material=beforePoints.slice(2,-2).find(p=>
  p[0]<oldWall.min[0]-.091&&p[0]>oldWall.min[0]-2.1&&
  p[1]>oldWall.min[1]+.005&&p[1]<oldWall.max[1]-.005&&
  p[2]>oldWall.min[2]+.1&&p[2]<oldWall.max[2]-.1&&
  !nextForeign.some(b=>pointInside(p,b,.085))&&!beforePoints.some(ahead(p)));
assert.ok(material,'Fixture has material just ahead of the old foreign wall');
assert.ok(passingLayout.move('particles',nextCenter));
const beforeVersion=passing.ropes.get('gallery').version;
passing.advance(1/240);
assert.equal(passing.ropes.get('gallery').version-beforeVersion,1,'Pass-through is resolved in one temporal step, not spatial subdivisions');
assert.equal(passing.collision.segmentHit(material,material,.085),null,'Wall ends completely clear of its old material point');
assert.ok(passing.ropes.get('gallery').points.some(ahead(material)),'Foreign wall pushes actual material ahead of its direction, not through to its rear');
for(const {id,rope} of passing.frame.cables)for(let i=2;i<rope.points.length-1;i++){
  assert.equal(passing.collision.segmentHit(rope.points[i-1],rope.points[i],.085),null,`${id}: one-step pass-through preserves full-segment clearance`);
}
console.log('PASS multi-frame owner/pose/chair cache, temporal cleanup, pinned endpoints and foreign-wall cable clearance');
