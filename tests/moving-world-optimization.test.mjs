import assert from 'node:assert/strict';
import {boxCollider,createCollisionWorld,transformBox,segmentBoxHit} from '../collisions.js';

const stationary=boxCollider([0,1,0],[.1,2,3],'stationary'),moving=boxCollider([5,1,0],[.1,2,3],'moving');
const world=createCollisionWorld([stationary,moving]);
assert.equal(world.segmentClear([-1,1,0],[1,1,0],.085),false);
const version=world.version;
world.update([stationary,moving]);
assert.equal(world.version,version,'No changed bodies means no spatial-index rebuild');
const moved={...boxCollider([8,1,0],[.1,2,3],'moving'),previous:moving};
world.update([stationary,moved]);
assert.equal(world.segmentClear([-1,1,0],[1,1,0],.085),false,'Unchanged bodies remain indexed');
assert.equal(world.segmentClear([7,1,0],[9,1,0],.085),false,'New position is indexed');
assert.ok(world.project([6,1,0],[6,1,0],.085)[0]>8.13,'Incremental index retains directional swept bounds');
world.update([stationary,{...moved,previous:undefined}]);
assert.equal(world.moving,false,'Temporal bounds are cleared after delivery');
assert.equal(world.segmentClear([4,1,0],[6,1,0],.085),true,'Old cells do not retain phantom solids');
world.update([stationary]);
assert.equal(world.segmentClear([7,1,0],[9,1,0],.085),true,'Removed bodies leave no stale grid entries');
const duplicateA=boxCollider([-5,1,0],[.1,2,2],'duplicate'),duplicateB=boxCollider([5,1,0],[.1,2,2],'duplicate');
world.update([duplicateA,duplicateB]);
assert.equal(world.segmentClear([-6,1,0],[-4,1,0],.085),false,'Duplicate IDs use a safe full-index fallback');
assert.equal(world.segmentClear([4,1,0],[6,1,0],.085),false);
world.update([duplicateA]);
assert.equal(world.segmentClear([4,1,0],[6,1,0],.085),true,'Returning from duplicate IDs removes stale cells');

function reference(box,center,pose,chair){
 const points=Array.from({length:8},(_,i)=>box.min.map((v,j)=>i&(1<<j)?box.max[j]:v));
 if(box.part==='chair')for(const p of points){
  const x=p[0]+.85,z=p[2]+.45,c=Math.cos(chair.angle),s=Math.sin(chair.angle);
  p[0]=c*x+s*z-.85+chair.x;p[2]=-s*x+c*z-.45+chair.z;
 }
 for(const p of points)for(let j=0;j<3;j++)p[j]=p[j]*pose.scale+center[j]+(j===1?pose.lift:0);
 return {min:[0,1,2].map(j=>Math.min(...points.map(p=>p[j]))),max:[0,1,2].map(j=>Math.max(...points.map(p=>p[j])))};
}
for(let i=0;i<300;i++){
 const box=boxCollider([-2.4,1.3,-.45],[.2,.6,.8],'chair',{part:i%2?'chair':'desk'}),
  center=[i*.07,0,-i*.03],pose={scale:i%7===0?-.98:1.02,lift:.28},
  chair={angle:i*.031,x:.17,z:-.35},actual=transformBox(box,center,pose,chair),expected=reference(box,center,pose,chair);
 for(const side of ['min','max'])for(let j=0;j<3;j++)assert.ok(Math.abs(actual[side][j]-expected[side][j])<1e-10,'Analytic transformed bounds match all eight corners');
}
const old=boxCollider([0,1,-1],[.2,2,.1],'crossing');
world.update([{...boxCollider([0,1,1],[.2,2,.1],'crossing'),previous:old}]);
assert.ok(world.sweptSegment([-2,1,0],[2,1,0],[-2,1,0],[2,1,0],.085),'Moving solid still hits a stationary segment midpoint');
assert.equal(world.sweptSegment([-2,10,0],[2,10,0],[-2,10,0],[2,10,0],.085),null,'Disjoint swept bounds are rejected without recursive CCD');
assert.equal(segmentBoxHit([-1,1,0],[1,1,0],stationary,.085)?.collider.id,'stationary');
console.log('PASS incremental moving/static index, temporal cleanup, analytic transforms and retained mid-segment CCD');
