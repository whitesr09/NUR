/* NUR v2 motion bridge.
   app.js intentionally stays responsible for data. This layer only preserves
   the previous visual fill long enough for rebuilt progress DOM to animate. */
(() => {
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

    /* Flush once, then every progress surface moves with the same easing. */
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

  /* app.js performs its first render before this deferred script runs. Capture
     that result as the baseline so the next user action animates from reality. */
  captureExisting();
})();
