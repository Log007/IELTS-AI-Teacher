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

