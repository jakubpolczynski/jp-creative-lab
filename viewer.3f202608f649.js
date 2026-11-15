/**
 * JP Creative Lab / Voxel 3D prototype.
 * A real GLB mesh displayed with a dependency-free WebGL2 renderer.
 * Fixed camera; data pulses travel along the physical cable in both directions.
 */
import {signalState} from './signals.js';
import {createRoomMotion,stepRoomMotion,roomHull} from './interaction.js';
import {createMonitorTransition,monitorProgress,monitorFrame,chairPose} from './monitor.js';
const canvas = document.querySelector('#scene');
const fallback = document.querySelector('#status');
let gl = null;
try { gl = canvas.getContext('webgl2', {antialias:true,alpha:true,depth:true,powerPreference:'default',premultipliedAlpha:false,preserveDrawingBuffer:true}); } catch (error) { console.error('WebGL2 initialization failed', error); }

if (!gl) {
  fallback.textContent = 'Nie mogę uruchomić WebGL 2 w tej przeglądarce. Otwórz stronę w Chrome lub Firefox z włączoną akceleracją grafiki.';
  fallback.hidden = false;
} else {
  launch().catch(error => {
    console.error('3D scene could not be rendered:', error);
    fallback.textContent = 'Nie udało się wyświetlić sceny 3D. Odśwież stronę lub otwórz ją w innej przeglądarce.';
    fallback.hidden = false;
  });
}

function compileShader(gl,type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error('Shader: '+gl.getShaderInfoLog(shader));
  return shader;
}
function makeProgram(gl,vert,frag){
  const program=gl.createProgram();
  gl.attachShader(program,compileShader(gl,gl.VERTEX_SHADER,vert));
  gl.attachShader(program,compileShader(gl,gl.FRAGMENT_SHADER,frag));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Program: '+gl.getProgramInfoLog(program));
  return program;
}

