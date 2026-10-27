export const GRAVITY=1350;
export const PHYSICS_STEP=1/120;
const overlapX=(a,b)=>a.x+a.w>b.x+.01&&a.x<b.x+b.w-.01;

export function moveSolidHorizontally(solid,dx,players,obstacles,width){
  if(!dx)return;
  const oldX=solid.x,oldRight=oldX+solid.w;
  const otherSolids=obstacles.filter(o=>o!==solid);
  solid.x+=dx;
  for(const p of players){
    const riding=p.x+p.w>oldX+.01&&p.x<oldRight-.01&&Math.abs(p.y+p.h-solid.y)<.15;
    if(riding){moveBody(p,dx,0,otherSolids,width);continue;}
    if(p.y+p.h<=solid.y+.01||p.y>=solid.y+solid.h-.01)continue;
    // Sweep the moving face before player movement or rope corrections. Once a
    // solid overlaps a body, a crossing-only collision check cannot stop it.
    if(dx<0&&p.x<oldX&&p.x+p.w>solid.x)moveBody(p,solid.x-p.x-p.w,0,otherSolids,width);
    if(dx>0&&p.x+p.w>oldRight&&p.x<solid.x+solid.w)moveBody(p,solid.x+solid.w-p.x,0,otherSolids,width);
  }
}

export function moveBody(p,dx,dy,obstacles,width){
  const oldX=p.x,oldY=p.y;
  let x=Math.max(20,Math.min(width-p.w-20,p.x+dx));
  for(const o of obstacles){
    if(p.y+p.h<=o.y+.01||p.y>=o.y+o.h-.01)continue;
    if(dx>0&&oldX+p.w<=o.x+.1&&x+p.w>o.x)x=Math.min(x,o.x-p.w);
    if(dx<0&&oldX>=o.x+o.w-.1&&x<o.x+o.w)x=Math.max(x,o.x+o.w);
  }
  p.x=x;
  if(Math.abs(x-oldX-dx)>.001&&p.vx*dx>0)p.vx=0;
  let y=p.y+dy;
  for(const o of obstacles){
    if(!overlapX(p,o))continue;
    if(dy>0&&oldY+p.h<=o.y+.1&&y+p.h>o.y)y=Math.min(y,o.y-p.h);
    if(dy<0&&oldY>=o.y+o.h-.1&&y<o.y+o.h)y=Math.max(y,o.y+o.h);
  }
  p.y=y;
  if(Math.abs(y-oldY-dy)>.001&&p.vy*dy>0)p.vy=0;
}

export function refreshGrounding(players,obstacles){
  for(const p of players){p.grounded=obstacles.some(o=>overlapX(p,o)&&Math.abs(p.y+p.h-o.y)<.15);if(p.grounded&&p.vy>0)p.vy=0;}
  for(let i=0;i<players.length;i++)for(const p of players)if(!p.grounded){
    p.grounded=players.some(q=>q!==p&&q.grounded&&p.x+p.w>q.x+5&&p.x<q.x+q.w-5&&Math.abs(p.y+p.h-q.y)<.15);
    if(p.grounded&&p.vy>0)p.vy=0;
  }
}

export function solvePlayerContacts(players,move){
  for(const a of players)for(const b of players){
    if(a===b||a.y>=b.y||a.x+a.w<=b.x+6||a.x>=b.x+b.w-6)continue;
    if(a.previousY+a.h>b.previousY+4||a.y+a.h<=b.y)continue;
    const depth=a.y+a.h-b.y;
    if(b.grounded)move(a,0,-depth);
    else {move(a,0,-depth*.5);move(b,0,depth*.5);}
    const relative=a.vy-b.vy;
    if(relative>0){const impulse=relative/(b.grounded?1:2);a.vy-=impulse;if(!b.grounded)b.vy+=impulse;}
  }
}

export function approach(value,target,amount){return value<target?Math.min(target,value+amount):Math.max(target,value-amount);}
