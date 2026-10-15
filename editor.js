(() => {
  if(typeof PLAN === 'undefined' || typeof state === 'undefined') return;

  if(!state.customPlans) state.customPlans = {};

  const style = document.createElement('style');
  style.textContent = `
    .edit-day-row{display:flex;justify-content:flex-end;margin-top:10px}
    .edit-day-btn{border-color:#36577d!important;background:#13243a!important}
    .custom-badge{font-size:10px;color:#42d38a;margin-left:5px;font-weight:800}

    .editor-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.68);display:none;align-items:flex-start;justify-content:center;z-index:200;padding:18px 10px;overflow:auto}
    .editor-backdrop.open{display:flex}
    .editor-modal{width:min(760px,100%);background:#0d1827;border:1px solid #2a405f;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:14px;margin:auto}
    .editor-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}
    .editor-head h2{margin:0;font-size:21px}
    .editor-head p{margin:4px 0 0;color:#99a8bc;font-size:12px}
    .editor-close{border:1px solid #36506f;background:#101d30;color:white;border-radius:9px;width:38px;height:38px;font-size:20px}
    .editor-day-name{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;padding:10px;border:1px solid #243651;background:#0a1422;border-radius:12px}
    .editor-day-name label{font-size:11px;color:#99a8bc;font-weight:800;text-transform:uppercase;letter-spacing:.4px}
    .editor-day-name small{color:#7f90a8;font-size:11px;line-height:1.35}
    .editor-list{display:flex;flex-direction:column;gap:10px}
    .editor-item{border:1px solid #243651;background:#0a1422;border-radius:12px;padding:10px}
    .editor-item-top{display:grid;grid-template-columns:36px 1fr 130px;gap:8px;align-items:center}
    .editor-number{height:32px;width:32px;border-radius:50%;display:grid;place-items:center;background:#1e88ff;font-weight:900}
    .editor-input,.editor-select,.editor-note{width:100%;border:1px solid #2b3f5e;background:#091321;color:white;border-radius:9px;padding:9px;outline:none}
    .editor-note{margin-top:8px;min-height:64px;resize:vertical}
    .editor-subrow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px;align-items:center}
    .editor-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
    .editor-mini{border:1px solid #2d4565;background:#122035;color:white;border-radius:8px;padding:7px 9px;font-size:12px}
    .editor-mini.delete{color:#ff9dab;border-color:#613040;background:#29141b}
    .editor-footer{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid #243651}
    .editor-footer-group{display:flex;gap:8px;flex-wrap:wrap}
    .editor-help{color:#99a8bc;font-size:12px;margin:8px 0 0;line-height:1.4}
    @media(max-width:620px){
      .editor-item-top{grid-template-columns:34px 1fr}
      .editor-item-top .editor-select{grid-column:2}
      .editor-subrow{grid-template-columns:1fr}
      .editor-actions{justify-content:flex-start}
      .editor-modal{padding:12px}
    }
  `;
  document.head.appendChild(style);

  function defaultPlanForDay(day){
    return PLAN.find(p=>p.day===day);
  }

  function cloneExercises(exercises){
    return exercises.map(ex=>[ex[0],ex[1],ex[2],ex[3]]);
  }

  function esc(value){
    return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');
  }

  // Override the app's selectedPlan() so custom day names and exercises are used everywhere:
  // Today view, save history, progress calculations, and timed-set controls.
  selectedPlan = function(){
    const base = defaultPlanForDay(state.selectedDay);
    if(!base) return null;
    const custom = state.customPlans?.[state.selectedDay];
    if(!custom) return base;
    return {
      ...base,
      name: String(custom.name||'').trim() || base.name,
      exercises: custom.exercises?.length ? cloneExercises(custom.exercises) : cloneExercises(base.exercises)
    };
  };

  // The original app builds the day buttons directly from PLAN, so make those labels
  // profile-aware too when a custom day name has been saved.
  renderDays = function(){
    const el=document.getElementById('days');
    if(!el) return;
    el.innerHTML=PLAN.map(p=>{
      const custom=state.customPlans?.[p.day];
      const name=String(custom?.name||'').trim() || p.name;
      return `<button class="day ${p.day===state.selectedDay?'active':''}" style="--dayColor:${p.color}" onclick="selectDay(${p.day})"><strong>DAY ${p.day}</strong><small>${esc(name)}</small></button>`;
    }).join('');
  };

  let modal = null;
  let working = [];
  let workingName = '';
  let editingDay = null;
  let originalExercises = [];

  function ensureModal(){
    if(modal) return;
    modal = document.createElement('div');
    modal.className = 'editor-backdrop';
    modal.innerHTML = `
      <div class="editor-modal" role="dialog" aria-modal="true" aria-label="Edit workout">
        <div class="editor-head">
          <div><h2 id="editorTitle">Edit Workout</h2><p>Change the day title, replace exercises, add, remove, or reorder them.</p></div>
          <button class="editor-close" type="button" id="editorClose">×</button>
        </div>
        <div class="editor-day-name">
          <label for="editorDayName">Day title</label>
          <input class="editor-input" id="editorDayName" maxlength="80" placeholder="Workout day name">
          <small id="editorDayNameHelp">This is the text shown after DAY — in the workout heading.</small>
        </div>
        <div id="editorList" class="editor-list"></div>
        <p class="editor-help">Changing an exercise name treats it as a new exercise and starts that exercise with blank current sets. Saved workout history is never rewritten.</p>
        <div class="editor-footer">
          <div class="editor-footer-group">
            <button class="btn" type="button" id="editorAdd">+ Add Exercise</button>
            <button class="btn danger" type="button" id="editorReset">Restore Day Default</button>
          </div>
          <div class="editor-footer-group">
            <button class="btn" type="button" id="editorCancel">Cancel</button>
            <button class="btn good" type="button" id="editorSave">Save Changes</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#editorClose').onclick = closeEditor;
    modal.querySelector('#editorCancel').onclick = closeEditor;
    modal.querySelector('#editorDayName').addEventListener('input',e=>{workingName=e.target.value;});
    modal.querySelector('#editorAdd').onclick = () => {
      working.push(['New exercise','3×8–12','','reps']);
      renderEditorList();
      setTimeout(()=>{
        const names=modal.querySelectorAll('[data-field="name"]');
        names[names.length-1]?.focus();
        names[names.length-1]?.select();
      },0);
    };
    modal.querySelector('#editorSave').onclick = saveEditor;
    modal.querySelector('#editorReset').onclick = resetDayToDefault;
    modal.addEventListener('click',e=>{if(e.target===modal) closeEditor();});
  }

  function openEditor(){
    ensureModal();
    editingDay = state.selectedDay;
    const current = selectedPlan();
    originalExercises = cloneExercises(current.exercises);
    working = cloneExercises(current.exercises);
    workingName = current.name || '';
    modal.querySelector('#editorTitle').textContent = `Edit Day ${editingDay} Workout`;
    modal.querySelector('#editorDayName').value = workingName;
    modal.querySelector('#editorDayNameHelp').textContent = `This is the text shown after DAY ${editingDay} — in the workout heading.`;
    renderEditorList();
    modal.classList.add('open');
    document.body.style.overflow='hidden';
  }

  function closeEditor(){
    if(!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow='';
  }

  function renderEditorList(){
    const list=modal.querySelector('#editorList');
    list.innerHTML=working.map((ex,i)=>`
      <div class="editor-item" data-index="${i}">
        <div class="editor-item-top">
          <div class="editor-number">${i+1}</div>
          <input class="editor-input" data-field="name" data-index="${i}" value="${esc(ex[0])}" placeholder="Exercise name">
          <select class="editor-select" data-field="type" data-index="${i}">
            <option value="reps" ${ex[3]==='reps'?'selected':''}>Reps</option>
            <option value="sec" ${ex[3]==='sec'?'selected':''}>Timed (seconds)</option>
          </select>
        </div>
        <div class="editor-subrow">
          <input class="editor-input" data-field="target" data-index="${i}" value="${esc(ex[1])}" placeholder="Target, e.g. 3×8–12">
          <div class="editor-actions">
            <button class="editor-mini" type="button" onclick="moveEditorExercise(${i},-1)" ${i===0?'disabled':''}>↑</button>
            <button class="editor-mini" type="button" onclick="moveEditorExercise(${i},1)" ${i===working.length-1?'disabled':''}>↓</button>
            <button class="editor-mini delete" type="button" onclick="deleteEditorExercise(${i})">Delete</button>
          </div>
        </div>
        <textarea class="editor-note" data-field="note" data-index="${i}" placeholder="Exercise cue / notes">${esc(ex[2])}</textarea>
      </div>`).join('');

    list.querySelectorAll('[data-field]').forEach(el=>{
      el.addEventListener('input',()=>{
        const i=Number(el.dataset.index), field=el.dataset.field;
        const pos={name:0,target:1,note:2,type:3}[field];
        working[i][pos]=el.value;
      });
      el.addEventListener('change',()=>{
        const i=Number(el.dataset.index), field=el.dataset.field;
        const pos={name:0,target:1,note:2,type:3}[field];
        working[i][pos]=el.value;
      });
    });
  }

  window.moveEditorExercise=(i,dir)=>{
    const j=i+dir;
    if(j<0||j>=working.length) return;
    [working[i],working[j]]=[working[j],working[i]];
    renderEditorList();
  };

  window.deleteEditorExercise=(i)=>{
    if(working.length<=1){
      if(typeof toast==='function') toast('Keep at least one exercise');
      return;
    }
    working.splice(i,1);
    renderEditorList();
  };

  function remapDraftSets(day, oldExercises, newExercises){
    const key='d'+day;
    const draft=state.drafts?.[key];
    if(!draft?.sets) return;

    const buckets=new Map();
    oldExercises.forEach((ex,i)=>{
      const name=ex[0];
      if(!buckets.has(name)) buckets.set(name,[]);
      buckets.get(name).push(draft.sets[i]);
    });

    draft.sets=newExercises.map(ex=>{
      const queue=buckets.get(ex[0]);
      if(queue?.length){
        const found=queue.shift();
        if(Array.isArray(found)) return found;
      }
      return Array.from({length:3},()=>({weight:'',value:'',done:false}));
    });
  }

  function saveEditor(){
    working=working.map(ex=>[
      String(ex[0]||'').trim(),
      String(ex[1]||'').trim() || (ex[3]==='sec'?'3×30 sec':'3×8–12'),
      String(ex[2]||'').trim(),
      ex[3]==='sec'?'sec':'reps'
    ]);

    if(working.some(ex=>!ex[0])){
      alert('Every exercise needs a name.');
      return;
    }

    const base=defaultPlanForDay(editingDay);
    const dayName=String(workingName||'').trim() || base?.name || `Day ${editingDay}`;
    remapDraftSets(editingDay,originalExercises,working);
    state.customPlans[editingDay]={
      name:dayName,
      exercises:cloneExercises(working)
    };
    save();
    closeEditor();
    renderToday();
    if(typeof toast==='function') toast('Workout updated');
  }

  function resetDayToDefault(){
    const base=defaultPlanForDay(editingDay);
    if(!base) return;
    if(!confirm(`Restore Day ${editingDay} to its original title and exercise list? Saved history will stay unchanged.`)) return;
    remapDraftSets(editingDay,originalExercises,base.exercises);
    delete state.customPlans[editingDay];
    save();
    closeEditor();
    renderToday();
    if(typeof toast==='function') toast('Day restored to default');
  }

  function injectEditButton(){
    const hero=document.querySelector('#todayContent .hero');
    if(!hero || hero.querySelector('.edit-day-row')) return;
    const row=document.createElement('div');
    row.className='edit-day-row';
    const custom=!!state.customPlans?.[state.selectedDay];
    row.innerHTML=`<button class="btn edit-day-btn" type="button">✏️ Edit Workout${custom?'<span class="custom-badge">CUSTOM</span>':''}</button>`;
    row.querySelector('button').onclick=openEditor;
    hero.appendChild(row);
  }

  const baseRenderToday=renderToday;
  renderToday=function(){
    baseRenderToday();
    injectEditButton();
  };

  // Re-render once so any previously saved custom routine is applied immediately.
  renderToday();
})();
