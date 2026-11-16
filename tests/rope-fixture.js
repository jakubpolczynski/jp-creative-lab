import {WORLD_ROOMS} from '../rooms.js';
import {buildRoom} from '../room-world.js';
/** Test-only GPU instrumentation: read the exact uploaded tube, not a predicted route. */
function instrument(){
 const g=WebGL2RenderingContext.prototype,names=new WeakMap(),programs=new WeakMap(),arrays=new WeakMap(),buffers=new WeakMap();
 let program=null,vao=null,buffer=null;
 window.ropeDraws={};window.rackLight={color:[.2,1,.34],intensity:0};window.sceneMatrices=[];
 const get=g.getUniformLocation;g.getUniformLocation=function(p,n){const l=get.call(this,p,n);if(l)names.set(l,{p,n});return l};
 const use=g.useProgram;g.useProgram=function(p){program=p;if(p&&!programs.has(p))programs.set(p,{});return use.call(this,p)};
 for(const method of ['uniform1f','uniform1i','uniform2f','uniform3f']){
  const original=g[method];g[method]=function(loc,...args){
   const info=loc&&names.get(loc);if(info){if(!programs.has(info.p))programs.set(info.p,{});programs.get(info.p)[info.n]=args.length===1?args[0]:args;
    if(info.n==='uRackBlink')window.rackLight.intensity=args[0];if(info.n==='uRackColor')window.rackLight.color=args}
   return original.call(this,loc,...args);
  };
 }
 const matrix=g.uniformMatrix4fv;g.uniformMatrix4fv=function(loc,t,v){window.sceneMatrices.push(Array.from(v));if(window.sceneMatrices.length>2)window.sceneMatrices.shift();return matrix.call(this,loc,t,v)};
 const bindVao=g.bindVertexArray;g.bindVertexArray=function(v){vao=v;if(v&&!arrays.has(v))arrays.set(v,{});return bindVao.call(this,v)};
 const bindBuffer=g.bindBuffer;g.bindBuffer=function(t,b){if(t===this.ARRAY_BUFFER)buffer=b;return bindBuffer.call(this,t,b)};
 const attribute=g.vertexAttribPointer;g.vertexAttribPointer=function(i,...args){if(vao)arrays.get(vao)[i]=buffer;return attribute.call(this,i,...args)};
 const data=g.bufferData;g.bufferData=function(t,d,...args){
  if(t===this.ARRAY_BUFFER&&buffer)buffers.set(buffer,typeof d==='number'?new Float32Array(d/4):new Float32Array(d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength)));
  return data.call(this,t,d,...args);
 };
 const sub=g.bufferSubData;g.bufferSubData=function(t,offset,d,...args){if(t===this.ARRAY_BUFFER&&buffer)buffers.get(buffer)?.set(new Float32Array(d.buffer,d.byteOffset,d.byteLength/4),offset/4);return sub.call(this,t,offset,d,...args)};
 const draw=g.drawArrays;g.drawArrays=function(mode,start,count){
  const u=programs.get(program);
  if(u?.uKind===4&&vao){
   const a=arrays.get(vao),pos=buffers.get(a[0]),arc=buffers.get(a[5]),segments=(count-72)/36,points=[],distances=[];
   if(pos&&arc&&Number.isInteger(segments)){
    for(let i=0;i<=segments;i++){
     const p=[0,0,0],base=i===segments?(i-1)*36:i*36,offset=i===segments?1:0;
     for(let side=0;side<6;side++)for(let j=0;j<3;j++)p[j]+=pos[(base+side*6+offset)*3+j]/6;
     points.push(p);distances.push(arc[(base+offset)*3]);
    }
    const color=u.uAccent,id=window.ropePalette.reduce((best,r)=>Math.hypot(...r.rgb.map((v,j)=>v-color[j]))<Math.hypot(...best.rgb.map((v,j)=>v-color[j]))?r:best).id;
    window.ropeDraws[id]={points,distances,color,outbound:u.uPulses[0],inbound:u.uPulses[1],roomBlink:u.uRoomBlink,count};
   }
  }
  return draw.call(this,mode,start,count);
 };
}
export async function runRopeFixture(animation=false){
 const results=[],check=(name,passed,details={})=>results.push({name,passed,...details});
 const html=await(await fetch('/')).text();
 const freeze=`<script>window.simTime=0;window.framesToRun=[];window.ropePalette=${JSON.stringify(WORLD_ROOMS.map(({id,rgb})=>({id,rgb})))};Object.defineProperty(performance,'now',{value:()=>window.simTime});window.requestAnimationFrame=cb=>{window.framesToRun.push(cb);return window.framesToRun.length};window.cancelAnimationFrame=()=>{};(${instrument.toString()})();<\/script>`;
 const frame=document.querySelector('iframe');frame.srcdoc=html.replace('<head>','<head><base href="/">'+freeze);
 for(let i=0;i<1000;i++){if(frame.contentDocument?.documentElement.dataset.render==='ready')break;await new Promise(r=>setTimeout(r,30))}
 const win=frame.contentWindow,canvas=win.document.querySelector('#scene'),gl=canvas.getContext('webgl2');
 if(win.document.documentElement.dataset.render!=='ready')throw Error('Flexible cable scene not ready');
 function at(time){
  win.simTime=time*1000;win.dispatchEvent(new win.Event('resize'));
  const data=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
  if(gl.getError())throw Error('WebGL error');return data;
 }
 win.setCableTestTime=at;
 const multiply=(m,v)=>[0,1,2,3].map(row=>v.reduce((s,n,col)=>s+m[col*4+row]*n,0));
 function closest(data,p,color){
  const [view,projection]=win.sceneMatrices,c=multiply(projection,multiply(view,[...p,1]));
  const x=Math.round((c[0]+1)*canvas.width/2),y=Math.round((c[1]+1)*canvas.height/2),target=color.map(v=>Math.min(255,v*1.17*255));
  let best={error:Infinity,rgb:[]};
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
   const n=((y+dy)*canvas.width+x+dx)*4,rgb=Array.from(data.slice(n,n+3)),error=rgb.length===3?rgb.reduce((s,v,j)=>s+Math.abs(v-target[j]),0)/3:Infinity;
   if(error<best.error)best={error,rgb};
  }
  return best;
 }
 function pointAt(draw,d){
  for(let i=1;i<draw.distances.length;i++)if(d<=draw.distances[i]){
   const t=(d-draw.distances[i-1])/(draw.distances[i]-draw.distances[i-1]||1);
   return draw.points[i-1].map((v,j)=>v+(draw.points[i][j]-v)*t);
  }
  return draw.points.at(-1);
 }
 const metrics=Object.fromEntries(WORLD_ROOMS.map(r=>[r.id,{send:Infinity,reply:Infinity,room:Infinity,causal:false}]));
 const letters=Object.fromEntries(WORLD_ROOMS.map(room=>{
  const mesh=buildRoom(room),sign=mesh.parts.find(p=>p.name==='wall-sign'),start=sign.start+30;
  return [room.id,[0,1,2].map(j=>room.center[j]+(mesh.positions[start*3+j]+mesh.positions[(start+1)*3+j]+mesh.positions[(start+2)*3+j])/3)];
 }));
 const asciiLights=[['Overhead lamp',[-2.837,3.10,-.4]],['Monitor lettering',[-1.984,1.84,-.312]],['Wall neon ASCI ART',[-2.31,3.04,-2.31]],['Floor LED',[0,.10,2.64]]].map(([name,p])=>({name,p:p.map((v,j)=>v+WORLD_ROOMS.at(-1).center[j]),received:Infinity,restored:Infinity}));
 let receivedServer=Infinity,velocity=false,lastOut=null;
 const initial=at(0),initialDraws=structuredClone(win.ropeDraws);
 for(let step=1;step<=260;step++){
  const time=step/10,pixels=at(time);
  for(const room of WORLD_ROOMS){
   const draw=win.ropeDraws[room.id],m=metrics[room.id],length=draw.distances.at(-1);
   if(draw.outbound>1&&draw.outbound<length-.3)m.send=Math.min(m.send,closest(pixels,pointAt(draw,draw.outbound),[.2,1,.34]).error);
   if(draw.inbound>1&&draw.inbound<length-.3)m.reply=Math.min(m.reply,closest(pixels,pointAt(draw,draw.inbound),room.rgb).error);
   if(draw.outbound>=0)m.lastFront={time,distance:draw.outbound,length};
   if(room.id==='monitor'&&draw.outbound>=0){
    if(lastOut&&Math.abs(time-lastOut.time-.1)<.0001&&Math.abs(draw.outbound-lastOut.distance-.5)<.0001)velocity=true;
    lastOut={time,distance:draw.outbound};
   }
   const letter=letters[room.id];
   if(draw.roomBlink>.5){
    m.room=Math.min(m.room,closest(pixels,letter,[.2,1,.34]).error);
    if(m.lastFront&&m.lastFront.time<time&&m.lastFront.length-m.lastFront.distance<1.5)m.causal=true;
    if(room.id==='gallery')win.cableShowcaseTimes={reply:time+1.5,room:time,server:time+length/5+1};
    if(room.id==='monitor')for(const l of asciiLights)l.received=Math.min(l.received,closest(pixels,l.p,[.2,1,.34]).error);
   }else if(room.id==='monitor'&&asciiLights[0].received<Infinity){
    for(const l of asciiLights)l.restored=Math.min(l.restored,closest(pixels,l.p,room.rgb).error);
   }
  }
  if(win.rackLight.intensity>.5)receivedServer=Math.min(receivedServer,closest(pixels,[-4.8,5.38,.05],win.rackLight.color).error);
 }
 if(animation){
  const m=metrics.monitor;
  check('Green travels on the actual deforming tube',m.send<50,m);
  check('Pulse advances at 5 cable units/s despite deformation',velocity);
  check('ASCII replies in cyan on its current cable',m.reply<50,m);
  check('Receiver only flashes after the outgoing front reaches it',m.causal);
  check('Crystal receives the returning beam color',receivedServer<55,{error:receivedServer});
  check('Flexible cable really changes shape under gravity',JSON.stringify(initialDraws.monitor.points)!==JSON.stringify(win.ropeDraws.monitor.points));
  for(const l of asciiLights){check(l.name+' turns green on receipt',l.received<55,l);check(l.name+' returns to cyan',l.restored<55,l)}
 }else{
  for(const room of WORLD_ROOMS){
   const draw=win.ropeDraws[room.id],m=metrics[room.id],expectedA=room.port,expectedB=room.center.map((v,j)=>v+[-2.33,1.84,-.45][j]);
   check(room.id+': real GPU tube starts at its own shelf',Math.hypot(...draw.points[0].map((v,j)=>v-expectedA[j]))<.001);
   check(room.id+': real GPU tube ends behind its monitor',Math.hypot(...draw.points.at(-1).map((v,j)=>v-expectedB[j]))<.001);
   check(room.id+': round tube has continuous finite arc coordinates',draw.distances.every(Number.isFinite)&&draw.distances.every((v,i)=>!i||v>=draw.distances[i-1])&&draw.count>100);
   check(room.id+': green outgoing surface streak',m.send<50,m);
   check(room.id+': own-color reply surface streak',m.reply<50,m);
   check(room.id+': green room receipt pixels',m.room<55,m);
   check(room.id+': no early room receipt',m.causal,m);
  }
  check('Server crystal matches the actual received beam',receivedServer<55,{error:receivedServer});
 }
 at(1.8);return {passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
}
