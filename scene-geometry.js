/** The shipped GLB stores rack, then room, then the legacy cable in each primitive. */
export function rackIndexCount(buttons,indices){
  const firstRoom=buttons.findIndex(value=>value===1);
  if(firstRoom<0)throw Error('GLB room boundary is missing');
  const end=indices.findIndex(index=>index>=firstRoom);
  if(end<0||end%3!==0)throw Error('Invalid GLB rack boundary');
  return end;
}
/** The procedural GLB exporter emits 24 vertices / 36 indices per box. */
export function rackColliders(doc,binary){
  const data=(id,Type,multiple=1)=>{
    const a=doc.accessors[id],v=doc.bufferViews[a.bufferView];
    return new Type(binary.buffer,binary.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*multiple);
  };
  const boxes=[];
  for(const [p,primitive] of doc.meshes[0].primitives.entries()){
    const indices=data(primitive.indices,Uint32Array),positions=data(primitive.attributes.POSITION,Float32Array,3);
    const count=rackIndexCount(data(primitive.attributes._BUTTON,Float32Array),indices);
    for(let start=0;start<count;start+=36){
      const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      for(const index of indices.subarray(start,start+36))for(let j=0;j<3;j++){min[j]=Math.min(min[j],positions[index*3+j]);max[j]=Math.max(max[j],positions[index*3+j]);}
      const size=max.map((v,j)=>v-min[j]);
      if(Math.max(...size)<.22)continue;
      boxes.push({id:`rack:${p}:${start}`,owner:'rack',min,max});
    }
  }
  return boxes;
}
