import { createHash } from 'node:crypto';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './storage-config.js';
import { PALETTE } from '../shared/game.js';
import { RETRO_PHASES, RETRO_COLUMNS } from '../shared/retro.js';

export const hash=value=>createHash('sha256').update(String(value)).digest('hex');
const memory=new Map();
function normaliseArchive(data,id){
  if(!data?.retro||!Array.isArray(data.players)||!Array.isArray(data.retro.cards))throw new Error('El archivo de esta retro no tiene un formato válido.');
  const clean=(value,max)=>String(value||'').replace(/[\u0000-\u0008\u000b-\u001f]/g,'').slice(0,max);
  const players=data.players.slice(0,30).filter(p=>p&&/^[a-z\d_-]{1,64}$/i.test(p.id)).map(p=>({id:p.id,name:clean(p.name,16)||'Compañero',color:PALETTE.includes(p.color)?p.color:PALETTE[0],accessory:['ears','sprout','cap'].includes(p.accessory)?p.accessory:'ears',tokenHash:/^[a-f\d]{64}$/i.test(p.tokenHash)?p.tokenHash:undefined}));
  if(!players.length)throw new Error('Esta retro no tiene participantes válidos.');
  const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toISOString():new Date().toISOString();
  const cards=data.retro.cards.slice(0,200).filter(c=>c&&/^[a-f\d-]{36}$/i.test(c.id)&&RETRO_COLUMNS.some(col=>col.id===c.column)).map(c=>({id:c.id,column:c.column,text:clean(c.text,600),authorId:clean(c.authorId,64),authorName:clean(c.authorName,16),createdAt:date(c.createdAt),version:Math.max(1,Math.min(1000000,Number(c.version)||1)),voters:[...new Set(Array.isArray(c.voters)?c.voters.filter(id=>players.some(p=>p.id===id)):[])],done:c.done===true,assignee:clean(c.assignee,40)}));
  return {code:clean(data.code,50),hostId:players.some(p=>p.id===data.hostId)?data.hostId:players[0].id,players,retro:{id,title:clean(data.retro.title,80)||'Retro Squad · Soporte Tier 3',createdAt:date(data.retro.createdAt),phase:RETRO_PHASES.includes(data.retro.phase)?data.retro.phase:'closed',cards,revision:Math.max(0,Number(data.retro.revision)||0),persistence:'cloud',saveStatus:'saved',savedAt:date(data.retro.savedAt)}};
}
export function snapshotRoom(room){
  return {hostId:room.hostId,code:room.code,retro:{...room.retro,key:undefined,saveStatus:'saved',savedAt:new Date().toISOString()},players:room.players.map(p=>({id:p.id,name:p.name,color:p.color,accessory:p.accessory,tokenHash:p.token?hash(p.token):p.tokenHash}))};
}
export async function saveArchive(room){
  const row={id:room.retro.id,access_hash:hash(room.retro.key),data:snapshotRoom(room),updated_at:new Date().toISOString()};
  if(process.env.RETRO_STORE==='memory'){memory.set(row.id,structuredClone(row));return;}
  const response=await fetch(`${SUPABASE_URL}/rest/v1/retro_boards?on_conflict=id`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'x-retro-key':room.retro.key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('No se pudo guardar el historial en la nube.');
}
export async function loadArchive(id,key){
  if(!/^[a-f\d-]{36}$/i.test(id)||!/^[a-f\d]{64}$/i.test(key))throw new Error('El enlace de la retro no es válido.');
  if(process.env.RETRO_STORE==='memory'){const row=memory.get(id);if(!row||row.access_hash!==hash(key))throw new Error('No encontramos esa retro o su enlace no tiene acceso.');return normaliseArchive(structuredClone(row.data),id);}
  const response=await fetch(`${SUPABASE_URL}/rest/v1/retro_boards?id=eq.${id}&select=data`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'x-retro-key':key},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('No se pudo abrir el historial. Intenta de nuevo.');
  const rows=await response.json();if(!rows[0])throw new Error('No encontramos esa retro o su enlace no tiene acceso.');return normaliseArchive(rows[0].data,id);
}

export function queueArchiveSave(room,onChange){
  if(!room.retro||room.retro.persistence==='demo')return;
  room.saveDirty=true;room.retro.saveStatus='pending';
  if(room.saveRunning||room.saveTimer)return;
  room.saveTimer=setTimeout(async()=>{
    room.saveTimer=null;room.saveRunning=true;room.saveDirty=false;
    try{await saveArchive(room);room.retro.savedAt=new Date().toISOString();room.retro.saveStatus=room.saveDirty?'pending':'saved';room.saveRetries=0;}
    catch{room.retro.saveStatus='error';room.saveDirty=true;room.saveRetries=(room.saveRetries||0)+1;}
    room.saveRunning=false;onChange(room);
    if(room.saveDirty){const delay=room.saveRetries?Math.min(30000,1000*2**room.saveRetries):200;room.saveTimer=setTimeout(()=>{room.saveTimer=null;queueArchiveSave(room,onChange);},delay);}
  },350);
}
