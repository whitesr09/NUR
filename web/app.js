const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const PRAYERS = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const STORAGE = 'nur-data-v1';
const FIRST_RUN_KEY = 'nur-first-run-date';
const todayKey = () => key(new Date());
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function key(d){
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}

function emptyDay(){ return {prayers:[false,false,false,false,false],tasks:[],intentions:[],notes:[],money:[]}; }
function hasRealActivity(d){
  if(!d) return false;
  return (d.prayers||[]).some(Boolean) || (d.tasks||[]).length>0 || (d.intentions||[]).length>0 || (d.notes||[]).length>0 || (d.money||[]).length>0;
}

let state;
try { state = JSON.parse(localStorage.getItem(STORAGE) || '{"days":{}}'); } catch { state = {days:{}}; }
if(!state || typeof state !== 'object') state = {days:{}};
if(!state.days) state.days = {};
if(!state.meta) state.meta = {};

const meaningfulDates = Object.keys(state.days).filter(k => hasRealActivity(state.days[k])).sort();
const detectedStart = meaningfulDates[0] || todayKey();
state.meta.startedOn = state.meta.startedOn || localStorage.getItem(FIRST_RUN_KEY) || detectedStart;
localStorage.setItem(FIRST_RUN_KEY, state.meta.startedOn);
localStorage.setItem(STORAGE, JSON.stringify(state));

let currentDate = todayKey();
let calendarCursor = new Date();
let toastTimer;

function readDay(k=currentDate){ return state.days[k] || emptyDay(); }
function day(k=currentDate){ if(!state.days[k]) state.days[k] = emptyDay(); return state.days[k]; }
function persist(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
function save(message){ persist(); render(); if(message) toast(message); }
function pct(a){ return a.length ? Math.round(a.filter(Boolean).length / a.length * 100) : 0; }
function completion(k=currentDate){
  const d = readDay(k);
  const p = pct(d.prayers || []);
  const t = d.tasks?.length ? pct(d.tasks.map(x=>x.done)) : 0;
  const m = d.intentions?.length ? pct(d.intentions.map(x=>x.done)) : 0;
  return Math.round(p*.45 + t*.4 + m*.15);
}
function prettyDate(k=currentDate,long=false){
  return new Date(k+'T12:00:00').toLocaleDateString('en-US', long ? {weekday:'long',day:'numeric',month:'long',year:'numeric'} : {weekday:'short',day:'numeric',month:'short'});
}
function esc(s=''){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const currency = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
function moneySummary(d){
  let income=0,out=0,charity=0;
  (d.money||[]).forEach(x=>{ if(x.type==='income') income += +x.amount; else { out += +x.amount; if(x.type==='charity') charity += +x.amount; } });
  return {balance:income-out,charity};
}
function vibrate(ms=12){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch{} }
function toast(msg){
  const el = $('#toast'); if(!el) return;
  clearTimeout(toastTimer); el.textContent = msg; el.classList.remove('hidden');
  requestAnimationFrame(()=>el.classList.add('show'));
  toastTimer = setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.classList.add('hidden'),220); },1400);
}
function lightMessage(p){
  if(p===100) return 'A full day of light — all three rhythms are complete.';
  if(p>=75) return 'Strong rhythm. Keep the final pieces gentle and intentional.';
  if(p>=45) return 'The day is taking shape. One small completion can brighten it further.';
  if(p>0) return 'A little light is already here. Build the next step without rushing.';
  return 'Begin with one sincere action. The light grows from there.';
}
function rhythmStreak(){
  const today = new Date(todayKey()+'T12:00:00');
  let count = 0;
  for(let i=0;i<3650;i++){
    const d = new Date(today); d.setDate(d.getDate()-i); const k = key(d);
    if(k < state.meta.startedOn) break;
    if(completion(k) > 0) count++; else if(i===0) continue; else break;
  }
  return count;
}
function isBeforeStart(k){ return k < state.meta.startedOn; }
function isFuture(k){ return k > todayKey(); }

