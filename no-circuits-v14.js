(() => {
  if(typeof state==='undefined') return;

  const style=document.createElement('style');
  style.textContent=`
    .circuit-group-label{display:none!important}
    .editor-defaults-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    @media(max-width:760px){.editor-defaults-row{grid-template-columns:1fr 1fr!important}}
  `;
  document.head.appendChild(style);

  function scrubCircuitMeta(){
    let changed=false;
    Object.values(state.customPlans||{}).forEach(plan=>{
      (plan?.exercises||[]).forEach(ex=>{
        const meta=ex?.[5];
        if(!meta || typeof meta!=='object') return;
        if(Object.prototype.hasOwnProperty.call(meta,'group')){delete meta.group;changed=true;}
        if(Object.prototype.hasOwnProperty.call(meta,'rounds')){delete meta.rounds;changed=true;}
        if(Object.keys(meta).length===0) ex[5]=null;
      });
    });
    if(changed && typeof save==='function') save();
  }

  function stripCircuitUi(){
    document.querySelectorAll('.circuit-group-label').forEach(el=>el.remove());
    document.querySelectorAll('.editor-defaults-row .editor-default-field').forEach(field=>{
      const label=String(field.querySelector('label')?.textContent||'').trim().toLowerCase();
      if(label==='circuit group' || label==='rounds') field.remove();
    });
  }

  let applying=false;
  const observer=new MutationObserver(()=>{
    if(applying) return;
    applying=true;
    try{stripCircuitUi();}finally{applying=false;}
  });
  observer.observe(document.body,{childList:true,subtree:true});

  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{
    scrubCircuitMeta();
    stripCircuitUi();
  },0));

  scrubCircuitMeta();
  stripCircuitUi();
})();
