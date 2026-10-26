import Phaser from 'phaser';
import { WIDTH, HEIGHT, FLOOR, LEVELS, hasStars } from '../shared/game.js';

const hex=c=>parseInt(c.replace('#',''),16);
export function createRenderer(parent,getState) {
  class Garden extends Phaser.Scene {
    create() {this.pen=this.add.graphics();this.labels=new Map();this.decor=[];this.positions=new Map();}
    update(time,delta) {
      const room=getState();if(!room?.players)return;
      const g=this.pen;g.clear();
      const night=[2,5].includes(room.level);
      g.fillStyle(night?0xe3e8ef:0xeaf0e3);g.fillRect(0,0,WIDTH,HEIGHT);
      // Distant hills, drifting clouds and little paper-like scenery.
      g.fillStyle(night?0xd7dfe6:0xe0e9d5);
      g.fillEllipse(220,660,880,680);g.fillEllipse(1080,650,900,540);
      g.fillStyle(night?0xeef0f2:0xf6f7ef,.9);
      for(const c of [{x:150,y:110,s:1},{x:660,y:150,s:.8},{x:1080,y:82,s:1.15}]){
        const x=c.x+Math.sin(time/18000+c.x)*13;
        g.fillRoundedRect(x-60*c.s,c.y,130*c.s,25*c.s,14);g.fillCircle(x-18*c.s,c.y,25*c.s);g.fillCircle(x+22*c.s,c.y-6,32*c.s);
      }
      g.fillStyle(0xf6e5a9);g.fillCircle(1030,136,33);
      g.fillStyle(night?0xbdcbd0:0xcddbbf);g.fillEllipse(30,FLOOR,270,190);g.fillEllipse(1230,FLOOR,320,160);
      g.fillStyle(night?0xa4b8a0:0xa0b58b);g.fillRoundedRect(0,FLOOR,WIDTH,HEIGHT-FLOOR,0);
      g.fillStyle(0xc8d5b7);g.fillRect(0,FLOOR,WIDTH,7);
      g.lineStyle(1,0x8da277,.35);
      for(let x=15;x<WIDTH;x+=42){g.lineBetween(x,FLOOR+24,x+10,FLOOR+25);g.lineBetween(x+16,FLOOR+52,x+22,FLOOR+53);}
      for(let i=0;i<28;i++) {
        const x=25+i*47;g.lineStyle(2,0x8da878);g.lineBetween(x,FLOOR,x-3,FLOOR-8);g.lineBetween(x,FLOOR,x+5,FLOOR-10);
        if(i%4===0){g.fillStyle(i%3===0?0xf4e5ab:0xf0ceb5);g.fillCircle(x+5,FLOOR-13,3);}
      }
      const level=LEVELS[room.level];
      if(level.river){
        const r=level.river;g.fillStyle(0x9bbac0);g.fillRect(r.x,FLOOR,r.w,HEIGHT-FLOOR);
        g.fillStyle(0xd8e7e2,.65);g.fillRect(r.x,FLOOR,r.w,5);g.lineStyle(2,0xcce0dd,.6);
        for(let x=r.x+12;x<r.x+r.w-15;x+=45){const shift=Math.sin(time/700+x)*6;g.lineBetween(x+shift,FLOOR+22,x+shift+17,FLOOR+22);g.lineBetween(x+10-shift,FLOOR+49,x+28-shift,FLOOR+49);}
        const cp=level.platforms[level.checkpoint];g.lineStyle(3,0x7a9673);g.lineBetween(cp.x+cp.w/2,cp.y,cp.x+cp.w/2,cp.y-67);g.fillStyle(0xe8bd68);g.fillTriangle(cp.x+cp.w/2,cp.y-67,cp.x+cp.w/2+30,cp.y-55,cp.x+cp.w/2,cp.y-43);
      }
      for(const p of LEVELS[room.level].platforms){
        g.fillStyle(0xaabb94);g.fillRoundedRect(p.x,p.y,p.w,p.h,6);g.fillStyle(0xc8d7b5);g.fillRoundedRect(p.x,p.y,p.w,6,3);
        g.fillStyle(0xb5c7a0,.3);g.fillRoundedRect(p.x+10,p.y+p.h,p.w-20,19,5);
      }
      for(const belt of level.belts||[]){
        g.fillStyle(0x8b9990);g.fillRoundedRect(belt.x,belt.y-2,belt.w,17,5);g.lineStyle(2,0xe3e4ce,.8);
        const offset=(time*Math.abs(belt.speed)/1000)%28;
        for(let x=belt.x+9+offset;x<belt.x+belt.w-12;x+=28){const d=Math.sign(belt.speed);g.lineBetween(x-d*5,belt.y+2,x,belt.y+7);g.lineBetween(x,belt.y+7,x-d*5,belt.y+12);}
      }
      if(level.wind){g.lineStyle(2,0x9cafb2,.45);for(let i=0;i<12;i++){const x=180+(i*109-time*.12)%870,y=210+(i%4)*77;g.lineBetween(x,y,x+25,y);g.lineBetween(x+8,y-4,x,y);}}
      // A little wayfinding sign and the exit arch.
      g.fillStyle(0xb5b99a);g.fillRect(80,FLOOR-55,5,55);g.fillStyle(0xe4ddbe);g.fillRoundedRect(53,FLOOR-64,64,26,4);
      g.lineStyle(2,0x969c7c);g.lineBetween(72,FLOOR-51,99,FLOOR-51);g.lineBetween(92,FLOOR-57,100,FLOOR-51);g.lineBetween(92,FLOOR-45,100,FLOOR-51);
      g.fillStyle(0xb8c8a6);g.fillRoundedRect(1131,FLOOR-135,104,139,{tl:49,tr:49,bl:0,br:0});
      g.fillStyle(room.unlocked?0x6f936d:0x93a586);g.fillRoundedRect(1142,FLOOR-123,82,123,{tl:41,tr:41,bl:0,br:0});
      g.fillStyle(room.unlocked?0xc0ddb0:0xb4c2a3);g.fillCircle(1183,FLOOR-87,10);
      if(room.unlocked){g.lineStyle(2,0xedf3d3,.7);g.strokeCircle(1183,FLOOR-87,18+Math.sin(time/350)*4);}
      if(!room.unlocked){g.fillStyle(0x9aa986);g.fillRoundedRect(1060,FLOOR-200,20,200,5);g.lineStyle(2,0xc7d4b5);for(let y=FLOOR-190;y<FLOOR;y+=22)g.lineBetween(1064,y,1076,y+12);}
      if(hasStars(room.level)) for(const s of room.stars){
        if(s.collected)continue;
        const y=s.y+Math.sin(time/450+s.x)*4;
        g.fillStyle(hex(s.color),.12);g.fillCircle(s.x,y,25);g.fillStyle(hex(s.color));
        const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?7:15;pts.push({x:s.x+Math.cos(a)*r,y:y+Math.sin(a)*r});}g.fillPoints(pts,true);
      }
      if([1,4,5].includes(room.level)) for(const p of room.plates){
        const current=room.level===4&&p.owner===room.relayOrder[room.relayStep];
        g.fillStyle(p.active||room.unlocked?0x79946b:p.color?hex(p.color):0xc4b99c);g.fillRoundedRect(p.x,p.y,p.w,8,3);
        if(p.active||room.unlocked){g.fillStyle(0xb6d097,.3);g.fillRoundedRect(p.x,p.y-65,p.w,65,10);}
        if(current){g.lineStyle(2,room.signalOpen?0x689862:0xdb9f73);g.strokeRoundedRect(p.x-5,p.y-8,p.w+10,20,5);}
        g.fillStyle(0xf1efd8);g.fillCircle(p.x+p.w/2,p.y+3,2);
      }
      if(room.level===4){
        g.fillStyle(0xb9bea3);g.fillRoundedRect(610,200,60,155,25);g.fillStyle(room.signalOpen?0x8cad78:0xd79372);g.fillCircle(640,230,18);g.fillStyle(room.signalOpen?0xd3e7aa:0xf0ceaa);g.fillCircle(640,230,8);
        for(let i=0;i<room.players.length;i++){g.fillStyle(i<room.relayStep?0x84a36f:0xd4d8c6);g.fillCircle(640+(i-(room.players.length-1)/2)*22,389,6);}
      }
      if(room.level===2){
        g.lineStyle(2,0x879b7b,.65);g.strokeRoundedRect(922,FLOOR-73,76,73,4);
        g.fillStyle(0x97af7d,.15);g.fillRoundedRect(923,FLOOR-72,74,72,4);
        const b=room.box;g.fillStyle(0xa9a789);g.fillRoundedRect(b.x,b.y+5,b.w,b.h-5,5);g.fillStyle(0xd7c9a5);g.fillRoundedRect(b.x,b.y,b.w,b.h-7,5);
        g.lineStyle(3,0xb6a785);g.strokeRoundedRect(b.x+8,b.y+8,b.w-16,b.h-23,3);g.lineBetween(b.x+10,b.y+10,b.x+b.w-10,b.y+b.h-17);g.lineBetween(b.x+b.w-10,b.y+10,b.x+10,b.y+b.h-17);
      }
      const known=new Set();
      for(const link of room.links||[]){
        const a=room.players.find(p=>p.id===link.a),b=room.players.find(p=>p.id===link.b);if(!a||!b)continue;
        const x1=a.x+16,y1=a.y+25,x2=b.x+16,y2=b.y+25,d=Math.hypot(x2-x1,y2-y1),sag=Math.max(0,Math.min(22,(link.length-d)*.13));
        g.lineStyle(link.manual?3:2.5,link.tension>14?0xdd8159:link.manual?0x789faa:0xb8a072,.95);
        g.beginPath();g.moveTo(x1,y1);g.lineTo((x1+x2)/2,(y1+y2)/2+sag);g.lineTo(x2,y2);g.strokePath();
      }
      for(const p of [...room.players].sort((a,b)=>a.y-b.y)){
        known.add(p.id);
        let pos=this.positions.get(p.id);
        if(!pos||Math.abs(pos.x-p.x)>200||Math.abs(pos.y-p.y)>200)pos={x:p.x,y:p.y};
        const alpha=1-Math.exp(-delta/38);pos.x+=(p.x-pos.x)*alpha;pos.y+=(p.y-pos.y)*alpha;this.positions.set(p.id,pos);
        this.character(g,p,pos.x,pos.y,time,room.selfId===p.id);
        let label=this.labels.get(p.id);
        if(!label){label=this.add.text(0,0,'',{fontFamily:'DM Sans, sans-serif',fontSize:'12px',color:'#53634b',backgroundColor:'#edf1e4',padding:{x:5,y:3}}).setOrigin(.5,1);this.labels.set(p.id,label);}
        label.setText(p.name+(p.id===room.selfId?' · tú':''));label.setPosition(pos.x+16,pos.y-17);label.setAlpha(p.connected?1:.45);
      }
      for(const [id,label] of this.labels)if(!known.has(id)){label.destroy();this.labels.delete(id);this.positions.delete(id);}
      if(!this.exitLabel)this.exitLabel=this.add.text(1184,FLOOR-150,'SALIDA',{fontFamily:'DM Sans',fontSize:'10px',color:'#849476',letterSpacing:3}).setOrigin(.5);
      if(!this.guide)this.guide=this.add.text(WIDTH/2,60,'',{fontFamily:'Outfit, sans-serif',fontSize:'16px',color:'#93a086'}).setOrigin(.5);
      const relayName=room.players.find(p=>p.id===room.relayOrder?.[room.relayStep])?.name||'';
      this.guide.setText(room.unlocked?'Puerta abierta. ¡Nos vemos al otro lado!':room.level===0?'La cuerda tira de tu compañero. Avancen juntos.':room.level===1?'La cinta arrastra. E o Agarrar permite frenar.':room.level===2?`Hacen falta ${room.requiredPushers} empujando contra las ráfagas.`:room.level===3?'Si alguien cae, frenen y tiren de la cuerda para rescatarlo.':room.level===4?`Turno de ${relayName} · ${room.signalOpen?'VERDE: entra y frena':'espera fuera del botón'}`:'Una cadena, siete botones. Frenen y sostengan dos segundos.');
    }
    character(g,p,x,y,time,isMe){
      const c=hex(p.color),bounce=p.grounded&&Math.abs(p.vx)>5?Math.sin(time/85)*2:0;y+=bounce;
      if(p.grounded){g.fillStyle(0x4d6446,.12);g.fillEllipse(x+16,y+44,34,8);}
      if(p.bracing){g.lineStyle(2,0xf2e4b7,.9);g.strokeCircle(x+16,y+24,25);}
      g.fillStyle(c,p.connected?1:.35);
      if(p.accessory==='ears'){g.fillTriangle(x+1,y+8,x+1,y-8,x+14,y+3);g.fillTriangle(x+18,y+3,x+31,y-8,x+31,y+10);}
      g.fillRoundedRect(x,y,32,37,11);
      const walk=p.grounded?Math.sin(time/85)*Math.min(3,Math.abs(p.vx)/60):0;
      g.fillRoundedRect(x+4,y+31+walk,9,11,4);g.fillRoundedRect(x+20,y+31-walk,9,11,4);
      g.fillCircle(x-1,y+23+walk,4);g.fillCircle(x+33,y+23-walk,4);
      if(p.accessory==='sprout'){g.lineStyle(2,0x576f44);g.lineBetween(x+16,y,x+16,y-12);g.fillStyle(0x789361);g.fillEllipse(x+11,y-11,12,6);g.fillEllipse(x+22,y-15,12,7);}
      if(p.accessory==='cap'){g.fillStyle(0x46515e);g.fillRoundedRect(x-1,y-5,34,13,{tl:10,tr:10,bl:0,br:0});g.fillRoundedRect(x+16,y+4,24,4,2);}
      g.fillStyle(0x303943);g.fillEllipse(x+10+p.facing*1.5,y+15,3,5);g.fillEllipse(x+23+p.facing*1.5,y+15,3,5);
      g.lineStyle(1.3,0x303943);g.lineBetween(x+14,y+24,x+17,y+26);g.lineBetween(x+17,y+26,x+20,y+24);
      g.fillStyle(0xffffff,.25);g.fillCircle(x+6,y+22,3);g.fillCircle(x+28,y+22,3);
      if(isMe){g.fillStyle(0xe97752);g.fillTriangle(x+12,y-40,x+20,y-40,x+16,y-34);}
    }
  }
  const game=new Phaser.Game({type:Phaser.AUTO,parent,width:WIDTH,height:HEIGHT,backgroundColor:'#eaf0e3',scene:Garden,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,roundPixels:false},audio:{noAudio:true},banner:false});
  return ()=>game.destroy(true);
}