function render(){
  const d = readDay();
  $('#todayLabel').textContent = prettyDate();

  $('#prayerList').innerHTML = PRAYERS.map((n,i)=>`<button class="prayer-item ${d.prayers[i]?'active':''}" data-prayer="${i}" aria-pressed="${d.prayers[i]}"><span class="prayer-index">${i+1}</span><strong>${n}</strong><span class="prayer-state"></span></button>`).join('');
  $$('[data-prayer]').forEach(b=>b.onclick=()=>{
    const live = day(); const i = +b.dataset.prayer; live.prayers[i] = !live.prayers[i]; vibrate(); save(`${PRAYERS[i]} ${live.prayers[i]?'completed':'unchecked'}`);
  });
  const pc = d.prayers.filter(Boolean).length;
  $('#prayerCount').textContent = `${pc} / 5`;
  $('#prayerProgressBar').style.width = `${pc/5*100}%`;

  const c = completion();
  $('#lightPercent').textContent = c+'%';
  $('#lightHalo').style.setProperty('--p',c);
  $('#lightCopy').textContent = lightMessage(c);
  const streak = rhythmStreak();
  $('#streakChip').textContent = `${streak} day${streak===1?'':'s'} rhythm`;

  const tasks = d.tasks || [];
  const tc = tasks.filter(x=>x.done).length;
  $('#taskCount').textContent = `${tc} / ${tasks.length}`;
  $('#taskPreview').innerHTML = tasks.slice(0,5).map(x=>`<button class="preview-row interactive ${x.done?'done':''}" data-task-preview="${x.id}" aria-pressed="${x.done}"><span class="preview-check"><i></i></span><span class="preview-copy"><strong>${esc(x.title)}</strong><small>${esc(x.category||'Personal')}</small></span></button>`).join('');
  $$('[data-task-preview]').forEach(b=>b.onclick=()=>{
    const live = day(); const x = live.tasks.find(x=>x.id===b.dataset.taskPreview); if(!x) return;
    x.done = !x.done; vibrate(16); save(x.done?'Task completed — pillar lit':'Task reopened');
  });
  $('#taskPillars').innerHTML = tasks.map((x,i)=>`<button class="task-pillar ${x.done?'lit':''}" data-task-light="${x.id}" aria-label="${esc(x.title)}" title="${esc(x.title)}"><span class="pillar-shell"><i></i><b>${i+1}</b></span></button>`).join('');
  $$('[data-task-light]').forEach(b=>b.onclick=()=>{
    const live = day(); const x = live.tasks.find(x=>x.id===b.dataset.taskLight); if(!x) return;
    x.done = !x.done; vibrate(16); save(x.done?'Task light filled':'Task light cleared');
  });

  const intentions = d.intentions || [];
  const mc = intentions.filter(x=>x.done).length;
  const mp = intentions.length ? Math.round(mc/intentions.length*100) : 0;
  $('#muhasabaCount').textContent = `${mc} / ${intentions.length}`;
  $('#muhasabaPercent').textContent = mp+'%';
  $('#muhasabaDonut').style.setProperty('--p',mp);
  $('#muhasabaPreview').innerHTML = intentions.slice(0,4).map(x=>`<button class="preview-row interactive compact ${x.done?'done':''}" data-intention-preview="${x.id}" aria-pressed="${x.done}"><span class="preview-check"><i></i></span><span class="preview-copy"><strong>${esc(x.title)}</strong><small>${x.done?'Completed':'Tap to reflect & mark'}</small></span></button>`).join('');
  $$('[data-intention-preview]').forEach(b=>b.onclick=()=>{
    const live = day(); const x = live.intentions.find(x=>x.id===b.dataset.intentionPreview); if(!x) return;
    x.done = !x.done; vibrate(14); save(x.done?'Muhasaba marked complete':'Muhasaba reopened');
  });

  const n = d.notes.at(-1);
  $('#latestNoteTitle').textContent = n?.title || 'No note for this day yet.';
  $('#latestNoteBody').textContent = n?.body || 'Keep one thought you want to carry forward.';
  const ms = moneySummary(d);
  $('#balancePreview').textContent = currency.format(ms.balance);
  $('#charityPreview').textContent = currency.format(ms.charity);
  $('#historySince').textContent = `Tracking since ${prettyDate(state.meta.startedOn,true)}`;
  renderWeek();
}

function renderWeek(){
  let h = '';
  for(let i=6;i>=0;i--){
    const dt = new Date(); dt.setHours(12,0,0,0); dt.setDate(dt.getDate()-i);
    const k = key(dt); const available = !isBeforeStart(k); const p = available ? completion(k) : 0;
    h += `<div class="week-col ${available?'':'pre-start'}"><div class="week-bar"><i class="week-fill" style="height:${available?p:0}%"></i>${available?'':'<span>—</span>'}</div><small>${dt.toLocaleDateString('en-US',{weekday:'short'})}</small></div>`;
  }
  $('#weekBars').innerHTML = h;
}

