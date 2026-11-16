/** All physical links share one velocity, measured in world units per second. */
export const SIGNAL_SPEED=5;
export const SERVER_GREEN=Object.freeze([.20,1,.34]);
export const ASCII_COLOR=Object.freeze([98/255,234/255,1]);
export const SIGNAL_REPLY_DELAY=1;
export function signalCycle(lengths){return 1+2*Math.max(0,...lengths)/SIGNAL_SPEED+SIGNAL_REPLY_DELAY+2}
export const CYCLE_SECONDS=signalCycle([14.333]);
export function signalTiming(length,cycle=signalCycle([length])){
  const travel=length/SIGNAL_SPEED,roomArrival=1+travel,roomSend=roomArrival+SIGNAL_REPLY_DELAY;
  return {serverSend:1,travel,roomArrival,roomSend,serverArrival:roomSend+travel,cycle};
}
function phase(seconds,cycle){return (Math.round((((seconds%cycle)+cycle)%cycle)*1e9)/1e9)%cycle}
function flash(age){return age>=-1e-9&&age<.6?Math.max(0,Math.min(1,age/.1)*Math.min(1,(.6-age)/.5)):0}
export function signalState(seconds,length,reducedMotion=false,cycle=signalCycle([length])){
  if(reducedMotion||!(length>0))return {outbound:-100,inbound:-100,rackBlink:0,roomBlink:0};
  const time=phase(seconds,cycle),t=signalTiming(length,cycle),epsilon=1e-9;
  const outbound=time>=1-epsilon&&time<=t.roomArrival+epsilon?Math.max(0,Math.min(length,(time-1)*SIGNAL_SPEED)):-100;
  const inbound=time>=t.roomSend-epsilon&&time<=t.serverArrival+epsilon?Math.max(0,Math.min(length,length-(time-t.roomSend)*SIGNAL_SPEED)):-100;
  return {outbound,inbound,rackBlink:flash(time-t.serverArrival),roomBlink:flash(time-t.roomArrival)};
}
export function networkState(seconds,paths,reducedMotion=false){
  const cycle=signalCycle(paths.map(p=>p.length)),time=phase(seconds,cycle);
  const links=paths.map(p=>({...p,...signalState(seconds,p.length,reducedMotion,cycle)}));
  let latest=Infinity;
  const server={color:SERVER_GREEN,intensity:0};
  for(const link of links){
    const age=time-signalTiming(link.length,cycle).serverArrival;
    if(link.rackBlink>0&&age<latest){
      latest=age;server.color=link.color;server.intensity=link.rackBlink;
    }
  }
  return {cycle,links,server};
}
/** Mutable event clock: topology/length updates never restart another link. */
export function createSignalNetwork(paths){
  let links,last=0,nextSend=1;
  function reset(seconds=0){
    last=seconds;nextSend=seconds+1;
    links=paths.map(p=>({...p,mode:'waiting',travelled:0,cursor:seconds,roomArrival:-Infinity,serverArrival:-Infinity}));
  }
  reset();
  function advance(seconds,lengths={},reduced=false){
    if(seconds<last)reset(0);
    for(const l of links){
      const length=Math.max(.001,lengths[l.id]??l.length);
      // A length supplied now did not exist throughout the preceding interval.
      // If shortening crosses the front, receive NOW, never backdate the reply.
      if(length<l.length&&(l.mode==='outbound'||l.mode==='inbound')&&l.travelled+(seconds-last)*SIGNAL_SPEED>=length){
        if(l.mode==='outbound'){l.roomArrival=seconds;l.mode='reply-delay'}
        else{l.serverArrival=seconds;l.mode='done'}
        l.cursor=seconds;l.travelled=length;
      }
      l.length=length;
    }
    for(let cycle=0;cycle<1000;cycle++){
      for(const l of links){
        if(l.mode==='waiting'&&seconds>=nextSend){l.mode='outbound';l.cursor=nextSend;l.travelled=0}
        for(let phase=0;phase<4;phase++){
          if(l.mode==='outbound'||l.mode==='inbound'){
            const remaining=Math.max(0,l.length-l.travelled),available=Math.max(0,seconds-l.cursor);
            if(remaining>available*SIGNAL_SPEED+1e-9){l.travelled+=available*SIGNAL_SPEED;l.cursor=seconds;break}
            l.cursor=remaining===0?seconds:l.cursor+remaining/SIGNAL_SPEED;l.travelled=l.length;
            if(l.mode==='outbound'){l.roomArrival=l.cursor;l.mode='reply-delay'}
            else{l.serverArrival=l.cursor;l.mode='done';break}
          }else if(l.mode==='reply-delay'){
            if(seconds<l.roomArrival+SIGNAL_REPLY_DELAY)break;
            l.cursor=l.roomArrival+SIGNAL_REPLY_DELAY;l.travelled=0;l.mode='inbound';
          }else break;
        }
      }
      if(!links.every(l=>l.mode==='done'))break;
      nextSend=Math.max(...links.map(l=>l.serverArrival))+2;
      if(seconds<nextSend)break;
      for(const l of links){l.mode='waiting';l.cursor=nextSend;l.travelled=0}
    }
    last=seconds;
    const server={color:SERVER_GREEN,intensity:0};
    let latest=-Infinity;
    const result=links.map(l=>{
      const roomBlink=reduced?0:flash(seconds-l.roomArrival),rackBlink=reduced?0:flash(seconds-l.serverArrival);
      if(rackBlink>0&&(l.serverArrival>latest||(l.serverArrival===latest&&l.id>server.id))){
        latest=l.serverArrival;server.color=l.color;server.intensity=rackBlink;server.id=l.id;
      }
      return {...l,outbound:reduced?-100:l.mode==='outbound'?l.travelled:Math.abs(seconds-l.roomArrival)<1e-8?l.length:-100,
        inbound:reduced?-100:l.mode==='inbound'?Math.max(0,l.length-l.travelled):Math.abs(seconds-l.serverArrival)<1e-8?0:-100,roomBlink,rackBlink};
    });
    return {links:result,server};
  }
  return {advance,reset};
}
