import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { MAX_PLAYERS, PALETTE, makePlayer, startLevel, stepRoom, publicRoom } from '../shared/game.js';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const production=process.env.NODE_ENV==='production';
const rooms=new Map();
let vite;
if(!production) {
  const {createServer}=await import('vite');
  vite=await createServer({server:{middlewareMode:true},appType:'spa'});
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  if(req.url==='/health') {res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));return;}
  if(vite) {vite.middlewares(req,res);return;}
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const base=resolve(ROOT,'dist');
    let file=resolve(base,'.'+pathname);
    if(!file.startsWith(base+'/') && file!==base) {res.writeHead(403);res.end();return;}
    if(pathname.endsWith('/')) file=resolve(file,'index.html');
    const info=await stat(file);
    if(!info.isFile()) throw new Error('not a file');
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});
    res.end(await readFile(file));
  } catch {res.writeHead(404);res.end('No encontrado');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:4096});
server.on('upgrade',(req,socket,head)=>{
  if(new URL(req.url,'http://localhost').pathname!=='/ws') return; // Vite owns its own HMR upgrade.
  const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean);
  if(wss.clients.size>=500 || (allowed.length && !allowed.includes(req.headers.origin))) {socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN) ws.send(JSON.stringify(data));};
const fail=(ws,message)=>send(ws,{type:'error',message});
const cleanName=n=>String(n||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,16)||'Compañero';
const code=()=>Array.from(randomBytes(5),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
const broadcast=room=>{for(const p of room.players) send(p.ws,{type:'state',room:publicRoom(room,p.id)});};
const finishMembership=(ws,room,p)=>{ws.room=room;ws.player=p;p.ws=ws;p.connected=true;room.lastActive=Date.now();send(ws,{type:'joined',token:p.token,code:room.code,id:p.id});broadcast(room);};
const removePlayer=(room,p)=>{room.players=room.players.filter(o=>o!==p);if(room.hostId===p.id) room.hostId=room.players.find(p=>p.connected)?.id||room.players[0]?.id;if(!room.players.length)rooms.delete(room.code);};

wss.on('connection',ws=>{
  ws.alive=true;ws.messageCount=0;ws.windowStart=Date.now();
  ws.on('pong',()=>ws.alive=true);
  ws.on('error',()=>{});
  ws.on('message',raw=>{
    if(Date.now()-ws.windowStart>1000) {ws.windowStart=Date.now();ws.messageCount=0;}
    if(++ws.messageCount>100) {ws.close(1008,'Demasiados mensajes');return;}
    let msg;try{msg=JSON.parse(raw.toString());}catch{return fail(ws,'Mensaje inválido.');}
    if(!msg || typeof msg!=='object') return;
    if(msg.type==='ping') return send(ws,{type:'pong',at:msg.at});
    if(msg.type==='resume' && !ws.player) {
      const room=rooms.get(String(msg.code).toUpperCase());
      const p=room?.players.find(p=>p.token===msg.token);
      if(!p) return send(ws,{type:'expired',message:'La sala ya terminó o el servidor se reinició. Crea una nueva aventura.'});
      if(p.ws?.readyState===WebSocket.OPEN && p.ws!==ws) {p.ws.player=null;p.ws.room=null;p.ws.close(4001,'Sesión abierta en otra pestaña');}
      return finishMembership(ws,room,p);
    }
    if((msg.type==='create'||msg.type==='join') && !ws.player) {
      let room;
      if(msg.type==='create') {
        if(rooms.size>=100) return fail(ws,'Hay muchas salas activas. Intenta en un momento.');
        let id;do{id=code();}while(rooms.has(id));
        room={code:id,players:[],hostId:null,status:'lobby',level:0,lastActive:Date.now()};rooms.set(id,room);
      } else {
        room=rooms.get(String(msg.code||'').toUpperCase());
        if(!room) return fail(ws,'No encontramos esa sala. Revisa las cinco letras del código.');
        if(room.status!=='lobby') return fail(ws,'Esta aventura ya empezó. Espera a que el anfitrión vuelva a la sala.');
        if(room.players.length>=MAX_PLAYERS) return fail(ws,'La sala está completa: ya hay siete compañeros.');
      }
      const used=room.players.map(p=>p.color);
      const requested=PALETTE.includes(msg.color)?msg.color:PALETTE[0];
      const color=used.includes(requested)?PALETTE.find(c=>!used.includes(c)):requested;
      const p=makePlayer(randomBytes(8).toString('hex'),cleanName(msg.name),color,['ears','sprout','cap'].includes(msg.accessory)?msg.accessory:'ears');
      p.token=randomBytes(24).toString('hex');room.players.push(p);if(!room.hostId)room.hostId=p.id;
      return finishMembership(ws,room,p);
    }
    const room=ws.room,p=ws.player;
    if(!room || !p) return;
    room.lastActive=Date.now();
    if(msg.type==='input') {p.input={left:msg.left===true,right:msg.right===true,jump:msg.jump===true};return;}
    if(msg.type==='ready' && room.status==='lobby') {p.ready=msg.ready===true;broadcast(room);return;}
    if(msg.type==='leave') {removePlayer(room,p);ws.player=null;ws.room=null;send(ws,{type:'left'});if(room.players.length){if(room.status!=='lobby')startLevel(room,room.level);broadcast(room);}return;}
    if(room.hostId!==p.id) return;
    if(msg.type==='start') {
      if(room.status!=='lobby')return;
      if(room.players.length<2)return fail(ws,'Necesitan al menos dos personas. Para probar a solas, usa la demo.');
      if(room.players.some(p=>!p.ready||!p.connected))return fail(ws,'Espera a que todos estén conectados y listos.');
      startLevel(room,0);broadcast(room);
    }
    if(msg.type==='next' && room.status==='cleared') {startLevel(room,room.level+1);broadcast(room);}
    if(msg.type==='restart' && room.status!=='lobby') {startLevel(room,room.level);broadcast(room);}
    if(msg.type==='lobby') {room.status='lobby';room.players.forEach(p=>p.ready=false);broadcast(room);}
    if(msg.type==='remove-offline') {
      for(const offline of [...room.players]) if(!offline.connected)removePlayer(room,offline);
      if(room.status!=='lobby')startLevel(room,room.level);broadcast(room);
    }
  });
  ws.on('close',()=>{
    const room=ws.room,p=ws.player;if(!room||!p||p.ws!==ws)return;
    p.connected=false;p.input={left:false,right:false,jump:false};p.ws=null;
    if(room.hostId===p.id)room.hostId=room.players.find(p=>p.connected)?.id||p.id;
    broadcast(room);
  });
});
setInterval(()=>{for(const room of rooms.values()){stepRoom(room,1/30);if(room.status!=='lobby')broadcast(room);}},1000/30);
setInterval(()=>{
  for(const ws of wss.clients) {if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}
  for(const room of rooms.values()) if(!room.players.some(p=>p.connected)&&Date.now()-room.lastActive>10*60*1000) rooms.delete(room.code);
},15000);
const port=Number(process.env.PORT)||3000;
server.listen(port,'0.0.0.0',()=>console.log(`Soporte Tier 3 Retro está listo: http://localhost:${port}`));
