function cuts(a,b,r){
  let lo=0,hi=1;
  for(const [origin,delta,min,max]of[[a.x,b.x-a.x,r.x+.001,r.x+r.w-.001],[a.y,b.y-a.y,r.y+.001,r.y+r.h-.001]]){
    if(Math.abs(delta)<1e-9){if(origin<=min||origin>=max)return false;}
    else{let u=(min-origin)/delta,v=(max-origin)/delta;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>=hi)return false;}
  }
  return hi>1e-6&&lo<1-1e-6;
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const visible=(a,b,geometry)=>!geometry.rects.some(r=>cuts(a,b,r));

export function buildRopeGeometry(rects){
  // Clearance for the non-rotating character body while reeling around a ledge.
  // The anchor is 20 px below the head and the feet are 42 px below it.
  // Leave enough clearance for the feet to pass the ledge when climbing.
  rects=rects.map(r=>({x:r.x-16,y:r.y-22,w:r.w+32,h:r.h+44}));
  const geometry={rects,nodes:[],edges:[]};
  for(const r of rects)for(const [x,y]of[[r.x-.4,r.y-.4],[r.x+r.w+.4,r.y-.4],[r.x-.4,r.y+r.h+.4],[r.x+r.w+.4,r.y+r.h+.4]]){
    if(x<0||x>1280||y>900)continue;
    if(rects.some(o=>x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h))continue;
    geometry.nodes.push({x,y});
  }
  geometry.edges=geometry.nodes.map(()=>[]);
  for(let i=0;i<geometry.nodes.length;i++)for(let j=i+1;j<geometry.nodes.length;j++)if(visible(geometry.nodes[i],geometry.nodes[j],geometry)){
    const d=distance(geometry.nodes[i],geometry.nodes[j]);geometry.edges[i].push([j,d]);geometry.edges[j].push([i,d]);
  }
  return geometry;
}

export function ropePath(a,b,geometry){
  if(!geometry||visible(a,b,geometry))return [a,b];
  const nodes=geometry.nodes,n=nodes.length,dist=Array(n).fill(Infinity),previous=Array(n).fill(-1),seen=new Set();
  for(let i=0;i<n;i++)if(visible(a,nodes[i],geometry))dist[i]=distance(a,nodes[i]);
  let best=Infinity,end=-1;
  for(let k=0;k<n;k++){
    let current=-1;for(let i=0;i<n;i++)if(!seen.has(i)&&(current<0||dist[i]<dist[current]))current=i;
    if(current<0||dist[current]>=best||!Number.isFinite(dist[current]))break;
    seen.add(current);
    if(visible(nodes[current],b,geometry)){const total=dist[current]+distance(nodes[current],b);if(total<best){best=total;end=current;}}
    for(const [next,d]of geometry.edges[current])if(dist[current]+d<dist[next]){dist[next]=dist[current]+d;previous[next]=current;}
  }
  if(end<0)return [a,b];
  const path=[b];for(let i=end;i>=0;i=previous[i])path.push(nodes[i]);path.push(a);return path.reverse();
}
