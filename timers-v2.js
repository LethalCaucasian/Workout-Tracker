(() => {
  let active=null;
  let audioCtx=null;

  function modeFor(ex,set){
    if(window.WorkoutV2?.setModeFor) return WorkoutV2.setModeFor(ex,set);
    if(ex?.[3]==='mixed') return set?.mode||'reps';
    return ex?.[3]||'reps';
  }
  function secondsFor(set,mode){
    const value=parseFloat(set?.value)||0;
    return mode==='min'?Math.round(value*60):mode==='sec'?Math.round(value):0;
  }
  function fmt(sec){
    const s=Math.max(0,Math.ceil(sec));
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }
  function alarm(){
    if(window.WorkoutTimerAudio?.play){WorkoutTimerAudio.play();return;}
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(!Ctx) return;
      if(!audioCtx) audioCtx=new Ctx();
      if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
      const now=audioCtx.currentTime;
      [0,.2,.4].forEach(delay=>{
        const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
        osc.frequency.value=900;gain.gain.setValueAtTime(.0001,now+delay);gain.gain.exponentialRampToValueAtTime(.18,now+delay+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+.15);osc.connect(gain).connect(audioCtx.destination);osc.start(now+delay);osc.stop(now+delay+.18);
      });
    }catch{}
    if(navigator.vibrate) navigator.vibrate([180,80,180]);
  }
  function stop(reset=true){
    if(active?.interval) clearInterval(active.interval);
    if(active?.displayId){
      const el=document.getElementById(active.displayId);
      if(el&&reset){el.textContent='Ready';el.classList.remove('running','done');}
    }
    active=null;
  }
  window.stopTimedSet=()=>stop(true);
  window.startTimedSet=(i,j)=>{
    const plan=selectedPlan(),draft=getDraft(),ex=plan?.exercises?.[i],set=draft?.sets?.[i]?.[j],mode=modeFor(ex,set),seconds=secondsFor(set,mode);
    if(!['sec','min'].includes(mode)){if(typeof toast==='function')toast('This set is using reps');return;}
    if(seconds<=0){if(typeof toast==='function')toast(`Enter the set time in ${mode==='min'?'minutes':'seconds'} first`);return;}
    stop(true);
    const displayId=`set-countdown-${i}-${j}`,el=document.getElementById(displayId),endAt=Date.now()+seconds*1000;
    if(el){el.textContent=fmt(seconds);el.classList.add('running');el.classList.remove('done');}
    const tick=()=>{
      if(!active||active.displayId!==displayId)return;
      const left=Math.max(0,Math.ceil((endAt-Date.now())/1000)),node=document.getElementById(displayId);
      if(node)node.textContent=fmt(left);
      if(left<=0){
        if(active?.interval)clearInterval(active.interval);
        if(node){node.textContent='DONE';node.classList.remove('running');node.classList.add('done');}
        active=null;alarm();if(typeof toast==='function')toast('Timed set complete');
      }
    };
    active={interval:null,displayId,endAt,tick};
    active.interval=setInterval(tick,250);tick();
  };

  function enhance(){
    const plan=typeof selectedPlan==='function'?selectedPlan():null,draft=typeof getDraft==='function'?getDraft():null;
    if(!plan||!draft)return;
    document.querySelectorAll('#todayContent .exercise').forEach((card,i)=>{
      const ex=plan.exercises[i];if(!ex)return;
      card.querySelectorAll('.settable .setrow').forEach((row,j)=>{
        const mode=modeFor(ex,draft.sets?.[i]?.[j]);
        if(!['sec','min'].includes(mode))return;
        const next=row.nextElementSibling;if(next?.classList.contains('timed-set-controls'))return;
        const wrap=document.createElement('div');wrap.className='timed-set-controls';wrap.innerHTML=`<button class="mini" type="button" onclick="startTimedSet(${i},${j})">▶ Start timed set</button><button class="mini" type="button" onclick="stopTimedSet()">Stop</button><span class="set-countdown" id="set-countdown-${i}-${j}">Ready</span>`;row.insertAdjacentElement('afterend',wrap);
      });
    });
  }
  let applying=false;
  new MutationObserver(()=>{if(applying)return;applying=true;try{enhance();}finally{applying=false;}}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&active?.tick)active.tick();});
  window.addEventListener('pageshow',()=>{if(active?.tick)active.tick();});
  enhance();
})();
