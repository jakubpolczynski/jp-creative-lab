import {signalState} from './signals.js';

/** Dimensions and colors of the shipped ASCII cable (build_model.py:337–372). */
export const CABLE_STYLE=Object.freeze({
  width:.17,trackWidth:.085,trackOffset:.091,trackDepth:.04,jointWidth:.205,
  casing:[24/255,46/255,53/255],track:[22/255,53/255,46/255],joint:[53/255,83/255,76/255],
});
export function cableDistances(path){
  const distances=[0];
  for(let i=1;i<path.length;i++)distances.push(distances.at(-1)+Math.hypot(...path[i].map((v,j)=>v-path[i-1][j])));
  return distances;
}
export function cableSignal(seconds,length,reduced=false,cycle){
  return signalState(seconds,length,reduced,cycle);
}
export function cableReturnColor(color){return [...color]}
