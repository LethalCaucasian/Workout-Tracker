(() => {
  if(typeof state==='undefined') return;

  const clone=v=>JSON.parse(JSON.stringify(v));
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const normType=v=>['reps','sec','min'].includes(v)?v:'reps';
  const dayKey=day=>String(Number(day)||1);
  const newSectionId=()=>window.WorkoutSectionIds?.newId?.() || `section-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const style=document.createElement('style');
  style.textContent=`
    .day-setup-btn{display:none!important}
    .unified-day-setup{margin:12px 0;padding:12px;border:1px solid #2a405f;border-radius:12px;background:#0a1422}
    .unified-day-setup h3{margin:0 0 4px}.unified-note{font-size:11px;color:#91a2b8;line-height:1.4}
    .unified-flags{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0}.unified-flags label{display:flex;gap:7px;align-items:center;font-size:12px;font-weight:800;color:#c7d3e1}
    .unified-section-block{margin-top:10px;padding-top:10px;border-top:1px solid #1e2d43}.unified-section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px}.unified-section-head b{font-size:13px}
    .unified-section-list{display:flex;flex-direction:column;gap:7px}.unified-section-row{display:grid;grid-template-columns:30px minmax(145px,1.3fr) minmax(120px,.8fr) 125px auto;gap:6px;align-items:center;padding:7px;border:1px solid #20314b;border-radius:9px;background:#091321}
    .unified-section-num{height:26px;width:26px;border-radius:50%;display:grid;place-items:center;background:#1e88ff;font-size:11px;font-weight:900}.unified-section-row input,.unified-section-row select,.editor-defaults-row input{width:100%;border:1px solid #2b3f5e;background:#07111e;color:#fff;border-radius:8px;padding:7px;outline:none}.unified-row-actions{display:flex;gap:4px}.unified-row-actions button{border:1px solid #2d4565;background:#122035;color:#fff;border-radius:7px;padding:6px 7px;font-size:11px}.unified-row-actions .delete{color:#ff9dab;border-color:#613040;background:#29141b}
    .editor-defaults-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:8px;padding-top:8px;border-top:1px solid #1e2d43}.editor-default-field{display:flex;flex-direction:column;gap:4px}.editor-default-field label{font-size:10px;color:#91a2b8;font-weight:900;text-transform:uppercase;letter-spacing:.35px}
    .preferred-rest-btn{border-color:#456483!important;color:#bcd4ef!important}
    .history-edit-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.edit-history-banner{margin:0 0 10px;padding:10px 12px;border:1px solid #4d6741;background:#142211;border-radius:11px;color:#d8efcf;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
    @media(max-width:760px){.unified-section-row{grid-template-columns:28px 1fr}.unified-section-row .u-target,.unified-section-row .u-type,.unified-row-actions{grid-column:2}.editor-defaults-row{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  function customFor(day){return state.customPlans?.[day]||null;}
  function ensureCustom(day){
    if(!state.customPlans || typeof state.customPlans!=='object') state.customPlans={};
    if(!state.customPlans[day]){
      const p=typeof selectedPlan==='function'?selectedPlan():null;
      state.customPlans[day]={name:p?.name||'',warm:'',warmups:[],exercises:clone(p?.exercises||[]),blank:false};
    }
    return state.customPlans[day];
  }
  function idsFor(kind,items,day){
    if(window.WorkoutSectionIds?.list) return WorkoutSectionIds.list(kind,items,dayKey(day));
    if(!state.sectionItemIds || typeof state.sectionItemIds!=='object') state.sectionItemIds={warmup:{},cooldown:{}};
    if(!state.sectionItemIds[kind]) state.sectionItemIds[kind]={};
    const key=dayKey(day);
    if(!Array.isArray(state.sectionItemIds[kind][key])) state.sectionItemIds[kind][key]=[];
    const ids=state.sectionItemIds[kind][key];
    while(ids.length<items.length) ids.push(newSectionId());
    if(ids.length>items.length) ids.length=items.length;
    return [...ids];
  }
  function setIds(kind,ids,day){
    if(window.WorkoutSectionIds?.setList) WorkoutSectionIds.setList(kind,ids,dayKey(day));
    else {
      if(!state.sectionItemIds || typeof state.sectionItemIds!=='object') state.sectionItemIds={warmup:{},cooldown:{}};
      if(!state.sectionItemIds[kind]) state.sectionItemIds[kind]={};
      state.sectionItemIds[kind][dayKey(day)]=[...ids];
    }
  }

  let sectionDraft=null;
  let exerciseMetaDraft=new Map();
  let applyingEditor=false;

  function normalizeItems(items){return (items||[]).map(x=>[String(x?.[0]||''),String(x?.[1]||''),normType(x?.[2])]);}
  function prepareSectionDraft(day){
    const c=customFor(day);
    let warmups=Array.isArray(c?.warmups)?normalizeItems(c.warmups):[];
    if(!c && typeof warmupsForDay==='function') warmups=normalizeItems(warmupsForDay(day)||[]);
    const cooldowns=Array.isArray(c?.cooldowns)?normalizeItems(c.cooldowns):[];
    const warmupEnabled=c?.warmupEnabled!==false && !((state.routineBlank && !c)||c?.blank===true);
    sectionDraft={
      day,
      rest:c?.rest===true,
      warmupEnabled,
      cooldownEnabled:c?.cooldownEnabled===true,
      warmups,
      cooldowns,
      warmupIds:idsFor('warmup',warmups,day),
      cooldownIds:idsFor('cooldown',cooldowns,day)
    };
    sectionDraft.originalWarmupIds=[...sectionDraft.warmupIds];
    sectionDraft.originalCooldownIds=[...sectionDraft.cooldownIds];
    exerciseMetaDraft=new Map();
  }

  function sectionRows(kind){
    if(!sectionDraft) return '';
    const arr=kind==='warmup'?sectionDraft.warmups:sectionDraft.cooldowns;
    const ids=kind==='warmup'?sectionDraft.warmupIds:sectionDraft.cooldownIds;
    if(!arr.length) return `<div class="unified-note">No ${kind==='warmup'?'warm-up':'cooldown'} cards yet.</div>`;
    return arr.map((item,i)=>`<div class="unified-section-row" data-u-kind="${kind}" data-u-index="${i}" data-section-id="${esc(ids[i]||'')}"><div class="unified-section-num">${i+1}</div><input class="u-name" value="${esc(item[0])}" placeholder="Activity"><input class="u-target" value="${esc(item[1])}" placeholder="Target / cue"><select class="u-type"><option value="reps" ${item[2]==='reps'?'selected':''}>Reps</option><option value="sec" ${item[2]==='sec'?'selected':''}>Seconds</option><option value="min" ${item[2]==='min'?'selected':''}>Minutes</option></select><div class="unified-row-actions"><button type="button" data-u-action="up" ${i===0?'disabled':''}>↑</button><button type="button" data-u-action="down" ${i===arr.length-1?'disabled':''}>↓</button><button class="delete" type="button" data-u-action="delete">Delete</button></div></div>`).join('');
  }

  function renderUnifiedLists(card){
    if(!card||!sectionDraft) return;
    const warm=card.querySelector('[data-u-list="warmup"]'), cool=card.querySelector('[data-u-list="cooldown"]');
    if(warm) warm.innerHTML=sectionDraft.warmupEnabled?sectionRows('warmup'):'<div class="unified-note">Warm-up disabled for this day.</div>';
    if(cool) cool.innerHTML=sectionDraft.cooldownEnabled?sectionRows('cooldown'):'<div class="unified-note">Cooldown disabled for this day.</div>';
    card.querySelector('[data-u-add="warmup"]')?.toggleAttribute('disabled',!sectionDraft.warmupEnabled);
    card.querySelector('[data-u-add="cooldown"]')?.toggleAttribute('disabled',!sectionDraft.cooldownEnabled);
    bindUnifiedRows(card);
  }

  function bindUnifiedRows(card){
    card.querySelectorAll('.unified-section-row').forEach(row=>{
      const kind=row.dataset.uKind, i=Number(row.dataset.uIndex), arr=kind==='warmup'?sectionDraft.warmups:sectionDraft.cooldowns;
      row.querySelector('.u-name').oninput=e=>arr[i][0]=e.target.value;
      row.querySelector('.u-target').oninput=e=>arr[i][1]=e.target.value;
      row.querySelector('.u-type').onchange=e=>arr[i][2]=normType(e.target.value);
      row.querySelectorAll('[data-u-action]').forEach(btn=>btn.onclick=()=>{
        const action=btn.dataset.uAction, ids=kind==='warmup'?sectionDraft.warmupIds:sectionDraft.cooldownIds;
        if(action==='delete'){arr.splice(i,1);ids.splice(i,1);renderUnifiedLists(card);return;}
        const j=i+(action==='up'?-1:1);if(j<0||j>=arr.length)return;
        [arr[i],arr[j]]=[arr[j],arr[i]];[ids[i],ids[j]]=[ids[j],ids[i]];renderUnifiedLists(card);
      });
    });
  }

  function injectUnifiedDaySetup(modal){
    if(!modal||!sectionDraft) return;
    let card=modal.querySelector('#unifiedDaySetup');
    if(!card){
      card=document.createElement('div');card.id='unifiedDaySetup';card.className='unified-day-setup';
      card.innerHTML=`<h3>⚙️ Day Setup</h3><div class="unified-note">Routine, rest day, warm-up, cooldown, and exercise defaults can all be edited here.</div><div class="unified-flags"><label><input type="checkbox" id="uRest"> Rest day</label></div><div class="unified-section-block"><div class="unified-section-head"><b>🔥 Warm-up</b><label><input type="checkbox" id="uWarmEnabled"> Enabled</label></div><div class="unified-section-list" data-u-list="warmup"></div><div class="setactions"><button class="mini" type="button" data-u-add="warmup">+ Add warm-up card</button></div></div><div class="unified-section-block"><div class="unified-section-head"><b>🧘 Cooldown</b><label><input type="checkbox" id="uCoolEnabled"> Enabled</label></div><div class="unified-section-list" data-u-list="cooldown"></div><div class="setactions"><button class="mini" type="button" data-u-add="cooldown">+ Add cooldown card</button></div></div>`;
      const name=modal.querySelector('.editor-day-name');
      if(name) name.insertAdjacentElement('afterend',card); else modal.querySelector('.editor-head')?.insertAdjacentElement('afterend',card);
      card.querySelector('#uRest').onchange=e=>sectionDraft.rest=e.target.checked;
      card.querySelector('#uWarmEnabled').onchange=e=>{sectionDraft.warmupEnabled=e.target.checked;renderUnifiedLists(card);};
      card.querySelector('#uCoolEnabled').onchange=e=>{sectionDraft.cooldownEnabled=e.target.checked;renderUnifiedLists(card);};
      card.querySelector('[data-u-add="warmup"]').onclick=()=>{sectionDraft.warmups.push(['New warm-up','','reps']);sectionDraft.warmupIds.push(newSectionId());renderUnifiedLists(card);};
      card.querySelector('[data-u-add="cooldown"]').onclick=()=>{sectionDraft.cooldowns.push(['New cooldown','','sec']);sectionDraft.cooldownIds.push(newSectionId());renderUnifiedLists(card);};
    }
    card.querySelector('#uRest').checked=!!sectionDraft.rest;
    card.querySelector('#uWarmEnabled').checked=!!sectionDraft.warmupEnabled;
    card.querySelector('#uCoolEnabled').checked=!!sectionDraft.cooldownEnabled;
    renderUnifiedLists(card);
  }

  function metaKey(row,index){return String(row.querySelector('.progression-select')?.value || `row-${index}`);}
  function sourceMeta(key,index){
    const p=typeof selectedPlan==='function'?selectedPlan():null;
    const ex=(p?.exercises||[]).find(x=>String(x?.[4]||'')===key) || p?.exercises?.[index];
    const m=ex?.[5]||{};
    return {sets:Math.max(1,Math.min(30,parseInt(m.sets,10)||3)),restSec:parseInt(m.restSec,10)||0,group:String(m.group||''),rounds:Math.max(1,Math.min(30,parseInt(m.rounds,10)||1))};
  }
  function enhanceExerciseDefaults(modal){
    if(!modal) return;
    modal.querySelectorAll('.editor-item').forEach((row,index)=>{
      const key=metaKey(row,index);
      if(!exerciseMetaDraft.has(key)) exerciseMetaDraft.set(key,sourceMeta(key,index));
      const meta=exerciseMetaDraft.get(key);
      let box=row.querySelector('.editor-defaults-row');
      if(!box){
        box=document.createElement('div');box.className='editor-defaults-row';
        box.innerHTML=`<div class="editor-default-field"><label>Default sets</label><input data-ex-default="sets" inputmode="numeric" type="number" min="1" max="30"></div><div class="editor-default-field"><label>Preferred rest (sec)</label><input data-ex-default="restSec" inputmode="numeric" type="number" min="0" max="600" placeholder="optional"></div><div class="editor-default-field"><label>Circuit group</label><input data-ex-default="group" placeholder="optional"></div><div class="editor-default-field"><label>Rounds</label><input data-ex-default="rounds" inputmode="numeric" type="number" min="1" max="30"></div>`;
        row.appendChild(box);
      }
      box.querySelector('[data-ex-default="sets"]').value=meta.sets||3;
      box.querySelector('[data-ex-default="restSec"]').value=meta.restSec||'';
      box.querySelector('[data-ex-default="group"]').value=meta.group||'';
      box.querySelector('[data-ex-default="rounds"]').value=meta.rounds||1;
      box.querySelectorAll('[data-ex-default]').forEach(input=>input.oninput=()=>{
        const currentKey=metaKey(row,index), current=exerciseMetaDraft.get(currentKey)||sourceMeta(currentKey,index);
        const field=input.dataset.exDefault;
        if(field==='sets') current.sets=Math.max(1,Math.min(30,parseInt(input.value,10)||3));
        else if(field==='restSec') current.restSec=Math.max(0,Math.min(600,parseInt(input.value,10)||0));
        else if(field==='rounds') current.rounds=Math.max(1,Math.min(30,parseInt(input.value,10)||1));
        else current.group=input.value;
        exerciseMetaDraft.set(currentKey,current);
      });
      const prog=row.querySelector('.progression-select');
      if(prog && !prog.dataset.metaBound){
        prog.dataset.metaBound='1';prog.dataset.previousMetaKey=key;
        prog.addEventListener('change',()=>{
          const old=prog.dataset.previousMetaKey, next=String(prog.value||'');
          if(old && next && exerciseMetaDraft.has(old) && !exerciseMetaDraft.has(next)) exerciseMetaDraft.set(next,clone(exerciseMetaDraft.get(old)));
          prog.dataset.previousMetaKey=next;
          setTimeout(()=>enhanceExerciseDefaults(modal),0);
        });
      }
    });
  }

  function enhanceRoutineModal(){
    if(applyingEditor) return;
    const modal=document.querySelector('.editor-backdrop.open .editor-modal');
    if(!modal) return;
    applyingEditor=true;
    try{injectUnifiedDaySetup(modal);enhanceExerciseDefaults(modal);}finally{applyingEditor=false;}
  }

  if(typeof window.openRoutineBuilder==='function'){
    const baseOpenRoutineBuilder=window.openRoutineBuilder;
    window.openRoutineBuilder=function(){prepareSectionDraft(state.selectedDay);baseOpenRoutineBuilder();setTimeout(enhanceRoutineModal,0);};
  }

  function remapByIds(values,oldIds,newIds,fallback){
    const map=new Map();(oldIds||[]).forEach((id,i)=>{if(id)map.set(id,values?.[i]);});
    return (newIds||[]).map(id=>map.has(id)?map.get(id):clone(fallback));
  }
  function remapWeight(kind,day,oldIds,newIds){
    const key=dayKey(day), arr=state.sectionWeightEnabled?.[kind]?.[key];
    if(Array.isArray(arr)) state.sectionWeightEnabled[kind][key]=remapByIds(arr,oldIds,newIds,false);
    if(kind==='warmup'){
      const legacy=state.warmupWeightEnabled?.[key];
      if(Array.isArray(legacy)) state.warmupWeightEnabled[key]=remapByIds(legacy,oldIds,newIds,false);
    }
  }

  function captureEditorMeta(){
    const modal=document.querySelector('.editor-backdrop.open .editor-modal');
    if(!modal) return [];
    return [...modal.querySelectorAll('.editor-item')].map((row,index)=>{
      const key=metaKey(row,index);
      const current=exerciseMetaDraft.get(key)||sourceMeta(key,index);
      const get=f=>row.querySelector(`[data-ex-default="${f}"]`)?.value;
      return {
        key,
        sets:Math.max(1,Math.min(30,parseInt(get('sets'),10)||current.sets||3)),
        restSec:Math.max(0,Math.min(600,parseInt(get('restSec'),10)||0)),
        group:String(get('group')??current.group??'').trim(),
        rounds:Math.max(1,Math.min(30,parseInt(get('rounds'),10)||current.rounds||1))
      };
    });
  }

  function applyUnifiedSave(snapshot,metaRows){
    if(!snapshot) return;
    const day=snapshot.day, c=ensureCustom(day);
    c.rest=!!snapshot.rest;c.warmupEnabled=!!snapshot.warmupEnabled;c.cooldownEnabled=!!snapshot.cooldownEnabled;
    c.warmups=normalizeItems(snapshot.warmups).filter(x=>x[0].trim());
    c.cooldowns=normalizeItems(snapshot.cooldowns).filter(x=>x[0].trim());
    c.warm='';

    const keptWarmIds=snapshot.warmups.map((x,i)=>x[0].trim()?snapshot.warmupIds[i]:null).filter(Boolean);
    const keptCoolIds=snapshot.cooldowns.map((x,i)=>x[0].trim()?snapshot.cooldownIds[i]:null).filter(Boolean);
    setIds('warmup',keptWarmIds,day);setIds('cooldown',keptCoolIds,day);

    const d=state.drafts?.['d'+day];
    if(d){
      d.warmupEntries=remapByIds(d.warmupEntries||[],snapshot.originalWarmupIds,keptWarmIds,{weight:'',value:'',done:false});
      d.cooldownEntries=remapByIds(d.cooldownEntries||[],snapshot.originalCooldownIds,keptCoolIds,{weight:'',value:'',done:false});
    }
    remapWeight('warmup',day,snapshot.originalWarmupIds,keptWarmIds);remapWeight('cooldown',day,snapshot.originalCooldownIds,keptCoolIds);

    (c.exercises||[]).forEach((ex,i)=>{
      const row=metaRows[i];if(!row)return;
      const old=ex?.[5]&&typeof ex[5]==='object'?ex[5]:{};
      const next={...old,sets:row.sets};
      if(row.restSec) next.restSec=row.restSec; else delete next.restSec;
      if(row.group) next.group=row.group; else delete next.group;
      if(row.group && row.rounds) next.rounds=row.rounds; else if(!row.group) delete next.rounds;
      ex[5]=next;
    });
    save();
    if(Number(state.selectedDay)===Number(day) && typeof renderToday==='function') renderToday();
    if(typeof renderProgress==='function') renderProgress();
  }

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('#editorSave') || !sectionDraft) return;
    const snapshot=clone(sectionDraft), metaRows=captureEditorMeta();
    setTimeout(()=>applyUnifiedSave(snapshot,metaRows),0);
  },true);

  function sectionIdsForCurrent(kind,items){return idsFor(kind,items,state.selectedDay);}
  function attachSectionIds(entry){
    if(!entry) return;
    const warm=typeof warmupsForDay==='function'?(warmupsForDay(state.selectedDay)||[]):[];
    const cool=typeof cooldownsForDay==='function'?(cooldownsForDay(state.selectedDay)||[]):[];
    const warmIds=sectionIdsForCurrent('warmup',warm), coolIds=sectionIdsForCurrent('cooldown',cool);
    (entry.warmupEntries||[]).forEach((x,i)=>x.sectionId=warmIds[i]||x.sectionId||'');
    (entry.cooldownEntries||[]).forEach((x,i)=>x.sectionId=coolIds[i]||x.sectionId||'');
  }

  function canonicalHistory(h){
    if(!h) return null;
    return {
      date:h.date,day:Number(h.day),rest:!!h.rest,notes:String(h.notes||''),
      warmupEntries:(h.warmupEntries||[]).map(x=>[x.sectionId||'',x.name||'',x.type||'reps',Number(x.weight||0),Number(x.value||0),!!x.done]),
      cooldownEntries:(h.cooldownEntries||[]).map(x=>[x.sectionId||'',x.name||'',x.type||'reps',Number(x.weight||0),Number(x.value||0),!!x.done]),
      exercises:(h.exercises||[]).map(e=>[e.exerciseId||'',e.name||'',e.type||'reps',(e.sets||[]).map(s=>[Number(s.weight||0),Number(s.value||0),!!s.done,s.mode||e.type||'reps'])])
    };
  }
  function canonicalCurrent(){
    if(typeof selectedPlan!=='function'||typeof getDraft!=='function') return null;
    const p=selectedPlan(),d=getDraft(),warm=typeof warmupsForDay==='function'?(warmupsForDay(p.day)||[]):[],cool=typeof cooldownsForDay==='function'?(cooldownsForDay(p.day)||[]):[];
    const warmIds=sectionIdsForCurrent('warmup',warm),coolIds=sectionIdsForCurrent('cooldown',cool);
    const section=(items,entries,ids)=>(items||[]).map((x,i)=>[ids[i]||'',x[0]||'',x[2]||'reps',Number(entries?.[i]?.weight||0),Number(entries?.[i]?.value||0),!!entries?.[i]?.done]);
    return {
      date:d.date,day:Number(p.day),rest:!!p.rest,notes:String(d.notes||''),
      warmupEntries:section(warm,d.warmupEntries,warmIds),cooldownEntries:section(cool,d.cooldownEntries,coolIds),
      exercises:p.rest?[]:(p.exercises||[]).map((e,i)=>[e[4]||'',e[0]||'',e[3]||'reps',(d.sets?.[i]||[]).map(s=>[Number(s.weight||0),Number(s.value||0),!!s.done,s.mode||e[3]||'reps'])])
    };
  }

  if(typeof window.saveWorkout==='function'){
    const baseSaveWorkout=window.saveWorkout;
    window.saveWorkout=function(){
      const editingId=state._editingHistoryId;
      const p=typeof selectedPlan==='function'?selectedPlan():null;
      const editingEntry=editingId?(state.history||[]).find(h=>h.id===editingId):null;
      if(editingEntry && Number(editingEntry.day)!==Number(p?.day)){
        delete state._editingHistoryId;
      }
      if(!state._editingHistoryId){
        const last=state.history?.[state.history.length-1];
        const recent=last && Number.isFinite(Number(last.id)) && Date.now()-Number(last.id)<30000;
        if(recent && JSON.stringify(canonicalHistory(last))===JSON.stringify(canonicalCurrent())){
          if(typeof toast==='function') toast('Workout already saved');
          return;
        }
      }
      const targetId=state._editingHistoryId, before=(state.history||[]).length;
      baseSaveWorkout();
      if((state.history||[]).length<=before) return;
      let saved=state.history[state.history.length-1];
      attachSectionIds(saved);
      if(targetId){
        saved=state.history.pop();
        const index=state.history.findIndex(h=>h.id===targetId);
        saved.id=targetId;
        if(index>=0) state.history[index]=saved; else state.history.push(saved);
        delete state._editingHistoryId;
        if(typeof toast==='function') toast('Saved workout updated');
      }
      save();
      if(typeof renderHistory==='function') renderHistory();
      if(typeof renderProgress==='function') renderProgress();
      if(typeof renderToday==='function') renderToday();
    };
  }

  function findSavedSection(kind,items,index,saved){
    const ids=sectionIdsForCurrent(kind,items), id=ids[index], item=items[index];
    return (saved||[]).find(x=>id&&x.sectionId===id) || (saved||[]).find(x=>String(x.name||'').trim().toLowerCase()===String(item?.[0]||'').trim().toLowerCase() && (x.type||'reps')===(item?.[2]||'reps'));
  }

  window.editSavedWorkout=id=>{
    const h=(state.history||[]).find(x=>String(x.id)===String(id));
    if(!h) return;
    if(typeof selectDay==='function') selectDay(Number(h.day)||1); else state.selectedDay=Number(h.day)||1;
    const p=selectedPlan(),d=getDraft(),warm=typeof warmupsForDay==='function'?(warmupsForDay(p.day)||[]):[],cool=typeof cooldownsForDay==='function'?(cooldownsForDay(p.day)||[]):[];
    d.date=h.date||d.date;d.notes=h.notes||'';d.warmup=!!h.warmup;d.cooldownDone=!!h.cooldownDone;
    d.warmupEntries=warm.map((item,i)=>{const x=findSavedSection('warmup',warm,i,h.warmupEntries);return {weight:String(x?.weight??''),value:String(x?.value??''),done:!!x?.done};});
    d.cooldownEntries=cool.map((item,i)=>{const x=findSavedSection('cooldown',cool,i,h.cooldownEntries);return {weight:String(x?.weight??''),value:String(x?.value??''),done:!!x?.done};});
    if(!p.rest){
      d.sets=(p.exercises||[]).map(ex=>{
        const saved=(h.exercises||[]).find(x=>(ex[4]&&x.exerciseId===ex[4]) || (!x.exerciseId&&x.name===ex[0]));
        return saved?(saved.sets||[]).map(s=>({weight:String(s.weight??''),value:String(s.value??''),done:!!s.done,mode:s.mode||saved.type||ex[3]})):Array.from({length:Math.max(1,parseInt(ex?.[5]?.sets,10)||3)},()=>({weight:'',value:'',done:false,mode:ex[3]==='mixed'?'reps':ex[3]}));
      });
    }
    state._editingHistoryId=h.id;save();
    document.querySelector('.tabbtn[data-tab="today"]')?.click();
    renderToday();
    if(typeof toast==='function') toast(`Editing ${h.date}`);
  };
  window.cancelSavedWorkoutEdit=()=>{delete state._editingHistoryId;save();renderToday();if(typeof toast==='function')toast('Saved workout edit cancelled');};

  if(typeof renderHistory==='function'){
    const baseRenderHistory=renderHistory;
    renderHistory=function(){baseRenderHistory();decorateHistory();};
  }
  function decorateHistory(){
    const root=document.getElementById('historyList');if(!root)return;
    const cards=[...root.querySelectorAll('.history-item')];
    cards.forEach((card,i)=>{
      if(card.querySelector('.history-edit-actions')) return;
      const h=state.history?.[state.history.length-1-i];if(!h)return;
      const actions=document.createElement('div');actions.className='history-edit-actions';
      actions.innerHTML=`<button class="mini" type="button">✏️ Edit Saved</button>`;
      actions.querySelector('button').onclick=()=>window.editSavedWorkout(h.id);
      card.appendChild(actions);
    });
  }

  function decorateToday(){
    const root=document.getElementById('todayContent');if(!root)return;
    root.querySelectorAll('.edit-day-btn').forEach(btn=>{
      const p=typeof selectedPlan==='function'?selectedPlan():null;
      btn.textContent=p?.exercises?.length||p?.name?'✏️ Edit Day':'+ Create Day';
    });
    const editing=state._editingHistoryId?(state.history||[]).find(h=>h.id===state._editingHistoryId):null;
    root.querySelector('.edit-history-banner')?.remove();
    if(editing && Number(editing.day)===Number(state.selectedDay)){
      const banner=document.createElement('div');banner.className='edit-history-banner';
      banner.innerHTML=`<span>Editing saved workout from ${esc(editing.date)}. Saving will update that history entry instead of adding another.</span><button class="mini" type="button">Cancel edit</button>`;
      banner.querySelector('button').onclick=window.cancelSavedWorkoutEdit;
      const hero=root.querySelector('.hero');if(hero) hero.insertAdjacentElement('afterend',banner); else root.prepend(banner);
      const saveBtn=[...root.querySelectorAll('button')].find(b=>/Save Workout|Save Rest Day/.test(b.textContent));
      if(saveBtn) saveBtn.textContent='Update Saved Workout';
    }
    addPreferredRestButtons(root);
  }

  function addPreferredRestButtons(root){
    const p=typeof selectedPlan==='function'?selectedPlan():null;if(!p||p.rest)return;
    [...root.querySelectorAll('.exercise')].forEach((card,i)=>{
      const rest=Math.max(0,parseInt(p.exercises?.[i]?.[5]?.restSec,10)||0);if(!rest)return;
      const actions=card.querySelector('.setactions');if(!actions||actions.querySelector('.preferred-rest-btn'))return;
      const btn=document.createElement('button');btn.type='button';btn.className='mini preferred-rest-btn';btn.textContent=`Rest ${rest}s`;btn.onclick=()=>window.startMiniRest?.(rest);actions.appendChild(btn);
    });
  }

  if(typeof renderToday==='function'){
    const baseRenderToday=renderToday;
    renderToday=function(){baseRenderToday();decorateToday();setTimeout(enhanceRoutineModal,0);};
  }

  const observer=new MutationObserver(()=>{enhanceRoutineModal();decorateToday();});
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{decorateHistory();decorateToday();},0));
  decorateHistory();decorateToday();
})();
