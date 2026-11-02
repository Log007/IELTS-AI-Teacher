export function trainingPlan(date){const advanced=date>='2026-11-09';return {stage:advanced?'进阶仿真':'本周入门',targetMin:advanced?800:650,targetMax:advanced?950:850,min:advanced?800:600,max:advanced?1100:1000,seconds:1320,nextStage:'2026-11-09'}}
const tips=[
 '先读题干并圈出人名、年份等定位词，再回原文寻找同义表达。不要只因看到相同单词就选答案。',
 '判断题中，FALSE需要原文给出相反证据；原文没有足够信息时才考虑NOT GIVEN。不要用常识补足缺失信息。',
 '填空前先检查词数上限，并判断空格需要名词、动词还是其他成分。填完再检查语法、单复数和拼写。',
 '段落匹配先抓每段在做什么：提出问题、举例、解释原因还是比较观点。主旨不能只靠段落里最显眼的细节判断。',
 '遇到长句先找主语和谓语，再看转折、因果及限定条件。暂时不认识的词可以先利用上下文定位。',
 '选择题先尝试用原文概括答案，再检查选项。特别留意把“部分”偷换成“全部”、把“可能”偷换成“必然”的选项。',
 '卡在一道题时先标记并继续，最后再回来核对。回看时用原文证据做判断，而不是反复揣测题目的意思。'
];
export function dailyTip(date){const n=Math.floor(Date.parse(date+'T00:00:00Z')/86400000);return tips[((n%tips.length)+tips.length)%tips.length]}
export const causeOptions=['不确定，需要老师帮助判断','词汇理解','同义替换识别','题干理解','原文定位','段落主旨','逻辑推理或信息推断','FALSE与NOT GIVEN混淆','题型策略','拼写或字数限制','时间分配','注意力或审题失误'];
const normalizeAnswer=s=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export function scoreAnswers(lesson,submitted){return lesson.questions.map((q,i)=>{const a=submitted[i];return {question:q.question,type:q.type,answer:a.value,confidence:a.confidence,correctAnswer:q.answers[0],correct:q.answers.some(x=>normalizeAnswer(x)===normalizeAnswer(a.value))&&(q.type!=='填空题'||a.value.trim().split(/\s+/).length<=q.maxWords),explanation:q.explanation,evidence:q.evidence,strategy:q.strategy}})}

