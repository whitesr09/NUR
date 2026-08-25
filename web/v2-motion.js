/* NUR v2 motion bridge.
   app.js stays responsible for data. This layer handles the shared progress
   animation language plus the 3-second branded loading handoff. */
(() => {
  const loaderCss=document.createElement('link');
  loaderCss.rel='stylesheet';
  loaderCss.href='loading.css';
  document.head.appendChild(loaderCss);

  const splash=document.querySelector('#splash');
  const appShell=document.querySelector('#appShell');
  const enter=document.querySelector('#enterApp');
  const arc=document.querySelector('#loadingArc');
  const percent=document.querySelector('#loadingPercent');

  async function startNurLoader(){
    if(!splash || !appShell || !enter || !arc || !percent) return;

    /* The loading screen is intentionally shown on every app launch. */
    splash.classList.remove('hidden','is-leaving');
    appShell.classList.add('hidden');

    /* The supplied artwork was recoloured into NUR navy/gold and stored as a
       compact local base64 asset so the splash remains fully offline. */
    try{
      const raw=(await fetch('assets/loading-bg.b64',{cache:'force-cache'})).text();
      if(raw) splash.style.backgroundImage=`url("data:image/jpeg;base64,${raw.trim()}")`;
    }catch{}

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
      if(p<1){ requestAnimationFrame(frame); return; }

      arc.style.strokeDashoffset='0';
      percent.textContent='100%';
      splash.classList.add('is-leaving');
      setTimeout(()=>enter.click(),120);
    }
    requestAnimationFrame(frame);
  }

  /* Give the loader CSS one frame to attach, then begin. */
  requestAnimationFrame(startNurLoader);

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
      const previousLit=hadPrevious ? taskState.get(id) : false;
      const fill=el.querySelector('.pillar-shell i');
      if(!fill) return;

      el.classList.toggle('lit',previousLit);
      fill.style.setProperty('--fill',previousLit?'100%':'6%');
      taskTransitions.push({el,fill,targetLit});
      taskState.set(id,targetLit);
    });

    const liveIds=new Set([...document.querySelectorAll('[data-task-pillar]')].map(x=>x.dataset.taskPillar));
    [...taskState.keys()].forEach(id=>{if(!liveIds.has(id))taskState.delete(id)});

    const weekTransitions=[];
    document.querySelectorAll('#weekBars .week-col').forEach((col,index) => {
      const fill=col.querySelector('.week-fill');
      if(!fill)return;
      const target=parseFloat(fill.style.height)||0;
      const previous=weekState.has(index)?weekState.get(index):0;
      fill.style.height=`${previous}%`;
      weekTransitions.push({fill,target});
      weekState.set(index,target);
    });

    document.body.offsetHeight;
    requestAnimationFrame(() => {
      taskTransitions.forEach(({el,fill,targetLit}) => {
        el.classList.toggle('lit',targetLit);
        fill.style.setProperty('--fill',targetLit?'100%':'6%');
      });
      weekTransitions.forEach(({fill,target}) => { fill.style.height=`${target}%`; });
    });
  }

  window.render = function nurV2SmoothRender(){
    captureExisting();
    baseRender();
    animateRebuiltProgress();
  };

  captureExisting();
})();
