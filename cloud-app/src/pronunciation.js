let active=null;
function stop(){if(active){const old=active;active=null;clearTimeout(old.timer);old.button.textContent='🔊 发音';old.button.setAttribute('aria-pressed','false')}globalThis.speechSynthesis?.cancel()}
export function createPronunciationButton(word,announce){
 const button=document.createElement('button');button.type='button';button.className='pronounce';button.textContent='🔊 发音';button.setAttribute('aria-label','播放 '+word+' 的英语发音');button.setAttribute('aria-pressed','false');
 button.onclick=()=>{
  if(!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance){announce('当前浏览器不支持朗读，请用支持语音的浏览器打开，或检查设备的英语语音设置。');return}
  if(active?.button===button){stop();return}stop();
  try{
   const synth=globalThis.speechSynthesis,voices=synth.getVoices();
   const british=voices.find(v=>/^en[-_]GB$/i.test(v.lang)&&v.localService)||voices.find(v=>/^en[-_]GB$/i.test(v.lang));
   const voice=british||voices.find(v=>/^en(?:[-_]|$)/i.test(v.lang));
   const utterance=new SpeechSynthesisUtterance(word);utterance.lang=voice?.lang||'en-GB';utterance.rate=.85;utterance.volume=1;if(voice)utterance.voice=voice;
   const current={button,utterance,timer:null};active=current;button.textContent='⏹ 停止';button.setAttribute('aria-pressed','true');
   const finish=()=>{if(active===current){active=null;clearTimeout(current.timer);button.textContent='🔊 发音';button.setAttribute('aria-pressed','false')}};
   utterance.onstart=()=>{if(active!==current)return;clearTimeout(current.timer);announce(british?'正在播放英式发音：'+word:voice?'本设备没有英式音色，正在使用可用的英语音色：'+word:'正在尝试设备默认英语朗读：'+word)};
   utterance.onend=finish;
   utterance.onerror=()=>{if(active!==current)return;finish();announce('发音播放失败。请检查设备音量、英语语音设置，或尝试在其他浏览器打开。')};
   current.timer=setTimeout(()=>{if(active===current){stop();announce('设备未能启动朗读，请检查英语语音设置或换一个浏览器。')}},10000);
   synth.resume();synth.speak(utterance);
  }catch{stop();announce('无法启动发音，请检查设备的英语语音设置。')}
 };
 return button;
}
if(globalThis.addEventListener)globalThis.addEventListener('pagehide',stop);

