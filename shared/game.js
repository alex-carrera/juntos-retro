export const WIDTH = 1280;
export const HEIGHT = 680;
export const FLOOR = 594;
export const MAX_PLAYERS = 7;
export const PALETTE = ['#ed7757', '#e8b544', '#7d9e78', '#719eb0', '#a98abb', '#df94a3', '#8caaa1'];
export const LEVELS = [
  { title: 'Una chispa por persona', subtitle: 'Busca la estrella de tu color. La puerta necesita las de todos.', tag: '01 · CONECTAR', platforms: [{x:340,y:514,w:145,h:18},{x:540,y:454,w:145,h:18},{x:740,y:514,w:145,h:18}] },
  { title: 'En la misma sintonía', subtitle: 'Una persona en cada botón. Manténganlos todos encendidos un instante.', tag: '02 · ESCUCHAR', platforms: [] },
  { title: 'El último empujón', subtitle: 'Acérquense al bloque y caminen hacia la derecha al mismo tiempo.', tag: '03 · COLABORAR', platforms: [] },
];
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
  room.players.forEach((p,i)=>Object.assign(p,{x:68+i*43,y:FLOOR-42,vx:0,vy:0,spark:false,grounded:true,input:{left:false,right:false,jump:false},jumpHeld:false}));
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
  if(room.level===2 && !room.unlocked) {
    const box=room.box;
    room.pushers = room.players.filter(p=>p.input.right && !p.input.left && p.x+p.w<=box.x+10 && p.x+p.w>box.x-185 && Math.abs(p.y+p.h-FLOOR)<10).length;
    if(room.pushers>=room.requiredPushers) box.x = Math.min(925,box.x+100*dt);
    room.progress = (box.x-610)/315;
    if(box.x>=925) { room.unlocked=true; room.progress=1; }
  }
  const obstacles = solids(room);
  for(const p of room.players) {
    const move = Number(p.input.right)-Number(p.input.left);
    p.vx = move*225;
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
    if(p.y+p.h>=FLOOR) {p.y=FLOOR-p.h;p.vy=0;p.grounded=true;}
    for(const o of obstacles) if(rectsOverlap(p,o)) {
      if(p.vy>=0 && before<=o.y+3) {p.y=o.y-p.h;p.vy=0;p.grounded=true;}
      else if(p.vy<0 && before-p.h>=o.y+o.h-3) {p.y=o.y+o.h;p.vy=0;}
    }
    // Players can stand on teammates without trapping one another horizontally.
    for(const other of room.players) if(other.id!==p.id && p.vy>=0 && before<=other.y+4 && p.y+p.h>=other.y && p.x+p.w>other.x+4 && p.x<other.x+other.w-4) {
      p.y=other.y-p.h;p.vy=0;p.grounded=true;
    }
  }
  if(room.level===0) {
    for(const s of room.stars) {
      const p=room.players.find(p=>p.id===s.owner);
      if(!s.collected && p && rectsOverlap(p,{x:s.x-19,y:s.y-19,w:38,h:38})) {s.collected=true;p.spark=true;}
    }
    room.progress=room.stars.filter(s=>s.collected).length/room.stars.length;
    room.unlocked=room.progress===1;
  }
  if(room.level===1 && !room.unlocked) {
    const assigned=new Set();
    for(const plate of room.plates) {
      const occupant=room.players.find(p=>!assigned.has(p.id) && p.grounded && Math.abs(p.y+p.h-FLOOR)<4 && p.x+p.w>plate.x+8 && p.x<plate.x+plate.w-8);
      plate.active=Boolean(occupant);
      if(occupant) assigned.add(occupant.id);
    }
    room.progress=assigned.size===room.players.length ? Math.min(1,room.progress+dt/1.1) : 0;
    if(room.progress>=1) room.unlocked=true;
  }
  room.exitCount=room.players.filter(p=>p.x>1130 && p.y+p.h>FLOOR-160).length;
  if(room.unlocked && room.exitCount===room.players.length) room.status=room.level===2?'finished':'cleared';
}

export function publicRoom(room, selfId) {
  return {code:room.code,selfId,hostId:room.hostId,status:room.status,level:room.level,unlocked:room.unlocked,progress:room.progress||0,stars:room.stars||[],plates:room.plates||[],box:room.box,exitCount:room.exitCount||0,pushers:room.pushers||0,requiredPushers:room.requiredPushers||0,players:room.players.map(({input,jumpHeld,token,ws,...p})=>p)};
}
