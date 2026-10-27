import { newRound, canAddInRound, changeRetroRound, tickRetroRound } from './retro-round.js';

export const RETRO_COLUMNS = [
  {id:'good',title:'Lo que funcionó',icon:'☀',hint:'¿Qué nos ayudó como equipo?',color:'green'},
  {id:'improve',title:'Podemos mejorar',icon:'↗',hint:'¿Qué nos frenó o hizo falta?',color:'coral'},
  {id:'action',title:'Próximos pasos',icon:'✳',hint:'Una acción concreta para la próxima vez.',color:'blue'},
];
export const RETRO_PHASES = ['write','vote','action','closed'];
export const PHASE_LABELS = {write:'Escribir',vote:'Votar',action:'Acordar acciones',closed:'Cerrada'};

export function openRetro(room,{id,key,persistence='cloud'}={}){
  if(room.retro){room.status='retro';return room.retro;}
  room.status='retro';
  room.retro={id,key,title:'Retro Squad · Soporte Tier 3',createdAt:new Date().toISOString(),phase:'write',round:newRound(),cards:[],revision:0,persistence,saveStatus:persistence==='demo'?'demo':'pending',savedAt:null};
  room.players.forEach(p=>p.input={left:false,right:false,jump:false,grip:false});
  return room.retro;
}

export function applyRetroAction(room,actor,msg,idFactory=()=>crypto.randomUUID(),now=Date.now()){
  const board=room.retro;if(room.status!=='retro'||!board)throw new Error('El tablero todavía no está abierto.');
  const host=actor.id===room.hostId;
  const text=value=>String(value||'').trim().slice(0,600);
  tickRetroRound(board,now);
  if(msg.type==='retro-timer'){
    if(!host)throw new Error('Solo quien facilita puede controlar el cronómetro.');
    changeRetroRound(board,msg.command,now);
  }else if(msg.type==='retro-phase'){
    if(!host)throw new Error('Solo quien facilita puede cambiar la etapa.');
    if(!RETRO_PHASES.includes(msg.phase))throw new Error('Etapa inválida.');
    board.phase=msg.phase;
    if(board.round){
      if(msg.phase==='write'&&board.round.mode==='complete')board.round=newRound();
      else if(msg.phase!=='write'){board.round.mode='complete';board.round.endsAt=null;board.round.remainingMs=0;}
    }
  }else if(msg.type==='retro-title'){
    if(!host)throw new Error('Solo quien facilita puede cambiar el título.');
    if(!text(msg.title))throw new Error('Escribe un título.');board.title=text(msg.title).slice(0,80);
  }else{
    if(board.phase==='closed')throw new Error('La retro está cerrada. Quien facilita puede volver a abrirla.');
    if(msg.type==='retro-add'){
      if(!['write','action'].includes(board.phase))throw new Error('Ahora estamos votando. Guarda tu idea para la etapa de acciones.');
      if(!RETRO_COLUMNS.some(c=>c.id===msg.column)||!text(msg.text))throw new Error('Escribe una idea y elige una columna.');
      if(!canAddInRound(board,msg.column,now))throw new Error('Escribe en la columna activa mientras corre el cronómetro. Tu borrador se conserva.');
      if(board.cards.length>=200||board.cards.filter(c=>c.authorId===actor.id).length>=50)throw new Error('Este tablero alcanzó el límite de tarjetas. Exporta las notas antes de continuar.');
      board.cards.push({id:idFactory(),column:msg.column,text:text(msg.text),authorId:actor.id,authorName:actor.name,createdAt:new Date().toISOString(),version:1,voters:[],done:false,assignee:''});
    }else{
      const card=board.cards.find(c=>c.id===msg.id);if(!card)throw new Error('La tarjeta ya no existe.');
      if(msg.type==='retro-vote'){
        if(!['vote','action'].includes(board.phase))throw new Error('La votación se habilita en la etapa Votar.');
        const voted=card.voters.includes(actor.id);
        if(voted)card.voters=card.voters.filter(id=>id!==actor.id);
        else {if(board.cards.filter(c=>c.voters.includes(actor.id)).length>=3)throw new Error('Tienes tres votos. Quita uno para elegir otra tarjeta.');card.voters.push(actor.id);}
      }else{
        if(card.authorId!==actor.id&&!host)throw new Error('Puedes editar tus tarjetas; quien facilita puede editar todas.');
        if(msg.version!==card.version)throw new Error('Esta tarjeta cambió. Ábrela de nuevo para no sobrescribir otro cambio.');
        if(msg.type==='retro-delete')board.cards=board.cards.filter(c=>c.id!==card.id);
        else if(msg.type==='retro-edit'){
          if(!text(msg.text)||!RETRO_COLUMNS.some(c=>c.id===msg.column))throw new Error('La tarjeta necesita una idea y una columna.');
          card.text=text(msg.text);card.column=msg.column;card.assignee=String(msg.assignee||'').trim().slice(0,40);card.version++;
        }else if(msg.type==='retro-done'){if(card.column!=='action')throw new Error('Solo las acciones se pueden marcar como hechas.');card.done=msg.done===true;card.version++;}
        else throw new Error('Acción desconocida.');
      }
    }
  }
  board.revision++;
  if(board.persistence!=='demo')board.saveStatus='pending';
  return board;
}

export function exportRetroMarkdown(board){
  const lines=[`# ${board.title}`,'',`Fecha: ${board.createdAt.slice(0,10)}`,`Etapa: ${PHASE_LABELS[board.phase]}`,''];
  for(const column of RETRO_COLUMNS){lines.push(`## ${column.title}`,'');for(const card of board.cards.filter(c=>c.column===column.id).sort((a,b)=>b.voters.length-a.voters.length)){
    lines.push(`- ${card.column==='action'?(card.done?'[x] ':'[ ] '):''}${card.text.replace(/\r?\n/g,'\n  ')} — ${card.authorName} (${card.voters.length} votos)${card.assignee?' · Responsable: '+card.assignee:''}`);
  }lines.push('');}
  return lines.join('\n');
}
