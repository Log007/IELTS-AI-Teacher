import assert from 'node:assert/strict';
import {createPronunciationButton} from '../src/pronunciation.js';
globalThis.document={createElement:()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v}})};
let notices=[],spoken=[],cancels=0;globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
let voices=[{lang:'en-US',localService:true},{lang:'en-GB',localService:true}];
globalThis.speechSynthesis={getVoices:()=>voices,cancel:()=>cancels++,resume(){},speak(u){spoken.push(u);u.onstart()}};
const a=createPronunciationButton('habitat',t=>notices.push(t));a.onclick();assert.equal(spoken[0].text,'habitat');assert.equal(spoken[0].voice.lang,'en-GB');assert.equal(a.attributes['aria-pressed'],'true');a.onclick();assert.equal(a.attributes['aria-pressed'],'false');assert(cancels>0);
voices=[{lang:'en-US'}];a.onclick();assert.match(notices.at(-1),/没有英式音色/);spoken.at(-1).onerror();assert.equal(a.attributes['aria-pressed'],'false');assert.match(notices.at(-1),/播放失败/);
voices=[];a.onclick();assert.equal(spoken.at(-1).lang,'en-GB');spoken.at(-1).onend();
delete globalThis.speechSynthesis;a.onclick();assert.match(notices.at(-1),/不支持朗读/);
console.log('PASS: UK voice priority, word playback, stop, fallback, empty voice list, errors and unsupported browser');

