(() => {
  if(typeof state==='undefined'||typeof save!=='function')return;
  // These IDs belong to one saved session, not a whole workout day.
  // The deletion marker is kept inside the profile and merged with the cloud.
  window.deleteHistory=function(id){
    const record=(state.history||[]).find(h=>String(h?.id)===String(id));
    if(!record)return;
    const heading=String(record.date||'')+' — '+String(record.name||'Workout');
    if(!confirm('Delete this saved workout?\n'+heading+'\n\nThis will not delete your routine or other sessions.'))return;
    if(!state.deletedWorkoutIds||typeof state.deletedWorkoutIds!=='object')state.deletedWorkoutIds={};
    const key=String(id);
    state.deletedWorkoutIds[key]=Math.max(Date.now(),Number(state.deletedWorkoutIds[key]||0)+1);
    state.history=state.history.filter(h=>String(h?.id)!==key);
    if(String(state._editingHistoryId||'')===key)delete state._editingHistoryId;
    save();
    if(typeof renderHistory==='function')renderHistory();
    if(typeof renderProgress==='function')renderProgress();
    if(typeof toast==='function')toast('Saved workout deleted');
  };
})();