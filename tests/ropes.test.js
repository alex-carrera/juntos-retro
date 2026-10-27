import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlayer,startLevel,stepRoom,PALETTE,FLOOR} from '../shared/game.js';
import {solveRopes} from '../shared/ropes.js';
import {buildRopeGeometry,ropePath,visible} from '../shared/rope-path.js';

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
  for(let i=0;i<45;i++){if(i===10){a.input.grip=true;a.input.jump=true;}stepRoom(r,1/30);if(b.y+b.h>FLOOR)sawFall=true;if(r.links.some(l=>l.rescue))sawRescue=true;}
  assert.ok(sawFall);assert.ok(sawRescue);assert.ok(b.y<820);assert.equal(b.respawnUntil,0);
});

test('Dos personajes en el aire caen con la misma gravedad incluso al agarrar',()=>{
  const r=fixture(3),[a,b]=r.players;r.ropeLength=130;
  Object.assign(a,{x:400,y:100,vx:100,vy:0,grounded:false,input:{grip:true,jump:true}});
  Object.assign(b,{x:450,y:220,vx:-100,vy:260,grounded:false,input:{grip:true,jump:true}});
  const initialMomentum=a.vy+b.vy;
  for(let i=0;i<40;i++){
    for(const p of r.players){p.vy+=1350/120;p.x+=p.vx/120;p.y+=p.vy/120;}
    solveRopes(r,1/120,(p,dx,dy)=>{p.x+=dx;p.y+=dy;});
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<=130.12);
    assert.ok(!r.links[0].rescue);
  }
  assert.ok(Math.abs(a.vy+b.vy-initialMomentum-2*1350*40/120)<1e-7);
  assert.ok(Math.abs(a.vx+b.vx)<1e-7);
});

test('La tensión conserva el movimiento tangencial en vez de congelar la caída',()=>{
  const r=fixture(),[a,b]=r.players;r.ropeLength=100;
  Object.assign(a,{x:300,y:100,vx:20,vy:60,grounded:false,input:{}});
  Object.assign(b,{x:400,y:100,vx:80,vy:210,grounded:false,input:{}});
  solveRopes(r,1/120,(p,dx,dy)=>{p.x+=dx;p.y+=dy;});
  assert.equal(a.vy,60);assert.equal(b.vy,210);
  assert.ok(Math.abs(a.vx+b.vx-100)<1e-7);
  assert.ok(Math.abs(a.vx-b.vx)<1e-7);
});

test('Recoger cuerda es gradual y no teletransporta al personaje colgado',()=>{
  const r=fixture(3),[a,b]=r.players;
  Object.assign(a,{x:290,y:524-a.h,grounded:true,input:{grip:true,jump:true},gripHeld:true});
  Object.assign(b,{x:350,y:570,grounded:false,input:{}});
  stepRoom(r,1/120);
  assert.ok(r.links[0].length>=150-38/120-.001);
  assert.ok(b.y>565);assert.ok(b.vy>-80);
});

test('Una cuerda rodea los bordes de la plataforma y no atraviesa su interior',()=>{
  const geometry=buildRopeGeometry([{x:430,y:414,w:80,h:18}]);
  const path=ropePath({x:470,y:370},{x:470,y:490},geometry);
  assert.ok(path.length>2);
  let length=0;for(let i=1;i<path.length;i++){assert.ok(visible(path[i-1],path[i],geometry));length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);}
  assert.ok(length>120);
});

test('El resultado no cambia al simular la misma caída a 30 o 60 actualizaciones por segundo',()=>{
  const build=()=>{const r=fixture(3);Object.assign(r.players[0],{x:250,y:524-42,input:{grip:true},gripHeld:true});Object.assign(r.players[1],{x:350,y:570,grounded:false,input:{left:true}});return r;};
  const a=build(),b=build();for(let i=0;i<45;i++)stepRoom(a,1/30);for(let i=0;i<90;i++)stepRoom(b,1/60);
  for(let i=0;i<2;i++){assert.ok(Math.abs(a.players[i].x-b.players[i].x)<.001);assert.ok(Math.abs(a.players[i].y-b.players[i].y)<.001);}
});

test('Agarrar sin Salto frena pero no recoge cuerda automáticamente',()=>{
  const r=fixture(3),[a,b]=r.players;
  Object.assign(a,{x:290,y:524-a.h,grounded:true,input:{grip:true},gripHeld:true});
  Object.assign(b,{x:350,y:570,grounded:false,input:{}});
  for(let i=0;i<20;i++)stepRoom(r,1/120);
  assert.equal(r.links[0].rescue,false);assert.equal(r.links[0].length,150);
});

test('Una pareja colgada a la misma altura a ambos lados de una plataforma puede trepar',()=>{
  for(const grip of [false,true]){
    const r=fixture(),[a,b]=r.players;
    Object.assign(a,{x:308,y:482,grounded:false,input:{}});
    Object.assign(b,{x:465,y:482,grounded:false,input:{}});
    for(let i=0;i<240;i++)stepRoom(r,1/120);
    assert.ok(r.links[0].taut);assert.ok(r.links[0].points.length>2);
    assert.ok(!a.grounded&&!b.grounded);assert.ok(Math.abs(a.y-b.y)<.01);
    a.input={right:true,jump:true,grip};b.input={left:true};
    let landed=false,climbed=false;
    for(let i=0;i<360;i++){
      stepRoom(r,1/120);
      climbed ||=r.links.some(l=>l.rescue);
      landed ||=r.players.some(p=>p.grounded&&Math.abs(p.y+p.h-514)<.2);
      for(const p of r.players){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(!(p.x<465-.001&&p.x+p.w>340+.001&&p.y<532-.001&&p.y+p.h>514+.001),'Trepar no atraviesa la plataforma');}
    }
    assert.ok(climbed);assert.ok(landed,'Saltar hacia la plataforma debe sacar a la pareja del atasco');
  }
});

test('Recoger cuerda sobre una plataforma no comprime el tramo entre sus bordes ni lanza a los jugadores',()=>{
  const r=fixture(),[a,b]=r.players;
  Object.assign(a,{x:308,y:482,grounded:false,input:{}});Object.assign(b,{x:465,y:482,grounded:false,input:{}});
  for(let i=0;i<240;i++)stepRoom(r,1/120);
  a.input={jump:true};b.input={jump:true};
  for(let i=0;i<600;i++){
    stepRoom(r,1/120);
    assert.ok(r.links[0].length>=157.8-.001);
    for(const p of r.players)assert.ok(Math.hypot(p.vx,p.vy)<300);
  }
});
