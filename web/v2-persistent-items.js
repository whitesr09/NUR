/* NUR V2 — persistent Amanah + Muhasaba definitions.
   Entries persist until the user deletes them. Only each day's completion state resets. */
(() => {
  if (typeof state === 'undefined' || typeof todayKey !== 'function') return;

  if (!state.meta) state.meta = {};
  const META_KEY = 'persistentListsV2';
  const TASK_KEY = 'persistentTasks';
  const INTENTION_KEY = 'persistentIntentions';

  const stripTask = x => ({ id:x.id, title:x.title, category:x.category || 'Personal' });
  const stripIntention = x => ({ id:x.id, title:x.title, category:x.category || '' });
  const freshTask = x => ({ ...stripTask(x), done:false });
  const freshIntention = x => ({ ...stripIntention(x), done:false });

  function latestNonEmpty(field){
    const keys = Object.keys(state.days || {}).sort().reverse();
    for (const k of keys){
      const list = state.days[k]?.[field];
      if (Array.isArray(list) && list.length) return list;
    }
    return [];
  }

  /* One-time migration from the most recent real day, so existing users do not
     lose lists that disappeared simply because a new calendar day started. */
  if (!state.meta[META_KEY]){
    const tasks = latestNonEmpty('tasks');
    const intentions = latestNonEmpty('intentions');
    state.meta[TASK_KEY] = tasks.map(stripTask);
    state.meta[INTENTION_KEY] = intentions.map(stripIntention);
    state.meta[META_KEY] = true;
  }
  if (!Array.isArray(state.meta[TASK_KEY])) state.meta[TASK_KEY] = [];
  if (!Array.isArray(state.meta[INTENTION_KEY])) state.meta[INTENTION_KEY] = [];

  function ensureToday(k=todayKey()){
    if (!state.days[k]) state.days[k] = emptyDay();
    const d = state.days[k];

    /* A new day receives the same entry definitions with fresh checkboxes. */
    if (!Array.isArray(d.tasks) || d.tasks.length === 0){
      d.tasks = state.meta[TASK_KEY].map(freshTask);
    } else {
      /* Keep today's saved completion values, while adding any persistent items
         that may be missing from a partially-created day. */
      const existing = new Map(d.tasks.map(x => [x.id,x]));
      d.tasks = state.meta[TASK_KEY].map(t => existing.has(t.id) ? {...t,...existing.get(t.id)} : freshTask(t));
    }

    if (!Array.isArray(d.intentions) || d.intentions.length === 0){
      d.intentions = state.meta[INTENTION_KEY].map(freshIntention);
    } else {
      const existing = new Map(d.intentions.map(x => [x.id,x]));
      d.intentions = state.meta[INTENTION_KEY].map(t => existing.has(t.id) ? {...t,...existing.get(t.id)} : freshIntention(t));
    }
    return d;
  }

  function syncPersistentDefinitions(){
    const k = todayKey();
    if (typeof currentDate === 'undefined' || currentDate !== k) return;
    const d = state.days[k];
    if (!d) return;
    state.meta[TASK_KEY] = (d.tasks || []).map(stripTask);
    state.meta[INTENTION_KEY] = (d.intentions || []).map(stripIntention);
  }

  const basePersist = persist;
  persist = function nurPersistentPersist(){
    syncPersistentDefinitions();
    return basePersist();
  };

  let realToday = todayKey();
  ensureToday(realToday);
  basePersist();

  /* If NUR stays open across midnight, roll the live dashboard to the new day.
     Historical browsing is left alone. */
  setInterval(() => {
    const nowToday = todayKey();
    if (nowToday === realToday) return;
    const wasViewingLiveDay = (currentDate === realToday);
    realToday = nowToday;
    ensureToday(realToday);
    basePersist();
    if (wasViewingLiveDay){
      currentDate = realToday;
      render();
    }
  }, 30000);

  /* Re-render once so an already-reset current day immediately restores the
     persistent entry definitions after this update is installed. */
  if (typeof currentDate !== 'undefined' && currentDate === realToday) render();
})();
