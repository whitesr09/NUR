const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const PRAYERS = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const STORAGE = 'nur-data-v1';
const FIRST_RUN_KEY = 'nur-first-run-date';

function key(d){
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}
const todayKey = () => key(new Date());
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const emptyDay = () => ({prayers:[false,false,false,false,false],tasks:[],intentions:[],notes:[],money:[]});
const hasRealActivity = d => !!d && ((d.prayers||[]).some(Boolean)||(d.tasks||[]).length||(d.intentions||[]).length||(d.notes||[]).length||(d.money||[]).length);

let state;
try{ state = JSON.parse(localStorage.getItem(STORAGE)||'{"days":{}}'); }catch{ state={days:{}}; }
if(!state || typeof state!=='object') state={days:{}};
if(!state.days) state.days={};
if(!state.meta) state.meta={};

const meaningful = Object.keys(state.days).filter(k=>hasRealActivity(state.days[k])).sort();
state.meta.startedOn = state.meta.startedOn || localStorage.getItem(FIRST_RUN_KEY) || meaningful[0] || todayKey();
localStorage.setItem(FIRST_RUN_KEY,state.meta.startedOn);
localStorage.setItem(STORAGE,JSON.stringify(state));

let currentDate=todayKey();
let calendarCursor=new Date();
let toastTimer;

function readDay(k=currentDate){ return state.days[k] || emptyDay(); }
function day(k=currentDate){ if(!state.days[k]) state.days[k]=emptyDay(); return state.days[k]; }
function persist(){ localStorage.setItem(STORAGE,JSON.stringify(state)); }
function save(message){ persist(); render(); if(message) toast(message); }
function prettyDate(k=currentDate,long=false){
  return new Date(k+'T12:00:00').toLocaleDateString('en-US',long?
    {weekday:'long',day:'numeric',month:'long',year:'numeric'}:
    {day:'numeric',month:'long'});
}
function weekday(k=currentDate){ return new Date(k+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'}).toUpperCase(); }
function esc(s=''){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const currency = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});

function moneySummary(d){
  let income=0,out=0,charity=0;
  (d.money||[]).forEach(x=>{
    if(x.type==='income') income += +x.amount;
    else { out += +x.amount; if(x.type==='charity') charity += +x.amount; }
  });
  return {balance:income-out,charity};
}

function progressBreakdown(k=currentDate){
  const d=readDay(k);
  const prayers=(d.prayers||[false,false,false,false,false]).slice(0,5);
  const tasks=d.tasks||[];
  const intentions=d.intentions||[];
  const total=prayers.length+tasks.length+intentions.length;
  const done=prayers.filter(Boolean).length+tasks.filter(x=>x.done).length+intentions.filter(x=>x.done).length;
  const pct=total ? Math.round(done/total*100) : 0;
  return {
    pct,total,done,
    prayerWeight:total?Math.round(prayers.length/total*100):0,
    taskWeight:total?Math.round(tasks.length/total*100):0,
    intentionWeight:total?Math.round(intentions.length/total*100):0
  };
}
const completion = k => progressBreakdown(k).pct;
const isBeforeStart = k => k < state.meta.startedOn;
const isFuture = k => k > todayKey();
function vibrate(ms=12){ try{navigator.vibrate?.(ms)}catch{} }
function toast(msg){
  const el=$('#toast'); if(!el)return;
  clearTimeout(toastTimer); el.textContent=msg; el.classList.remove('hidden');
  requestAnimationFrame(()=>el.classList.add('show'));
  toastTimer=setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.classList.add('hidden'),180)},1300);
}
function lightMessage(p){
  if(p===100)return 'The scene is complete — the day is full of light.';
  if(p>=70)return 'The light is strong. Finish the remaining actions gently.';
  if(p>=35)return 'The day is taking shape. Keep moving with intention.';
  if(p>0)return 'The scene brightens as the rhythm of your day fills.';
  return 'Begin with one sincere action. The first light starts there.';
}

