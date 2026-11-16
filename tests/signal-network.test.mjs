import assert from 'node:assert/strict';
import {ROOMS,WORLD_ROOMS} from '../rooms.js';
import {createCableWorld} from '../cable-world.js';
import {createRoomLayout} from '../room-layout.js';
import {SIGNAL_SPEED,SERVER_GREEN,ASCII_COLOR,signalTiming,signalCycle,signalState,networkState} from '../signals.js';
const world=createCableWorld({layout:createRoomLayout(WORLD_ROOMS)});
const links=[WORLD_ROOMS.at(-1),...ROOMS].map(r=>({id:r.id,length:world.ropes.get(r.id).length,color:r.rgb}));
const cycle=signalCycle(links.map(l=>l.length)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const link of links){
  const t=signalTiming(link.length,cycle);
  const a=signalState(1.25,link.length,false,cycle),b=signalState(1.75,link.length,false,cycle);
  near((b.outbound-a.outbound)/.5,SIGNAL_SPEED);
  const c=signalState(t.roomSend+.25,link.length,false,cycle),d=signalState(t.roomSend+.75,link.length,false,cycle);
  near((c.inbound-d.inbound)/.5,SIGNAL_SPEED);
  assert.equal(signalState(t.roomArrival-.01,link.length,false,cycle).roomBlink,0);
  assert.ok(signalState(t.roomArrival+.15,link.length,false,cycle).roomBlink>.5);
  assert.equal(signalState(t.serverArrival-.01,link.length,false,cycle).rackBlink,0);
  const network=networkState(t.serverArrival+.12,links);
  assert.deepEqual(network.server.color,link.color);
  assert.ok(network.server.intensity>.5);
  assert.notDeepEqual(link.color,SERVER_GREEN);
}
assert.ok(signalTiming(links.at(-1).length,cycle).roomArrival>signalTiming(links[0].length,cycle).roomArrival);
assert.equal(new Set(ROOMS.map(r=>r.color)).size,4);
assert.equal(ROOMS[0].color,'#ff5a5a');assert.equal(ROOMS.at(-1).color,'#9e6bff');
for(let i=0;i<links.length;i++)for(let j=i+1;j<links.length;j++){
  assert.ok(Math.hypot(...links[i].color.map((v,k)=>v-links[j].color[k]))>.25,'Every room has a visibly different accent');
}
for(const a of ROOMS)for(const b of ROOMS)if(a!==b)assert.ok(Math.hypot(a.center[0]-b.center[0],a.center[2]-b.center[2])>=16,'Islands are farther apart');
const off=networkState(3,links,true);assert.equal(off.server.intensity,0);
assert.ok(off.links.every(l=>l.outbound===-100&&l.inbound===-100));
console.log('PASS: constant world velocity on five routes, causal matching-color receipt, unique palette and separated islands');
