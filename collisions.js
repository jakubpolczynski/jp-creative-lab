/** Conservative capsule/solid queries. Expanded boxes include the cable radius. */
export function boxCollider(center,size,id,extra={}){
  return {id,min:center.map((v,j)=>v-size[j]/2),max:center.map((v,j)=>v+size[j]/2),...extra};
}
export function segmentBoxHit(a,b,box,radius=0){
  let enter=0,exit=1,axis=-1,sign=0,inside=true;
  for(let j=0;j<3;j++){
    const lo=box.min[j]-radius,hi=box.max[j]+radius,d=b[j]-a[j];
    if(a[j]<=lo||a[j]>=hi)inside=false;
    if(Math.abs(d)<1e-12){if(a[j]<=lo||a[j]>=hi)return null;continue}
    let t=(lo-a[j])/d,u=(hi-a[j])/d,n=-1;
    if(t>u){[t,u]=[u,t];n=1}
    if(t>enter){enter=t;axis=j;sign=n}
    exit=Math.min(exit,u);
    if(enter>exit+1e-10)return null;
  }
  if(exit<0||enter>1||exit-enter<1e-9)return null;
  const normal=[0,0,0];
  if(inside){
    let depth=Infinity;
    for(let j=0;j<3;j++)for(const n of [-1,1]){
      const d=n<0?a[j]-box.min[j]+radius:box.max[j]+radius-a[j];
      if(d<depth){depth=d;axis=j;sign=n}
    }
    normal[axis]=sign;return {t:0,exit:Math.min(1,exit),normal,inside:true,depth,collider:box};
  }
  if(axis<0)return null;
  normal[axis]=sign;return {t:Math.max(0,enter),exit:Math.min(1,exit),normal,inside:false,depth:0,collider:box};
}
export function pointInside(p,box,radius=0){
  return p.every((v,j)=>v>box.min[j]-radius&&v<box.max[j]+radius);
}
/** Exact entry interval of a moving point against linearly moving AABB faces. */
export function sweptPointHit(previous,p,box,radius=0){
  const old=box.previous||box;
  if(pointInside(previous,old,radius))return null;
  let enter=0,exit=1,normal=[0,0,0];
  for(let j=0;j<3;j++)for(const side of [-1,1]){
    const start=side<0?previous[j]-old.min[j]+radius:old.max[j]+radius-previous[j];
    const end=side<0?p[j]-box.min[j]+radius:box.max[j]+radius-p[j];
    const slope=end-start;
    if(Math.abs(slope)<1e-12){if(start<0)return null;continue}
    const t=-start/slope;
    if(slope>0){if(t>enter){enter=t;normal=[0,0,0];normal[j]=side}}
    else exit=Math.min(exit,t);
    if(enter>exit)return null;
  }
  return enter>=0&&enter<=1&&exit>=enter&&normal.some(Boolean)?{time:enter,normal,collider:box}:null;
}
export function transformBox(box,center,pose={lift:0,scale:1},chair){
  const corners=Array.from({length:8},(_,i)=>box.min.map((v,j)=>i&(1<<j)?box.max[j]:v));
  if(box.part==='chair'&&chair)for(const p of corners){
    const x=p[0]+.85,z=p[2]+.45,c=Math.cos(chair.angle),s=Math.sin(chair.angle);
    p[0]=c*x+s*z-.85+chair.x;p[2]=-s*x+c*z-.45+chair.z;
  }
  for(const p of corners)for(let j=0;j<3;j++)p[j]=p[j]*pose.scale+center[j]+(j===1?pose.lift:0);
  return {...box,min:[0,1,2].map(j=>Math.min(...corners.map(p=>p[j]))),max:[0,1,2].map(j=>Math.max(...corners.map(p=>p[j])))};
}
export function roomColliders(mesh,id){
  return mesh.boxes.filter(b=>{
    const size=b.min.map((v,j)=>b.max[j]-v);
    return b.part!=='wall-sign'&&(Math.max(...size)>.30||b.part==='plant'||b.part==='lamp');
  }).map((b,i)=>({...b,id:`${id}:${i}`,owner:id}));
}
export function createCollisionWorld(initial=[]){
  let boxes=[],grid=new Map(),version=0;
  const cell=2.5,key=(x,y,z)=>`${x},${y},${z}`;
  function set(next){
    boxes=next;grid=new Map();version++;
    for(const b of boxes){
      const lo=b.min.map((v,j)=>Math.floor((Math.min(v,b.previous?.min[j]??v)-.25)/cell)),hi=b.max.map((v,j)=>Math.floor((Math.max(v,b.previous?.max[j]??v)+.25)/cell));
      for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
        const k=key(x,y,z);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(b);
      }
    }
  }
  function query(min,max){
    const lo=min.map(v=>Math.floor(v/cell)),hi=max.map(v=>Math.floor(v/cell));
    if((hi[0]-lo[0]+1)*(hi[1]-lo[1]+1)*(hi[2]-lo[2]+1)>160)return boxes.filter(b=>b.min.every((v,j)=>Math.min(v,b.previous?.min[j]??v)<=max[j]&&Math.max(b.max[j],b.previous?.max[j]??b.max[j])>=min[j]));
    const found=new Set();
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)for(const b of grid.get(key(x,y,z))||[])found.add(b);
    return [...found];
  }
  function segmentHit(a,b,radius=0,exemption){
    const min=a.map((v,j)=>Math.min(v,b[j])-radius),max=a.map((v,j)=>Math.max(v,b[j])+radius);
    let closest=null;
    for(const box of query(min,max)){
      if(exemption?.ids.has(box.id)&&Math.hypot(...a.map((v,j)=>v-exemption.near[j]))<=exemption.length&&Math.hypot(...b.map((v,j)=>v-exemption.near[j]))<=exemption.length)continue;
      const hit=segmentBoxHit(a,b,box,radius);
      if(hit&&(!closest||hit.t<closest.t))closest=hit;
    }
    return closest;
  }
  function project(p,previous,radius){
    const seed=[...p];seed[1]=Math.max(-.60+radius,seed[1]);
    const candidates=query(previous.map((v,j)=>Math.min(v,seed[j])-radius),previous.map((v,j)=>Math.max(v,seed[j])+radius));
    for(const box of candidates){
      const hit=sweptPointHit(previous,seed,box,radius);
      if(!hit)continue;
      for(let j=0;j<3;j++)if(hit.normal[j])seed[j]=hit.normal[j]<0?box.min[j]-radius-.003:box.max[j]+radius+.003;
    }
    const queue=[seed],seen=new Set();
    // Overlapping solids (e.g. a chair arm meeting its back) require escaping
    // their UNION. Repeated nearest-face projection can ping-pong inside both.
    for(let visit=0;visit<96&&queue.length;visit++){
      queue.sort((a,b)=>a.reduce((s,v,j)=>s+(v-seed[j])**2,0)-b.reduce((s,v,j)=>s+(v-seed[j])**2,0));
      const result=queue.shift(),key=result.map(v=>v.toFixed(5)).join(',');
      if(seen.has(key))continue;seen.add(key);
      const box=query(result,result).find(b=>pointInside(result,b,radius));
      if(!box)return result;
      for(let j=0;j<3;j++)for(const side of [-1,1]){
        const next=[...result];next[j]=side<0?box.min[j]-radius-.003:box.max[j]+radius+.003;
        next[1]=Math.max(-.60+radius,next[1]);queue.push(next);
      }
    }
    // Above all queried solids is always free; this is a last-resort recovery
    // for multiply-overlapping decorative boxes, not a route or owner exemption.
    seed[1]=Math.max(seed[1],...boxes.map(b=>b.max[1]+radius+.01));return seed;
  }
  function sweptSegment(previousA,previousB,a,b,radius){
    const min=a.map((v,j)=>Math.min(v,b[j],previousA[j],previousB[j])-radius),max=a.map((v,j)=>Math.max(v,b[j],previousA[j],previousB[j])+radius);
    for(const box of query(min,max)){
      const old=box.previous||box;
      const speed=Math.max(Math.hypot(...a.map((v,j)=>v-previousA[j])),Math.hypot(...b.map((v,j)=>v-previousB[j])))+
        Math.max(Math.hypot(...box.min.map((v,j)=>v-old.min[j])),Math.hypot(...box.max.map((v,j)=>v-old.max[j])));
      if(speed<1e-8)continue;
      const mix=(a,b,t)=>a.map((v,j)=>v+(b[j]-v)*t);
      function search(lo,hi,depth){
        const t=(lo+hi)/2,mid={...box,min:mix(old.min,box.min,t),max:mix(old.max,box.max,t)};
        const aa=mix(previousA,a,t),bb=mix(previousB,b,t);
        const hit=segmentBoxHit(aa,bb,mid,radius+speed*(hi-lo)/2);
        if(!hit)return null;
        const confirmed=segmentBoxHit(aa,bb,mid,radius);
        // Conservative temporal inflation only rejects empty time intervals.
        // Respond at an INTERIOR point of a confirmed real-radius overlap.
        if(confirmed)return {time:t,along:(confirmed.t+confirmed.exit)/2,collider:box};
        if(depth===0)return null;
        return search(lo,t,depth-1)||search(t,hi,depth-1);
      }
      if(segmentBoxHit(previousA,previousB,old,radius))continue;
      const hit=search(0,1,24);
      if(hit)return hit;
    }
    return null;
  }
  set(initial);
  return {set,query,segmentHit,sweptSegment,project,get boxes(){return boxes},get version(){return version}};
}
