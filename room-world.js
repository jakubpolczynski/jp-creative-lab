/** Small procedural voxel builder. No mutation or regeneration of the shipped GLB. */
import {LAB_MONITOR} from './rooms.js';
export function meshBuilder(){
  const positions=[],normals=[],colors=[],cable=[],boxes=[];
  let partName='structure';
  function triangle(a,b,c,color,meta={}){
    const u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const len=Math.hypot(...n)||1;
    for(const p of [a,b,c]){
      positions.push(...p);normals.push(...n.map(x=>x/len));colors.push(...color);
      const distance=meta.distance?meta.distance(p):0,attachment=meta.attachment?meta.attachment(distance):{room:0,rack:0};
      cable.push(meta.signal?distance:-100,attachment.room,attachment.rack);
    }
  }
  function box(x,y,z,w,h,d,color,meta={}){
    boxes.push({min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2],part:partName});
    const p=Array.from({length:8},(_,i)=>[x+(i&1?w:-w)/2,y+(i&2?h:-h)/2,z+(i&4?d:-d)/2]);
    for(const [face,[a,b,c,e]] of [[0,4,6,2],[1,3,7,5],[0,1,5,4],[2,6,7,3],[0,2,3,1],[4,5,7,6]].entries()){
      if(meta.omitFaces?.includes(face))continue;
      triangle(p[a],p[b],p[c],color,meta);triangle(p[a],p[c],p[e],color,meta);
    }
  }
  return{positions,normals,colors,cable,boxes,box,triangle,setPart(name){partName=name}};
}
const glyphs={
  A:['01110','10001','11111','10001','10001'],S:['01111','10000','01110','00001','11110'],
  C:['01111','10000','10000','10000','01111'],I:['11111','00100','00100','00100','11111'],
  R:['11110','10001','11110','10100','10010'],T:['11111','00100','00100','00100','00100'],
  J:['00111','00010','00010','10010','01100'],P:['11110','10001','11110','10000','10000'],
  V:['10001','10001','10001','01010','00100'],U:['10001','10001','10001','10001','01110'],
  L:['10000','10000','10000','10000','11111'],M:['10001','11011','10101','10001','10001'],
  G:['01111','10000','10111','10001','01111'],N:['10001','11001','10101','10011','10001'],
  E:['11111','10000','11110','10000','11111'],O:['01110','10001','10001','10001','01110'],
  H:['10001','10001','11111','10001','10001'],D:['11110','10001','10001','10001','11110'],
  B:['11110','10001','11110','10001','11110'],
};
export const ROOM_SIGNS={monitor:['ASCI','ART'],gallery:['PROJECT','VAULT'],particles:['MATTER','LAB'],materials:['SHADER','LAB'],sound:['SIGNAL','ROOM']};
/** The new workstations face +X, just like the original computer. */
export function workstationScreen(room){
  const {center:[x,y,z],width,height}=LAB_MONITOR;
  return [[x,y-height/2,z-width/2],[x,y-height/2,z+width/2],[x,y+height/2,z+width/2],[x,y+height/2,z-width/2]]
    .map(p=>p.map((v,i)=>v+room.center[i]));
}
function pixelText(box,text,y,z,color){
  const step=Math.min(.21,5.45/(text.length*6-1)),width=(text.length*6-1)*step;
  [...text].forEach((ch,k)=>glyphs[ch].forEach((row,j)=>[...row].forEach((v,i)=>{
    if(v==='1')box(-width/2+(k*6+i+.5)*step,y+(2-j)*step,z,step*.87,step*.87,.055,color);
  })));
}
function workstation(b,accent,part){
  const dark=[.13,.17,.30],steel=[.29,.36,.52];
  part('desk',()=>{
    b(-2.2,1.12,-.1,1.20,.14,3.25,[.74,.42,.32]);
    b(-2.2,1.21,-.1,1.26,.07,3.30,[.85,.51,.36]);
    for(const x of [-2.65,-2.4,-2.1,-1.8])b(x,1.25,-.1,.014,.008,3.1,[.9,.58,.4]);
    for(const x of [-2.62,-1.78])for(const z of [-1.48,1.28])b(x,.58,z,.12,1,.12,steel);
    b(-2.18,.58,1.13,1.04,1,.46,dark);
    for(const y of [.40,.76]){b(-1.64,y,1.13,.04,.29,.41,steel);b(-1.61,y,1.13,.03,.035,.2,[.70,.75,.9]);}
  });
  part('computer',()=>{
    b(-2.38,1.31,-.45,.37,.08,.50,dark);b(-2.40,1.51,-.45,.07,.42,.09,steel);
    b(-2.20,1.84,-.45,.24,.98,1.46,dark);
    b(-2.055,1.84,-.45,.05,.86,1.32,[.19,.24,.43]);
    b(-2.02,1.84,-.45,.025,.76,1.20,[.05,.09,.20]);
    ['J','P'].forEach((ch,k)=>glyphs[ch].forEach((row,y)=>[...row].forEach((v,x)=>{
      if(v==='1')b(-1.997,1.84+(2-y)*.064,-.12-(k*6+x)*.064,.025,.055,.055,accent);
    })));
    for(const y of [1.51,2.17])for(const z of [-.97,.07]){
      b(-1.99,y,z,.025,.025,.13,accent);b(-1.99,y+(y<1.8?.055:-.055),z,.025,.13,.025,accent);
    }
    b(-2.47,.47,-1.08,.42,.78,.57,dark);
    b(-2.24,.47,-1.08,.035,.62,.45,[.20,.26,.43]);b(-2.21,.69,-1.08,.025,.045,.24,accent);
  });
  part('keyboard',()=>{
    b(-1.82,1.30,-.32,.37,.07,.99,dark);
    for(let row=0;row<4;row++)for(let col=0;col<10;col++)b(-1.94+row*.075,1.35,-.75+col*.09,.049,.035,.06,[.48,.56,.75]);
    b(-1.63,1.35,-.32,.04,.035,.42,[.65,.72,.88]);
  });
  part('mouse',()=>{b(-1.81,1.31,-1.10,.18,.08,.23,dark);b(-1.79,1.36,-1.10,.025,.015,.04,accent)});
  part('chair',()=>{
    b(-.85,.76,-.45,.75,.18,.70,dark);b(-.54,1.16,-.45,.16,.86,.75,[.19,.23,.43]);
    b(-.85,.42,-.45,.12,.55,.12,steel);
    b(-.85,.17,-.45,.65,.07,.09,dark);b(-.85,.17,-.45,.09,.07,.64,dark);
    for(const x of [-1.13,-.57])for(const z of [-.72,-.18])b(x,.10,z,.13,.10,.13,dark);
    for(const z of [-.80,-.10])b(-.84,.96,z,.52,.08,.11,steel);
  });
  part('lamp',()=>{
  b(-2.20,1.34,1.10,.27,.12,.27,dark);b(-2.20,1.58,1.10,.33,.36,.33,[1,.75,.32]);
  b(-2.20,1.79,1.10,.37,.05,.37,[1,.88,.55]);
  });
  part('plant',()=>{
  b(-2.42,1.38,-1.50,.25,.25,.26,[.65,.63,.77]);
  for(const [x,y,z] of [[-2.42,1.64,-1.50],[-2.51,1.73,-1.5],[-2.35,1.81,-1.5]])b(x,y,z,.19,.20,.19,[.28,.70,.32]);
  });
}
export function buildRoom(room){
  const m=meshBuilder(),b=m.box,dark=[.16,.19,.34],wall=[.24,.25,.43],tile=[.29,.30,.48],accent=room.rgb;
  m.parts=[];
  function part(name,build,extra={}){
    const start=m.positions.length/3;m.setPart(name);build();m.setPart('structure');m.parts.push({name,start,count:m.positions.length/3-start,...extra});
  }
  b(0,-.25,0,6.4,.5,5.4,dark);
  b(0,-.02,0,6.42,.12,5.42,[.36,.40,.65]);
  for(let x=-3;x<=3;x++)for(let z=-2;z<=2;z++)b(x,.015,z,.94,.07,.94,tile);
  b(0,1.83,-2.55,6.4,3.5,.22,wall);
  b(-3.1,1.83,0,.22,3.5,5.2,wall);
  b(0,3.65,-2.55,6.55,.24,.30,[.55,.53,.85]);
  b(-3.1,3.65,0,.30,.24,5.45,[.58,.57,.87]);
  for(const z of [-2.55,2.55])b(-3.1,1.85,z,.31,3.65,.31,[.47,.48,.77]);
  b(3.1,1.85,-2.55,.31,3.65,.31,[.47,.48,.77]);
  b(-2.94,3.12,-.4,.12,.15,2.65,dark);b(-2.86,3.10,-.4,.04,.065,2.45,accent);
  b(0,.10,2.60,6.1,.08,.08,accent);
  b(-3.19,-.1,0,.07,.08,5.2,accent);
  // Same five-row raised alphabet and two-line dark sign as ASCI / ART.
  b(0,1.93,-2.40,5.91,3.04,.07,[.125,.145,.26]);
  part('wall-sign',()=>ROOM_SIGNS[room.id].forEach((line,i)=>pixelText(b,line,2.83-i*1.20,-2.34,accent)),{lines:ROOM_SIGNS[room.id]});
  workstation(b,accent,part);
  return m;
}
