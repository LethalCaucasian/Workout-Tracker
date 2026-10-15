(() => {
  // Per-warm-up weight fields are optional. Each movement gets its own
  // toggle, and the choice is saved with the rest of the local app state.
  if(!state.warmupWeightEnabled) state.warmupWeightEnabled = {};

  const style = document.createElement('style');
  style.textContent = `
    .warmup-weight-toggle{
      margin-top:6px;border:1px solid #2d4565;background:#122035;color:#aebcd0;
      border-radius:8px;padding:5px 8px;font-size:11px;font-weight:700;
    }
    .warmup-weight-toggle.on{
      color:#42d38a;border-color:#2c6a52;background:#10271e;
    }
  `;
  document.head.appendChild(style);

  let applying = false;

  function dayKey(){
    return String(typeof state.selectedDay === 'number' ? state.selectedDay : 1);
  }

  function enabledFor(index){
    const key=dayKey();
    const saved=state.warmupWeightEnabled?.[key];
    if(Array.isArray(saved) && typeof saved[index] === 'boolean') return saved[index];

    // If an older saved draft already contains a weight, keep that field
    // visible so existing data is never hidden unexpectedly.
    try{
      const draft=getDraft();
      return !!draft?.warmupEntries?.[index]?.weight;
    }catch{
      return false;
    }
  }

  function setEnabled(index,value){
    const key=dayKey();
    if(!Array.isArray(state.warmupWeightEnabled[key])) state.warmupWeightEnabled[key]=[];
    state.warmupWeightEnabled[key][index]=!!value;

    if(!value){
      try{
        const draft=getDraft();
        if(draft?.warmupEntries?.[index]) draft.warmupEntries[index].weight='';
      }catch{}
    }
    save();
    renderToday();
  }

  window.toggleWarmupWeight=(index)=>setEnabled(index,!enabledFor(index));

  function applyWarmupWeightToggles(){
    if(applying) return;
    applying=true;
    try{
      const blocks=[...document.querySelectorAll('#todayContent .warmup .history-ex')];
      if(!blocks.length) return;

      blocks.forEach((block,index)=>{
        const row=block.querySelector('.setrow');
        if(!row) return;

        const isEnabled=enabledFor(index);
        let weightField=Array.from(row.querySelectorAll('.field')).find(field =>
          field.querySelector('input')?.getAttribute('oninput')?.includes("'weight'")
        );

        // renderToday() always creates the weight field. Hide it for this
        // movement unless the user explicitly toggled weight on.
        if(!isEnabled && weightField){
          weightField.remove();
          weightField=null;
        }

        row.style.gridTemplateColumns=isEnabled
          ? '44px minmax(78px,1fr) minmax(78px,1fr) 54px'
          : '44px minmax(90px,1fr) 54px';

        let toggle=block.querySelector('.warmup-weight-toggle');
        if(!toggle){
          toggle=document.createElement('button');
          toggle.type='button';
          toggle.className='warmup-weight-toggle';
          toggle.onclick=()=>window.toggleWarmupWeight(index);
          const muted=block.querySelector('.muted');
          if(muted) muted.insertAdjacentElement('afterend',toggle);
          else block.insertBefore(toggle,row);
        }

        const desiredText=isEnabled?'✓ Weight enabled':'+ Add weight';
        if(toggle.textContent!==desiredText) toggle.textContent=desiredText;
        toggle.classList.toggle('on',isEnabled);
      });
    } finally {
      applying=false;
    }
  }

  const observer=new MutationObserver(applyWarmupWeightToggles);
  observer.observe(document.body,{childList:true,subtree:true});
  applyWarmupWeightToggles();
})();
