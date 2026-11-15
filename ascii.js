import {DEFAULT_REMIX,REMIX_PRESETS,normalizeRemix,remixPixels} from './ascii-remix.js';
const RAMP='@%#*+=-:. ';
export function asciiSize(width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Nieprawidłowe wymiary obrazu.');
 const columns=120,rows=Math.max(1,Math.min(240,Math.round(columns*height/width*.5)));
 return {columns,rows};
}
export function pixelsToAscii(pixels,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels.length!==width*height*4)throw Error('Nieprawidłowe dane obrazu.');
 const lines=[];
 for(let y=0;y<height;y++){let line='';for(let x=0;x<width;x++){
  const i=(y*width+x)*4,a=pixels[i+3]/255;
  const luminance=(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])*a+255*(1-a);
  line+=RAMP[Math.min(RAMP.length-1,Math.round(luminance/255*(RAMP.length-1)))];
 }lines.push(line)}
 return lines.join('\n');
}
export function pixelsToColorAscii(pixels,width,height){
 const text=pixelsToAscii(pixels,width,height),lines=[],colors=[];
 for(let y=0;y<height;y++){
  let line='',run='',lastColor='';
  const flush=()=>{if(run)line+='<span style="color:'+lastColor+'">'+run+'</span>';};
  for(let x=0;x<width;x++){
   const i=(y*width+x)*4,a=pixels[i+3]/255;
   const rgb=[0,1,2].map(c=>Math.round(pixels[i+c]*a+255*(1-a)));
   const color='rgb('+rgb.join(',')+')',char=text[y*(width+1)+x];
   colors.push(color);
   if(color!==lastColor){flush();run='';lastColor=color;}run+=char;
  }
  flush();lines.push(line);
 }
 return {text,html:lines.join('\n'),colors,columns:width,rows:height};
}
export function asciiDocument(result){
 const background=/^#[0-9a-f]{6}$/i.test(result.background)?result.background:'#f8fafc';
 return '<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kolorowe ASCII</title><style>body{margin:0;padding:24px;background:'+background+'}pre{margin:0;font:12px/1.2 "Courier New",monospace;letter-spacing:0;white-space:pre;font-variant-ligatures:none}</style></head><body><pre aria-label="Kolorowe ASCII">'+result.html+'</pre></body></html>';
}
export async function asciiBlob(result,format){
 if(format==='html')return new Blob([asciiDocument(result)],{type:'text/html;charset=utf-8'});
 if(format==='txt')return new Blob([result.text],{type:'text/plain;charset=utf-8'});
 if(format!=='png'&&format!=='jpg')throw Error('Nieobsługiwany format pobierania.');
 const fontSize=20,lineHeight=24,padding=24,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Nie można przygotować obrazu do pobrania.');
 ctx.font=fontSize+'px "Courier New",monospace';const cellWidth=ctx.measureText('M').width;
 canvas.width=Math.ceil(result.columns*cellWidth)+padding*2;canvas.height=result.rows*lineHeight+padding*2;
 ctx.fillStyle=/^#[0-9a-f]{6}$/i.test(result.background)?result.background:'#f8fafc';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.font=fontSize+'px "Courier New",monospace';ctx.textBaseline='top';
 for(let y=0;y<result.rows;y++)for(let x=0;x<result.columns;x++){
  const char=result.text[y*(result.columns+1)+x];if(char===' ')continue;
  ctx.fillStyle=result.colors[y*result.columns+x];ctx.fillText(char,padding+x*cellWidth,padding+y*lineHeight);
 }
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Nie udało się przygotować pliku.')),format==='png'?'image/png':'image/jpeg',.95));
}
export function cleanSvg(text){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Ten SVG zawiera niedozwoloną deklarację.');
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Nieprawidłowy plik SVG.');
 const allowed=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','defs','linearGradient','radialGradient','stop','clipPath','mask','use','symbol','title','desc']);
 for(const el of [...doc.querySelectorAll('*')]){
  if(!allowed.has(el.localName)){el.remove();continue;}
  for(const attr of [...el.attributes]){
   const name=attr.localName.toLowerCase(),value=attr.value.trim();
   if(name.startsWith('on')||name==='style'||name==='base'||((name==='href')&&!value.startsWith('#'))||(/url\s*\(/i.test(value)&&!/^url\(\s*#[\w:.-]+\s*\)$/i.test(value)))el.removeAttributeNode(attr);
  }
 }
 doc.documentElement.setAttribute('xmlns','http://www.w3.org/2000/svg');
 return new XMLSerializer().serializeToString(doc);
}
async function decodeImage(file){
 if(!file||file.size===0)throw Error('Wybierz niepusty plik obrazu.');
 if(file.size>20*1024*1024)throw Error('Obraz jest za duży. Maksymalnie 20 MB.');
 const svg=file.type==='image/svg+xml'||/\.svg$/i.test(file.name);
 if(!svg&&!/^image\/(png|jpeg|webp|gif|bmp|avif|x-icon|vnd.microsoft.icon)$/.test(file.type))throw Error('Wybierz PNG, JPG, SVG, WebP, GIF, BMP lub AVIF.');
 const blob=svg?new Blob([cleanSvg(await file.text())],{type:'image/svg+xml'}):file;
 const url=URL.createObjectURL(blob),image=new Image();
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{image.src='';reject(Error('Odczyt obrazu trwał zbyt długo.'))},10000);image.onload=()=>{clearTimeout(timer);resolve()};image.onerror=()=>{clearTimeout(timer);reject(Error('Nie udało się odczytać obrazu. Sprawdź plik.'))};image.src=url;});
  if(image.naturalWidth*image.naturalHeight>32000000)throw Error('Obraz ma za dużo pikseli. Maksymalnie 32 megapiksele.');
  return image;
 }finally{URL.revokeObjectURL(url)}
}
function sampleImage(image,options={}){
 const settings=normalizeRemix(options),columns=settings.width;
 const rows=Math.max(1,Math.min(240,Math.round(columns*image.naturalHeight/image.naturalWidth*.5*settings.stretch)));
 const canvas=document.createElement('canvas');canvas.width=columns;canvas.height=rows;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Przeglądarka nie obsługuje konwersji obrazu.');
 ctx.drawImage(image,0,0,columns,rows);
 return remixPixels(ctx.getImageData(0,0,columns,rows).data,columns,rows,settings);
}
export async function convertImage(file,options={}){return sampleImage(await decodeImage(file),options);}

