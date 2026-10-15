(() => {
  if(typeof state==='undefined' || typeof getDraft!=='function') return;

  let activeTimer=null;
  let wakeLock=null;
  let applying=false;

  const style=document.createElement('style');
  style.textContent=`
    .section-weight-toggle{margin-top:6px;border:1px solid #2d4565;background:#122035;color:#aebcd0;border-radius:8px;padding:5px 8px;font-size:11px;font-weight:700}
    .section-weight-toggle.on{color:#42d38a;border-color:#2c6a52;background:#10271e}
    .section-timed-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:7px 0 3px 46px;padding:6px 0 1px}
    .section-countdown{min-width:62px;text-align:center;font-weight:900;font-size:17px;font-variant-numeric:tabular-nums;color:#f3f6fb}
    .section-countdown.running{color:#42d38a}.section-countdown.done{color:#ffcf5a}
    @media(max-width:760px){.section-timed-controls{margin-left:38px}}
  `;
  document.head.appendChild(style);

  function ensureState(){
    if(!state.sectionWeightEnabled || typeof state.sectionWeightEnabled!=='object') state.sectionWeightEnabled={};
    if(!state.sectionWeightEnabled.warmup || typeof state.sectionWeightEnabled.warmup!=='object') state.sectionWeightEnabled.warmup={};
    if(!state.sectionWeightEnabled.cooldown || typeof state.sectionWeightEnabled.cooldown!=='object') state.sectionWeightEnabled.cooldown={};
  }
  function dayKey(){return String(Number(state.selectedDay)||1);}
  function itemsFor(kind){
    if(kind==='warmup') return typeof warmupsForDay==='function' ? (warmupsForDay(state.selectedDay)||[]) : [];
    return typeof cooldownsForDay==='function' ? (cooldownsForDay(state.selectedDay)||[]) : [];
  }
  function entriesFor(kind){
    const d=getDraft();
    return kind==='warmup' ? (d.warmupEntries||[]) : (d.cooldownEntries||[]);
  }
  function enabledFor(kind,index){
    ensureState();
    const key=dayKey();
    const saved=state.sectionWeightEnabled[kind]?.[key];
    if(Array.isArray(saved) && typeof saved[index]==='boolean') return saved[index];
    if(kind==='warmup'){
      const legacy=state.warmupWeightEnabled?.[key];
      if(Array.isArray(legacy) && typeof legacy[index]==='boolean') return legacy[index];
    }
    return !!entriesFor(kind)?.[index]?.weight;
  }
  function setEnabled(kind,index,value){
    ensureState();
    const key=dayKey();
    if(!Array.isArray(state.sectionWeightEnabled[kind][key])) state.sectionWeightEnabled[kind][key]=[];
    state.sectionWeightEnabled[kind][key][index]=!!value;
    if(kind==='warmup'){
      if(!state.warmupWeightEnabled || typeof state.warmupWeightEnabled!=='object') state.warmupWeightEnabled={};
      if(!Array.isArray(state.warmupWeightEnabled[key])) state.warmupWeightEnabled[key]=[];
      state.warmupWeightEnabled[key][index]=!!value;
    }
    if(!value){
      const e=entriesFor(kind)?.[index];
      if(e) e.weight='';
    }
    save();
    renderToday();
  }
  window.toggleSectionWeight=(kind,index)=>setEnabled(kind,index,!enabledFor(kind,index));

  function fmt(sec){
    const s=Math.max(0,Math.ceil(sec));
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }
  async function requestWakeLock(){
    try{
      if('wakeLock' in navigator && !wakeLock){
        wakeLock=await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release',()=>{wakeLock=null});
      }
    }catch{}
  }
  function releaseWakeLock(){
    if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;}
  }
  function stopTimer(reset=true){
    if(activeTimer?.interval) clearInterval(activeTimer.interval);
    if(activeTimer?.displayId){
      const el=document.getElementById(activeTimer.displayId);
      if(el && reset){el.textContent='Ready';el.classList.remove('running','done');}
    }
    activeTimer=null;releaseWakeLock();
  }
  window.stopSectionTimer=()=>stopTimer(true);
  window.startSectionTimer=(kind,index)=>{
    const item=itemsFor(kind)[index],entry=entriesFor(kind)[index];
    const type=item?.[2];
    if(!['sec','min'].includes(type)){toast?.('This card is using reps');return;}
    const value=parseFloat(entry?.value)||0;
    const seconds=type==='min'?Math.round(value*60):Math.round(value);
    if(seconds<=0){if(typeof toast==='function') toast(`Enter the time in ${type==='min'?'minutes':'seconds'} first`);return;}
    stopTimer(true);requestWakeLock();
    const displayId=`section-countdown-${kind}-${index}`,el=document.getElementById(displayId),endAt=Date.now()+seconds*1000;
    if(el){el.textContent=fmt(seconds);el.classList.add('running');el.classList.remove('done');}
    const tick=()=>{
      const left=Math.max(0,Math.ceil((endAt-Date.now())/1000));
      const node=document.getElementById(displayId);
      if(node && node.textContent!==fmt(left)) node.textContent=fmt(left);
      if(left<=0){
        if(activeTimer?.interval) clearInterval(activeTimer.interval);
        if(node){node.textContent='DONE';node.classList.remove('running');node.classList.add('done');}
        activeTimer=null;releaseWakeLock();
        if(window.WorkoutTimerAudio?.play) WorkoutTimerAudio.play();
        else if(navigator.vibrate) navigator.vibrate([180,80,180]);
        if(typeof toast==='function') toast(`${kind==='warmup'?'Warm-up':'Cooldown'} timer complete`);
      }
    };
    activeTimer={displayId,interval:setInterval(tick,250)};tick();
  };

  function findWeightField(row){
    return [...row.querySelectorAll('.field')].find(field=>field.querySelector('span')?.textContent?.trim()==='lb');
  }
  function enhanceSection(kind,root){
    const items=itemsFor(kind),rows=[...root.querySelectorAll(':scope > .history-ex')];
    rows.forEach((block,index)=>{
      const row=block.querySelector('.setrow');
      if(!row || !items[index]) return;
      const enabled=enabledFor(kind,index);
      const weightField=findWeightField(row);
      if(!enabled && weightField) weightField.remove();
      row.style.gridTemplateColumns=enabled?'44px minmax(78px,1fr) minmax(78px,1fr) 54px':'44px minmax(90px,1fr) 54px';

      let toggle=block.querySelector('.section-weight-toggle');
      if(!toggle){
        toggle=document.createElement('button');toggle.type='button';toggle.className='section-weight-toggle';
        toggle.onclick=()=>window.toggleSectionWeight(kind,index);
        const muted=block.querySelector('.muted');
        if(muted) muted.insertAdjacentElement('afterend',toggle); else block.insertBefore(toggle,row);
      }
      const text=enabled?'✓ Weight enabled':'+ Add weight';
      if(toggle.textContent!==text) toggle.textContent=text;
      toggle.classList.toggle('on',enabled);

      const type=items[index]?.[2];
      if(['sec','min'].includes(type)){
        let controls=row.nextElementSibling;
        if(!controls?.classList.contains('section-timed-controls')){
          controls=document.createElement('div');controls.className='section-timed-controls';
          controls.innerHTML=`<button class="mini" type="button" onclick="startSectionTimer('${kind}',${index})">▶ Start timed ${kind==='warmup'?'warm-up':'cooldown'}</button><button class="mini" type="button" onclick="stopSectionTimer()">Stop</button><span class="section-countdown" id="section-countdown-${kind}-${index}">Ready</span>`;
          row.insertAdjacentElement('afterend',controls);
        }
      }
    });
  }
  function enhance(){
    const warm=document.querySelector('#todayContent .warmup'); if(warm) enhanceSection('warmup',warm);
    const cool=document.querySelector('#todayContent .cooldown-routine'); if(cool) enhanceSection('cooldown',cool);
  }

  ensureState();
  const observer=new MutationObserver(()=>{
    if(applying) return;
    applying=true;try{enhance();}finally{applying=false;}
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{ensureState();enhance();},0));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible' && activeTimer) requestWakeLock();});
  enhance();
})();