function render(){
  const d=readDay();
  $('#weekdayLabel').textContent=weekday();
  $('#todayLabel').textContent=prettyDate();

  $('#prayerList').innerHTML=PRAYERS.map((n,i)=>`
    <button class="prayer-item ${d.prayers[i]?'active':''}" data-prayer="${i}" aria-pressed="${d.prayers[i]}">
      <span class="prayer-index">${d.prayers[i]?'✦':i+1}</span>
      <strong>${n}</strong><span class="prayer-state"></span>
    </button>`).join('');
  $$('[data-prayer]').forEach(b=>b.onclick=()=>{
    const live=day(),i=+b.dataset.prayer; live.prayers[i]=!live.prayers[i]; vibrate();
    save(`${PRAYERS[i]} ${live.prayers[i]?'completed':'unchecked'}`);
  });
  const pc=d.prayers.filter(Boolean).length;
  $('#prayerCount').textContent=`${pc} / 5`;
  $('#prayerProgressBar').style.width=`${pc/5*100}%`;

  const pb=progressBreakdown();
  const angle=pb.pct*3.6;
  $('#lightPercent').textContent=`${pb.pct}%`;
  $('#lightOrbit').style.setProperty('--angle',`${angle}deg`);
  $('#lightBeam').style.setProperty('--angle',`${angle}deg`);
  $('#lightCopy').textContent=lightMessage(pb.pct);
  const chips=[];
  if(pb.prayerWeight)chips.push(`<span>${pb.prayerWeight}% prayer</span>`);
  if(pb.taskWeight)chips.push(`<span>${pb.taskWeight}% tasks</span>`);
  if(pb.intentionWeight)chips.push(`<span>${pb.intentionWeight}% muhasaba</span>`);
  $('#lightWeights').innerHTML=chips.join('');

  const tasks=d.tasks||[],tc=tasks.filter(x=>x.done).length;
  $('#taskCount').textContent=`${tc} / ${tasks.length}`;
  $('#taskPreview').innerHTML=tasks.map(x=>`
    <button class="preview-row ${x.done?'done':''}" data-task="${x.id}" aria-pressed="${x.done}">
      <span class="preview-check"></span>
      <span class="preview-copy"><strong>${esc(x.title)}</strong><small>${esc(x.category||'Personal')}</small></span>
    </button>`).join('');
  $$('[data-task]').forEach(b=>b.onclick=()=>{
    const live=day(),x=live.tasks.find(v=>v.id===b.dataset.task); if(!x)return;
    x.done=!x.done;vibrate(16);save(x.done?'Task completed':'Task reopened');
  });
  $('#taskPillars').innerHTML=tasks.map((x,i)=>`
    <button class="task-pillar ${x.done?'lit':''}" data-task-pillar="${x.id}" aria-label="${esc(x.title)}">
      <span class="pillar-shell"><i></i><b>${i+1}</b></span>
    </button>`).join('');
  $$('[data-task-pillar]').forEach(b=>b.onclick=()=>{
    const live=day(),x=live.tasks.find(v=>v.id===b.dataset.taskPillar); if(!x)return;
    x.done=!x.done;vibrate(16);save(x.done?'Task light filled':'Task light cleared');
  });

  const intentions=d.intentions||[],mc=intentions.filter(x=>x.done).length;
  const mp=intentions.length?Math.round(mc/intentions.length*100):0;
  $('#muhasabaCount').textContent=`${mc} / ${intentions.length}`;
  $('#muhasabaPercent').textContent=mp;
  $('#muhasabaDonut').style.setProperty('--angle',`${mp*3.6}deg`);
  $('#muhasabaPreview').innerHTML=intentions.map(x=>`
    <button class="preview-row ${x.done?'done':''}" data-intention="${x.id}" aria-pressed="${x.done}">
      <span class="preview-check"></span>
      <span class="preview-copy"><strong>${esc(x.title)}</strong><small>${x.done?'Completed':'Tap to mark'}</small></span>
    </button>`).join('');
  $$('[data-intention]').forEach(b=>b.onclick=()=>{
    const live=day(),x=live.intentions.find(v=>v.id===b.dataset.intention); if(!x)return;
    x.done=!x.done;vibrate(14);save(x.done?'Muhasaba completed':'Muhasaba reopened');
  });

  const n=d.notes.at(-1);
  $('#latestNoteTitle').textContent=n?.title||'No note for this day yet.';
  $('#latestNoteBody').textContent=n?.body||'Keep one thought you want to carry forward.';
  const ms=moneySummary(d);
  $('#balancePreview').textContent=currency.format(ms.balance);
  $('#charityPreview').textContent=currency.format(ms.charity);
  $('#historySince').textContent=`Tracking since ${prettyDate(state.meta.startedOn,true)}`;
  renderWeek();
}

