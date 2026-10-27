export const ROUND_MS = 5 * 60 * 1000;
export const ROUND_COLUMNS = ['good','improve','action'];

export function newRound(enabled=true){
  return {enabled,column:0,mode:'ready',remainingMs:ROUND_MS,endsAt:null,run:0};
}

export function normaliseRound(value){
  if(!value||typeof value!=='object')return newRound(false); // Existing retros retain free writing until started.
  const round={enabled:value.enabled!==false,column:Math.max(0,Math.min(2,Math.trunc(Number(value.column)||0))),mode:['ready','running','paused','discuss','complete'].includes(value.mode)?value.mode:'ready',remainingMs:Math.max(0,Math.min(ROUND_MS,Number(value.remainingMs)||0)),endsAt:Number.isFinite(value.endsAt)&&value.endsAt>0?value.endsAt:null,run:Math.max(0,Math.min(1e9,Math.trunc(Number(value.run)||0)))};
  if(round.mode==='running'&&!round.endsAt){round.mode='paused';}
  return round;
}

export function remainingRoundMs(round,now=Date.now()){
  if(!round)return ROUND_MS;
  return Math.max(0,Math.min(ROUND_MS,round.mode==='running'?(round.endsAt||now)-now:round.remainingMs));
}

export function canAddInRound(board,column,now=Date.now()){
  if(board.phase==='action')return true;
  if(board.phase!=='write')return false;
  const round=board.round;
  return !round?.enabled||(round.mode==='running'&&remainingRoundMs(round,now)>0&&ROUND_COLUMNS[round.column]===column);
}

export function tickRetroRound(board,now=Date.now()){
  const round=board?.round;
  if(!round?.enabled||round.mode!=='running'||remainingRoundMs(round,now)>0)return false;
  round.mode='discuss';round.remainingMs=0;round.endsAt=null;
  board.revision++;
  if(board.persistence!=='demo')board.saveStatus='pending';
  return true;
}

export function changeRetroRound(board,command,now=Date.now()){
  if(board.phase!=='write')throw new Error('El cronómetro se usa en la etapa Escribir.');
  const round=board.round||=newRound(false);
  if(command==='start'){
    if(round.mode==='running')throw new Error('El cronómetro ya está en marcha.');
    if(round.mode==='complete')throw new Error('Los tres puntos ya terminaron.');
    if(round.mode!=='paused')round.remainingMs=ROUND_MS;
    round.enabled=true;round.mode='running';round.endsAt=now+round.remainingMs;round.run++;
  }else if(command==='pause'){
    if(round.mode!=='running')throw new Error('El cronómetro no está en marcha.');
    round.remainingMs=remainingRoundMs(round,now);round.endsAt=null;round.mode=round.remainingMs>0?'paused':'discuss';
  }else if(command==='discuss'){
    if(!['running','paused'].includes(round.mode))throw new Error('Inicia el bloque antes de pasar a discutir.');
    round.mode='discuss';round.remainingMs=0;round.endsAt=null;
  }else if(command==='next'){
    if(round.mode!=='discuss')throw new Error('Primero terminen de escribir y discutan este punto.');
    if(round.column<2){round.column++;round.mode='ready';round.remainingMs=ROUND_MS;round.endsAt=null;}
    else {round.mode='complete';round.endsAt=null;round.remainingMs=0;board.phase='vote';}
  }else throw new Error('Control del cronómetro inválido.');
}
