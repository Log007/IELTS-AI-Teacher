import assert from 'node:assert/strict';
import {createQuestionHighlighter} from '../src/highlights.js';
const {JSDOM}=await import(process.env.IELTS_DOM_MODULE||'jsdom');
const dom=new JSDOM('<article>Passage text</article><button id="add"></button><button id="remove"></button><button id="clear"></button><p id="status"></p><div class="question-scroll"><form><h3 data-highlight-key="0:0"></h3><details open><summary>Directions</summary><p data-highlight-key="0:1">Write ONE WORD only.</p></details><input value="my answer"><select><option>确定</option></select><h3 data-highlight-key="1:0">Another question</h3><div class="inline-result">Answer feedback</div></form></div>');
const doc=dom.window.document,$=s=>doc.querySelector(s),root=$('form'),stem=$('h3'),input=$('input'),confidence=$('select'),feedback=$('.inline-result'),scroll=$('.question-scroll');
const text='Alpha beta gamma <script>plain text</script>.';stem.textContent=text;
const data=new Map(),add=$('#add'),remove=$('#remove'),clear=$('#clear');
const highlighter=createQuestionHighlighter({root,add,remove,clear,status:$('#status'),read:(k,f)=>data.get(k)||f,write:(k,v)=>data.set(k,structuredClone(v))});
function select(a,start,b,end){const range=doc.createRange();range.setStart(a,start);range.setEnd(b,end);const selection=doc.getSelection();selection.removeAllRanges();selection.addRange(range);doc.dispatchEvent(new dom.window.Event('selectionchange'))}
function unchanged(){assert.equal(stem.textContent,text);assert.equal($('input'),input);assert.equal(input.value,'my answer');assert.equal($('select'),confidence);assert.equal(confidence.value,'确定');assert.equal($('.inline-result'),feedback);assert.equal(scroll.scrollTop,80);assert.equal(root.querySelector('script'),null)}
try{
 highlighter.load('lesson-a');scroll.scrollTop=80;
 select(stem.firstChild,6,stem.firstChild,10);assert.equal(add.disabled,false);add.click();assert.equal(stem.querySelector('mark').textContent,'beta');unchanged();
 select(stem.firstChild,0,stem.lastChild,6);add.click();assert.equal(stem.querySelectorAll('mark').length,1);unchanged();
 const marked=stem.querySelector('mark');select(marked.firstChild,6,marked.firstChild,10);remove.click();assert.equal(stem.querySelectorAll('mark').length,2);unchanged();
 const directions=$('details p');select(directions.firstChild,6,directions.firstChild,14);add.click();assert.equal(directions.querySelector('mark').textContent,'ONE WORD');unchanged();
 highlighter.load('lesson-a');assert.equal(stem.querySelectorAll('mark').length,2);assert.equal(directions.querySelector('mark').textContent,'ONE WORD');unchanged();
 // Answer controls, another pane, and cross-block selections must never be rewritten.
 select(stem.firstChild,0,directions.firstChild,4);assert.equal(add.disabled,true);
 select($('article').firstChild,0,$('article').firstChild,7);assert.equal(add.disabled,true);
 select(stem.querySelector('mark').firstChild,0,stem.querySelector('mark').firstChild,3);input.focus();assert.equal(add.disabled,true);unchanged();
 const pointer=new dom.window.Event('pointerdown',{cancelable:true});add.dispatchEvent(pointer);assert.equal(pointer.defaultPrevented,true);
 highlighter.load('lesson-b');assert.equal(root.querySelector('mark'),null);assert.equal(clear.disabled,true);
 highlighter.load('lesson-a');assert(root.querySelector('mark'));stem.textContent='Changed question';highlighter.load('lesson-a');assert.equal(stem.querySelector('mark'),null);assert(directions.querySelector('mark'));
 clear.click();assert.equal(root.querySelector('mark'),null);assert.equal(clear.disabled,true);highlighter.load('lesson-a');assert.equal(root.querySelector('mark'),null);
 assert([...data.keys()].every(k=>k.startsWith('ielts-cloud-v2-question-highlights-')));
 console.log('PASS: question/direction highlights, merge and partial removal, restore and lesson isolation, changed-text guard, clear, selection boundaries, controls/feedback/scroll preserved, safe text rendering');
}finally{dom.window.close()}

