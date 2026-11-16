/** Run with Playwright available in NODE_PATH; never contacts the email provider.
 * NODE_PATH=<directory containing playwright> node tests/four-rooms.cjs
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=process.env.JP_TEST_OUTPUT||path.join(process.env.LOCALAPPDATA,'Temp','opencode','jp-four-rooms');
fs.mkdirSync(output,{recursive:true});
const results=[];
const base=process.env.JP_TEST_URL||'http://localhost:8000';
function instrument(){
  window.actualMatrices=[];window.audioContexts=[];window.audioSources=0;window.audioEnergy=()=>0;
  window.webglContexts=new Set();window.pointCount=0;window.outsideMonitorEffects=0;window.requestedFrames=0;
  const getContext=HTMLCanvasElement.prototype.getContext,draw=WebGL2RenderingContext.prototype.drawArrays,raf=window.requestAnimationFrame;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){const context=getContext.call(this,kind,...args);if(kind==='webgl2'&&context)window.webglContexts.add(context);return context};
  WebGL2RenderingContext.prototype.drawArrays=function(mode,first,count){
    if(mode===this.POINTS){window.pointCount=count;if(!this.isEnabled(this.SCISSOR_TEST))window.outsideMonitorEffects++;}
    return draw.call(this,mode,first,count);
  };
  window.requestAnimationFrame=function(callback){window.requestedFrames++;return raf.call(this,callback)};
  const matrix=WebGL2RenderingContext.prototype.uniformMatrix4fv;
  const location=WebGL2RenderingContext.prototype.getUniformLocation,locations=new Map();let worldProgram=null;
  WebGL2RenderingContext.prototype.getUniformLocation=function(program,name){
    const loc=location.call(this,program,name);locations.set(loc,{program,name});
    if(name==='uView'&&!worldProgram)worldProgram=program;return loc;
  };
  WebGL2RenderingContext.prototype.uniformMatrix4fv=function(loc,transpose,value){
    const info=locations.get(loc);
    if(info?.program===worldProgram&&(info.name==='uView'||info.name==='uProj')){
      window.actualMatrices.push(Array.from(value));if(window.actualMatrices.length>2)window.actualMatrices.shift();
    }
    return matrix.call(this,loc,transpose,value);
  };
  const Native=window.AudioContext;
  if(Native)window.AudioContext=class extends Native{constructor(...args){super(...args);window.audioContexts.push(this)}};
  const connect=AudioNode.prototype.connect,start=AudioScheduledSourceNode.prototype.start;
  AudioScheduledSourceNode.prototype.start=function(...args){window.audioSources++;return start.apply(this,args)};
  AudioNode.prototype.connect=function(destination,...args){
    if(destination instanceof AudioDestinationNode){
      const analyser=this.context.createAnalyser();analyser.fftSize=256;connect.call(this,analyser);
      window.audioEnergy=()=>{const data=new Float32Array(256);analyser.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs))};
    }
    return connect.call(this,destination,...args);
  };
}
async function ready(page){
  await page.addInitScript(instrument);await page.goto(base);
  await page.waitForFunction(()=>document.documentElement.dataset.render==='ready',null,{timeout:45000});
}
async function enter(page,id,method='nav'){
  if(method==='nav')await page.locator(`[data-destination="${id}"]`).click();
  else{
    const p=await page.locator(`#${id}-button`).evaluate(button=>{
      const points=[...button.style.clipPath.matchAll(/([-\d.]+)px ([-\d.]+)px/g)].map(m=>[+m[1],+m[2]]);
      return{x:points.reduce((n,p)=>n+p[0],0)/points.length,y:points.reduce((n,p)=>n+p[1],0)/points.length};
    });
    if(method==='touch')await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  }
  await page.waitForFunction(id=>document.documentElement.dataset.view===id,id,{timeout:20000});
  assert.equal(await page.locator('#lab-back').evaluate(el=>el===document.activeElement),true);
  const camera=await page.evaluate(()=>window.actualMatrices);
  assert.ok(camera.length===2&&camera.every(m=>m.every(Number.isFinite)));
  const projected=await page.evaluate(async id=>{
    const {ROOMS,LAB_MONITOR}=await import('/rooms.js'),room=ROOMS.find(r=>r.id===id),p=[...room.center.map((v,i)=>v+LAB_MONITOR.center[i]),1];
    const {workstationScreen}=await import('/room-world.js');
    const multiply=(m,v)=>[0,1,2,3].map(row=>v.reduce((s,n,col)=>s+m[col*4+row]*n,0));
    const [view,projection]=window.actualMatrices,c=multiply(projection,multiply(view,p));
    const corners=workstationScreen(room).map(p=>{const c=multiply(projection,multiply(view,[...p,1]));return{x:(c[0]/c[3]+1)*innerWidth/2,y:(1-c[1]/c[3])*innerHeight/2}});
    const b=document.querySelector('#lab-panel').getBoundingClientRect();
    return {x:(c[0]/c[3]+1)/2,y:(1-c[1]/c[3])/2,view,
      projected:{left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))},
      actual:{left:b.left,right:b.right,top:b.top,bottom:b.bottom}};
  },id);
  assert.ok(Math.abs(projected.x-.5)<.005&&Math.abs(projected.y-.5)<.005,'Camera centers the actual computer monitor');
  assert.ok(Math.abs(projected.view[0])<.0001&&Math.abs(projected.view[2]-1)<.0001,'Camera looks straight at the +X monitor, like ASCII');
  for(const side of ['left','right','top','bottom'])assert.ok(Math.abs(projected.actual[side]-projected.projected[side])<1,`HTML ${side} matches physical monitor`);
  assert.equal(await page.locator('#monitor-app').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('#server-app').getAttribute('aria-hidden'),'true');
}
async function leave(page){
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.documentElement.dataset.view==='room');
  assert.equal(await page.locator('#lab-panel').evaluate(el=>el.inert),true);
}
async function capturePixels(page){
  return page.evaluate(()=>{
    const c=document.querySelector('#scene'),g=c.getContext('webgl2'),p=new Uint8Array(c.width*c.height*4);
    g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,p);
    if(g.getError())throw Error('WebGL error during pixel read');
    window.beforePixels=p;return p.filter((v,i)=>i%4===3&&v>0).length;
  });
}
async function changedPixels(page){
  return page.evaluate(()=>{
    const c=document.querySelector('#scene'),g=c.getContext('webgl2'),p=new Uint8Array(c.width*c.height*4);
    g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,p);let changed=0;
    const r=document.querySelector('#lab-surface').getBoundingClientRect(),d=c.width/innerWidth;
    let outside=0;
    for(let i=0;i<p.length;i+=4)if(Math.max(...[0,1,2].map(j=>Math.abs(p[i+j]-window.beforePixels[i+j])))>12){
      changed++;
      const x=(i/4)%c.width,y=c.height-1-Math.floor(i/4/c.width);
      if(x<r.left*d-2||x>r.right*d+2||y<r.top*d-2||y>r.bottom*d+2)outside++;
    }
    if(outside)throw Error(`Experiment changed ${outside} pixels outside its monitor preview`);
    if(g.isEnabled(g.SCISSOR_TEST))throw Error('Scissor state leaked into the world renderer');
    const viewport=Array.from(g.getParameter(g.VIEWPORT));
    if(viewport.join(',')!==[0,0,c.width,c.height].join(','))throw Error('GPU viewport was not restored');
    return changed;
  });
}
async function setRange(page,id,value){
  await page.locator('#'+id).evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))},String(value));
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.JP_BROWSER||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:844,height:390}]){
      const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'});
      let external=0;await context.route('https://api.web3forms.com/**',route=>{external++;return route.abort()});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
      await ready(page);
      assert.equal(await page.evaluate(()=>window.webglContexts.size),1);
      assert.equal(await page.evaluate(()=>window.pointCount),0,'No particle model in the overview');
      await page.screenshot({path:path.join(output,`world-${viewport.width}.png`)});
      assert.equal(await page.locator('.lab-room-button').count(),4);
      assert.equal(await page.evaluate(()=>window.audioContexts.length),0);
      for(const id of ['gallery','particles','materials','sound']){
        await enter(page,id,viewport.width===1440?'physical':viewport.width===390?'touch':'nav');
        const metrics=await page.locator('#lab-panel').evaluate(el=>{
          const b=el.getBoundingClientRect(),s=el.querySelector('.lab-controls');
          return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,w:innerWidth,h:innerHeight,overflow:s.scrollWidth>s.clientWidth};
        });
        assert.ok(metrics.x>=0&&metrics.y>=0&&metrics.right<=metrics.w+.1&&metrics.bottom<=metrics.h+.1,JSON.stringify(metrics));
        assert.equal(metrics.overflow,false,'No horizontal panel overflow');
        if(id==='gallery'){
          await page.locator('#project-select').click();
          assert.equal(await page.locator('#project-detail').isVisible(),true);
          assert.match(await page.locator('#project-title').textContent(),/JP Creative Lab/);
          assert.equal(await page.locator('#project-repository').getAttribute('rel'),'noopener noreferrer');
        }else if(id==='particles'){
          assert.equal(await page.evaluate(()=>window.pointCount),viewport.width<700?750:2000);
          assert.ok(await capturePixels(page)>500);
          await page.locator('#lab-surface').evaluate(()=>{window.dispatchEvent(new Event('resize'))});
          await capturePixels(page);
          // Reduced motion is genuinely static between renders.
          await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
          assert.equal(await changedPixels(page),0);
          await page.locator('[data-value="jp"]').click();
          const jp=await changedPixels(page);assert.ok(jp>100,`JP changes ${jp} pixels`);
          await capturePixels(page);await page.locator('[data-value="wave"]').click();
          const wave=await changedPixels(page);assert.ok(wave>100,`Wave changes ${wave} pixels`);
          await setRange(page,'particle-strength',2);
          await page.locator('#particles-reset').click();
          assert.equal(await page.locator('#particle-strength').inputValue(),'1');
          assert.equal(await page.locator('[data-value="orbit"]').getAttribute('aria-pressed'),'true');
          await capturePixels(page);
          const surface=await page.locator('#lab-surface').boundingBox();
          await page.mouse.move(surface.x+surface.width*.5,surface.y+surface.height*.5);
          const repulsion=await changedPixels(page);
          assert.ok(repulsion>5,`Cursor repulsion ${repulsion}`);
          results.push({viewport:viewport.width,experiment:'particles',jp,wave,repulsion});
        }else if(id==='materials'){
          await capturePixels(page);await page.locator('[data-value="hologram"]').click();
          const hologram=await changedPixels(page);assert.ok(hologram>100,`Hologram ${hologram}`);
          await capturePixels(page);await page.locator('[data-value="wire"]').click();
          const wire=await changedPixels(page);assert.ok(wire>100,`Wire ${wire}`);
          await capturePixels(page);await setRange(page,'material-deformation',1);
          assert.ok(await changedPixels(page)>100);
          await page.locator('#materials-reset').click();
          assert.equal(await page.locator('#material-deformation').inputValue(),'0.35');
          results.push({viewport:viewport.width,experiment:'materials',hologram,wire});
        }else{
          assert.equal(await page.evaluate(()=>window.audioContexts.length),0);
          await page.locator('[aria-label="Stopa, krok 2"]').click();
          await setRange(page,'sound-bpm',140);await setRange(page,'sound-volume',.10);
          await page.locator('#sound-start').click();
          await page.waitForFunction(()=>window.audioSources>1&&window.audioEnergy()>.00001);
          const audio=await page.evaluate(()=>({contexts:window.audioContexts.length,sources:window.audioSources,energy:window.audioEnergy()}));
          assert.equal(audio.contexts,1);
          await page.locator('#sound-mute').click();
          assert.equal(await page.locator('#sound-mute').getAttribute('aria-pressed'),'true');
          await page.waitForFunction(()=>window.audioEnergy()<.000001);
          await page.locator('#sound-mute').click();
          results.push({viewport:viewport.width,experiment:'sound',...audio});
        }
        await page.locator('.lab-controls').evaluate(el=>el.scrollTop=0);
        if(id!=='gallery'){
          const inside=await page.locator('#lab-surface').evaluate(el=>{
            const a=el.getBoundingClientRect(),b=document.querySelector('#lab-panel').getBoundingClientRect();
            return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom;
          });
          assert.equal(inside,true,'Entire WebGL experiment stays inside the computer screen');
        }
        await page.screenshot({path:path.join(output,`${id}-${viewport.width}.png`)});
        await leave(page);
        if(id==='sound'){
          assert.equal(await page.evaluate(()=>window.audioContexts[0].state),'suspended');
          await enter(page,'sound');
          assert.equal(await page.locator('#sound-start').textContent(),'Start');
          await page.locator('#sound-start').click();
          // Simulate document hiding: lifecycle handler must stop the real audio context.
          await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
          const hiddenFrames=await page.evaluate(()=>window.requestedFrames);
          await page.waitForFunction(()=>window.audioContexts[0].state==='suspended');
          assert.equal(await page.evaluate(()=>window.requestedFrames),hiddenFrames,'No hidden GPU loop');
          await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});
          assert.equal(await page.locator('#sound-start').textContent(),'Start');
          await leave(page);
        }
      }
      // Existing destinations still point at their physical surfaces.
       await page.locator('[data-destination="monitor"]').click();await page.waitForFunction(()=>document.documentElement.dataset.view==='monitor');
       assert.equal(await page.locator('#ascii-file').count(),1);
       const asciiScreen=await page.evaluate(async()=>{
         const {ASCII_ROOM}=await import('/rooms.js'),{workstationScreen}=await import('/room-world.js');
         const multiply=(m,v)=>[0,1,2,3].map(row=>v.reduce((s,n,col)=>s+m[col*4+row]*n,0));
         const [view,projection]=window.actualMatrices;
         const corners=workstationScreen(ASCII_ROOM).map(p=>{const c=multiply(projection,multiply(view,[...p,1]));return{x:(c[0]/c[3]+1)*innerWidth/2,y:(1-c[1]/c[3])*innerHeight/2}});
         const b=document.querySelector('#monitor-app').getBoundingClientRect();
         return {actual:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},
           projected:{left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))}};
       });
       for(const side of ['left','right','top','bottom'])assert.ok(Math.abs(asciiScreen.actual[side]-asciiScreen.projected[side])<1,`ASCII HTML ${side} matches its new monitor`);
       await page.screenshot({path:path.join(output,`ascii-${viewport.width}.png`)});
       await page.locator('#monitor-back').click();
      await page.waitForFunction(()=>document.documentElement.dataset.view==='room');
      await page.locator('[data-destination="server"]').click();await page.waitForFunction(()=>document.documentElement.dataset.view==='server');
      const view=await page.evaluate(()=>window.actualMatrices[0]);
      assert.ok(Math.abs(view[0]-1)<.0001&&Math.abs(view[12]-4.8)<.0001,'Server stays on JP +Z face');
      await page.locator('#server-back').click();await page.waitForFunction(()=>document.documentElement.dataset.view==='room');
      assert.equal(external,0);assert.deepEqual(errors,[]);
      assert.equal(await page.evaluate(()=>window.outsideMonitorEffects),0,'Particles render only inside monitors');
       results.push({viewport:viewport.width,allFourRooms:true,monitorCamera:true,physicalScreenAlignment:true,asciiScreenAlignment:true,effectsClippedInsideMonitor:true,oldDestinations:true,externalRequests:external,errors});
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion:'no-preference'});
    const page=await context.newPage();await ready(page);
    // Reverse a real incomplete camera transition.
    await page.locator('[data-destination="particles"]').click();
    await page.waitForFunction(()=>document.documentElement.dataset.view==='transition');await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.documentElement.dataset.view==='room');
    assert.equal(await page.locator('[data-destination="particles"]').evaluate(el=>document.activeElement===el),true);
    await enter(page,'particles');
    await capturePixels(page);
    await page.waitForFunction(()=>{
      const c=document.querySelector('#scene'),g=c.getContext('webgl2'),p=new Uint8Array(c.width*c.height*4);g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,p);
      return p.some((v,i)=>Math.abs(v-window.beforePixels[i])>20);
    });
    await leave(page);
    for(const [index,id] of ['gallery','particles','materials','sound'].entries()){
      await page.locator('#'+id+'-button').focus();
      await page.locator('#'+id+'-button').press(index%2?'Space':'Enter');
      await page.waitForFunction(id=>document.documentElement.dataset.view===id,id);
      assert.equal(await page.locator('#lab-back').evaluate(el=>document.activeElement===el),true);
      await leave(page);
      assert.equal(await page.locator('#'+id+'-button').evaluate(el=>document.activeElement===el),true);
    }
    // Quality budgets respond to a real resize without allocating a new context.
    await page.setViewportSize({width:390,height:844});await enter(page,'particles');
    assert.equal(await page.evaluate(()=>window.pointCount),750);
    assert.equal(await page.evaluate(()=>window.webglContexts.size),1);
    await leave(page);await page.setViewportSize({width:1100,height:850});
    await enter(page,'sound');await page.locator('#sound-start').click();
    await page.waitForFunction(()=>window.audioContexts[0]?.state==='running');
    await page.evaluate(()=>document.querySelector('#scene').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(()=>window.audioContexts[0].state==='suspended');
    assert.match(await page.locator('#status').textContent(),/Utracono/);
    results.push({animation:true,interruptedEntry:true,keyboardAllFour:true,focusRestored:true,responsiveParticleBudget:true,contextLossStopsAudio:true});
    await context.close();
    const unsupported=await browser.newContext({viewport:{width:1000,height:800},reducedMotion:'reduce'});
    await unsupported.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined});
    const silent=await unsupported.newPage();await ready(silent);await enter(silent,'sound');
    await silent.locator('#sound-start').click();
    await silent.waitForFunction(()=>document.querySelector('#sound-status').textContent.includes('nie obsługuje'));
    await leave(silent);
    results.push({unsupportedAudioGraceful:true});await unsupported.close();
    console.log(JSON.stringify({passed:results.length,failed:0,results,output},null,2));
  }catch(error){results.push({failed:1,error:error.stack});console.error(error);process.exitCode=1}
  finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));await browser.close()}
})();
