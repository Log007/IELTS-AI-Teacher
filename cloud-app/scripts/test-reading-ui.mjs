import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mergeHighlights,subtractHighlight,createPassageHighlighter} from '../src/highlights.js';
// Install jsdom separately, or point IELTS_DOM_MODULE to its ESM entrypoint.
const {JSDOM}=await import(process.env.IELTS_DOM_MODULE||'jsdom');
assert.deepEqual(mergeHighlights([[4,8],[1,5],[8,9],[-1,2],[10,20]],12),[[1,9]]);
assert.deepEqual(subtractHighlight([[1,9]],[3,6]),[[1,3],[6,9]]);
const dom=new JSDOM('<article></article><button id="add"></button><button id="remove"></button><button id="clear"></button><p></p>');
globalThis.document=dom.window.document;
const passage=document.querySelector('article'),add=document.querySelector('#add'),remove=document.querySelector('#remove'),clear=document.querySelector('#clear');
const data=new Map();const highlighter=createPassageHighlighter({passage,add,remove,clear,status:document.querySelector('p'),read:(k,f)=>data.get(k)||f,write:(k,v)=>data.set(k,structuredClone(v))});
const content='Alpha beta gamma <script>plain text</script>.';
highlighter.load('lesson-a',content);
function select(startNode,start,endNode,end){const r=document.createRange();r.setStart(startNode,start);r.setEnd(endNode,end);const s=document.getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new dom.window.Event('selectionchange'))}
select(passage.firstChild,6,passage.firstChild,10);add.click();assert.equal(passage.querySelector('mark').textContent,'beta');assert.equal(passage.textContent,content);assert.equal(passage.querySelector('script'),null);
// Selection spans plain text and an existing mark: offsets must remain stable.
select(passage.firstChild,0,passage.lastChild,6);add.click();assert.equal(passage.querySelectorAll('mark').length,1);assert.equal(passage.textContent,content);
highlighter.load('lesson-a',content);assert.equal(passage.querySelectorAll('mark').length,1);
const marked=passage.querySelector('mark');select(marked.firstChild,6,marked.firstChild,10);remove.click();assert.equal(passage.textContent,content);assert.equal(passage.querySelectorAll('mark').length,2);
highlighter.load('lesson-b',content);assert.equal(passage.querySelectorAll('mark').length,0);
highlighter.load('lesson-a','A changed passage');assert.equal(passage.querySelectorAll('mark').length,0);
highlighter.load('lesson-a',content);clear.click();assert.equal(passage.querySelectorAll('mark').length,0);
console.log('PASS: selection across mark nodes, merge/remove, refresh restoration, lesson isolation, changed-text guard, safe text rendering');
const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
const ui=new JSDOM(html,{url:'https://unit.test'});globalThis.document=ui.window.document;globalThis.localStorage=ui.window.localStorage;globalThis.Option=ui.window.Option;globalThis.FormData=ui.window.FormData;
const realSetInterval=globalThis.setInterval;globalThis.setInterval=()=>0;
ui.window.HTMLElement.prototype.scrollIntoView=function(){};
const testDate=process.env.IELTS_TEST_DATE||'2026-11-03',limitSeconds=testDate>='2026-11-18'?1260:1320;
const lesson={id:testDate,date:testDate,title:'Practice',topic:'Science',passage:content,translation:'段意',sentences:'句法',arrangement:'练习',vocabulary:[],seconds:limitSeconds,questions:Array.from({length:13},(_,i)=>({type:'填空题',question:i===0?'Instructions: Write NO MORE THAN ONE WORD.\nThe study used ______ to compare the results.':'Q'+i,answers:['beta'],maxWords:1,evidence:'beta',explanation:'解释',strategy:'策略'}))};
const record={id:'11111111-1111-1111-1111-111111111111',lessonId:lesson.id,title:lesson.title,topic:lesson.topic,finishedAt:'2026-11-03T00:00:00Z',score:0,total:13,elapsedSeconds:120,answers:lesson.questions.map(q=>({...q,correct:false,answer:'alpha',correctAnswer:'beta',confidence:'确定'})),feedback:{confidence:'大部分确定',vocabulary:'基本掌握',difficulty:'定位',notes:''},diagnosis:{content:'完整分析\n'.repeat(200),causes:[]}};
const realFetch=globalThis.fetch;globalThis.fetch=async route=>new Response(JSON.stringify(route.includes('status')?{configured:true,today:lesson.date}:route.includes('records')?{records:[record]}:route.includes('diagnosis-dialogue')?{dialogue:{messages:[{role:'assistant',content:'老师的后续追问'}],version:1}}:{lesson}),{headers:{'content-type':'application/json'}});
try{
 await import('../src/app.js');for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));
 const $=s=>document.querySelector(s);
 const timerText=(limitSeconds/60)+':00';assert.equal($('#timer').textContent,timerText);assert($('#lessonMeta').textContent.includes((limitSeconds/60)+'分钟'));assert($('#trainingLimit').textContent.includes((limitSeconds/60)+' 分钟'));
 const realNow=Date.now,realConfirm=globalThis.confirm;let now=realNow();Date.now=()=>now;globalThis.confirm=()=>true;
 try{$('#start').click();now+=limitSeconds*1000;$('#pause').click();assert.equal($('#timer').textContent,'00:00');assert($('#status').textContent.includes('时间已到'));$('#reset').click();assert.equal($('#timer').textContent,timerText);assert($('#status').textContent.includes((limitSeconds/60)+' 分钟'))}finally{Date.now=realNow;globalThis.confirm=realConfirm}
 assert.equal($('#passage').textContent,content);assert.equal($('#questions').children.length,13);assert($('#passage').closest('.reading-workspace'));assert($('#questions').closest('.reading-workspace'));
 assert.equal($('#practiceTab').getAttribute('aria-current'),'page');assert.equal($('#question0 .question-stem').textContent,'The study used ______ to compare the results.');assert.equal($('#question0 .question-instructions').open,false);assert.equal($('#q0').labels[0].textContent,'你的答案');assert.equal($('#c0').labels[0].textContent,'信心（选填）');
 $('#chatToggle').click();assert($('#tutor').classList.contains('open'));assert.equal(document.activeElement,$('#chatInput'));$('#chatClose').click();assert(!$('#tutor').classList.contains('open'));
 $('#chatToggle').click();document.dispatchEvent(new ui.window.KeyboardEvent('keydown',{key:'Escape'}));assert(!$('#tutor').classList.contains('open'));
 $('#historyTab').click();for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));
 assert.equal($('#historyTab').getAttribute('aria-current'),'page');assert.equal($('#practiceTab').hasAttribute('aria-current'),false);
 assert.equal($('#diagnosisConversation').hidden,false);assert.equal($('#diagnosisReplyPanel').hidden,false);assert.equal($('#diagnosisCauses').open,false);
 assert.equal($('#diagnosisResult').textContent,record.diagnosis.content);assert($('#diagnosisReading').contains($('#diagnosisDialogue')));assert(!$('#diagnosisReading').contains($('#diagnosisReplyForm')));assert.match($('#diagnosisDialogue').textContent,/后续追问/);assert.equal($('#diagnosisReplySend').disabled,false);
 $('#diagnosisReplyToggle').click();assert.equal($('#diagnosisReplyPanel').hidden,true);assert.equal($('#diagnosisConversation').hidden,false);
 console.log('PASS: app boot, 13 inputs preserved in workspace, tutor toggle/close/Escape/focus, full analysis and dialogue share viewport, reply stays outside, existing analysis auto-opens replies');
}finally{globalThis.fetch=realFetch;globalThis.setInterval=realSetInterval;ui.window.close();dom.window.close()}