function renderWeek(){
  let h='';
  for(let i=6;i>=0;i--){
    const dt=new Date();dt.setHours(12,0,0,0);dt.setDate(dt.getDate()-i);
    const k=key(dt),available=!isBeforeStart(k),p=available?completion(k):0;
    const blue=(6-i)%3===1;
    h+=`<div class="week-col ${blue?'blue':''} ${available?'':'pre-start'}">
      <div class="week-arch"><i class="week-fill" style="height:${available?p:0}%">${available?`<b>${p}%</b>`:'<b>—</b>'}</i></div>
      <small>${dt.toLocaleDateString('en-US',{weekday:'narrow'})}</small>
    </div>`;
  }
  $('#weekBars').innerHTML=h;
}

function modalHead(title){return `<span class="eyebrow">NUR · ${prettyDate()}</span><h3 class="modal-title">${title}</h3>`}
function prayerModal(d){return modalHead('Five prayers')+`<div class="prayer-list">${PRAYERS.map((n,i)=>`
  <button class="prayer-item ${d.prayers[i]?'active':''}" data-modal-prayer="${i}">
    <span class="prayer-index">${d.prayers[i]?'✦':i+1}</span><strong>${n}</strong><span class="prayer-state"></span>
  </button>`).join('')}</div>`}
function rowHtml(x){return `<div class="editable-row ${x.done?'done':''}" data-id="${x.id}">
  <button class="check" data-toggle></button><div class="row-copy"><strong>${esc(x.title)}</strong><small>${esc(x.category||'Mark when complete')}</small></div>
  <button class="delete" data-delete>Delete</button></div>`}
function taskModal(d){return modalHead('Today’s tasks')+`<form id="taskForm" class="form-line">
  <input class="field" name="title" placeholder="Add a responsibility" required>
  <input class="field" name="category" placeholder="Category">
  <button class="gold-btn">+ Add task</button></form><div id="taskRows">${d.tasks.map(rowHtml).join('')}</div>`}
function muhasabaModal(d){return modalHead('Self-accounting')+`<form id="intentionForm" class="form-line two">
  <input class="field" name="title" placeholder="What do you want to guard or improve?" required>
  <button class="gold-btn">+ Add intention</button></form><div id="intentionRows">${d.intentions.map(rowHtml).join('')}</div>`}
function notesModal(d){return modalHead('Quiet notes')+`<form id="noteForm">
  <input class="field" name="title" placeholder="Title" required>
  <textarea class="field textarea" name="body" placeholder="Write your reflection..." required></textarea>
  <div class="form-action"><button class="gold-btn">Add note</button></div></form>
  <div class="note-stack">${d.notes.slice().reverse().map(n=>`<article class="note-card" data-id="${n.id}"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><button class="delete" data-delete-note>Delete</button></article>`).join('')||'<p class="history-intro">No notes yet.</p>'}</div>`}
function moneyModal(d){
  const s=moneySummary(d);
  return modalHead('Money for this day')+`<div class="money-summary"><div class="summary-box"><small>Balance</small><strong>${currency.format(s.balance)}</strong></div><div class="summary-box"><small>Charity</small><strong>${currency.format(s.charity)}</strong></div></div>
  <form id="moneyForm" class="form-line"><input class="field" name="title" placeholder="Description" required>
  <input class="field" name="amount" type="number" min="0" step=".01" placeholder="Amount" required>
  <select class="field" name="type"><option value="expense">Expense</option><option value="income">Income</option><option value="charity">Charity</option></select>
  <button class="gold-btn">Add</button></form>
  <div>${d.money.slice().reverse().map(e=>`<div class="money-entry ${e.type}" data-id="${e.id}"><span>${e.type==='income'?'+':e.type==='charity'?'✦':'−'}</span><div><strong>${esc(e.title)}</strong><small>${esc(e.type)}</small></div><span class="amount">${e.type==='income'?'+':'−'}${currency.format(e.amount)}</span><button class="delete" data-delete-money>Delete</button></div>`).join('')||'<p class="history-intro">No entries yet.</p>'}</div>`;
}
function historyModal(){return modalHead('Day history')+`<p class="history-intro">Only real days from your NUR start date are shown. Dates before that stay blank.</p><div id="calendarMount"></div>`}

