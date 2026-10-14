(() => {
  // Warm-ups that genuinely use an external load can be added here later.
  // The current warm-up list is bodyweight, mobility, or band-based, so it
  // should not show a misleading pounds field.
  const WEIGHTED_WARMUPS = new Set([]);

  let applying = false;

  function cleanWarmupFields(){
    if(applying) return;
    applying = true;
    try{
      const rows = document.querySelectorAll('#todayContent .warmup .history-ex .setrow');
      if(!rows.length) return;

      let draft = null;
      try{ draft = typeof getDraft === 'function' ? getDraft() : null; }catch{}
      let changed = false;

      rows.forEach((row, i) => {
        const block = row.closest('.history-ex');
        const name = block?.querySelector('b')?.textContent?.trim() || '';
        const usesWeight = WEIGHTED_WARMUPS.has(name);

        if(!usesWeight){
          const weightField = Array.from(row.querySelectorAll('.field')).find(field =>
            field.querySelector('input')?.getAttribute('oninput')?.includes("'weight'")
          );
          if(weightField) weightField.remove();
          row.style.gridTemplateColumns = '44px 1fr 54px';

          if(draft?.warmupEntries?.[i] && draft.warmupEntries[i].weight){
            draft.warmupEntries[i].weight = '';
            changed = true;
          }
        }
      });

      if(changed && typeof save === 'function') save();
    } finally {
      applying = false;
    }
  }

  const observer = new MutationObserver(cleanWarmupFields);
  observer.observe(document.body,{childList:true,subtree:true});
  cleanWarmupFields();
})();
