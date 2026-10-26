export function ropeLinks(room){
  const links=[],players=room.players,mode=room.ropeMode;
  const add=(a,b,length,manual=false)=>{
    if(!a||!b)return;
    const previous=room.links?.find(l=>(l.a===a.id&&l.b===b.id)||(l.a===b.id&&l.b===a.id));
    const rescue=(previous?.rescue&&(a.input.grip||b.input.grip))||(a.input.grip&&(a.grounded||a.wasGrounded)&&!b.grounded&&b.y>a.y+60)||(b.input.grip&&(b.grounded||b.wasGrounded)&&!a.grounded&&a.y>b.y+60);
    if(rescue)length=Math.max(45,length-110);
    if(a.id!==b.id&&!links.some(l=>(l.a===a.id&&l.b===b.id)||(l.a===b.id&&l.b===a.id)))links.push({a:a.id,b:b.id,length,manual,rescue:Boolean(rescue)});
  };
  if(mode==='chain')for(let i=1;i<players.length;i++)add(players[i-1],players[i],room.ropeLength);
  if(mode==='pairs'){
    for(let i=1;i<players.length;i+=2)add(players[i-1],players[i],room.ropeLength);
    if(players.length>2&&players.length%2)add(players.at(-2),players.at(-1),room.ropeLength);
  }
  for(const p of players){
    p.bracing=Boolean(p.input.grip);
    if(!p.input.grip){p.grabbed=null;p.gripHeld=false;continue;}
    if(!p.gripHeld&&!p.grabbed){const near=players.filter(q=>q!==p).map(q=>({p:q,d:Math.hypot(q.x-p.x,q.y-p.y)})).filter(q=>q.d<100).sort((a,b)=>a.d-b.d)[0];if(near)p.grabbed=near.p.id;}
    p.gripHeld=true;
    const other=players.find(q=>q.id===p.grabbed);if(other)add(p,other,95,true);
  }
  return links;
}

export function solveRopes(room,dt,move){
  room.links=ropeLinks(room);
  for(let iteration=0;iteration<3;iteration++)for(const link of room.links){
    const a=room.players.find(p=>p.id===link.a),b=room.players.find(p=>p.id===link.b);
    if(iteration===0&&link.rescue){const upper=a.y<b.y?a:b,lower=upper===a?b:a;if(upper.input.grip&&lower.y>upper.y+35){lower.vy=Math.min(lower.vy,-210);lower.dragVX+=(upper.x-lower.x)*dt*.3;}}
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
    link.tension=Math.max(0,d-link.length);
    if(d<=link.length)continue;
    const nx=dx/d,ny=dy/d;
    const weight=p=>p.grounded?(p.input.grip?.08:.28):1;
    const wa=weight(a),wb=weight(b),sum=wa+wb;
    if(iteration===0){
      const impulse=Math.min(750,(d-link.length)*13)*dt;
      a.dragVX=Math.max(-240,Math.min(240,(a.dragVX||0)+nx*impulse*wa/sum));b.dragVX=Math.max(-240,Math.min(240,(b.dragVX||0)-nx*impulse*wb/sum));
    }
    // A short elastic section makes a fall tug the teammate before the line holds.
    const correction=Math.max(0,d-link.length-24)*.72;
    if(correction){move(a,nx*correction*wa/sum,ny*correction*wa/sum);move(b,-nx*correction*wb/sum,-ny*correction*wb/sum);}
    if(correction){if(a.y>b.y&&a.vy>0)a.vy*=.25;if(b.y>a.y&&b.vy>0)b.vy*=.25;}
  }
}

export function linkedGroup(room,id){
  const group=new Set([id]);let changed=true;
  while(changed){changed=false;for(const link of room.links||[])if(group.has(link.a)!==group.has(link.b)){group.add(link.a);group.add(link.b);changed=true;}}
  return room.players.filter(p=>group.has(p.id));
}
