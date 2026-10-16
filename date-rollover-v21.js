(() => {
  if(typeof state === 'undefined' || typeof window.getDraft !== 'function') return;

  const baseGetDraft = window.getDraft;

  function localDateKey(date = new Date()){
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function keepDraftOnToday(draft){
    if(!draft || state._editingHistoryId) return false;
    const today = localDateKey();
    if(draft.date === today) return false;
    draft.date = today;
    if(typeof save === 'function') save();
    return true;
  }

  window.getDraft = function(){
    const draft = baseGetDraft.apply(this, arguments);
    keepDraftOnToday(draft);
    return draft;
  };

  let observedDate = localDateKey();

  function refreshDate(force = false){
    if(state._editingHistoryId) return;
    const today = localDateKey();
    if(!force && today === observedDate) return;
    observedDate = today;

    let changed = false;
    try{
      const draft = baseGetDraft();
      changed = keepDraftOnToday(draft);
    }catch{}

    if((changed || force) && typeof renderToday === 'function') renderToday();
  }

  // Fix an already-stale draft as soon as this version loads.
  refreshDate(true);

  // Keep the date correct when an iPhone app tab survives across midnight,
  // returns from the background, or receives freshly synced profile data.
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden) refreshDate();
  });
  window.addEventListener('pageshow',()=>refreshDate());
  window.addEventListener('focus',()=>refreshDate());
  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>refreshDate(true),0));
  setInterval(()=>refreshDate(),60000);
})();
