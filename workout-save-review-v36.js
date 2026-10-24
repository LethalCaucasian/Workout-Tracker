(() => {
  if(typeof window.saveWorkout!=='function'||typeof selectedPlan!=='function'||typeof getDraft!=='function') return;
  const baseSave=window.saveWorkout;
  const style=document.createElement('style');
  style.textContent='.workout-save-review{position:fixed;inset:0;z-index:11000;background:rgba(3,8,16,.78);display:none;align-items:center;justify-content:center;padding:16px;overflow:auto}.workout-save-review.open{display:flex}.workout-save-review-dialog{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow:auto;border:1px solid var(--wt-border,var(--line,#2b3f5e));border-radius:16px;background:var(--wt-surface,#0d1827);color:var(--wt-text,#f3f6fb);box-shadow:0 24px 64px rgba(0,0,0,.45);padding:18px}.workout-save-review-dialog h2{font-size:20px;margin:0 0 8px}.workout-save-review-dialog p{font-size:13px;line-height:1.5;color:var(--wt-muted,#99a8bc);margin:0 0 10px}.workout-save-review-summary{font-size:13px;font-weight:800;line-height:1.55;margin:0 0 12px}.workout-save-review-list{list-style:disc;padding:10px 12px 10px 30px;margin:0 0 14px;border:1px solid var(--wt-border,#243651);border-radius:10px;background:var(--wt-field,#091321);max-height:180px;overflow:auto;font-size:12px;line-height:1.5}.workout-save-review-list li+li{margin-top:5px}.workout-save-review-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.workout-save-review-actions button{flex:1;min-width:125px}@media(max-width:430px){.workout-save-review-dialog{padding:14px}.workout-save-review-actions{flex-direction:column-reverse}.workout-save-review-actions button{width:100%}}';
  document.head.appendChild(style);
  const txt=x=>String(x??'').trim();
  const positive=x=>txt(x)!==''&&Number.isFinite(Number(x))&&Number(x)>0;
  const count=(n,s,plural=s+'s')=>n+' '+(n===1?s:plural);
  const matches=(a,b)=>!!(a?.[4]&&b?.exerciseId&&String(a[4])===String(b.exerciseId))||txt(a?.[0]).toLowerCase()===txt(b?.name).toLowerCase();
  function expectsWeight(ex,sets){
    if(ex?.[3]==='goal'||ex?.[5]?.trackWeight===false)return false;
    if(ex?.[5]?.trackWeight===true)return true;
    if(sets.some(s=>positive(s?.weight)))return true;
    return (state.history||[]).some(h=>(h.exercises||[]).some(e=>matches(ex,e)&&(e.sets||[]).some(s=>positive(s?.weight))));
  }
  function analyze(){
    const p=selectedPlan(),d=getDraft(),details=[];
    let skipped=0,unchecked=0,missingValue=0,missingWeight=0,optional=0,shortGoals=0;
    if(!p.rest)(p.exercises||[]).forEach((ex,i)=>{
      const name=txt(ex?.[0])||'Exercise '+(i+1),sets=Array.isArray(d.sets?.[i])?d.sets[i]:[];
      if(ex?.[3]==='goal'){
        const current=Number(sets[0]?.value||0),target=Math.max(1,Number(ex?.[5]?.goalTarget||10000)),unit=String(ex?.[5]?.goalUnit||'steps');
        if(current<target){shortGoals++;details.push(name+': '+current.toLocaleString()+' / '+target.toLocaleString()+' '+unit);}
        return;
      }
      if(!sets.length){skipped++;details.push(name+': no sets');return;}
      const done=sets.filter(s=>s?.done).length;
      if(!done)skipped++;
      const blanks=[],invalid=[],weightNeeded=expectsWeight(ex,sets);
      sets.forEach((s,j)=>{
        if(!s?.done){unchecked++;blanks.push(j+1);return;}
        const mode=ex?.[3]==='mixed'?(s.mode||'reps'):(ex?.[3]||'reps'),issues=[];
        if(!positive(s.value)){missingValue++;issues.push('missing '+(['sec','min'].includes(mode)?'time':'reps'));}
        if(weightNeeded&&txt(s.weight)===''){missingWeight++;issues.push('missing weight');}
        if(issues.length)invalid.push('set '+(j+1)+' '+issues.join(' and '));
      });
      if(!done)details.push(name+': no checked sets');
      else if(blanks.length)details.push(name+': set(s) '+blanks.join(', ')+' not checked');
      if(invalid.length)details.push(name+': '+invalid.join('; '));
    });
    for(const [label,getItems,entries] of [
      ['Warm-up',typeof warmupsForDay==='function'?warmupsForDay:()=>[],d.warmupEntries],
      ['Cooldown',typeof cooldownsForDay==='function'?cooldownsForDay:()=>[],d.cooldownEntries]
    ]){
      (getItems(p.day)||[]).forEach((item,i)=>{
        const s=entries?.[i];
        if(!s||!(txt(s.weight)||txt(s.value)||s.done))return;
        const name=txt(item?.[0])||label+' '+(i+1);
        if(!s.done){optional++;details.push(label+' — '+name+': not checked');}
        else if(!positive(s.value)){optional++;details.push(label+' — '+name+': missing reps/time');}
      });
    }
    const summary=[];
    if(skipped)summary.push(count(skipped,'exercise')+' with no completed sets');
    if(shortGoals)summary.push(count(shortGoals,'daily goal')+' not reached');
    if(unchecked)summary.push(count(unchecked,'unchecked set'));
    if(missingValue)summary.push(count(missingValue,'checked set')+' missing reps/time');
    if(missingWeight)summary.push(count(missingWeight,'checked set')+' missing weight');
    if(optional)summary.push(count(optional,'warm-up/cooldown issue'));
    return {summary,details};
  }

  let overlay=null,pending=null,previousFocus=null;
  function close(){
    if(!overlay)return;
    overlay.classList.remove('open');pending=null;
    if(previousFocus?.isConnected)previousFocus.focus();
    previousFocus=null;
  }
  function ensureModal(){
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.className='workout-save-review';
    overlay.innerHTML='<div class="workout-save-review-dialog" role="dialog" aria-modal="true" aria-labelledby="workoutSaveReviewTitle"><h2 id="workoutSaveReviewTitle">Save incomplete workout?</h2><p>Some sets or exercises may be unfinished. Review the details, or save the workout as it is.</p><div class="workout-save-review-summary"></div><ul class="workout-save-review-list"></ul><div class="workout-save-review-actions"><button class="btn" type="button" data-action="back">Back to workout</button><button class="btn primary" type="button" data-action="save">Save anyway</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="back"]').addEventListener('click',close);
    overlay.querySelector('[data-action="save"]').addEventListener('click',()=>{
      if(!pending)return;
      const action=pending;
      close();
      action();
    });
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    return overlay;
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('open')){e.stopPropagation();close();}});
  window.saveWorkout=function(...args){
    if(overlay?.classList.contains('open'))return;
    const report=analyze();
    if(!report.summary.length)return baseSave.apply(this,args);
    const modal=ensureModal();
    modal.querySelector('.workout-save-review-summary').textContent=report.summary.join(' • ');
    const list=modal.querySelector('.workout-save-review-list');
    list.replaceChildren();
    report.details.slice(0,12).forEach(line=>{const li=document.createElement('li');li.textContent=line;list.appendChild(li);});
    if(report.details.length>12){const li=document.createElement('li');li.textContent='…and '+(report.details.length-12)+' more issues';list.appendChild(li);}
    previousFocus=document.activeElement;
    const context=this;pending=()=>baseSave.apply(context,args);
    modal.querySelector('#workoutSaveReviewTitle').textContent=state._editingHistoryId?'Update incomplete workout?':'Save incomplete workout?';
    modal.querySelector('[data-action="save"]').textContent=state._editingHistoryId?'Update anyway':'Save anyway';
    modal.classList.add('open');
    modal.querySelector('[data-action="back"]').focus();
  };
  window.addEventListener('workout-profile-store-change',event=>{
    if(overlay?.classList.contains('open')&&['active-profile','import-profiles','delete-profile'].includes(event?.detail?.reason))close();
  });
})();
