import { ROUND_MS, remainingRoundMs } from '../shared/retro-round.js';

export const RETRO_TRACKS=[
  {title:'Dream Culture',file:'dream-culture.mp3',isrc:'USUAN1300046'},
  {title:'Meditation Impromptu 01',file:'meditation-impromptu-01.mp3',isrc:'USUAN1100163'},
  {title:'Easy Lemon',file:'easy-lemon.mp3',isrc:'USUAN1200076'},
];

// A resumed AudioContext lets phones play later blocks without opening another app.
// Each buffer source has an audio-clock stop, so background timer throttling cannot
// leave music playing after the shared writing deadline.
export function createRoundAudio(getNow,onChange){
  let context=null,gain=null,source=null,sourceKey='',sourceTime=0,sourceElapsed=0;
  let enabled=false,disposed=false,volume=.25,desired=null,connected=true;
  let cached=null,loading=null,generation=0,error='';
  try{const v=localStorage.getItem('tier3-retro-volume');if(v!==null&&Number.isFinite(Number(v)))volume=Math.max(0,Math.min(1,Number(v)));}catch{}
  function report(){if(!disposed)onChange({enabled,playing:Boolean(source&&context?.state==='running'),needsGesture:enabled&&context?.state!=='running',loading:Boolean(loading),volume,error});}
  function stop(){const old=source;source=null;sourceKey='';if(old){old.onended=null;try{old.stop();}catch{}old.disconnect();}}
  function audible(){return enabled&&connected&&desired?.mode==='running'&&remainingRoundMs(desired,getNow())>0;}
  async function reconcile(){
    if(disposed)return;
    if(!audible()){stop();report();return;}
    if(context.state!=='running'){stop();report();return;}
    const index=desired.column,key=index+':'+desired.run;
    const left=remainingRoundMs(desired,getNow()),elapsed=ROUND_MS-left;
    if(source&&sourceKey===key&&Math.abs(sourceElapsed+(context.currentTime-sourceTime)*1000-elapsed)<1500)return;
    stop();
    if(cached?.index===index){
      source=context.createBufferSource();source.buffer=cached.buffer;source.loop=true;source.connect(gain);
      sourceKey=key;sourceElapsed=elapsed;sourceTime=context.currentTime;
      const playingSource=source;
      source.onended=()=>{if(source===playingSource){source=null;sourceKey='';report();}};
      source.start(context.currentTime,(elapsed/1000)%cached.buffer.duration);
      source.stop(context.currentTime+left/1000);
      error='';report();return;
    }
    if(loading?.index===index)return;
    const request=++generation;
    loading?.controller.abort();
    const controller=new AbortController();loading={index,controller};cached=null;error='';report();
    try{
      const url=new URL(`${(import.meta.env?.BASE_URL||'./')}audio/${RETRO_TRACKS[index].file}`,location.href);
      const response=await fetch(url,{signal:controller.signal});
      if(!response.ok)throw new Error('No se pudo descargar la pista.');
      const bytes=await response.arrayBuffer(),buffer=await context.decodeAudioData(bytes);
      if(disposed||request!==generation)return;
      cached={index,buffer};loading=null;await reconcile();
    }catch(e){
      if(disposed||request!==generation)return;
      loading=null;if(e.name!=='AbortError'){error='No pudimos cargar la música. Toca Activar música para reintentar.';enabled=false;}report();
    }
  }
  async function activate(){
    try{
      if(!context){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)throw new Error('Este navegador no puede reproducir la música.');
        context=new Audio();gain=context.createGain();gain.gain.value=volume;gain.connect(context.destination);
        context.onstatechange=()=>{if(!disposed){report();if(context.state==='running')reconcile();}};
      }
      await context.resume();if(disposed)return;
      enabled=true;error='';report();await reconcile();
    }catch(e){enabled=false;error=e.message||'Toca de nuevo para activar el sonido.';report();}
  }
  function sync(round,online=true){desired=round;connected=online;reconcile();}
  function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));try{localStorage.setItem('tier3-retro-volume',String(volume));}catch{}if(gain)gain.gain.setTargetAtTime(volume,context.currentTime,.1);report();}
  return {
    activate,sync,setVolume,get volume(){return volume;},
    silence(){enabled=false;stop();report();},
    destroy(){disposed=true;generation++;loading?.controller.abort();stop();if(context){context.onstatechange=null;context.close().catch(()=>{});}cached=null;}
  };
}
