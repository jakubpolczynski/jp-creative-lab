import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let source;
try{source=await fs.readFile(new URL('../interaction.js',import.meta.url),'utf8')}catch{assert.fail('Room button interaction module missing')}
const {createRoomMotion,stepRoomMotion,roomHull}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const state=createRoomMotion();
for(let i=0;i<60;i++)stepRoomMotion(state,{hover:true,pressed:false},1/60,false);
assert.ok(state.lift>.12&&state.lift<.20,'Hover lifts the room');
assert.ok(state.glow>.9,'Hover illuminates accents');
for(let i=0;i<30;i++)stepRoomMotion(state,{hover:true,pressed:true},1/60,false);
assert.ok(state.lift<-.06,'Holding presses room down');
assert.ok(state.scale<.99,'Holding compresses room slightly');
stepRoomMotion(state,{hover:true,pressed:false},1/60,false);
let peak=state.lift;for(let i=0;i<45;i++){stepRoomMotion(state,{hover:true,pressed:false},1/60,false);peak=Math.max(peak,state.lift)}
assert.ok(peak>.20,'Release rebounds above hover height');
for(let i=0;i<150;i++)stepRoomMotion(state,{hover:false,pressed:false},1/60,false);
assert.ok(Math.abs(state.lift)<.001&&Math.abs(state.scale-1)<.001,'Leaving settles at original pose');
const reduced=createRoomMotion();stepRoomMotion(reduced,{hover:true,pressed:true},1/60,true);
assert.equal(reduced.lift,0);assert.equal(reduced.scale,1);assert.equal(reduced.glow,1);
assert.deepEqual(roomHull([[0,0],[2,0],[1,1],[2,2],[0,2]]),[[0,0],[2,0],[2,2],[0,2]]);
console.log('PASS hover, press, release spring, leave, reduced motion, silhouette hull');
