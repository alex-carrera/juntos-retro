import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import WebSocket from 'ws';
const waitMessage=(ws,predicate,timeout=6000)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{ws.off('message',handler);reject(new Error('Tiempo de espera agotado'));},timeout);
  function handler(raw){const m=JSON.parse(raw.toString());if(predicate(m)){clearTimeout(timer);ws.off('message',handler);resolve(m);}}
  ws.on('message',handler);
});
const open=async port=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);await once(ws,'open');return ws;};
test('Sala real: siete personas, límite de cupos, inicio, pausa y reconexión',async t=>{
  const port=32000+Math.floor(Math.random()*10000),clients=[];
  const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',RETRO_STORE:'memory'},stdio:['ignore','pipe','pipe']});
  t.after(()=>{clients.forEach(ws=>ws.terminate());child.kill();});
  await new Promise((resolve,reject)=>{let error='';child.stderr.on('data',chunk=>error+=chunk);const timer=setTimeout(()=>reject(new Error('El servidor no arrancó: '+error)),7000);child.stdout.on('data',()=>{clearTimeout(timer);resolve();});child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);reject(new Error('El servidor terminó: '+code+' '+error));});});
  const host=await open(port);clients.push(host);
  let joined=waitMessage(host,m=>m.type==='joined');host.send(JSON.stringify({type:'create',name:'Ana',color:'#ed7757'}));
  const hostSession=await joined;const code=hostSession.code;assert.match(code,/^[A-Z0-9]{5}$/);
  const sessions=[];
  for(let i=0;i<6;i++){const ws=await open(port);clients.push(ws);const ack=waitMessage(ws,m=>m.type==='joined');ws.send(JSON.stringify({type:'join',code,name:'Persona '+i,color:'#ed7757'}));sessions.push(await ack);}
  const extra=await open(port);clients.push(extra);const full=waitMessage(extra,m=>m.type==='error');extra.send(JSON.stringify({type:'join',code,name:'Octava'}));assert.match((await full).message,/completa/);
  const readyState=waitMessage(host,m=>m.type==='state'&&m.room.players.every(p=>p.ready));for(const ws of clients.slice(0,7))ws.send(JSON.stringify({type:'ready',ready:true}));const ready=await readyState;assert.equal(ready.room.players.length,7);assert.equal(new Set(ready.room.players.map(p=>p.color)).size,7);
  const playing=waitMessage(host,m=>m.type==='state'&&m.room.status==='playing');host.send(JSON.stringify({type:'start'}));assert.equal((await playing).room.level,0);
  const paused=waitMessage(host,m=>m.type==='state'&&m.room.players.some(p=>!p.connected));clients[1].close();await paused;
  const resumed=await open(port);clients.push(resumed);const ack=waitMessage(resumed,m=>m.type==='joined');resumed.send(JSON.stringify({type:'resume',code,token:sessions[0].token}));assert.equal((await ack).id,sessions[0].id);
  const active=await waitMessage(host,m=>m.type==='state'&&m.room.players.every(p=>p.connected));assert.equal(active.room.players.length,7);
  const late=await open(port);clients.push(late);const denied=waitMessage(late,m=>m.type==='error');late.send(JSON.stringify({type:'join',code,name:'Tarde'}));assert.match((await denied).message,/empezó/);
  const board=waitMessage(host,m=>m.type==='state'&&m.room.status==='retro');host.send(JSON.stringify({type:'open-retro'}));const shared=(await board).room;assert.ok(shared.retro.id);assert.equal(shared.retro.phase,'write');
  const guest=clients[2],added=waitMessage(host,m=>m.type==='state'&&m.room.retro?.cards.length===1);guest.send(JSON.stringify({type:'retro-add',column:'good',text:'Nos ayudamos para cruzar.'}));const written=(await added).room;assert.equal(written.retro.cards[0].text,'Nos ayudamos para cruzar.');
  const voting=waitMessage(guest,m=>m.type==='state'&&m.room.retro?.phase==='vote');host.send(JSON.stringify({type:'retro-phase',phase:'vote'}));await voting;
  const voted=waitMessage(host,m=>m.type==='state'&&m.room.retro?.cards[0]?.voters.length===1);guest.send(JSON.stringify({type:'retro-vote',id:written.retro.cards[0].id}));await voted;
  await waitMessage(host,m=>m.type==='state'&&m.room.retro?.saveStatus==='saved');
  const visitor=await open(port);clients.push(visitor);const reopened=waitMessage(visitor,m=>m.type==='state'&&m.room.status==='retro');visitor.send(JSON.stringify({type:'open-archive',id:shared.retro.id,key:shared.retro.key,name:'Visitante'}));assert.equal((await reopened).room.retro.cards.length,1);
  const intruder=await open(port);clients.push(intruder);const blocked=waitMessage(intruder,m=>m.type==='error');intruder.send(JSON.stringify({type:'open-archive',id:shared.retro.id,key:'0'.repeat(64),name:'Sin acceso'}));assert.match((await blocked).message,/acceso/);
});
