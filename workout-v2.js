(() => {
  if(typeof PLAN === 'undefined' || typeof state === 'undefined') return;

  if(!state.customPlans) state.customPlans = {};
  if(!state.exerciseLibrary || typeof state.exerciseLibrary !== 'object') state.exerciseLibrary = {};
  if(typeof state.routineBlank !== 'boolean') state.routineBlank = false;

  const style = document.createElement('style');
  style.textContent = `
    .edit-day-row{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:10px}
    .edit-day-btn{border-color:#36577d!important;background:#13243a!important}
    .custom-badge{font-size:10px;color:#42d38a;margin-left:5px;font-weight:800}
    .empty-routine{padding:22px;text-align:center;border:1px dashed #36506f;border-radius:14px;background:#0a1422;margin:10px 0}
    .empty-routine h3{margin:0 0 6px}.empty-routine p{margin:0 0 12px;color:#99a8bc;font-size:13px}
    .previous-setup{margin:8px 0 0;padding:8px;border:1px solid #243651;background:#0a1422;border-radius:10px}
    .previous-setup-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .previous-setup select{flex:1;min-width:190px;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:8px;padding:7px}
    .last-setup-note{font-size:11px;color:#91a2b8;line-height:1.35}
    .mixed-mode{width:74px;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:8px;padding:8px 5px;font-size:12px}
    .editor-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.68);display:none;align-items:flex-start;justify-content:center;z-index:200;padding:18px 10px;overflow:auto}
    .editor-backdrop.open{display:flex}
    .editor-modal{width:min(820px,100%);background:#0d1827;border:1px solid #2a405f;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:14px;margin:auto}
    .editor-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}
    .editor-head h2{margin:0;font-size:21px}.editor-head p{margin:4px 0 0;color:#99a8bc;font-size:12px}
    .editor-close{border:1px solid #36506f;background:#101d30;color:white;border-radius:9px;width:38px;height:38px;font-size:20px}
    .editor-day-name{display:grid;grid-template-columns:110px 1fr;gap:8px;margin-bottom:12px;padding:10px;border:1px solid #243651;background:#0a1422;border-radius:12px;align-items:center}
    .editor-day-name label,.editor-label{font-size:11px;color:#99a8bc;font-weight:800;text-transform:uppercase;letter-spacing:.4px}
    .editor-day-name small{grid-column:2;color:#7f90a8;font-size:11px;line-height:1.35}
    .editor-list{display:flex;flex-direction:column;gap:10px}
    .editor-item{border:1px solid #243651;background:#0a1422;border-radius:12px;padding:10px}
    .editor-item-top{display:grid;grid-template-columns:36px 1fr 165px;gap:8px;align-items:center}
    .editor-number{height:32px;width:32px;border-radius:50%;display:grid;place-items:center;background:#1e88ff;font-weight:900}
    .editor-input,.editor-select,.editor-note{width:100%;border:1px solid #2b3f5e;background:#091321;color:white;border-radius:9px;padding:9px;outline:none}
    .editor-note{margin-top:8px;min-height:58px;resize:vertical}
    .editor-subrow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px;align-items:center}
    .editor-progress-row{display:grid;grid-template-columns:110px 1fr auto;gap:8px;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #1e2d43}
    .editor-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
    .editor-mini{border:1px solid #2d4565;background:#122035;color:white;border-radius:8px;padding:7px 9px;font-size:12px}
    .editor-mini.delete{color:#ff9dab;border-color:#613040;background:#29141b}
    .editor-footer{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid #243651}
    .editor-footer-group{display:flex;gap:8px;flex-wrap:wrap}
    .editor-help{color:#99a8bc;font-size:12px;margin:8px 0 0;line-height:1.45}
    @media(max-width:620px){
      .editor-item-top{grid-template-columns:34px 1fr}.editor-item-top .editor-select{grid-column:2}
      .editor-subrow,.editor-progress-row,.editor-day-name{grid-template-columns:1fr}.editor-day-name small{grid-column:1}
      .editor-actions{justify-content:flex-start}.editor-modal{padding:12px}
      .mixed-mode{width:68px}.previous-setup select{min-width:150px}
    }
  `;
  document.head.appendChild(style);

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function slug(value){return String(value||'exercise').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'exercise';}
  function newExerciseId(){
    if(globalThis.crypto?.randomUUID) return `ex-${crypto.randomUUID()}`;
    return `ex-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function esc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function defaultPlanForDay(day){return PLAN.find(p=>p.day===day);}
  function baseExerciseId(ex){return `base-${slug(ex?.[0])}`;}
  function knownBaseId(name){
    const needle=String(name||'').trim().toLowerCase();
    for(const p of PLAN){for(const ex of p.exercises){if(String(ex[0]||'').trim().toLowerCase()===needle) return baseExerciseId(ex);}}
    return '';
  }
  function normalizeStyle(value){return ['reps','sec','min','mixed'].includes(value)?value:'reps';}
  function hydrateExercise(ex, day=state.selectedDay, index=0){
    const arr=Array.isArray(ex)?[ex[0],ex[1],ex[2],normalizeStyle(ex[3]),ex[4],ex[5]]:['Exercise','3×8–12','','reps'];
    arr[0]=String(arr[0]||'').trim();
    arr[1]=String(arr[1]||'').trim();
    arr[2]=String(arr[2]||'').trim();
    arr[3]=normalizeStyle(arr[3]);
    arr[4]=String(arr[4]||baseExerciseId(arr));
    arr[5]=arr[5]||null;
    registerExercise(arr);
    return arr;
  }
  function cloneExercises(exercises, day=state.selectedDay){return (exercises||[]).map((ex,i)=>hydrateExercise(ex,day,i));}

  function registerExercise(ex){
    const id=String(ex?.[4]||'').trim();
    const name=String(ex?.[0]||'').trim();
    if(!id || !name) return;
    const existing=state.exerciseLibrary[id] || {id,name,aliases:[],lastStyle:normalizeStyle(ex[3])};
    if(existing.name && existing.name!==name && !existing.aliases?.includes(existing.name)){
      existing.aliases=[...(existing.aliases||[]),existing.name];
    }
    existing.name=name;
    existing.lastStyle=normalizeStyle(ex[3]);
    existing.aliases=[...(existing.aliases||[])].filter((x,i,a)=>x && x!==name && a.indexOf(x)===i).slice(-12);
    state.exerciseLibrary[id]=existing;
  }

  function seedLibraryFromHistory(){
    (state.history||[]).forEach(h=>{
      (h.exercises||[]).forEach(ex=>{
        if(!ex.exerciseId) ex.exerciseId=knownBaseId(ex.name)||`legacy-${slug(ex.name)}`;
        const id=ex.exerciseId;
        const current=state.exerciseLibrary[id] || {id,name:ex.name||'Exercise',aliases:[],lastStyle:normalizeStyle(ex.type)};
        if(current.name && ex.name && current.name!==ex.name && !current.aliases.includes(ex.name)) current.aliases.push(ex.name);
        current.lastStyle=normalizeStyle(ex.type || current.lastStyle);
        state.exerciseLibrary[id]=current;
      });
    });
    if(!state.routineBlank) PLAN.forEach(p=>p.exercises.forEach(ex=>registerExercise([...ex,baseExerciseId(ex)])));
  }
  seedLibraryFromHistory();

  function customForDay(day){return state.customPlans?.[day];}
  selectedPlan = function(){
    const day=state.selectedDay;
    const base=defaultPlanForDay(day) || {day,name:'',color:'#248df5',warm:'',exercises:[]};
    const custom=customForDay(day);
    if(custom){
      const blank=custom.blank===true;
      return {
        ...base,
        name:String(custom.name??'').trim(),
        warm:String((custom.warm??(state.routineBlank?'':base.warm))||''),
        exercises:blank?[]:cloneExercises(custom.exercises||[],day),
        blank
      };
    }
    if(state.routineBlank){return {...base,name:'',warm:'',exercises:[],blank:true};}
    return {...base,exercises:cloneExercises(base.exercises,day),blank:false};
  };

  const baseWarmupsForDay=warmupsForDay;
  warmupsForDay=function(day){
    const custom=customForDay(day);
    if(custom && Array.isArray(custom.warmups)) return clone(custom.warmups);
    if((state.routineBlank && !custom) || custom?.blank) return [];
    return baseWarmupsForDay(day);
  };

  renderDays=function(){
    const el=document.getElementById('days'); if(!el) return;
    el.innerHTML=PLAN.map(p=>{
      const custom=customForDay(p.day);
      const blank=(state.routineBlank && !custom)||custom?.blank===true;
      const name=blank?'Empty':(String(custom?.name??'').trim() || p.name);
      return `<button class="day ${p.day===state.selectedDay?'active':''}" style="--dayColor:${p.color}" onclick="selectDay(${p.day})"><strong>DAY ${p.day}</strong><small>${esc(name)}</small></button>`;
    }).join('');
  };

  getDraft=function(){
    const p=selectedPlan(), key='d'+state.selectedDay, warmups=warmupsForDay(p.day);
    if(!state.drafts) state.drafts={};
    if(!state.drafts[key]) state.drafts[key]={date:new Date().toISOString().slice(0,10),notes:'',warmup:false,warmupEntries:[],sets:[]};
    const d=state.drafts[key];
    if(!Array.isArray(d.warmupEntries)) d.warmupEntries=[];
    while(d.warmupEntries.length<warmups.length) d.warmupEntries.push({weight:'',value:'',done:false});
    if(d.warmupEntries.length>warmups.length) d.warmupEntries=d.warmupEntries.slice(0,warmups.length);
    if(!Array.isArray(d.sets)) d.sets=[];
    while(d.sets.length<p.exercises.length) d.sets.push(Array.from({length:3},()=>({weight:'',value:'',done:false,mode:'reps'})));
    if(d.sets.length>p.exercises.length) d.sets=d.sets.slice(0,p.exercises.length);
    d.sets.forEach((sets,i)=>{
      if(!Array.isArray(sets)) d.sets[i]=[];
      d.sets[i].forEach(s=>{if(!s.mode) s.mode=p.exercises[i]?.[3]==='mixed'?'reps':normalizeStyle(p.exercises[i]?.[3]);});
    });
    return d;
  };

  function setModeFor(ex,set){
    const style=normalizeStyle(ex?.[3]);
    if(style==='mixed') return ['reps','sec','min'].includes(set?.mode)?set.mode:'reps';
    return style;
  }
  function secondsFromSet(set,style){
    const v=parseFloat(set?.value)||0;
    const mode=style==='mixed'?setModeFor([null,null,null,'mixed'],set):style;
    return mode==='min'?v*60:mode==='sec'?v:0;
  }
  function formatValue(v){
    const n=Number(v||0); return Number.isInteger(n)?String(n):String(Math.round(n*100)/100);
  }
  function formatSet(set,exerciseType='reps'){
    const mode=exerciseType==='mixed'?setModeFor([null,null,null,'mixed'],set):normalizeStyle(exerciseType);
    const weight=Number(set?.weight||0), value=Number(set?.value||0);
    const prefix=weight?`${formatValue(weight)} lb × `:'';
    if(mode==='sec') return `${prefix}${formatValue(value)} sec${set?.done?' ✓':''}`;
    if(mode==='min') return `${prefix}${formatValue(value)} min${set?.done?' ✓':''}`;
    return `${prefix}${formatValue(value)} reps${set?.done?' ✓':''}`;
  }
  window.WorkoutV2={formatSet,setModeFor,secondsFromSet};

  totals=function(){
    const p=selectedPlan(),d=getDraft(); let doneSets=0,totalSets=0,reps=0,volume=0,doneEx=0;
    d.sets.forEach((sets,i)=>{
      let exDone=sets.length>0;
      sets.forEach(s=>{
        totalSets++; if(s.done) doneSets++; else exDone=false;
        const mode=setModeFor(p.exercises[i],s),v=parseFloat(s.value)||0,w=parseFloat(s.weight)||0;
        if(mode==='reps'){reps+=v;volume+=v*w;}
      });
      if(exDone) doneEx++;
    });
    return {doneSets,totalSets,reps,volume,doneEx};
  };

  function historyMatchesExercise(ex){
    const id=ex?.[4],name=ex?.[0];
    const out=[];
    for(let i=(state.history||[]).length-1;i>=0;i--){
      const h=state.history[i];
      const found=(h.exercises||[]).find(e=>(id && e.exerciseId===id) || (!e.exerciseId && e.name===name));
      if(found) out.push({history:h,exercise:found});
    }
    return out;
  }
  function setupLabel(item){
    const e=item.exercise, sets=e.sets||[];
    const pieces=sets.slice(0,3).map(s=>formatSet(s,e.type).replace(' ✓',''));
    return `${item.history.date} • ${pieces.join(' / ') || e.name}`;
  }

  function renderExerciseCard(ex,i,d,p){
    const prior=historyMatchesExercise(ex).slice(0,8);
    const last=prior[0];
    const setRows=d.sets[i].map((s,j)=>{
      const mode=setModeFor(ex,s);
      const unit=mode==='sec'?'sec':mode==='min'?'min':'reps';
      const mixed=ex[3]==='mixed'?`<select class="mixed-mode" onchange="updateSetMode(${i},${j},this.value)"><option value="reps" ${mode==='reps'?'selected':''}>reps</option><option value="sec" ${mode==='sec'?'selected':''}>sec</option><option value="min" ${mode==='min'?'selected':''}>min</option></select>`:'';
      return `<div class="setrow"><div class="setlabel">Set ${j+1}</div>${mixed}<div class="field"><input inputmode="decimal" placeholder="${mode==='reps'?'weight':'load'}" value="${esc(s.weight)}" oninput="updateSet(${i},${j},'weight',this.value)"><span>lb</span></div><div class="field"><input inputmode="decimal" placeholder="${unit}" value="${esc(s.value)}" oninput="updateSet(${i},${j},'value',this.value)"><span>${unit}</span></div><button class="done ${s.done?'on':''}" onclick="toggleSet(${i},${j})">${s.done?'✓':'○'}</button></div>`;
    }).join('');
    const prev=`<div class="previous-setup"><div class="last-setup-note">${last?`Last setup: ${esc(setupLabel(last))}`:'No saved setup for this progression yet.'}</div>${prior.length?`<div class="previous-setup-row"><select id="prior-${i}">${prior.map((x,k)=>`<option value="${k}">${esc(setupLabel(x))}</option>`).join('')}</select><button class="mini" type="button" onclick="applyPreviousSetup(${i})">Use setup</button></div>`:''}</div>`;
    return `<div class="exercise" style="--dayColor:${p.color}"><div class="exhead"><div class="num">${i+1}</div><div class="exinfo"><h3>${esc(ex[0])}</h3><div class="target">${esc(ex[1])}</div><div class="note">${esc(ex[2])}</div></div></div>${prev}<div class="settable">${setRows}<div class="setactions"><button class="mini" onclick="addSet(${i})">+ Add set</button>${d.sets[i].length>1?`<button class="mini" onclick="removeSet(${i})">− Remove set</button>`:''}${last?`<button class="mini" onclick="copyPrevious(${i})">Use latest</button>`:''}</div></div></div>`;
  }

  renderToday=function(){
    renderDays();
    const p=selectedPlan(),d=getDraft(),t=totals(),warmups=warmupsForDay(p.day),html=[];
    const title=p.name?`DAY ${p.day} — ${esc(p.name)}`:`DAY ${p.day}`;
    html.push(`<div class="hero" style="border-color:${p.color}"><h1>${title}</h1><div class="sub">${fmtDate(new Date(d.date+'T12:00:00'))}</div><div class="stats"><div class="stat"><b>${t.doneEx}/${p.exercises.length}</b><span>Exercises</span></div><div class="stat"><b>${t.doneSets}/${t.totalSets}</b><span>Sets</span></div><div class="stat"><b>${t.reps}</b><span>Reps</span></div><div class="stat"><b>${Math.round(t.volume).toLocaleString()} lb</b><span>Volume</span></div></div><div class="edit-day-row"><button class="btn edit-day-btn" type="button" onclick="openRoutineBuilder()">✏️ ${p.exercises.length||p.name?'Edit Routine':'Create Workout'}${customForDay(p.day)?'<span class="custom-badge">CUSTOM</span>':''}</button></div></div>`);
    if(!p.exercises.length && !warmups.length){html.push(`<div class="empty-routine"><h3>This day is blank</h3><p>Create the workout from scratch for this profile.</p><button class="btn primary" type="button" onclick="openRoutineBuilder()">+ Create Workout</button></div>`);}
    if(warmups.length){
      html.push(`<div class="warmup"><b>🔥 Warm-up</b><div>${esc(p.warm||'')}</div><div class="spacer"></div>`);
      warmups.forEach((w,i)=>{const entry=d.warmupEntries[i],type=w[2];html.push(`<div class="history-ex"><b>${esc(w[0])}</b><div class="muted">${esc(w[1])}</div><div class="setrow"><div class="setlabel">Warm</div><div class="field"><input inputmode="decimal" placeholder="weight" value="${esc(entry.weight)}" oninput="updateWarmup(${i},'weight',this.value)"><span>lb</span></div><div class="field"><input inputmode="decimal" placeholder="${type==='sec'?'seconds':'reps'}" value="${esc(entry.value)}" oninput="updateWarmup(${i},'value',this.value)"><span>${type==='sec'?'sec':'reps'}</span></div><button class="done ${entry.done?'on':''}" onclick="toggleWarmupEntry(${i})">${entry.done?'✓':'○'}</button></div></div>`);});
      html.push(`<div class="setactions"><button class="mini" onclick="toggleWarmup()">${d.warmup?'✓ Warm-up done':'Mark warm-up done'}</button></div></div>`);
    }
    p.exercises.forEach((ex,i)=>html.push(renderExerciseCard(ex,i,d,p)));
    html.push(`<div class="bottomgrid"><div class="card"><h3>⏱ Rest timer</h3><div id="timer" class="timer">${formatTimer(timerLeft)}</div><div class="toolbar"><button class="btn good" onclick="startTimer()">Start</button><button class="btn" onclick="resetTimer()">Reset</button></div><div class="toolbar">${[30,45,60,90].map(n=>`<button class="mini" onclick="setTimer(${n})">${n}s</button>`).join('')}</div></div><div class="card"><h3>📝 Notes</h3><textarea placeholder="How did today feel?" oninput="updateNotes(this.value)">${esc(d.notes||'')}</textarea></div></div><div class="toolbar"><button class="btn good" onclick="saveWorkout()" ${p.exercises.length?'':'disabled'}>Save Workout</button><button class="btn primary" onclick="copyCurrent()" ${p.exercises.length?'':'disabled'}>Copy for ChatGPT</button><button class="btn danger" onclick="resetDay()">Reset Day</button></div>`);
    document.getElementById('todayContent').innerHTML=html.join(''); save();
  };

  window.updateSetMode=(i,j,mode)=>{const d=getDraft();if(d.sets?.[i]?.[j]){d.sets[i][j].mode=['reps','sec','min'].includes(mode)?mode:'reps';save();renderToday();}};
  window.addSet=(i)=>{const ex=selectedPlan().exercises[i];getDraft().sets[i].push({weight:'',value:'',done:false,mode:ex?.[3]==='mixed'?'reps':normalizeStyle(ex?.[3])});save();renderToday();};
  window.applyPreviousSetup=(i)=>{const ex=selectedPlan().exercises[i],prior=historyMatchesExercise(ex).slice(0,8),sel=document.getElementById(`prior-${i}`),idx=parseInt(sel?.value||'0',10),item=prior[idx];if(!item)return;getDraft().sets[i]=(item.exercise.sets||[]).map(s=>({weight:String(s.weight??''),value:String(s.value??''),done:false,mode:s.mode||normalizeStyle(item.exercise.type)}));save();renderToday();toast('Previous setup loaded');};
  window.copyPrevious=(i)=>{const ex=selectedPlan().exercises[i],last=historyMatchesExercise(ex)[0];if(!last){toast('No previous workout found');return;}getDraft().sets[i]=(last.exercise.sets||[]).map(s=>({weight:String(s.weight??''),value:String(s.value??''),done:false,mode:s.mode||normalizeStyle(last.exercise.type)}));save();renderToday();toast('Latest setup loaded');};

  function historyExerciseFrom(ex,sets){return {exerciseId:ex[4],name:ex[0],target:ex[1],type:normalizeStyle(ex[3]),sets:sets.map(s=>({weight:parseFloat(s.weight)||0,value:parseFloat(s.value)||0,done:!!s.done,mode:setModeFor(ex,s)}))};}
  window.saveWorkout=()=>{
    const p=selectedPlan(),d=getDraft(),t=totals(),warmups=warmupsForDay(p.day);
    if(!p.exercises.length){toast('Create a workout first');return;}
    const entry={id:Date.now(),date:d.date,day:p.day,name:p.name||`Day ${p.day}`,warmup:d.warmup,notes:d.notes||'',volume:t.volume,reps:t.reps,warmupEntries:warmups.map((w,i)=>({name:w[0],target:w[1],type:w[2],weight:parseFloat(d.warmupEntries[i].weight)||0,value:parseFloat(d.warmupEntries[i].value)||0,done:!!d.warmupEntries[i].done})),exercises:p.exercises.map((ex,i)=>historyExerciseFrom(ex,d.sets[i]))};
    state.history.push(entry);save();renderHistory();renderProgress();toast('Workout saved');
  };

  summaryText=function(h){
    if(!h) return 'No saved workouts yet.'; const lines=[`${h.date} — Day ${h.day}: ${h.name}`];
    if(h.warmupEntries?.length){lines.push('Warm-up:');h.warmupEntries.forEach(e=>lines.push(`- ${e.name}: ${formatWarmupEntry(e)}`));} else if(h.warmup){lines.push('Warm-up: complete');}
    (h.exercises||[]).forEach(e=>lines.push(`${e.name}: ${(e.sets||[]).map(s=>formatSet(s,e.type)).join(' | ')}`));
    if(h.cooldown) lines.push(`Cooldown: ${h.cooldown}`); if(h.notes) lines.push(`Notes: ${h.notes}`); return lines.join('\n');
  };
  window.copyCurrent=()=>{
    const p=selectedPlan(),d=getDraft(),warmups=warmupsForDay(p.day),h={date:d.date,day:p.day,name:p.name||`Day ${p.day}`,warmup:d.warmup,cooldown:d.cooldown||'',notes:d.notes||'',warmupEntries:warmups.map((w,i)=>({name:w[0],type:w[2],weight:parseFloat(d.warmupEntries[i].weight)||0,value:parseFloat(d.warmupEntries[i].value)||0,done:d.warmupEntries[i].done})),exercises:p.exercises.map((ex,i)=>historyExerciseFrom(ex,d.sets[i]))};copyText(summaryText(h));
  };

  renderHistory=function(){
    const el=document.getElementById('historyList'); if(!state.history.length){el.innerHTML='<div class="card muted">No saved workouts yet.</div>';return;}
    el.innerHTML=[...state.history].reverse().map(h=>`<div class="history-item"><h3>${esc(h.date)} — Day ${h.day}: ${esc(h.name)}</h3><div class="muted">${h.reps||0} reps • ${Math.round(h.volume||0).toLocaleString()} lb volume</div>${h.warmupEntries?.length?`<div class="history-ex"><b>Warm-up</b><div class="muted">${h.warmupEntries.map(e=>`${esc(e.name)}: ${esc(formatWarmupEntry(e))}`).join('<br>')}</div></div>`:(h.warmup?'<div class="history-ex"><b>Warm-up</b><div class="muted">Complete</div></div>':'')}${(h.exercises||[]).map(e=>`<div class="history-ex"><b>${esc(e.name)}</b><div class="muted">${(e.sets||[]).map(s=>esc(formatSet(s,e.type).replace(' ✓',''))).join(' • ')}</div></div>`).join('')}${h.cooldown?`<div class="history-ex history-cooldown"><b>Cooldown:</b> ${esc(h.cooldown)}</div>`:''}${h.notes?`<div class="history-ex"><b>Notes:</b> ${esc(h.notes)}</div>`:''}<div class="toolbar"><button class="mini" onclick="copyHistory(${h.id})">Copy</button><button class="mini" onclick="deleteHistory(${h.id})">Delete</button></div></div>`).join('');
  };

  renderProgress=function(){
    const by={};
    (state.history||[]).forEach(h=>(h.exercises||[]).forEach(e=>{
      const key=e.exerciseId||`legacy-${slug(e.name)}`; if(!by[key]) by[key]={name:e.name,maxWeight:0,maxReps:0,maxSeconds:0,volume:0,sessions:0};
      const o=by[key];o.name=e.name||o.name;o.sessions++;
      (e.sets||[]).forEach(s=>{const mode=e.type==='mixed'?(s.mode||'reps'):normalizeStyle(e.type),w=Number(s.weight||0),v=Number(s.value||0);o.maxWeight=Math.max(o.maxWeight,w);if(mode==='reps'){o.maxReps=Math.max(o.maxReps,v);o.volume+=w*v;}else{o.maxSeconds=Math.max(o.maxSeconds,mode==='min'?v*60:v);}});
    }));
    const el=document.getElementById('progressGrid'),keys=Object.keys(by); if(!keys.length){el.innerHTML='<div class="card muted">Save some workouts to build progress stats.</div>';return;}
    el.innerHTML=keys.map(k=>{const o=by[k],big=o.maxWeight?`${formatValue(o.maxWeight)} lb`:o.maxReps?`${formatValue(o.maxReps)} reps`:o.maxSeconds?`${formatValue(o.maxSeconds)} sec`:'—',details=[];if(o.maxReps)details.push(`Best reps ${formatValue(o.maxReps)}`);if(o.maxSeconds)details.push(`Best hold ${formatValue(o.maxSeconds)} sec`);details.push(`${o.sessions} saved session${o.sessions===1?'':'s'}`);if(o.volume)details.push(`${Math.round(o.volume).toLocaleString()} lb total volume`);return `<div class="pr"><h4>${esc(o.name)}</h4><div class="big">${big}</div><div class="muted">${details.join(' • ')}</div></div>`;}).join('');
  };

  let modal=null,working=[],workingName='',editingDay=null,originalExercises=[];
  function libraryOptions(selectedId){
    const items=Object.values(state.exerciseLibrary||{}).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    return `<option value="">— New progression —</option>${items.map(x=>`<option value="${esc(x.id)}" ${x.id===selectedId?'selected':''}>${esc(x.name)}${x.aliases?.length?` (${esc(x.aliases.slice(-2).join(', '))})`:''}</option>`).join('')}`;
  }
  function ensureModal(){
    if(modal)return;
    modal=document.createElement('div');modal.className='editor-backdrop';modal.innerHTML=`<div class="editor-modal" role="dialog" aria-modal="true" aria-label="Routine builder"><div class="editor-head"><div><h2 id="editorTitle">Routine Builder</h2><p>Create or edit the workout, entry style, and progression identity for this day.</p></div><button class="editor-close" type="button" id="editorClose">×</button></div><div class="editor-day-name"><label for="editorDayName">Workout title</label><input class="editor-input" id="editorDayName" maxlength="80" placeholder="e.g. Push + Core"><small>Leave blank if you only want the day number shown.</small></div><div id="editorList" class="editor-list"></div><p class="editor-help"><b>Progression record</b> keeps progress connected even if you rename an exercise. Choose a previous exercise to continue its history, or choose <b>New progression</b> to intentionally start fresh. Mixed entry lets every set switch between reps, seconds, or minutes.</p><div class="editor-footer"><div class="editor-footer-group"><button class="btn" type="button" id="editorAdd">+ Add Exercise</button><button class="btn danger" type="button" id="editorClear">Clear Day</button></div><div class="editor-footer-group"><button class="btn" type="button" id="editorCancel">Cancel</button><button class="btn good" type="button" id="editorSave">Save Routine</button></div></div></div>`;document.body.appendChild(modal);
    modal.querySelector('#editorClose').onclick=closeEditor;modal.querySelector('#editorCancel').onclick=closeEditor;modal.querySelector('#editorDayName').addEventListener('input',e=>workingName=e.target.value);modal.querySelector('#editorAdd').onclick=()=>{working.push(['New exercise','3×8–12','','reps',newExerciseId(),null]);renderEditorList();};modal.querySelector('#editorSave').onclick=saveEditor;modal.querySelector('#editorClear').onclick=clearDay;modal.addEventListener('click',e=>{if(e.target===modal)closeEditor();});
  }
  function openEditor(){ensureModal();editingDay=state.selectedDay;const current=selectedPlan();originalExercises=cloneExercises(current.exercises,editingDay);working=cloneExercises(current.exercises,editingDay);workingName=current.name||'';modal.querySelector('#editorTitle').textContent=`Routine Builder — Day ${editingDay}`;modal.querySelector('#editorDayName').value=workingName;renderEditorList();modal.classList.add('open');document.body.style.overflow='hidden';}
  window.openRoutineBuilder=openEditor;
  function closeEditor(){if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';}
  function renderEditorList(){
    const list=modal.querySelector('#editorList');
    list.innerHTML=working.length?working.map((ex,i)=>`<div class="editor-item" data-index="${i}"><div class="editor-item-top"><div class="editor-number">${i+1}</div><input class="editor-input" data-field="name" data-index="${i}" value="${esc(ex[0])}" placeholder="Exercise name"><select class="editor-select" data-field="type" data-index="${i}"><option value="reps" ${ex[3]==='reps'?'selected':''}>Reps</option><option value="sec" ${ex[3]==='sec'?'selected':''}>Timed — seconds</option><option value="min" ${ex[3]==='min'?'selected':''}>Timed — minutes</option><option value="mixed" ${ex[3]==='mixed'?'selected':''}>Mixed — per set</option></select></div><div class="editor-subrow"><input class="editor-input" data-field="target" data-index="${i}" value="${esc(ex[1])}" placeholder="Target, e.g. 3×8–12 or 3×1 min"><div class="editor-actions"><button class="editor-mini" type="button" onclick="duplicateEditorExercise(${i})">Duplicate</button><button class="editor-mini" type="button" onclick="moveEditorExercise(${i},-1)" ${i===0?'disabled':''}>↑</button><button class="editor-mini" type="button" onclick="moveEditorExercise(${i},1)" ${i===working.length-1?'disabled':''}>↓</button><button class="editor-mini delete" type="button" onclick="deleteEditorExercise(${i})">Delete</button></div></div><div class="editor-progress-row"><span class="editor-label">Progression</span><select class="editor-select progression-select" data-index="${i}">${libraryOptions(ex[4])}</select><button class="editor-mini" type="button" onclick="newEditorProgression(${i})">New</button></div><textarea class="editor-note" data-field="note" data-index="${i}" placeholder="Exercise cue / notes">${esc(ex[2])}</textarea></div>`).join(''):`<div class="empty-routine"><h3>No exercises yet</h3><p>Add the first exercise to build this workout.</p></div>`;
    list.querySelectorAll('[data-field]').forEach(el=>{const update=()=>{const i=Number(el.dataset.index),pos={name:0,target:1,note:2,type:3}[el.dataset.field];working[i][pos]=el.value;};el.addEventListener('input',update);el.addEventListener('change',update);});
    list.querySelectorAll('.progression-select').forEach(el=>el.addEventListener('change',()=>{const i=Number(el.dataset.index),id=el.value;if(!id){working[i][4]=newExerciseId();return;}const lib=state.exerciseLibrary[id];working[i][4]=id;if(lib){if(!working[i][0]||working[i][0]==='New exercise')working[i][0]=lib.name;if(lib.lastStyle)working[i][3]=normalizeStyle(lib.lastStyle);}renderEditorList();}));
  }
  window.moveEditorExercise=(i,dir)=>{const j=i+dir;if(j<0||j>=working.length)return;[working[i],working[j]]=[working[j],working[i]];renderEditorList();};
  window.deleteEditorExercise=i=>{working.splice(i,1);renderEditorList();};
  window.duplicateEditorExercise=i=>{const copy=hydrateExercise(clone(working[i]),editingDay,working.length);copy[4]=newExerciseId();copy[0]=`${copy[0]} Copy`;working.splice(i+1,0,copy);renderEditorList();};
  window.newEditorProgression=i=>{working[i][4]=newExerciseId();renderEditorList();};
  function remapDraftSets(day,oldExercises,newExercises){const draft=state.drafts?.['d'+day];if(!draft?.sets)return;const buckets=new Map();oldExercises.forEach((ex,i)=>{const id=ex[4]||ex[0];if(!buckets.has(id))buckets.set(id,[]);buckets.get(id).push(draft.sets[i]);});draft.sets=newExercises.map(ex=>{const q=buckets.get(ex[4]||ex[0]);if(q?.length){const found=q.shift();if(Array.isArray(found))return found;}return Array.from({length:3},()=>({weight:'',value:'',done:false,mode:ex[3]==='mixed'?'reps':normalizeStyle(ex[3])}));});}
  function saveEditor(){
    working=working.map((ex,i)=>{const x=hydrateExercise(ex,editingDay,i);x[0]=String(x[0]||'').trim();x[1]=String(x[1]||'').trim()||(x[3]==='sec'?'3×30 sec':x[3]==='min'?'3×1 min':x[3]==='mixed'?'3 sets':'3×8–12');x[2]=String(x[2]||'').trim();x[3]=normalizeStyle(x[3]);if(!x[4])x[4]=newExerciseId();return x;});
    if(working.some(ex=>!ex[0])){alert('Every exercise needs a name.');return;}
    working.forEach(registerExercise);remapDraftSets(editingDay,originalExercises,working);state.customPlans[editingDay]={name:String(workingName||'').trim(),warm:(customForDay(editingDay)?.warm??(state.routineBlank?'':(defaultPlanForDay(editingDay)?.warm||''))),warmups:Array.isArray(customForDay(editingDay)?.warmups)?clone(customForDay(editingDay).warmups):(state.routineBlank?[]:clone(WARMUPS[editingDay]||[])),exercises:clone(working),blank:false,exercisesUpdatedAt:Date.now(),sectionsUpdatedAt:Number(customForDay(editingDay)?.sectionsUpdatedAt||0)};save();closeEditor();renderToday();renderProgress();toast('Routine updated');
  }
  function clearDay(){if(!confirm(`Clear Day ${editingDay}? Saved workout history will stay unchanged.`))return;delete state.drafts?.['d'+editingDay];state.customPlans[editingDay]={name:'',warm:'',warmups:[],cooldowns:[],exercises:[],blank:true,exercisesUpdatedAt:Date.now(),sectionsUpdatedAt:Date.now()};save();closeEditor();renderToday();toast('Day cleared');}

  renderToday();renderHistory();renderProgress();
})();