function modalHead(title){ return `<span class="eyebrow">NUR · ${prettyDate()}</span><h3 class="modal-title">${title}</h3>`; }
function prayerModal(d){ return modalHead('Five prayers') + `<div class="prayer-list modal-prayer-list">${PRAYERS.map((n,i)=>`<button class="prayer-item ${d.prayers[i]?'active':''}" data-modal-prayer="${i}"><span class="prayer-index">${i+1}</span><strong>${n}</strong><span class="prayer-state"></span></button>`).join('')}</div>`; }
function rowHtml(x){ return `<div class="editable-row ${x.done?'done':''}" data-id="${x.id}"><button class="check" data-toggle aria-label="Toggle completion"><i></i></button><div class="row-copy"><strong>${esc(x.title)}</strong><small>${esc(x.category||'Mark when complete')}</small></div><button class="delete" data-delete>Delete</button></div>`; }
function taskModal(d){ return modalHead("Today’s tasks") + `<form id="taskForm" class="form-line"><input class="field" name="title" placeholder="Add a clear responsibility" required><input class="field" name="category" placeholder="Category"><button class="gold-btn">Add task</button></form><div id="taskRows">${d.tasks.map(rowHtml).join('')}</div>`; }
function muhasabaModal(d){ return modalHead('Self-accounting') + `<form id="intentionForm" class="form-line two"><input class="field" name="title" placeholder="What are you working to restrain or protect?" required><button class="gold-btn">Add intention</button></form><div id="intentionRows">${d.intentions.map(rowHtml).join('')}</div>`; }
function notesModal(d){ return modalHead('Add a note') + `<form id="noteForm"><input class="field" name="title" placeholder="Title" required><textarea class="field textarea" name="body" placeholder="Write your reflection..." required></textarea><div class="form-action"><button class="gold-btn">Add note</button></div></form><div class="note-stack">${d.notes.slice().reverse().map(n=>`<article class="note-card glass-inner" data-id="${n.id}"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><button class="delete" data-delete-note>Delete</button></article>`).join('')||'<p class="history-intro">No notes yet. Keep what the day teaches you.</p>'}</div>`; }
function moneyModal(d){
  const s = moneySummary(d);
  return modalHead('Money for this day') + `<div class="money-summary"><div class="summary-box glass-inner"><small>Balance</small><strong>${currency.format(s.balance)}</strong></div><div class="summary-box glass-inner"><small>Charity</small><strong>${currency.format(s.charity)}</strong></div></div><form id="moneyForm" class="form-line money-form"><input class="field" name="title" placeholder="Description" required><input class="field" name="amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Amount" required><select class="field" name="type"><option value="expense">Expense</option><option value="income">Income</option><option value="charity">Charity</option></select><button class="gold-btn">Add entry</button></form><div>${d.money.slice().reverse().map(e=>`<div class="money-entry ${e.type}" data-id="${e.id}"><span>${e.type==='income'?'+':e.type==='charity'?'✦':'−'}</span><div><strong>${esc(e.title)}</strong><small>${esc(e.type)}</small></div><span class="amount">${e.type==='income'?'+':'−'}${currency.format(e.amount)}</span><button class="delete" data-delete-money>Delete</button></div>`).join('')||'<p class="history-intro">No entries yet.</p>'}</div>`;
}
function historyModal(){ return modalHead('Day history') + `<p class="history-intro">History begins on your first meaningful day in NUR. Dates before that are intentionally left blank.</p><div id="calendarMount"></div>`; }

