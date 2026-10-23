(() => {
  if(typeof state==='undefined'||typeof getDraft!=='function')return;

  function markDraft(){
    const draft=getDraft();
    if(!draft)return;
    const old=Number(draft._draftUpdatedAt||0);
    draft._draftUpdatedAt=Math.max(Date.now(),old+1);
  }

  // Stamp only user-initiated changes, not renderToday(), page opening or
  // date rollovers. Existing handlers still perform the actual save.
  const mutators=[
    'updateSet','toggleSet','addSet','removeSet','updateSetMode',
    'updateWarmup','toggleWarmup','toggleWarmupEntry',
    'updateCooldownEntry','toggleCooldownEntry','toggleCooldownDone',
    'updateNotes','applyPreviousSetup','copyPrevious'
  ];
  mutators.forEach(name=>{
    const original=window[name];
    if(typeof original!=='function'||original._draftStampV38)return;
    const wrapped=function(...args){
      markDraft();
      return original.apply(this,args);
    };
    wrapped._draftStampV38=true;
    window[name]=wrapped;
  });

  window.resetDay=function(){
    if(!confirm("Clear this day's current entries? Your saved workout history will not be deleted."))return;
    const key='d'+state.selectedDay;
    if(!state.drafts||typeof state.drafts!=='object')state.drafts={};
    delete state.drafts[key];
    // Keep a blank but timestamped draft instead of deleting its cloud key.
    // Otherwise the cloud merger mistakes the old filled draft for missing data.
    const draft=getDraft();
    const stamp=Date.now();
    draft._resetAt=stamp;
    draft._draftUpdatedAt=stamp;
    save();
    renderToday();
    if(typeof toast==='function')toast('Day entries reset');
  };
})();
