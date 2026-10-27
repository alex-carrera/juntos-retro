import { buildRopeGeometry } from './rope-path.js';
import { GRAVITY, PHYSICS_STEP, moveBody, moveSolidHorizontally, refreshGrounding, solvePlayerContacts, approach } from './physics.js';
export const WIDTH = 1280;
export const HEIGHT = 680;
export const FLOOR = 594;
export const MAX_PLAYERS = 7;
export const PALETTE = ['#ed7757', '#e8b544', '#7d9e78', '#719eb0', '#a98abb', '#df94a3', '#8caaa1'];
export const LEVELS = [
  { title: 'Unidos desde el inicio', subtitle: 'Recoge tu chispa sobre plataformas más estrechas. La cuerda transmite el peso: salten junto a su pareja.', tag: '01 · UNIRSE', ropeMode:'pairs',ropeLength:170, platforms: [{x:340,y:514,w:125,h:18},{x:540,y:454,w:125,h:18},{x:740,y:514,w:125,h:18}] },
  { title: 'Contra la corriente', subtitle: 'Dos cintas en sentidos opuestos. Cada quien sostiene su botón de color durante casi dos segundos; E permite frenar.', tag: '02 · RESISTIR', belts:[{x:150,w:430,y:FLOOR,speed:-135},{x:580,w:400,y:FLOOR,speed:115}],holdSeconds:1.9, platforms: [] },
  { title: 'Arrastre en equipo', subtitle: 'Reúnan al equipo para empujar contra las ráfagas. Si faltan manos, el bloque retrocede. Manténganse cerca.', tag: '03 · EMPUJAR', ropeMode:'chain',ropeLength:165,wind:{strength:-135,period:2.8}, platforms: [] },
  { title: 'No sueltes la cuerda', subtitle: 'Plataformas estrechas sobre el río. Si alguien cae, apóyate y mantén Agarrar + Salto para recoger cuerda poco a poco.', tag: '04 · RESCATAR', ropeMode:'pairs',ropeLength:150, platforms: [{x:220,y:524,w:95,h:18},{x:365,y:464,w:85,h:18},{x:510,y:404,w:95,h:18},{x:665,y:464,w:80,h:18},{x:810,y:524,w:80,h:18},{x:955,y:524,w:70,h:18}], river:{x:320,w:695}, checkpoint:2 },
  { title: 'Relevo en movimiento', subtitle: 'La luz verde dura menos. Entra en tu turno y sostén el botón; las dos cintas empujan en sentidos opuestos.', tag: '05 · COORDINAR',belts:[{x:160,w:410,y:FLOOR,speed:110},{x:570,w:410,y:FLOOR,speed:-120}],relayPeriod:3.3,relayOpenAt:1,relayCloseAt:2.25,relayHold:.8, platforms: [] },
  { title: 'Todos o ninguno', subtitle: 'Menos espacio, ráfagas más fuertes y una sola cadena. Cada quien en su botón, juntos durante tres segundos.', tag: '06 · SINCRONIZAR',ropeMode:'chain',ropeLength:158,wind:{strength:-105,period:3.2},holdSeconds:3, platforms: [{x:170,y:534,w:82,h:18},{x:300,y:474,w:80,h:18},{x:430,y:414,w:80,h:18},{x:560,y:354,w:76,h:18},{x:690,y:414,w:80,h:18},{x:820,y:474,w:80,h:18},{x:950,y:534,w:82,h:18}], river:{x:260,w:750}, checkpoint:3 },
];
export const hasStars = level => [0,3,5].includes(level);
export function onPlate(p,plate){return p.grounded && Math.abs(p.y+p.h-plate.y-8)<4 && p.x+p.w>plate.x+8 && p.x<plate.x+plate.w-8;}
export const rectsOverlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

