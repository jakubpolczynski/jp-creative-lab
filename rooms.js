/** Shared coordinates for geometry, navigation, camera and regression fixtures. */
const definitions=[
  {id:'gallery',title:'Galeria projektów',subtitle:'Project Vault',color:'#ff5a5a',rgb:[1,90/255,90/255],center:[-10,0,-14]},
  {id:'particles',title:'Laboratorium cząsteczek',subtitle:'Matter Lab',color:'#f189e0',rgb:[.95,.54,.88],center:[6,0,-14]},
  {id:'materials',title:'Studio materiałów',subtitle:'Shader Studio',color:'#ffbc67',rgb:[1,.74,.40],center:[-10,0,13]},
  {id:'sound',title:'Pokój dźwięku',subtitle:'Signal Room',color:'#9e6bff',rgb:[158/255,107/255,1],center:[6,0,14]},
];
export const ROOMS=definitions.map((room,i)=>Object.freeze({...room,port:[-3.43,.727+(i+1)*.44,.20]}));
const asciiCenter=[4.985,0,.04];
export const ASCII_ROOM=Object.freeze({
  id:'monitor',title:'ASCII',color:'#62eaff',rgb:[98/255,234/255,1],center:asciiCenter,
  port:[-3.43,.727,.20],
});
export const WORLD_ROOMS=Object.freeze([...ROOMS,ASCII_ROOM]);
export function worldBounds(original,rooms=WORLD_ROOMS){
  const bounds={min:[...original.min],max:[...original.max]};
  for(const room of rooms){
    for(const p of [room.port,[room.center[0]-3.3,-.5,room.center[2]-2.8],[room.center[0]+3.3,4,room.center[2]+2.8]]){
      p.forEach((v,j)=>{bounds.min[j]=Math.min(bounds.min[j],v);bounds.max[j]=Math.max(bounds.max[j],v)});
    }
  }
  return bounds;
}
export function roomFrame(room,width,height){
  const frame=labMonitorFrame(width,height);
  return {
    center:room.center.map((v,i)=>v+LAB_MONITOR.center[i]),
    direction:LAB_MONITOR.direction,
    height:LAB_MONITOR.height*height/frame.height,
    shiftX:0,shiftY:0,
  };
}
export const LAB_MONITOR=Object.freeze({center:[-2.01,1.84,-.45],width:1.20,height:.76,direction:[25,0,0]});
export function labMonitorFrame(width,height){
  const ratio=LAB_MONITOR.width/LAB_MONITOR.height;
  const screenWidth=Math.max(1,Math.min(width*.80,Math.max(100,height-150)*ratio));
  const screenHeight=screenWidth/ratio;
  return {left:(width-screenWidth)/2,top:(height-screenHeight)/2,width:screenWidth,height:screenHeight};
}
export function roomCorners(room){
  return Array.from({length:8},(_,i)=>[room.center[0]+(i&1?3.2:-3.2),i&2?3.8:-.4,room.center[2]+(i&4?2.7:-2.7)]);
}
