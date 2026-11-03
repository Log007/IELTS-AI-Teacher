// Character offsets refer to the unmodified passage, never to generated HTML.
export function mergeHighlights(ranges,length){
 const sorted=(Array.isArray(ranges)?ranges:[]).filter(r=>Array.isArray(r)&&r.length===2&&r.every(Number.isInteger)&&r[0]>=0&&r[0]<r[1]&&r[1]<=length).map(r=>[...r]).sort((a,b)=>a[0]-b[0]);
 const result=[];for(const range of sorted){const last=result.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else result.push(range)}return result;
}
export function subtractHighlight(ranges,[start,end]){return ranges.flatMap(([a,b])=>b<=start||a>=end?[[a,b]]:[[a,Math.min(b,start)],[Math.max(a,end),b]].filter(([x,y])=>x<y))}
export function createPassageHighlighter({passage,add,remove,clear,status,read,write}){
 let text='',key='',ranges=[],selection=null;
 const message=()=>{status.textContent=ranges.length?'已保留 '+ranges.length+' 处重点。选中文字可继续标记或取消；仅保存在本浏览器。':'选中文字后点“标记重点”。标记保存在本浏览器。'};
 function paint(){const top=passage.scrollTop;passage.replaceChildren();let at=0;for(const [start,end]of ranges){passage.append(document.createTextNode(text.slice(at,start)));const mark=document.createElement('mark');mark.textContent=text.slice(start,end);passage.append(mark);at=end}passage.append(document.createTextNode(text.slice(at)));passage.scrollTop=top;clear.disabled=!ranges.length;selection=null;add.disabled=remove.disabled=true}
 function commit(){write(key,{text,ranges});paint();message()}
 document.addEventListener('selectionchange',()=>{
  const selected=document.getSelection();if(!selected||selected.isCollapsed||!selected.rangeCount){selection=null;add.disabled=remove.disabled=true;return}
  const range=selected.getRangeAt(0);selection=null;
  if(passage.contains(range.startContainer)&&passage.contains(range.endContainer)){
   const prefix=range.cloneRange();prefix.selectNodeContents(passage);prefix.setEnd(range.startContainer,range.startOffset);const start=prefix.toString().length,end=start+range.toString().length;
   if(start<end&&end<=text.length)selection=[start,end];
  }
  add.disabled=remove.disabled=!selection;
 });
 for(const button of [add,remove])button.addEventListener('pointerdown',event=>event.preventDefault());
 add.onclick=()=>{if(!selection)return;ranges=mergeHighlights([...ranges,selection],text.length);commit()};
 remove.onclick=()=>{if(!selection)return;ranges=subtractHighlight(ranges,selection);commit()};
 clear.onclick=()=>{ranges=[];commit()};
 return {load(id,content){text=content;key='ielts-cloud-v2-highlights-'+id;const saved=read(key,{});ranges=saved.text===text?mergeHighlights(saved.ranges,text.length):[];paint();passage.scrollTop=0;message()}};
}