export function makePlayer(id, name, color, accessory = 'ears') {
  return { id, name, color, accessory, x:80, y:FLOOR-42, w:32, h:42, vx:0, vy:0, grounded:false, facing:1, connected:true, ready:false, spark:false, input:{left:false,right:false,jump:false}, jumpHeld:false };
}

export function startLevel(room, index) {
  room.level = index;
  room.status = 'playing';
  room.elapsed = 0;
  room.unlocked = false;
  room.progress = 0;
  room.exitCount = 0;
  room.ropeMode=LEVELS[index].ropeMode;room.ropeLength=LEVELS[index].ropeLength;room.links=[];room.ropeGeometry=null;
  room.relayStep=0;room.relayHold=0;room.relayArmed=true;room.signalOpen=false;room.signalRemaining=0;
  room.relayOrder=[];
  for(let a=0,b=room.players.length-1;a<=b;a++,b--){room.relayOrder.push(room.players[a].id);if(a!==b)room.relayOrder.push(room.players[b].id);}
  room.box = {x:610,y:FLOOR-68,w:68,h:68};
  room.pushers = 0;room.pushHold=0;
  room.requiredPushers = Math.max(1, Math.ceil(room.players.length*.7));
  room.plates = room.players.map((_,i) => ({x:190+i*101, y:FLOOR-8,w:44,h:8,active:false}));
  room.stars = room.players.map((p,i) => ({owner:p.id, color:p.color, x:260+i*94, y:i===1||i===2?478:i===3||i===4?418:i===5||i===6?478:554,collected:false}));
  // Match each star to a reachable platform, including smaller rooms.
  room.stars.forEach((s) => {
    const plat = LEVELS[0].platforms.find(p=>s.x>p.x-8 && s.x<p.x+p.w+8);
    s.y = plat ? plat.y-31 : FLOOR-35;
  });
  if(index===0&&room.stars[5]){room.stars[5].x=790;room.stars[5].y=483;}
  if(index===3){
    const anchors=[0,1,1,2,3,4,5];
    room.stars.forEach((s,i)=>{const plat=LEVELS[index].platforms[anchors[i]];s.x=plat.x+plat.w*(i===1?.28:i===2?.72:.5);s.y=plat.y-31;});
  }
  if(index===5){
    room.plates=room.players.map((p,i)=>{const plat=LEVELS[index].platforms[i];return {x:plat.x+15,y:plat.y-8,w:plat.w-30,h:8,active:false,owner:p.id,color:p.color};});
    room.stars=room.plates.map(plate=>({owner:plate.owner,color:plate.color,x:plate.x+plate.w/2,y:plate.y-23,collected:false}));
  }
  if(index===1||index===4)room.plates.forEach((plate,i)=>{plate.owner=room.players[i].id;plate.color=room.players[i].color;});
  room.players.forEach((p,i)=>{const x=index>=3?45+i*26:68+i*43;Object.assign(p,{x,y:FLOOR-42,vx:0,vy:0,dragVX:0,grabbed:null,spark:false,grounded:true,input:{left:false,right:false,jump:false,grip:false},jumpHeld:false,checkpoint:{x,y:FLOOR-42},checkpointStage:0,respawnUntil:0,route:0,rescueUntil:0,navCheckpoint:-1,navUnlocked:false,gripHeld:false,ropeHandY:20});});
}

function solids(room) {
  const platforms = [...LEVELS[room.level].platforms];
  if (!room.unlocked) platforms.push({x:1060,y:FLOOR-200,w:20,h:200,gate:true});
  if(room.level===2) platforms.push(room.box);
  const river=LEVELS[room.level].river;
  if(river){platforms.push({x:0,y:FLOOR,w:river.x,h:2000},{x:river.x+river.w,y:FLOOR,w:WIDTH-river.x-river.w,h:2000});}
  else platforms.push({x:0,y:FLOOR,w:WIDTH,h:2000});
  return platforms;
}

