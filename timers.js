(() => {
  let audioCtx = null;
  let activeSetTimer = null;
  let wakeLock = null;

  let restSeconds = 60;
  let restEndAt = null;
  let restInterval = null;
  let restRunning = false;

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

    .mini-rest-bar{
      display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;
      margin:-2px 0 10px;padding:7px 9px;
      border:1px solid #243651;border-radius:10px;
      background:#0a1422;
    }
    .mini-rest-label{
      color:#99a8bc;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.45px;
    }
    .mini-rest-display{
      min-width:54px;text-align:center;font-weight:900;font-variant-numeric:tabular-nums;
      font-size:16px;color:#f3f6fb;
    }
    .mini-rest-display.running{color:#42d38a}
    .mini-rest-bar .mini{
      padding:5px 8px;font-size:11px;border-radius:7px;
    }
    .mini-rest-stop{color:#ff9dab!important}

    @media (max-width:760px){
      .timed-set-controls{margin-left:38px}
      .mini-rest-bar{gap:5px;padding:6px 7px}
      .mini-rest-bar .mini{padding:5px 7px}
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

  function updateRestDisplays(value){
    document.querySelectorAll('.mini-rest-display').forEach(el=>{
      el.textContent=fmt(value);
      el.classList.toggle('running',restRunning);
    });
  }

  function stopRest(reset=true){
    if(restInterval){clearInterval(restInterval);restInterval=null;}
    restRunning=false;
    restEndAt=null;
    if(reset) restSeconds=60;
    updateRestDisplays(restSeconds);
    if(!activeSetTimer) releaseWakeLock();
  }

  function startRest(seconds){
    initAudio();
    if(restInterval){clearInterval(restInterval);restInterval=null;}
    restSeconds=Math.max(1,parseInt(seconds,10)||60);
    restEndAt=Date.now()+restSeconds*1000;
    restRunning=true;
    requestWakeLock();
    updateRestDisplays(restSeconds);

    const tick=()=>{
      const left=Math.max(0,Math.ceil((restEndAt-Date.now())/1000));
      restSeconds=left;
      updateRestDisplays(left);
      if(left<=0){
        if(restInterval){clearInterval(restInterval);restInterval=null;}
        restRunning=false;
        restEndAt=null;
        updateRestDisplays(0);
        if(!activeSetTimer) releaseWakeLock();
        playAlarm();
        if(typeof toast === 'function') toast('Rest complete');
      }
    };

    restInterval=setInterval(tick,250);
    tick();
  }

  window.startMiniRest=startRest;
  window.stopMiniRest=()=>stopRest(true);

  function addCompactRestBars(){
    const content=document.getElementById('todayContent');
    if(!content) return;

    const exercises=[...content.querySelectorAll('.exercise')];
    exercises.forEach((card,index)=>{
      let next=card.nextElementSibling;
      if(next && next.classList.contains('mini-rest-bar')) return;

      const bar=document.createElement('div');
      bar.className='mini-rest-bar';
      bar.innerHTML=`
        <span class="mini-rest-label">Rest</span>
        <span class="mini-rest-display ${restRunning?'running':''}">${fmt(restSeconds)}</span>
        <button class="mini" type="button" onclick="startMiniRest(30)">30</button>
        <button class="mini" type="button" onclick="startMiniRest(45)">45</button>
        <button class="mini" type="button" onclick="startMiniRest(60)">60</button>
        <button class="mini" type="button" onclick="startMiniRest(90)">90</button>
        <button class="mini mini-rest-stop" type="button" onclick="stopMiniRest()">Reset</button>`;
      card.insertAdjacentElement('afterend',bar);
    });

    // Remove the original large rest-timer card now that the compact controls
    // are available between every exercise.
    const bigTimer=document.getElementById('timer');
    const bigCard=bigTimer?.closest('.card');
    const bottomGrid=bigCard?.parentElement;
    if(bigCard) bigCard.remove();
    if(bottomGrid && bottomGrid.classList.contains('bottomgrid')){
      bottomGrid.style.gridTemplateColumns='1fr';
    }

    updateRestDisplays(restSeconds);
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
    if(!restRunning) releaseWakeLock();
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
        if(!restRunning) releaseWakeLock();
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

  document.addEventListener('pointerdown',initAudio,{once:true});
  document.addEventListener('touchstart',initAudio,{once:true,passive:true});

  let applying=false;
  const observer=new MutationObserver(()=>{
    if(applying) return;
    applying=true;
    try{
      enhanceTimedSets();
      addCompactRestBars();
    } finally {
      applying=false;
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      enhanceTimedSets();
      addCompactRestBars();
      if(activeSetTimer || restRunning) requestWakeLock();
      if(restRunning && restEndAt){
        restSeconds=Math.max(0,Math.ceil((restEndAt-Date.now())/1000));
        updateRestDisplays(restSeconds);
      }
    }
  });

  enhanceTimedSets();
  addCompactRestBars();
})();
