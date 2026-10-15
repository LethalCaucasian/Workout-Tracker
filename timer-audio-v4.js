(() => {
  if(typeof state === 'undefined') return;

  const SOUNDS = [
    {id:'pulse', label:'Urgent Triple Beep'},
    {id:'chime', label:'High-Low Siren'},
    {id:'digital', label:'Rapid Digital Alarm'},
    {id:'bell', label:'Alarm Bell'},
    {id:'low', label:'Heavy Buzzer'}
  ];
  let audioCtx = null;

  function ensureState(){
    if(!SOUNDS.some(s=>s.id===state.timerSound)) state.timerSound='pulse';
    const repeats=parseInt(state.timerSoundRepeats,10);
    state.timerSoundRepeats=Number.isFinite(repeats)?Math.min(5,Math.max(1,repeats)):1;
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
    osc.frequency.setValueAtTime(Math.max(1,freq),now+at);
    if(endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),now+at+duration);
    amp.gain.setValueAtTime(.0001,now+at);
    amp.gain.exponentialRampToValueAtTime(Math.max(.001,gain),now+at+.01);
    amp.gain.exponentialRampToValueAtTime(.0001,now+at+duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now+at); osc.stop(now+at+duration+.03);
  }
  function patternLength(sound){
    return sound==='pulse' ? 0.9 : sound==='chime' ? 1.15 : sound==='digital' ? 0.95 : sound==='bell' ? 1.25 : 1.35;
  }
  function schedulePattern(ctx,sound,base=0){
    if(sound==='pulse'){
      [0,.23,.46].forEach((offset,i)=>{
        tone(ctx,{at:base+offset,freq:i===2?1420:1180,duration:.19,type:'square',gain:.27});
        tone(ctx,{at:base+offset,freq:i===2?710:590,duration:.19,type:'triangle',gain:.10});
      });
    }else if(sound==='chime'){
      [0,.28,.56].forEach((offset,i)=>{
        const high=i%2===0;
        tone(ctx,{at:base+offset,freq:high?1380:720,endFreq:high?1120:930,duration:.28,type:'sawtooth',gain:.20});
        tone(ctx,{at:base+offset,freq:high?690:360,endFreq:high?560:465,duration:.28,type:'square',gain:.08});
      });
    }else if(sound==='digital'){
      [0,.11,.22,.33,.52,.63].forEach((offset,i)=>{
        tone(ctx,{at:base+offset,freq:i<4?1560:1860,duration:.075,type:'square',gain:.22});
        tone(ctx,{at:base+offset,freq:i<4?780:930,duration:.075,type:'square',gain:.07});
      });
    }else if(sound==='bell'){
      [0,.34,.68].forEach(offset=>{
        tone(ctx,{at:base+offset,freq:980,duration:.42,type:'sine',gain:.22});
        tone(ctx,{at:base+offset,freq:1960,duration:.28,type:'triangle',gain:.10});
        tone(ctx,{at:base+offset+.04,freq:1470,duration:.34,type:'sine',gain:.11});
      });
    }else if(sound==='low'){
      [0,.42].forEach(offset=>{
        tone(ctx,{at:base+offset,freq:245,endFreq:185,duration:.34,type:'sawtooth',gain:.26});
        tone(ctx,{at:base+offset,freq:122,endFreq:92,duration:.38,type:'square',gain:.12});
      });
      tone(ctx,{at:base+.84,freq:310,endFreq:155,duration:.42,type:'sawtooth',gain:.24});
    }
  }
  function vibrationPattern(repeats){
    const pattern=[];
    for(let i=0;i<repeats;i++){
      pattern.push(220,90,220,90,320);
      if(i<repeats-1) pattern.push(260);
    }
    return pattern;
  }
  function play(id=state.timerSound,{vibrate=true,repeats=null}={}){
    ensureState();
    const sound=SOUNDS.some(s=>s.id===id)?id:'pulse';
    const count=Math.min(5,Math.max(1,parseInt(repeats ?? state.timerSoundRepeats,10)||1));
    const ctx=getCtx();
    if(ctx){
      const spacing=patternLength(sound)+.28;
      for(let i=0;i<count;i++) schedulePattern(ctx,sound,i*spacing);
    }
    if(vibrate && navigator.vibrate) navigator.vibrate(vibrationPattern(count));
  }
  function setSelected(id){
    if(!SOUNDS.some(s=>s.id===id)) return;
    state.timerSound=id;
    if(typeof save==='function') save();
    syncUi();
  }
  function setRepeats(value){
    state.timerSoundRepeats=Math.min(5,Math.max(1,parseInt(value,10)||1));
    if(typeof save==='function') save();
    syncUi();
  }
  function preview(id){
    setSelected(id);
    play(id,{vibrate:false,repeats:state.timerSoundRepeats});
  }

  const style=document.createElement('style');
  style.textContent=`
    .timer-sound-card{margin-top:10px}
    .timer-sound-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .timer-sound-row select{flex:1;min-width:180px;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:9px;padding:9px;outline:none}
    .timer-repeat-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding:9px 10px;border:1px solid #243651;border-radius:10px;background:#0a1422}
    .timer-repeat-row label{font-size:12px;font-weight:800;color:#aebcd0}
    .timer-repeat-row select{min-width:90px;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:9px;padding:8px;outline:none}
    .timer-repeat-note{font-size:11px;color:#8293aa}
    .timer-sound-preview-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:8px}
    .timer-sound-choice{border:1px solid #2d4565;background:#122035;color:#dce7f4;border-radius:8px;padding:8px 6px;font-size:11px;font-weight:800}
    .timer-sound-choice.active{border-color:#42d38a;color:#42d38a;background:#10271e}
    @media(max-width:620px){.timer-sound-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.timer-repeat-row{align-items:stretch}.timer-repeat-note{width:100%}}
  `;
  document.head.appendChild(style);

  function ensureUi(){
    const settings=document.getElementById('settings');
    if(!settings || document.getElementById('timerSoundCard')) return;
    const card=document.createElement('div');
    card.id='timerSoundCard'; card.className='card timer-sound-card';
    card.innerHTML=`<h3>🔊 Timer Sound</h3><p class="install-note">Choose a stronger alert for exercise, warm-up, cooldown, and rest timers. Preview uses your selected repeat count.</p><div class="timer-sound-row"><select id="timerSoundSelect">${SOUNDS.map(s=>`<option value="${s.id}">${s.label}</option>`).join('')}</select><button class="btn" id="timerSoundPreview" type="button">Preview Selected</button></div><div class="timer-repeat-row"><label for="timerSoundRepeats">Repeat alert</label><select id="timerSoundRepeats">${[1,2,3,4,5].map(n=>`<option value="${n}">${n}×</option>`).join('')}</select><span class="timer-repeat-note">Repeats the full alert up to five times so it is harder to miss.</span></div><div class="timer-sound-preview-grid">${SOUNDS.map(s=>`<button class="timer-sound-choice" type="button" data-sound="${s.id}">▶ ${s.label}</button>`).join('')}</div>`;
    settings.appendChild(card);
    card.querySelector('#timerSoundSelect').onchange=e=>setSelected(e.target.value);
    card.querySelector('#timerSoundRepeats').onchange=e=>setRepeats(e.target.value);
    card.querySelector('#timerSoundPreview').onclick=()=>preview(state.timerSound);
    card.querySelectorAll('[data-sound]').forEach(btn=>btn.onclick=()=>preview(btn.dataset.sound));
    syncUi();
  }
  function syncUi(){
    ensureState();
    const sel=document.getElementById('timerSoundSelect'); if(sel && sel.value!==state.timerSound) sel.value=state.timerSound;
    const repeatSel=document.getElementById('timerSoundRepeats'); if(repeatSel && repeatSel.value!==String(state.timerSoundRepeats)) repeatSel.value=String(state.timerSoundRepeats);
    document.querySelectorAll('.timer-sound-choice').forEach(btn=>btn.classList.toggle('active',btn.dataset.sound===state.timerSound));
  }

  ensureState();
  window.WorkoutTimerAudio={sounds:SOUNDS,play,preview,getSelected:()=>state.timerSound,setSelected,getRepeats:()=>state.timerSoundRepeats,setRepeats};
  document.addEventListener('pointerdown',()=>getCtx(),{once:true});
  document.addEventListener('touchstart',()=>getCtx(),{once:true,passive:true});
  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{ensureState();syncUi();},0));
  ensureUi(); syncUi();
})();
