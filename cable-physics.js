import {cableDistances} from './cables.js';
import {pointInside} from './collisions.js';
export const CABLE_RADIUS=.085;
const clearance=CABLE_RADIUS+.006,spacing=.42;
const distance=(a,b)=>Math.hypot(...a.map((v,j)=>v-b[j]));
const mix=(a,b,t)=>a.map((v,j)=>v+(b[j]-v)*t);
export function cableEndpoints(room,center=room.center,pose={lift:0,scale:1},server={lift:0,scale:1}){
  const port=room.port,rack=[-4.8,0,.05];
  return {
    a:port.map((v,j)=>rack[j]+(v-rack[j])*server.scale+(j===1?server.lift:0)),
    b:[-2.33,1.84,-.45].map((v,j)=>center[j]+v*pose.scale+(j===1?pose.lift:0)),
    tangentA:[1,0,0],tangentB:[-1,0,0],
    ports:{a:{owner:'rack'},b:{owner:room.id}},
  };
}
/** Visibility nodes are generated from the actual blocking solids, never room IDs. */
export function routeCable(a,b,world){
  if(!world.segmentHit(a,b,clearance))return [a,b];
  const nodes=[a,b],known=new Set(),edges=new Map(),blocked=new Map();
  for(let round=0;round<20;round++){
    const costs=new Float64Array(nodes.length).fill(Infinity),previous=new Int32Array(nodes.length).fill(-1),closed=new Set();
    costs[0]=0;blocked.clear();
    for(let visit=0;visit<nodes.length;visit++){
      let current=-1,best=Infinity;
      for(let i=0;i<nodes.length;i++)if(!closed.has(i)&&costs[i]+distance(nodes[i],b)<best){best=costs[i]+distance(nodes[i],b);current=i}
      if(current<0)break;
      if(current===1){
        const path=[];for(let i=1;i!==-1;i=previous[i])path.unshift(nodes[i]);return path;
      }
      closed.add(current);
      for(let j=0;j<nodes.length;j++){
        if(j===current||closed.has(j))continue;
        const key=current<j?`${current}:${j}`:`${j}:${current}`;
        let hit=edges.get(key);
        if(hit===undefined){hit=world.segmentHit(nodes[current],nodes[j],clearance)||false;edges.set(key,hit)}
        if(hit){blocked.set(hit.collider.id,hit.collider);continue}
        const cost=costs[current]+distance(nodes[current],nodes[j]);
        if(cost<costs[j]){costs[j]=cost;previous[j]=current}
      }
    }
    let added=0;
    for(const box of blocked.values()){
      if(known.has(box.id))continue;known.add(box.id);
      for(let i=0;i<8;i++){
        const p=box.min.map((v,j)=>i&(1<<j)?box.max[j]+clearance+.012:v-clearance-.012);
        if(p[1]<-.60+clearance)continue;
        const containing=world.query(p,p).filter(other=>pointInside(p,other,clearance));
        if(containing.length){for(const other of containing)if(!known.has(other.id))blocked.set(other.id,other);continue}
        nodes.push(p);added++;
      }
    }
    if(!added)break;
  }
  // A high free-space corridor is generated from scene bounds, not a hand-authored route.
  const height=Math.max(a[1],b[1],...world.boxes.map(box=>box.max[1]))+.4;
  const path=[a,[a[0],height,a[2]],[b[0],height,b[2]],b];
  if(path.slice(1).every((p,i)=>!world.segmentHit(path[i],p,clearance)))return path;
  throw Error('Cannot find a clear cable corridor '+JSON.stringify({a,b,insideA:world.query(a,a).filter(o=>pointInside(a,o,clearance)).map(o=>o.id),insideB:world.query(b,b).filter(o=>pointInside(b,o,clearance)).map(o=>o.id)}));
}
function samplePath(path){
  const out=[path[0]];
  for(let i=1;i<path.length;i++){
    const count=Math.max(1,Math.ceil(distance(path[i-1],path[i])/spacing));
    for(let n=1;n<=count;n++){
      const p=mix(path[i-1],path[i],n/count);
      if(n===count&&i<path.length-1)p.contact=true;
      out.push(p);
    }
  }
  return out;
}
function metrics(rope){
  rope.distances=cableDistances(rope.points);rope.length=rope.distances.at(-1);
  rope.bounds={min:[0,1,2].map(j=>Math.min(...rope.points.map(p=>p[j]))-clearance),max:[0,1,2].map(j=>Math.max(...rope.points.map(p=>p[j]))+clearance)};
}
function collars(e,world){
  const key=JSON.stringify([e.a,e.b,e.tangentA,e.tangentB]);
  if(e.collarCache?.world===world&&e.collarCache.version===world.version&&e.collarCache.key===key)return e.collarCache.value;
  const value={};
  for(const side of ['a','b']){
    const near=e[side],owner=e.ports?.[side]?.owner,tangent=side==='a'?e.tangentA:e.tangentB;
    // These are the actual socket faces, not every object overlapping the endpoint.
    const sockets=world.boxes.filter(b=>b.owner===owner&&owner&&pointInside(near,b,clearance)&&
      (side==='a'?Math.abs(b.max[0]-near[0])<.10:b.part==='computer'&&b.max[1]-b.min[1]>.8&&Math.abs(b.min[0]-near[0])<.04));
    const exemption={ids:new Set(sockets.map(b=>b.id)),near,length:.46};
    const wanted=near.map((v,j)=>v+tangent[j]*.40),hit=world.segmentHit(near,wanted,clearance,exemption);
    if(hit?.inside)throw Error('Cable socket intersects a foreign solid '+hit.collider.id);
    const length=hit?Math.max(.001,.40*hit.t-.004):.40;
    value[side]=near.map((v,j)=>v+tangent[j]*length);value[side+'Exemption']=exemption;
  }
  e.collarCache={world,version:world.version,key,value};return value;
}
function resetRest(rope){
  rope.previous=rope.points.map(p=>[...p]);
  rope.rest=rope.points.slice(1).map((p,i)=>Math.min(spacing,distance(p,rope.points[i])));
}
function pin(rope,e,world){
  const c=collars(e,world),n=rope.points.length;
  rope.points[0]=[...e.a];rope.points[1]=c.a;rope.points[n-2]=c.b;rope.points[n-1]=[...e.b];
}
function collarExemption(rope,index,world){
  const n=rope.points.length;
  if(index!==0&&index!==n-2)return undefined;
  const c=collars(rope.endpoints,world);
  return index===0?c.aExemption:c.bExemption;
}
/** Repair full segments; nodes alone cannot detect a thin wall between samples. */
function repair(rope,world){
  let changed=false;
  for(let i=0;i<rope.points.length-1;i++){
    const a=rope.points[i],b=rope.points[i+1],exemption=collarExemption(rope,i,world);
    if(!world.segmentHit(a,b,clearance,exemption))continue;
    if(i===0||i===rope.points.length-2)throw Error('Non-socket solid intersects cable collar '+world.segmentHit(a,b,clearance,exemption).collider.id);
    const route=samplePath(routeCable(a,b,world));
    rope.points.splice(i+1,0,...route.slice(1,-1));i+=route.length-2;changed=true;
  }
  if(changed)resetRest(rope);
  return changed;
}
export function createRope(endpoints,world){
  const c=collars(endpoints,world),path=routeCable(c.a,c.b,world);
  const rope={points:[[...endpoints.a],...samplePath(path),[...endpoints.b]],moving:true,quiet:0,lastEndpoints:endpoints,endpoints,version:0};
  resetRest(rope);metrics(rope);return rope;
}
export function stepRope(rope,seconds,endpoints,world,{reduced=false}={}){
  const endpointMotion=distance(endpoints.a,rope.lastEndpoints.a)+distance(endpoints.b,rope.lastEndpoints.b);
  const oldPoints=rope.points.map(p=>[...p]);
  rope.endpoints=endpoints;pin(rope,endpoints,world);
  if(endpointMotion>.0001){
    // Feed/reel material locally; retain the rest of the rope's physical state.
    for(let i=0;i<rope.rest.length;i++)rope.rest[i]=Math.max(.02,distance(rope.points[i],rope.points[i+1]));
    const inner=rope.points.slice(1,-1);
    if(inner.some((p,i)=>i&&distance(p,inner[i-1])>spacing*1.8)){
      rope.points=[rope.points[0],...samplePath(inner),rope.points.at(-1)];resetRest(rope);
    }
    rope.quiet=0;
  }
  {
    const oldDistances=cableDistances(oldPoints),newDistances=cableDistances(rope.points),oldLength=oldDistances.at(-1);
    let edge=1;
    const sweepPrevious=rope.points.map((p,i)=>{
      const arc=Math.min(oldLength,newDistances[i]);
      while(edge<oldPoints.length-1&&oldDistances[edge]<arc)edge++;
      return mix(oldPoints[edge-1],oldPoints[edge],(arc-oldDistances[edge-1])/(oldDistances[edge]-oldDistances[edge-1]||1));
    });
    sweepPrevious[0]=oldPoints[0];sweepPrevious[sweepPrevious.length-1]=oldPoints.at(-1);
    for(let i=2;i<rope.points.length-1;i++){
      const hit=world.sweptSegment?.(sweepPrevious[i-1],sweepPrevious[i],rope.points[i-1],rope.points[i],clearance);
      if(!hit)continue;
      const p=mix(rope.points[i-1],rope.points[i],hit.along),previous=mix(sweepPrevious[i-1],sweepPrevious[i],hit.along);
      const contact=world.project(p,previous,clearance);
      if(distance(contact,p)>.001){rope.points.splice(i,0,contact);sweepPrevious.splice(i,0,previous);resetRest(rope);i++}
    }
  }
  const n=rope.points.length,dt=Math.min(.1,Math.max(0,seconds)),h=1/120;
  for(let i=2;i<n-2;i++){
    const old=rope.points[i],p=world.project(old,old,clearance);
    if(world.query(p,p).some(b=>pointInside(p,b,clearance+.015)))p.contact=true;
    rope.points[i]=p;
  }
  let movement=0;
  for(let remaining=dt;remaining>1e-8;remaining-=h){
    const step=Math.min(h,remaining);
    for(let i=2;i<n-2;i++){
      const p=rope.points[i],previous=rope.previous[i],velocity=p.map((v,j)=>(v-previous[j])*(reduced?0:.96));
      if(p.contact)for(let j=0;j<3;j++)velocity[j]*=.6;
      rope.previous[i]=[...p];rope.points[i]=p.map((v,j)=>v+velocity[j]-(j===1?14*step*step:0));
    }
    for(let iteration=0;iteration<4;iteration++){
      for(let i=1;i<n-2;i++){
        const a=rope.points[i],b=rope.points[i+1],d=distance(a,b)||1,rest=rope.rest[i]||spacing;
        const error=(d-rest)/d*.5,wa=i===1?0:1,wb=i+1===n-2?0:1,weight=wa+wb;
        if(!weight)continue;
        for(let j=0;j<3;j++){const correction=(b[j]-a[j])*error*2/weight;a[j]+=correction*wa;b[j]-=correction*wb}
      }
      for(let i=2;i<n-2;i++){
        const p=rope.points[i],target=mix(p,mix(rope.points[i-1],rope.points[i+1],.5),.035);
        if(!world.segmentHit(rope.points[i-1],target,clearance)&&!world.segmentHit(target,rope.points[i+1],clearance))rope.points[i]=target;
      }
      for(let i=2;i<n-2;i++){
        const old=rope.points[i],p=world.project(old,rope.previous[i],clearance);
        if(world.query(p,p).some(b=>pointInside(p,b,clearance+.015)))p.contact=true;
        rope.points[i]=p;
      }
      pin(rope,endpoints,world);
    }
  }
  repair(rope,world);
  // With no cable self-collision, returning to the same contact releases the
  // redundant loop instead of feeding fresh material around that corner forever.
  let reeled=false;
  for(let i=2;i<rope.points.length-2;i++)if(rope.points[i].contact){
    for(let j=rope.points.length-3;j>i+1;j--)if(rope.points[j].contact&&distance(rope.points[i],rope.points[j])<.005){
      rope.points.splice(i+1,j-i);reeled=true;break;
    }
  }
  if(reeled)resetRest(rope);
  let simplified=false;
  for(let i=2;i<rope.points.length-3;i++){
    if(distance(rope.points[i-1],rope.points[i+1])<spacing*1.25&&!world.segmentHit(rope.points[i-1],rope.points[i+1],clearance)){
      rope.points.splice(i,1);simplified=true;i--;
    }
  }
  if(simplified)resetRest(rope);
  // Reeling removes redundant slack, but never shortcuts through a solid.
  if(endpointMotion>.0001&&rope.points.length>8){
    if(distance(endpoints.a,endpoints.b)<distance(rope.lastEndpoints.a,rope.lastEndpoints.b)-.05){
      for(let i=1;i<rope.points.length-3;i++){
        let via=0;
        const cumulative=[0];
        for(let j=i+1;j<rope.points.length-1;j++){via+=distance(rope.points[j-1],rope.points[j]);cumulative.push(via)}
        for(let j=rope.points.length-2;j>i+1;j--){
          if(distance(rope.points[i],rope.points[j])<cumulative[j-i]*.8&&!world.segmentHit(rope.points[i],rope.points[j],clearance)){
            rope.points.splice(i+1,j-i-1);resetRest(rope);break;
          }
        }
      }
    }
    for(let i=2;i<rope.points.length-3;i++){
      const a=rope.points[i-1],b=rope.points[i+1];
      const via=distance(a,rope.points[i])+distance(rope.points[i],b);
      if((distance(a,b)<spacing*.9||distance(a,b)<via*.85)&&!world.segmentHit(a,b,clearance)){
        rope.points.splice(i,1);resetRest(rope);i--;
      }
    }
    if(rope.points.slice(2,-1).some((p,i)=>distance(rope.points[i+1],p)>spacing*1.8)){
      rope.points=[rope.points[0],...samplePath(rope.points.slice(1,-1)),rope.points.at(-1)];resetRest(rope);
    }
  }
  pin(rope,endpoints,world);
  movement=rope.points.reduce((max,p,i)=>Math.max(max,oldPoints[i]?distance(p,oldPoints[i]):1),0);
  rope.quiet=movement<.001?rope.quiet+dt:0;rope.moving=!reduced&&rope.quiet<.4;
  rope.lastEndpoints={...endpoints,a:[...endpoints.a],b:[...endpoints.b]};
  rope.version++;metrics(rope);return rope;
}
