/* NUR v2 motion bridge.
   app.js stays responsible for data. This layer handles the shared progress
   animation language plus the 3-second branded loading handoff. */
(() => {
  const splash=document.querySelector('#splash');
  const appShell=document.querySelector('#appShell');
  const enter=document.querySelector('#enterApp');
  const arc=document.querySelector('#loadingArc');
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
    {text:'The most beloved deeds to Allah are those done consistently, even if small.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'Allah is gentle and loves gentleness in all matters.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'Whoever believes in Allah and the Last Day should speak good or remain silent.',source:'Sahih al-Bukhari & Sahih Muslim'},
    {text:'The strong believer is better and more beloved to Allah than the weak believer, while there is good in both.',source:'Sahih Muslim'},
    {text:'Allah does not look at your forms or wealth, but at your hearts and deeds.',source:'Sahih Muslim'},
    {text:'A good word is charity.',source:'Sahih al-Bukhari & Sahih Muslim'}
  ];

  let verseIndex=Math.floor(Math.random()*quotes.length);
  function paintDailyVerse(withFade=false){
    const text=document.querySelector('#lightCopy');
    const source=document.querySelector('#lightVerseSource');
    if(!text || !source) return;
    const apply=()=>{
      const q=quotes[verseIndex%quotes.length];
      text.textContent=`“${q.text}”`;
      source.textContent=q.source;
      text.classList.remove('is-changing');
      source.classList.remove('is-changing');
    };
    if(withFade){
      text.classList.add('is-changing');source.classList.add('is-changing');
      setTimeout(apply,220);
    }else apply();
  }
  function advanceDailyVerse(){
    verseIndex=(verseIndex+1)%quotes.length;
    paintDailyVerse(true);
  }

  function prepareLoadingCopy(){
    if(caption) caption.textContent='نُور';
    if(!splash) return;
    let bottom=splash.querySelector('.loading-bottom');
    if(!bottom){
      bottom=document.createElement('div');
      bottom.className='loading-bottom';
      bottom.innerHTML='<div class="loading-quote"></div><span class="loading-source"></span><div class="loading-madeby">Made by NSHD</div>';
      splash.appendChild(bottom);
    }
    const pick=quotes[Math.floor(Math.random()*quotes.length)];
    bottom.querySelector('.loading-quote').textContent=`“${pick.text}”`;
    bottom.querySelector('.loading-source').textContent=pick.source;
  }

  function startNurLoader(){
    if(!splash || !appShell || !enter || !arc || !percent) return;

    document.documentElement.classList.remove('nur-loader-done');
    splash.classList.remove('hidden','is-leaving');
    appShell.classList.add('hidden');
    prepareLoadingCopy();

    const circumference=326.726;
    const duration=3000;
    const started=performance.now();
    arc.style.strokeDasharray=String(circumference);
    arc.style.strokeDashoffset=String(circumference);
    percent.textContent='0%';

    function frame(now){
      const p=Math.min(1,(now-started)/duration);
      const eased=1-Math.pow(1-p,3);
      arc.style.strokeDashoffset=String(circumference*(1-eased));
      percent.textContent=`${Math.round(p*100)}%`;
      if(p<1){requestAnimationFrame(frame);return;}

      arc.style.strokeDashoffset='0';
      percent.textContent='100%';
      splash.classList.add('is-leaving');
      setTimeout(()=>{
        enter.click();
        document.documentElement.classList.add('nur-loader-done');
        paintDailyVerse(false);
      },300);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(startNurLoader);
  setInterval(advanceDailyVerse,10000);

  const baseRender = window.render;
  if (typeof baseRender !== 'function') return;

  const taskState = new Map();
  const weekState = new Map();

  function captureExisting(){
    document.querySelectorAll('[data-task-pillar]').forEach(el => {
      taskState.set(el.dataset.taskPillar, el.classList.contains('lit'));
    });
    document.querySelectorAll('#weekBars .week-col').forEach((col,index) => {
      const fill = col.querySelector('.week-fill');
      if(fill) weekState.set(index, parseFloat(fill.style.height) || 0);
    });
  }

  function animateRebuiltProgress(){
    const taskTransitions=[];
    document.querySelectorAll('[data-task-pillar]').forEach(el => {
      const id=el.dataset.taskPillar;
      const targetLit=el.classList.contains('lit');
      const hadPrevious=taskState.has(id);
      const previousLit=hadPrevious ? taskState.get(id) : targetLit;
      const fill=el.querySelector('.pillar-shell i');
      if(!fill) return;

      if(hadPrevious && previousLit!==targetLit){
        el.classList.toggle('lit',previousLit);
        fill.style.setProperty('--fill',previousLit?'100%':'6%');
        taskTransitions.push({el,fill,targetLit});
      }else{
        fill.style.setProperty('--fill',targetLit?'100%':'6%');
      }
      taskState.set(id,targetLit);
    });

    const liveIds=new Set([...document.querySelectorAll('[data-task-pillar]')].map(x=>x.dataset.taskPillar));
    [...taskState.keys()].forEach(id=>{if(!liveIds.has(id))taskState.delete(id)});

    const weekTransitions=[];
    document.querySelectorAll('#weekBars .week-col').forEach((col,index) => {
      const fill=col.querySelector('.week-fill');
      if(!fill)return;
      const target=parseFloat(fill.style.height)||0;
      const previous=weekState.has(index)?weekState.get(index):target;
      if(previous!==target){
        fill.style.height=`${previous}%`;
        weekTransitions.push({fill,target});
      }
      weekState.set(index,target);
    });

    if(!taskTransitions.length && !weekTransitions.length) return;
    document.body.offsetHeight;
    requestAnimationFrame(() => {
      taskTransitions.forEach(({el,fill,targetLit}) => {
        el.classList.toggle('lit',targetLit);
        fill.style.setProperty('--fill',targetLit?'100%':'6%');
      });
      weekTransitions.forEach(({fill,target}) => {fill.style.height=`${target}%`;});
    });
  }

  window.render = function nurV2SmoothRender(){
    captureExisting();
    baseRender();
    paintDailyVerse(false);
    animateRebuiltProgress();
  };

  captureExisting();
  paintDailyVerse(false);
})();
