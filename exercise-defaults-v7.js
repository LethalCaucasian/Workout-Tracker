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
      if(d.defaultSetInit[key]) return;
      const rows=Array.isArray(d.sets?.[i])?d.sets[i]:[];
      const untouched=rows.every(s=>!String(s?.weight||'').trim() && !String(s?.value||'').trim() && !s?.done);
      if(untouched){
        const mode=ex?.[3]==='mixed'?'reps':(['reps','sec','min'].includes(ex?.[3])?ex[3]:'reps');
        d.sets[i]=Array.from({length:desired},()=>({weight:'',value:'',done:false,mode}));
      }
      d.defaultSetInit[key]=true;
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
      label.innerHTML=`<b>${group}${rounds?` · ${rounds}x`:''}</b><span>${rounds>1?'Complete one set of each exercise, then rest 60–90 sec before the next round.':''}</span>`;
      card.insertAdjacentElement('beforebegin',label);
    });
  }

  const baseRenderToday=renderToday;
  renderToday=function(){baseRenderToday();addGroupLabels();};

  function addFortySecondRest(){
    document.querySelectorAll('.mini-rest-bar').forEach(bar=>{
      if(bar.querySelector('[data-rest40]')) return;
      const buttons=[...bar.querySelectorAll('button.mini')];
      const fortyFive=buttons.find(b=>b.textContent.trim()==='45');
      if(!fortyFive) return;
      const btn=document.createElement('button');
      btn.className='mini';btn.type='button';btn.dataset.rest40='1';btn.textContent='40';btn.onclick=()=>window.startMiniRest?.(40);
      fortyFive.insertAdjacentElement('beforebegin',btn);
    });
  }
  let applying=false;
  new MutationObserver(()=>{if(applying)return;applying=true;try{addFortySecondRest();}finally{applying=false;}}).observe(document.body,{childList:true,subtree:true});
  addFortySecondRest();addGroupLabels();
})();