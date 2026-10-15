(() => {
  if(typeof state === 'undefined') return;

  const SOUNDS = [
    {id:'pulse', label:'Pulse'},
    {id:'chime', label:'Double Chime'},
    {id:'digital', label:'Digital Beep'},
    {id:'bell', label:'Bell'},
    {id:'low', label:'Low Gong'}
  ];
  let audioCtx = null;

  function ensureState(){
    if(!SOUNDS.some(s=>s.id===state.timerSound)) state.timerSound='pulse';
  }
  function getCtx(){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx) return null;
    if(!audioCtx) audioCtx=new Ctx();
    if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  }
  function tone(ctx,{at=0,freq=880,duration=.16,type='sine',gain=.18,endFreq=null}){
    const now=ctx.currentTime, osc=ctx.createOscillator(), amp=ctx.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(freq,now+at);
    if(endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq,now+at+duration);
    amp.gain.setValueAtTime(.0001,now+at);
    amp.gain.exponentialRampToValueAtTime(Math.max(.001,gain),now+at+.012);
    amp.gain.exponentialRampToValueAtTime(.0001,now+at+duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now+at); osc.stop(now+at+duration+.02);
  }
  function play(id=state.timerSound,{vibrate=true}={}){
    ensureState();
    const sound=SOUNDS.some(s=>s.id===id)?id:'pulse';
    const ctx=getCtx();
    if(ctx){
      if(sound==='pulse'){
        [0,.22,.44].forEach((at,i)=>tone(ctx,{at,freq:i===2?1046:880,duration:.16,type:i===2?'square':'sine',gain:.20}));
      }else if(sound==='chime'){
        tone(ctx,{at:0,freq:659,duration:.42,type:'triangle',gain:.17});
        tone(ctx,{at:.18,freq:988,duration:.55,type:'sine',gain:.18});
      }else if(sound==='digital'){
        [0,.12,.24,.42].forEach((at,i)=>tone(ctx,{at,freq:i===3?1320:1180,duration:.085,type:'square',gain:.12}));
      }else if(sound==='bell'){
        tone(ctx,{at:0,freq:784,duration:.75,type:'sine',gain:.16});
        tone(ctx,{at:0,freq:1568,duration:.52,type:'triangle',gain:.07});
        tone(ctx,{at:.12,freq:1175,duration:.62,type:'sine',gain:.10});
      }else if(sound==='low'){
        tone(ctx,{at:0,freq:392,endFreq:294,duration:.95,type:'sine',gain:.20});
        tone(ctx,{at:.05,freq:196,endFreq:147,duration:1.05,type:'triangle',gain:.08});
      }
    }
    if(vibrate && navigator.vibrate) navigator.vibrate([180,80,180]);
  }
  function setSelected(id){
    if(!SOUNDS.some(s=>s.id===id)) return;
    state.timerSound=id;
    if(typeof save==='function') save();
    syncUi();
  }
  function preview(id){
    setSelected(id);
    play(id,{vibrate:false});
  }

  const style=document.createElement('style');
  style.textContent=`
    .timer-sound-card{margin-top:10px}
    .timer-sound-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .timer-sound-row select{flex:1;min-width:180px;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:9px;padding:9px;outline:none}
    .timer-sound-preview-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:8px}
    .timer-sound-choice{border:1px solid #2d4565;background:#122035;color:#dce7f4;border-radius:8px;padding:8px 6px;font-size:11px;font-weight:800}
    .timer-sound-choice.active{border-color:#42d38a;color:#42d38a;background:#10271e}
    @media(max-width:620px){.timer-sound-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  function ensureUi(){
    const settings=document.getElementById('settings');
    if(!settings || document.getElementById('timerSoundCard')) return;
    const card=document.createElement('div');
    card.id='timerSoundCard'; card.className='card timer-sound-card';
    card.innerHTML=`<h3>🔊 Timer Sound</h3><p class="install-note">Choose the alert used by exercise, warm-up, cooldown, and rest timers. Tap any sound below to preview it.</p><div class="timer-sound-row"><select id="timerSoundSelect">${SOUNDS.map(s=>`<option value="${s.id}">${s.label}</option>`).join('')}</select><button class="btn" id="timerSoundPreview" type="button">Preview</button></div><div class="timer-sound-preview-grid">${SOUNDS.map(s=>`<button class="timer-sound-choice" type="button" data-sound="${s.id}">▶ ${s.label}</button>`).join('')}</div>`;
    settings.appendChild(card);
    card.querySelector('#timerSoundSelect').onchange=e=>setSelected(e.target.value);
    card.querySelector('#timerSoundPreview').onclick=()=>preview(state.timerSound);
    card.querySelectorAll('[data-sound]').forEach(btn=>btn.onclick=()=>preview(btn.dataset.sound));
    syncUi();
  }
  function syncUi(){
    ensureState();
    const sel=document.getElementById('timerSoundSelect'); if(sel && sel.value!==state.timerSound) sel.value=state.timerSound;
    document.querySelectorAll('.timer-sound-choice').forEach(btn=>btn.classList.toggle('active',btn.dataset.sound===state.timerSound));
  }

  ensureState();
  window.WorkoutTimerAudio={sounds:SOUNDS,play,preview,getSelected:()=>state.timerSound,setSelected};
  document.addEventListener('pointerdown',()=>getCtx(),{once:true});
  document.addEventListener('touchstart',()=>getCtx(),{once:true,passive:true});
  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{ensureState();syncUi();},0));
  ensureUi(); syncUi();
})();
