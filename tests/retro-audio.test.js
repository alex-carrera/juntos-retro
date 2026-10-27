import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoundAudio } from '../src/retro-audio.js';
import { newRound, ROUND_MS } from '../shared/retro-round.js';

test('El audio de quien entra tarde se alinea al bloque y programa el corte sin esperar otro tick de JavaScript',async t=>{
  const previous={window:globalThis.window,location:globalThis.location,fetch:globalThis.fetch};
  const sources=[];let context,now=1_800_000_030_000,reported;
  class AudioContext{
    constructor(){context=this;this.state='running';this.currentTime=10;this.destination={};}
    createGain(){return {gain:{value:0,setTargetAtTime(){}},connect(){}};}
    createBufferSource(){const source={connect(){},disconnect(){},start(...args){this.started=args;},stop(...args){(this.stops||=[]).push(args);}};sources.push(source);return source;}
    async decodeAudioData(){return {duration:214};}
    async resume(){this.state='running';}
    async close(){this.state='closed';}
  }
  globalThis.window={AudioContext};globalThis.location={href:'https://example.test/retro/'};
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
  const audio=createRoundAudio(()=>now,value=>reported=value);
  t.after(()=>{audio.destroy();for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
  const round={...newRound(),mode:'running',endsAt:now+ROUND_MS-30_000,run:1};
  audio.sync(round);await audio.activate();await new Promise(setImmediate);
  assert.equal(reported.playing,true);
  assert.deepEqual(sources[0].started,[10,30]);
  assert.deepEqual(sources[0].stops[0],[280]); // Hardware audio clock stops in 270 seconds.
  audio.sync({...round,mode:'discuss',endsAt:null,remainingMs:0});
  assert.equal(reported.playing,false);assert.deepEqual(sources[0].stops[1],[]);
  audio.sync(round);await new Promise(setImmediate);assert.equal(reported.playing,true);
  audio.sync(round,false);assert.equal(reported.playing,false);
  now=round.endsAt+1;context.currentTime=281;audio.sync(round);assert.equal(reported.playing,false);
});