const meshVert=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aColor;
layout(location=3) in float aSignal;
layout(location=4) in float aRack;
layout(location=5) in float aRoom;
layout(location=6) in float aButton;
layout(location=7) in float aChair;
uniform mat4 uView,uProj;
uniform vec2 uRoomPose;
uniform vec3 uChairPose;
out vec3 vNormal;out vec4 vColor;out vec3 vWorld;
out float vSignal;out float vRack;out float vRoom;
void main(){
 vec3 pivot=vec3(4.985,0.0,.04);
 float angle=uChairPose.x*aChair;
 float c=cos(angle),s=sin(angle);
 vec3 relative=aPos-vec3(3.25,0.0,-.55);
 vec3 chairWorld=vec3(c*relative.x+s*relative.z,relative.y,-s*relative.x+c*relative.z)+vec3(3.25,0.0,-.55)+vec3(uChairPose.y,0.0,uChairPose.z);
 vec3 local=mix(aPos,chairWorld,aChair);
 vec3 moved=pivot+(local-pivot)*uRoomPose.y+vec3(0.0,uRoomPose.x,0.0);
 vec3 world=mix(local,moved,aButton);
 vNormal=vec3(c*aNormal.x+s*aNormal.z,aNormal.y,-s*aNormal.x+c*aNormal.z);
 vColor=aColor;vWorld=world;vSignal=aSignal;vRack=aRack;vRoom=aRoom;
 gl_Position=uProj*uView*vec4(world,1.0);
}
`;
const meshFrag=`#version 300 es
precision highp float;
in vec3 vNormal;in vec4 vColor;in vec3 vWorld;
uniform int uEmissionOnly;
uniform bool uBloomCapture;
in float vSignal;in float vRack;
in float vRoom;
uniform vec2 uPulses;
uniform float uRackBlink;
uniform float uRoomBlink;
uniform float uRoomHover;
uniform float uMonitorFocus;
uniform float uHideMonitorLogo;
out vec4 fragColor;
void main(){
  bool monitorSurface=vWorld.x>1.80&&vWorld.x<2.32&&vWorld.y>1.66&&vWorld.y<2.76&&vWorld.z> -1.31&&vWorld.z<.29;
  // Hide only the monitor's luminous JP/brackets, in color AND bloom capture.
  if(uHideMonitorLogo>.5&&monitorSurface&&uEmissionOnly==1&&vRoom>.5)discard;
  float visibility=monitorSurface?1.0:1.0-uMonitorFocus;
  if(visibility<.001)discard;
  vec3 c=vColor.rgb;
  if(vRack>.5 && uEmissionOnly==1){
    c=mix(c,vec3(.12,.32,1.0),uRackBlink);
  }
  if(vRoom>.5 && uEmissionOnly==1){
    c=mix(c,vec3(.15,1.0,.25),uRoomBlink);
    c=mix(c,min(vec3(1.0),c*1.22+vec3(.025,.04,.045)),uRoomHover);
  }
  if(vSignal>=0.0){
    float green=1.0-smoothstep(.12,.65,abs(vSignal-uPulses.x));
    float blue=1.0-smoothstep(.12,.65,abs(vSignal-uPulses.y));
    c=mix(c,vec3(.20,1.0,.34),green);
    c=mix(c,vec3(.12,.52,1.0),blue);
  }
  if(uBloomCapture && uEmissionOnly==0){
    // Opaque geometry must occlude neon in the glow buffer as well as the main image.
    fragColor=vec4(0.0,0.0,0.0,1.0);
  } else if(uEmissionOnly==1){
    fragColor=vec4(min(vec3(1.0),c*1.17),1.0);
  } else {
    vec3 n=normalize(vNormal);
    vec3 key=normalize(vec3(-.35,1.0, .72));
    vec3 fill=normalize(vec3(.80,.75,-.36));
    float a=max(dot(n,key),0.0);
    float b=max(dot(n,fill),0.0);
    float lit=0.73 + .22*a + .11*b;
    float ceilingGlow=max(n.y,0.)*.075;
    c=c*lit + vec3(ceilingGlow)*c;
    // Slight ambient blue in corners maintains voxel visual depth.
    c += vec3(.014,.021,.055)*(1.-a)*.38;
    fragColor=vec4(clamp(c,0.,1.),1.0);
  }
  if(uBloomCapture)fragColor.rgb*=visibility;
  else fragColor.a=visibility;
}`;
const quadVert=`#version 300 es
precision highp float;
out vec2 vUV;
const vec2 pos[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
void main(){vec2 xy=pos[gl_VertexID];vUV=(xy+1.0)*.5;gl_Position=vec4(xy,0,1);}
`;
const quadFrag=`#version 300 es
precision highp float;
in vec2 vUV;uniform sampler2D uTexture;uniform vec2 uTexel;out vec4 fragColor;
void main(){
 vec3 col=vec3(0.);
 float w=0.;
 for(int x=-3;x<=3;x++)for(int y=-3;y<=3;y++){
   vec2 offset=vec2(float(x),float(y));
   float factor=exp(-dot(offset,offset)/8.2);
   col += texture(uTexture, vUV+offset*uTexel*1.45).rgb*factor;
   w+=factor;
 }
 fragColor=vec4(col/w*.57,1.);
}`;

function norm(v){let length=Math.hypot(...v)||1;return v.map(x=>x/length);}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function lookAt(eye,center,up){
 const z=norm(sub(eye,center)),x=norm(cross(up,z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
    -dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function ortho(left,right,bottom,top,near,far){
 const rl=1/(right-left),tb=1/(top-bottom),fn=1/(far-near);
 return new Float32Array([2*rl,0,0,0, 0,2*tb,0,0, 0,0,-2*fn,0,
    -(right+left)*rl,-(top+bottom)*tb,-(far+near)*fn,1]);
}
function projectView(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]];}

function parseGLB(buffer){
 const view=new DataView(buffer);
 if(view.getUint32(0,true)!==0x46546c67)throw Error('Missing glTF GLB header');
 if(view.getUint32(4,true)!==2)throw Error('Unsupported GLB version');
 const total=view.getUint32(8,true);if(total!==buffer.byteLength)throw Error('Bad GLB length');
 let off=12,doc=null,binary=null;
 while(off<total){
   const size=view.getUint32(off,true),kind=view.getUint32(off+4,true);
   off+=8;
   if(kind===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,off,size)).trim());
   if(kind===0x004e4942)binary=new Uint8Array(buffer,off,size);
   off+=size;
 }
 if(!doc||!binary)throw Error('Incomplete GLB scene');
 return {doc,binary};
}

function createGeometry(gl,gltf,bin){
 const {accessors,bufferViews}=gltf;
 const prims=gltf.meshes[0].primitives;
 function dataFor(accessorId){
    const accessor=accessors[accessorId],v=bufferViews[accessor.bufferView];
    const size=accessor.componentType===5126||accessor.componentType===5125?4:1;
    const count=accessor.type==='VEC4'?4:accessor.type==='VEC3'?3:1;
    return {offset:v.byteOffset+(accessor.byteOffset||0),bytes:accessor.count*size*count,componentType:accessor.componentType,count:accessor.count,accessor};
 }
 const all=[];for (const primitive of prims){
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  for(const [attrib,index,size,normal] of [['POSITION',0,3,false],['NORMAL',1,3,false],['COLOR_0',2,4,true]]){
    const a=dataFor(primitive.attributes[attrib]);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(bin.buffer,bin.byteOffset+a.offset,a.bytes),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index,size,a.componentType,normal,0,0);
  }
  for(const [attrib,index,fallbackValue] of [['_SIGNAL',3,-100],['_RACK',4,0],['_ROOM',5,0],['_BUTTON',6,0],['_CHAIR',7,0]]){
    if(primitive.attributes[attrib]===undefined){gl.disableVertexAttribArray(index);gl.vertexAttrib1f(index,fallbackValue);continue;}
    const a=dataFor(primitive.attributes[attrib]);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(bin.buffer,bin.byteOffset+a.offset,a.bytes),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,1,gl.FLOAT,false,0,0);
  }
  const ib=dataFor(primitive.indices),buffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint8Array(bin.buffer,bin.byteOffset+ib.offset,ib.bytes),gl.STATIC_DRAW);
  all.push({vao,count:ib.count,indexType:ib.componentType,emission:primitive.material===1});
 }
 gl.bindVertexArray(null);return all;
}

function createBloom(gl,width,height){
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
 gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
 const depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
 gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);
 gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw Error('Glow framebuffer unavailable');
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {tex,framebuffer,depth,width,height};
}

async function launch(){
 const resp=await fetch('/room-server.44b95fcd4e41.glb',{cache:'no-cache'});
 if(!resp.ok)throw Error('3D model not found: '+resp.status);
 const {doc,binary}=parseGLB(await resp.arrayBuffer());
 const geometry=createGeometry(gl,doc,binary);
 const meshProgram=makeProgram(gl,meshVert,meshFrag);
 const bloomProgram=makeProgram(gl,quadVert,quadFrag);
 const meshUniforms={view:gl.getUniformLocation(meshProgram,'uView'),proj:gl.getUniformLocation(meshProgram,'uProj'),emit:gl.getUniformLocation(meshProgram,'uEmissionOnly'),bloomCapture:gl.getUniformLocation(meshProgram,'uBloomCapture'),pulses:gl.getUniformLocation(meshProgram,'uPulses'),rackBlink:gl.getUniformLocation(meshProgram,'uRackBlink'),roomBlink:gl.getUniformLocation(meshProgram,'uRoomBlink'),roomPose:gl.getUniformLocation(meshProgram,'uRoomPose'),roomHover:gl.getUniformLocation(meshProgram,'uRoomHover'),monitorFocus:gl.getUniformLocation(meshProgram,'uMonitorFocus'),hideMonitorLogo:gl.getUniformLocation(meshProgram,'uHideMonitorLogo'),chairPose:gl.getUniformLocation(meshProgram,'uChairPose')};
 const screenUniforms={tex:gl.getUniformLocation(bloomProgram,'uTexture'),texel:gl.getUniformLocation(bloomProgram,'uTexel')};
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(const a of doc.accessors){if(a.type==='VEC3'&&a.min&&a.max){for(let j=0;j<3;j++){bounds.min[j]=Math.min(bounds.min[j],a.min[j]);bounds.max[j]=Math.max(bounds.max[j],a.max[j]);}}}
 const target=[1.18,2.10,0];const eye=[target[0]+15,target[1]+13,target[2]+17];
 const baseView=lookAt(eye,target,[0,1,0]);
 let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
 for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){
    const p=[a?bounds.max[0]:bounds.min[0],b?bounds.max[1]:bounds.min[1],c?bounds.max[2]:bounds.min[2]];
    const [x,y]=projectView(baseView,p);
    minx=Math.min(x,minx);maxx=Math.max(x,maxx);miny=Math.min(y,miny);maxy=Math.max(y,maxy);
 }
 const view=baseView.slice();view[12]-=(minx+maxx)/2;view[13]-=(miny+maxy)/2;
 const worldWidth=maxx-minx,worldHeight=maxy-miny;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const signalLength=doc.extras?.signalLength||0;
 const started=performance.now();
 const roomButton=document.querySelector('#room-button');
 const roomOutline=document.querySelector('#room-focus polygon');
 const monitorApp=document.querySelector('#monitor-app'),monitorBack=document.querySelector('#monitor-back');
 const camera=createMonitorTransition();
 let cameraAmount=0,appVisible=false,restoreRoomFocus=false;
 const pose=createRoomMotion(),input={hover:false,pressed:false};
 let pointerHover=false,keyboardFocus=false,activePointer=null,lastMotion=started,clickUntil=0,cancelPointerClick=false;
 let bloom=null,animationFrame=0,lastFrame=-Infinity,contextLost=false;
 function render(now=performance.now()){
   cameraAmount=monitorProgress(camera,now,motion.matches);
   input.hover=camera.to===0&&cameraAmount===0&&(pointerHover||keyboardFocus);
   if(cameraAmount>0||camera.to===1){pose.lift=0;pose.velocity=0;pose.scale=1;pose.glow=0;input.pressed=false;}
   else stepRoomMotion(pose,input,(now-lastMotion)/1000,motion.matches);
   lastMotion=now;
   const cssWidth=canvas.clientWidth,cssHeight=canvas.clientHeight;
   if(!cssWidth||!cssHeight)return;
   const dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.5:2);
   const width=Math.max(1,Math.round(cssWidth*dpr)),height=Math.max(1,Math.round(cssHeight*dpr));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   const aspect=width/height;
   // Camera keeps the entire model in frame in portrait and landscape.
   const framing=window.innerWidth<700?1.16:1.105;
   const frame=monitorFrame(cssWidth,cssHeight);
   const overviewHeight=Math.max(worldHeight*framing,worldWidth*framing/aspect);
   const closeHeight=.77*cssHeight/frame.height;
   const orthoHeight=overviewHeight*Math.pow(closeHeight/overviewHeight,cameraAmount);
   const mix=(a,b)=>a+(b-a)*cameraAmount;
   const center=target.map((v,i)=>mix(v,[2.245,2.21,-.51][i]));
   const direction=[mix(15,25),mix(13,0),mix(17,0)];
   const cameraView=lookAt(center.map((v,i)=>v+direction[i]),center,[0,1,0]);
   cameraView[12]-=(minx+maxx)/2*(1-cameraAmount);cameraView[13]-=(miny+maxy)/2*(1-cameraAmount);
   const projection=ortho(-orthoHeight*aspect/2,orthoHeight*aspect/2,-orthoHeight/2,orthoHeight/2,.01,200);
   if(roomButton){
     const points=[];
     for(const [xx,yy,zz] of [[1.05,-.32,-3.43],[8.95,-.32,-3.43],[8.95,-.32,3.55],[1.05,-.32,3.55],[1.05,4.12,3.55],[1.05,4.12,-3.43],[8.95,4.12,-3.43]]){
       const [x,y]=projectView(view,[xx,yy,zz]);
       points.push([cssWidth/2+x*cssHeight/orthoHeight,cssHeight/2-y*cssHeight/orthoHeight]);
     }
     const hull=roomHull(points);
     roomButton.style.clipPath='polygon('+hull.map(p=>p.map(v=>v.toFixed(2)+'px').join(' ')).join(',')+')';
     if(roomOutline)roomOutline.setAttribute('points',hull.map(p=>p.join(',')).join(' '));
     roomButton.disabled=camera.to===1||cameraAmount>0;
     roomButton.style.pointerEvents=roomButton.disabled?'none':'';
     roomButton.setAttribute('aria-expanded',String(camera.to===1));
     roomButton.dataset.hover=String(input.hover);roomButton.dataset.pressed=String(input.pressed);
     roomButton.dataset.lift=pose.lift.toFixed(4);
   }
   if(monitorApp){
     Object.assign(monitorApp.style,{left:frame.left+'px',top:frame.top+'px',width:frame.width+'px',height:frame.height+'px'});
     const show=cameraAmount===1&&camera.to===1;
     monitorApp.dataset.open=String(show);monitorApp.inert=!show;monitorApp.setAttribute('aria-hidden',String(!show));
     document.documentElement.dataset.view=cameraAmount===0?'room':show?'monitor':'transition';
     if(show&&!appVisible)monitorBack?.focus({preventScroll:true});
     appVisible=show;
     if(cameraAmount===0&&restoreRoomFocus){restoreRoomFocus=false;roomButton?.focus({preventScroll:true});}
   }
   const bloomWidth=Math.max(4,Math.floor(width/4)),bloomHeight=Math.max(4,Math.floor(height/4));
   if(!bloom||bloom.width!==bloomWidth||bloom.height!==bloomHeight){
     if(bloom){gl.deleteTexture(bloom.tex);gl.deleteFramebuffer(bloom.framebuffer);gl.deleteRenderbuffer(bloom.depth);}
     bloom=createBloom(gl,bloomWidth,bloomHeight);
   }
   gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.useProgram(meshProgram);gl.uniformMatrix4fv(meshUniforms.view,false,cameraView);gl.uniformMatrix4fv(meshUniforms.proj,false,projection);
   gl.uniform1f(meshUniforms.hideMonitorLogo,camera.to===1||cameraAmount>0?1:0);
   gl.uniform1f(meshUniforms.monitorFocus,Math.max(0,(cameraAmount-.45)/.55));
   const chair=chairPose(cameraAmount);
   gl.uniform3f(meshUniforms.chairPose,chair.angle,chair.x,chair.z);
   gl.uniform2f(meshUniforms.roomPose,pose.lift,pose.scale);
   gl.uniform1f(meshUniforms.roomHover,Math.max(pose.glow,now<clickUntil?1:0));
   const state=signalState((now-started)/1000,signalLength,motion.matches||!signalLength);
   gl.uniform2f(meshUniforms.pulses,state.outbound,state.inbound);gl.uniform1f(meshUniforms.rackBlink,state.rackBlink);gl.uniform1f(meshUniforms.roomBlink,state.roomBlink);
   // Main render: full physical mesh, 2 separated glTF surface categories.
   gl.uniform1i(meshUniforms.bloomCapture,0);
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   for(const g of geometry){gl.bindVertexArray(g.vao);gl.uniform1i(meshUniforms.emit,g.emission?1:0);gl.drawElements(gl.TRIANGLES,g.count,g.indexType,0);}
   gl.disable(gl.BLEND);
   gl.bindVertexArray(null);
   // Capture visible neon only: walls, rack panels and furniture also write depth.
   // Opaque surfaces output black, so they block hidden emitters without glowing.
   gl.bindFramebuffer(gl.FRAMEBUFFER,bloom.framebuffer);gl.viewport(0,0,bloom.width,bloom.height);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.uniform1i(meshUniforms.bloomCapture,1);
   for(const g of geometry){gl.bindVertexArray(g.vao);gl.uniform1i(meshUniforms.emit,g.emission?1:0);gl.drawElements(gl.TRIANGLES,g.count,g.indexType,0);}
   gl.bindVertexArray(null);
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);
   gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
   gl.useProgram(bloomProgram);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,bloom.tex);
   gl.uniform1i(screenUniforms.tex,0);gl.uniform2f(screenUniforms.texel,1/bloom.width,1/bloom.height);
   gl.drawArrays(gl.TRIANGLES,0,6);
   gl.disable(gl.BLEND);
   document.documentElement.dataset.render='ready';
   fallback.hidden = true;
 }
 function tick(now){
   animationFrame=0;
   if(contextLost||document.hidden)return;
   if(clickUntil>0&&now>=clickUntil){clickUntil=0;render(now);lastFrame=now;}
   else if(now-lastFrame>=1000/30){render(now);lastFrame=now;}
   if((!motion.matches&&((signalLength&&cameraAmount<1)||cameraAmount!==camera.to||Math.abs(pose.lift-(input.pressed?-.11:input.hover?.16:0))>.0001||Math.abs(pose.velocity)>.001))||now<clickUntil)wake();
 }
 function wake(){if(!contextLost&&!document.hidden&&!animationFrame)animationFrame=requestAnimationFrame(tick);}
 function refresh(){if(contextLost)return;render();wake();}
 function setMonitor(open){
   const now=performance.now();camera.from=monitorProgress(camera,now,motion.matches);camera.to=open?1:0;camera.started=now;
   restoreRoomFocus=!open;
   pointerHover=false;keyboardFocus=false;input.pressed=false;
   if(open)roomButton?.blur();
   refresh();
 }
 monitorBack?.addEventListener('click',()=>setMonitor(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(camera.to===1||cameraAmount>0)){e.preventDefault();setMonitor(false);}});
 if(roomButton){
   roomButton.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')pointerHover=true;refresh();});
   roomButton.addEventListener('pointerleave',()=>{pointerHover=false;refresh();});
   roomButton.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;activePointer=e.pointerId;cancelPointerClick=false;input.pressed=true;roomButton.setPointerCapture(e.pointerId);refresh();});
   const release=e=>{if(e.pointerId!==activePointer)return;cancelPointerClick=e.type==='pointercancel'||(e.type==='pointerup'&&document.elementFromPoint(e.clientX,e.clientY)!==roomButton);activePointer=null;input.pressed=false;refresh();};
   roomButton.addEventListener('pointerup',release);roomButton.addEventListener('pointercancel',release);roomButton.addEventListener('lostpointercapture',release);
   roomButton.addEventListener('focus',()=>{keyboardFocus=roomButton.matches(':focus-visible');refresh();});
   roomButton.addEventListener('blur',()=>{keyboardFocus=false;input.pressed=false;refresh();});
   roomButton.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat){input.pressed=true;refresh();}}});
   roomButton.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();const activate=input.pressed;input.pressed=false;if(activate)roomButton.click();refresh();}});
   roomButton.addEventListener('click',e=>{
     if(e.detail>0&&cancelPointerClick){cancelPointerClick=false;return;}
     if(!motion.matches)pose.velocity+=2.2;
     clickUntil=performance.now()+260;
     roomButton.dataset.activations=String(Number(roomButton.dataset.activations||0)+1);
     roomButton.dispatchEvent(new CustomEvent('roomactivate',{bubbles:true}));
     setMonitor(true);
   });
 }
 function syncAnimation(){
   cancelAnimationFrame(animationFrame);animationFrame=0;
   if(contextLost)return;
   if(document.hidden){input.pressed=false;pointerHover=false;keyboardFocus=false;return;}
   lastMotion=performance.now();
   render();
   if(!motion.matches&&signalLength)wake();
 }
 canvas.addEventListener('webglcontextlost', event => {
   event.preventDefault();
   contextLost=true;cancelAnimationFrame(animationFrame);
   if(roomButton)roomButton.disabled=true;
   fallback.textContent = 'Utracono połączenie z kartą graficzną. Odśwież stronę, aby ponownie uruchomić scenę.';
   fallback.hidden = false;
 });
 window.addEventListener('resize',()=>{if(!contextLost)render();},{passive:true});
 motion.addEventListener('change',syncAnimation);
 document.addEventListener('visibilitychange',syncAnimation);
 syncAnimation();
}