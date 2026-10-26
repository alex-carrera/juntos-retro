import { LEVELS, FLOOR } from './game.js';

function platformRoute(room,p,lastIndex){
  const level=LEVELS[room.level],start=p.checkpointStage? p.checkpointStage-1:0,route=[];
  if(room.unlocked&&level.river&&p.x>level.river.x+level.river.w&&p.y<FLOOR)return {target:1185,jump:false};
  if(!p.checkpointStage)route.push({x:level.platforms[0].x-100,y:FLOOR});
  for(let i=start;i<=lastIndex;i++){
    const plat=level.platforms[i];
    route.push({x:plat.x+plat.w/2-16,y:plat.y,platform:plat});
    if(i<lastIndex)route.push({x:plat.x+plat.w-36,y:plat.y});
  }
  if(room.level!==5||room.unlocked)route.push({x:1185,y:FLOOR});
  if(p.navCheckpoint!==p.checkpointStage){p.route=0;p.navCheckpoint=p.checkpointStage;}
  p.route=Math.min(p.route||0,route.length-1);
  const waypoint=route[p.route];
  const star=room.stars.find(s=>s.owner===p.id&&!s.collected);
  const mustLand=waypoint.platform&&((star&&star.x>=waypoint.platform.x&&star.x<=waypoint.platform.x+waypoint.platform.w)||(room.level===5&&!room.unlocked&&waypoint.platform===level.platforms[lastIndex]));
  const heightOK=mustLand?Math.abs(p.y+p.h-waypoint.y)<8:p.y+p.h<=waypoint.y+8;
  if(Math.abs(p.x-waypoint.x)<12&&p.grounded&&heightOK&&p.route<route.length-1)p.route++;
  const jump=p.grounded&&Boolean(waypoint.platform)&&(p.y+p.h>waypoint.y+5||p.x+p.w<waypoint.platform.x);
  return {target:waypoint.x,jump};
}

export function updateBot(room,p){
  p.input={left:false,right:false,jump:false};if(room.status!=='playing')return;
  let target=1185,jump=false;
  if(room.level===0)({target,jump}=platformRoute(room,p,LEVELS[0].platforms.length-1));
  if(room.level===1&&!room.unlocked){const i=room.players.indexOf(p);target=room.plates[i].x+14;}
  if(room.level===2&&!room.unlocked)target=room.box.x-24;
  else if(room.level===2&&room.unlocked)jump=p.grounded&&p.x<room.box.x+room.box.w&&p.x+180>room.box.x;
  if(room.level===3||room.level===5){
    const last=room.level===5&&!room.unlocked?room.players.indexOf(p):LEVELS[room.level].platforms.length-1;
    ({target,jump}=platformRoute(room,p,last));
  }
  if(room.level===4&&!room.unlocked){
    const plate=room.plates.find(plate=>plate.owner===p.id);
    const active=room.relayOrder[room.relayStep]===p.id;
    const go=active&&room.relayArmed&&room.signalOpen&&room.signalRemaining>.8;
    const holding=active&&room.relayArmed&&room.relayHold>0;
    target=go||holding?plate.x+14:plate.x-62;
  }
  const mates=(room.links||[]).filter(l=>l.a===p.id||l.b===p.id).map(l=>room.players.find(q=>q.id===(l.a===p.id?l.b:l.a)));
  if(p.grounded&&mates.some(q=>q&&!q.grounded&&q.y+q.h>FLOOR+25)){p.rescueUntil=room.elapsed+1.4;target=p.x;jump=!p.jumpHeld;}
  if(p.rescueUntil>room.elapsed){p.input.grip=true;target=p.x;}
  if(!p.grounded&&p.y+p.h>FLOOR+25){const rescuer=mates.find(q=>q&&q.y<p.y-60);if(rescuer)target=rescuer.x;}
  p.input.left=p.x>target+5;p.input.right=p.x<target-5;
  if(room.level===2&&!room.unlocked&&p.x+32>room.box.x-185)p.input.right=true;
  p.input.jump=jump&&!p.jumpHeld;
}
