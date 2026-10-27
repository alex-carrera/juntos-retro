import test from 'node:test';
import assert from 'node:assert/strict';
import {moveBody,refreshGrounding} from '../shared/physics.js';

test('Una caída rápida no atraviesa una plataforma delgada',()=>{
  const p={x:100,y:100,w:32,h:42,vx:0,vy:1800};
  moveBody(p,0,300,[{x:80,y:240,w:100,h:18}],1280);
  assert.equal(p.y,198);assert.equal(p.vy,0);
});

test('Apilarse sobre otro personaje en el aire no crea un apoyo flotante',()=>{
  const top={x:100,y:100,w:32,h:42,vy:50},bottom={x:100,y:142,w:32,h:42,vy:50};
  refreshGrounding([top,bottom],[]);
  assert.equal(top.grounded,false);assert.equal(bottom.grounded,false);
  refreshGrounding([top,bottom],[{x:0,y:184,w:300,h:18}]);
  assert.equal(bottom.grounded,true);assert.equal(top.grounded,true);
});
