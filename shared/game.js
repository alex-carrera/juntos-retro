export const WIDTH = 1280;
export const HEIGHT = 680;
export const FLOOR = 594;
export const MAX_PLAYERS = 7;
export const PALETTE = ['#ed7757', '#e8b544', '#7d9e78', '#719eb0', '#a98abb', '#df94a3', '#8caaa1'];
export const LEVELS = [
  { title: 'Unidos desde el inicio', subtitle: 'Cada persona recoge su chispa. La cuerda los une: avancen con su compañero, sin dejarlo atrás.', tag: '01 · UNIRSE', ropeMode:'pairs',ropeLength:185, platforms: [{x:340,y:514,w:145,h:18},{x:540,y:454,w:145,h:18},{x:740,y:514,w:145,h:18}] },
  { title: 'Contra la corriente', subtitle: 'La cinta los arrastra. Ocupen todos los botones; mantén E o Agarrar para frenar.', tag: '02 · RESISTIR', belts:[{x:150,w:820,y:FLOOR,speed:-90}], platforms: [] },
  { title: 'Arrastre en equipo', subtitle: 'Empujen juntos contra las ráfagas. La cadena tira de quienes se quedan; E permite agarrar y frenar.', tag: '03 · EMPUJAR', ropeMode:'chain',ropeLength:165,wind:{strength:-95,period:4}, platforms: [] },
  { title: 'No sueltes la cuerda', subtitle: 'Crucen por parejas. Si alguien cae, frena con E y retrocede para rescatarlo antes de caer los dos.', tag: '04 · RESCATAR', ropeMode:'pairs',ropeLength:155, platforms: [{x:220,y:524,w:110,h:18},{x:365,y:464,w:100,h:18},{x:510,y:404,w:110,h:18},{x:665,y:464,w:100,h:18},{x:810,y:524,w:100,h:18},{x:955,y:524,w:90,h:18}], river:{x:320,w:695}, checkpoint:2 },
  { title: 'Relevo en movimiento', subtitle: 'Activen por turnos con luz verde. La cinta empuja: mantén E para sostener el botón.', tag: '05 · COORDINAR',belts:[{x:160,w:820,y:FLOOR,speed:75}], platforms: [] },
  { title: 'Todos o ninguno', subtitle: 'Una sola cadena, siete alturas. Cada quien en su botón; frenen las ráfagas con E y sostengan dos segundos.', tag: '06 · SINCRONIZAR',ropeMode:'chain',ropeLength:165,wind:{strength:-65,period:5}, platforms: [{x:170,y:534,w:100,h:18},{x:300,y:474,w:90,h:18},{x:430,y:414,w:90,h:18},{x:560,y:354,w:90,h:18},{x:690,y:414,w:90,h:18},{x:820,y:474,w:90,h:18},{x:950,y:534,w:100,h:18}], river:{x:260,w:750}, checkpoint:3 },
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
  room.ropeMode=LEVELS[index].ropeMode;room.ropeLength=LEVELS[index].ropeLength;room.links=[];
  room.relayStep=0;room.relayHold=0;room.relayArmed=true;room.signalOpen=false;room.signalRemaining=0;
  room.relayOrder=[];
  for(let a=0,b=room.players.length-1;a<=b;a++,b--){room.relayOrder.push(room.players[a].id);if(a!==b)room.relayOrder.push(room.players[b].id);}
  room.box = {x:610,y:FLOOR-68,w:68,h:68};
  room.pushers = 0;
  room.requiredPushers = Math.max(1, Math.ceil(room.players.length/2));
  room.plates = room.players.map((_,i) => ({x:190+i*91, y:FLOOR-8,w:60,h:8,active:false}));
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
  if(index===4)room.plates.forEach((plate,i)=>{plate.owner=room.players[i].id;plate.color=room.players[i].color;});
  room.players.forEach((p,i)=>{const x=index>=3?45+i*26:68+i*43;Object.assign(p,{x,y:FLOOR-42,vx:0,vy:0,dragVX:0,grabbed:null,spark:false,grounded:true,input:{left:false,right:false,jump:false,grip:false},jumpHeld:false,checkpoint:{x,y:FLOOR-42},checkpointStage:0,respawnUntil:0,route:0});});
}

function solids(room) {
  const platforms = [...LEVELS[room.level].platforms];
  if (!room.unlocked) platforms.push({x:1060,y:FLOOR-200,w:20,h:200,gate:true});
  if(room.level===2) platforms.push(room.box);
  return platforms;
}

