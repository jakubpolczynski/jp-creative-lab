const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=process.env.JP_TEST_OUTPUT||path.join(process.env.LOCALAPPDATA,'Temp','opencode','jp-four-rooms');
fs.mkdirSync(output,{recursive:true});
const results=[];
async function point(button){
  return button.evaluate(b=>{
    const p=[...b.style.clipPath.matchAll(/([-\d.]+)px ([-\d.]+)px/g)].map(m=>[+m[1],+m[2]]);
    return {x:p.reduce((n,p)=>n+p[0],0)/p.length,y:p.reduce((n,p)=>n+p[1],0)/p.length};
  });
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.JP_BROWSER||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:844,height:390},{width:1100,height:850,motion:'no-preference'}].filter(v=>!process.env.JP_DRAG_VIEWPORT||v.width===+process.env.JP_DRAG_VIEWPORT)){
   const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},hasTouch:true,reducedMotion:viewport.motion||'reduce'}),page=await context.newPage(),errors=[];
   await page.addInitScript(()=>{
     window.dragMatrices=[];const g=WebGL2RenderingContext.prototype,names=new WeakMap(),get=g.getUniformLocation,write=g.uniformMatrix4fv;let first=null;
     g.getUniformLocation=function(p,n){const l=get.call(this,p,n);if(l)names.set(l,{p,n});if(n==='uView'&&!first)first=p;return l};
     g.uniformMatrix4fv=function(l,t,v){const n=names.get(l);if(n?.p===first&&(n.n==='uView'||n.n==='uProj')){window.dragMatrices.push(Array.from(v));if(window.dragMatrices.length>2)window.dragMatrices.shift()}return write.call(this,l,t,v)};
   });
   await context.route('https://api.web3forms.com/**',r=>r.abort());
   page.on('pageerror',e=>{errors.push(e.message);console.error('Scene error',e.message)});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error('Scene console',m.text())}});
   await page.goto(process.env.JP_TEST_URL||'http://localhost:8000');
   await page.waitForFunction(()=>document.documentElement.dataset.render==='ready',null,{timeout:45000});
   for(const id of ['gallery','particles','materials','sound','monitor']){
    const button=page.locator(id==='monitor'?'#room-button':`#${id}-button`),before=await button.getAttribute('data-center'),p=await point(button);
    if(viewport.width===390){
      const cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});
      await page.waitForFunction(id=>document.querySelector(id==='monitor'?'#room-button':`#${id}-button`).dataset.dragging==='true',id);
      const delta=id==='gallery'||id==='materials'?-13:13;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+delta,y:p.y,id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await cdp.detach();
    }else{
      await page.mouse.move(p.x,p.y);await page.mouse.down();
      await page.waitForFunction(id=>document.querySelector(id==='monitor'?'#room-button':`#${id}-button`).dataset.dragging==='true',id);
      await page.mouse.move(p.x+(id==='gallery'||id==='materials'?-35:35),p.y+12,{steps:5});await page.mouse.up();
    }
    assert.equal(await page.locator('html').getAttribute('data-view'),'room','Release cannot open app');
    assert.notEqual(await button.getAttribute('data-center'),before,'The actual room position changed');
    const placed=await button.getAttribute('data-center');
    await button.focus();await page.keyboard.press('m');await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');
    assert.equal(await button.getAttribute('data-center'),placed,'Escape restores the position before keyboard movement');
    await page.keyboard.press('m');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-view'),'room','Keyboard placement cannot open the app');
    await page.locator(`[data-destination="${id}"]`).click();
    await page.waitForFunction(id=>document.documentElement.dataset.view===id,id);
    assert.equal(await page.locator(id==='monitor'?'#monitor-app':'#lab-panel').getAttribute('aria-hidden'),'false');
    const alignment=await page.evaluate(async id=>{
      const {WORLD_ROOMS}=await import('/rooms.js'),{workstationScreen}=await import('/room-world.js'),r=WORLD_ROOMS.find(r=>r.id===id);
      const center=document.querySelector(id==='monitor'?'#room-button':`#${id}-button`).dataset.center.split(',').map(Number);
      const [view,projection]=window.dragMatrices,multiply=(m,v)=>[0,1,2,3].map(row=>v.reduce((s,n,col)=>s+m[col*4+row]*n,0));
      const points=workstationScreen({...r,center}).map(p=>{const c=multiply(projection,multiply(view,[...p,1]));return{x:(c[0]+1)*innerWidth/2,y:(1-c[1])*innerHeight/2}});
      const b=document.querySelector(id==='monitor'?'#monitor-app':'#lab-panel').getBoundingClientRect();
      return Math.max(Math.abs(b.left-Math.min(...points.map(p=>p.x))),Math.abs(b.right-Math.max(...points.map(p=>p.x))),Math.abs(b.top-Math.min(...points.map(p=>p.y))),Math.abs(b.bottom-Math.max(...points.map(p=>p.y))));
    },id);
    assert.ok(alignment<1,`Moved ${id} camera/HTML alignment error ${alignment}`);
    await page.keyboard.press('Escape');await page.waitForFunction(()=>document.documentElement.dataset.view==='room');
   }
   assert.deepEqual(errors,[]);await page.screenshot({path:path.join(output,`flexible-placed-${viewport.width}.png`)});
   if(viewport.width===390){
     const button=page.locator('#sound-button'),before=await button.getAttribute('data-center'),p=await point(button),cdp=await context.newCDPSession(page);
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});
     await page.waitForFunction(()=>document.querySelector('#sound-button').dataset.dragging==='true');
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1},{x:p.x+30,y:p.y+30,id:2}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+8,y:p.y,id:1},{x:p.x+45,y:p.y+30,id:2}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
     assert.equal(await button.getAttribute('data-center'),before,'Touch cancellation restores the primary gesture');
     await cdp.detach();
   }
   if(viewport.width===1440){
     const button=page.locator('#gallery-button'),p=await point(button);
     await page.mouse.move(p.x,p.y);await page.mouse.down();await page.keyboard.press('Escape');await page.mouse.up();
     assert.equal(await page.locator('html').getAttribute('data-view'),'room','Cancelling a pending hold must suppress that pointer click');
     await button.focus();await page.keyboard.press('Enter');
     await page.waitForFunction(()=>document.documentElement.dataset.view==='gallery');
     await page.keyboard.press('Escape');await page.waitForFunction(()=>document.documentElement.dataset.view==='room');
     const sound=page.locator('#sound-button');await sound.focus();await page.keyboard.press('m');
     for(let i=0;i<70;i++)await page.keyboard.press('Shift+ArrowRight');
     await page.keyboard.press('Enter');
     await page.waitForFunction(()=>+document.querySelector('#sound-button').dataset.center.split(',')[0]>60);
     const clip=await page.evaluate(async()=>{
       const {roomCorners}=await import('/rooms.js'),center=document.querySelector('#sound-button').dataset.center.split(',').map(Number),[v,p]=window.dragMatrices;
       const multiply=(m,a)=>[0,1,2,3].map(row=>a.reduce((s,n,col)=>s+m[col*4+row]*n,0));
       return roomCorners({center}).map(c=>multiply(p,multiply(v,[...c,1]))).every(c=>Math.abs(c[0])<=1&&Math.abs(c[1])<=1&&Math.abs(c[2])<=1);
     });
     assert.equal(clip,true,'Distant rooms remain inside XY AND depth clipping, not merely inside layout bounds');
   }
   results.push({viewport:viewport.width,motion:viewport.motion||'reduce',fiveRoomsDragged:true,touch:viewport.width===390,noAccidentalOpen:true,keyboardCancel:true,keyboardPlace:true,movedMonitorAlignment:true,secondTouchCancel:viewport.width===390,errors});
   await context.close();
  }
  console.log(JSON.stringify({passed:results.length,results},null,2));
 }finally{fs.writeFileSync(path.join(output,'flexible-results.json'),JSON.stringify(results,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