export function stepRoom(room, dt) {
  if(!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,1/20);
  const count=Math.ceil(dt/PHYSICS_STEP);
  for(let i=0;i<count;i++)stepRoomSlice(room,dt/count);
}

function stepRoomSlice(room, dt) {
  if(room.status!=='playing' || room.players.some(p=>!p.connected)) return;
  dt = Math.min(dt, 1/20);
  room.elapsed += dt;
  const level=LEVELS[room.level];
  if(room.level===4){const phase=room.elapsed%level.relayPeriod;room.signalOpen=phase>=level.relayOpenAt&&phase<level.relayCloseAt;room.signalRemaining=room.signalOpen?level.relayCloseAt-phase:0;}
  if(room.level===2 && !room.unlocked) {
    const box=room.box;
    room.pushers = room.players.filter(p=>p.input.right && !p.input.left && p.x+p.w<=box.x+10 && p.x+p.w>box.x-150 && Math.abs(p.y+p.h-FLOOR)<10).length;
    room.pushHold=room.pushers>=room.requiredPushers?room.pushHold+dt:0;
    let nextX=box.x;
    if(room.pushHold>=.35)nextX=Math.min(925,box.x+72*dt);
    else if(room.pushers<room.requiredPushers)nextX=Math.max(610,box.x-25*dt);
    moveSolidHorizontally(box,nextX-box.x,room.players,solids(room),WIDTH);
    room.progress = (box.x-610)/315;
    if(box.x>=925) { room.unlocked=true; room.progress=1; }
  }
  const obstacles = solids(room);
  refreshGrounding(room.players,obstacles);
  const move=(p,dx,dy)=>moveBody(p,dx,dy,obstacles,WIDTH);
  for(const p of room.players){
    p.previousY=p.y;p.wasGrounded=p.grounded;
    const direction=Number(Boolean(p.input.right))-Number(Boolean(p.input.left));
    const grip=p.input.grip&&p.grounded;
    const belt=level.belts?.find(b=>p.grounded&&Math.abs(p.y+p.h-b.y)<5&&p.x+p.w>b.x&&p.x<b.x+b.w);
    const wind=level.wind&&p.x>170&&p.x<1080?level.wind.strength*(.55+.45*Math.sin(room.elapsed*Math.PI*2/level.wind.period))*3.2:0;
    p.vx+=wind*dt;
    const target=direction*(grip?135:225)+(grip?0:belt?.speed||0);
    if(p.grounded)p.vx=approach(p.vx,target,(direction?1850:grip?2600:480)*dt);
    else if(direction)p.vx=approach(p.vx,target,1100*dt);
    else p.vx*=Math.exp(-.12*dt);
    if(direction)p.facing=direction;
    const reeling=p.input.grip&&room.links.some(l=>{if(l.a!==p.id&&l.b!==p.id)return false;const q=room.players.find(q=>q.id===(l.a===p.id?l.b:l.a));return q&&!q.grounded&&(q.y>p.y+18||l.rescue);});
    if(p.input.jump&&!reeling&&!p.jumpHeld&&p.grounded){p.vy=-510;p.grounded=false;}
    p.jumpHeld=Boolean(p.input.jump);
    p.vy+=GRAVITY*dt;
    move(p,p.vx*dt,p.vy*dt);
  }
  const contacts=()=>{solvePlayerContacts(room.players,move);refreshGrounding(room.players,obstacles);};
  contacts();
  room.ropeGeometry||=buildRopeGeometry(obstacles.filter(o=>!o.gate&&o!==room.box));
  solveRopes(room,dt,move,contacts,room.ropeGeometry);
  contacts();
  if(level.river)for(const p of room.players){
    const cp=level.platforms[level.checkpoint];
    if(p.grounded&&Math.abs(p.y+p.h-cp.y)<3&&p.x+p.w>cp.x+8&&p.x<cp.x+cp.w-8){p.checkpoint={x:cp.x+cp.w/2-16,y:cp.y-p.h};p.checkpointStage=level.checkpoint+1;}
    if(p.y>HEIGHT+140){
      const group=linkedGroup(room,p.id),stage=Math.min(...group.map(p=>p.checkpointStage));
      group.forEach((member,i)=>{const cp=stage?level.platforms[level.checkpoint]:null;const x=cp?cp.x+cp.w/2-16+(i-(group.length-1)/2)*6:45+room.players.indexOf(member)*26,y=cp?cp.y-member.h:FLOOR-member.h;Object.assign(member,{x,y,vy:0,vx:0,dragVX:0,grabbed:null,grounded:true,checkpoint:{x,y},checkpointStage:stage,respawnUntil:room.elapsed+.5,route:0});});
    }
  }
  if(hasStars(room.level)) {
    for(const s of room.stars) {
      const p=room.players.find(p=>p.id===s.owner);
      if(!s.collected && p && rectsOverlap(p,{x:s.x-19,y:s.y-19,w:38,h:38})) {s.collected=true;p.spark=true;}
    }
    if(room.level!==5){room.progress=room.stars.filter(s=>s.collected).length/room.stars.length;room.unlocked=room.progress===1;}
  }
  if([1,5].includes(room.level) && !room.unlocked) {
    const assigned=new Set();
    for(const plate of room.plates) {
      const occupant=room.players.find(p=>!assigned.has(p.id) && (!plate.owner||plate.owner===p.id) && onPlate(p,plate));
      plate.active=Boolean(occupant);
      if(occupant) assigned.add(occupant.id);
    }
    const starsReady=room.level!==5||room.stars.every(s=>s.collected);
    room.progress=assigned.size===room.players.length&&starsReady ? Math.min(1,room.progress+dt/level.holdSeconds) : 0;
    if(room.progress>=1) room.unlocked=true;
  }
  if(room.level===4&&!room.unlocked){
    const id=room.relayOrder[room.relayStep],p=room.players.find(p=>p.id===id),plate=room.plates.find(plate=>plate.owner===id);
    const touching=onPlate(p,plate);
    if(!touching){room.relayArmed=true;room.relayHold=0;}
    else if(!room.signalOpen){room.relayArmed=false;room.relayHold=0;}
    else if(room.relayArmed){
      room.relayHold+=dt;
      if(room.relayHold>=level.relayHold){
        plate.active=true;room.relayStep++;room.relayHold=0;
        if(room.relayStep===room.players.length)room.unlocked=true;
        else {const next=room.players.find(p=>p.id===room.relayOrder[room.relayStep]);room.relayArmed=!onPlate(next,room.plates.find(plate=>plate.owner===next.id));}
      }
    }
    room.progress=room.relayStep/room.players.length;
  }
  room.exitCount=room.players.filter(p=>p.x>1130 && p.y+p.h>FLOOR-160&&p.y<FLOOR).length;
  if(room.unlocked && room.exitCount===room.players.length) room.status=room.level===LEVELS.length-1?'finished':'cleared';
}

export function publicRoom(room, selfId) {
  return {code:room.code,selfId,hostId:room.hostId,status:room.status,level:room.level,elapsed:room.elapsed||0,links:room.links||[],ropeMode:room.ropeMode,ropeLength:room.ropeLength,retro:room.retro||null,relayOrder:room.relayOrder||[],relayStep:room.relayStep||0,relayHold:room.relayHold||0,relayArmed:room.relayArmed,signalOpen:room.signalOpen,signalRemaining:room.signalRemaining||0,unlocked:room.unlocked,progress:room.progress||0,stars:room.stars||[],plates:room.plates||[],box:room.box,exitCount:room.exitCount||0,pushers:room.pushers||0,requiredPushers:room.requiredPushers||0,players:room.players.map(({input,jumpHeld,token,tokenHash,ws,...p})=>p)};
}
import { solveRopes, linkedGroup } from './ropes.js';