function modalMarkup(type){
  const d=readDay();
  return {prayers:prayerModal(d),tasks:taskModal(d),muhasaba:muhasabaModal(d),notes:notesModal(d),money:moneyModal(d),history:historyModal()}[type];
}
function openModal(type){
  $('#modalContent').innerHTML=modalMarkup(type);
  const root=$('#modalRoot');root.classList.remove('hidden');root.setAttribute('aria-hidden','false');
  requestAnimationFrame(()=>root.classList.add('open'));bindModal(type);
}
function refreshModal(type){$('#modalContent').innerHTML=modalMarkup(type);bindModal(type);render()}
function closeModal(){
  const root=$('#modalRoot');root.classList.remove('open');
  setTimeout(()=>{root.classList.add('hidden');root.setAttribute('aria-hidden','true');render()},180);
}
function bindRows(sel,arr,type){
  $$(sel+' [data-id]').forEach(row=>{
    row.querySelector('[data-toggle]').onclick=()=>{const x=arr.find(v=>v.id===row.dataset.id);if(!x)return;x.done=!x.done;vibrate();persist();refreshModal(type)};
    row.querySelector('[data-delete]').onclick=()=>{const i=arr.findIndex(v=>v.id===row.dataset.id);if(i>=0)arr.splice(i,1);persist();refreshModal(type)};
  });
}
function bindModal(type){
  const d=day();
  if(type==='prayers')$$('[data-modal-prayer]').forEach(b=>b.onclick=()=>{const i=+b.dataset.modalPrayer;d.prayers[i]=!d.prayers[i];vibrate();persist();refreshModal('prayers')});
  if(type==='tasks'){
    $('#taskForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);d.tasks.push({id:uid(),title:fd.get('title').trim(),category:fd.get('category').trim()||'Personal',done:false});persist();refreshModal('tasks')};
    bindRows('#taskRows',d.tasks,'tasks');
  }
  if(type==='muhasaba'){
    $('#intentionForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);d.intentions.push({id:uid(),title:fd.get('title').trim(),category:'Muhasaba',done:false});persist();refreshModal('muhasaba')};
    bindRows('#intentionRows',d.intentions,'muhasaba');
  }
  if(type==='notes'){
    $('#noteForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);d.notes.push({id:uid(),title:fd.get('title').trim(),body:fd.get('body').trim()});persist();refreshModal('notes')};
    $$('[data-delete-note]').forEach(b=>b.onclick=()=>{d.notes=d.notes.filter(n=>n.id!==b.closest('[data-id]').dataset.id);state.days[currentDate]=d;persist();refreshModal('notes')});
  }
  if(type==='money'){
    $('#moneyForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);d.money.push({id:uid(),title:fd.get('title').trim(),amount:+fd.get('amount'),type:fd.get('type')});persist();refreshModal('money')};
    $$('[data-delete-money]').forEach(b=>b.onclick=()=>{d.money=d.money.filter(x=>x.id!==b.closest('[data-id]').dataset.id);state.days[currentDate]=d;persist();refreshModal('money')});
  }
  if(type==='history')renderCalendar();
}
function renderCalendar(){
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
  let cells='';for(let i=0;i<start;i++)cells+='<div></div>';
  for(let n=1;n<=days;n++){
    const k=key(new Date(y,m,n)),disabled=isBeforeStart(k)||isFuture(k),p=disabled?0:completion(k);
    cells+=`<button class="day-cell ${k===currentDate?'selected':''} ${disabled?'disabled':''}" data-day="${k}" ${disabled?'disabled':''}>
      <div class="day-ring" style="--angle:${p*3.6}deg"><span>${n}</span></div><small>${disabled?'—':p+'%'}</small></button>`;
  }
  $('#calendarMount').innerHTML=`<div class="calendar-head"><button id="prevMonth" class="icon-btn">‹</button><strong>${calendarCursor.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button id="nextMonth" class="icon-btn">›</button></div>
  <div class="calendar-grid">${['M','T','W','T','F','S','S'].map(x=>`<div class="weekday">${x}</div>`).join('')}${cells}</div>`;
  $('#prevMonth').onclick=()=>{calendarCursor=new Date(y,m-1,1);renderCalendar()};
  $('#nextMonth').onclick=()=>{calendarCursor=new Date(y,m+1,1);renderCalendar()};
  $$('[data-day]:not([disabled])').forEach(b=>b.onclick=()=>{currentDate=b.dataset.day;closeModal()});
}

$('#enterApp').onclick=()=>{$('#splash').classList.add('hidden');$('#appShell').classList.remove('hidden');localStorage.setItem('nur-entered','1');render()};
if(localStorage.getItem('nur-entered')){$('#splash').classList.add('hidden');$('#appShell').classList.remove('hidden')}
$$('[data-open]').forEach(b=>b.onclick=()=>openModal(b.dataset.open));
$$('[data-close]').forEach(b=>b.onclick=closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
render();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
