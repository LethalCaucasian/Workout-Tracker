(() => {
  if(typeof state==='undefined' || typeof getDraft!=='function') return;

  let applying=false;

  const style=document.createElement('style');
  style.textContent=`
    .section-previous-setup{margin:8px 0 8px;padding:8px;border:1px solid #243651;background:#0a1422;border-radius:10px}
    .section-previous-note{font-size:11px;color:#91a2b8;line-height:1.35}
    .section-previous-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .section-previous-row select{flex:1;min-width:190px;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:8px;padding:7px}
    @media(max-width:620px){.section-previous-row select{min-width:150px}}
  `;
  document.head.appendChild(style);

  const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const normalize=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  const typeFor=item=>['reps','sec','min'].includes(item?.[2])?item[2]:'reps';
  const unitFor=type=>type==='sec'?'sec':type==='min'?'min':'reps';
  const fmt=value=>{const n=Number(value||0);return Number.isInteger(n)?String(n):String(Math.round(n*100)/100);};

  function itemsFor(kind){
    if(kind==='warmup') return typeof warmupsForDay==='function' ? (warmupsForDay(state.selectedDay)||[]) : [];
    return typeof cooldownsForDay==='function' ? (cooldownsForDay(state.selectedDay)||[]) : [];
  }

  function historyFor(kind,item){
    const name=normalize(item?.[0]);
    const type=typeFor(item);
    const field=kind==='warmup'?'warmupEntries':'cooldownEntries';
    const found=[];
    for(let i=(state.history||[]).length-1;i>=0;i--){
      const h=state.history[i];
      const entry=(h?.[field]||[]).find(e=>normalize(e?.name)===name && (e?.type||'reps')===type);
      if(entry) found.push({history:h,entry});
      if(found.length>=8) break;
    }
    return found;
  }

  function formatEntry(item){
    const e=item.entry||{};
    const weight=Number(e.weight||0), value=Number(e.value||0);
    const prefix=weight?`${fmt(weight)} lb × `:'';
    return `${item.history.date} • ${prefix}${fmt(value)} ${unitFor(e.type||'reps')}`;
  }

  function setWeightMode(kind,index,enabled){
    const day=String(Number(state.selectedDay)||1);
    if(!state.sectionWeightEnabled || typeof state.sectionWeightEnabled!=='object') state.sectionWeightEnabled={};
    if(!state.sectionWeightEnabled[kind] || typeof state.sectionWeightEnabled[kind]!=='object') state.sectionWeightEnabled[kind]={};
    if(!Array.isArray(state.sectionWeightEnabled[kind][day])) state.sectionWeightEnabled[kind][day]=[];
    state.sectionWeightEnabled[kind][day][index]=!!enabled;
    if(kind==='warmup'){
      if(!state.warmupWeightEnabled || typeof state.warmupWeightEnabled!=='object') state.warmupWeightEnabled={};
      if(!Array.isArray(state.warmupWeightEnabled[day])) state.warmupWeightEnabled[day]=[];
      state.warmupWeightEnabled[day][index]=!!enabled;
    }
  }

  window.applySectionPreviousSetup=(kind,index,historyIndex)=>{
    const item=itemsFor(kind)[index];
    const prior=historyFor(kind,item);
    const picked=prior[Number(historyIndex)||0];
    if(!picked) return;
    const d=getDraft();
    const entries=kind==='warmup'?d.warmupEntries:d.cooldownEntries;
    if(!entries[index]) entries[index]={weight:'',value:'',done:false};
    entries[index].weight=String(picked.entry.weight??'');
    entries[index].value=String(picked.entry.value??'');
    entries[index].done=false;
    setWeightMode(kind,index,Number(picked.entry.weight||0)!==0);
    if(typeof save==='function') save();
    if(typeof renderToday==='function') renderToday();
    if(typeof toast==='function') toast(`${kind==='warmup'?'Warm-up':'Cooldown'} setup loaded`);
  };

  function removeOverallDoneButtons(root){
    const actions=[...root.children].filter(el=>el.classList?.contains('setactions'));
    actions.forEach(el=>el.remove());
  }

  function decorateSection(kind,root){
    const items=itemsFor(kind);
    removeOverallDoneButtons(root);
    const cards=[...root.querySelectorAll(':scope > .history-ex')];
    cards.forEach((card,index)=>{
      const item=items[index];
      if(!item) return;
      const prior=historyFor(kind,item);
      const existing=card.querySelector('.section-previous-setup');
      const signature=prior.map(x=>`${x.history.id||x.history.date}:${x.entry.weight||0}:${x.entry.value||0}:${x.entry.type||'reps'}`).join('|');
      if(existing?.dataset.signature===signature) return;
      if(existing) existing.remove();
      const panel=document.createElement('div');
      panel.className='section-previous-setup';
      panel.dataset.signature=signature;
      const last=prior[0];
      panel.innerHTML=`<div class="section-previous-note">${last?`Last setup: ${esc(formatEntry(last))}`:'No saved setup for this card yet.'}</div>${prior.length?`<div class="section-previous-row"><select>${prior.map((x,i)=>`<option value="${i}">${esc(formatEntry(x))}</option>`).join('')}</select><button class="mini" type="button">Use setup</button></div>`:''}`;
      const select=panel.querySelector('select');
      const button=panel.querySelector('button');
      if(button) button.onclick=()=>window.applySectionPreviousSetup(kind,index,select?.value||0);
      const row=card.querySelector('.setrow');
      const weightToggle=card.querySelector('.section-weight-toggle');
      if(weightToggle) weightToggle.insertAdjacentElement('afterend',panel);
      else if(row) row.insertAdjacentElement('beforebegin',panel);
      else card.appendChild(panel);
    });
  }

  function enhance(){
    const warm=document.querySelector('#todayContent .warmup');
    if(warm) decorateSection('warmup',warm);
    const cool=document.querySelector('#todayContent .cooldown-routine');
    if(cool) decorateSection('cooldown',cool);
  }

  const observer=new MutationObserver(()=>{
    if(applying) return;
    applying=true;
    try{enhance();}finally{applying=false;}
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('workout-profile-store-change',()=>setTimeout(enhance,0));
  enhance();
})();
