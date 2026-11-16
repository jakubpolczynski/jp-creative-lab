const glyph=['11100110','00100101','00100110','10100100','11100100'];
export const jpCells=glyph.flatMap((row,y)=>[...row].flatMap((v,x)=>v==='1'?[[x,y]]:[]));
const fract=x=>x-Math.floor(x);
export function particlePosition(i,count,mode,time,strength){
  const u=fract(i*.61803398875),v=fract(i*.754877666),angle=u*Math.PI*2;
  if(mode==='jp'){
    const [x,y]=jpCells[i%jpCells.length],j=fract(i*.56984)-.5;
    return[(x-3.5)*.48+j*.13,(2-y)*.48+(v-.5)*.15,(u-.5)*.45];
  }
  if(mode==='wave'){
    const cols=Math.ceil(Math.sqrt(count)),x=(i%cols)/(cols-1)*4.4-2.2,z=Math.floor(i/cols)/(cols-1)*3.2-1.6;
    return[x,Math.sin(x*2+z+time*1.5)*.55*strength,z];
  }
  const r=.6+v*1.35,a=angle+time*(.18+v*.23)*strength;
  return[Math.cos(a)*r,Math.sin(angle*3+time*.7)*.8,Math.sin(a)*r];
}
