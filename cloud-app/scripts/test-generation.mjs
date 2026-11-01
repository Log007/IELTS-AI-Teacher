import assert from 'node:assert/strict';
import {handleApi,generationResponse} from '../src/api.js';
const map=new Map();const BUCKET={get:async k=>map.has(k)?{json:async()=>JSON.parse(map.get(k))}:null,put:async(k,v)=>map.set(k,v),list:async()=>({objects:[]})};const env={BUCKET,VAULT_KEY:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')};
const req=(path,body)=>new Request('https://unit.test/api/'+path,{method:'POST',headers:{origin:'https://unit.test','Content-Type':'application/json','oai-authenticated-user-id':'test'},body:JSON.stringify(body)});
await handleApi(req('settings',{key:'test-only-fake-key',consent:true}),env);
let release;let seen=false;const upstream=new Promise(r=>release=r);const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{const p=JSON.parse(options.body);assert.equal(p.thinking.type,'disabled');seen=true;return upstream};
try{
 const tasks=[];const response=generationResponse(req('lesson',{}),env,{waitUntil:p=>tasks.push(p)});assert.match(response.headers.get('content-type'),/ndjson/);const reader=response.body.getReader();const first=await reader.read();assert.match(new TextDecoder().decode(first.value),/progress/);
 while(!seen)await new Promise(r=>setTimeout(r,1));release(new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]}),{headers:{'Content-Type':'application/json'}}));
 let text='';while(true){const r=await reader.read();if(r.done)break;text+=new TextDecoder().decode(r.value)}await Promise.all(tasks);assert.match(text,/超长被截断/);assert(!text.includes('test-only-fake-key'));
 console.log('PASS: immediate progress before upstream completes, non-thinking request, truncated output error propagation and stream close');
}finally{globalThis.fetch=realFetch}
// Regression: short drafts must reach review; a failed review gets one bounded repair.
const fixture={title:'Test passage',topic:'Environment',passage:'Evidence '.repeat(740),translation:'段意',sentences:'句法',arrangement:'诊断',vocabulary:Array.from({length:10},(_,i)=>Object.fromEntries(['word','ipa','pos','meaning','collocation','example','translation','synonyms','pitfall'].map(k=>[k,k+i]))),questions:Array.from({length:13},(_,i)=>({type:['填空题','选择题','段落匹配'][i%3],question:'Question '+i,answers:['evidence'],maxWords:1,evidence:'Evidence',explanation:'Explanation',strategy:'Strategy'}))};
const short={...fixture,passage:'Evidence '.repeat(420)};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for(const [sequence,expected] of [[[short,fixture],200],[[short,short,fixture],200],[[short,short,short],502]]){
 map.delete('users/test/lessons/'+today+'.json');map.delete('users/test/drafts/'+today+'.json');let calls=0;
 globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(sequence[calls++])}}]}),{headers:{'Content-Type':'application/json'}});
 try{const response=await handleApi(req('lesson',{}),env);const result=await response.json();assert.equal(response.status,expected);assert.equal(calls,sequence.length);if(expected===200){assert.equal(result.lesson.passage.trim().split(/\s+/).length,740);assert(map.has('users/test/lessons/'+today+'.json'))}else{assert.match(result.error,/420/);assert(!map.has('users/test/lessons/'+today+'.json'))}}finally{globalThis.fetch=realFetch}
}
console.log('PASS: short draft repaired by review, bounded third-call repair, exact word-count error and no invalid lesson saved');
const {repairCounts,validateLesson}=await import('../src/api.js');
let countCalls=0;
globalThis.fetch=async(_url,options)=>{
 const request=JSON.parse(options.body),task=JSON.parse(request.messages.at(-1).content);countCalls++;
 const result=task.type?{questions:Array.from({length:task.requiredCount},(_,i)=>({type:task.type,question:task.type+' '+i,answers:[task.type==='判断题'?'TRUE':task.type==='选择题'?'A. Evidence':'evidence'],...(task.type==='判断题'?{options:['TRUE','FALSE','NOT GIVEN']}:task.type==='选择题'?{options:['A. Evidence','B. Other']}:{maxWords:1}),maxWords:1,evidence:'Evidence',explanation:'说明',strategy:'策略'}))}:{vocabulary:Array.from({length:5},(_,i)=>Object.fromEntries(['word','ipa','pos','meaning','collocation','example','translation','synonyms','pitfall'].map(k=>[k,k+countCalls+i])))};
 return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]}));
};
try{const broken={...fixture,questions:fixture.questions.slice(0,12),vocabulary:fixture.vocabulary.slice(0,9)};const repaired=await repairCounts(broken,'test-only-fake-key');assert.equal(countCalls,5);assert.equal(repaired.questions.length,13);assert.equal(repaired.vocabulary.length,10);assert.equal(new Set(repaired.questions.map(q=>q.type)).size,3);assert.equal(repaired.passage,broken.passage);validateLesson(repaired);countCalls=0;await repairCounts(fixture,'test-only-fake-key');assert.equal(countCalls,0);console.log('PASS: 12 questions / 9 words repaired in bounded groups; passage preserved; correct counts trigger no extra API call')}finally{globalThis.fetch=realFetch}

const letterQuestion={type:'选择题',question:'Choose one answer.',options:['A. First explanation','B. Second explanation'],answers:['B'],maxWords:6,evidence:'Evidence',explanation:'解释',strategy:'策略'};
const variants=structuredClone(fixture);variants.questions[0]=letterQuestion;variants.questions[1]={...variants.questions[1],type:'填空题',options:[],answers:['evidence']};variants.questions[2]={...variants.questions[2],type:'判断题',answers:['true'],options:['TRUE','FALSE','NOT GIVEN']};
validateLesson(variants);assert.equal(variants.questions[0].answers[0],'B. Second explanation');assert.equal(variants.questions[1].options,undefined);assert.equal(variants.questions[2].answers[0],'TRUE');
const invalid=structuredClone(variants);invalid.questions[0].answers=['Z'];assert.throws(()=>validateLesson(invalid),/Q1.*无法唯一匹配/);
const ambiguous=structuredClone(variants);ambiguous.questions[0].options=['A. Same','B. Same'];ambiguous.questions[0].answers=['Same'];assert.throws(()=>validateLesson(ambiguous),/无法唯一匹配/);
console.log('PASS: answer labels, empty fill-in options and judgment case normalized; unknown and ambiguous mappings rejected');

validateLesson({...fixture,passage:'Evidence '.repeat(875)});console.log('PASS: an 875-word passage within training tolerance is accepted');
const evidenceVariant=structuredClone(fixture);evidenceVariant.questions[0].evidence='"Evidence   Evidence"';validateLesson(evidenceVariant);assert.equal(evidenceVariant.questions[0].evidence,'Evidence Evidence');
map.delete('users/test/lessons/'+today+'.json');const saved=structuredClone(fixture);saved.questions[2].evidence='Not in the passage';map.set('users/test/drafts/'+today+'.json',JSON.stringify({lesson:saved,stage:'repaired'}));let repairedCalls=0;
globalThis.fetch=async()=>{repairedCalls++;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({questions:[fixture.questions[2]]})}}]}))};
try{const response=await handleApi(req('lesson',{}),env);assert.equal(response.status,200);const result=await response.json();assert.equal(repairedCalls,1);assert.equal(result.lesson.passage,fixture.passage);assert.equal(result.lesson.questions.length,13);console.log('PASS: saved draft recovers via one-question repair without regenerating passage or full lesson')}finally{globalThis.fetch=realFetch}

