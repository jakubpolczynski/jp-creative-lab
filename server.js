/** Contact replaces the JP panel on the rack's +Z face, not the +X unit slots. */
export const SERVER_SURFACE = Object.freeze({
  center: Object.freeze([-4.8, 2.12, 1.35]),
  direction: Object.freeze([0, 0, 25]),
  width: 1.82,
  height: 2.94,
});

export const SERVER_BOUNDS = Object.freeze([
  [-6.76,-.56,-1.76],[-2.84,-.56,-1.76],[-2.84,-.56,1.86],[-6.76,-.56,1.86],
  [-6.76,5.48,-1.76],[-2.84,5.48,-1.76],[-2.84,5.48,1.86],[-6.76,5.48,1.86],
].map(point=>Object.freeze(point)));

export function serverFrame(width,height){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Nieprawidłowy rozmiar widoku.');
  const ratio=SERVER_SURFACE.width/SERVER_SURFACE.height;
  const screenHeight=Math.max(1,Math.min(height*.82,width*.82/ratio,760));
  const screenWidth=screenHeight*ratio;
  return {left:(width-screenWidth)/2,top:(height-screenHeight)/2,width:screenWidth,height:screenHeight};
}
