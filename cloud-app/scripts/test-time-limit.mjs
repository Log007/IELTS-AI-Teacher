import assert from 'node:assert/strict';
import {trainingPlan} from '../src/learning.js';
import {handleApi} from '../src/api.js';

const RealDate=globalThis.Date,realFetch=globalThis.fetch;
let instant='2026-11-17T15:59:59Z',calls=0;
globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[instant]))}static now(){return RealDate.parse(instant)}};
const data=new Map();
const BUCKET={get:async k=>data.has(k)?{json:async()=>JSON.parse(data.get(k))}:null,put:async(k,v)=>data.set(k,v),list:async({prefix})=>({objects:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))})};
const env={BUCKET,VAULT_KEY:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')};
const call=(path,body,user='timer')=>handleApi(new Request('https://unit.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{origin:'https://unit.test','Content-Type':'application/json','oai-authenticated-user-id':user},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
const fixture={title:'Timing fixture',topic:'Science',passage:'Evidence '.repeat(875),translation:'段意',sentences:'句法',arrangement:'诊断',seconds:9999,vocabulary:Array.from({length:10},(_,i)=>Object.fromEntries(['word','ipa','pos','meaning','collocation','example','translation','synonyms','pitfall'].map(k=>[k,k+i]))),questions:Array.from({length:13},(_,i)=>({type:['填空题','选择题','段落匹配'][i%3],question:'Question '+i,answers:['evidence'],maxWords:1,evidence:'Evidence',explanation:'Explanation',strategy:'Strategy'}))};
globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(fixture)}}]}))};
const grade=async(date,elapsedSeconds,id=crypto.randomUUID())=>{
 const response=await call('grade',{id,lessonId:date,answers:fixture.questions.map(()=>({value:'evidence',confidence:'确定'})),elapsedSeconds,startedAt:date+'T00:00:00Z',finishedAt:date+'T00:22:00Z'});
 assert.equal(response.status,200);return (await response.json()).record;
};
try{
 assert.equal(trainingPlan('2026-11-17').seconds,1320);
 assert.equal(trainingPlan('2026-11-18').seconds,1260);
 assert.equal(trainingPlan('2026-12-01').seconds,1260);
 assert.equal((await call('settings',{key:'test-only-timing-key',consent:true})).status,200);
 for(const [time,date,seconds]of [['2026-11-17T15:59:59Z','2026-11-17',1320],['2026-11-17T16:00:00Z','2026-11-18',1260]]){
  instant=time;
  const status=await (await call('status')).json();assert.equal(status.today,date);assert.equal(status.trainingPlan.seconds,seconds);
  const response=await call('lesson',{});assert.equal(response.status,200);const lesson=(await response.json()).lesson;
  assert.equal(lesson.date,date);assert.equal(lesson.seconds,seconds);assert.equal(lesson.trainingPlan.seconds,seconds);
  assert.equal(JSON.parse(data.get('users/timer/lessons/'+date+'.json')).seconds,seconds);
  const before=calls;
  for(const body of [undefined,{}])assert.equal((await (await call('lesson',body)).json()).lesson.seconds,seconds);
  assert.equal(calls,before,'reopening a saved lesson must not regenerate');
  const onTime=await grade(date,seconds);assert.equal(onTime.limitSeconds,seconds);assert.equal(onTime.overtime,false);
  const over=await grade(date,seconds+1);assert.equal(over.limitSeconds,seconds);assert.equal(over.overtime,true);
 }
 // Submitting yesterday's cached practice after the change retains its own limit.
 const old=await grade('2026-11-17',1290);assert.equal(old.limitSeconds,1320);assert.equal(old.overtime,false);
 const retry=await grade('2026-11-17',1500,old.id);assert.equal(retry.limitSeconds,1320);assert.equal(retry.elapsedSeconds,1290);
 await call('settings',{key:'test-only-timing-key',consent:true},'draft');
 data.set('users/draft/drafts/2026-11-18.json',JSON.stringify({lesson:fixture}));
 const before=calls,restored=await (await call('lesson',{},'draft')).json();assert.equal(restored.lesson.seconds,1260);assert.equal(calls,before);
 console.log('PASS: Shanghai midnight boundary, 22/21-minute generation and cached reopen, draft recovery, exact-limit and overtime grading, old practice and saved records preserved');
}finally{globalThis.Date=RealDate;globalThis.fetch=realFetch}

