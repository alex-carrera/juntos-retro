import { ropePath, visible } from './rope-path.js';
import { approach } from './physics.js';

export function ropeLinks(room,dt=1/120,geometry=null){
  const links=[],players=room.players;
  const add=(a,b,restLength,manual=false)=>{
    if(!a||!b||links.some(l=>(l.a===a.id&&l.b===b.id)||(l.a===b.id&&l.b===a.id)))return;
    const previous=room.links?.find(l=>(l.a===a.id&&l.b===b.id)||(l.a===b.id&&l.b===a.id));
    const upper=a.y<b.y?a:b,lower=upper===a?b:a;
    const wrapped=previous?.points?.length>2&&(previous.taut||previous.rescue);
    const climbing=wrapped&&(!a.grounded&&a.input.jump||!b.grounded&&b.input.jump);
    const rescue=climbing||!lower.grounded&&upper.input.grip&&upper.input.jump&&upper.grounded&&(lower.y>upper.y+18||previous?.rescue);
    // Reeling does work gradually; gripping in midair never creates an anchor.
    let span=0;
    for(let i=2;i<(previous?.points?.length||0)-1;i++)span+=Math.hypot(previous.points[i].x-previous.points[i-1].x,previous.points[i].y-previous.points[i-1].y);
    // A winch cannot shorten the section spanning fixed terrain corners.
    const target=rescue?Math.min(restLength,Math.max(24,span)):upper.input.grip&&previous?.rescue?previous.length:restLength;
    const length=approach(previous?.length??restLength,target,(target<restLength?38:70)*dt);
    const anchorA=approach(previous?.anchorA??20,rescue&&upper===a&&upper.grounded?-12:20,45*dt),anchorB=approach(previous?.anchorB??20,rescue&&upper===b&&upper.grounded?-12:20,45*dt);
    links.push({a:a.id,b:b.id,anchorA,anchorB,anchorRateA:(anchorA-(previous?.anchorA??20))/dt,anchorRateB:(anchorB-(previous?.anchorB??20))/dt,restLength,length,lengthRate:(length-(previous?.length??restLength))/dt,manual,rescue:Boolean(rescue),tension:0});
  };
  if(room.ropeMode==='chain')for(let i=1;i<players.length;i++)add(players[i-1],players[i],room.ropeLength);
  if(room.ropeMode==='pairs'){
    for(let i=1;i<players.length;i+=2)add(players[i-1],players[i],room.ropeLength);
    if(players.length>2&&players.length%2)add(players.at(-2),players.at(-1),room.ropeLength);
  }
  for(const p of players){
    p.bracing=Boolean(p.input.grip&&p.grounded);
    if(!p.input.grip){p.grabbed=null;p.gripHeld=false;continue;}
    if(!p.gripHeld&&!p.grabbed){const near=players.filter(q=>q!==p).map(q=>({p:q,d:Math.hypot(q.x-p.x,q.y-p.y)})).filter(q=>q.d<90&&(!geometry||visible({x:p.x+16,y:p.y+20},{x:q.p.x+16,y:q.p.y+20},geometry))).sort((a,b)=>a.d-b.d)[0];if(near)p.grabbed=near.p.id;}
    p.gripHeld=true;
    const other=players.find(q=>q.id===p.grabbed);if(other)add(p,other,85,true);
  }
  for(const p of players)p.ropeHandY=20;
  for(const l of links){const a=players.find(p=>p.id===l.a),b=players.find(p=>p.id===l.b);a.ropeHandY=Math.min(a.ropeHandY,l.anchorA);b.ropeHandY=Math.min(b.ropeHandY,l.anchorB);}
  return links;
}

export function solveRopes(room,dt,move,contacts=()=>{},geometry=null){
  room.links=ropeLinks(room,dt,geometry);
  const players=new Map(room.players.map(p=>[p.id,p]));
  for(let iteration=0;iteration<12;iteration++){
    const links=iteration%2?[...room.links].reverse():room.links;
    for(const link of links){
      const a=players.get(link.a),b=players.get(link.b);
      const points=ropePath({x:a.x+16,y:a.y+link.anchorA},{x:b.x+16,y:b.y+link.anchorB},geometry);
      let d=0;for(let i=1;i<points.length;i++)d+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
      if(d<.0001)continue;
      const first=points[1],last=points.at(-2),ad=Math.hypot(first.x-points[0].x,first.y-points[0].y)||1,bd=Math.hypot(last.x-points.at(-1).x,last.y-points.at(-1).y)||1;
      const anx=(first.x-points[0].x)/ad,any=(first.y-points[0].y)/ad,bnx=(last.x-points.at(-1).x)/bd,bny=(last.y-points.at(-1).y)/bd;
      const ay=a.grounded&&any>0?0:any,by=b.grounded&&bny>0?0:bny;
      const ax=anx*(a.grounded&&a.input.grip?.08:1),bx=bnx*(b.grounded&&b.input.grip?.08:1);
      const mass=anx*ax+any*ay+bnx*bx+bny*by;
      if(mass<.00001)continue;
      const stretch=d-link.length;
      link.tension=Math.max(link.tension,stretch);
      if(stretch>.05){const correction=(stretch-.05)*.9/mass;move(a,ax*correction,ay*correction);move(b,bx*correction,by*correction);}
      if(stretch>=-.3){
        const outward=-(a.vx*anx+(a.vy+link.anchorRateA)*any+b.vx*bnx+(b.vy+link.anchorRateB)*bny);
        // Remove separating velocity, preserving tangential swing and airborne momentum.
        if(outward>link.lengthRate){const impulse=(outward-link.lengthRate)/mass;a.vx+=ax*impulse;a.vy+=ay*impulse;b.vx+=bx*impulse;b.vy+=by*impulse;}
      }
    }
    contacts();
  }
  for(const link of room.links){
    const a=players.get(link.a),b=players.get(link.b);link.points=ropePath({x:a.x+16,y:a.y+link.anchorA},{x:b.x+16,y:b.y+link.anchorB},geometry);
    let distance=0;for(let i=1;i<link.points.length;i++)distance+=Math.hypot(link.points[i].x-link.points[i-1].x,link.points[i].y-link.points[i-1].y);
    link.taut=distance>link.length-.7;
  }
}

export function linkedGroup(room,id){
  const group=new Set([id]);let changed=true;
  while(changed){changed=false;for(const link of room.links||[])if(group.has(link.a)!==group.has(link.b)){group.add(link.a);group.add(link.b);changed=true;}}
  return room.players.filter(p=>group.has(p.id));
}