export function stepRoom(room, dt) {
  if(room.status!=='playing' || room.players.some(p=>!p.connected)) return;
  dt = Math.min(dt, 1/20);
  room.elapsed += dt;
  const level=LEVELS[room.level];
  const overRiver=p=>level.river&&p.x+p.w>level.river.x&&p.x<level.river.x+level.river.w;
  if(room.level===4){const phase=room.elapsed%3.6;room.signalOpen=phase>=1&&phase<2.6;room.signalRemaining=room.signalOpen?2.6-phase:0;}
  if(room.level===2 && !room.unlocked) {
    const box=room.box;
    room.pushers = room.players.filter(p=>p.input.right && !p.input.left && p.x+p.w<=box.x+10 && p.x+p.w>box.x-185 && Math.abs(p.y+p.h-FLOOR)<10).length;
    if(room.pushers>=room.requiredPushers) box.x = Math.min(925,box.x+100*dt);
    room.progress = (box.x-610)/315;
    if(box.x>=925) { room.unlocked=true; room.progress=1; }
  }
  const obstacles = solids(room);
  for(const p of room.players) {
    p.wasGrounded=p.grounded;
    const move = Number(p.input.right)-Number(p.input.left);
    p.dragVX=(p.dragVX||0)*(p.input.grip&&p.grounded?.55:.9);
    const belt=level.belts?.find(b=>p.grounded&&Math.abs(p.y+p.h-b.y)<5&&p.x+p.w>b.x&&p.x<b.x+b.w);
    const wind=level.wind&&p.x>170&&p.x<1080?level.wind.strength*(.55+.45*Math.sin(room.elapsed*Math.PI*2/level.wind.period)):0;
    const drag=p.input.grip&&p.grounded?0:(belt?.speed||0)+wind;
    p.vx = move*(p.input.grip?160:225)+p.dragVX+drag;
    if(move) p.facing=move;
    if(p.input.jump && !p.jumpHeld && p.grounded) {p.vy=-510; p.grounded=false;}
    p.jumpHeld=p.input.jump;
    p.vy=Math.min(720,p.vy+1350*dt);
    p.x+=p.vx*dt;
    p.x=Math.max(20,Math.min(WIDTH-p.w-20,p.x));
    for(const o of obstacles) if(rectsOverlap(p,o)) {
      if(p.vx>0) p.x=o.x-p.w;
      else if(p.vx<0) p.x=o.x+o.w;
    }
    const before=p.y+p.h;
    p.y+=p.vy*dt;
    p.grounded=false;
    if(p.y+p.h>=FLOOR&&before<=FLOOR+2&&!overRiver(p)) {p.y=FLOOR-p.h;p.vy=0;p.grounded=true;}
    for(const o of obstacles) if(rectsOverlap(p,o)) {
      if(p.vy>=0 && before<=o.y+3) {p.y=o.y-p.h;p.vy=0;p.grounded=true;}
      else if(p.vy<0 && before-p.h>=o.y+o.h-3) {p.y=o.y+o.h;p.vy=0;}
    }
    // Players can stand on teammates without trapping one another horizontally.
    for(const other of room.players) if(other.id!==p.id && p.vy>=0 && before<=other.y+4 && p.y+p.h>=other.y && p.x+p.w>other.x+4 && p.x<other.x+other.w-4) {
      p.y=other.y-p.h;p.vy=0;p.grounded=true;
    }
  }
  solveRopes(room,dt,(p,dx,dy)=>{
    const previousBottom=p.y+p.h;
    p.x=Math.max(20,Math.min(WIDTH-p.w-20,p.x+dx));
    for(const o of obstacles)if(rectsOverlap(p,o)){if(dx>0)p.x=o.x-p.w;else if(dx<0)p.x=o.x+o.w;}
    p.y+=dy;if(Math.abs(dy)>.1)p.grounded=false;
    if(dy>=0&&previousBottom<=FLOOR+2&&p.y+p.h>=FLOOR&&!overRiver(p)){p.y=FLOOR-p.h;p.vy=0;p.grounded=true;}
    for(const o of obstacles)if(rectsOverlap(p,o)){if(dy>=0&&previousBottom<=o.y+3){p.y=o.y-p.h;p.vy=0;p.grounded=true;}else if(dy<0&&previousBottom-p.h>=o.y+o.h-3){p.y=o.y+o.h;p.vy=0;}}
  });
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
    room.progress=assigned.size===room.players.length&&starsReady ? Math.min(1,room.progress+dt/(room.level===5?2:1.1)) : 0;
    if(room.progress>=1) room.unlocked=true;
  }
  if(room.level===4&&!room.unlocked){
    const id=room.relayOrder[room.relayStep],p=room.players.find(p=>p.id===id),plate=room.plates.find(plate=>plate.owner===id);
    const touching=onPlate(p,plate);
    if(!touching){room.relayArmed=true;room.relayHold=0;}
    else if(!room.signalOpen){room.relayArmed=false;room.relayHold=0;}
    else if(room.relayArmed){
      room.relayHold+=dt;
      if(room.relayHold>=.65){
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
