/** Hardware, real-pointer drag benchmark; no frozen clocks or production hooks. */
const {chromium}=require('playwright');
const {instrument,percentile}=require('./idle-performance.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=process.env.JP_TEST_OUTPUT||path.join(process.env.LOCALAPPDATA,'Temp','opencode','jp-drag-performance');
fs.mkdirSync(output,{recursive:true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function watchDrag(){
 window.dragSamples=[];window.dragLifecycle=[];
 for(const type of ['pointercancel','pointerup','lostpointercapture','resize','blur','pagehide'])window.addEventListener(type,e=>{
  window.dragLifecycle.push({type,time:performance.now(),target:e.target?.id||'',buttons:e.buttons,trusted:e.isTrusted});
 },true);
 const observer=new MutationObserver(records=>{
  for(const record of records)if(record.attributeName==='data-center'){
   const b=record.target;
   if(b.dataset.dragging==='true')window.dragSamples.push({time:performance.now(),id:b.id,center:b.dataset.center});
  }
 });
 observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-center']});
}
(async()=>{
 const args=process.env.JP_HEADED==='1'?['--disable-features=CalculateNativeWinOcclusion']:[];
 const browser=await chromium.launch({executablePath:process.env.JP_BROWSER||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:process.env.JP_HEADED!=='1',args});
 const results=[];
 try{
  const sizes=process.env.JP_PERF_SIZES?JSON.parse(process.env.JP_PERF_SIZES):[{width:1440,height:1000},{width:1920,height:1080}];
  const rooms=process.env.JP_DRAG_ROOMS?process.env.JP_DRAG_ROOMS.split(','):['gallery','particles','materials','sound','monitor'];
  for(const viewport of sizes)for(const room of rooms){
   const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});
   await context.route('https://api.web3forms.com/**',r=>r.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.addInitScript(instrument);await page.goto(process.env.JP_TEST_URL||'http://localhost:8000');
   await page.waitForFunction(()=>document.documentElement.dataset.render==='ready',null,{timeout:45000});await page.bringToFront();
   await page.waitForTimeout(3000);await page.evaluate(watchDrag);
   const selector=room==='monitor'?'#room-button':`#${room}-button`;
   const p=await page.locator(selector).evaluate(b=>{
    const points=[...b.style.clipPath.matchAll(/([-\d.]+)px ([-\d.]+)px/g)].map(m=>[+m[1],+m[2]]);
    return {x:points.reduce((s,p)=>s+p[0],0)/points.length,y:points.reduce((s,p)=>s+p[1],0)/points.length};
   });
   await page.mouse.move(p.x,p.y);await page.mouse.down();
   await page.waitForFunction(selector=>document.querySelector(selector).dataset.dragging==='true',selector);
   const metadata=await page.evaluate(()=>{
    const g=document.querySelector('#scene').getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');
    return {renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown',visible:!document.hidden,script:document.querySelector('script[type=module]').src};
   });
   if(process.env.JP_DRAG_PROFILE){
    page.profiler=await context.newCDPSession(page);await page.profiler.send('Profiler.enable');await page.profiler.send('Profiler.start');
   }
   await page.evaluate(()=>{window.dragSamples=[];window.dragLifecycle=[];window.startIdleMeasurement()});
   const start=performance.now(),seconds=+process.env.JP_PERF_SECONDS||10,
    amplitude=+process.env.JP_DRAG_AMPLITUDE||40,period=+process.env.JP_DRAG_PERIOD||3;
   let events=0;
   while(performance.now()-start<seconds*1000){
    const t=(performance.now()-start)/1000,phase=t*Math.PI*2/period;
    await page.mouse.move(p.x+amplitude*Math.sin(phase),p.y+amplitude/2*Math.sin(phase*2));events++;
    await wait(Math.max(0,start+events*1000/60-performance.now()));
   }
   const capture=await page.evaluate(selector=>({raw:window.endIdleMeasurement(),samples:window.dragSamples,lifecycle:window.dragLifecycle,active:document.querySelector(selector).dataset.dragging==='true',view:document.documentElement.dataset.view}),selector);
   if(page.profiler){const {profile}=await page.profiler.send('Profiler.stop');fs.writeFileSync(path.join(output,`${room}-${viewport.width}.cpuprofile`),JSON.stringify(profile))}
   const {raw,samples}=capture,elapsed=raw.end-raw.start,gaps=raw.frames.slice(1).map((f,i)=>f.stamp-raw.frames[i].stamp),
    perSecond=Array.from({length:Math.floor(elapsed/1000)},(_,i)=>raw.frames.filter(f=>f.time>=raw.start+i*1000&&f.time<raw.start+(i+1)*1000).length),
    moves=samples.filter((s,i)=>i===0||s.center!==samples[i-1].center);
   const result={viewport,room,...metadata,headed:process.env.JP_HEADED==='1',trajectory:{amplitudePx:amplitude,periodSeconds:period},durationMs:elapsed,frames:raw.frames.length,fps:raw.frames.length*1000/elapsed,perSecond,minSecond:Math.min(...perSecond),
    frameMs:{p50:percentile(gaps,.5),p95:percentile(gaps,.95),p99:percentile(gaps,.99),max:Math.max(...gaps)},
    cpuMs:{p50:percentile(raw.cpu,.5),p95:percentile(raw.cpu,.95),p99:percentile(raw.cpu,.99)},over25ms:gaps.filter(t=>t>25).length,
    pointerEvents:events,roomMoves:moves.length,geometryChanges:raw.geometryChanges,signalChanges:raw.signalChanges,activeDrag:capture.active,view:capture.view,lifecycle:capture.lifecycle,longTasks:raw.longTasks,errors};
   await page.mouse.up();assert.equal(await page.locator('html').getAttribute('data-view'),'room','Release cannot accidentally open the monitor');
   fs.writeFileSync(path.join(output,`${room}-${viewport.width}-raw.json`),JSON.stringify({raw,samples,lifecycle:capture.lifecycle}));
   await page.screenshot({path:path.join(output,`${room}-${viewport.width}.png`)});
   console.log(JSON.stringify(result,null,2));results.push(result);await context.close();
  }
  fs.writeFileSync(path.join(output,process.env.JP_PERF_BASELINE?'baseline.json':'results.json'),JSON.stringify(results,null,2));
  if(!process.env.JP_PERF_BASELINE)for(const r of results){
   assert.ok(r.visible&&r.activeDrag&&r.view==='room','Measure only active real-pointer dragging');
   assert.ok(r.fps>=59&&r.minSecond>=59,`${r.room}: drag FPS ${r.fps}, slowest second ${r.minSecond}`);
   assert.ok(r.frameMs.p95<=20&&r.frameMs.p99<25&&r.over25ms/(r.frames-1)<.01,`${r.room}: dropped drag frames`);
   assert.ok(r.cpuMs.p95<12,`${r.room}: p95 JS ${r.cpuMs.p95}ms`);
   assert.ok(r.roomMoves>r.durationMs/1000*25,'Room must move continuously, not remain blocked or stationary');
   assert.ok(r.geometryChanges>20&&r.signalChanges>20,'Physics and signals must stay live');
   assert.deepEqual(r.errors,[]);
  }
  console.log(process.env.JP_PERF_BASELINE?'DRAG BASELINE RECORDED':'PASS real 60 FPS continuous room dragging with live physics and signals');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
