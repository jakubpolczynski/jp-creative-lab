import {ROOMS,roomCorners,labMonitorFrame} from './rooms.js';
import {PROJECTS} from './projects.js';
import {createSequencer} from './lab-audio.js';
import {createRoomMotion,stepRoomMotion,roomHull} from './interaction.js';

export function createLabUI({open,close,refresh,layout}){
  const state={particleMode:'orbit',strength:1,material:'chrome',hue:.10,deformation:.35};
  const seq=createSequencer(),poses=Object.fromEntries(ROOMS.map(r=>[r.id,createRoomMotion()]));
  const stage=document.querySelector('.stage'),buttons={},labels={},inputs={};
  let active=null,last=performance.now(),opener=null,wasShown=false;
  const pointer=[-10,-10];
  for(const room of ROOMS){
    const button=document.createElement('button');button.className='lab-room-button';button.id=`${room.id}-button`;
    button.type='button';button.disabled=true;button.setAttribute('aria-label',`Otwórz: ${room.title}`);
    button.setAttribute('aria-controls','lab-panel');button.setAttribute('aria-expanded','false');button.style.setProperty('--room-color',room.color);
    const outline=document.createElementNS('http://www.w3.org/2000/svg','svg');outline.classList.add('lab-outline');
    outline.setAttribute('aria-hidden','true');outline.innerHTML='<polygon points=""/>';outline.style.setProperty('--room-color',room.color);
    const label=document.createElement('span');label.className='lab-label';label.textContent=room.title;label.style.setProperty('--room-color',room.color);
    stage.append(button,outline,label);buttons[room.id]=button;labels[room.id]={label,outline};
    const input=inputs[room.id]={hover:false,pressed:false};
    button.addEventListener('pointerenter',e=>{input.hover=e.pointerType!=='touch';refresh()});
    button.addEventListener('pointerleave',()=>{input.hover=false;input.pressed=false;refresh()});
    button.addEventListener('pointerdown',()=>{input.pressed=true;refresh()});
    for(const event of ['pointerup','pointercancel','blur'])button.addEventListener(event,()=>{input.pressed=false;if(event==='blur')input.hover=false;refresh()});
    button.addEventListener('focus',()=>{input.hover=button.matches(':focus-visible');refresh()});
    button.addEventListener('click',()=>{opener=button;open(room.id)});
  }
  const nav=document.createElement('nav');nav.id='world-nav';nav.setAttribute('aria-label','Pokoje laboratorium');
  for(const [id,title] of [['monitor','ASCII'],...ROOMS.map(r=>[r.id,r.title]),['server','Kontakt']]){
    const button=document.createElement('button');button.type='button';button.textContent=title;button.dataset.destination=id;button.disabled=true;
    if(ROOMS.some(r=>r.id===id))button.style.setProperty('--room-color',ROOMS.find(r=>r.id===id).color);
    button.addEventListener('click',()=>{opener=button;open(id)});nav.append(button);
  }
  const surface=document.createElement('div');surface.id='lab-surface';surface.hidden=true;
  surface.setAttribute('role','img');
  function point(e){
    const rect=surface.getBoundingClientRect();
    pointer[0]=(e.clientX-rect.left)/rect.width*2-1;pointer[1]=1-(e.clientY-rect.top)/rect.height*2;refresh();
  }
  surface.addEventListener('pointermove',point,{passive:true});
  surface.addEventListener('pointerdown',e=>{point(e);surface.setPointerCapture(e.pointerId)});
  for(const name of ['pointerleave','pointerup','pointercancel'])surface.addEventListener(name,()=>{pointer.fill(-10);refresh()});
  const panel=document.createElement('section');panel.id='lab-panel';panel.inert=true;panel.setAttribute('aria-hidden','true');panel.setAttribute('aria-labelledby','lab-title');
  panel.innerHTML=`
    <header class="lab-toolbar"><button id="lab-back" type="button">← Wróć do świata</button><span id="lab-connection">Połączono z JP</span></header>
    <div class="lab-scroll">
      <div class="lab-heading"><h1 id="lab-title"></h1><p id="lab-description"></p></div>
      <div class="lab-workspace"><div id="lab-preview-slot"></div><div class="lab-controls">
      <section data-lab="gallery" hidden>
        <button id="project-select" type="button" aria-expanded="false" aria-controls="project-detail">JP Creative Lab <span>Otwórz case study</span></button>
        <article id="project-detail" hidden><h2 id="project-title"></h2><p id="project-description"></p><h3>Pomysł</h3><p id="project-idea"></p><h3>Co działa</h3><ul id="project-features"></ul><p id="project-stack"></p><a id="project-repository" target="_blank" rel="noopener noreferrer">Zobacz kod na GitHubie ↗</a></article>
      </section>
      <section data-lab="particles" hidden>
        <fieldset><legend>Układ cząsteczek</legend><div class="lab-options" data-modes="particleMode"><button type="button" data-value="orbit" aria-pressed="true">Orbita</button><button type="button" data-value="jp" aria-pressed="false">JP</button><button type="button" data-value="wave" aria-pressed="false">Fala</button></div></fieldset>
        <label class="lab-range">Siła <output for="particle-strength">1.00</output><input id="particle-strength" type="range" min="0" max="2" step=".05" value="1"></label>
        <p class="lab-note">Przesuń kursor lub przeciągnij palcem po chmurze. Punkty odsuną się od Ciebie.</p>
        <button type="button" id="particles-reset" class="lab-reset">Resetuj cząsteczki</button>
      </section>
      <section data-lab="materials" hidden>
        <fieldset><legend>Materiał rzeźby</legend><div class="lab-options" data-modes="material"><button type="button" data-value="chrome" aria-pressed="true">Chrom</button><button type="button" data-value="hologram" aria-pressed="false">Hologram</button><button type="button" data-value="wire" aria-pressed="false">Siatka</button></div></fieldset>
        <label class="lab-range">Kolor światła <output for="material-hue">0.10</output><input id="material-hue" type="range" min="0" max="1" step=".01" value=".1"></label>
        <label class="lab-range">Deformacja <output for="material-deformation">0.35</output><input id="material-deformation" type="range" min="0" max="1" step=".01" value=".35"></label>
        <p class="lab-note">Jedna rzeźba, trzy sposoby widzenia. Refleksy, skanowanie i krawędzie powstają bez tekstur.</p>
        <button type="button" id="materials-reset" class="lab-reset">Resetuj materiał</button>
      </section>
      <section data-lab="sound" hidden>
        <div id="sequencer" aria-label="Ośmiokrokowy sekwencer"></div>
        <div class="sound-transport"><button type="button" id="sound-start">Start</button><button type="button" id="sound-mute" aria-pressed="false">Wycisz</button></div>
        <label class="lab-range">Tempo <output for="sound-bpm">110 BPM</output><input id="sound-bpm" type="range" min="60" max="160" value="110"></label>
        <label class="lab-range">Głośność <output for="sound-volume">27%</output><input id="sound-volume" type="range" min="0" max=".3" step=".01" value=".08"></label>
        <p id="sound-status" class="lab-note" role="status">Dźwięk jest wyłączony. Włącz Start, żeby posłuchać.</p>
      </section>
      <p id="lab-error" role="status" hidden></p>
      </div></div>
    </div>`;
  panel.querySelector('#lab-preview-slot').replaceWith(surface);
  stage.append(panel,nav);
  panel.querySelector('.lab-scroll').addEventListener('scroll',refresh,{passive:true});
  panel.querySelector('.lab-controls').addEventListener('scroll',refresh,{passive:true});
  const $=selector=>panel.querySelector(selector);
  const project=PROJECTS[0];
  for(const key of ['title','description','idea'])$('#project-'+key).textContent=project[key];
  $('#project-stack').textContent=project.technologies.join(' · ');$('#project-repository').href=project.repository;
  for(const text of project.features){const li=document.createElement('li');li.textContent=text;$('#project-features').append(li)}
  function selectProject(){
    $('#project-detail').hidden=false;$('#project-select').setAttribute('aria-expanded','true');
  }
  $('#project-select').addEventListener('click',selectProject);
  $('#lab-back').addEventListener('click',close);
  for(const group of panel.querySelectorAll('[data-modes]'))group.addEventListener('click',e=>{
    const button=e.target.closest('[data-value]');if(!button)return;
    state[group.dataset.modes]=button.dataset.value;syncModes();refresh();
  });
  function syncModes(){
    for(const group of panel.querySelectorAll('[data-modes]'))for(const button of group.querySelectorAll('button'))button.setAttribute('aria-pressed',String(state[group.dataset.modes]===button.dataset.value));
  }
  function range(id,value,set,format=n=>n.toFixed(2)){
    const input=$('#'+id),output=$(`output[for="${id}"]`);
    input.value=value;output.textContent=format(value);
    input.addEventListener('input',()=>{set(Number(input.value));output.textContent=format(Number(input.value));refresh()});
  }
  range('particle-strength',1,n=>state.strength=n);
  range('material-hue',.1,n=>state.hue=n);range('material-deformation',.35,n=>state.deformation=n);
  range('sound-bpm',110,n=>seq.setTempo(n),n=>n+' BPM');
  range('sound-volume',.08,n=>seq.setVolume(n),n=>Math.round(n/.3*100)+'%');
  function resetRange(id,value){const input=$('#'+id);input.value=value;input.dispatchEvent(new Event('input'))}
  $('#particles-reset').addEventListener('click',()=>{state.particleMode='orbit';resetRange('particle-strength',1);syncModes();pointer.fill(-10);refresh()});
  $('#materials-reset').addEventListener('click',()=>{state.material='chrome';resetRange('material-hue',.1);resetRange('material-deformation',.35);syncModes();refresh()});
  const stepButtons=[];
  for(let track=0;track<2;track++){
    const row=document.createElement('div');row.className='sequence-row';const name=document.createElement('span');name.textContent=track===0?'Stopa':'Hi-hat';row.append(name);
    for(let step=0;step<8;step++){
      const button=document.createElement('button');button.type='button';button.textContent=String(step+1);
      button.setAttribute('aria-label',`${name.textContent}, krok ${step+1}`);button.setAttribute('aria-pressed',String(seq.patterns[track][step]));
      button.addEventListener('click',()=>{seq.toggle(track,step);button.setAttribute('aria-pressed',String(seq.patterns[track][step]));refresh()});
      row.append(button);stepButtons.push(button);
    }
    $('#sequencer').append(row);
  }
  function syncSound(){
    $('#sound-start').textContent=seq.state.playing?'Stop':'Start';panel.dataset.playing=String(seq.state.playing);
    $('#sound-status').textContent=seq.state.error|| (seq.state.playing?'Rytm działa lokalnie. Wyjście z pokoju zatrzyma dźwięk.':'Dźwięk jest wyłączony. Włącz Start, żeby posłuchać.');
  }
  $('#sound-start').addEventListener('click',async()=>{
    if(seq.state.playing)seq.stop();else{
      $('#sound-start').disabled=true;await seq.start();$('#sound-start').disabled=false;
      if(active!=='sound'||document.hidden)seq.stop();
    }
    syncSound();refresh();
  });
  $('#sound-mute').addEventListener('click',()=>{seq.setMuted(!seq.state.muted);$('#sound-mute').setAttribute('aria-pressed',String(seq.state.muted));refresh()});
  function stop(){seq.stop();syncSound()}
  let navOverview=null,panelKey='',roomKeys=new Map(),soundStep=-2;
  function update({overview,target,amount,now,reduced,project,projectionKey}){
    const show=amount===1&&ROOMS.some(r=>r.id===target);
    if(active&&(!show||active!==target))stop();
    active=show?target:null;
    if(navOverview!==overview){
      nav.hidden=!overview;
      for(const b of nav.querySelectorAll('button'))b.disabled=!overview;
      navOverview=overview;
    }
    for(const definition of ROOMS){
      const room=layout?.room(definition.id)||definition;
      const input=inputs[room.id],pose=poses[room.id],button=buttons[room.id];
      stepRoomMotion(pose,overview?input:{hover:false,pressed:false},(now-last)/1000,reduced);
      if(!overview){Object.assign(pose,{lift:0,velocity:0,scale:1,glow:0});input.hover=false;input.pressed=false;}
      const roomKey=projectionKey===undefined?null:`${projectionKey}:${room.center}:${overview}:${target}:${amount>0}`;
      if(roomKey===null||roomKeys.get(room.id)!==roomKey){
        button.dataset.center=room.center.join(',');
        const hull=roomHull(roomCorners(room).map(project));
        button.style.clipPath='polygon('+hull.map(p=>p.map(v=>v.toFixed(2)+'px').join(' ')).join(',')+')';
        labels[room.id].outline.querySelector('polygon').setAttribute('points',hull.map(p=>p.join(',')).join(' '));
        button.disabled=!overview;button.setAttribute('aria-expanded',String(target===room.id&&amount>0));
        const p=project([room.center[0],-.7,room.center[2]+2.7]);
        Object.assign(labels[room.id].label.style,{left:p[0]+'px',top:p[1]+'px'});labels[room.id].label.hidden=!overview;
        roomKeys.set(room.id,roomKey);
      }
    }
    last=now;
    const nextPanelKey=`${show}:${target}:${innerWidth}:${innerHeight}`;
    if(nextPanelKey!==panelKey){
      panel.dataset.open=String(show);panel.inert=!show;panel.setAttribute('aria-hidden',String(!show));
      surface.hidden=!(show&&target!=='gallery');
      if(show){
        const room=ROOMS.find(r=>r.id===target);panel.style.setProperty('--room-color',room.color);
        const frame=labMonitorFrame(innerWidth,innerHeight);
        Object.assign(panel.style,{left:frame.left+'px',top:frame.top+'px',width:frame.width+'px',height:frame.height+'px'});
        panel.dataset.room=target;
        $('#lab-connection').textContent=room.subtitle;
        surface.setAttribute('aria-label',target==='particles'?'Podgląd cząsteczek 3D':target==='materials'?'Podgląd materiału 3D':'Wizualizacja rytmu');
        $('#lab-title').textContent=room.title;$('#lab-description').textContent={
          gallery:'Jeden prawdziwy projekt. Otwórz ekran i zajrzyj pod obudowę.',
          particles:`${innerWidth<700?'750':'2000'} punktów. Trzy różne zachowania.`,
          materials:'Światło zapisane w kodzie.',
          sound:'Ułóż własny rytm. Dźwięk zaczyna się od Ciebie.',
        }[target];
        for(const section of panel.querySelectorAll('[data-lab]'))section.hidden=section.dataset.lab!==target;
      }
      panelKey=nextPanelKey;
    }
    if(show){
      const step=seq.currentStep();
      if(step!==soundStep){stepButtons.forEach((b,i)=>b.dataset.current=String(i%8===step));soundStep=step}
    }
    if(show&&!wasShown)$('#lab-back').focus({preventScroll:true});
    wasShown=show;
  }
  return{state,seq,poses,pointer,buttons,update,stop,
    viewport(){
      if(!active||active==='gallery')return null;
      const r=surface.getBoundingClientRect(),scroll=panel.querySelector('.lab-scroll').getBoundingClientRect();
      const left=Math.max(r.left,scroll.left,0),top=Math.max(r.top,scroll.top,0),right=Math.min(r.right,scroll.right,innerWidth),bottom=Math.min(r.bottom,scroll.bottom,innerHeight);
      return right>left&&bottom>top?{left:r.left,top:r.top,width:r.width,height:r.height,clip:{left,top,width:right-left,height:bottom-top}}:null;
    },
    get opener(){return opener},
    moving(){return Object.entries(poses).some(([id,p])=>Math.abs(p.velocity)>.001||Math.abs(p.lift-(inputs[id].hover?.16:0))>.0001)},
    error(message){$('#lab-error').hidden=false;$('#lab-error').textContent=message},
    dispose(){seq.dispose()},
  };
}
