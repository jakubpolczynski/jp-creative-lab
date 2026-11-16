import assert from 'node:assert/strict';
import {SERVER_SURFACE,SERVER_BOUNDS,serverFrame} from '../server.js';
import {createRoomMotion,stepRoomMotion} from '../interaction.js';
import {createMonitorTransition,monitorProgress} from '../monitor.js';

for(const [width,height] of [[1440,1000],[800,600],[390,844],[320,568],[844,390],[240,180]]){
  const frame=serverFrame(width,height);
  assert.ok(frame.left>0&&frame.top>0);
  assert.ok(frame.left+frame.width<width&&frame.top+frame.height<height);
  assert.ok(Math.abs(frame.width/frame.height-SERVER_SURFACE.width/SERVER_SURFACE.height)<1e-10);
}
assert.throws(()=>serverFrame(0,100));
assert.throws(()=>serverFrame(100,NaN));
assert.equal(SERVER_SURFACE.center[0],-4.8,'Contact is centered on the JP panel, not on the monitor or unit slots');
assert.equal(SERVER_SURFACE.center[1],2.12);
assert.ok(SERVER_SURFACE.center[2]>1.328&&SERVER_SURFACE.center[2]<1.40,'HTML is just in front of the JP lettering on +Z');
assert.deepEqual(SERVER_SURFACE.direction,[0,0,25],'JP panel is viewed along +Z, unlike the computer monitor');
assert.equal(SERVER_BOUNDS.length,8);
assert.ok(SERVER_BOUNDS.every(p=>p.every(Number.isFinite)&&p[0]<0),'Hit hull excludes room');
const rack=createRoomMotion(),room=createRoomMotion();
for(let i=0;i<30;i++)stepRoomMotion(rack,{hover:true,pressed:false},1/30);
assert.ok(rack.lift>.1);assert.equal(room.lift,0);
stepRoomMotion(rack,{hover:true,pressed:true},1/30,true);
assert.equal(rack.lift,0);assert.equal(rack.glow,1);
const camera=createMonitorTransition();camera.to=1;
assert.equal(monitorProgress(camera,1400),1);camera.from=1;camera.to=0;camera.started=1400;
assert.equal(monitorProgress(camera,2800),0);
console.log('PASS server surface, viewport fit, hit bounds, independent spring and reversible camera');
