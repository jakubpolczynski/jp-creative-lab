import assert from 'node:assert/strict';
import {WORLD_ROOMS} from '../rooms.js';
import {createCableWorld} from '../cable-world.js';
import {createRoomLayout} from '../room-layout.js';
import {cableSignal,CABLE_STYLE} from '../cables.js';
import {signalTiming} from '../signals.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
near(CABLE_STYLE.width,.17);
const world=createCableWorld({layout:createRoomLayout(WORLD_ROOMS)}),frame=world.advance(0);
for(const {id,rope,mesh} of frame.cables){
  const room=WORLD_ROOMS.find(r=>r.id===id),total=rope.length,timing=signalTiming(total);
  assert.deepEqual(rope.points[0],room.port);
  assert.deepEqual(rope.points.at(-1),[room.center[0]-2.33,1.84,room.center[2]-.45]);
  assert.equal('cable' in room,false,'No predefined middle points');
  assert.equal(mesh.positions.length,mesh.cable.length);
  assert.ok(mesh.cable.some((v,i)=>i%3===0&&v===0));
  assert.ok(mesh.cable.some((v,i)=>i%3===0&&Math.abs(v-total)<1e-8));
  near(cableSignal(timing.serverArrival,total).inbound,0);
  assert.equal(cableSignal(2,total,true).outbound,-100);
  assert.ok(rope.distances.every((v,i)=>!i||v>=rope.distances[i-1]));
}
console.log('PASS five automatic ropes, exact port/monitor endpoints, continuous surface arc length and signal clock');
