import {segmentBoxHit,boxCollider} from './collisions.js';
export function createRoomLayout(definitions){
  const rooms=new Map(definitions.map(r=>[r.id,{...r,center:[...r.center]}]));
  function valid(id,p){
    if(!p.every(Number.isFinite))return false;
    for(const r of rooms.values())if(r.id!==id&&Math.abs(p[0]-r.center[0])<6.65&&Math.abs(p[2]-r.center[2])<5.65)return false;
    return !(p[0]>-9.65&&p[0]<.05&&p[2]>-4.45&&p[2]<4.55);
  }
  function restore(id,p){rooms.get(id).center=[p[0],0,p[2]]}
  return {room:id=>rooms.get(id),all:()=>[...rooms.values()],valid,
    move(id,p){
      if(!valid(id,p))return false;
      const old=rooms.get(id).center;
      const obstacles=[...rooms.values()].filter(r=>r.id!==id).map(r=>boxCollider(r.center,[13.3,4,11.3],r.id));
      obstacles.push(boxCollider([-4.8,0,.05],[9.7,4,9],'rack'));
      if(obstacles.some(b=>segmentBoxHit(old,p,b,0)))return false;
      restore(id,p);return true;
    },restore};
}
