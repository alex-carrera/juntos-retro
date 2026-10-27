import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlayer, startLevel, stepRoom, publicRoom, PALETTE, FLOOR, LEVELS, HEIGHT } from '../shared/game.js';
import { updateBot } from '../shared/bots.js';
const room=()=>({code:'TEST7',hostId:'p0',players:PALETTE.map((c,i)=>makePlayer('p'+i,'Persona '+i,c))});
const steps=(r,n=60)=>{for(let i=0;i<n;i++)stepRoom(r,1/30);};
test('Cada una de las siete estrellas solo puede recogerla su dueño',()=>{
  const r=room();startLevel(r,0);r.ropeMode=null;
  const star=r.stars[0];r.players[1].x=star.x-16;r.players[1].y=star.y-20;stepRoom(r,1/30);
  assert.equal(star.collected,false);
  for(let i=0;i<7;i++){const s=r.stars[i],p=r.players[i];p.x=s.x-16;p.y=s.y-20;stepRoom(r,1/30);}
  assert.equal(r.unlocked,true);assert.equal(r.progress,1);
  assert.equal(r.status,'playing');
  for(const p of r.players){p.x=1170;p.y=FLOOR-42;}steps(r,3);assert.equal(r.status,'cleared');
});
test('Los siete botones deben estar ocupados simultáneamente y se quedan abiertos',()=>{
  const r=room();startLevel(r,1);r.players.forEach(p=>{p.input.grip=true;p.gripHeld=true;});
  r.players.slice(0,6).forEach((p,i)=>p.x=r.plates[i].x+14);steps(r);assert.equal(r.unlocked,false);
  r.players[6].x=r.plates[6].x+14;steps(r,62);assert.equal(r.unlocked,true);
  r.players.forEach(p=>p.x=30);steps(r);assert.equal(r.unlocked,true);
});
test('Cinco de siete empujan el bloque y el equipo avanza al cuarto nivel',()=>{
  const r=room();startLevel(r,2);r.ropeMode=null;assert.equal(r.requiredPushers,5);
  r.players.forEach((p,i)=>{p.x=i<5?530:60;p.input.right=i<4;});steps(r,20);assert.equal(r.box.x,610);
  r.players[4].input.right=true;steps(r,180);assert.equal(r.unlocked,true);
  r.players.forEach(p=>{p.x=1180;p.y=FLOOR-42;p.input.right=false;});steps(r,4);assert.equal(r.status,'cleared');
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
test('Equipos de dos y siete recorren los seis niveles con la física real',()=>{
 for(const count of [2,7]){
  const r=room();
  r.players=r.players.slice(0,count);
  for(let level=0;level<LEVELS.length;level++){
    startLevel(r,level);r.players.forEach(p=>p.route=0);
    for(let frame=0;frame<9000&&r.status==='playing';frame++){
      for(const p of r.players)updateBot(r,p);stepRoom(r,1/30);
      if(level===2)for(const p of r.players){
        const depthX=Math.min(p.x+p.w,r.box.x+r.box.w)-Math.max(p.x,r.box.x);
        const depthY=Math.min(p.y+p.h,r.box.y+r.box.h)-Math.max(p.y,r.box.y);
        assert.ok(depthX<.001||depthY<.001,`Jugador dentro del bloque: ${count} personas, paso ${frame}`);
      }
    }
    assert.equal(r.status,level===LEVELS.length-1?'finished':'cleared',`Nivel ${level+1}, ${count} jugadores debe poder completarse`);
  }
 }
});
test('Caer al río devuelve al punto de control y conserva la chispa',()=>{
  const r=room();startLevel(r,3);r.ropeMode=null;const p=r.players[0],cp=LEVELS[3].platforms[2];
  p.x=cp.x+20;p.y=cp.y-p.h;steps(r,2);assert.equal(p.checkpointStage,3);
  const checkpoint={...p.checkpoint};p.spark=true;r.stars[0].collected=true;
  p.x=750;p.y=FLOOR-p.h;stepRoom(r,1/30);assert.ok(p.y>FLOOR-p.h);p.y=HEIGHT+150;stepRoom(r,1/30);assert.equal(p.x,checkpoint.x);assert.equal(p.y,checkpoint.y);assert.equal(p.spark,true);assert.equal(r.stars[0].collected,true);
});
test('El relevo ignora a quien no tiene turno y obliga a entrar con luz verde',()=>{
  const r=room();startLevel(r,4);r.players.forEach(p=>p.input.grip=true);const p=r.players[0],wrong=r.players[1],plate=r.plates[0];
  wrong.x=plate.x+14;steps(r,45);assert.equal(r.relayStep,0);wrong.x=40;
  r.elapsed=0;p.x=plate.x+14;steps(r,38);assert.equal(r.relayStep,0);assert.equal(r.relayArmed,false);
  p.x=100;stepRoom(r,1/30);p.x=plate.x+14;steps(r,25);assert.equal(r.relayStep,1);
  assert.equal(r.plates[0].active,true);
});
test('La sincronía final exige el dueño de cada botón y tres segundos continuos',()=>{
  const r=room();startLevel(r,5);r.ropeMode=null;r.players.forEach(p=>p.input.grip=true);r.stars.forEach(s=>s.collected=true);
  const place=()=>r.players.forEach((p,i)=>{p.x=r.plates[i].x+10;p.y=r.plates[i].y+8-p.h;});
  place();const left=r.players[0].x;r.players[0].x=r.players[1].x;r.players[0].y=r.players[1].y;r.players[1].x=left;r.players[1].y=r.plates[0].y+8-r.players[1].h;
  steps(r,70);assert.equal(r.unlocked,false);
  place();steps(r,30);assert.equal(r.unlocked,false);r.players[0].x=50;stepRoom(r,1/30);assert.equal(r.progress,0);
  place();steps(r,95);assert.equal(r.unlocked,true);
});

test('El bloque que retrocede desplaza al jugador que sigue empujando, sin atravesarlo',()=>{
  const r=room();r.players=r.players.slice(0,2);startLevel(r,2);r.ropeMode=null;
  r.box.x=720;const p=r.players[0];p.x=r.box.x-p.w;p.input.right=true;
  for(let i=0;i<240;i++){
    stepRoom(r,1/120);
    assert.ok(p.x+p.w<=r.box.x+.001,`Solapamiento al retroceder: paso ${i}`);
  }
  assert.ok(r.box.x<720);assert.ok(p.x<688);
});

test('El bloque que avanza desplaza a quien está delante, incluso con las cuerdas tensas',()=>{
  const r=room();startLevel(r,2);r.box.x=700;r.pushHold=1;
  r.players.forEach((p,i)=>{p.x=i<5?630:i===5?768:850;p.input.right=i<5;p.input.left=i===5;});
  const front=r.players[5];let advanced=false;
  for(let i=0;i<180;i++){
    stepRoom(r,1/120);advanced ||=r.box.x>700;
    for(const p of r.players){const overlap=p.x<r.box.x+r.box.w-.001&&p.x+p.w>r.box.x+.001&&p.y<r.box.y+r.box.h-.001&&p.y+p.h>r.box.y+.001;assert.ok(!overlap,`Jugador ${p.id} dentro del bloque, paso ${i}`);}
    assert.ok(front.x>=r.box.x+r.box.w-.001);
  }
  assert.ok(advanced);
});

test('Un personaje de pie sobre el bloque viaja con él sin perder el apoyo',()=>{
  const r=room();r.players=r.players.slice(0,2);startLevel(r,2);r.ropeMode=null;r.box.x=720;
  const p=r.players[0];p.x=735;p.y=r.box.y-p.h;p.input.grip=true;
  const offset=p.x-r.box.x;
  steps(r,30);
  assert.ok(r.box.x<720);assert.ok(Math.abs(p.x-r.box.x-offset)<.001);assert.equal(p.y+p.h,r.box.y);assert.equal(p.grounded,true);
});
