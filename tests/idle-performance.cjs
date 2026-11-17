/** Real, wall-clock idle benchmark. Does not freeze clocks or disable app behavior.
 * NODE_PATH=<existing Playwright node_modules> node tests/idle-performance.cjs
 * JP_PERF_BASELINE=1 records without budget assertions. JP_PERF_SECONDS defaults 20.
 * Native scheduling is calibrated on an empty page; JP_PERF_STRICT_18=1 additionally
 * requires the original 18 ms p95, even when the empty browser itself exceeds it.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=process.env.JP_TEST_OUTPUT||path.join(process.env.LOCALAPPDATA,'Temp','opencode','jp-idle-performance');
function instrument(){
 const nativeRAF=window.requestAnimationFrame.bind(window),g=WebGL2RenderingContext.prototype;
 const state=window.idleMetrics={frames:[],cpu:[],raf:[],gpu:[],uploads:0,bytes:0,geometryChanges:0,signalChanges:0,longTasks:[]};
 let measuring=false,presentation=null,active=null,stamp=0,ext=null,context=null,query=null,pending=[];
 const names=new WeakMap(),hashes=new WeakMap(),positions=new WeakSet(),vaos=new WeakMap();let vao=null,buffer=null;
 window.startIdleMeasurement=()=>{for(const k of ['frames','cpu','raf','gpu','longTasks'])state[k]=[];for(const k of ['uploads','bytes','geometryChanges','signalChanges'])state[k]=0;measuring=true;state.start=performance.now()};
 window.endIdleMeasurement=()=>{state.end=performance.now();measuring=false;return state};
 try{new PerformanceObserver(list=>{if(measuring)state.longTasks.push(...list.getEntries().map(e=>e.duration))}).observe({type:'longtask',buffered:false})}catch{}
 window.requestAnimationFrame=cb=>nativeRAF(t=>{
  stamp=t;if(measuring)state.raf.push(t);
  if(context&&ext)for(let i=pending.length-1;i>=0;i--){
   const q=pending[i];if(context.getQueryParameter(q,context.QUERY_RESULT_AVAILABLE)){
    if(measuring&&!context.getParameter(ext.GPU_DISJOINT_EXT))state.gpu.push(context.getQueryParameter(q,context.QUERY_RESULT)/1e6);
    context.deleteQuery(q);pending.splice(i,1);
   }
  }
  const start=performance.now(),before=state.frames.length;cb(t);
  if(measuring&&state.frames.length!==before)state.cpu.push(performance.now()-start);
 });
 const get=g.getUniformLocation;g.getUniformLocation=function(p,n){const l=get.call(this,p,n);if(l)names.set(l,n);if(n==='uTexel')presentation=p;return l};
 const use=g.useProgram;g.useProgram=function(p){active=p;return use.call(this,p)};
 const bind=g.bindFramebuffer;g.bindFramebuffer=function(t,f){
  if(f===null&&!query){
   context=this;if(ext===null)ext=this.getExtension('EXT_disjoint_timer_query_webgl2')||false;
   if(ext&&pending.length<4){query=this.createQuery();this.beginQuery(ext.TIME_ELAPSED_EXT,query)}
  }
  return bind.call(this,t,f);
 };
 const draw=g.drawArrays;g.drawArrays=function(mode,start,count){
  const r=draw.call(this,mode,start,count);
  if(active===presentation&&count===6){
   if(query){this.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query);query=null}
   if(measuring)state.frames.push({time:performance.now(),stamp});
  }
  return r;
 };
 const bv=g.bindVertexArray;g.bindVertexArray=function(v){vao=v;if(v&&!vaos.has(v))vaos.set(v,{});return bv.call(this,v)};
 const bb=g.bindBuffer;g.bindBuffer=function(t,b){if(t===this.ARRAY_BUFFER)buffer=b;return bb.call(this,t,b)};
 const attr=g.vertexAttribPointer;g.vertexAttribPointer=function(i,...a){if(vao)vaos.get(vao)[i]=buffer;if(i===0&&buffer)positions.add(buffer);return attr.call(this,i,...a)};
 const sub=g.bufferSubData;g.bufferSubData=function(t,offset,data,...a){
  if(measuring&&t===this.ARRAY_BUFFER){state.uploads++;state.bytes+=data.byteLength;
   if(positions.has(buffer)&&data instanceof Float32Array){
    let hash=0;const stride=Math.max(1,Math.floor(data.length/31));for(let i=0;i<data.length;i+=stride)hash+=data[i]*(i+1);
    if(hashes.has(buffer)&&Math.abs(hashes.get(buffer)-hash)>1e-5)state.geometryChanges++;
    hashes.set(buffer,hash);
   }
  }
  return sub.call(this,t,offset,data,...a);
 };
 const pulses=new WeakMap(),u2=g.uniform2f;g.uniform2f=function(l,x,y){
  if(measuring&&names.get(l)==='uPulses'){const old=pulses.get(l);if(old&&(Math.abs(old[0]-x)>1e-4||Math.abs(old[1]-y)>1e-4))state.signalChanges++;pulses.set(l,[x,y])}
  return u2.call(this,l,x,y);
 };
}
const percentile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]:null;
module.exports={instrument,percentile};
if(require.main===module){
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const args=process.env.JP_GPU==='software'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[];
 // Automation/terminal windows can occlude Edge while document.hidden remains
 // false. Prevent Windows' native 1 FPS occlusion throttle in the headed test;
 // this does not alter the app, its physics, GPU renderer or native vsync.
 if(process.env.JP_HEADED==='1')args.push('--disable-features=CalculateNativeWinOcclusion');
 const browser=await chromium.launch({executablePath:process.env.JP_BROWSER||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:process.env.JP_HEADED!=='1',args});
 const results=[];
 try{
  const sizes=process.env.JP_PERF_SIZES?JSON.parse(process.env.JP_PERF_SIZES):[{width:1440,height:1000},{width:1920,height:1080}];
  for(const viewport of sizes){
   const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});await context.route('https://api.web3forms.com/**',r=>r.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   const reference=await page.evaluate(()=>new Promise(resolve=>{
    const stamps=[];let nativeFrames=0,start=null,deadline=0;
    function next(t){
     nativeFrames++;
     if(start===null){start=t;deadline=t}
     // Reference the requested 60 Hz cadence. At 165 Hz, a 60 Hz slot is
     // quantized to 2 or 3 native refreshes (12.1/18.2 ms). A bare 165 Hz
     // calibration cannot describe Edge switching back to 60 Hz mid-test.
     if(t>=deadline-.05){
      stamps.push(t);deadline+=1000/60;
      if(t-deadline>1000/60)deadline=t+1000/60;
     }
     if(t-start<4000){requestAnimationFrame(next);return}
     const gaps=stamps.slice(1).map((v,i)=>v-stamps[i]).sort((a,b)=>a-b);
     resolve({cadence:'60Hz slots on native RAF',nativeFps:(nativeFrames-1)*1000/(t-start),fps:(stamps.length-1)*1000/(stamps.at(-1)-stamps[0]),p95:gaps[Math.floor(gaps.length*.95)],p99:gaps[Math.floor(gaps.length*.99)]});
    }
    requestAnimationFrame(next);
   }));
   await page.addInitScript(instrument);await page.goto(process.env.JP_TEST_URL||'http://localhost:8000');
   await page.waitForFunction(()=>document.documentElement.dataset.render==='ready',null,{timeout:45000});
   await page.bringToFront();
   if(process.env.JP_PERF_HOVER){
    const selector=process.env.JP_PERF_HOVER==='monitor'?'#room-button':`#${process.env.JP_PERF_HOVER}-button`;
    const p=await page.locator(selector).evaluate(b=>{
     const points=[...b.style.clipPath.matchAll(/([-\d.]+)px ([-\d.]+)px/g)].map(m=>[+m[1],+m[2]]);
     return {x:points.reduce((s,p)=>s+p[0],0)/points.length,y:points.reduce((s,p)=>s+p[1],0)/points.length};
    });
    await page.mouse.move(p.x,p.y);
   }
   // Warm-up real shaders, JIT and the initial rope drop; not a simulated clock.
   await page.waitForTimeout(5000);
   const metadata=await page.evaluate(()=>{
    const canvas=document.querySelector('#scene'),g=canvas.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');
    return {renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable',canvas:[canvas.width,canvas.height],visible:!document.hidden,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,script:document.querySelector('script[type="module"]').src,screen:[screen.width,screen.height]};
   });
   await page.evaluate(()=>window.startIdleMeasurement());await page.waitForTimeout((+process.env.JP_PERF_SECONDS||20)*1000);
   const raw=await page.evaluate(()=>window.endIdleMeasurement()),elapsed=raw.end-raw.start,intervals=raw.frames.slice(1).map((f,i)=>f.stamp-raw.frames[i].stamp);
   const perSecond=Array.from({length:Math.floor(elapsed/1000)},(_,i)=>raw.frames.filter(f=>f.time>=raw.start+i*1000&&f.time<raw.start+(i+1)*1000).length);
   const result={viewport,...metadata,headed:process.env.JP_HEADED==='1',hover:process.env.JP_PERF_HOVER||null,reference,durationMs:elapsed,frames:raw.frames.length,fps:raw.frames.length*1000/elapsed,perSecond,minSecond:Math.min(...perSecond),frameMs:{p50:percentile(intervals,.5),p95:percentile(intervals,.95),p99:percentile(intervals,.99),max:Math.max(...intervals)},
    cpuMs:{p50:percentile(raw.cpu,.5),p95:percentile(raw.cpu,.95),p99:percentile(raw.cpu,.99)},gpuMs:{p50:percentile(raw.gpu,.5),p95:percentile(raw.gpu,.95)},over25ms:intervals.filter(v=>v>25).length,geometryChanges:raw.geometryChanges,signalChanges:raw.signalChanges,uploads:raw.uploads,uploadMB:raw.bytes/1048576,longTasks:raw.longTasks,errors};
   results.push(result);fs.writeFileSync(path.join(output,`idle-${viewport.width}-raw.json`),JSON.stringify(raw));
   await page.screenshot({path:path.join(output,`idle-${viewport.width}.png`)});
   console.log(JSON.stringify(result,null,2));await context.close();
  }
  fs.writeFileSync(path.join(output,process.env.JP_PERF_BASELINE?'baseline.json':'results.json'),JSON.stringify(results,null,2));
  if(!process.env.JP_PERF_BASELINE)for(const r of results){
   assert.ok(r.visible&&!r.reduced,'Must measure a visible page with motion enabled');
   assert.ok(r.fps>=59,`Real rendered FPS below 59: ${r.fps}`);
   assert.ok(r.minSecond>=59,`Slow one-second window: ${r.minSecond} actual frames`);
   // Do not mistake OS/Edge RAF jitter for application work. Keep an absolute
   // 20 ms ceiling AND at most 1 ms of p95 delay over the empty native browser.
   const p95Budget=process.env.JP_PERF_STRICT_18?18:Math.min(20,Math.max(18,r.reference.p95+1));
   const p95Pass=process.env.JP_PERF_STRICT_18?r.frameMs.p95<18:r.frameMs.p95<=p95Budget+1e-6;
   assert.ok(p95Pass,`p95 frame gap ${r.frameMs.p95} ms, native-calibrated budget ${p95Budget}`);
   assert.ok(r.frameMs.p99<25,`p99 frame gap ${r.frameMs.p99} ms`);
   assert.ok(r.over25ms/Math.max(1,r.frames-1)<.01,'More than 1% dropped refresh intervals');
   assert.ok(r.cpuMs.p95<12,`p95 JS frame cost ${r.cpuMs.p95} ms`);
   assert.ok(r.geometryChanges>10&&r.signalChanges>10,'Physics and animated signals must actually change');
   assert.deepEqual(r.errors,[]);
  }
  console.log(process.env.JP_PERF_BASELINE?'BASELINE RECORDED':'PASS real 60 Hz idle budget with changing cable geometry and signals');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
}
