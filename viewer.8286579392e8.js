/**
 * JP Creative Lab / Voxel 3D prototype.
 * A real GLB mesh displayed with a dependency-free WebGL2 renderer.
 * Fixed orthographic camera: intentionally no interactions, scroll, orbit or animation.
 */
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
uniform mat4 uView,uProj;
out vec3 vNormal;out vec4 vColor;out vec3 vWorld;
void main(){vNormal=aNormal;vColor=aColor;vWorld=aPos;gl_Position=uProj*uView*vec4(aPos,1.0);}
`;
const meshFrag=`#version 300 es
precision highp float;
in vec3 vNormal;in vec4 vColor;in vec3 vWorld;
uniform int uEmissionOnly;
uniform bool uBloomCapture;
out vec4 fragColor;
void main(){
  vec3 c=vColor.rgb;
  if(uEmissionOnly==1){
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
 const resp=await fetch('/room-server.f22674c93f15.glb',{cache:'no-cache'});
 if(!resp.ok)throw Error('3D model not found: '+resp.status);
 const {doc,binary}=parseGLB(await resp.arrayBuffer());
 const geometry=createGeometry(gl,doc,binary);
 const meshProgram=makeProgram(gl,meshVert,meshFrag);
 const bloomProgram=makeProgram(gl,quadVert,quadFrag);
 const meshUniforms={view:gl.getUniformLocation(meshProgram,'uView'),proj:gl.getUniformLocation(meshProgram,'uProj'),emit:gl.getUniformLocation(meshProgram,'uEmissionOnly')};
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
 // This scene has intentionally no event handlers except viewport resize/context recovery.
 let bloom=null;
 function resizeAndRender(){
   const cssWidth=canvas.clientWidth,cssHeight=canvas.clientHeight;
   if(!cssWidth||!cssHeight)return;
   const dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.5:2);
   const width=Math.max(1,Math.round(cssWidth*dpr)),height=Math.max(1,Math.round(cssHeight*dpr));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   const aspect=width/height;
   // Camera keeps the entire model in frame in portrait and landscape.
   const framing=window.innerWidth<700?1.16:1.105;
   const orthoHeight=Math.max(worldHeight*framing,worldWidth*framing/aspect);
   const projection=ortho(-orthoHeight*aspect/2,orthoHeight*aspect/2,-orthoHeight/2,orthoHeight/2,.01,200);
   if(bloom){gl.deleteTexture(bloom.tex);gl.deleteFramebuffer(bloom.framebuffer);gl.deleteRenderbuffer(bloom.depth);}
   bloom=createBloom(gl,Math.max(4,Math.floor(width/4)),Math.max(4,Math.floor(height/4)));
   gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.useProgram(meshProgram);gl.uniformMatrix4fv(meshUniforms.view,false,view);gl.uniformMatrix4fv(meshUniforms.proj,false,projection);
   // Main render: full physical mesh, 2 separated glTF surface categories.
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   for(const g of geometry){gl.bindVertexArray(g.vao);gl.uniform1i(meshUniforms.emit,g.emission?1:0);gl.drawElements(gl.TRIANGLES,g.count,g.indexType,0);}
   gl.bindVertexArray(null);
   // Small blur pass on emissive mesh only, to simulate physical neon light.
   gl.bindFramebuffer(gl.FRAMEBUFFER,bloom.framebuffer);gl.viewport(0,0,bloom.width,bloom.height);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.uniform1i(meshUniforms.emit,1);
   for(const g of geometry){if(!g.emission)continue;gl.bindVertexArray(g.vao);gl.drawElements(gl.TRIANGLES,g.count,g.indexType,0);}
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
 canvas.addEventListener('webglcontextlost', event => {
   event.preventDefault();
   fallback.textContent = 'Utracono połączenie z kartą graficzną. Odśwież stronę, aby ponownie uruchomić scenę.';
   fallback.hidden = false;
 });
 window.addEventListener('resize',resizeAndRender,{passive:true});
 resizeAndRender();
}