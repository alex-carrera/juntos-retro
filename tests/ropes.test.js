import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlayer,startLevel,stepRoom,PALETTE,FLOOR} from '../shared/game.js';

function fixture(level=0){const r={players:PALETTE.slice(0,2).map((c,i)=>makePlayer('p'+i,'P'+i,c))};startLevel(r,level);return r;}
test('Agarrar a un compañero cercano permite arrastrarlo y soltar libera la cuerda manual',()=>{
  const r=fixture();r.ropeMode=null;const [a,b]=r.players;a.x=220;b.x=270;a.input.grip=true;a.input.left=true;
  for(let i=0;i<45;i++)stepRoom(r,1/30);assert.ok(b.x<250);assert.ok(r.links.some(l=>l.manual));assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<140);
  a.input.grip=false;stepRoom(r,1/30);assert.equal(r.links.length,0);
});
test('La cinta arrastra a quien no frena y agarrar permite sostener su posición',()=>{
  const r=fixture(1),[a,b]=r.players;a.x=300;b.x=500;b.input.grip=true;
  for(let i=0;i<30;i++)stepRoom(r,1/30);assert.ok(a.x<240);assert.ok(Math.abs(b.x-500)<1);
});
test('Un personaje cae al vacío y la cuerda de rescate se tensa al frenar arriba',()=>{
  const r=fixture(3),[a,b]=r.players;a.x=260;a.y=524-a.h;a.grounded=true;b.x=360;b.y=FLOOR-b.h;b.grounded=false;
  let sawFall=false,sawRescue=false;
  for(let i=0;i<45;i++){if(i===10)a.input.grip=true;stepRoom(r,1/30);if(b.y+b.h>FLOOR)sawFall=true;if(r.links.some(l=>l.rescue))sawRescue=true;}
  assert.ok(sawFall);assert.ok(sawRescue);assert.ok(b.y<820);assert.equal(b.respawnUntil,0);
});
