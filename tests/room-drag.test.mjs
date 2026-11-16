import assert from 'node:assert/strict';
import {holdDecision} from '../room-drag.js';
const start={time:0,x:20,y:30};
assert.equal(holdDecision(start,100,{x:20,y:30}),'pending');
assert.equal(holdDecision(start,350,{x:22,y:31}),'drag');
assert.equal(holdDecision(start,349,{x:40,y:30}),'cancel');
console.log('PASS 350 ms long press, 8 px pre-hold tolerance and short-click distinction');
