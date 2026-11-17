/** Conservative capsule/solid queries. Expanded boxes include the cable radius. */
export function boxCollider(center,size,id,extra={}){
  return {id,min:center.map((v,j)=>v-size[j]/2),max:center.map((v,j)=>v+size[j]/2),...extra};
}
/** Allocation-free slab predicate for visibility/constraints that need no normal. */
export function segmentIntersects(a,b,box,radius=0){
  let enter=0,exit=1,inside=true,axis=false;
  for(let j=0;j<3;j++){
    const lo=box.min[j]-radius,hi=box.max[j]+radius,aa=a[j],bb=b[j],d=bb-aa;
    if(Math.max(aa,bb)<=lo||Math.min(aa,bb)>=hi)return false;
    if(aa<=lo||aa>=hi)inside=false;
    if(Math.abs(d)<1e-12)continue;
    let t=(lo-aa)/d,u=(hi-aa)/d;
    if(t>u){const swap=t;t=u;u=swap}
    if(t>enter){enter=t;axis=true}
    exit=Math.min(exit,u);if(enter>exit+1e-10)return false;
  }
  return exit>=0&&enter<=1&&exit-enter>=1e-9&&(inside||axis);
}
export function segmentBoxHit(a,b,box,radius=0){
  if(Math.max(a[0],b[0])<=box.min[0]-radius||Math.min(a[0],b[0])>=box.max[0]+radius||
     Math.max(a[1],b[1])<=box.min[1]-radius||Math.min(a[1],b[1])>=box.max[1]+radius||
     Math.max(a[2],b[2])<=box.min[2]-radius||Math.min(a[2],b[2])>=box.max[2]+radius)return null;
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
  return p[0]>box.min[0]-radius&&p[0]<box.max[0]+radius&&
    p[1]>box.min[1]-radius&&p[1]<box.max[1]+radius&&p[2]>box.min[2]-radius&&p[2]<box.max[2]+radius;
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
  let x0=box.min[0],x1=box.max[0],z0=box.min[2],z1=box.max[2];
  if(box.part==='chair'&&chair){
    const c=Math.cos(chair.angle),s=Math.sin(chair.angle),x=(x0+x1)/2+.85,z=(z0+z1)/2+.45,
      hx=(x1-x0)/2,hz=(z1-z0)/2,xx=c*x+s*z-.85+chair.x,zz=-s*x+c*z-.45+chair.z,
      dx=Math.abs(c)*hx+Math.abs(s)*hz,dz=Math.abs(s)*hx+Math.abs(c)*hz;
    x0=xx-dx;x1=xx+dx;z0=zz-dz;z1=zz+dz;
  }
  const scale=pose.scale,y= center[1]+pose.lift,
    a=[x0*scale+center[0],box.min[1]*scale+y,z0*scale+center[2]],
    b=[x1*scale+center[0],box.max[1]*scale+y,z1*scale+center[2]];
  return {...box,min:scale>=0?a:b,max:scale>=0?b:a};
}
export function roomColliders(mesh,id){
  return mesh.boxes.filter(b=>{
    const size=b.min.map((v,j)=>b.max[j]-v);
    return b.part!=='wall-sign'&&(Math.max(...size)>.30||b.part==='plant'||b.part==='lamp');
  }).map((b,i)=>({...b,id:`${id}:${i}`,owner:id}));
}
export function createCollisionWorld(initial=[]){
  let boxes=[],grid=new Map(),version=0,queryCache=new Map(),hasMotion=false,entries=new Map();
  const empty=[];
  const cell=1.25;
  const key=(x,y,z)=>x>=-65536&&x<65536&&y>=-65536&&y<65536&&z>=-65536&&z<65536
    ?((x+65536)*131072+y+65536)*131072+z+65536:`${x},${y},${z}`;
  function insert(b){
      const cells=[];
      const lo=b.min.map((v,j)=>Math.floor((Math.min(v,b.previous?.min[j]??v)-.25)/cell)),hi=b.max.map((v,j)=>Math.floor((Math.max(v,b.previous?.max[j]??v)+.25)/cell));
      for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
        const k=key(x,y,z);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(b);cells.push(k);
      }
      entries.set(b.id,{box:b,cells});
  }
  function set(next){
    boxes=next;grid=new Map();entries=new Map();queryCache.clear();version++;hasMotion=boxes.some(b=>b.previous);
    for(const b of boxes)insert(b);
  }
  /** Bodies are immutable between calls. Replace only changed entries, including
   * their old/current sweep cells. Public set() still supports full invalidation. */
  function update(next){
    const ids=new Set(next.map(b=>b.id));
    if(ids.size!==next.length||entries.size!==boxes.length){set(next);return}
    const changes=next.filter(b=>entries.get(b.id)?.box!==b);
    const removed=[...entries.keys()].filter(id=>!ids.has(id));
    if(!changes.length&&!removed.length)return;
    for(const id of [...removed,...changes.map(b=>b.id)]){
      const entry=entries.get(id);if(!entry)continue;
      for(const k of entry.cells){
        const bucket=grid.get(k),index=bucket.indexOf(entry.box);
        if(index>=0)bucket.splice(index,1);
        if(!bucket.length)grid.delete(k);
      }
      entries.delete(id);
    }
    for(const b of changes)insert(b);
    boxes=next;hasMotion=boxes.some(b=>b.previous);queryCache.clear();version++;
  }
  function query(min,max){
    return candidates(min[0],min[1],min[2],max[0],max[1],max[2]);
  }
  // Cache cell unions, never exact query answers; narrow phase still tests solids.
  function candidates(x0,y0,z0,x1,y1,z1){
    const x=Math.floor(x0/cell),y=Math.floor(y0/cell),z=Math.floor(z0/cell),
      xx=Math.floor(x1/cell),yy=Math.floor(y1/cell),zz=Math.floor(z1/cell);
    const base=key(x,y,z);
    if(x===xx&&y===yy&&z===zz)return grid.get(base)||empty;
    const lo=[x,y,z],hi=[xx,yy,zz],min=[x0,y0,z0],max=[x1,y1,z1];
    if((hi[0]-lo[0]+1)*(hi[1]-lo[1]+1)*(hi[2]-lo[2]+1)>160)return boxes.filter(b=>b.min.every((v,j)=>Math.min(v,b.previous?.min[j]??v)<=max[j]&&Math.max(b.max[j],b.previous?.max[j]??b.max[j])>=min[j]));
    const compact=xx-x<=1&&yy-y<=1&&zz-z<=1,slot=(xx-x)*4+(yy-y)*2+zz-z;
    const cacheKey=compact?base:`${lo}:${hi}`;
    let cache=queryCache.get(cacheKey);
    if(cache?.[compact?slot:0])return cache[compact?slot:0];
    const found=new Set();
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)for(const b of grid.get(key(x,y,z))||[])found.add(b);
    const result=[...found];if(queryCache.size>4096)queryCache.clear();
    if(!cache){cache=[];queryCache.set(cacheKey,cache)}cache[compact?slot:0]=result;return result;
  }
  function segmentHit(a,b,radius=0,exemption){
    let closest=null;
    for(const box of candidates(Math.min(a[0],b[0])-radius,Math.min(a[1],b[1])-radius,Math.min(a[2],b[2])-radius,
      Math.max(a[0],b[0])+radius,Math.max(a[1],b[1])+radius,Math.max(a[2],b[2])+radius)){
      if(exemption?.ids.has(box.id)&&Math.hypot(...a.map((v,j)=>v-exemption.near[j]))<=exemption.length&&Math.hypot(...b.map((v,j)=>v-exemption.near[j]))<=exemption.length)continue;
      const hit=segmentBoxHit(a,b,box,radius);
      if(hit&&(!closest||hit.t<closest.t))closest=hit;
    }
    return closest;
  }
  function segmentClear(a,b,radius=0){
    const nearby=candidates(Math.min(a[0],b[0])-radius,Math.min(a[1],b[1])-radius,Math.min(a[2],b[2])-radius,
      Math.max(a[0],b[0])+radius,Math.max(a[1],b[1])+radius,Math.max(a[2],b[2])+radius);
    for(const box of nearby)if(segmentIntersects(a,b,box,radius))return false;
    return true;
  }
  function bendClear(a,p,b,radius){
    const nearby=candidates(Math.min(a[0],p[0],b[0])-radius,Math.min(a[1],p[1],b[1])-radius,Math.min(a[2],p[2],b[2])-radius,
      Math.max(a[0],p[0],b[0])+radius,Math.max(a[1],p[1],b[1])+radius,Math.max(a[2],p[2],b[2])+radius);
    for(const box of nearby)if(segmentIntersects(a,p,box,radius)||segmentIntersects(p,b,box,radius))return false;
    return true;
  }
  function project(p,previous,radius){
    const seed=[...p];seed[1]=Math.max(-.60+radius,seed[1]);
    const candidates=query(previous.map((v,j)=>Math.min(v,seed[j])-radius),previous.map((v,j)=>Math.max(v,seed[j])+radius));
    for(const box of candidates){
      const old=box.previous||box;
      if(Math.max(previous[0],seed[0])<Math.min(box.min[0],old.min[0])-radius||Math.min(previous[0],seed[0])>Math.max(box.max[0],old.max[0])+radius||
        Math.max(previous[1],seed[1])<Math.min(box.min[1],old.min[1])-radius||Math.min(previous[1],seed[1])>Math.max(box.max[1],old.max[1])+radius||
        Math.max(previous[2],seed[2])<Math.min(box.min[2],old.min[2])-radius||Math.min(previous[2],seed[2])>Math.max(box.max[2],old.max[2])+radius)continue;
      const hit=sweptPointHit(previous,seed,box,radius);
      if(!hit)continue;
      for(let j=0;j<3;j++)if(hit.normal[j])seed[j]=hit.normal[j]<0?box.min[j]-radius-.003:box.max[j]+radius+.003;
    }
    if(!query(seed,seed).some(b=>pointInside(seed,b,radius)))return seed;
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
    const pointSpeed=Math.max(Math.hypot(a[0]-previousA[0],a[1]-previousA[1],a[2]-previousA[2]),Math.hypot(b[0]-previousB[0],b[1]-previousB[1],b[2]-previousB[2]));
    if(!hasMotion&&pointSpeed<1e-8)return null;
    const min=a.map((v,j)=>Math.min(v,b[j],previousA[j],previousB[j])-radius),max=a.map((v,j)=>Math.max(v,b[j],previousA[j],previousB[j])+radius);
    for(const box of query(min,max)){
      if(pointSpeed<1e-8&&!box.previous)continue;
      const old=box.previous||box;
      if(min[0]>Math.max(box.max[0],old.max[0])||max[0]<Math.min(box.min[0],old.min[0])||
        min[1]>Math.max(box.max[1],old.max[1])||max[1]<Math.min(box.min[1],old.min[1])||
        min[2]>Math.max(box.max[2],old.max[2])||max[2]<Math.min(box.min[2],old.min[2]))continue;
      const speed=pointSpeed+(box.previous?Math.max(
        Math.hypot(box.min[0]-old.min[0],box.min[1]-old.min[1],box.min[2]-old.min[2]),
        Math.hypot(box.max[0]-old.max[0],box.max[1]-old.max[1],box.max[2]-old.max[2])):0);
      if(speed<1e-8)continue;
      const mix=(a,b,t)=>a.map((v,j)=>v+(b[j]-v)*t);
      function search(lo,hi,depth){
        const t=(lo+hi)/2,mid={...box,min:mix(old.min,box.min,t),max:mix(old.max,box.max,t)};
        const aa=mix(previousA,a,t),bb=mix(previousB,b,t);
        if(!segmentIntersects(aa,bb,mid,radius+speed*(hi-lo)/2))return null;
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
  return {set,update,query,segmentHit,segmentClear,bendClear,sweptSegment,project,get moving(){return hasMotion},get boxes(){return boxes},get version(){return version}};
}