const root=typeof document!=='undefined'?document.querySelector('#ascii-converter'):null;
if(root){
 const input=root.querySelector('#ascii-file'),drop=root.querySelector('#ascii-drop'),preview=root.querySelector('#ascii-preview'),download=root.querySelector('#ascii-download'),status=root.querySelector('#ascii-status');
 const format=root.querySelector('#ascii-format'),exports=root.querySelector('#ascii-exports');
 const remix=root.querySelector('#ascii-remix'),panel=root.querySelector('#ascii-remix-panel'),preset=root.querySelector('#remix-preset');
 const fields=[...panel.querySelectorAll('[data-remix]')];
 let sourceImage=null,settings=normalizeRemix(DEFAULT_REMIX),remixTimer=0;
 function fitPreview(){
  preview.style.fontSize=Math.max(1,(preview.clientWidth-2)/((resultData?.columns||120)*.602))+'px';
 }
 let request=0,clipboardRequest=0,resultUrl=null,resultData=null,baseName='',exportRequest=0;
 async function prepareDownload(){
  const current=++exportRequest,data=resultData,selected=format.value;
  download.hidden=true;download.removeAttribute('href');
  if(resultUrl){URL.revokeObjectURL(resultUrl);resultUrl=null;}
  if(!data)return;
  try{
   const blob=await asciiBlob(data,selected);if(current!==exportRequest||data!==resultData)return;
   resultUrl=URL.createObjectURL(blob);download.href=resultUrl;download.download=baseName+'-ascii.'+selected;
   download.textContent='Pobierz .'+selected;download.hidden=false;
  }catch(error){if(current===exportRequest)status.textContent=error.message;}
 }
 format.addEventListener('change',prepareDownload);
 function syncSettings(){
  for(const field of fields){
   const value=settings[field.dataset.remix];if(field.type==='checkbox')field.checked=value;else field.value=value;
   const output=panel.querySelector('output[for="'+field.id+'"]');if(output)output.value=String(value);
  }
 }
 function displayResult(result){
  // This markup is produced only from escaped glyphs and numeric RGB values.
  preview.innerHTML=result.html;preview.style.backgroundColor=result.background;preview.hidden=false;
  resultData=result;preview.dataset.revision=String(Number(preview.dataset.revision||0)+1);fitPreview();
 }
 async function updateRemix(){
  if(!sourceImage)return;
  try{displayResult(sampleImage(sourceImage,settings));await prepareDownload();}
  catch(error){status.textContent=error.message;}
 }
 remix.addEventListener('click',()=>{
  panel.hidden=!panel.hidden;remix.setAttribute('aria-expanded',String(!panel.hidden));fitPreview();
 });
 panel.addEventListener('input',event=>{
  const field=event.target;if(!field.dataset.remix||!sourceImage)return;
  const value=field.type==='checkbox'?field.checked:field.type==='range'?Number(field.value):field.value;
  settings=normalizeRemix({...settings,[field.dataset.remix]:value});preset.value='custom';
  const output=panel.querySelector('output[for="'+field.id+'"]');if(output)output.value=String(settings[field.dataset.remix]);
  clearTimeout(remixTimer);remixTimer=setTimeout(updateRemix,65);
 });
 function applyPreset(name){
  clearTimeout(remixTimer);settings=normalizeRemix(REMIX_PRESETS[name]||DEFAULT_REMIX);preset.value=name;syncSettings();updateRemix();
 }
 preset.addEventListener('change',()=>applyPreset(preset.value));
 root.querySelector('#remix-reset').addEventListener('click',()=>applyPreset('original'));
 async function load(file){
  clearTimeout(remixTimer);sourceImage=null;settings=normalizeRemix(DEFAULT_REMIX);syncSettings();preset.value='original';
  panel.hidden=true;remix.hidden=true;remix.setAttribute('aria-expanded','false');
  const current=++request;exportRequest++;resultData=null;exports.hidden=true;root.dataset.state='loading';status.textContent='Konwertowanie…';preview.hidden=true;download.hidden=true;
  if(resultUrl){URL.revokeObjectURL(resultUrl);resultUrl=null;download.removeAttribute('href')}
  try{
   const image=await decodeImage(file);if(current!==request)return;
   sourceImage=image;displayResult(sampleImage(image,settings));
   baseName=file.name.replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}_-]/gu,'_')||'obraz';
   exports.hidden=false;await prepareDownload();if(current!==request)return;
   root.dataset.state='ready';status.textContent='';remix.hidden=false;fitPreview();
  }catch(error){if(current!==request)return;root.dataset.state='error';status.textContent=error.message;preview.textContent='';}
 }
 input.addEventListener('change',()=>{if(input.files[0])load(input.files[0]);input.value='';});
 const monitor=document.querySelector('#monitor-app');
 root.querySelector('#ascii-paste').addEventListener('click',async()=>{
  const current=++clipboardRequest,uploadRequest=request;
  if(!navigator.clipboard?.read){status.textContent='Wklej obraz skrótem Ctrl + V.';return;}
  status.textContent='Odczytywanie obrazu ze schowka…';
  try{
   const items=await navigator.clipboard.read();
   for(const item of items){
    const type=item.types.find(type=>type.startsWith('image/'));
    if(!type)continue;
    const blob=await item.getType(type);
    if(current!==clipboardRequest||uploadRequest!==request||monitor.dataset.open!=='true')return;
    const extension=type==='image/svg+xml'?'svg':type.split('/')[1];
    load(new File([blob],'schowek.'+extension,{type}));return;
   }
   if(current===clipboardRequest&&uploadRequest===request)status.textContent='Brak obrazu w schowku. Zrób zrzut Win + Shift + S i wklej Ctrl + V.';
  }catch{
   if(current===clipboardRequest&&uploadRequest===request)status.textContent='Nie udało się odczytać schowka. Wklej obraz skrótem Ctrl + V.';
  }
 });
 document.addEventListener('paste',event=>{
  if(monitor.dataset.open!=='true')return;
  const file=[...(event.clipboardData?.items||[])].find(item=>item.kind==='file'&&item.type.startsWith('image/'))?.getAsFile();
  if(!file)return;
  event.preventDefault();load(file);
 });
 let drag=0;
 drop.addEventListener('dragenter',e=>{e.preventDefault();drag++;drop.dataset.drag='true'});
 drop.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy'});
 drop.addEventListener('dragleave',e=>{e.preventDefault();if(--drag<=0){drag=0;delete drop.dataset.drag}});
 drop.addEventListener('drop',e=>{e.preventDefault();drag=0;delete drop.dataset.drag;const file=e.dataTransfer.files[0];if(file)load(file);});
 root.addEventListener('dragover',e=>e.preventDefault());root.addEventListener('drop',e=>e.preventDefault());
 new ResizeObserver(()=>{if(!preview.hidden)fitPreview()}).observe(root);
}
