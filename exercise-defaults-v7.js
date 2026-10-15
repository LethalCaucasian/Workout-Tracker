(() => {
  if(typeof getDraft!=='function' || typeof selectedPlan!=='function') return;

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
})();
