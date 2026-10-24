(() => {
  if(typeof state==='undefined'||typeof selectedPlan!=='function'||typeof getDraft!=='function')return;

  const style=document.createElement('style');
  style.textContent=
    '.exercise-weight-toggle{margin:0 0 8px;border:1px solid #375173;background:#122035;color:#bfd0e4;border-radius:9px;padding:7px 11px;font-size:12px;font-weight:800}'
   +'.exercise-weight-toggle.on{color:#42d38a;border-color:#33765a;background:#10291f}'
   +'.daily-goal{display:grid;gap:12px;padding:14px;border:1px solid var(--wt-border,#294162);border-radius:12px;background:var(--wt-field,#091321);margin-top:12px;min-width:0}'
   +'.daily-goal-title{display:flex;align-items:baseline;justify-content:space-between;gap:9px;flex-wrap:wrap}'
   +'.daily-goal-title strong{font-size:21px;color:#f3f6fb}.daily-goal-title span{color:#a9bed3;font-weight:800;font-size:12px}'
   +'.daily-goal-track{height:12px;overflow:hidden;border:1px solid #314760;background:#14243a;border-radius:999px}'
   +'.daily-goal-bar{height:100%;width:0;background:var(--wt-accent,#3ba8ff);transition:width .15s ease}'
   +'.daily-goal.done .daily-goal-bar{background:var(--wt-good,#42d38a)}'
   +'.daily-goal-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:end}'
   +'.daily-goal-input-label{display:grid;gap:5px;flex:1;min-width:155px;color:#a8bad0;font-weight:800;font-size:12px}'
   +'.daily-goal-input-label input{min-width:0;width:100%;padding:11px;border-radius:9px;background:#091321;border:1px solid #385170;color:#fff;font-size:16px}'
   +'.daily-goal-quick{display:flex;gap:7px;flex-wrap:wrap}.daily-goal-quick button{min-height:42px}'
   +'.daily-goal-description{color:#a7b9ce;font-size:12px;line-height:1.5}'
   +'.editor-goal-settings{display:flex;gap:12px;align-items:end;flex-wrap:wrap;border-top:1px solid #253a55;padding-top:10px;margin-top:9px}'
   +'.editor-goal-field{display:grid;gap:5px;min-width:118px;flex:1;color:#a5b8cd;font-size:12px;font-weight:800}'
   +'.editor-goal-field input{width:100%;min-width:0;background:#091321;color:white;border:1px solid #375171;border-radius:9px;padding:9px;font-size:16px}'
   +'.editor-weight-check{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;color:#bed0e6;padding:8px 0}'
   +'@media(max-width:560px){.daily-goal-controls{flex-direction:column;align-items:stretch}.daily-goal-quick button{flex:1}.daily-goal-input-label{min-width:0;width:100%}}';
  document.head.appendChild(style);

  const number=x=>Math.max(0,Number.isFinite(Number(x))?Number(x):0);
  const fmt=x=>number(x).toLocaleString(undefined,{maximumFractionDigits:2});
  const goals=ex=>ex?.[3]==='goal';
  const config=ex=>ex?.[5]&&typeof ex[5]==='object'?ex[5]:{};
  const target=ex=>Math.max(1,Math.floor(number(config(ex).goalTarget)||10000));
  const unit=ex=>String(config(ex).goalUnit||'steps').trim().slice(0,22)||'steps';
  const exerciseId=ex=>String(ex?.[4]||ex?.[0]||'');
  function tracksWeight(ex,index){
    if(goals(ex))return false;
    const meta=config(ex);
    if(typeof meta.trackWeight==='boolean')return meta.trackWeight;
    const draft=state.drafts?.['d'+state.selectedDay];
    if((draft?.sets?.[index]||[]).some(s=>number(s?.weight)>0))return true;
    const key=exerciseId(ex);
    if((state.history||[]).some(h=>(h.exercises||[]).some(e=>
      String(e.exerciseId||e.name||'')===key&&(e.sets||[]).some(s=>number(s.weight)>0))))return true;
    return /weight(ed)?|kettlebell|dumbbell|barbell|loaded/i.test(String(ex?.[0]||''));
  }
  window.WorkoutExerciseSettings={tracksWeight,isDailyGoal:goals,goalTarget:target,goalUnit:unit};

  // Date-scoped goal sets are kept with the rest of the workout draft so
  // backup, profile changes, reset, and cloud sync work as usual.
  const baseGetDraft=getDraft;
  getDraft=function(){
    const d=baseGetDraft.apply(this,arguments),p=selectedPlan();
    if(!d||p?.rest)return d;
    let changed=false;
    (p.exercises||[]).forEach((ex,i)=>{
      if(!goals(ex))return;
      const rows=d.sets?.[i]||[];
      if(!rows.length||rows[0].mode!=='goal'){
        d.sets[i]=[{weight:'',value:'',done:false,mode:'goal',goalDate:d.date}];
        changed=true;
      }else{
        if(rows.length!==1){d.sets[i]=[rows[0]];changed=true;}
        const s=d.sets[i][0];
        if(!state._editingHistoryId&&s.goalDate&&s.goalDate!==d.date){
          s.weight='';s.value='';s.done=false;changed=true;
        }
        if(s.goalDate!==d.date&&!state._editingHistoryId){s.goalDate=d.date;changed=true;}
        if(s.goalDate==null){s.goalDate=d.date;changed=true;}
        const done=number(s.value)>=target(ex);
        if(!!s.done!==done){s.done=done;changed=true;}
      }
    });
    if(changed&&typeof save==='function'){
      d._draftUpdatedAt=Math.max(Date.now(),Number(d._draftUpdatedAt||0)+1);
      save();
    }
    return d;
  };

  function makeGoalPanel(ex,i){
    const d=getDraft(),s=d.sets[i][0],panel=document.createElement('div');
    panel.className='daily-goal';
    panel.dataset.goalIndex=String(i);
    const heading=document.createElement('div');heading.className='daily-goal-title';
    const value=document.createElement('strong');value.className='daily-goal-current';
    const status=document.createElement('span');status.className='daily-goal-status';
    heading.append(value,status);panel.append(heading);
    const track=document.createElement('div');track.className='daily-goal-track';
    const bar=document.createElement('div');bar.className='daily-goal-bar';
    bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(target(ex)));
    track.append(bar);panel.append(track);
    const controls=document.createElement('div');controls.className='daily-goal-controls';
    const label=document.createElement('label');label.className='daily-goal-input-label';
    label.textContent='Current '+unit(ex);
    const input=document.createElement('input');input.type='number';input.min='0';input.step='1';input.inputMode='numeric';
    input.setAttribute('aria-label','Current '+unit(ex));input.value=String(s.value||'');
    input.placeholder='0';input.addEventListener('input',()=>window.updateDailyGoal(i,input.value,false));
    input.addEventListener('change',()=>window.updateDailyGoal(i,input.value,false));
    label.append(input);controls.append(label);
    const quick=document.createElement('div');quick.className='daily-goal-quick';
    const isSteps=/step/i.test(unit(ex));
    for(const inc of (isSteps?[500,1000]:[1,10])){
      const button=document.createElement('button');button.className='mini';button.type='button';
      button.textContent='+'+fmt(inc);button.setAttribute('aria-label','Add '+fmt(inc)+' '+unit(ex));
      button.addEventListener('click',()=>window.updateDailyGoal(i,number(getDraft().sets?.[i]?.[0]?.value)+inc,true));
      quick.append(button);
    }
    controls.append(quick);panel.append(controls);
    const hint=document.createElement('div');hint.className='daily-goal-description';
    hint.textContent='Daily target: '+fmt(target(ex))+' '+unit(ex)+' • counts reset for the next day';
    panel.append(hint);
    panel.querySelector('input').value=String(s.value||'');
    return panel;
  }
  function refreshGoal(i,ex){
    const panel=document.querySelector('#todayContent .daily-goal[data-goal-index="'+i+'"]');if(!panel)return;
    const s=getDraft().sets?.[i]?.[0],value=number(s?.value),limit=target(ex),pct=Math.min(100,value/limit*100);
    panel.classList.toggle('done',value>=limit);
    panel.querySelector('.daily-goal-current').textContent=fmt(value)+' / '+fmt(limit)+' '+unit(ex);
    panel.querySelector('.daily-goal-status').textContent=value>=limit?'✓ Goal reached':fmt(Math.round(pct))+'% complete';
    const bar=panel.querySelector('.daily-goal-bar');bar.style.width=pct+'%';bar.setAttribute('aria-valuenow',String(Math.min(value,limit)));
  }
  window.updateDailyGoal=function(i,val,replaceInput){
    const ex=selectedPlan()?.exercises?.[i];if(!goals(ex))return;
    const d=getDraft(),s=d.sets?.[i]?.[0];if(!s)return;
    const value=String(Math.max(0,Math.floor(number(val))));
    s.value=value;s.weight='';s.mode='goal';s.goalDate=d.date;s.done=number(value)>=target(ex);
    d._draftUpdatedAt=Math.max(Date.now(),Number(d._draftUpdatedAt||0)+1);
    save();
    const panel=document.querySelector('#todayContent .daily-goal[data-goal-index="'+i+'"]');
    if(replaceInput&&panel){const input=panel.querySelector('input');if(input)input.value=value;}
    refreshGoal(i,ex);
    if(typeof updateSummaryOnly==='function')updateSummaryOnly();
  };

  function decorateToday(){
    const root=document.getElementById('todayContent');if(!root)return;
    const p=selectedPlan();if(p.rest)return;
    const cards=[...root.querySelectorAll('.exercise')];
    (p.exercises||[]).forEach((ex,i)=>{
      const card=cards[i];if(!card)return;
      if(goals(ex)){
        const table=card.querySelector('.settable');
        if(table){table.replaceChildren(makeGoalPanel(ex,i));refreshGoal(i,ex);}
        const previous=card.querySelector('.previous-setup');if(previous)previous.style.display='none';
        return;
      }
      const weighted=tracksWeight(ex,i);
      const actions=card.querySelector('.setactions');
      if(actions){
        const button=document.createElement('button');
        button.className='exercise-weight-toggle'+(weighted?' on':'');
        button.type='button';
        button.textContent=weighted?'✓ Weight enabled':'+ Add weight';
        button.setAttribute('aria-label',weighted?'Hide weight entry for '+ex[0]:'Enable weight entry for '+ex[0]);
        button.addEventListener('click',()=>window.toggleExerciseWeight(i));
        actions.insertAdjacentElement('beforebegin',button);
      }
      if(!weighted){
        card.querySelectorAll('.settable .setrow').forEach(row=>{
          const weight=[...row.querySelectorAll('.field')].find(field=>field.querySelector('span')?.textContent?.trim()==='lb');
          if(weight)weight.remove();
          row.style.gridTemplateColumns=ex[3]==='mixed'?'55px 68px minmax(85px,1fr) 54px':'55px minmax(90px,1fr) 54px';
        });
      }
    });
  }
  window.toggleExerciseWeight=function(i){
    const ex=selectedPlan()?.exercises?.[i];if(!ex||goals(ex))return;
    const day=String(state.selectedDay),c=state.customPlans?.[day];if(!c?.exercises?.[i])return;
    const next=!tracksWeight(ex,i),draft=getDraft(),rows=draft.sets?.[i]||[];
    if(!next&&rows.some(s=>String(s?.weight??'').trim())){
      if(!confirm('Hide weight for '+ex[0]+'? Unsaved weight entries for this exercise will be cleared; saved workout history stays intact.'))return;
      rows.forEach(s=>{s.weight='';});
      draft._draftUpdatedAt=Math.max(Date.now(),Number(draft._draftUpdatedAt||0)+1);
    }
    const item=c.exercises[i],meta=item[5]&&typeof item[5]==='object'?item[5]:{};
    item[5]={...meta,trackWeight:next};
    c.exercisesUpdatedAt=Math.max(Date.now(),Number(c.exercisesUpdatedAt||0)+1);
    save();renderToday();
  };

  const previousRender=renderToday;
  renderToday=function(...args){
    const result=previousRender.apply(this,args);
    decorateToday();
    return result;
  };

  function editorControls(){
    const modal=document.querySelector('.editor-backdrop.open .editor-modal');if(!modal)return;
    const p=selectedPlan(),plan=p.exercises||[],draft=state.drafts?.['d'+state.selectedDay];
    modal.querySelectorAll('.editor-item').forEach((row,i)=>{
      if(row.querySelector('.editor-goal-settings'))return;
      const ex=plan[i],modeInput=row.querySelector('[data-field="type"]'),mode=modeInput?.value;
      const meta=config(ex);
      const panel=document.createElement('div');panel.className='editor-goal-settings';
      const weight=document.createElement('label');weight.className='editor-weight-check';
      const check=document.createElement('input');check.type='checkbox';check.setAttribute('data-goal-weight','');
      const saved=typeof meta.trackWeight==='boolean'?meta.trackWeight:tracksWeight(ex,i);
      check.checked=!!saved;
      weight.append(check,document.createTextNode('Track weight (lb)'));
      const goalTarget=document.createElement('label');goalTarget.className='editor-goal-field';goalTarget.textContent='Daily target';
      const targetInput=document.createElement('input');targetInput.type='number';targetInput.min='1';targetInput.step='1';targetInput.inputMode='numeric';targetInput.value=String(meta.goalTarget||10000);targetInput.setAttribute('data-goal-target','');
      goalTarget.append(targetInput);
      const goalUnit=document.createElement('label');goalUnit.className='editor-goal-field';goalUnit.textContent='Unit (steps, miles, etc.)';
      const unitInput=document.createElement('input');unitInput.maxLength=22;unitInput.value=String(meta.goalUnit||'steps');unitInput.setAttribute('data-goal-unit','');
      goalUnit.append(unitInput);
      panel.append(weight,goalTarget,goalUnit);
      row.append(panel);
      const setVisibility=()=>{
        const isGoal=modeInput?.value==='goal';
        weight.style.display=isGoal?'none':'flex';
        goalTarget.style.display=isGoal?'grid':'none';
        goalUnit.style.display=isGoal?'grid':'none';
        const defaults=row.querySelector('.editor-defaults-row');
        if(defaults){
          const setInput=defaults.querySelector('[data-ex-default="sets"]');
          if(setInput){setInput.disabled=isGoal;if(isGoal)setInput.value='1';}
        }
      };
      if(modeInput)modeInput.addEventListener('change',setVisibility);
      setVisibility();
    });
  }
  const observer=new MutationObserver(()=>editorControls());
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('.edit-day-btn'))setTimeout(editorControls,0);
  });
  renderToday();
})();