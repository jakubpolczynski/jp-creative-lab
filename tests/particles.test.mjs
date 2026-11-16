import assert from 'node:assert/strict';
import {particlePosition,jpCells} from '../lab-particles.js';
assert.ok(jpCells.length>15);
for(const mode of ['orbit','jp','wave']){
  for(let i=0;i<750;i++){
    const p=particlePosition(i,750,mode,1,1);
    assert.ok(p.every(Number.isFinite));
    assert.ok(Math.hypot(...p)<4);
    assert.deepEqual(p,particlePosition(i,750,mode,1,1));
  }
}
assert.notDeepEqual(particlePosition(27,750,'orbit',1,1),particlePosition(27,750,'wave',1,1));
assert.notDeepEqual(particlePosition(27,750,'orbit',1,1),particlePosition(27,750,'orbit',2,1));
console.log('particles: deterministic finite 3D Orbit/JP/Wave PASS');
