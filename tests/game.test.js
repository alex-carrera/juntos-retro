import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlayer, startLevel, stepRoom, publicRoom, PALETTE, FLOOR } from '../shared/game.js';
import { updateBot } from '../shared/bots.js';
const room=()=>({code:'TEST7',hostId:'p0',players:PALETTE.map((c,i)=>makePlayer('p'+i,'Persona '+i,c))});
const steps=(r,n=60)=>{for(let i=0;i<n;i++)stepRoom(r,1/30);};
test('Cada una de las siete estrellas solo puede recogerla su dueño',()=>{
  const r=room();startLevel(r,0);
  const star=r.stars[0];r.players[1].x=star.x-16;r.players[1].y=star.y-20;stepRoom(r,1/30);
  assert.equal(star.collected,false);
  for(let i=0;i<7;i++){const s=r.stars[i],p=r.players[i];p.x=s.x-16;p.y=s.y-20;stepRoom(r,1/30);}
  assert.equal(r.unlocked,true);assert.equal(r.progress,1);
  assert.equal(r.status,'playing');
  for(const p of r.players){p.x=1170;p.y=FLOOR-42;}steps(r,3);assert.equal(r.status,'cleared');
});
test('Los siete botones deben estar ocupados simultáneamente y se quedan abiertos',()=>{
  const r=room();startLevel(r,1);
  r.players.slice(0,6).forEach((p,i)=>p.x=r.plates[i].x+14);steps(r);assert.equal(r.unlocked,false);
  r.players[6].x=r.plates[6].x+14;steps(r,40);assert.equal(r.unlocked,true);
  r.players.forEach(p=>p.x=30);steps(r);assert.equal(r.unlocked,true);
});
test('Cuatro de siete empujan el bloque y el equipo completo termina el juego',()=>{
  const r=room();startLevel(r,2);assert.equal(r.requiredPushers,4);
  r.players.forEach((p,i)=>{p.x=i<4?530:60;p.input.right=i<3;});steps(r,20);assert.equal(r.box.x,610);
  r.players[3].input.right=true;steps(r,110);assert.equal(r.unlocked,true);
  r.players.forEach(p=>{p.x=1180;p.y=FLOOR-42;p.input.right=false;});steps(r,4);assert.equal(r.status,'finished');
});
test('Un compañero desconectado pausa la física',()=>{
  const r=room();startLevel(r,0);r.players[0].input.right=true;r.players[3].connected=false;
  steps(r);assert.equal(r.players[0].x,68);assert.equal(r.elapsed,0);
});
test('Las credenciales y los sockets no se filtran al estado público',()=>{
  const r=room();startLevel(r,0);r.players[0].token='private-token';r.players[0].ws={circular:r};
  const view=publicRoom(r,'p0');assert.doesNotThrow(()=>JSON.stringify(view));assert.equal(view.players[0].token,undefined);assert.equal(view.players[0].ws,undefined);
});
test('El jugador puede alcanzar ambas plataformas desde el suelo',()=>{
  const r=room();r.players=r.players.slice(0,1);startLevel(r,0);const p=r.players[0];
  p.x=245;p.input={right:true,left:false,jump:true};steps(r,25);p.input={right:false,left:false,jump:false};steps(r,10);
  assert.equal(p.y+p.h,514);
  p.x=459;p.input={right:true,left:false,jump:true};steps(r,22);p.input={right:false,left:false,jump:false};steps(r,12);
  assert.equal(p.y+p.h,454);
});
test('Un equipo de siete recorre y completa los tres niveles con la física real',()=>{
  const r=room();
  for(let level=0;level<3;level++){
    startLevel(r,level);r.players.forEach(p=>p.route=0);
    for(let frame=0;frame<3600&&r.status==='playing';frame++){for(const p of r.players)updateBot(r,p);stepRoom(r,1/30);}
    assert.equal(r.status,level===2?'finished':'cleared',`Nivel ${level+1} debe poder completarse`);
  }
});
