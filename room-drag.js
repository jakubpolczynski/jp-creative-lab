export function holdDecision(start,now,p){
  if(Math.hypot(p.x-start.x,p.y-start.y)>8)return 'cancel';
  return now-start.time>=350?'drag':'pending';
}
/** One gesture owner for both ASCII's button and all procedural room hitboxes. */
export function createRoomDrag({layout,projectToGround,changed,finished,announce=()=>{}}){
  let pending=null,active=null,last=null,blockedClicks=new WeakSet(),keyupBlock=false,documentBound=false;
  function start(p){
    const point=projectToGround(p.x,p.y);
    active={...p,origin:[...layout.room(p.id).center],grab:point,keyboard:p.keyboard||false};
    pending=null;p.button.dataset.dragging='true';
    announce('Przenoszenie pokoju. Puść, aby postawić. Escape anuluje.');changed();
  }
  function end(cancel=false){
    const p=active||pending;if(!p)return;
    if(active&&cancel)layout.restore(p.id,active.origin);
    if(!p.keyboard)blockedClicks.add(p.button);
    if(active){p.button.dataset.dragging='false';p.button.dataset.blocked='false'}
    active=null;pending=null;
    if(p.pointerId!==undefined&&p.button.hasPointerCapture?.(p.pointerId))p.button.releasePointerCapture(p.pointerId);
    finished();announce(cancel?'Przenoszenie anulowane.':'Pokój postawiony.');
  }
  function move(x,y){
    if(!active)return;
    const p=projectToGround(x,y),candidate=active.origin.map((v,j)=>v+(j===1?0:p[j]-active.grab[j]));
    active.button.dataset.blocked=String(!layout.move(active.id,candidate));changed();
  }
  function bind(button,id){
    if(!documentBound){documentBound=true;button.ownerDocument.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&(active||pending)){end(true);e.preventDefault();e.stopImmediatePropagation()}
    },true)}
    button.style.touchAction='none';button.setAttribute('aria-describedby','room-move-help');
    button.addEventListener('pointerdown',e=>{
      if(!e.isPrimary||e.button!==0||active||pending||button.disabled)return;
      blockedClicks.delete(button);last={x:e.clientX,y:e.clientY};
      pending={id,button,pointerId:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};
      button.setPointerCapture(e.pointerId);changed();
    },true);
    button.addEventListener('pointermove',e=>{
      const p=active||pending;if(!p||p.pointerId!==e.pointerId)return;
      last={x:e.clientX,y:e.clientY};
      if(active){move(e.clientX,e.clientY);e.preventDefault();e.stopImmediatePropagation()}
      else if(holdDecision(pending,performance.now(),last)==='cancel'){blockedClicks.add(button);pending=null}
    },true);
    button.addEventListener('pointerup',e=>{
      if(active?.pointerId===e.pointerId){end();e.preventDefault()}
      else if(pending?.pointerId===e.pointerId)pending=null;
    },true);
    for(const event of ['pointercancel','lostpointercapture'])button.addEventListener(event,e=>{
      if((active||pending)?.pointerId===e.pointerId)end(true);
    },true);
    button.addEventListener('click',e=>{if(blockedClicks.has(button)){blockedClicks.delete(button);e.preventDefault();e.stopImmediatePropagation()}},true);
    button.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' ')blockedClicks.delete(button);
      if(e.key.toLowerCase()==='m'&&!active&&!pending){start({id,button,keyboard:true,x:0,y:0});e.preventDefault();e.stopImmediatePropagation();return}
      if(active?.id!==id||!active.keyboard)return;
      if(e.key==='Enter'){keyupBlock=true;end();e.preventDefault();e.stopImmediatePropagation();return}
      if(e.key==='Escape'){keyupBlock=true;end(true);e.preventDefault();e.stopImmediatePropagation();return}
      const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=directions[e.key];
      if(d){const p=[...layout.room(id).center],step=e.shiftKey?1:.25;p[0]+=d[0]*step;p[2]+=d[1]*step;button.dataset.blocked=String(!layout.move(id,p));changed();e.preventDefault();e.stopImmediatePropagation()}
    },true);
    button.addEventListener('keyup',e=>{if(keyupBlock&&(e.key==='Enter'||e.key==='Escape')){keyupBlock=false;e.preventDefault();e.stopImmediatePropagation()}},true);
  }
  return {bind,update(now){if(pending&&holdDecision(pending,now,last)==='drag')start(pending)},
    cancel(){end(true)},get active(){return active},get pending(){return pending}};
}
