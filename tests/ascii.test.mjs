import assert from 'node:assert/strict';import fs from 'node:fs/promises';
let source;try{source=await fs.readFile(new URL('../ascii.js',import.meta.url),'utf8')}catch{assert.fail('ASCII converter missing')}
const {pixelsToAscii,pixelsToColorAscii,asciiDocument,asciiSize}=await import(new URL('../ascii.js',import.meta.url));
const colored=pixelsToColorAscii(new Uint8ClampedArray([255,0,0,255,0,128,255,255,0,0,0,0]),3,1);
assert.equal(colored.text,pixelsToAscii(new Uint8ClampedArray([255,0,0,255,0,128,255,255,0,0,0,0]),3,1));
assert.match(colored.html,/color:rgb\(255,0,0\)/);assert.match(colored.html,/color:rgb\(0,128,255\)/);
assert.ok(!colored.html.includes('undefined'));
const exported=asciiDocument(colored);
assert.match(exported,/<!doctype html>/i);assert.ok(exported.includes(colored.html));assert.ok(!/<script/i.test(exported));
assert.equal(pixelsToAscii(new Uint8ClampedArray([0,0,0,255,255,255,255,255]),2,1),'@ ');
assert.equal(pixelsToAscii(new Uint8ClampedArray([0,0,0,0]),1,1),' ','Transparency composites onto white');
assert.equal(pixelsToAscii(new Uint8ClampedArray([0,0,0,255,0,0,0,255]),1,2),'@\n@');
assert.deepEqual(asciiSize(200,100),{columns:120,rows:30});
assert.deepEqual(asciiSize(100,200),{columns:120,rows:120});
assert.throws(()=>asciiSize(0,100));assert.throws(()=>pixelsToAscii([],1,1));
assert.ok(asciiSize(1,10000).rows<=240);
console.log('PASS luminance mapping, whitespace, transparency, line breaks, proportions, limits, validation');
