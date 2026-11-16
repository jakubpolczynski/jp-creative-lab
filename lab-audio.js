/** Local two-track synthesis. Audio time owns the clock; RAF only visualizes it. */
export function createSequencer(options={}){
  const Context=options.AudioContext??globalThis.AudioContext??globalThis.webkitAudioContext;
  const repeat=options.setInterval??globalThis.setInterval,cancel=options.clearInterval??globalThis.clearInterval;
  const patterns=[[true,false,false,false,true,false,false,false],[false,true,false,true,false,true,false,true]];
  const state={playing:false,bpm:110,volume:.08,muted:false,scheduled:0,error:''};
  let context=null,master=null,noise=null,timer=null,epoch=0,pending=null,nextTime=0,nextStep=0;
  const sources=new Set(),timeline=[];
  function volume(){
    if(!context)return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(master.gain.value,context.currentTime);
    master.gain.linearRampToValueAtTime(state.playing&&!state.muted?state.volume:0,context.currentTime+.02);
  }
  function voice(track,time){
    const gain=context.createGain(),source=track===0?context.createOscillator():context.createBufferSource();
    let highpass=null;
    if(track===0){
      source.frequency.setValueAtTime(145,time);source.frequency.exponentialRampToValueAtTime(42,time+.18);
      source.connect(gain);
    }else{
      source.buffer=noise;highpass=context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=6500;
      source.connect(highpass);highpass.connect(gain);
    }
    const end=time+(track===0?.26:.065);
    gain.gain.setValueAtTime(.001,time);gain.gain.exponentialRampToValueAtTime(track===0?.9:.22,time+.004);
    gain.gain.exponentialRampToValueAtTime(.001,end);gain.connect(master);
    sources.add(source);source.addEventListener('ended',()=>{sources.delete(source);source.disconnect();gain.disconnect();highpass?.disconnect();},{once:true});
    source.start(time);source.stop(end+.01);
  }
  function schedule(){
    if(!state.playing||context.state!=='running')return;
    // Do not replay an accumulated backlog after a blocked main thread.
    if(nextTime<context.currentTime-.1)nextTime=context.currentTime+.02;
    while(nextTime<context.currentTime+.12){
      for(let track=0;track<2;track++)if(patterns[track][nextStep])voice(track,nextTime);
      timeline.push({step:nextStep,time:nextTime});state.scheduled++;
      nextStep=(nextStep+1)%8;nextTime+=60/state.bpm/2;
    }
    while(timeline.length>1&&timeline[1].time<context.currentTime-1)timeline.shift();
  }
  function stop(){
    epoch++;state.playing=false;
    if(timer!==null){cancel(timer);timer=null;}
    timeline.length=0;volume();
    for(const source of sources){try{source.stop(context.currentTime+.025)}catch{}}
    sources.clear();
    // Suspend after the gain ramp; no queued synth notes can sound on re-entry.
    if(context?.state==='running')context.suspend().catch(()=>{});
  }
  async function start(){
    if(state.playing)return true;
    if(pending)return pending;
    const token=++epoch;
    pending=Promise.resolve().then(async()=>{
      try{
        if(token!==epoch)return false;
        if(!Context)throw Error('Ta przeglądarka nie obsługuje Web Audio.');
        if(!context){
          context=new Context();master=context.createGain();master.gain.value=0;master.connect(context.destination);
          noise=context.createBuffer(1,Math.ceil(context.sampleRate*.1),context.sampleRate);
          const samples=noise.getChannelData(0);
          for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
        }
        await context.resume();
        if(token!==epoch){if(!state.playing)await context.suspend();return false;}
        state.playing=true;state.error='';nextStep=0;nextTime=context.currentTime+.03;volume();schedule();
        timer=repeat(schedule,25);return true;
      }catch(error){state.error=error.message;stop();return false;}
      finally{pending=null;}
    });
    return pending;
  }
  return {
    state,patterns,start,stop,
    get context(){return context},
    setTempo(value){const n=Number(value);state.bpm=Math.max(60,Math.min(160,Number.isFinite(n)?n:110))},
    setVolume(value){const n=Number(value);state.volume=Math.max(0,Math.min(.3,Number.isFinite(n)?n:.08));volume()},
    setMuted(value){state.muted=Boolean(value);volume()},
    toggle(track,step){if(patterns[track]&&step>=0&&step<8)patterns[track][step]=!patterns[track][step]},
    currentStep(){if(!state.playing)return-1;return timeline.findLast(p=>p.time<=context.currentTime)?.step??-1},
    pulse(){if(!state.playing)return 0;const last=timeline.findLast(p=>p.time<=context.currentTime);return last?Math.max(0,1-(context.currentTime-last.time)*7):0},
    dispose(){stop();master?.disconnect();context?.close().catch(()=>{});},
  };
}
