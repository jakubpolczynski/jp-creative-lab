/** Spring response for the 3D room-button; no camera movement. */
export function createRoomMotion(){return {lift:0,velocity:0,scale:1,glow:0};}
export function stepRoomMotion(state,input,seconds,reducedMotion=false){
  const active=input.hover||input.pressed;
  if(reducedMotion){state.lift=0;state.velocity=0;state.scale=1;state.glow=active?1:0;return state;}
  const dt=Math.min(Math.max(seconds,0),.05);
  const target=input.pressed?-.11:input.hover?.16:0;
  // Integrate small steps independently of display refresh.
  let remaining=dt;while(remaining>0){const h=Math.min(remaining,1/120);state.velocity+=((target-state.lift)*360-state.velocity*17)*h;state.lift+=state.velocity*h;remaining-=h;}
  const ease=1-Math.exp(-22*dt);
  state.scale+=((input.pressed?.982:1)-state.scale)*ease;
  state.glow+=((active?1:0)-state.glow)*ease;
  // An asymptotic spring must eventually become exactly stationary. Otherwise
  // subpixel floating-point tails rebuild every collider forever under hover.
  if(Math.abs(state.lift-target)<1e-7&&Math.abs(state.velocity)<1e-6){state.lift=target;state.velocity=0}
  const scale=input.pressed?.982:1,glow=active?1:0;
  if(Math.abs(state.scale-scale)<1e-7)state.scale=scale;
  if(Math.abs(state.glow-glow)<1e-7)state.glow=glow;
  return state;
}
export function roomHull(points){
 const sorted=points.map(p=>p.slice()).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=items=>{const hull=[];for(const p of items){while(hull.length>1&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p)}return hull.slice(0,-1)};
 return [...half(sorted),...half([...sorted].reverse())];
}