function openModal(type){
  const d = readDay();
  const m = {prayers:prayerModal(d),tasks:taskModal(d),muhasaba:muhasabaModal(d),notes:notesModal(d),money:moneyModal(d),history:historyModal()}[type];
  $('#modalContent').innerHTML = m;
  $('#modalRoot').classList.remove('hidden'); $('#modalRoot').setAttribute('aria-hidden','false');
  requestAnimationFrame(()=>$('#modalRoot').classList.add('open'));
  bindModal(type);
}
function closeModal(){
  const root = $('#modalRoot'); root.classList.remove('open');
  setTimeout(()=>{root.classList.add('hidden'); root.setAttribute('aria-hidden','true'); render();},180);
}
function bindRows(sel,arr,type){
  $$(sel+' [data-id]').forEach(row=>{
    row.querySelector('[data-toggle]').onclick=()=>{ const x=arr.find(x=>x.id===row.dataset.id); if(!x) return; x.done=!x.done; vibrate(); persist(); openModalFresh(type); };
    row.querySelector('[data-delete]').onclick=()=>{ const i=arr.findIndex(x=>x.id===row.dataset.id); if(i>=0) arr.splice(i,1); vibrate(); persist(); openModalFresh(type); };
  });
}
function openModalFresh(type){ $('#modalContent').innerHTML=''; const d=readDay(); const m={prayers:prayerModal(d),tasks:taskModal(d),muhasaba:muhasabaModal(d),notes:notesModal(d),money:moneyModal(d),history:historyModal()}[type]; $('#modalContent').innerHTML=m; bindModal(type); render(); }
function bindModal(type){
  const d = day();
  if(type==='prayers') $$('[data-modal-prayer]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.modalPrayer; d.prayers[i]=!d.prayers[i]; vibrate(); persist(); openModalFresh('prayers'); });
  if(type==='tasks'){
    const f=$('#taskForm'); f.onsubmit=e=>{e.preventDefault(); const fd=new FormData(f); d.tasks.push({id:uid(),title:fd.get('title').trim(),category:fd.get('category').trim()||'Personal',done:false}); persist(); vibrate(); openModalFresh('tasks');};
    bindRows('#taskRows',d.tasks,'tasks');
  }
  if(type==='muhasaba'){
    const f=$('#intentionForm'); f.onsubmit=e=>{e.preventDefault(); d.intentions.push({id:uid(),title:new FormData(f).get('title').trim(),done:false}); persist(); vibrate(); openModalFresh('muhasaba');};
    bindRows('#intentionRows',d.intentions,'muhasaba');
  }
  if(type==='notes'){
    const f=$('#noteForm'); f.onsubmit=e=>{e.preventDefault(); const fd=new FormData(f); d.notes.push({id:uid(),title:fd.get('title').trim(),body:fd.get('body').trim()}); persist(); vibrate(); openModalFresh('notes');};
    $$('[data-delete-note]').forEach(b=>b.onclick=()=>{ d.notes=d.notes.filter(n=>n.id!==b.closest('[data-id]').dataset.id); state.days[currentDate]=d; persist(); openModalFresh('notes'); });
  }
  if(type==='money'){
    const f=$('#moneyForm'); f.onsubmit=e=>{e.preventDefault(); const fd=new FormData(f); d.money.push({id:uid(),title:fd.get('title').trim(),amount:+fd.get('amount'),type:fd.get('type')}); persist(); vibrate(); openModalFresh('money');};
    $$('[data-delete-money]').forEach(b=>b.onclick=()=>{ d.money=d.money.filter(x=>x.id!==b.closest('[data-id]').dataset.id); state.days[currentDate]=d; persist(); openModalFresh('money'); });
  }
  if(type==='history') renderCalendar();
}

function renderCalendar(){
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
  let cells='';
  for(let i=0;i<start;i++) cells+='<div></div>';
  for(let n=1;n<=days;n++){
    const k=key(new Date(y,m,n)); const disabled=isBeforeStart(k)||isFuture(k); const p=disabled?0:completion(k);
    cells += `<button class="day-cell ${k===currentDate?'selected':''} ${disabled?'disabled':''}" ${disabled?'disabled':''} data-day="${k}"><div class="day-ring" style="--p:${p}"><span>${n}</span></div><small>${disabled?'—':p+'%'}</small></button>`;
  }
  $('#calendarMount').innerHTML = `<div class="calendar-head"><button id="prevMonth" class="icon-btn">‹</button><strong>${calendarCursor.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button id="nextMonth" class="icon-btn">›</button></div><div class="calendar-grid">${['M','T','W','T','F','S','S'].map(x=>`<div class="weekday">${x}</div>`).join('')}${cells}</div>`;
  $('#prevMonth').onclick=()=>{calendarCursor=new Date(y,m-1,1);renderCalendar();};
  $('#nextMonth').onclick=()=>{calendarCursor=new Date(y,m+1,1);renderCalendar();};
  $$('[data-day]:not(:disabled)').forEach(b=>b.onclick=()=>{currentDate=b.dataset.day; closeModal(); toast(`Opened ${prettyDate(currentDate)}`);});
}

$('#enterApp').onclick=()=>{ $('#splash').classList.add('splash-out'); setTimeout(()=>{ $('#splash').classList.add('hidden'); $('#appShell').classList.remove('hidden'); localStorage.setItem('nur-entered','1'); render(); },420); };
if(localStorage.getItem('nur-entered')){ $('#splash').classList.add('hidden'); $('#appShell').classList.remove('hidden'); }
$$('[data-open]').forEach(b=>b.onclick=()=>openModal(b.dataset.open));
$$('[data-close]').forEach(b=>b.onclick=closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
document.addEventListener('visibilitychange',()=>{ if(!document.hidden && currentDate===todayKey()) render(); });
render();

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js?v=2').catch(()=>{}));
