/** Camera transition and the exact HTML viewport inside the 3D monitor. */
import {labMonitorFrame} from './rooms.js';
export const MONITOR_DURATION=1250;
export function createMonitorTransition(){return {from:0,to:0,started:0};}
export function monitorProgress(state,now,reducedMotion=false){
 if(reducedMotion)return state.to;
 const t=Math.max(0,Math.min(1,(now-state.started)/MONITOR_DURATION));
 const eased=t*t*t*(t*(t*6-15)+10);
 return state.from+(state.to-state.from)*eased;
}
export function chairPose(progress){
 const t=Math.max(0,Math.min(1,progress/.55));
 const ease=t*t*t*(t*(t*6-15)+10);
 return {angle:ease*1.31,x:ease*.62,z:ease===0?0:-ease*1.55};
}
export function monitorFrame(width,height){
  return labMonitorFrame(width,height);
}
