import assert from 'node:assert/strict';
import {trainingPlan} from '../src/learning.js';
import {handleApi,validateLesson} from '../src/api.js';
const data=new Map();const BUCKET={async get(k){return data.has(k)?{json:async()=>JSON.parse(data.get(k))}:null},async put(k,v){data.set(k,v)},async list({prefix}){return {objects:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}};
const env={BUCKET,VAULT_KEY:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')};
const call=(path,body,user='owner',origin='https://test.local')=>handleApi(new Request('https://test.local/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(user?{'oai-authenticated-user-id':user}:{}),'Content-Type':'application/json',origin},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
assert.equal((await call('status',undefined,'')).status,401);
assert.equal((await call('settings',{key:'test-not-a-real-key',consent:true},'owner','https://evil.local')).status,403);
assert.equal((await call('settings',{key:'test-not-a-real-key',consent:true})).status,200);
assert(![...data.values()].join('').includes('test-not-a-real-key'));
assert.deepEqual(await (await call('status',undefined,'other')).json(),{configured:false,trainingPlan:trainingPlan(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())),today:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())});
const lesson={id:'2026-11-01',date:'2026-11-01',title:'Test',topic:'Test',seconds:1320,passage:'Evidence '.repeat(875),translation:'测试',sentences:'测试',arrangement:'诊断',vocabulary:Array.from({length:10},(_,i)=>Object.fromEntries(['word','ipa','pos','meaning','collocation','example','translation','synonyms','pitfall'].map(k=>[k,k+i]))),questions:Array.from({length:13},(_,i)=>({type:['填空题','选择题','段落匹配'][i%3],question:'Q'+i,answers:['evidence'],maxWords:1,evidence:'Evidence',explanation:'Explanation',strategy:'Strategy'}))};
validateLesson(lesson);assert.throws(()=>validateLesson({...lesson,questions:[{...lesson.questions[0],evidence:'fabricated quote'}]}));
data.set('users/owner/lessons/2026-11-01.json',JSON.stringify(lesson));
const submission={id:'aa000000-0000-0000-0000-000000000000',lessonId:lesson.id,answers:lesson.questions.map((_,i)=>({value:i===0?'  EVIDENCE  ':'wrong',confidence:'犹豫'})),elapsedSeconds:1400,startedAt:'2026-11-01T00:00:00Z',finishedAt:'2026-11-01T00:23:20Z',feedback:{confidence:'部分靠猜测',vocabulary:'大部分掌握',difficulty:'词汇理解',notes:''}};
let r=await call('records',submission);assert.equal(r.status,200);let record=(await r.json()).record;assert.equal(record.score,1);assert.equal(record.overtime,true);
assert.equal((await (await call('records',{...submission,answers:submission.answers.map(a=>({...a,value:'evidence'}))})).json()).record.score,1);
assert.equal((await (await call('records',undefined,'other')).json()).records.length,0);
assert.equal((await (await call('records')).json()).records.length,1);
console.log('PASS: authentication, origin, encrypted storage, account isolation, validation, scoring, overtime and idempotent saving');
// Immediate grading must persist before optional feedback; final feedback cannot rewrite answers.
const gradeBody={...submission,id:'bb000000-0000-0000-0000-000000000000'};delete gradeBody.feedback;
let graded=await (await call('grade',gradeBody)).json();assert.equal(graded.record.score,1);assert.equal(graded.record.feedbackPending,true);
let feedbackSaved=await (await call('records',{...gradeBody,feedback:submission.feedback,answers:gradeBody.answers.map(a=>({...a,value:'evidence'}))})).json();assert.equal(feedbackSaved.record.score,1);assert.equal(feedbackSaved.record.feedbackPending,false);
assert.equal((await call('diagnosis',{recordId:gradeBody.id,causes:[]},'other')).status,404);
const causes=graded.record.answers.map((a,index)=>({index,cause:'不确定，需要老师帮助判断',notes:'我当时没有找到定位句。'}));
const originalFetch=globalThis.fetch;globalThis.fetch=async(_url,options)=>{const payload=JSON.parse(options.body);assert.match(payload.messages[0].content,/学生自述与教学推断/);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'根据学生自述，先复测定位方法；需要进一步澄清。'}}]}))};
try{let response=await call('diagnosis',{recordId:gradeBody.id,causes});assert.equal(response.status,200);const saved=(await response.json()).record;assert.equal(saved.diagnosis.causes.length,13);assert.match(saved.diagnosis.content,/学生自述/);assert.equal(saved.score,1)}finally{globalThis.fetch=originalFetch}
assert.equal(trainingPlan('2026-11-08').targetMin,650);assert.equal(trainingPlan('2026-11-09').min,800);assert.equal(trainingPlan('2026-11-09').targetMax,950);
console.log('PASS: objective grade saved first, feedback cannot alter submitted score, diagnosis isolated and persisted, November 9 training boundary');
const noAnalysis=await call('diagnosis-dialogue?recordId='+submission.id);assert.equal(noAnalysis.status,409);
assert.equal((await call('diagnosis-dialogue?recordId='+gradeBody.id,undefined,'other')).status,404);
let dialogueCalls=0;globalThis.fetch=async(_url,options)=>{dialogueCalls++;const payload=JSON.parse(options.body);assert.match(payload.messages[1].content,/根据学生自述/);if(dialogueCalls===2)assert(payload.messages.some(m=>m.role==='assistant'&&m.content.includes('请指出原文')));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'请指出原文中限制范围的词，再判断你的答案。'}}]}))};
try{
 const first={recordId:gradeBody.id,message:'我当时没有注意到 some。',requestId:'cc000000-0000-0000-0000-000000000000',baseVersion:0};let result=await (await call('diagnosis-dialogue',first)).json();assert.equal(result.dialogue.version,1);assert.equal(result.dialogue.messages.length,2);
 const duplicate=await (await call('diagnosis-dialogue',first)).json();assert.equal(duplicate.dialogue.messages.length,2);assert.equal(dialogueCalls,1);
 assert.equal((await call('diagnosis-dialogue',{...first,requestId:'dd000000-0000-0000-0000-000000000000'})).status,409);assert.equal(dialogueCalls,1);
 const second=await (await call('diagnosis-dialogue',{...first,message:'原文用的是 some，所以不能推成 all，对吗？',requestId:'ee000000-0000-0000-0000-000000000000',baseVersion:1})).json();assert.equal(second.dialogue.version,2);assert.equal(second.dialogue.messages.length,4);
 const reloaded=await (await call('diagnosis-dialogue?recordId='+gradeBody.id)).json();assert.equal(reloaded.dialogue.messages.length,4);
 const exported=await (await call('records?includeDialogues=1')).json();assert.equal(exported.records.find(r=>r.id===gradeBody.id).followUp.messages.length,4);
 console.log('PASS: follow-up requires owned analyzed record, preserves context and cloud history, retries are idempotent, stale versions rejected, transcript exported');
}finally{globalThis.fetch=originalFetch}

