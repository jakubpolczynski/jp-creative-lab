import assert from 'node:assert/strict';
import {createSequencer} from '../lab-audio.js';
let created=0,timers=0,callback,started=0,stopped=0;
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}});
const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){},start(){started++},stop(){stopped++},addEventListener(){}});
class FakeContext{
  constructor(){created++;this.currentTime=0;this.state='running';this.sampleRate=1000;this.destination={};}
  createGain(){return node()} createOscillator(){return node()} createBiquadFilter(){return node()}
  createBuffer(){return{getChannelData:()=>new Float32Array(100)}}
  createBufferSource(){return node()} async resume(){this.state='running'} async suspend(){this.state='suspended'} async close(){this.state='closed'}
}
const seq=createSequencer({AudioContext:FakeContext,setInterval:cb=>{timers++;callback=cb;return timers},clearInterval:()=>{timers--}});
assert.equal(created,0);
assert.equal(seq.state.volume,.08);
seq.setTempo(300);assert.equal(seq.state.bpm,160);
seq.setTempo(10);assert.equal(seq.state.bpm,60);
seq.setVolume(3);assert.equal(seq.state.volume,.3);
await Promise.all([seq.start(),seq.start()]);
assert.equal(created,1);assert.equal(timers,1);assert.ok(started>0);
for(let t=.05;t<1.2;t+=.05){seq.context.currentTime=t;callback();}
assert.ok(seq.state.scheduled>2);
seq.stop();assert.equal(timers,0);assert.equal(seq.state.playing,false);assert.ok(stopped>0);
const pending=seq.start();seq.stop();await pending;
assert.equal(seq.state.playing,false);assert.equal(timers,0);
await seq.start();assert.equal(created,1);assert.equal(timers,1);
seq.toggle(0,0);assert.equal(seq.patterns[0][0],false);
seq.dispose();assert.equal(timers,0);
let failures=0;
const broken=createSequencer({AudioContext:class{constructor(){failures++;throw Error('Audio unavailable')}}});
assert.equal(await broken.start(),false);assert.equal(await broken.start(),false);
assert.equal(failures,2,'A failed initialization does not leave a stale pending operation');
assert.match(broken.state.error,/unavailable/);
console.log('audio: lazy context, bounded settings, scheduler, duplicate Start, cancellation/cleanup PASS');
