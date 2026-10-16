(() => {
  if(typeof state==='undefined' || typeof selectedPlan!=='function' || typeof getDraft!=='function') return;

  const style=document.createElement('style');
  style.textContent=`
    .setlabel .live-pr-badge{display:inline-flex;align-items:center;gap:2px;margin-top:3px;padding:2px 4px;border:1px solid rgba(255,209,102,.55);border-radius:6px;background:rgba(255,209,102,.10);color:#ffd166;font-size:8px;font-weight:1000;letter-spacing:.2px;line-height:1.1;white-space:nowrap}
  `;
  document.head.appendChild(style);

  function slug(v){return String(v||'exercise').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'exercise';}
  function planKey(ex){return ex?.[4]?String(ex[4]):`legacy-${slug(ex?.[0])}`;}
  function historyKey(ex){return ex?.exerciseId?String(ex.exerciseId):`legacy-${slug(ex?.name)}`;}
  function sameExercise(planEx,histEx){
    const pk=planKey(planEx),hk=historyKey(histEx);
    if(pk===hk)return true;
    return slug(planEx?.[0])===slug(histEx?.name);
  }
  function modeForPlan(ex,set){
    const t=['reps','sec','min','mixed'].includes(ex?.[3])?ex[3]:'reps';
    if(t==='mixed')return ['reps','sec','min'].includes(set?.mode)?set.mode:'reps';
    return t;
  }
  function modeForHistory(ex,set){
    const t=['reps','sec','min','mixed'].includes(ex?.type)?ex.type:'reps';
    if(t==='mixed')return ['reps','sec','min'].includes(set?.mode)?set.mode:'reps';
    return t;
  }
  function toSeconds(mode,value){return mode==='min'?Number(value||0)*60:mode==='sec'?Number(value||0):0;}

  function historicalBest(planEx){
    let sessions=0,maxWeight=0,maxReps=0,maxSeconds=0;
    (state.history||[]).forEach(h=>(h.exercises||[]).forEach(ex=>{
      if(!sameExercise(planEx,ex))return;
      sessions++;
      (ex.sets||[]).forEach(set=>{
        if(set?.done===false)return;
        const mode=modeForHistory(ex,set),weight=Number(set?.weight||0),value=Number(set?.value||0);
        maxWeight=Math.max(maxWeight,weight);
        if(mode==='reps')maxReps=Math.max(maxReps,value);
        else maxSeconds=Math.max(maxSeconds,toSeconds(mode,value));
      });
    }));
    return {sessions,maxWeight,maxReps,maxSeconds};
  }

  function prForSet(exerciseIndex,setIndex){
    const plan=selectedPlan(),ex=plan?.exercises?.[exerciseIndex],set=getDraft()?.sets?.[exerciseIndex]?.[setIndex];
    if(!ex||!set||!set.done)return null;
    const old=historicalBest(ex);
    if(!old.sessions)return null;
    const mode=modeForPlan(ex,set),weight=Number(set.weight||0),value=Number(set.value||0),seconds=toSeconds(mode,value),records=[];
    if(weight>0 && weight>old.maxWeight)records.push('Weight PR');
    if(mode==='reps' && value>0 && value>old.maxReps)records.push('Rep PR');
    if(mode!=='reps' && seconds>0 && seconds>old.maxSeconds)records.push('Hold PR');
    return records.length?records:null;
  }

  function applyBadges(){
    const root=document.getElementById('todayContent');
    if(!root)return;
    root.querySelectorAll('.exercise').forEach((card,i)=>{
      card.querySelectorAll('.settable .setrow').forEach((row,j)=>{
        const label=row.querySelector('.setlabel');if(!label)return;
        const records=prForSet(i,j);
        let badge=label.querySelector('.live-pr-badge');
        if(records){
          if(!badge){badge=document.createElement('span');badge.className='live-pr-badge';label.appendChild(document.createElement('br'));label.appendChild(badge);}
          badge.textContent='🏆 PR';
          badge.title=records.join(' + ');
          badge.setAttribute('aria-label',records.join(' and '));
        }else if(badge){
          const br=badge.previousSibling;
          badge.remove();
          if(br?.nodeName==='BR')br.remove();
        }
      });
    });
  }

  if(typeof window.renderToday==='function' && !window.renderToday._prDetectionV33){
    const base=window.renderToday;
    const wrapped=function(...args){const result=base.apply(this,args);applyBadges();return result;};
    wrapped._prDetectionV33=true;
    window.renderToday=wrapped;
  }

  if(typeof window.updateSet==='function' && !window.updateSet._prDetectionV33){
    const base=window.updateSet;
    const wrapped=function(...args){const result=base.apply(this,args);applyBadges();return result;};
    wrapped._prDetectionV33=true;
    window.updateSet=wrapped;
  }

  if(typeof window.toggleSet==='function' && !window.toggleSet._prDetectionV33){
    const base=window.toggleSet;
    const wrapped=function(i,j,...rest){
      const wasDone=!!getDraft()?.sets?.[i]?.[j]?.done;
      const result=base.call(this,i,j,...rest);
      const nowDone=!!getDraft()?.sets?.[i]?.[j]?.done;
      applyBadges();
      if(!wasDone&&nowDone){
        const records=prForSet(i,j);
        if(records?.length && typeof toast==='function'){
          const name=selectedPlan()?.exercises?.[i]?.[0]||'Exercise';
          toast(`🏆 New PR — ${name}: ${records.join(' + ')}`);
        }
      }
      return result;
    };
    wrapped._prDetectionV33=true;
    window.toggleSet=wrapped;
  }

  ['addSet','removeSet','copyPrevious','selectDay'].forEach(name=>{
    const fn=window[name];
    if(typeof fn!=='function'||fn._prDetectionV33)return;
    const wrapped=function(...args){const result=fn.apply(this,args);setTimeout(applyBadges,0);return result;};
    wrapped._prDetectionV33=true;
    window[name]=wrapped;
  });

  const today=document.getElementById('todayContent');
  if(today){new MutationObserver(()=>applyBadges()).observe(today,{childList:true});}
  window.addEventListener('workout-profile-store-change',()=>setTimeout(applyBadges,0));
  applyBadges();
})();
