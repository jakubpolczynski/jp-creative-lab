import assert from 'node:assert/strict';
import {ROOMS} from '../rooms.js';
import {buildRoom,workstationScreen} from '../room-world.js';
for(const room of ROOMS){
  const mesh=buildRoom(room);
  for(const name of ['desk','computer','keyboard','mouse','chair','wall-sign']){
    const part=mesh.parts.find(p=>p.name===name);
    assert.ok(part,`${room.id} includes ${name}`);
    assert.ok(part.count>0);
  }
  const sign=mesh.parts.find(p=>p.name==='wall-sign');
  assert.equal(sign.lines.length,2);
  assert.ok(sign.count>100*36,'Large raised pixel lettering, not a small label');
  const desk=mesh.parts.find(p=>p.name==='desk');
  assert.ok(mesh.colors.slice(desk.start*3,(desk.start+desk.count)*3).some((v,i,a)=>i%3===0&&v>.65&&a[i+1]<.6),'Wooden desktop like the original');
  const screen=workstationScreen(room);
  assert.equal(screen.length,4);
  assert.ok(screen.every(p=>p.every(Number.isFinite)));
  assert.ok(screen.every(p=>Math.abs(p[0]-(room.center[0]-2.01))<.001));
  for(let i=0;i<mesh.positions.length;i+=3){
    const [x,y,z]=mesh.positions.slice(i,i+3);
    assert.ok(!(x>.05&&y>.22&&z> -2&&z<2.2),`${room.id}: no extra models in the open area beside the computer`);
  }
}
console.log('PASS: all four rooms have desk/computer/keyboard/mouse/chair and large two-line voxel sign');
