(() => {
  if(typeof state === 'undefined') return;

  const SOUNDS = [
    {id:'pulse', label:'Urgent Triple Beep'},
    {id:'chime', label:'High-Low Siren'},
    {id:'digital', label:'Rapid Digital Alarm'},
    {id:'bell', label:'Alarm Bell'},
    {id:'low', label:'Heavy Buzzer'}
  ];
  const SAMPLE_RATE = 32000;
  const mediaAudio = new Audio();
  mediaAudio.preload = 'auto';
  mediaAudio.playsInline = true;
  const mediaCache = new Map();
  let audioCtx = null;
  let primed = false;
  let releaseTimer = null;

  function ensureState(){
    if(!SOUNDS.some(s=>s.id===state.timerSound)) state.timerSound='pulse';
    const repeats=parseInt(state.timerSoundRepeats,10);
    state.timerSoundRepeats=Number.isFinite(repeats)?Math.min(5,Math.max(1,repeats)):1;
  }

  function setAudioSession(type){
    try{
      if(navigator.audioSession && 'type' in navigator.audioSession) navigator.audioSession.type=type;
    }catch{}
  }

  function releaseMediaSession(){
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(()=>{
      try{mediaAudio.pause();}catch{}
      try{mediaAudio.removeAttribute('src');mediaAudio.load();}catch{}
      setAudioSession('ambient');
    },120);
  }

  function patternLength(sound){
    return sound==='pulse' ? .86 : sound==='chime' ? 1.04 : sound==='digital' ? .82 : sound==='bell' ? 1.18 : 1.25;
  }

  function alertLength(sound,repeats){
    const gap=.24,span=patternLength(sound)+gap;
    return Math.max(.1,repeats*span-gap+.08);
  }

  function soundEvents(sound){
    if(sound==='pulse') return [
      [0,.18,1220,1220,'square',.82],[0,.18,610,610,'triangle',.30],
      [.22,.18,1220,1220,'square',.82],[.22,.18,610,610,'triangle',.30],
      [.44,.22,1540,1540,'square',.90],[.44,.22,770,770,'triangle',.34]
    ];
    if(sound==='chime') return [
      [0,.27,1480,1050,'saw',.72],[0,.27,740,525,'square',.26],
      [.31,.27,690,980,'saw',.74],[.31,.27,345,490,'square',.27],
      [.62,.29,1480,1080,'saw',.76],[.62,.29,740,540,'square',.28]
    ];
    if(sound==='digital') return [
      [0,.075,1650,1650,'square',.86],[.11,.075,1650,1650,'square',.86],
      [.22,.075,1650,1650,'square',.86],[.33,.075,1650,1650,'square',.86],
      [.50,.085,2050,2050,'square',.92],[.62,.085,2050,2050,'square',.92]
    ];
    if(sound==='bell') return [
      [0,.40,1040,860,'sine',.72],[0,.30,2080,1760,'triangle',.40],[.03,.34,1560,1260,'sine',.44],
      [.38,.40,1040,860,'sine',.72],[.38,.30,2080,1760,'triangle',.40],[.41,.34,1560,1260,'sine',.44],
      [.76,.40,1180,920,'sine',.78],[.76,.30,2360,1840,'triangle',.44]
    ];
    return [
      [0,.34,260,185,'saw',.84],[0,.36,130,92,'square',.40],
      [.42,.34,260,185,'saw',.84],[.42,.36,130,92,'square',.40],
      [.84,.40,330,150,'saw',.90],[.84,.42,165,75,'square',.44]
    ];
  }

  function waveValue(type,phase){
    const p=phase-Math.floor(phase);
    if(type==='square') return p<.5?1:-1;
    if(type==='saw') return 2*p-1;
    if(type==='triangle') return 1-4*Math.abs(p-.5);
    return Math.sin(2*Math.PI*p);
  }

  function synth(sound,repeats){
    const duration=alertLength(sound,repeats);
    const gap=.24, span=patternLength(sound)+gap;
    const out=new Float32Array(Math.ceil(duration*SAMPLE_RATE));
    const baseEvents=soundEvents(sound);
    for(let r=0;r<repeats;r++){
      const base=r*span;
      for(const [start,dur,f0,f1,type,amp] of baseEvents){
        const from=Math.max(0,Math.floor((base+start)*SAMPLE_RATE));
        const count=Math.max(1,Math.floor(dur*SAMPLE_RATE));
        let phase=0;
        for(let n=0;n<count && from+n<out.length;n++){
          const t=n/count;
          const freq=f0+(f1-f0)*t;
          phase+=freq/SAMPLE_RATE;
          const attack=Math.min(1,n/(SAMPLE_RATE*.008));
          const release=Math.min(1,(count-n)/(SAMPLE_RATE*.035));
          const env=Math.min(attack,release);
          out[from+n]+=waveValue(type,phase)*amp*env;
        }
      }
    }
    let peak=.001;
    for(let i=0;i<out.length;i++) peak=Math.max(peak,Math.abs(out[i]));
    const scale=Math.min(1,.94/peak);
    for(let i=0;i<out.length;i++) out[i]*=scale;
    return out;
  }

  function wavBlob(samples){
    const bytesPerSample=2, dataSize=samples.length*bytesPerSample;
    const buffer=new ArrayBuffer(44+dataSize), view=new DataView(buffer);
    const text=(offset,value)=>{for(let i=0;i<value.length;i++) view.setUint8(offset+i,value.charCodeAt(i));};
    text(0,'RIFF'); view.setUint32(4,36+dataSize,true); text(8,'WAVE'); text(12,'fmt ');
    view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
    view.setUint32(24,SAMPLE_RATE,true); view.setUint32(28,SAMPLE_RATE*bytesPerSample,true);
    view.setUint16(32,bytesPerSample,true); view.setUint16(34,16,true); text(36,'data'); view.setUint32(40,dataSize,true);
    for(let i=0;i<samples.length;i++){
      const s=Math.max(-1,Math.min(1,samples[i]));
      view.setInt16(44+i*2,s<0?s*0x8000:s*0x7fff,true);
    }
    return new Blob([buffer],{type:'audio/wav'});
  }

  function mediaUrl(sound,repeats){
    const key=`${sound}:${repeats}`;
    if(mediaCache.has(key)) return mediaCache.get(key);
    const url=URL.createObjectURL(wavBlob(synth(sound,repeats)));
    mediaCache.set(key,url);
    return url;
  }

  function silentUrl(){
    const key='__prime__';
    if(mediaCache.has(key)) return mediaCache.get(key);
    const url=URL.createObjectURL(wavBlob(new Float32Array(Math.floor(SAMPLE_RATE*.06))));
    mediaCache.set(key,url);
    return url;
  }

  function primeMediaChannel(){
    if(primed) return;
    primed=true;
    setAudioSession('ambient');
    mediaAudio.src=silentUrl();
    mediaAudio.volume=1;
    const p=mediaAudio.play();
    if(p?.then) p.then(()=>setTimeout(()=>{
      mediaAudio.pause();
      mediaAudio.currentTime=0;
      setAudioSession('ambient');
    },75)).catch(()=>{primed=false;});
  }

  function getCtx(){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx) return null;
    if(!audioCtx) audioCtx=new Ctx();
    if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  }

  function fallbackTone(ctx,{at=0,freq=880,duration=.16,type='sine',gain=.18,endFreq=null}){
    const now=ctx.currentTime, osc=ctx.createOscillator(), amp=ctx.createGain();
    osc.type=type==='saw'?'sawtooth':type;
    osc.frequency.setValueAtTime(Math.max(1,freq),now+at);
    if(endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),now+at+duration);
    amp.gain.setValueAtTime(.0001,now+at);
    amp.gain.exponentialRampToValueAtTime(Math.max(.001,gain),now+at+.01);
    amp.gain.exponentialRampToValueAtTime(.0001,now+at+duration);
    osc.connect(amp).connect(ctx.destination); osc.start(now+at); osc.stop(now+at+duration+.03);
  }

  function fallbackWebAudio(sound,repeats){
    const ctx=getCtx(); if(!ctx) return;
    const span=patternLength(sound)+.24;
    const events=soundEvents(sound);
    for(let r=0;r<repeats;r++){
      for(const [start,dur,f0,f1,type,amp] of events){
        fallbackTone(ctx,{at:r*span+start,freq:f0,endFreq:f1!==f0?f1:null,duration:dur,type,gain:Math.min(.32,amp*.34)});
      }
    }
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(releaseMediaSession,Math.ceil(alertLength(sound,repeats)*1000)+180);
  }

  function vibrationPattern(repeats){
    const pattern=[];
    for(let i=0;i<repeats;i++){
      pattern.push(220,90,220,90,320);
      if(i<repeats-1) pattern.push(260);
    }
    return pattern;
  }

  function playMedia(sound,repeats){
    clearTimeout(releaseTimer);
    // Use a mixable transient session so Apple Music can keep playing underneath
    // the timer alert instead of needing to be restarted afterward.
    setAudioSession('transient');
    mediaAudio.pause();
    mediaAudio.src=mediaUrl(sound,repeats);
    mediaAudio.currentTime=0;
    mediaAudio.volume=1;
    mediaAudio.onended=releaseMediaSession;
    const attempt=mediaAudio.play();
    if(attempt?.catch) attempt.catch(()=>fallbackWebAudio(sound,repeats));
    return attempt;
  }

  function play(id=state.timerSound,{vibrate=true,repeats=null}={}){
    ensureState();
    const sound=SOUNDS.some(s=>s.id===id)?id:'pulse';
    const count=Math.min(5,Math.max(1,parseInt(repeats ?? state.timerSoundRepeats,10)||1));
    playMedia(sound,count);
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
    primeMediaChannel();
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
    .timer-ios-note{margin-top:9px;padding:8px 10px;border:1px solid #2d4565;border-radius:9px;background:#0b1727;color:#9fb1c8;font-size:11px;line-height:1.4}
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
    card.innerHTML=`<h3>🔊 Timer Sound</h3><p class="install-note">Choose a stronger alert for exercise, warm-up, cooldown, and rest timers. Preview uses your selected repeat count.</p><div class="timer-sound-row"><select id="timerSoundSelect">${SOUNDS.map(s=>`<option value="${s.id}">${s.label}</option>`).join('')}</select><button class="btn" id="timerSoundPreview" type="button">Preview Selected</button></div><div class="timer-repeat-row"><label for="timerSoundRepeats">Repeat alert</label><select id="timerSoundRepeats">${[1,2,3,4,5].map(n=>`<option value="${n}">${n}×</option>`).join('')}</select><span class="timer-repeat-note">Repeats the full alert up to five times so it is harder to miss.</span></div><div class="timer-sound-preview-grid">${SOUNDS.map(s=>`<button class="timer-sound-choice" type="button" data-sound="${s.id}">▶ ${s.label}</button>`).join('')}</div><div class="timer-ios-note">iPhone test mode: timer alerts now use a mixable transient session so Apple Music can keep playing underneath instead of stopping. Silent Mode may mute the timer alert.</div>`;
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
  window.WorkoutTimerAudio={sounds:SOUNDS,play,preview,unlock:primeMediaChannel,getSelected:()=>state.timerSound,setSelected,getRepeats:()=>state.timerSoundRepeats,setRepeats};
  document.addEventListener('pointerdown',primeMediaChannel,{once:true});
  document.addEventListener('touchstart',primeMediaChannel,{once:true,passive:true});
  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{ensureState();syncUi();},0));
  ensureUi(); syncUi();
})();