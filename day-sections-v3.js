(() => {
  if (typeof state === 'undefined' || typeof selectedPlan !== 'function' || typeof getDraft !== 'function') return;

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const normalizeEntryType = value => ['reps','sec','min'].includes(value) ? value : 'reps';
  const fmtNum = value => {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  };

  function custom(day = state.selectedDay){
    if(!state.customPlans) state.customPlans = {};
    return state.customPlans[day] || null;
  }

  function ensureCustom(day = state.selectedDay){
    if(!state.customPlans) state.customPlans = {};
    if(!state.customPlans[day]){
      const p = selectedPlan();
      state.customPlans[day] = {
        name:p?.name || '',
        warm:p?.warm || '',
        warmups:typeof warmupsForDay === 'function' ? clone(warmupsForDay(day)) : [],
        exercises:clone(p?.exercises || []),
        blank:!(p?.exercises?.length || p?.name)
      };
    }
    return state.customPlans[day];
  }

  const selectedPlanV2 = selectedPlan;
  selectedPlan = function(){
    const p = selectedPlanV2();
    const c = custom(state.selectedDay) || {};
    return {
      ...p,
      rest:c.rest === true,
      warmupEnabled:c.warmupEnabled !== false && !((state.routineBlank && !custom(state.selectedDay)) || c.blank === true),
      cooldownEnabled:c.cooldownEnabled === true,
      cooldowns:Array.isArray(c.cooldowns) ? clone(c.cooldowns) : []
    };
  };

  const warmupsForDayV2 = warmupsForDay;
  warmupsForDay = function(day){
    const c = custom(day);
    if(c?.warmupEnabled === false) return [];
    const list = warmupsForDayV2(day);
    return (list || []).map(x => [String(x?.[0] || ''), String(x?.[1] || ''), normalizeEntryType(x?.[2])]);
  };

  function cooldownsForDay(day){
    const c = custom(day);
    if(!c?.cooldownEnabled) return [];
    return (Array.isArray(c.cooldowns) ? c.cooldowns : []).map(x => [String(x?.[0] || ''), String(x?.[1] || ''), normalizeEntryType(x?.[2])]);
  }
  window.cooldownsForDay = cooldownsForDay;

  const getDraftV2 = getDraft;
  getDraft = function(){
    const d = getDraftV2();
    const cds = cooldownsForDay(state.selectedDay);
    if(!Array.isArray(d.cooldownEntries)) d.cooldownEntries = [];
    while(d.cooldownEntries.length < cds.length) d.cooldownEntries.push({weight:'',value:'',done:false});
    if(d.cooldownEntries.length > cds.length) d.cooldownEntries = d.cooldownEntries.slice(0,cds.length);
    if(typeof d.cooldownDone !== 'boolean') d.cooldownDone = false;
    return d;
  };

  const style = document.createElement('style');
  style.textContent = `
    .day-setup-btn{border-color:#4c4f73!important;background:#17182b!important}
    .rest-badge{display:inline-flex;align-items:center;gap:5px;margin-left:7px;padding:3px 7px;border-radius:999px;background:#172438;border:1px solid #35506f;color:#a9c8eb;font-size:10px;font-weight:900;letter-spacing:.5px}
    .rest-day-card{margin:10px 0;padding:22px;text-align:center;border:1px solid #2d4565;border-radius:14px;background:#0b1625}
    .rest-day-card h2{margin:0 0 7px}.rest-day-card p{margin:0;color:#99a8bc;font-size:13px}
    .routine-section{margin:10px 0;padding:12px;border:1px solid #263b58;border-radius:14px;background:#0b1524}
    .routine-section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
    .routine-section-head h3{margin:0}.routine-section-note{font-size:11px;color:#90a0b6}
    .day-setup-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.7);display:none;align-items:flex-start;justify-content:center;z-index:230;padding:18px 10px;overflow:auto}
    .day-setup-backdrop.open{display:flex}
    .day-setup-modal{width:min(860px,100%);background:#0d1827;border:1px solid #2a405f;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.55);padding:14px;margin:auto}
    .day-setup-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .day-setup-title h2{margin:0}.day-setup-title p{margin:4px 0 0;color:#99a8bc;font-size:12px}
    .day-setup-close{border:1px solid #36506f;background:#101d30;color:#fff;border-radius:9px;width:38px;height:38px;font-size:20px}
    .day-type-card,.section-config{margin-top:12px;padding:12px;border:1px solid #243651;border-radius:12px;background:#0a1422}
    .day-type-card{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
    .day-type-card label,.section-toggle{display:flex;align-items:center;gap:8px;font-weight:800}
    .section-config-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
    .section-config-head h3{margin:0}
    .setup-list{display:flex;flex-direction:column;gap:8px}
    .setup-item{display:grid;grid-template-columns:32px minmax(150px,1.3fr) minmax(125px,.8fr) 145px auto;gap:7px;align-items:center;padding:8px;border:1px solid #20314b;border-radius:10px;background:#091321}
    .setup-num{height:28px;width:28px;border-radius:50%;display:grid;place-items:center;background:#1e88ff;font-size:12px;font-weight:900}
    .setup-input,.setup-select{width:100%;border:1px solid #2b3f5e;background:#07111e;color:#fff;border-radius:8px;padding:8px;outline:none}
    .setup-actions{display:flex;gap:5px;flex-wrap:wrap}.setup-mini{border:1px solid #2d4565;background:#122035;color:#fff;border-radius:7px;padding:6px 8px;font-size:11px}.setup-mini.delete{color:#ff9dab;border-color:#613040;background:#29141b}
    .day-setup-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #243651}
    @media(max-width:700px){.setup-item{grid-template-columns:30px 1fr}.setup-item .setup-target,.setup-item .setup-type,.setup-actions{grid-column:2}.setup-actions{justify-content:flex-start}}
  `;
  document.head.appendChild(style);

  function unitFor(type){return type === 'sec' ? 'sec' : type === 'min' ? 'min' : 'reps';}
  function formatSectionEntry(entry, type){
    const weight = Number(entry?.weight || 0), value = Number(entry?.value || 0);
    const prefix = weight ? `${fmtNum(weight)} lb × ` : '';
    return `${prefix}${fmtNum(value)} ${unitFor(type)}${entry?.done ? ' ✓' : ''}`;
  }

  function renderTrackedSection(kind, title, icon, items, entries, doneFlag, description=''){
    if(!items.length) return '';
    const isWarm = kind === 'warmup';
    const rows = items.map((item,i) => {
      const e = entries[i] || {weight:'',value:'',done:false};
      const type = normalizeEntryType(item[2]);
      const unit = unitFor(type);
      const updateFn = isWarm ? `updateWarmup(${i}` : `updateCooldownEntry(${i}`;
      const toggleFn = isWarm ? `toggleWarmupEntry(${i})` : `toggleCooldownEntry(${i})`;
      return `<div class="history-ex"><b>${esc(item[0])}</b><div class="muted">${esc(item[1])}</div><div class="setrow"><div class="setlabel">${isWarm?'Warm':'Cool'}</div><div class="field"><input inputmode="decimal" placeholder="load" value="${esc(e.weight)}" oninput="${updateFn},'weight',this.value)"><span>lb</span></div><div class="field"><input inputmode="decimal" placeholder="${unit}" value="${esc(e.value)}" oninput="${updateFn},'value',this.value)"><span>${unit}</span></div><button class="done ${e.done?'on':''}" onclick="${toggleFn}">${e.done?'✓':'○'}</button></div></div>`;
    }).join('');
    const toggle = isWarm ? `toggleWarmup()` : `toggleCooldownDone()`;
    const label = doneFlag ? `✓ ${title} done` : `Mark ${title.toLowerCase()} done`;
    return `<div class="${isWarm?'warmup':'routine-section cooldown-routine'}"><div class="routine-section-head"><h3>${icon} ${title}</h3>${description?`<span class="routine-section-note">${esc(description)}</span>`:''}</div>${rows}<div class="setactions"><button class="mini" onclick="${toggle}">${label}</button></div></div>`;
  }

  window.updateCooldownEntry = (i, field, value) => {
    const d = getDraft();
    if(!d.cooldownEntries[i]) d.cooldownEntries[i] = {weight:'',value:'',done:false};
    d.cooldownEntries[i][field] = value;
    save();
  };
  window.toggleCooldownEntry = i => {
    const d = getDraft();
    if(!d.cooldownEntries[i]) return;
    d.cooldownEntries[i].done = !d.cooldownEntries[i].done;
    save(); renderToday();
  };
  window.toggleCooldownDone = () => {
    const d = getDraft(); d.cooldownDone = !d.cooldownDone; save(); renderToday();
  };

  let setupModal = null;
  let setupWarmups = [];
  let setupCooldowns = [];
  let setupWarmupEnabled = true;
  let setupCooldownEnabled = false;
  let setupRest = false;
  let setupDay = 1;

  function ensureSetupModal(){
    if(setupModal) return;
    setupModal = document.createElement('div');
    setupModal.className = 'day-setup-backdrop';
    setupModal.innerHTML = `<div class="day-setup-modal" role="dialog" aria-modal="true" aria-label="Day setup"><div class="day-setup-title"><div><h2 id="daySetupTitle">Day Setup</h2><p>Configure rest days, warm-up cards, and cooldown cards for this day.</p></div><button class="day-setup-close" type="button">×</button></div><div class="day-type-card"><div><b>Day type</b><div class="routine-section-note">Rest days hide the main workout but keep it stored if you switch back later.</div></div><label><input id="dayRestToggle" type="checkbox"> Rest day</label></div><div class="section-config"><div class="section-config-head"><div><h3>🔥 Warm-up</h3><div class="routine-section-note">Turn the section off completely or build the warm-up card list.</div></div><label class="section-toggle"><input id="warmupEnabledToggle" type="checkbox"> Enabled</label></div><div id="warmupSetupList" class="setup-list"></div><div class="setactions"><button class="mini" id="addWarmupSetup" type="button">+ Add warm-up card</button></div></div><div class="section-config"><div class="section-config-head"><div><h3>🧘 Cooldown</h3><div class="routine-section-note">Create one or more cooldown cards with rep or timed tracking.</div></div><label class="section-toggle"><input id="cooldownEnabledToggle" type="checkbox"> Enabled</label></div><div id="cooldownSetupList" class="setup-list"></div><div class="setactions"><button class="mini" id="addCooldownSetup" type="button">+ Add cooldown card</button></div></div><div class="day-setup-footer"><button class="btn" id="daySetupCancel" type="button">Cancel</button><button class="btn good" id="daySetupSave" type="button">Save Day Setup</button></div></div>`;
    document.body.appendChild(setupModal);
    setupModal.querySelector('.day-setup-close').onclick = closeSetup;
    setupModal.querySelector('#daySetupCancel').onclick = closeSetup;
    setupModal.querySelector('#dayRestToggle').onchange = e => { setupRest = e.target.checked; };
    setupModal.querySelector('#warmupEnabledToggle').onchange = e => { setupWarmupEnabled = e.target.checked; renderSetupLists(); };
    setupModal.querySelector('#cooldownEnabledToggle').onchange = e => { setupCooldownEnabled = e.target.checked; renderSetupLists(); };
    setupModal.querySelector('#addWarmupSetup').onclick = () => { setupWarmups.push(['New warm-up','', 'reps']); renderSetupLists(); };
    setupModal.querySelector('#addCooldownSetup').onclick = () => { setupCooldowns.push(['New cooldown','', 'sec']); renderSetupLists(); };
    setupModal.querySelector('#daySetupSave').onclick = saveSetup;
    setupModal.addEventListener('click',e=>{if(e.target===setupModal) closeSetup();});
  }

  function setupItemHtml(kind,item,i,total){
    const type = normalizeEntryType(item[2]);
    return `<div class="setup-item" data-kind="${kind}" data-index="${i}"><div class="setup-num">${i+1}</div><input class="setup-input setup-name" value="${esc(item[0])}" placeholder="Movement / activity"><input class="setup-input setup-target" value="${esc(item[1])}" placeholder="Target / cue"><select class="setup-select setup-type"><option value="reps" ${type==='reps'?'selected':''}>Reps</option><option value="sec" ${type==='sec'?'selected':''}>Seconds</option><option value="min" ${type==='min'?'selected':''}>Minutes</option></select><div class="setup-actions"><button class="setup-mini move-up" type="button" ${i===0?'disabled':''}>↑</button><button class="setup-mini move-down" type="button" ${i===total-1?'disabled':''}>↓</button><button class="setup-mini delete" type="button">Delete</button></div></div>`;
  }

  function bindSetupList(listEl, kind){
    const arr = kind === 'warmup' ? setupWarmups : setupCooldowns;
    listEl.querySelectorAll('.setup-item').forEach(row => {
      const i = Number(row.dataset.index);
      row.querySelector('.setup-name').oninput = e => arr[i][0] = e.target.value;
      row.querySelector('.setup-target').oninput = e => arr[i][1] = e.target.value;
      row.querySelector('.setup-type').onchange = e => arr[i][2] = e.target.value;
      row.querySelector('.move-up').onclick = () => moveSetup(kind,i,-1);
      row.querySelector('.move-down').onclick = () => moveSetup(kind,i,1);
      row.querySelector('.delete').onclick = () => { arr.splice(i,1); renderSetupLists(); };
    });
  }

  function moveSetup(kind,i,dir){
    const arr = kind === 'warmup' ? setupWarmups : setupCooldowns;
    const j = i + dir; if(j < 0 || j >= arr.length) return;
    [arr[i],arr[j]] = [arr[j],arr[i]]; renderSetupLists();
  }

  function renderSetupLists(){
    if(!setupModal) return;
    const warmList = setupModal.querySelector('#warmupSetupList');
    const coolList = setupModal.querySelector('#cooldownSetupList');
    warmList.innerHTML = setupWarmupEnabled ? (setupWarmups.length ? setupWarmups.map((x,i)=>setupItemHtml('warmup',x,i,setupWarmups.length)).join('') : '<div class="routine-section-note">No warm-up cards. Add one or leave the section empty.</div>') : '<div class="routine-section-note">Warm-up is disabled for this day.</div>';
    coolList.innerHTML = setupCooldownEnabled ? (setupCooldowns.length ? setupCooldowns.map((x,i)=>setupItemHtml('cooldown',x,i,setupCooldowns.length)).join('') : '<div class="routine-section-note">No cooldown cards. Add one or leave the section empty.</div>') : '<div class="routine-section-note">Cooldown is disabled for this day.</div>';
    setupModal.querySelector('#addWarmupSetup').disabled = !setupWarmupEnabled;
    setupModal.querySelector('#addCooldownSetup').disabled = !setupCooldownEnabled;
    bindSetupList(warmList,'warmup'); bindSetupList(coolList,'cooldown');
  }

  function openSetup(){
    ensureSetupModal();
    setupDay = state.selectedDay;
    const c = custom(setupDay);
    const inheritedWarmups = typeof warmupsForDayV2 === 'function' ? warmupsForDayV2(setupDay) : [];
    setupWarmupEnabled = c?.warmupEnabled !== false && !((state.routineBlank && !c) || c?.blank === true);
    setupCooldownEnabled = c?.cooldownEnabled === true;
    setupRest = c?.rest === true;
    setupWarmups = clone(Array.isArray(c?.warmups) ? c.warmups : inheritedWarmups || []).map(x=>[String(x?.[0]||''),String(x?.[1]||''),normalizeEntryType(x?.[2])]);
    setupCooldowns = clone(Array.isArray(c?.cooldowns) ? c.cooldowns : []);
    setupModal.querySelector('#daySetupTitle').textContent = `Day Setup — Day ${setupDay}`;
    setupModal.querySelector('#dayRestToggle').checked = setupRest;
    setupModal.querySelector('#warmupEnabledToggle').checked = setupWarmupEnabled;
    setupModal.querySelector('#cooldownEnabledToggle').checked = setupCooldownEnabled;
    renderSetupLists();
    setupModal.classList.add('open'); document.body.style.overflow='hidden';
  }
  window.openDaySetup = openSetup;
  function closeSetup(){if(!setupModal)return;setupModal.classList.remove('open');document.body.style.overflow='';}

  function saveSetup(){
    const c = ensureCustom(setupDay);
    c.rest = !!setupRest;
    c.warmupEnabled = !!setupWarmupEnabled;
    c.cooldownEnabled = !!setupCooldownEnabled;
    c.warmups = setupWarmups.map(x=>[String(x[0]||'').trim(),String(x[1]||'').trim(),normalizeEntryType(x[2])]).filter(x=>x[0]);
    c.cooldowns = setupCooldowns.map(x=>[String(x[0]||'').trim(),String(x[1]||'').trim(),normalizeEntryType(x[2])]).filter(x=>x[0]);
    c.warm = '';
    delete state.drafts?.['d'+setupDay]?.warmupEntries;
    delete state.drafts?.['d'+setupDay]?.cooldownEntries;
    save(); closeSetup(); renderToday(); if(typeof renderHistory==='function') renderHistory();
    if(typeof toast==='function') toast('Day setup updated');
  }

  renderDays = function(){
    const el = document.getElementById('days'); if(!el || typeof PLAN === 'undefined') return;
    el.innerHTML = PLAN.map(p=>{
      const c = custom(p.day);
      const blank = (state.routineBlank && !c) || c?.blank === true;
      const rest = c?.rest === true;
      const name = rest ? 'Rest' : blank ? 'Empty' : (String(c?.name ?? '').trim() || p.name);
      return `<button class="day ${p.day===state.selectedDay?'active':''}" style="--dayColor:${p.color}" onclick="selectDay(${p.day})"><strong>DAY ${p.day}</strong><small>${esc(name)}</small></button>`;
    }).join('');
  };

  const totalsV2 = totals;
  totals = function(){
    const p = selectedPlan();
    if(p?.rest) return {doneSets:0,totalSets:0,reps:0,volume:0,doneEx:0};
    return totalsV2();
  };

  function historyMatchesExercise(ex){
    const id=ex?.[4], name=ex?.[0], out=[];
    for(let i=(state.history||[]).length-1;i>=0;i--){
      const h=state.history[i];
      const found=(h.exercises||[]).find(e=>(id && e.exerciseId===id) || (!e.exerciseId && e.name===name));
      if(found) out.push({history:h,exercise:found});
    }
    return out;
  }
  function setupLabel(item){
    const e=item.exercise, sets=e.sets||[];
    const pieces=sets.slice(0,3).map(s=>window.WorkoutV2?.formatSet?WorkoutV2.formatSet(s,e.type).replace(' ✓',''):String(s.value||''));
    return `${item.history.date} • ${pieces.join(' / ') || e.name}`;
  }

  function historyExerciseFrom(ex,sets){
    const setMode = window.WorkoutV2?.setModeFor || ((exercise,set)=>exercise?.[3] || set?.mode || 'reps');
    return {exerciseId:ex[4],name:ex[0],target:ex[1],type:ex[3],sets:(sets||[]).map(s=>({weight:parseFloat(s.weight)||0,value:parseFloat(s.value)||0,done:!!s.done,mode:setMode(ex,s)}))};
  }

  function sectionHistory(items,entries){
    return items.map((item,i)=>({name:item[0],target:item[1],type:normalizeEntryType(item[2]),weight:parseFloat(entries?.[i]?.weight)||0,value:parseFloat(entries?.[i]?.value)||0,done:!!entries?.[i]?.done}));
  }

  renderToday = function(){
    renderDays();
    const p = selectedPlan(), d = getDraft(), t = totals(), warmups = warmupsForDay(p.day), cooldowns = cooldownsForDay(p.day), html = [];
    const title = p.rest ? `DAY ${p.day} — REST DAY` : p.name ? `DAY ${p.day} — ${esc(p.name)}` : `DAY ${p.day}`;
    html.push(`<div class="hero" style="border-color:${p.color}"><h1>${title}${p.rest?'<span class="rest-badge">RECOVERY</span>':''}</h1><div class="sub">${fmtDate(new Date(d.date+'T12:00:00'))}</div>${p.rest?'':`<div class="stats"><div class="stat"><b>${t.doneEx}/${p.exercises.length}</b><span>Exercises</span></div><div class="stat"><b>${t.doneSets}/${t.totalSets}</b><span>Sets</span></div><div class="stat"><b>${t.reps}</b><span>Reps</span></div><div class="stat"><b>${Math.round(t.volume).toLocaleString()} lb</b><span>Volume</span></div></div>`}<div class="edit-day-row"><button class="btn edit-day-btn" type="button" onclick="openRoutineBuilder()">✏️ ${p.exercises.length||p.name?'Edit Routine':'Create Workout'}</button><button class="btn day-setup-btn" type="button" onclick="openDaySetup()">⚙️ Day Setup</button></div></div>`);

    if(p.rest){html.push(`<div class="rest-day-card"><h2>Rest / Recovery Day</h2><p>No main workout is scheduled. Warm-up, cooldown, and notes can still be used if you enabled them for this day.</p></div>`);}
    else if(!p.exercises.length && !warmups.length && !cooldowns.length){html.push(`<div class="empty-routine"><h3>This day is blank</h3><p>Create a workout or configure the day setup.</p><button class="btn primary" type="button" onclick="openRoutineBuilder()">+ Create Workout</button></div>`);}

    if(warmups.length) html.push(renderTrackedSection('warmup','Warm-up','🔥',warmups,d.warmupEntries,d.warmup,p.warm||''));
    if(!p.rest) p.exercises.forEach((ex,i)=>{
      const type = ex[3];
      const setMode = window.WorkoutV2?.setModeFor || ((exercise,set)=>exercise?.[3]==='mixed'?(set?.mode||'reps'):exercise?.[3]);
      const rows = (d.sets[i]||[]).map((s,j)=>{
        const mode = setMode(ex,s), unit = mode==='sec'?'sec':mode==='min'?'min':'reps';
        const mixed = type==='mixed'?`<select class="mixed-mode" onchange="updateSetMode(${i},${j},this.value)"><option value="reps" ${mode==='reps'?'selected':''}>reps</option><option value="sec" ${mode==='sec'?'selected':''}>sec</option><option value="min" ${mode==='min'?'selected':''}>min</option></select>`:'';
        return `<div class="setrow"><div class="setlabel">Set ${j+1}</div>${mixed}<div class="field"><input inputmode="decimal" placeholder="${mode==='reps'?'weight':'load'}" value="${esc(s.weight)}" oninput="updateSet(${i},${j},'weight',this.value)"><span>lb</span></div><div class="field"><input inputmode="decimal" placeholder="${unit}" value="${esc(s.value)}" oninput="updateSet(${i},${j},'value',this.value)"><span>${unit}</span></div><button class="done ${s.done?'on':''}" onclick="toggleSet(${i},${j})">${s.done?'✓':'○'}</button></div>`;
      }).join('');
      const prior=historyMatchesExercise(ex).slice(0,8), last=prior[0];
      const previous=`<div class="previous-setup"><div class="last-setup-note">${last?`Last setup: ${esc(setupLabel(last))}`:'No saved setup for this progression yet.'}</div>${prior.length?`<div class="previous-setup-row"><select id="prior-${i}">${prior.map((x,k)=>`<option value="${k}">${esc(setupLabel(x))}</option>`).join('')}</select><button class="mini" type="button" onclick="applyPreviousSetup(${i})">Use setup</button></div>`:''}</div>`;
      html.push(`<div class="exercise" style="--dayColor:${p.color}"><div class="exhead"><div class="num">${i+1}</div><div class="exinfo"><h3>${esc(ex[0])}</h3><div class="target">${esc(ex[1])}</div><div class="note">${esc(ex[2])}</div></div></div>${previous}<div class="settable">${rows}<div class="setactions"><button class="mini" onclick="addSet(${i})">+ Add set</button>${(d.sets[i]||[]).length>1?`<button class="mini" onclick="removeSet(${i})">− Remove set</button>`:''}${last?`<button class="mini" onclick="copyPrevious(${i})">Use latest</button>`:''}</div></div></div>`);
    });
    if(cooldowns.length) html.push(renderTrackedSection('cooldown','Cooldown','🧘',cooldowns,d.cooldownEntries,d.cooldownDone));

    html.push(`<div class="bottomgrid"><div class="card"><h3>📝 Notes</h3><textarea placeholder="How did today feel?" oninput="updateNotes(this.value)">${esc(d.notes||'')}</textarea></div></div><div class="toolbar"><button class="btn good" onclick="saveWorkout()">${p.rest?'Save Rest Day':'Save Workout'}</button>${p.rest?'':`<button class="btn primary" onclick="copyCurrent()" ${p.exercises.length?'':'disabled'}>Copy for ChatGPT</button>`}<button class="btn danger" onclick="resetDay()">Reset Day</button></div>`);
    const root = document.getElementById('todayContent'); if(root) root.innerHTML = html.join('');
    save();
  };

  window.saveWorkout = () => {
    const p = selectedPlan(), d = getDraft(), t = totals(), warmups = warmupsForDay(p.day), cooldowns = cooldownsForDay(p.day);
    if(!p.rest && !p.exercises.length){toast('Create a workout first');return;}
    const entry = {id:Date.now(),date:d.date,day:p.day,name:p.rest?'Rest Day':(p.name||`Day ${p.day}`),rest:!!p.rest,warmup:d.warmup,notes:d.notes||'',volume:t.volume,reps:t.reps,warmupEntries:sectionHistory(warmups,d.warmupEntries),cooldownDone:!!d.cooldownDone,cooldownEntries:sectionHistory(cooldowns,d.cooldownEntries),exercises:p.rest?[]:p.exercises.map((ex,i)=>historyExerciseFrom(ex,d.sets[i]))};
    state.history.push(entry); save(); if(typeof renderHistory==='function') renderHistory(); if(typeof renderProgress==='function') renderProgress(); toast(p.rest?'Rest day saved':'Workout saved');
  };

  summaryText = function(h){
    if(!h) return 'No saved workouts yet.';
    const lines = [`${h.date} — Day ${h.day}: ${h.rest?'Rest Day':h.name}`];
    if(h.warmupEntries?.length){lines.push('Warm-up:');h.warmupEntries.forEach(e=>lines.push(`- ${e.name}: ${formatSectionEntry(e,e.type)}`));}
    (h.exercises||[]).forEach(e=>lines.push(`${e.name}: ${(e.sets||[]).map(s=>window.WorkoutV2?.formatSet?WorkoutV2.formatSet(s,e.type):`${s.value}`).join(' | ')}`));
    if(h.cooldownEntries?.length){lines.push('Cooldown:');h.cooldownEntries.forEach(e=>lines.push(`- ${e.name}: ${formatSectionEntry(e,e.type)}`));}
    if(h.notes) lines.push(`Notes: ${h.notes}`);
    return lines.join('\n');
  };

  window.copyCurrent = () => {
    const p=selectedPlan(),d=getDraft(),warmups=warmupsForDay(p.day),cooldowns=cooldownsForDay(p.day);
    const h={date:d.date,day:p.day,name:p.rest?'Rest Day':(p.name||`Day ${p.day}`),rest:!!p.rest,warmupEntries:sectionHistory(warmups,d.warmupEntries),cooldownEntries:sectionHistory(cooldowns,d.cooldownEntries),notes:d.notes||'',exercises:p.rest?[]:p.exercises.map((ex,i)=>historyExerciseFrom(ex,d.sets[i]))};
    copyText(summaryText(h));
  };

  renderHistory = function(){
    const el=document.getElementById('historyList'); if(!el) return;
    if(!state.history?.length){el.innerHTML='<div class="card muted">No saved workouts yet.</div>';return;}
    el.innerHTML=[...state.history].reverse().map(h=>`<div class="history-item"><h3>${esc(h.date)} — Day ${h.day}: ${esc(h.rest?'Rest Day':h.name)}</h3><div class="muted">${h.rest?'Recovery day':`${h.reps||0} reps • ${Math.round(h.volume||0).toLocaleString()} lb volume`}</div>${h.warmupEntries?.length?`<div class="history-ex"><b>Warm-up</b><div class="muted">${h.warmupEntries.map(e=>`${esc(e.name)}: ${esc(formatSectionEntry(e,e.type).replace(' ✓',''))}`).join('<br>')}</div></div>`:''}${(h.exercises||[]).map(e=>`<div class="history-ex"><b>${esc(e.name)}</b><div class="muted">${(e.sets||[]).map(s=>esc(window.WorkoutV2?.formatSet?WorkoutV2.formatSet(s,e.type).replace(' ✓',''):String(s.value))).join(' • ')}</div></div>`).join('')}${h.cooldownEntries?.length?`<div class="history-ex"><b>Cooldown</b><div class="muted">${h.cooldownEntries.map(e=>`${esc(e.name)}: ${esc(formatSectionEntry(e,e.type).replace(' ✓',''))}`).join('<br>')}</div></div>`:''}${h.notes?`<div class="history-ex"><b>Notes:</b> ${esc(h.notes)}</div>`:''}<div class="toolbar"><button class="mini" onclick="copyHistory(${h.id})">Copy</button><button class="mini" onclick="deleteHistory(${h.id})">Delete</button></div></div>`).join('');
  };

  document.addEventListener('click',e=>{
    const saveBtn=e.target.closest?.('#editorSave');
    if(!saveBtn) return;
    const before = custom(state.selectedDay);
    const snapshot = before ? {rest:before.rest,warmupEnabled:before.warmupEnabled,cooldownEnabled:before.cooldownEnabled,cooldowns:clone(before.cooldowns||[])} : null;
    setTimeout(()=>{
      if(!snapshot) return;
      const after = ensureCustom(state.selectedDay);
      after.rest = !!snapshot.rest; after.warmupEnabled = snapshot.warmupEnabled !== false; after.cooldownEnabled = !!snapshot.cooldownEnabled; after.cooldowns = clone(snapshot.cooldowns||[]); save();
    },0);
  },true);

  renderToday(); renderHistory();
})();
