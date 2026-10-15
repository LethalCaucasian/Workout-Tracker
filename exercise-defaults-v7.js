(() => {
  if(typeof getDraft!=='function' || typeof selectedPlan!=='function') return;

  const style=document.createElement('style');
  style.textContent=`
    .circuit-group-label{margin:12px 0 7px;padding:9px 11px;border:1px solid #2a405f;border-radius:10px;background:#0b1625}
    .circuit-group-label b{display:block;font-size:13px}.circuit-group-label span{display:block;margin-top:2px;color:#91a2b8;font-size:11px}
  `;
  document.head.appendChild(style);

  const baseGetDraft=getDraft;
  getDraft=function(){
    const d=baseGetDraft();
    const p=selectedPlan();
    if(!d.defaultSetInit || typeof d.defaultSetInit!=='object') d.defaultSetInit={};

    (p?.exercises||[]).forEach((ex,i)=>{
      const desired=Math.max(1,Math.min(30,parseInt(ex?.[5]?.sets,10)||0));
      if(!desired) return;

      const key=String(ex?.[4]||`${i}-${ex?.[0]||'exercise'}`);
      const rows=Array.isArray(d.sets?.[i])?d.sets[i]:[];
      const untouched=rows.every(s=>!String(s?.weight||'').trim() && !String(s?.value||'').trim() && !s?.done);
      const marker=d.defaultSetInit[key];

      // Older builds stored only `true`. Treat the current untouched row count
      // as the old default so a newly selected default can be detected.
      const previousDefault=marker===true
        ? rows.length
        : (Number.isFinite(Number(marker)) && Number(marker)>0 ? Number(marker) : null);

      const defaultChanged=previousDefault===null || previousDefault!==desired;
      if(defaultChanged && untouched){
        const mode=ex?.[3]==='mixed'?'reps':(['reps','sec','min'].includes(ex?.[3])?ex[3]:'reps');
        d.sets[i]=Array.from({length:desired},()=>({weight:'',value:'',done:false,mode}));
      }

      // Store the actual default count from now on. This lets later edits to
      // Default Sets apply once, while still preserving manual add/remove-set
      // changes after the default has already been applied.
      d.defaultSetInit[key]=desired;
    });
    return d;
  };

  function addGroupLabels(){
    const root=document.getElementById('todayContent');
    const p=typeof selectedPlan==='function'?selectedPlan():null;
    if(!root||!p||p.rest) return;
    root.querySelectorAll('.circuit-group-label').forEach(el=>el.remove());
    const cards=[...root.querySelectorAll('.exercise')];
    let previous='';
    cards.forEach((card,i)=>{
      const meta=p.exercises?.[i]?.[5]||{};
      const group=String(meta.group||'').trim();
      if(!group){previous='';return;}
      if(group===previous) return;
      previous=group;
      const rounds=parseInt(meta.rounds,10)||0;
      const label=document.createElement('div');
      label.className='circuit-group-label';
      const guidance=group.toLowerCase()==='jump rope'
        ? 'Complete each work/recovery interval for the rounds shown.'
        : (rounds>1?'Complete one set of each exercise, then rest 60–90 sec before the next round.':'');
      label.innerHTML=`<b>${group}${rounds?` · ${rounds}x`:''}</b><span>${guidance}</span>`;
      card.insertAdjacentElement('beforebegin',label);
    });
  }

  const baseRenderToday=renderToday;
  renderToday=function(){baseRenderToday();addGroupLabels();};

  addGroupLabels();
})();
