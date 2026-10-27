import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openRetro, applyRetroAction } from '../shared/retro.js';
import { ROUND_MS, canAddInRound, remainingRoundMs, tickRetroRound } from '../shared/retro-round.js';
import { saveArchive, loadArchive } from '../server/retro-storage.js';

function fixture(){const room={code:'CLOCK',hostId:'host',players:[{id:'host',name:'Ana',token:'secret'},{id:'guest',name:'Beto'}]};openRetro(room,{id:randomUUID(),key:'a'.repeat(64)});return room;}
function action(room,msg,now){return applyRetroAction(room,room.players[0],msg,randomUUID,now);}

test('Cada columna tiene cinco minutos y luego una discusión sin avance automático',()=>{
  const r=fixture(),start=1_800_000_000_000;
  assert.equal(canAddInRound(r.retro,'good',start),false);
  for(const [index,column] of ['good','improve','action'].entries()){
    const now=start+index*ROUND_MS*2;
    action(r,{type:'retro-timer',command:'start',durationMs:1},now);
    assert.equal(r.retro.round.column,index);assert.equal(r.retro.round.endsAt,now+ROUND_MS);
    assert.equal(canAddInRound(r.retro,column,now+1),true);
    assert.equal(canAddInRound(r.retro,['improve','action','good'][index],now+1),false);
    action(r,{type:'retro-add',column,text:'Una idea para '+column},now+100);
    assert.equal(tickRetroRound(r.retro,now+ROUND_MS-1),false);
    assert.equal(tickRetroRound(r.retro,now+ROUND_MS),true);
    assert.equal(r.retro.round.mode,'discuss');assert.equal(r.retro.round.column,index);
    assert.equal(canAddInRound(r.retro,column,now+ROUND_MS),false);
    assert.equal(tickRetroRound(r.retro,now+ROUND_MS+1),false);
    action(r,{type:'retro-timer',command:'next'},now+ROUND_MS+60_000);
    assert.equal(r.retro.phase,index===2?'vote':'write');
  }
  assert.equal(r.retro.cards.length,3);assert.equal(r.retro.round.mode,'complete');
});

test('Pausar conserva el tiempo y reanudar no regala cinco minutos nuevos',()=>{
  const r=fixture(),now=1_800_000_000_000;
  action(r,{type:'retro-timer',command:'start'},now);
  action(r,{type:'retro-timer',command:'pause'},now+42_000);
  assert.equal(remainingRoundMs(r.retro.round,now+600_000),ROUND_MS-42_000);
  assert.equal(canAddInRound(r.retro,'good',now+600_000),false);
  action(r,{type:'retro-timer',command:'start'},now+600_000);
  assert.equal(r.retro.round.endsAt,now+600_000+ROUND_MS-42_000);
  action(r,{type:'retro-timer',command:'discuss'},now+610_000);
  action(r,{type:'retro-timer',command:'start'},now+620_000);
  assert.equal(remainingRoundMs(r.retro.round,now+620_000),ROUND_MS);
});

test('El servidor rechaza controles ajenos, saltos y tarjetas que llegan después del límite',()=>{
  const r=fixture(),now=1_800_000_000_000;
  assert.throws(()=>applyRetroAction(r,r.players[1],{type:'retro-timer',command:'start'},randomUUID,now),/facilita/);
  assert.throws(()=>action(r,{type:'retro-timer',command:'next'},now),/discutan/);
  action(r,{type:'retro-timer',command:'start'},now);
  assert.throws(()=>action(r,{type:'retro-add',column:'improve',text:'Otro punto'},now+1),/columna activa/);
  assert.throws(()=>action(r,{type:'retro-add',column:'good',text:'Llega tarde'},now+ROUND_MS),/columna activa/);
  assert.equal(r.retro.cards.length,0);assert.equal(r.retro.round.mode,'discuss');
  action(r,{type:'retro-phase',phase:'closed'},now+ROUND_MS);
  assert.equal(r.retro.round.mode,'complete');assert.equal(r.retro.round.endsAt,null);
});

test('El historial conserva el deadline y recuperarlo después del vencimiento abre discusión',async()=>{
  const previous=process.env.RETRO_STORE;process.env.RETRO_STORE='memory';
  try{
    const r=fixture(),now=1_800_000_000_000;action(r,{type:'retro-timer',command:'start'},now);
    await saveArchive(r);const restored=await loadArchive(r.retro.id,r.retro.key);
    assert.deepEqual(restored.retro.round,r.retro.round);
    assert.equal(tickRetroRound(restored.retro,now+ROUND_MS+1000),true);
    assert.equal(restored.retro.round.mode,'discuss');
  }finally{if(previous===undefined)delete process.env.RETRO_STORE;else process.env.RETRO_STORE=previous;}
});
