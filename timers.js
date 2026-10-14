(() => {
  let audioCtx = null;
  let restWasRunning = false;
  let lastRestValue = null;
  let activeSetTimer = null;
  let wakeLock = null;

  const style = document.createElement('style');
  style.textContent = `
    .timed-set-controls{
      display:flex;align-items:center;gap:8px;flex-wrap:wrap;
      margin:7px 0 2px 46px;padding:7px 0 2px;
    }
    .set-countdown{
      min-width:62px;text-align:center;font-weight:900;font-size:18px;
      letter-spacing:.5px;color:#f3f6fb;
    }
    .set-countdown.running{color:#42d38a}
    .set-countdown.done{color:#ffcf5a}
    @media (max-width:760px){
      .timed-set-controls{margin-left:38px}
    }
  `;
  document.head.appendChild(style);

  function initAudio(){
    if(!audioCtx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(Ctx) audioCtx = new Ctx();
    }
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  }

  function playAlarm(){
    initAudio();
    if(audioCtx){
      const now = audioCtx.currentTime;
      [0, 0.24, 0.48].forEach((delay, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = idx === 2 ? 'square' : 'sine';
        osc.frequency.value = idx === 2 ? 1046 : 880;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.22, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.16);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.18);
      });
    }
    if(navigator.vibrate) navigator.vibrate([180,100,180,100,260]);
  }

  async function requestWakeLock(){
    try{
      if('wakeLock' in navigator && !wakeLock){
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release',()=>{wakeLock=null});
      }
    }catch{}
  }

  function releaseWakeLock(){
    if(wakeLock){
      wakeLock.release().catch(()=>{});
      wakeLock = null;
    }
  }

  function fmt(sec){
    const s=Math.max(0,sec|0);
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }

  function stopActiveSetTimer(resetDisplay=false){
    if(!activeSetTimer) return;
    clearInterval(activeSetTimer.interval);
    const display=document.getElementById(activeSetTimer.displayId);
    if(display && resetDisplay){
      display.textContent='Ready';
      display.classList.remove('running','done');
    }
    activeSetTimer=null;
    releaseWakeLock();
  }

  function startTimedSet(i,j){
    initAudio();
    const d=getDraft();
    const seconds=parseInt(d.sets?.[i]?.[j]?.value,10) || 0;
    if(seconds<=0){
      if(typeof toast === 'function') toast('Enter the set time in seconds first');
      return;
    }

    stopActiveSetTimer(true);
    requestWakeLock();

    const displayId=`set-countdown-${i}-${j}`;
    const display=document.getElementById(displayId);
    const endAt=Date.now()+seconds*1000;
    if(display){
      display.textContent=fmt(seconds);
      display.classList.add('running');
      display.classList.remove('done');
    }

    const tick=()=>{
      const left=Math.max(0,Math.ceil((endAt-Date.now())/1000));
      const el=document.getElementById(displayId);
      if(el) el.textContent=fmt(left);
      if(left<=0){
        if(activeSetTimer) clearInterval(activeSetTimer.interval);
        if(el){
          el.textContent='DONE';
          el.classList.remove('running');
          el.classList.add('done');
        }
        activeSetTimer=null;
        releaseWakeLock();
        playAlarm();
        if(typeof toast === 'function') toast('Timed set complete');
      }
    };

    const interval=setInterval(tick,250);
    activeSetTimer={i,j,interval,displayId,endAt};
    tick();
  }

  window.startTimedSet=startTimedSet;
  window.stopTimedSet=()=>stopActiveSetTimer(true);

  function enhanceTimedSets(){
    if(typeof selectedPlan !== 'function') return;
    const plan=selectedPlan();
    if(!plan) return;
    const cards=document.querySelectorAll('#todayContent .exercise');
    cards.forEach((card,i)=>{
      const ex=plan.exercises[i];
      if(!ex || ex[3] !== 'sec') return;
      const rows=card.querySelectorAll('.settable .setrow');
      rows.forEach((row,j)=>{
        const next=row.nextElementSibling;
        if(next && next.classList.contains('timed-set-controls')) return;
        const wrap=document.createElement('div');
        wrap.className='timed-set-controls';
        wrap.innerHTML=`
          <button class="mini" type="button" onclick="startTimedSet(${i},${j})">▶ Start timed set</button>
          <button class="mini" type="button" onclick="stopTimedSet()">Stop</button>
          <span class="set-countdown" id="set-countdown-${i}-${j}">Ready</span>`;
        row.insertAdjacentElement('afterend',wrap);
      });
    });
  }

  function watchRestTimer(){
    const el=document.getElementById('timer');
    if(!el) return;
    const value=el.textContent.trim();
    if(value !== lastRestValue){
      if(value !== '00:00') restWasRunning=true;
      if(value === '00:00' && lastRestValue && lastRestValue !== '00:00' && restWasRunning){
        restWasRunning=false;
        releaseWakeLock();
        playAlarm();
      }
      lastRestValue=value;
    }
  }

  const originalStartTimer=window.startTimer;
  if(typeof originalStartTimer === 'function'){
    window.startTimer=function(){
      initAudio();
      requestWakeLock();
      restWasRunning=true;
      return originalStartTimer.apply(this,arguments);
    };
  }

  const originalResetTimer=window.resetTimer;
  if(typeof originalResetTimer === 'function'){
    window.resetTimer=function(){
      restWasRunning=false;
      releaseWakeLock();
      return originalResetTimer.apply(this,arguments);
    };
  }

  document.addEventListener('pointerdown',initAudio,{once:true});
  document.addEventListener('touchstart',initAudio,{once:true,passive:true});

  const observer=new MutationObserver(()=>{
    enhanceTimedSets();
    watchRestTimer();
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      enhanceTimedSets();
      watchRestTimer();
      if(activeSetTimer) requestWakeLock();
    }
  });

  enhanceTimedSets();
  watchRestTimer();
})();
