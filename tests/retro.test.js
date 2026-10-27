import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openRetro, applyRetroAction, exportRetroMarkdown } from '../shared/retro.js';
import { snapshotRoom } from '../server/retro-storage.js';

function fixture(){const room={hostId:'a',code:'BOARD',players:[{id:'a',name:'Ana',token:'author-secret'},{id:'b',name:'Beto',token:'guest-secret'}]};openRetro(room,{id:randomUUID(),key:'a'.repeat(64)});room.retro.round.enabled=false;return room;}
test('La retro conserva autores, protege edición y evita sobrescribir una versión nueva',()=>{
  const r=fixture(),[a,b]=r.players;applyRetroAction(r,a,{type:'retro-add',column:'good',text:'Nos comunicamos.'});const card=r.retro.cards[0];
  assert.throws(()=>applyRetroAction(r,b,{type:'retro-edit',id:card.id,version:1,text:'Cambio ajeno',column:'good'}),/editar/);
  applyRetroAction(r,a,{type:'retro-edit',id:card.id,version:1,text:'Nos comunicamos a tiempo.',column:'good'});
  assert.throws(()=>applyRetroAction(r,a,{type:'retro-edit',id:card.id,version:1,text:'Versión vieja',column:'good'}),/cambió/);
  assert.equal(card.authorName,'Ana');assert.equal(card.version,2);
});
test('Cada persona tiene tres votos y puede retirarlos para cambiar de idea',()=>{
  const r=fixture(),a=r.players[0];for(let i=0;i<4;i++)applyRetroAction(r,a,{type:'retro-add',column:'improve',text:'Idea '+i});
  assert.throws(()=>applyRetroAction(r,a,{type:'retro-vote',id:r.retro.cards[0].id}),/votación/);
  applyRetroAction(r,a,{type:'retro-phase',phase:'vote'});for(const c of r.retro.cards.slice(0,3))applyRetroAction(r,a,{type:'retro-vote',id:c.id});
  assert.throws(()=>applyRetroAction(r,a,{type:'retro-vote',id:r.retro.cards[3].id}),/tres votos/);
  applyRetroAction(r,a,{type:'retro-vote',id:r.retro.cards[0].id});applyRetroAction(r,a,{type:'retro-vote',id:r.retro.cards[3].id});assert.equal(r.retro.cards[3].voters.length,1);
});
test('Cerrar congela el tablero y exportar incluye responsables y acciones',()=>{
  const r=fixture(),a=r.players[0];applyRetroAction(r,a,{type:'retro-add',column:'action',text:'Revisar la guardia.'});const c=r.retro.cards[0];
  applyRetroAction(r,a,{type:'retro-edit',id:c.id,version:1,column:'action',text:c.text,assignee:'Beto'});applyRetroAction(r,a,{type:'retro-done',id:c.id,version:2,done:true});
  applyRetroAction(r,a,{type:'retro-phase',phase:'closed'});assert.throws(()=>applyRetroAction(r,a,{type:'retro-add',column:'good',text:'Más'}),/cerrada/);
  assert.match(exportRetroMarkdown(r.retro),/\[x\] Revisar la guardia/);assert.match(exportRetroMarkdown(r.retro),/Responsable: Beto/);
});
test('El documento persistido no contiene claves privadas ni tokens en texto plano',()=>{
  const r=fixture(),snapshot=JSON.stringify(snapshotRoom(r));assert.ok(!snapshot.includes(r.retro.key));assert.ok(!snapshot.includes('author-secret'));assert.ok(!snapshot.includes('guest-secret'));assert.ok(snapshot.includes('tokenHash'));
});
