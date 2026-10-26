import './style.css';
import QRCode from 'qrcode';
import { PALETTE, LEVELS, makePlayer, startLevel, stepRoom, publicRoom, FLOOR, hasStars } from '../shared/game.js';
import { avatarSVG } from './avatar.js';
import { createRenderer } from './renderer.js';
import { updateBot } from '../shared/bots.js';
import { openRetro, applyRetroAction } from '../shared/retro.js';
import { mountRetro } from './retro-board.js';

const app=document.querySelector('#app');
const params=new URLSearchParams(location.search);
let profile;
try{profile=JSON.parse(localStorage.getItem('juntos-profile')||'{}');}catch{profile={};}
profile={name:String(profile.name||'').slice(0,16),color:PALETTE.includes(profile.color)?profile.color:PALETTE[0],accessory:['ears','sprout','cap'].includes(profile.accessory)?profile.accessory:'ears'};
let state=null,ws=null,destroyRenderer=null,demo=null,demoTimer=null,reconnectTimer=null,connectionTimeout=null,pendingAction=null,screen='',renderKey='',retry=0,leaving=false,sound=false,audioCtx=null,lastStatus='',lastUnlocked=false,lastSpark=false;
let session;try{session=JSON.parse(sessionStorage.getItem('juntos-session')||'null');}catch{session=null;}
const input={left:false,right:false,jump:false,grip:false};
let boardUI=null;
function storedRetros(){try{return JSON.parse(localStorage.getItem('tier3-retro-history')||'[]').filter(b=>b.id&&b.key);}catch{return [];}}
function fragmentRetro(){const value=new URLSearchParams(location.hash.slice(1)).get('retro')||'',dot=value.indexOf('.');return dot>0?{id:value.slice(0,dot),key:value.slice(dot+1)}:null;}
let archiveRef=fragmentRetro();
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
function saveProfile(){try{localStorage.setItem('juntos-profile',JSON.stringify(profile));}catch{}}
function toast(message){$('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.role='status';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),6500);}
function send(msg){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));}
function tickSound(kind='spark'){
  if(!sound)return;
  try{audioCtx||=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const now=audioCtx.currentTime;
    const notes=kind==='win'?[392,494,587,784]:kind==='open'?[392,523,659]:[660,880];
    notes.forEach((freq,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(0,now+i*.1);g.gain.linearRampToValueAtTime(.08,now+i*.1+.015);g.gain.exponentialRampToValueAtTime(.001,now+i*.1+.23);o.start(now+i*.1);o.stop(now+i*.1+.25);});
  }catch{}
}
function header(){return `<header class="header"><a href="${location.pathname}" class="brand" aria-label="Soporte Tier 3 Retro, inicio"><span class="brand-icon"><i></i><i></i></span><span class="brand-name">soporte tier <b>3</b><small>RETRO COOPERATIVA</small></span></a><div class="header-meta"><span>Pequeñas aventuras, grandes equipos.</span><span class="microtag">SOPORTE EN EQUIPO</span></div></header>`;}
const footer=()=>`<footer class="footer"><span>La retro de <strong>Soporte Tier 3.</strong> Nadie se queda atrás.</span><span>Sin cuentas. Sin rankings. Solo equipo. ↗</span></footer>`;
function shell(content,mode=''){app.innerHTML=`<div class="wrap ${mode}">${header()}${content}${footer()}</div>`;$('.brand').addEventListener('click',e=>{if(state){e.preventDefault();confirmLeave();}});}
function clearGame(){destroyRenderer?.();destroyRenderer=null;boardUI=null;clearInterval(demoTimer);demoTimer=null;demo=null;resetInput();}
function landing(){
  clearGame();screen='home';renderKey='';state=null;app.className='';
  shell(`<main><section class="hero"><div class="hero-copy"><div class="eyebrow">SOPORTE TIER 3 · UNA PAUSA PARA CONECTAR</div><h1>La salida está<br>en hacerlo <em>juntos.</em></h1><p>Seis retos con cuerdas, caídas y rescates. Después, una retro squad para escribir y mejorar juntos.</p><div class="features"><span><b>♧</b> 2–7 jugadores</span><span><b>◷</b> 20–30 minutos</span><span><b>⌁</b> Desde tu navegador</span></div><div class="scene"><svg class="landscape" viewBox="0 0 500 250" fill="none" preserveAspectRatio="none"><path d="M0 216Q75 126 174 186T350 163T500 161V250H0Z" fill="#e7ebdc"/><path d="M0 230Q130 173 251 216T500 199V250H0Z" fill="#dce5cf"/><path d="M0 238Q210 221 500 231V250H0Z" fill="#cbd9b9"/><rect x="406" y="126" width="59" height="111" rx="29" fill="#c5d0b5"/><path d="M415 237V158A20 20 0 01455 158V237" fill="#98ad83"/><circle cx="435" cy="174" r="5" fill="#d7e4bf"/><path d="M344 234V193M322 198H363L370 187L363 178H322Z" stroke="#b9bb9c" stroke-width="3" fill="#eee9d5"/><path d="M333 188H356M350 183L356 188L350 193" stroke="#9ba686" stroke-width="2"/><path d="M55 236L49 224M55 236L61 221M290 236L284 224M290 236L296 221" stroke="#9eb485" stroke-width="2"/><circle cx="62" cy="219" r="3" fill="#e9c76e"/><path d="M100 56H159M111 47H145M249 86H290" stroke="#e6e8db" stroke-width="10" stroke-linecap="round"/></svg><div class="dashed-line">un equipo, muchas personalidades</div><div class="little-friends">${PALETTE.slice(0,5).map((c,i)=>`<span>${avatarSVG(c,['ears','sprout','cap','ears','sprout'][i],79)}</span>`).join('')}</div><div class="scene-note">aquí se llega en equipo ↗</div></div></div><div><form class="entry-card" id="entry-form"><div class="step-kicker">TU AVENTURA EMPIEZA AQUÍ <b>✳</b></div><h2>Primero, sé tú.</h2><p class="sub">Dale un poquito de personalidad a tu compañero.</p><div class="avatar-customizer"><div class="avatar-stage" id="avatar-preview">${avatarSVG(profile.color,profile.accessory,96)}</div><div class="avatar-options"><span class="field-label">Elige tu color</span><div class="swatches">${PALETTE.map((c,i)=>`<button type="button" class="swatch ${c===profile.color?'selected':''}" style="--swatch:${c}" data-color="${c}" aria-label="Color ${['coral','amarillo','verde','azul','lila','rosa','menta'][i]}" aria-pressed="${c===profile.color}"></button>`).join('')}</div><div class="accessories">${[['ears','Orejas'],['sprout','Brote'],['cap','Gorra']].map(([v,t])=>`<button type="button" class="accessory ${profile.accessory===v?'selected':''}" data-accessory="${v}" aria-pressed="${profile.accessory===v}">${t}</button>`).join('')}</div></div></div><label class="field-label" for="player-name">¿Cómo te llamas?</label><input id="player-name" autocomplete="nickname" maxlength="16" placeholder="Tu nombre o ese apodo del equipo" value="${safe(profile.name)}" required/><div class="field-hint"><span>Así te verá tu equipo.</span><span id="name-count">${profile.name.length}/16</span></div><button class="primary wide create-button" type="submit" id="create-room"><span>＋</span> Crear una sala <span class="arrow">→</span></button><div class="or">¿YA TIENES UNA INVITACIÓN?</div><div class="join-row"><input id="room-code" maxlength="5" aria-label="Código de sala" placeholder="Código de sala" autocomplete="off" value="${safe((params.get('sala')||'').replace(/[^a-z0-9]/gi,'').slice(0,5))}"/><button type="button" id="join-room" class="secondary">Unirme <span>↗</span></button></div><div class="privacy-note">♧ &nbsp; No necesitas registrarte. Solo venir con ganas.</div></form><button class="preview-link" id="try-demo">¿Quieres echar un vistazo? Prueba la demo local ↗</button></div></section><section class="chapters"><div class="chapters-head"><span>SEIS RETOS. UN MISMO EQUIPO.</span><span>El camino importa más que la meta.</span></div><div class="chapter-grid">${[['✧','UNIRSE',LEVELS[0].title,'Una cuerda. Dos compañeros. Mismo camino.'],['≋','RESISTIR',LEVELS[1].title,'La cinta arrastra: hay que sostenerse.'],['⇢','EMPUJAR',LEVELS[2].title,'Una cadena contra el viento.'],['↗','RESCATAR',LEVELS[3].title,'Caer, agarrar y volver a subir.'],['◉','COORDINAR',LEVELS[4].title,'Turnos sobre una cinta en movimiento.'],['✳','SINCRONIZAR',LEVELS[5].title,'Siete alturas y una sola cadena.']].map(([icon,tag,title,desc],i)=>`<article class="chapter"><div class="chapter-symbol">${icon}</div><div><div class="chapter-num">0${i+1} / ${tag}</div><h3>${title}</h3><p>${desc}</p></div></article>`).join('')}</div></section></main>`);
  $('#entry-form').addEventListener('submit',e=>{e.preventDefault();connectAction('create');});
  $('#join-room').onclick=()=>{if(!$('#entry-form').reportValidity())return;const code=$('#room-code').value.trim().toUpperCase();if(!/^[A-Z0-9]{5}$/.test(code))return toast('Escribe las cinco letras del código de sala.');connectAction('join',code);};
  $('#player-name').addEventListener('input',e=>{$('#name-count').textContent=`${e.target.value.length}/16`;profile.name=e.target.value;saveProfile();});
  document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{profile.color=b.dataset.color;updateAvatar();});
  document.querySelectorAll('[data-accessory]').forEach(b=>b.onclick=()=>{profile.accessory=b.dataset.accessory;updateAvatar();});
  $('#try-demo').onclick=startDemo;
  const historyButton=document.createElement('button');historyButton.className='preview-link';historyButton.textContent='Mis retrospectivas guardadas ↗';historyButton.onclick=showRetroHistory;$('#try-demo').after(historyButton);
  if(archiveRef){$('.entry-card h2').textContent='Tu squad te espera.';$('.entry-card .sub').textContent='Elige tu nombre para entrar al tablero compartido de retro.';$('#create-room').textContent='Entrar a la retrospectiva →';$('.join-row').hidden=true;$('.or').textContent='Acceso con el enlace privado de esta retro';}
}
function updateAvatar(){saveProfile();$('#avatar-preview').innerHTML=avatarSVG(profile.color,profile.accessory,96);document.querySelectorAll('[data-color]').forEach(b=>{const chosen=b.dataset.color===profile.color;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',chosen);});document.querySelectorAll('[data-accessory]').forEach(b=>{const chosen=b.dataset.accessory===profile.accessory;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',chosen);});}
function serverURL(){
  const configured=import.meta.env.VITE_MULTIPLAYER_URL;
  if(!configured && location.hostname.endsWith('.github.io'))throw new Error('Las salas en línea todavía no están disponibles. Mientras tanto, puedes probar la demo local.');
  const url=new URL(configured||location.origin);url.protocol=url.protocol==='https:'||url.protocol==='wss:'?'wss:':'ws:';url.pathname='/ws';url.search='';return url.href;
}
function archiveAction(){const remembered=storedRetros().find(b=>b.id===archiveRef.id);return {type:'open-archive',...archiveRef,memberToken:remembered?.memberToken,...profile};}
function connectAction(type,code){profile.name=$('#player-name').value.trim();if(!profile.name)return $('#player-name').focus();saveProfile();pendingAction=archiveRef?archiveAction():{type,code,...profile};busy(true);openSocket();}
function busy(value){document.querySelectorAll('#create-room,#join-room').forEach(b=>b.disabled=value);if($('#create-room'))$('#create-room').innerHTML=value?'Conectando con el equipo…':archiveRef?'Entrar a la retrospectiva →':'<span>＋</span> Crear una sala <span class="arrow">→</span>';}
function openSocket(){
  clearTimeout(reconnectTimer);clearTimeout(connectionTimeout);leaving=false;
  if(ws){ws.onclose=null;ws.close();}
  try{ws=new WebSocket(serverURL());}catch(e){busy(false);toast(e.message);return;}
  connectionTimeout=setTimeout(()=>{if(ws?.readyState===WebSocket.CONNECTING){ws.close();toast('El servidor tarda en despertar. Vuelve a intentar en un momento.');}},90000);
  ws.onopen=()=>{clearTimeout(connectionTimeout);retry=0;if(pendingAction){send(pendingAction);pendingAction=null;}else if(archiveRef){send(archiveAction());}else if(session){send({type:'resume',...session});}updateConnection(true);};
  ws.onmessage=e=>{
    let msg;try{msg=JSON.parse(e.data);}catch{return;}
    if(msg.type==='joined'){session={code:msg.code,token:msg.token};sessionStorage.setItem('juntos-session',JSON.stringify(session));const url=new URL(location.href);url.searchParams.set('sala',msg.code);history.replaceState(null,'',url);busy(false);}
    if(msg.type==='state'){state=msg.room;receiveState();}
    if(msg.type==='error'){busy(false);boardUI?.onError();toast(msg.message);if(!state){session=null;sessionStorage.removeItem('juntos-session');}}
    if(msg.type==='expired'){session=null;sessionStorage.removeItem('juntos-session');ws.onclose=null;ws.close();landing();toast(msg.message);}
    if(msg.type==='left')goHome();
  };
  ws.onclose=e=>{
    clearTimeout(connectionTimeout);updateConnection(false);resetInput();
    if(leaving||demo)return;
    if(e.code===4001){session=null;sessionStorage.removeItem('juntos-session');landing();return toast('La sesión está abierta en otra pestaña.');}
    if(session&&state){reconnectTimer=setTimeout(openSocket,Math.min(10000,1000*2**retry++));toast('Reconectando… Tu compañero te espera en la sala.');}
    else {busy(false);toast('No pudimos conectar. Comprueba tu conexión y vuelve a intentar.');}
  };
  ws.onerror=()=>{};
}
function updateConnection(connected){const el=$('#connection');if(el){el.textContent=connected?'En línea':'Reconectando…';el.style.color=connected?'':'#bd865d';}}
function receiveState(){
  if(state.status==='retro'){
    rememberRetro();const key='retro:'+state.retro.id;
    if(renderKey!==key){renderKey=key;renderRetro();tickSound('win');}
    boardUI.update();return;
  }
  const key=state.status==='lobby'?'lobby:'+JSON.stringify(state.players.map(p=>[p.id,p.ready,p.connected]))+state.hostId:'game:'+state.level;
  if(key!==renderKey){renderKey=key;if(state.status==='lobby')renderLobby();else renderGame();}
  if(state.status!=='lobby')updateGameUI();
  const me=state.players.find(p=>p.id===state.selfId);
  if(me?.spark&&!lastSpark)tickSound();
  if(state.unlocked&&!lastUnlocked)tickSound('open');
  if(['cleared','finished'].includes(state.status)&&lastStatus!==state.status)tickSound('win');
  lastStatus=state.status;lastUnlocked=state.unlocked;lastSpark=Boolean(me?.spark);
}
function retroURL(board=state.retro){const url=new URL(location.href);url.search='';url.hash='retro='+board.id+'.'+board.key;return url.href;}
function rememberRetro(){
  if(state.retro.persistence==='demo')return;
  archiveRef={id:state.retro.id,key:state.retro.key};
  const entries=storedRetros().filter(b=>b.id!==archiveRef.id);
  entries.unshift({...archiveRef,title:state.retro.title,createdAt:state.retro.createdAt,memberToken:session?.token});
  try{localStorage.setItem('tier3-retro-history',JSON.stringify(entries.slice(0,100)));}catch{}
  history.replaceState(null,'',retroURL());
}
function dispatchRetro(message){
  if(demo){try{applyRetroAction(demo,demo.players[0],message);state=publicRoom(demo,'you');receiveState();}catch(error){boardUI?.onError();toast(error.message);}}
  else send(message);
}
function renderRetro(){
  resetInput();destroyRenderer?.();destroyRenderer=null;clearInterval(demoTimer);screen='retro';
  shell('<main id="retro-page"></main>','retro-mode');
  boardUI=mountRetro($('#retro-page'),{getState:()=>state,dispatch:dispatchRetro,notify:toast,share:async()=>{if(demo)return toast('La demo no tiene enlace compartido. Crea una sala en línea para guardar una retro.');try{await navigator.clipboard.writeText(retroURL());toast('Enlace privado copiado. Quien lo tenga podrá participar en esta retro.');}catch{toast('Puedes copiar el enlace privado desde la barra del navegador.');}},leave:confirmLeave,showHistory:showRetroHistory});
}
function showRetroHistory(){
  const entries=storedRetros(),layer=document.createElement('div');layer.className='modal-layer';
  layer.innerHTML=`<div class="modal retro-history" role="dialog" aria-modal="true"><h2>Tus retrospectivas</h2><p>Estos son los enlaces que guardaste en este navegador. El historial de cada tablero está en la nube.</p><div class="history-list">${entries.map((b,i)=>`<button class="history-entry" data-history="${i}"><strong>${safe(b.title||'Retro Squad')}</strong><span>${safe(new Date(b.createdAt).toLocaleDateString('es',{timeZone:'America/Guayaquil'}))} · Abrir →</span></button>`).join('')||'<p>Aún no hay tableros guardados. Se añadirá el primero al abrir una retro en línea.</p>'}</div><button class="secondary" id="close-history">Cerrar</button></div>`;
  document.body.append(layer);layer.querySelector('#close-history').onclick=()=>layer.remove();
  layer.querySelectorAll('[data-history]').forEach(button=>button.onclick=()=>{
    const entry=entries[Number(button.dataset.history)];layer.remove();if(ws){ws.onclose=null;ws.close();}clearGame();state=null;renderKey='';archiveRef={id:entry.id,key:entry.key};history.replaceState(null,'',retroURL(entry));landing();if(profile.name||entry.memberToken){pendingAction=archiveAction();busy(true);openSocket();}
  });
}
function renderLobby(){
  destroyRenderer?.();destroyRenderer=null;screen='lobby';const me=state.players.find(p=>p.id===state.selfId),host=state.hostId===me.id;
  shell(`<main><div class="room-header"><div class="room-title"><div class="eyebrow">ANTES DE DAR EL PRIMER SALTO</div><h1 style="margin-top:10px">El equipo se está reuniendo.</h1><p>Elige tu lugar, saluda y avisa cuando estés listo.</p></div><span class="connection"><i class="online-dot"></i><span id="connection">En línea</span></span></div><div class="lobby-layout"><section class="panel"><div class="panel-heading"><span>Tu equipo</span><span>${state.players.length} / 7 compañeros</span></div><div class="player-grid">${state.players.map(p=>`<article class="player-card ${p.id===me.id?'me':''}">${state.hostId===p.id?'<span class="host-crown" title="Anfitrión">♔</span>':''}${avatarSVG(p.color,p.accessory,85)}<div class="player-name">${safe(p.name)}${p.id===me.id?' · tú':''}</div><div class="player-status ${p.ready&&p.connected?'ready':''}">${!p.connected?'○ Reconectando…':p.ready?'● Listo para saltar':'○ Preparándose'}</div></article>`).join('')}${Array.from({length:7-state.players.length},()=>`<div class="player-card empty"><span style="font-size:25px">＋</span><span>Un lugar para alguien</span></div>`).join('')}</div><div class="lobby-actions"><button class="secondary" id="ready-button">${me.ready?'✓ Estoy listo · cambiar':'Estoy listo ✓'}</button>${host?`<button class="primary" id="start-game" ${state.players.length<2||state.players.some(p=>!p.ready||!p.connected)?'disabled':''}>Empezar la aventura →</button>`:'<span style="font-size:11px;color:#989b8c;flex:1">El anfitrión iniciará cuando estén todos.</span>'}</div><p class="lobby-tip">${host?'Puedes esperar a que estén los siete. Todos deben marcar «Estoy listo» antes de comenzar.':'Mientras llega el equipo, busca tus auriculares o abre el audio de la retro para coordinarse.'}</p>${host&&state.players.some(p=>!p.connected)?'<button class="ghost" id="remove-offline">Liberar los lugares desconectados</button>':''}</section><aside class="panel invite-panel"><h3>Que no falte nadie.</h3><p>Comparte el enlace o escanea el QR para entrar desde otro dispositivo.</p><div class="qr-wrap"><canvas id="invite-qr" aria-label="QR de invitación"></canvas></div><div class="invite-code"><div class="room-code-label">CÓDIGO DE LA SALA</div><div class="room-code">${safe(state.code)}</div></div><button class="secondary wide" id="copy-link">Copiar invitación ↗</button><div class="howto"><b>Un par de cosas antes de empezar</b>↔ Moverse &nbsp; · &nbsp; Espacio para saltar · E para agarrar/frenar<br>En celular, usa los botones de la pantalla.<br>La voz va por su llamada de la retro.<br>Si alguien se desconecta, lo esperamos.</div></aside></div>${host?'<button class="ghost" id="lobby-retro">Ir directamente a la retro squad ↗</button>':''}<button class="ghost" id="leave-room" style="margin-bottom:20px">← Salir de la sala</button></main>`);
  $('#ready-button').onclick=()=>send({type:'ready',ready:!me.ready});$('#start-game')?.addEventListener('click',()=>send({type:'start'}));$('#leave-room').onclick=confirmLeave;$('#copy-link').onclick=copyInvite;
  $('#lobby-retro')?.addEventListener('click',()=>showModal('¿Abrimos la retro?', 'El equipo pasará al tablero compartido. Cada persona podrá escribir sus ideas y las notas se guardarán en el historial.', 'Abrir tablero',()=>act('open-retro')));
  $('#remove-offline')?.addEventListener('click',()=>send({type:'remove-offline'}));
  QRCode.toCanvas($('#invite-qr'),inviteURL(),{width:176,margin:2,color:{dark:'#526649',light:'#fffefa'}},()=>{});
}
function inviteURL(){const url=new URL(location.href);url.search='';url.searchParams.set('sala',state.code);return url.href;}
async function copyInvite(){try{await navigator.clipboard.writeText(inviteURL());toast('Invitación copiada. ¡Que venga el equipo!');}catch{const input=document.createElement('input');input.value=inviteURL();document.body.append(input);input.select();document.execCommand('copy');input.remove();toast('Enlace de la sala copiado.');}}
function renderGame(){
  destroyRenderer?.();destroyRenderer=null;screen='game';const l=LEVELS[state.level];
  shell(`<main>${demo?'<div class="demo-banner"><span>DEMO LOCAL · Tú + 6 compañeros automáticos. No es una sala en línea.</span><span><button id="demo-next">Ver siguiente nivel ↗</button> <button id="demo-retro">Ver tablero ↗</button></span></div>':''}<div class="game-top"><div class="game-title"><small>${l.tag}</small><h1>${l.title}</h1></div><div class="game-tools"><div class="level-pips">${LEVELS.map((_,i)=>`<i class="${i<=state.level?'active':''}"></i>`).join('')}</div><button class="ghost sound-button" id="sound" aria-label="Activar sonido" aria-pressed="false">♫</button><button class="ghost" id="fullscreen" aria-label="Pantalla completa">⛶</button><button class="ghost" id="restart-level">↺ Reiniciar</button><button class="ghost" id="game-retro">Retro ↗</button><button class="ghost" id="leave-game">Salir ↗</button></div></div><div class="board-wrap"><div class="game-canvas" id="game-canvas" role="img" aria-label="Escenario cooperativo. Usa las flechas y espacio para jugar."></div><div id="overlay-root"></div><div class="game-hint"><span id="objective">${l.subtitle}</span><b id="progress"></b></div></div><div class="touch-controls" aria-label="Controles táctiles"><div class="direction"><button class="touch-button" data-control="left" aria-label="Mover a la izquierda">←</button><button class="touch-button" data-control="right" aria-label="Mover a la derecha">→</button></div><div class="touch-actions"><button class="touch-button grip" data-control="grip">Agarrar ✊</button><button class="touch-button jump" data-control="jump">Saltar ↑</button></div></div><div class="team-strip" id="team-strip"></div><div class="game-bottom"><span class="keyboard-instructions"><kbd class="keyboard-key">←</kbd><kbd class="keyboard-key">→</kbd> o A / D para moverte &nbsp; <kbd class="keyboard-key">Espacio</kbd> para saltar · <kbd class="keyboard-key">E</kbd> agarrar / frenar</span><span>Sin prisa. Nadie se queda atrás. <span id="connection"></span></span></div></main>`,'game-mode');
  destroyRenderer=createRenderer('game-canvas',()=>state);
  $('#leave-game').onclick=confirmLeave;$('#restart-level').onclick=()=>{if(!isHost())return toast('El anfitrión puede reiniciar el nivel para todos.');showModal('¿Un nuevo intento?','El equipo volverá al inicio de este nivel. Las estrellas o botones de este intento se reiniciarán.','Reiniciar',()=>act('restart'));};
  $('#sound').onclick=()=>{sound=!sound;$('#sound').setAttribute('aria-pressed',sound);$('#sound').setAttribute('aria-label',sound?'Desactivar sonido':'Activar sonido');$('#sound').style.color=sound?'#e87752':'';if(sound)tickSound();};
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen();}catch{toast('Gira el celular para aprovechar mejor la pantalla.');}};
  $('#demo-next')?.addEventListener('click',()=>{startLevel(demo,(demo.level+1)%LEVELS.length);demo.players.forEach(p=>p.route=0);state=publicRoom(demo,'you');receiveState();});
  document.querySelectorAll('[data-control]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input[b.dataset.control]=true;b.classList.add('pressed');syncInput();});
    const release=e=>{e.preventDefault();input[b.dataset.control]=false;b.classList.remove('pressed');syncInput();};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
  });
  $('#demo-retro')?.addEventListener('click',()=>act('open-retro'));
  $('#game-retro').onclick=()=>{if(!isHost())return toast('Quien facilita puede abrir el tablero para todo el equipo.');showModal('¿Pasamos a la retro?', 'La aventura dará paso al tablero compartido de notas. Todos podrán participar en la misma sala.', 'Abrir tablero',()=>act('open-retro'));};
  updateGameUI();
}
function isHost(){return demo||state?.selfId===state?.hostId;}
let overlayKey='';
function updateGameUI(){
  if(!$('#progress'))return;
  const offline=state.players.filter(p=>!p.connected);
  $('#progress').textContent=state.unlocked?`En la salida: ${state.exitCount} / ${state.players.length}`:hasStars(state.level)&&state.level!==5?`${state.stars.filter(s=>s.collected).length} / ${state.players.length} chispas`:[1,5].includes(state.level)?`${state.plates.filter(p=>p.active).length} / ${state.players.length} botones${state.progress>0?' · '+Math.round(state.progress*100)+' %':''}`:state.level===4?`${state.relayStep} / ${state.players.length} relevos`: `${state.pushers} / ${state.requiredPushers} empujando · ${Math.round(state.progress*100)} %`;
  const relayPlayer=state.players.find(p=>p.id===state.relayOrder?.[state.relayStep]);
  $('#objective').textContent=state.unlocked?'¡La puerta está abierta! Reúnanse todos en la salida.':state.level===4?`Turno: ${relayPlayer?.name||''} · ${!state.relayArmed?'Sal de tu botón para volver a entrar.':state.signalOpen?'¡Verde! Entra y mantén tu botón.':'Espera fuera de tu botón hasta la luz verde.'}`:LEVELS[state.level].subtitle;
  const teamKey=JSON.stringify(state.players.map(p=>[p.id,p.connected,p.spark]));
  if($('#team-strip').dataset.key!==teamKey){$('#team-strip').dataset.key=teamKey;$('#team-strip').innerHTML=state.players.map(p=>`<span class="team-member ${p.id===state.selfId?'me':''}" style="--player-color:${p.color}"><i></i>${safe(p.name)}${p.id===state.selfId?' (tú)':''}${!p.connected?' ○':hasStars(state.level)&&p.spark?' ✓':''}</span>`).join('');}
  const nextKey=state.level+':'+state.status+':'+offline.map(p=>p.id).join(',')+':'+state.hostId;
  if(overlayKey===nextKey&&$('#overlay-root').dataset.rendered==='true')return;
  overlayKey=nextKey;$('#overlay-root').dataset.rendered='true';
  let content='';
  if(offline.length)content=`<div class="overlay-icon">☁</div><small>HACEMOS UNA PAUSA</small><h2>Esperamos al equipo.</h2><p>${offline.map(p=>safe(p.name)).join(', ')} está reconectando. La aventura sigue cuando vuelva.</p>${isHost()?'<button class="secondary" id="remove-offline-game">Continuar sin quienes se desconectaron</button>':''}`;
  else if(state.status==='cleared')content=`<div class="overlay-icon">✳</div><small>RETO ${state.level+1} COMPLETADO</small><h2>Así se hace equipo.</h2><p>${['Cada persona trajo su chispa. Ahora toca encontrar el mismo ritmo.','Encontraron el ritmo. Ahora toca sumar fuerzas.','¡Buen trabajo! A partir de aquí, el camino pide más precisión.','Confiaron en el equipo. Ahora toca escuchar de quién es el turno.','Pasaron todos los relevos. Queda el reto más alto.'][state.level]}</p>${isHost()?'<button class="primary" id="next-level">Vamos al siguiente →</button>':'<p>El anfitrión iniciará el próximo reto.</p>'}`;
  else if(state.status==='finished')content=`<div class="overlay-icon">✧</div><small>SEIS RETOS. UN EQUIPO.</small><h2>Así se mueve Tier 3.</h2><p>Llegaron ${state.players.length} de ${state.players.length}. Antes de volver a la retro:<br><strong>¿Qué hizo el equipo para que nadie se quedara atrás?</strong></p><div class="overlay-actions">${isHost()?'<button class="primary" id="return-lobby">Volver a reunirnos →</button>':'<span>Esperando al anfitrión…</span>'}<button class="secondary" id="end-home">Salir</button></div>`;
  $('#overlay-root').innerHTML=content?`<div class="game-overlay">${state.status==='finished'?`<div class="confetti">${Array.from({length:35},(_,i)=>`<i style="--x:${i*2.9}%;--confetti:${PALETTE[i%7]};--dur:${3+i%4}s;--delay:-${i*.3}s"></i>`).join('')}</div>`:''}<div class="overlay-content">${content}</div></div>`:'';
  $('#next-level')?.addEventListener('click',()=>act('next'));$('#return-lobby')?.addEventListener('click',()=>{if(demo)goHome();else act('lobby');});$('#end-home')?.addEventListener('click',confirmLeave);
  $('#remove-offline-game')?.addEventListener('click',()=>showModal('¿Continuar con este equipo?','Se liberarán los lugares desconectados y el nivel empezará de nuevo, adaptado a quienes quedan.','Continuar',()=>send({type:'remove-offline'})));
}
function act(type){if(demo){if(type==='open-retro'){openRetro(demo,{id:crypto.randomUUID(),key:Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join(''),persistence:'demo'});state=publicRoom(demo,'you');receiveState();return;}if(type==='next')startLevel(demo,demo.level+1);if(type==='restart')startLevel(demo,demo.level);demo.players.forEach(p=>p.route=0);state=publicRoom(demo,'you');receiveState();}else send({type});}
function showModal(title,description,button,onConfirm){resetInput();const layer=document.createElement('div');layer.className='modal-layer';layer.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${title}</h2><p>${description}</p><div class="modal-actions"><button class="ghost" id="cancel-modal">Cancelar</button><button class="primary" id="confirm-modal">${button}</button></div></div>`;document.body.append(layer);layer.querySelector('#cancel-modal').onclick=()=>layer.remove();layer.querySelector('#confirm-modal').onclick=()=>{layer.remove();onConfirm();};layer.querySelector('#cancel-modal').focus();}
function confirmLeave(){showModal(state?.status==='retro'?'¿Salimos de la retro?':'¿Salimos de la aventura?',state?.status==='retro'?(demo?'Esta es una demo local. Descarga las notas que quieras conservar antes de salir.':'Las notas guardadas seguirán en el historial. Puedes volver con el enlace privado de esta retro.'):'Si sales durante un reto, el equipo reiniciará ese nivel con quienes se queden.','Salir',()=>{if(demo)goHome();else{send({type:'leave'});goHome();}});}
function goHome(){leaving=true;clearTimeout(reconnectTimer);clearTimeout(connectionTimeout);if(ws){ws.onclose=null;ws.close();ws=null;}session=null;sessionStorage.removeItem('juntos-session');const url=new URL(location.href);url.search='';url.hash='';archiveRef=null;boardUI=null;history.replaceState(null,'',url);lastStatus='';lastSpark=false;lastUnlocked=false;overlayKey='';landing();}
function syncInput(){if(demo){const p=demo.players[0];p.input={...input};}else send({type:'input',...input});}
function resetInput(){input.left=false;input.right=false;input.jump=false;input.grip=false;syncInput();document.querySelectorAll('.touch-button.pressed').forEach(b=>b.classList.remove('pressed'));}
const keys={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'jump',e:'grip',E:'grip'};
window.addEventListener('keydown',e=>{if(screen!=='game'||$('.modal-layer')||!keys[e.key])return;e.preventDefault();if(!input[keys[e.key]]){input[keys[e.key]]=true;syncInput();}});
window.addEventListener('keyup',e=>{if(screen!=='game'||!keys[e.key])return;e.preventDefault();input[keys[e.key]]=false;syncInput();});
window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});

function startDemo(){
  leaving=true;if(ws){ws.onclose=null;ws.close();ws=null;}clearTimeout(reconnectTimer);
  demo={code:'DEMO',hostId:'you',players:[makePlayer('you',profile.name.trim()||'Tú',profile.color,profile.accessory),...['Luna','Nico','Sol','Teo','Mila','Leo'].map((name,i)=>makePlayer('bot'+i,name,PALETTE[(PALETTE.indexOf(profile.color)+i+1)%7],['sprout','cap','ears'][i%3]))]};
  demo.players.forEach(p=>p.route=0);startLevel(demo,0);state=publicRoom(demo,'you');renderKey='';receiveState();
  demoTimer=setInterval(()=>{
    if(!demo||demo.status==='retro')return;
    for(const p of demo.players.slice(1))updateBot(demo,p);
    stepRoom(demo,1/30);if(demo.status==='finished'){act('open-retro');return;}state=publicRoom(demo,'you');receiveState();
  },1000/30);
}
landing();
if(archiveRef&&(profile.name||storedRetros().some(b=>b.id===archiveRef.id&&b.memberToken))){pendingAction=archiveAction();busy(true);openSocket();}else if(session&&!archiveRef){busy(true);openSocket();}
