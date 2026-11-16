import {ROOMS,WORLD_ROOMS} from './rooms.js';
import {meshBuilder,buildRoom} from './room-world.js';
import {particlePosition} from './lab-particles.js';
import {chairPose} from './monitor.js';
import {cableReturnColor} from './cables.js';
import {SERVER_GREEN} from './signals.js';

const vertex=`#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
layout(location=3) in vec3 aBary;
layout(location=4) in float aChair;
layout(location=5) in vec3 aCable;
uniform mat4 uView,uProj;
uniform vec3 uOffset;
uniform vec3 uCablePivot;
uniform vec2 uPose,uPointer;
uniform vec2 uServerPose;
uniform vec3 uChairPose;
uniform float uTime,uDeform,uStrength,uPointSize,uScale;
uniform int uKind;
out vec3 vColor,vWorld,vBary,vLocal;
out float vDistance;
void main(){
 vec3 p=aPos;
 if(aChair>.5){
   vec3 q=p-vec3(-.85,0,-.45);float c=cos(uChairPose.x),s=sin(uChairPose.x);
   p=vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z)+vec3(-.85,0,-.45)+vec3(uChairPose.y,0,uChairPose.z);
 }
 vLocal=p;
 if(uKind==1){
   float c=cos(uTime*.16),s=sin(uTime*.16);
   p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
   p*=1.0+uDeform*.24*sin(p.y*4.0+uTime)*cos(p.x*3.0-uTime*.4);
 }
 p.y*=uScale;
 vec3 world=p*uPose.y+uOffset+vec3(0,uPose.x,0);
 if(uKind==3){
   vec3 moved=uCablePivot+(p-uCablePivot)*uPose.y+vec3(0,uPose.x,0);
   vec3 rackPivot=vec3(-4.8,0,.05);
   world=p+(moved-p)*aCable.y+((rackPivot+(p-rackPivot)*uServerPose.y+vec3(0,uServerPose.x,0))-p)*aCable.z;
 }
 if(uKind==2){
   vec4 clip=uProj*uView*vec4(world,1);
   vec2 delta=clip.xy/clip.w-uPointer;
   float repel=exp(-dot(delta,delta)*65.0)*uStrength;
   vec3 right=vec3(uView[0][0],uView[1][0],uView[2][0]);
   vec3 up=vec3(uView[0][1],uView[1][1],uView[2][1]);
   world+=(right*delta.x+up*delta.y)*repel*6.0;
 }
 vColor=aColor;vWorld=world;vBary=aBary;vDistance=aCable.x;
 gl_Position=uProj*uView*vec4(world,1);
 gl_PointSize=uPointSize;
}`;
const fragment=`#version 300 es
precision highp float;
precision highp int;
in vec3 vColor,vWorld,vBary,vLocal;
in float vDistance;
uniform int uKind,uMaterial;
uniform float uTime,uHue,uGlow,uFocus,uRoomBlink;
uniform vec3 uEye,uAccent,uReturn,uSendColor;
uniform vec2 uPulses;
uniform bool uBloomCapture;
uniform float uHideMonitorLogo;
out vec4 fragColor;
void main(){
 float visibility=1.;
  if(uKind==0&&uHideMonitorLogo>.5){
    bool lettering=vLocal.x> -2.035&&vLocal.x< -1.96&&abs(vLocal.y-1.84)<.40&&abs(vLocal.z+.45)<.65&&distance(vColor,uAccent)<.015;
    if(lettering)discard;
  }
  if(uFocus>0.){
    bool monitorBox=abs(vLocal.x+2.20)<.19&&abs(vLocal.y-1.84)<.50&&abs(vLocal.z+.45)<.74;
   visibility=monitorBox?1.:1.-uFocus;
   if(visibility<.001)discard;
 }
 if(uKind==2){
   float r=length(gl_PointCoord-.5);
   if(r>.5)discard;
   fragColor=vec4(vColor*(1.2-r*.6),visibility);return;
 }
 vec3 n=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
 if(!gl_FrontFacing)n=-n;
 vec3 light=normalize(vec3(-.4,1,.7));
 float diffuse=max(dot(n,light),0.0);
 vec3 col=vColor*(.68+.35*diffuse);
  if(distance(vColor,uAccent)<.015)col=vColor*.95;
 vec3 tint=mix(vec3(.3),clamp(abs(fract(uHue+vec3(0.,.6667,.3333))*6.-3.)-1.,0.,1.),.8);
  if(uKind==1){
   vec3 viewDir=normalize(uEye-vWorld);
   float fresnel=pow(1.0-abs(dot(n,viewDir)),3.);
   if(uMaterial==0){
     vec3 reflected=reflect(-viewDir,n);
     float bands=pow(.5+.5*sin(reflected.y*12.+reflected.x*3.),8.);
     float spec=pow(max(dot(n,normalize(light+viewDir)),0.),70.);
     col=mix(vec3(.11,.16,.24),vec3(.84,.92,1),smoothstep(-.4,.8,reflected.y));
     col+=bands*.35+spec*.7+fresnel*tint*.4;
   }else if(uMaterial==1){
     float scan=.7+.3*sin(vWorld.y*45.-uTime*2.);
     col=(tint*.5+vec3(.1,.4,.6)*diffuse+fresnel*vec3(.5,.9,1))*scan;
   }else{
     vec3 width=fwidth(vBary);
     vec3 edge=smoothstep(vec3(0),width*1.4,vBary);
     float wire=1.-min(min(edge.x,edge.y),edge.z);
     col=mix(vec3(.045,.075,.12),tint,wire);
   }
  }
   if((uKind==3||uKind==4)&&vDistance>=0.){
   float outgoing=1.-smoothstep(.12,.65,abs(vDistance-uPulses.x));
   float incoming=1.-smoothstep(.12,.65,abs(vDistance-uPulses.y));
    col=mix(vColor,uSendColor,outgoing);
   col=mix(col,uReturn,incoming)*1.17;
  }
 bool roomLight=uKind==0&&distance(vColor,uAccent)<.015;
 if(roomLight)col=mix(col,uSendColor*1.2,uRoomBlink);
 vec3 result=clamp(col+vColor*uGlow,0.,1.);
  if(uBloomCapture)result=((uKind==3||uKind==4)&&vDistance>=0.)||roomLight?result*visibility:vec3(0.);
 fragColor=vec4(result,visibility);
}`;
function sculpture(){
  const mesh=meshBuilder();
  const point=(u,v)=>{const a=u*Math.PI*2,b=v*Math.PI,r=1.3;return[Math.sin(b)*Math.cos(a)*r,Math.cos(b)*r,Math.sin(b)*Math.sin(a)*r]};
  const columns=40,rows=24;
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    const a=point(x/columns,y/rows),b=point((x+1)/columns,y/rows),c=point(x/columns,(y+1)/rows),d=point((x+1)/columns,(y+1)/rows);
    mesh.triangle(a,c,b,[.9,.8,.5]);mesh.triangle(b,c,d,[.9,.8,.5]);
  }
  return mesh;
}
export function createLabRenderer(gl,makeProgram){
  const program=makeProgram(gl,vertex,fragment),buffers=[],vaos=[];
  const uniforms=Object.fromEntries(['View','Proj','Offset','CablePivot','ServerPose','Pose','Pointer','Time','Deform','Strength','PointSize','Scale','Kind','Material','Hue','Glow','Eye','Accent','Focus','ChairPose','Pulses','Return','BloomCapture','SendColor','RoomBlink','HideMonitorLogo'].map(key=>[key,gl.getUniformLocation(program,'u'+key)]));
  function upload(mesh,dynamic=false){
    const vao=gl.createVertexArray();vaos.push(vao);gl.bindVertexArray(vao);
    const count=mesh.positions.length/3;
    let positionBuffer;
    const attributes=[];
    const bary=Array.from({length:count*3},(_,i)=>i%9===0||i%9===4||i%9===8?1:0);
    const chair=new Float32Array(count);
    for(const part of mesh.parts||[])if(part.name==='chair')chair.fill(1,part.start,part.start+part.count);
    const cable=mesh.cable||Float32Array.from({length:count*3},(_,i)=>i%3===0?-100:0);
    for(const [index,data] of [mesh.positions,mesh.normals,mesh.colors,bary,chair,cable].entries()){
      const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      attributes.push(buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),dynamic&&index===0?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
      gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,index===4?1:3,gl.FLOAT,false,0,0);
      if(index===0)positionBuffer=buffer;
    }
    gl.bindVertexArray(null);return{vao,count,positionBuffer,attributes,capacity:count};
  }
  const worlds=WORLD_ROOMS.map(room=>({room,body:upload(buildRoom(room)),cable:null}));
  function updateCables(cables){
    for(const c of cables){
      const entry=worlds.find(w=>w.room.id===c.id);
      if(!entry.cable){entry.cable=upload(c.mesh,true);continue}
      const gpu=entry.cable,count=c.mesh.positions.length/3,grow=count>gpu.capacity;
      if(grow)gpu.capacity=2**Math.ceil(Math.log2(count));
      for(let index=0;index<6;index++){
        gl.bindBuffer(gl.ARRAY_BUFFER,gpu.attributes[index]);
        if(grow)gl.bufferData(gl.ARRAY_BUFFER,gpu.capacity*(index===4?1:3)*4,gl.DYNAMIC_DRAW);
        const data=index===0?c.mesh.positions:index===1?c.mesh.normals:index===2?c.mesh.colors:index===5?c.mesh.cable:null;
        if(data)gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array(data));
      }
      gpu.count=count;
    }
  }
  const ball=upload(sculpture()),cube=meshBuilder();cube.box(0,.5,0,.25,1,.3,ROOMS.find(r=>r.id==='sound').rgb);
  const bar=upload(cube);
  let particleCount=innerWidth<700?750:2000;
  const positions=new Float32Array(2000*3);
  const particleMesh={positions,normals:new Float32Array(2000*3),colors:Float32Array.from({length:2000*3},(_,i)=>i%3===0?1:i%3===1?.55:.95)};
  const points=upload(particleMesh,true);
  let last=0,previousMode='',initialized=false;
  function draw({view,projection,target,amount,time,reduced,poses,asciiPose,serverPose,state,seq,pointer,width,height,network,layout,bloomCapture=false}){
    gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
    if(bloomCapture)gl.disable(gl.BLEND);else gl.enable(gl.BLEND);
    gl.uniform1i(uniforms.BloomCapture,bloomCapture?1:0);
    gl.uniform3f(uniforms.SendColor,...SERVER_GREEN);
    gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.uniformMatrix4fv(uniforms.View,false,view);gl.uniformMatrix4fv(uniforms.Proj,false,projection);
    gl.uniform3f(uniforms.Eye,...viewEye(view));
    gl.uniform2f(uniforms.ServerPose,serverPose.lift,serverPose.scale);
    gl.uniform2f(uniforms.Pointer,...pointer);
    gl.uniform1f(uniforms.PointSize,(width/innerWidth)*(innerWidth<700?3.6:3));
    gl.uniform1f(uniforms.Strength,state.strength);
    gl.uniform1f(uniforms.Time,reduced?0:time);gl.uniform1f(uniforms.Deform,state.deformation);
    gl.uniform1i(uniforms.Material,['chrome','hologram','wire'].indexOf(state.material));
    gl.uniform1f(uniforms.Hue,state.hue);
    function place(mesh,offset,kind=0,scale=1,pose={lift:0,scale:1},glow=0,primitive=gl.TRIANGLES){
      gl.uniform3f(uniforms.Offset,...offset);gl.uniform2f(uniforms.Pose,pose.lift,pose.scale);
      gl.uniform1i(uniforms.Kind,kind);gl.uniform1f(uniforms.Scale,scale);gl.uniform1f(uniforms.Glow,glow);
      gl.bindVertexArray(mesh.vao);gl.drawArrays(primitive,0,mesh.count);
    }
    const dt=Math.min(.1,Math.max(0,time-last));if(!bloomCapture)last=time;
    const requested=innerWidth<700?750:2000;
    if(requested!==particleCount){particleCount=requested;initialized=false;}
    points.count=particleCount;
    for(const entry of worlds){
      const {body,cable}=entry,room=layout?.room(entry.room.id)||entry.room;
      if(amount===1&&target!==room.id)continue;
      const active=target===room.id&&amount===1,pose=room.id==='monitor'?asciiPose:poses[room.id];
      const focus=target===room.id?amount:0,chair=chairPose(focus);
      gl.uniform1f(uniforms.Focus,focus);
      gl.uniform1f(uniforms.HideMonitorLogo,focus>0?1:0);
      gl.uniform3f(uniforms.ChairPose,chair.angle,chair.x,chair.z);
      gl.uniform3f(uniforms.Accent,...room.rgb);
      gl.uniform3f(uniforms.Return,...cableReturnColor(room.rgb));
      gl.uniform3f(uniforms.CablePivot,...room.center);
      const signal=network?.links.find(l=>l.id===room.id)||{outbound:-100,inbound:-100,roomBlink:0};
      gl.uniform2f(uniforms.Pulses,signal.outbound,signal.inbound);
      gl.uniform1f(uniforms.RoomBlink,signal.roomBlink);
      if(cable)place(cable,[0,0,0],4);
      place(body,room.center,0,1,pose,pose.glow*.08);
      if(room.id==='particles'&&active&&!bloomCapture){
        const mode=state.particleMode,t=reduced?0:time;
        const blend=reduced||!initialized?1:1-Math.exp(-dt*7);
        for(let i=0;i<particleCount;i++){
          const p=particlePosition(i,particleCount,mode,t,state.strength);
          for(let j=0;j<3;j++)positions[i*3+j]+=(p[j]-positions[i*3+j])*blend;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER,points.positionBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,positions);
        initialized=true;previousMode=mode;
      }
    }
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }
  function drawMonitor({target,viewport,state,seq,pointer,time,reduced,width,height}){
    if(!viewport)return;
    const room=ROOMS.find(r=>r.id===target);if(!room||target==='gallery')return;
    const dpr=width/innerWidth,r=viewport,c=r.clip;
    const x=Math.round(r.left*dpr),y=height-Math.round((r.top+r.height)*dpr),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    const cx=Math.ceil(c.left*dpr),cy=height-Math.floor((c.top+c.height)*dpr),cw=Math.floor((c.left+c.width)*dpr)-cx,ch=Math.floor((c.top+c.height)*dpr)-Math.ceil(c.top*dpr);
    if(cw<=0||ch<=0)return;
    gl.enable(gl.SCISSOR_TEST);gl.scissor(cx,cy,cw,ch);gl.viewport(x,y,w,h);
    gl.clearColor(.035,.05,.10,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
    gl.uniform1i(uniforms.BloomCapture,0);
    gl.uniform1f(uniforms.RoomBlink,0);
    const aspect=w/h,span=Math.max(3.8,5.4/aspect),half=span/2;
    const view=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-8,1]);
    const projection=new Float32Array([1/(half*aspect),0,0,0,0,1/half,0,0,0,0,-2/100,0,0,0,-1,1]);
    gl.uniformMatrix4fv(uniforms.View,false,view);gl.uniformMatrix4fv(uniforms.Proj,false,projection);
    gl.uniform3f(uniforms.Eye,0,0,8);gl.uniform3f(uniforms.Accent,...room.rgb);
    gl.uniform1f(uniforms.Focus,0);gl.uniform3f(uniforms.ChairPose,0,0,0);
    gl.uniform1f(uniforms.HideMonitorLogo,0);
    gl.uniform2f(uniforms.Pose,0,1);gl.uniform3f(uniforms.Offset,0,0,0);
    gl.uniform2f(uniforms.Pointer,...pointer);gl.uniform1f(uniforms.Strength,state.strength);
    gl.uniform1f(uniforms.PointSize,dpr*(innerWidth<700?2.6:3));
    gl.uniform1f(uniforms.Time,reduced?0:time);gl.uniform1f(uniforms.Deform,state.deformation);
    gl.uniform1f(uniforms.Hue,state.hue);gl.uniform1i(uniforms.Material,['chrome','hologram','wire'].indexOf(state.material));
    gl.uniform1f(uniforms.Glow,0);gl.uniform1f(uniforms.Scale,1);
    if(target==='particles'){
      gl.uniform1i(uniforms.Kind,2);gl.bindVertexArray(points.vao);gl.drawArrays(gl.POINTS,0,points.count);
    }else if(target==='materials'){
      gl.uniform1i(uniforms.Kind,1);gl.bindVertexArray(ball.vao);gl.drawArrays(gl.TRIANGLES,0,ball.count);
    }else{
      gl.uniform1i(uniforms.Kind,0);gl.bindVertexArray(bar.vao);
      for(let i=0;i<12;i++){
        gl.uniform3f(uniforms.Offset,-1.9+i*.34,-.9,0);
        gl.uniform1f(uniforms.Scale,.35+(!reduced?seq.pulse():0)*(.4+(i*7%11)/7));
        gl.drawArrays(gl.TRIANGLES,0,bar.count);
      }
    }
    gl.bindVertexArray(null);gl.disable(gl.SCISSOR_TEST);gl.viewport(0,0,width,height);
  }
  return{draw,drawMonitor,updateCables,get particleCount(){return particleCount},get particleMode(){return previousMode},dispose(){for(const b of buffers)gl.deleteBuffer(b);for(const vao of vaos)gl.deleteVertexArray(vao);gl.deleteProgram(program)}};
}
function viewEye(m){
  // Inverse rigid camera transform, needed for real view-dependent reflections.
  return [0,1,2].map(i=>-(m[i*4]*m[12]+m[i*4+1]*m[13]+m[i*4+2]*m[14]));
}
