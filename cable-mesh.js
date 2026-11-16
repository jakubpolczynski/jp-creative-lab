import {meshBuilder} from './room-world.js';
import {CABLE_STYLE} from './cables.js';
const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/** Rings lie inside endpoint balls, so interpolation cannot cut outside the safe capsule. */
export function buildCableTube(rope){
  const m=meshBuilder(),sides=6,rings=rope.points.map((p,i)=>{
    const a=rope.points[Math.max(0,i-1)],b=rope.points[Math.min(rope.points.length-1,i+1)];
    const tangent=normalize(b.map((v,j)=>v-a[j])),u=normalize(cross(tangent,Math.abs(tangent[1])<.9?[0,1,0]:[0,0,1])),v=cross(tangent,u);
    return Array.from({length:sides},(_,n)=>p.map((x,j)=>x+.085*(u[j]*Math.cos(n/sides*Math.PI*2)+v[j]*Math.sin(n/sides*Math.PI*2))));
  });
  function triangle(vertices,arcs){
    const start=m.positions.length;
    m.triangle(...vertices,CABLE_STYLE.casing);
    for(let i=0;i<3;i++)m.cable[start+i*3]=arcs[i];
  }
  for(let i=1;i<rings.length;i++)for(let side=0;side<sides;side++){
    const next=(side+1)%sides,a=rope.distances[i-1],b=rope.distances[i];
    triangle([rings[i-1][side],rings[i][side],rings[i-1][next]],[a,b,a]);
    triangle([rings[i-1][next],rings[i][side],rings[i][next]],[a,b,b]);
  }
  const a=rope.points[0],b=rope.points.at(-1);
  m.box(a[0]+.06,a[1],a[2],.19,.23,.32,[20/255,45/255,37/255],{signal:true,distance:()=>0});
  m.box(...b,.16,.13,.23,[28/255,53/255,69/255],{signal:true,distance:()=>rope.length});
  return m;
}
