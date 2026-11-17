import {meshBuilder} from './room-world.js';
import {CABLE_STYLE} from './cables.js';
const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const cube=meshBuilder();cube.box(0,0,0,1,1,1,[0,0,0]);
/** Refill typed storage; no per-triangle builder objects or GPU-side copies. */
export function buildCableTube(rope,previous){
  const count=(rope.points.length-1)*36+72,size=count*3;
  const m=previous?.positions.length===size?previous:{
    positions:new Float32Array(size),normals:new Float32Array(size),
    colors:new Float32Array(size),cable:new Float32Array(size),rings:new Float64Array(rope.points.length*18),
  };
  const rings=m.rings;
  for(let i=0;i<rope.points.length;i++){
    const p=rope.points[i],a=rope.points[Math.max(0,i-1)],b=rope.points[Math.min(rope.points.length-1,i+1)];
    const tangent=normalize([b[0]-a[0],b[1]-a[1],b[2]-a[2]]),
      u=normalize(cross(tangent,Math.abs(tangent[1])<.9?[0,1,0]:[0,0,1])),v=cross(tangent,u);
    for(let side=0;side<6;side++)for(let j=0;j<3;j++)rings[i*18+side*3+j]=p[j]+.085*(u[j]*Math.cos(side/6*Math.PI*2)+v[j]*Math.sin(side/6*Math.PI*2));
  }
  let cursor=0;
  function triangle(a,b,c,da,db,dc){
    const ux=rings[b]-rings[a],uy=rings[b+1]-rings[a+1],uz=rings[b+2]-rings[a+2],
      vx=rings[c]-rings[a],vy=rings[c+1]-rings[a+1],vz=rings[c+2]-rings[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,n=Math.hypot(nx,ny,nz)||1;
    for(let vertex=0;vertex<3;vertex++){
      const source=vertex===0?a:vertex===1?b:c;
      for(let j=0;j<3;j++){
        m.positions[cursor+j]=rings[source+j];m.normals[cursor+j]=(j===0?nx:j===1?ny:nz)/n;
        m.colors[cursor+j]=CABLE_STYLE.casing[j];m.cable[cursor+j]=j===0?(vertex===0?da:vertex===1?db:dc):0;
      }
      cursor+=3;
    }
  }
  for(let i=1;i<rope.points.length;i++)for(let side=0;side<6;side++){
    const next=(side+1)%6,a=(i-1)*18+side*3,b=i*18+side*3,c=(i-1)*18+next*3,d=i*18+next*3,
      da=rope.distances[i-1],db=rope.distances[i];
    triangle(a,b,c,da,db,da);triangle(c,b,d,da,db,db);
  }
  for(let end=0;end<2;end++){
    const p=end?rope.points.at(-1):rope.points[0],dims=end?[.16,.13,.23]:[.19,.23,.32],color=end?[28/255,53/255,69/255]:[20/255,45/255,37/255];
    for(let k=0;k<108;k++,cursor++){
      const j=k%3;m.positions[cursor]=p[j]+cube.positions[k]*dims[j]+(!end&&j===0?.06:0);
      m.normals[cursor]=cube.normals[k];m.colors[cursor]=color[j];m.cable[cursor]=j===0?(end?rope.length:0):0;
    }
  }
  return m;
}
