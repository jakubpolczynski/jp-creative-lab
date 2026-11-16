import assert from 'node:assert/strict';
import {ROOMS,LAB_MONITOR,labMonitorFrame,roomFrame} from '../rooms.js';
import {workstationScreen} from '../room-world.js';
for(const room of ROOMS)for(const [width,height] of [[1440,1000],[390,844],[844,390]]){
  const frame=roomFrame(room,width,height),panel=labMonitorFrame(width,height);
  assert.deepEqual(frame.center,room.center.map((v,i)=>v+LAB_MONITOR.center[i]));
  assert.deepEqual(frame.direction,[25,0,0]);
  assert.equal(frame.shiftX,0);assert.equal(frame.shiftY,0);
  assert.ok(Math.abs(panel.width/panel.height-1.2/.76)<1e-9);
  assert.ok(panel.left>=0&&panel.top>=0&&panel.left+panel.width<=width&&panel.top+panel.height<=height);
  assert.ok(Math.abs(frame.height*.5*(panel.height/height)-LAB_MONITOR.height*.5)<1e-9);
  const corners=workstationScreen(room);
  assert.ok(corners.every(p=>p[0]===frame.center[0]));
}
console.log('PASS: four +X computer camera targets and exact in-monitor panel projection at three sizes');
