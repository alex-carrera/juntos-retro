// Ambient music synthesized here: no recordings, samples or external tracks.
export function createRetroMusic(onChange=()=>{}){
  let context=null,master=null,timer=null,nextChord=0,nextMelody=0,chord=0,note=0;
  let enabled=false,disposed=false,volume=.25;
  const voices=new Set(),progression=[[48,55,60,64],[45,52,57,60],[53,60,65,69],[43,50,55,62]];
  const melody=[76,79,81,79,74,72,76,74,69,72,76,79];
  try{const saved=localStorage.getItem('tier3-retro-volume');if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
  const report=()=>onChange({playing:enabled&&context?.state==='running',enabled,volume});
  const gainValue=()=>volume*.22;

  function voice(midi,start,duration,level){
    const oscillator=context.createOscillator(),envelope=context.createGain();
    oscillator.type='sine';oscillator.frequency.value=440*2**((midi-69)/12);
    envelope.gain.setValueAtTime(0,start);
    envelope.gain.linearRampToValueAtTime(level,start+Math.min(2.5,duration/3));
    envelope.gain.setValueAtTime(level,start+duration*.55);
    envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(envelope);envelope.connect(master);
    voices.add(oscillator);
    oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
    oscillator.start(start);oscillator.stop(start+duration+.05);
  }
  function schedule(){
    if(!enabled||context.state!=='running')return;
    const horizon=context.currentTime+2;
    while(nextChord<horizon){
      progression[chord++%progression.length].forEach((midi,i)=>voice(midi,nextChord+i*.17,16,.12));
      nextChord+=12;
    }
    while(nextMelody<horizon){
      voice(melody[note++%melody.length],nextMelody,5,.085);
      nextMelody+=6;
    }
  }
  function initialise(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw new Error('Este navegador no permite reproducir el ambiente musical.');
    context=new Audio();master=context.createGain();master.gain.value=0;
    const reverb=context.createConvolver(),wet=context.createGain();wet.gain.value=.32;
    const length=Math.ceil(context.sampleRate*3.5),impulse=context.createBuffer(2,length,context.sampleRate);
    for(let channel=0;channel<2;channel++){
      const samples=impulse.getChannelData(channel);
      for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*(1-i/length)**3;
    }
    reverb.buffer=impulse;master.connect(context.destination);master.connect(reverb);reverb.connect(wet);wet.connect(context.destination);
    context.onstatechange=()=>{if(disposed)return;if(context.state==='running')schedule();report();};
  }
  async function play(){
    if(disposed)return;
    try{
      if(!context)initialise();
      await context.resume();
      if(disposed)return;
      if(context.state!=='running')throw new Error('Toca Música de nuevo para activar el audio.');
      enabled=true;
      if(!nextChord){nextChord=context.currentTime+.1;nextMelody=context.currentTime+3;}
      master.gain.setTargetAtTime(gainValue(),context.currentTime,.6);
      schedule();clearInterval(timer);timer=setInterval(schedule,1000);report();
    }catch(error){enabled=false;report();throw error;}
  }
  async function pause(){
    enabled=false;clearInterval(timer);timer=null;
    if(context&&context.state!=='closed')await context.suspend();
    report();
  }
  function setVolume(value){
    volume=Math.max(0,Math.min(1,Number(value)||0));
    try{localStorage.setItem('tier3-retro-volume',String(volume));}catch{}
    if(context&&master)master.gain.setTargetAtTime(gainValue(),context.currentTime,.15);
    report();
  }
  function visibility(){
    if(!enabled||!context)return;
    if(document.hidden)context.suspend().catch(()=>{});
    else context.resume().catch(()=>{enabled=false;report();});
  }
  document.addEventListener('visibilitychange',visibility);
  return {
    play,pause,setVolume,get volume(){return volume;},
    destroy(){
      disposed=true;enabled=false;clearInterval(timer);document.removeEventListener('visibilitychange',visibility);
      for(const oscillator of voices){try{oscillator.stop();}catch{}}
      voices.clear();
      if(context){context.onstatechange=null;context.close().catch(()=>{});}
    }
  };
}
