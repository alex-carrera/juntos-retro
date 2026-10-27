import { RETRO_COLUMNS } from '../shared/retro.js';
import { newRound, remainingRoundMs, tickRetroRound } from '../shared/retro-round.js';
import { createRoundAudio, RETRO_TRACKS } from './retro-audio.js';

export function mountRetroSession(root,{getState,getNow,dispatch,onChange}){
  root.innerHTML=`<div class="round-summary"><div><span class="eyebrow">UN PUNTO A LA VEZ</span><h2 id="round-title"></h2><p id="round-status" role="status"></p></div><div class="round-clock-wrap"><output class="round-clock" id="round-clock" role="timer" aria-live="off" aria-label="Tiempo restante para escribir">05:00</output><span>minutos para escribir</span></div></div><div class="round-steps" aria-label="Recorrido de la retro">${RETRO_COLUMNS.map((c,i)=>`<span data-round-step="${i}"><i>${i+1}</i>${c.title}</span>`).join('')}</div><div class="round-bottom"><div class="round-controls" id="round-controls"></div><div class="round-sound"><button class="secondary" id="round-audio" aria-pressed="false">♫ Activar música</button><label for="round-volume">Volumen <input id="round-volume" type="range" min="0" max="100" step="1" value="25"/><output id="round-volume-value" for="round-volume">25%</output></label></div></div><p class="round-audio-status" id="round-audio-status" role="status">Toca Activar música una vez para escuchar los bloques desde esta página.</p><details class="round-credits"><summary>Créditos de música · Kevin MacLeod · CC BY 4.0</summary><p>Dream Culture, Meditation Impromptu 01 y Easy Lemon, de <a href="https://incompetech.com" target="_blank" rel="noopener noreferrer">Kevin MacLeod (incompetech.com)</a>. Archivos sin modificar, reproducidos en bucle durante la escritura. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Licencia CC BY 4.0</a>.</p><p>${RETRO_TRACKS.map(t=>`<a href="https://incompetech.com/music/royalty-free/index.html?isrc=${t.isrc}" target="_blank" rel="noopener noreferrer">${t.title}</a>`).join(' · ')}</p></details>`;
  const $=s=>root.querySelector(s),text=(s,value)=>{const el=$(s);if(el.textContent!==value)el.textContent=value;};
  let connected=true,controlKey='',expiredKey='',audioState={enabled:false,playing:false,needsGesture:false,volume:.25,error:''},destroyed=false;
  const music=createRoundAudio(getNow,state=>{audioState=state;renderAudio();});
  $('#round-volume').value=Math.round(music.volume*100);text('#round-volume-value',Math.round(music.volume*100)+'%');
  $('#round-volume').oninput=e=>music.setVolume(Number(e.target.value)/100);
  $('#round-audio').onclick=()=>{if(audioState.enabled&&!audioState.needsGesture)music.silence();else music.activate();};
  $('#round-controls').onclick=e=>{
    const button=e.target.closest('[data-round-command]');if(!button)return;
    button.disabled=true;
    if(button.dataset.roundCommand==='start'&&!audioState.enabled)music.activate();
    dispatch({type:'retro-timer',command:button.dataset.roundCommand});
  };
  function renderAudio(){
    if(destroyed)return;
    const b=getState().retro,r=b.round;
    $('#round-audio').setAttribute('aria-pressed',String(audioState.enabled));
    text('#round-audio',audioState.needsGesture?'♫ Reactivar música':audioState.enabled?'♫ Silenciar música':'♫ Activar música');
    text('#round-audio-status',audioState.error||(!connected?'Sin conexión: música detenida hasta reconectar.':audioState.needsGesture?'Toca Reactivar música para continuar el sonido en este dispositivo.':audioState.loading?'Cargando la pista de este bloque…':audioState.playing?`Sonando aquí: ${RETRO_TRACKS[r?.column||0].title} · se detendrá al llegar a cero.`:audioState.enabled?'Sonido activado. La música acompaña solo los cinco minutos de escritura.':'Toca Activar música una vez para escuchar los bloques desde esta página.'));
    $('#round-volume').value=Math.round(audioState.volume*100);text('#round-volume-value',Math.round(audioState.volume*100)+'%');
  }
  function update(){
    const b=getState().retro,r=b.round||newRound(false),host=getState().hostId===getState().selfId,left=remainingRoundMs(r,getNow());
    const mode=r.mode==='running'&&left<=0?'discuss':r.mode;
    const messages={ready:'Inicien cinco minutos para escribir. Al terminar, la música se detiene y conversan.',running:'Escriban en la columna resaltada. Los demás puntos tendrán su propio turno.',paused:'Cronómetro y música en pausa. Los borradores se conservan.',discuss:'Tiempo de conversar. Revisen las tarjetas sin música y avancen cuando el equipo esté listo.',complete:'Ya recorrieron los tres puntos. Ahora pueden votar y acordar acciones.'};
    text('#round-title',b.phase==='write'?`Punto ${r.column+1} de 3 · ${RETRO_COLUMNS[r.column].title}`:'Escritura terminada · sigamos conversando');
    text('#round-status',!connected?'Reconectando con el equipo. El reloj compartido sigue en el servidor.':b.phase!=='write'?'La música está detenida. Pueden votar, revisar ideas y acordar responsables.':!r.enabled?'Pueden escribir libremente o iniciar el recorrido de cinco minutos por punto.':messages[mode]);
    const seconds=b.phase==='write'?Math.ceil(left/1000):0;text('#round-clock',String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'));
    root.dataset.mode=b.phase==='write'?mode:'complete';
    root.querySelectorAll('[data-round-step]').forEach(el=>{const i=Number(el.dataset.roundStep);el.classList.toggle('current',b.phase==='write'&&i===r.column);el.classList.toggle('past',b.phase!=='write'||i<r.column);if(b.phase==='write'&&i===r.column)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    const key=[b.phase,mode,r.column,host,connected].join(':');
    if(controlKey!==key){
      controlKey=key;let html='';
      if(b.phase==='write'&&host){
        if(['ready','paused','discuss'].includes(mode))html+=`<button class="primary" data-round-command="start" ${connected?'':'disabled'}>${mode==='paused'?'Reanudar':mode==='discuss'?'Otros 5 minutos':'Empezar 5 minutos'} →</button>`;
        if(mode==='running')html+=`<button class="secondary" data-round-command="pause" ${connected?'':'disabled'}>Ⅱ Pausar</button>`;
        if(['running','paused'].includes(mode))html+=`<button class="ghost" data-round-command="discuss" ${connected?'':'disabled'}>Pasar a discutir</button>`;
        if(mode==='discuss')html+=`<button class="secondary" data-round-command="next" ${connected?'':'disabled'}>${r.column===2?'Pasar a votación':'Siguiente punto'} →</button>`;
      }else if(b.phase==='write')html='<span>Quien facilita controla los bloques del equipo.</span>';
      $('#round-controls').innerHTML=html;
    }
    music.sync(b.phase==='write'?r:null,connected);renderAudio();
  }
  function pulse(){
    const b=getState().retro;
    if(b.persistence==='demo'&&tickRetroRound(b,getNow()))onChange();
    const key=b.round?.mode==='running'&&remainingRoundMs(b.round,getNow())<=0?b.round.run+':expired':'';
    if(key&&key!==expiredKey){expiredKey=key;onChange();}
    update();
  }
  const timer=setInterval(pulse,250);
  const visible=()=>{if(!document.hidden){pulse();}};document.addEventListener('visibilitychange',visible);
  return {update,onError(){controlKey='';update();},setConnected(value){connected=value;update();},destroy(){destroyed=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);music.destroy();root.innerHTML='';}};
}
