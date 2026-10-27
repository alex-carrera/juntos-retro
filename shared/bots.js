import { LEVELS, FLOOR } from './game.js';

function platformRoute(room,p,lastIndex){
  const level=LEVELS[room.level],start=room.unlocked?0:p.checkpointStage? p.checkpointStage-1:0,route=[];
  if(room.unlocked&&level.river&&p.x>level.platforms.at(-1).x-32)return {target:1185,jump:false};
  if(!p.checkpointStage||room.unlocked)route.push({x:level.platforms[0].x-100,y:FLOOR});
  const traversal=start<=lastIndex?1:-1;
  for(let i=start;traversal>0?i<=lastIndex:i>=lastIndex;i+=traversal){
    const plat=level.platforms[i];
    route.push({x:plat.x+plat.w/2-16,y:plat.y,platform:plat});
    if(i!==lastIndex)route.push({x:traversal>0?plat.x+plat.w-36:plat.x+4,y:plat.y});
  }
  if(room.level!==5||room.unlocked)route.push({x:1185,y:FLOOR});
  if(p.navCheckpoint!==p.checkpointStage||p.navUnlocked!==room.unlocked){p.route=0;p.navCheckpoint=p.checkpointStage;p.navUnlocked=room.unlocked;}
  p.route=Math.min(p.route||0,route.length-1);
  if(room.unlocked&&p.grounded){const standing=level.platforms.findIndex(plat=>p.x+p.w>plat.x&&p.x<plat.x+plat.w&&p.y+p.h<=plat.y+3);if(standing>=0)p.route=Math.max(p.route,Math.min(route.length-1,standing*2+2));}
  const partners=(room.links||[]).filter(l=>!l.manual&&(l.a===p.id||l.b===p.id)).map(l=>room.players.find(q=>q.id===(l.a===p.id?l.b:l.a)));
  if([0,3].includes(room.level)&&p.grounded&&partners.some(q=>q&&q.route<p.route))return {target:p.x,jump:false,waiting:true};
  const waypoint=route[p.route];
  const star=room.stars.find(s=>s.owner===p.id&&!s.collected);
  const mustLand=waypoint.platform&&((star&&star.x>=waypoint.platform.x&&star.x<=waypoint.platform.x+waypoint.platform.w)||(room.level===5&&!room.unlocked&&waypoint.platform===level.platforms[lastIndex]));
  const heightOK=mustLand?Math.abs(p.y+p.h-waypoint.y)<8:p.y+p.h<=waypoint.y+8;
  if(Math.abs(p.x-waypoint.x)<12&&p.grounded&&heightOK&&p.route<route.length-1)p.route++;
  let target=waypoint.x;
  const below=waypoint.platform&&p.y+p.h>waypoint.y+5;
  if(below&&p.y>=waypoint.platform.y+waypoint.platform.h-.2&&p.x+p.w>waypoint.platform.x&&p.x<waypoint.platform.x+waypoint.platform.w){return {target:waypoint.platform.x-p.w-24,jump:false};}
  const jump=p.grounded&&Boolean(waypoint.platform)&&(below||p.x+p.w<waypoint.platform.x)&&p.vx*(target>=p.x?1:-1)>105;
  return {target,jump};
}

export function updateBot(room,p){
  p.input={left:false,right:false,jump:false};if(room.status!=='playing')return;
  let target=1185,jump=false,reeling=false;
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
  const finalReady=room.level===5&&room.stars.every(s=>s.collected);
  const missedLedge=q=>{if(!finalReady)return false;const goal=LEVELS[5].platforms[room.players.indexOf(q)];return q.y+q.h>goal.y+8&&q.x>goal.x-60&&q.x<goal.x+goal.w+60;};
  const mates=(room.links||[]).filter(l=>l.a===p.id||l.b===p.id).map(l=>room.players.find(q=>q.id===(l.a===p.id?l.b:l.a)));
  if(p.grounded&&mates.some(q=>q&&!q.grounded&&q.y>p.y+18&&(!finalReady||room.unlocked||q.y+q.h>FLOOR+30||missedLedge(q)))){p.rescueUntil=room.elapsed+.25;target=p.x;jump=false;}
  if(p.rescueUntil>room.elapsed){p.input.grip=true;reeling=true;const fallen=mates.find(q=>q&&!q.grounded&&q.y>p.y+16);target=fallen&&!finalReady?p.x+(p.x>=fallen.x?60:-60):p.x;}
  if(!p.grounded&&(p.y+p.h>FLOOR+25||room.unlocked&&(room.links||[]).some(l=>(l.a===p.id||l.b===p.id)&&l.rescue))){const rescuer=mates.find(q=>q&&q.y<p.y-20);if(rescuer)target=rescuer.x;}
  p.input.left=p.x>target+5;p.input.right=p.x<target-5;
  if(room.level===2&&!room.unlocked&&p.x+32>room.box.x-185)p.input.right=true;
  if(p.grounded&&Math.abs(p.x-target)<9)p.input.grip=true;
  if(!p.grounded&&!room.stars.every(s=>s.collected)&&(room.links||[]).some(l=>(l.a===p.id||l.b===p.id)&&l.taut&&l.points?.length>2)){p.input.grip=true;reeling=true;}
  // The demo braces deliberately without accidentally grabbing an unrelated teammate.
  if(p.input.grip)p.gripHeld=true;
  p.input.jump=reeling||jump&&!p.jumpHeld;
}
