import assert from 'node:assert/strict';
import {selectTopic,topicDomains} from '../src/api.js';
const history=[{date:'2026-11-03',title:'Urban Trees',topic:'Environment'},{date:'2026-11-02',title:'Wetland restoration',topic:'Ecology'}];
const p=selectTopic('2026-11-04',history);assert.notEqual(p.domainId,'environment');assert.deepEqual(p,selectTopic('2026-11-04',history));
let records=[];for(let i=0;i<24;i++){const date=new Date(Date.UTC(2026,10,4+i)).toISOString().slice(0,10),plan=selectTopic(date,records);assert(!records.slice(0,2).some(r=>r.topicPlan.domainId===plan.domainId));assert(!records.slice(0,14).some(r=>r.topicPlan.focus===plan.focus));records.unshift({date,topicPlan:plan})}
assert.equal(new Set(records.slice(-8).map(r=>r.topicPlan.domainId)).size,8);assert.equal(new Set(records.map(r=>r.topicPlan.domainId)).size,topicDomains.length);
console.log('PASS: legacy environmental topics avoided, stable retries, all eight domains covered, no same-domain repeat in two lessons or same focus in fourteen across 24 lessons');

