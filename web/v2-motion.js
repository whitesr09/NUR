/* NUR v2 motion bridge. app.js owns data; this file owns loader and progress motion. */
(() => {
  const splash=document.querySelector('#splash');
  const appShell=document.querySelector('#appShell');
  const enter=document.querySelector('#enterApp');
  const loadingOrbit=document.querySelector('#loadingOrbit');
  const percent=document.querySelector('#loadingPercent');
  const caption=document.querySelector('.loading-caption');

  const quotes=[
    {text:'Indeed, with hardship comes ease.',source:'Qur’an 94:6'},
    {text:'Remember Me; I will remember you.',source:'Qur’an 2:152'},
    {text:'Allah does not burden a soul beyond what it can bear.',source:'Qur’an 2:286'},
    {text:'Whoever relies upon Allah — He is sufficient for him.',source:'Qur’an 65:3'},
    {text:'Surely in the remembrance of Allah do hearts find comfort.',source:'Qur’an 13:28'},
    {text:'Be patient. Indeed, the promise of Allah is true.',source:'Qur’an 30:60'},
    {text:'Indeed, Allah is with the patient.',source:'Qur’an 2:153'},
    {text:'Do not despair of the mercy of Allah.',source:'Qur’an 39:53'},
    {text:'My mercy encompasses all things.',source:'Qur’an 7:156'},
    {text:'Call upon Me; I will respond to you.',source:'Qur’an 40:60'},
    {text:'Allah loves those who trust in Him.',source:'Qur’an 3:159'},
    {text:'Indeed, Allah loves those who do good.',source:'Qur’an 2:195'},
    {text:'And whoever fears Allah — He will make for him a way out.',source:'Qur’an 65:2'},
    {text:'And He will provide for him from where he does not expect.',source:'Qur’an 65:3'},
    {text:'Indeed, prayer prohibits immorality and wrongdoing.',source:'Qur’an 29:45'},
    {text:'So remember the name of your Lord and devote yourself to Him completely.',source:'Qur’an 73:8'},
    {text:'And seek help through patience and prayer.',source:'Qur’an 2:45'},
    {text:'Indeed, good deeds do away with misdeeds.',source:'Qur’an 11:114'},
    {text:'And your Lord is going to give you, and you will be satisfied.',source:'Qur’an 93:5'},
    {text:'The Hereafter is better for you than the first life.',source:'Qur’an 93:4'},
    {text:'Indeed, Allah is near.',source:'Qur’an 2:186'},
    {text:'And whoever is grateful — his gratitude is only for the benefit of himself.',source:'Qur’an 31:12'},
    {text:'Do not lose hope nor be sad.',source:'Qur’an 3:139'},
    {text:'The most beloved deeds to Allah are those done consistently, even if small.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'Allah is gentle and loves gentleness in all matters.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'Whoever believes in Allah and the Last Day should speak good or remain silent.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'The strong believer is better and more beloved to Allah than the weak believer, while there is good in both.',source:'Sahih Muslim'},
    {text:'Allah does not look at your forms or wealth, but at your hearts and deeds.',source:'Sahih Muslim'},
    {text:'A good word is charity.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'Purity is half of faith.',source:'Sahih Muslim'},
    {text:'The Muslim is the one from whose tongue and hand the Muslims are safe.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'Whoever follows a path in pursuit of knowledge, Allah will make easy for him a path to Paradise.',source:'Sahih Muslim'},
    {text:'Allah helps the servant as long as the servant helps his brother.',source:'Sahih Muslim'},
    {text:'None of you truly believes until he loves for his brother what he loves for himself.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'The best of you are those who are best in character.',source:'Sahih al-Bukhari'},
    {text:'Modesty is a branch of faith.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'Whoever is not merciful will not be shown mercy.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'Smiling in the face of your brother is charity.',source:'Jami‘ at-Tirmidhi — Hasan'}
  ];

  let verseIndex=Math.floor(Math.random()*quotes.length);
  function paintDailyVerse(withFade=false){
    const text=document.querySelector('#lightCopy');
    const source=document.querySelector('#lightVerseSource');
    if(!text || !source) return;
    const apply=()=>{
      const q=quotes[verseIndex%quotes.length];
      text.textContent=`“${q.text}”`; source.textContent=q.source;
      text.classList.remove('is-changing'); source.classList.remove('is-changing');
    };
    if(withFade){text.classList.add('is-changing');source.classList.add('is-changing');setTimeout(apply,220)}else apply();
  }
  function advanceDailyVerse(){verseIndex=(verseIndex+1)%quotes.length;paintDailyVerse(true)}

  function prepareLoadingCopy(){
    if(caption) caption.textContent='نُور';
    if(!splash) return;
    let bottom=splash.querySelector('.loading-bottom');
    if(!bottom){
      bottom=document.createElement('div'); bottom.className='loading-bottom';
      bottom.innerHTML='<div class="loading-quote"></div><span class="loading-source"></span><div class="loading-madeby">Made by NSHD</div>';
      splash.appendChild(bottom);
    }
    const pick=quotes[Math.floor(Math.random()*quotes.length)];
    bottom.querySelector('.loading-quote').textContent=`“${pick.text}”`;
    bottom.querySelector('.loading-source').textContent=pick.source;
  }

  function startNurLoader(){
    if(!splash || !appShell || !enter || !loadingOrbit || !percent) return;
    document.documentElement.classList.remove('nur-loader-done');
    splash.classList.remove('hidden','is-leaving'); appShell.classList.add('hidden'); prepareLoadingCopy();

    const duration=3000;
    const started=performance.now();
    loadingOrbit.style.setProperty('--load-angle','0deg'); percent.textContent='0%';

    function frame(now){
      const p=Math.min(1,(now-started)/duration);
      const value=Math.round(p*100);
      loadingOrbit.style.setProperty('--load-angle',`${p*360}deg`);
      percent.textContent=`${value}%`;
      if(p<1){requestAnimationFrame(frame);return;}
      loadingOrbit.style.setProperty('--load-angle','360deg'); percent.textContent='100%';
      splash.classList.add('is-leaving');
      setTimeout(()=>{enter.click();document.documentElement.classList.add('nur-loader-done');paintDailyVerse(false)},300);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(startNurLoader);
  setInterval(advanceDailyVerse,10000);

  const baseRender=window.render;
  if(typeof baseRender!=='function') return;
  const taskState=new Map(); const weekState=new Map();

  function captureExisting(){
    document.querySelectorAll('[data-task-pillar]').forEach(el=>taskState.set(el.dataset.taskPillar,el.classList.contains('lit')));
    document.querySelectorAll('#weekBars .week-col').forEach((col,index)=>{const fill=col.querySelector('.week-fill');if(fill)weekState.set(index,parseFloat(fill.style.height)||0)});
  }
  function animateRebuiltProgress(){
    const taskTransitions=[];
    document.querySelectorAll('[data-task-pillar]').forEach(el=>{
      const id=el.dataset.taskPillar,targetLit=el.classList.contains('lit'),hadPrevious=taskState.has(id),previousLit=hadPrevious?taskState.get(id):targetLit,fill=el.querySelector('.pillar-shell i');
      if(!fill)return;
      if(hadPrevious&&previousLit!==targetLit){el.classList.toggle('lit',previousLit);fill.style.setProperty('--fill',previousLit?'100%':'6%');taskTransitions.push({el,fill,targetLit})}
      else fill.style.setProperty('--fill',targetLit?'100%':'6%');
      taskState.set(id,targetLit);
    });
    const liveIds=new Set([...document.querySelectorAll('[data-task-pillar]')].map(x=>x.dataset.taskPillar));
    [...taskState.keys()].forEach(id=>{if(!liveIds.has(id))taskState.delete(id)});
    const weekTransitions=[];
    document.querySelectorAll('#weekBars .week-col').forEach((col,index)=>{const fill=col.querySelector('.week-fill');if(!fill)return;const target=parseFloat(fill.style.height)||0,previous=weekState.has(index)?weekState.get(index):target;if(previous!==target){fill.style.height=`${previous}%`;weekTransitions.push({fill,target})}weekState.set(index,target)});
    if(!taskTransitions.length&&!weekTransitions.length)return;
    document.body.offsetHeight;
    requestAnimationFrame(()=>{taskTransitions.forEach(({el,fill,targetLit})=>{el.classList.toggle('lit',targetLit);fill.style.setProperty('--fill',targetLit?'100%':'6%')});weekTransitions.forEach(({fill,target})=>{fill.style.height=`${target}%`})});
  }
  window.render=function nurV2SmoothRender(){captureExisting();baseRender();paintDailyVerse(false);animateRebuiltProgress()};
  captureExisting(); paintDailyVerse(false);
})();
