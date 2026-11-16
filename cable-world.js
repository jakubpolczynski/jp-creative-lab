import {buildRoom} from './room-world.js';
import {createCollisionWorld,roomColliders,transformBox} from './collisions.js';
import {createRope,stepRope,cableEndpoints} from './cable-physics.js';
import {buildCableTube} from './cable-mesh.js';
import {createSignalNetwork} from './signals.js';
export function createCableWorld({layout,rackBoxes=[]}){
  const local=new Map(layout.all().map(r=>[r.id,roomColliders(buildRoom(r),r.id)])),collision=createCollisionWorld();
  const neutral={lift:0,scale:1},ropes=new Map();
  let last=0,frame=null,previousBoxes=new Map(),signature='',geometryKey='';
  let previousState={centers:Object.fromEntries(layout.all().map(r=>[r.id,[...r.center]])),poses:{},server:{...neutral},chairs:{}};
  function boxesFor(poses,server,chairs,centers){
    const boxes=[];
    for(const room of layout.all())for(const b of local.get(room.id))boxes.push(transformBox(b,centers?.[room.id]||room.center,poses[room.id]||neutral,chairs[room.id]));
    for(const b of rackBoxes){
      const pivot=[-4.8,0,.05],min=b.min.map((v,j)=>pivot[j]+(v-pivot[j])*server.scale+(j===1?server.lift:0)),max=b.max.map((v,j)=>pivot[j]+(v-pivot[j])*server.scale+(j===1?server.lift:0));
      boxes.push({...b,min,max});
    }
    return boxes;
  }
  collision.set(boxesFor({},neutral,{}));
  previousBoxes=new Map(collision.boxes.map(b=>[b.id,b]));
  for(const room of layout.all())ropes.set(room.id,createRope(cableEndpoints(room),collision));
  const network=createSignalNetwork(layout.all().map(r=>({id:r.id,color:r.rgb,length:ropes.get(r.id).length})));
  function advance(seconds,poses={},server=neutral,chairs={},reduced=false){
    const key=JSON.stringify([layout.all().map(r=>r.center),Object.fromEntries(Object.entries(poses).map(([id,p])=>[id,[p.lift,p.scale]])),[server.lift,server.scale],chairs,reduced]);
    if(frame&&seconds===last&&key===signature)return frame;
    if(frame&&reduced&&key===signature){
      last=seconds;
      frame={...frame,moving:false,network:network.advance(seconds,Object.fromEntries(frame.cables.map(c=>[c.id,c.rope.length])),true)};
      return frame;
    }
    const dt=Math.min(.1,Math.max(0,seconds-last));
    const current={centers:Object.fromEntries(layout.all().map(r=>[r.id,[...r.center]])),poses:structuredClone(poses),server:{...server},chairs:structuredClone(chairs)};
    const blend=(a,b,t)=>Object.fromEntries(Object.keys(b).map(k=>[k,(a?.[k]??(k==='scale'?1:0))+((b[k])-(a?.[k]??(k==='scale'?1:0)))*t]));
    const motion=Math.max(...layout.all().map(r=>Math.hypot(...r.center.map((v,j)=>v-previousState.centers[r.id][j]))));
    const steps=Math.max(1,Math.min(24,Math.ceil(Math.max(dt*120,motion/.12))));
    let actual;
    for(let step=1;step<=steps;step++){
      const t=step/steps,centers={},subPoses={},subChairs={},subServer=blend(previousState.server,current.server,t);
      for(const r of layout.all()){
        centers[r.id]=r.center.map((v,j)=>previousState.centers[r.id][j]+(v-previousState.centers[r.id][j])*t);
        subPoses[r.id]=blend(previousState.poses[r.id],current.poses[r.id]||neutral,t);
        subChairs[r.id]=blend(previousState.chairs[r.id],current.chairs[r.id]||{angle:0,x:0,z:0},t);
      }
      const subKey=JSON.stringify([centers,Object.fromEntries(Object.entries(subPoses).map(([id,p])=>[id,[p.lift,p.scale]])),[subServer.lift,subServer.scale],subChairs]);
      if(subKey!==geometryKey){
        actual=boxesFor(subPoses,subServer,subChairs,centers);
        collision.set(actual.map(b=>{
          const old=previousBoxes.get(b.id),moved=old&&b.min.some((v,j)=>Math.abs(v-old.min[j])+Math.abs(b.max[j]-old.max[j])>1e-8);
          return moved?{...b,previous:old}:b;
        }));
        geometryKey=subKey;
      }else{actual=[...previousBoxes.values()];if(collision.boxes.some(b=>b.previous))collision.set(actual)}
      for(const room of layout.all())stepRope(ropes.get(room.id),reduced?0:dt/steps,cableEndpoints(room,centers[room.id],subPoses[room.id],subServer),collision,{reduced});
      previousBoxes=new Map(actual.map(b=>[b.id,b]));
    }
    const cables=[];
    for(const room of layout.all()){
      const rope=ropes.get(room.id);
      cables.push({id:room.id,rope,mesh:buildCableTube(rope)});
    }
    previousBoxes=new Map(actual.map(b=>[b.id,b]));collision.set(actual);
    previousState=current;
    last=seconds;signature=key;
    frame={cables,network:network.advance(seconds,Object.fromEntries(cables.map(c=>[c.id,c.rope.length])),reduced),moving:cables.some(c=>c.rope.moving),bounds:cables.map(c=>c.rope.bounds)};
    return frame;
  }
  return {advance,collision,ropes,get frame(){return frame},dispose(){ropes.clear()}};
}
