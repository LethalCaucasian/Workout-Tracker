const PLAN = [
 {day:1,name:"Push + Core A",color:"#ff4d5e",warm:"Arm circles, shoulder rolls, band pull-aparts, 5–8 easy push-ups.",
  exercises:[
   ["Weighted push-ups","3×6–10","straight body, chest, shoulders, triceps.","reps"],
   ["Resistance-band chest press","3×10–15","press forward from chest height.","reps"],
   ["Standing overhead press","3×8–12","kettlebell or band; brace core.","reps"],
   ["Band triceps pressdowns","3×10–15","high anchor; elbows pinned.","reps"],
   ["Kneeling band crunches","3×10–15","ribs toward pelvis.","reps"],
   ["Front plank","3×60–90 sec","rigid full-body core hold.","sec"]
  ]},
 {day:2,name:"Pull + Core A",color:"#248df5",warm:"Shoulder rolls, band pull-aparts, arm swings, 8–10 light band rows.",
  exercises:[
   ["High-anchor band lat pulldown","3×8–12","pull elbows to ribs.","reps"],
   ["One-arm kettlebell row","3×8–12 each side","brace with free hand.","reps"],
   ["Band face pulls","3×10–15","pull to forehead; rear delts.","reps"],
   ["Band biceps curls","3×10–15","elbows tucked.","reps"],
   ["Side plank","3×30–60 sec each side","lateral core stability.","sec"],
   ["Pallof press","3×10–15 each side","resist rotation.","reps"]
  ]},
 {day:3,name:"Legs + Core A",color:"#22b66f",warm:"Bodyweight squats ×10, alternating knee raises ×10 each, hip circles, easy calf raises ×10–15.",
  exercises:[
   ["Weighted squat","3×8–12","vest or goblet hold; quads and glutes.","reps"],
   ["Kettlebell Romanian deadlift","3×8–12","hips back; hamstrings/glutes.","reps"],
   ["Supported split squat","3×8–12 each leg","hold support for balance.","reps"],
   ["Standing calf raises","3×12–20","weighted if able.","reps"],
   ["Reverse crunches","3×10–15","curl pelvis upward.","reps"],
   ["Band crunches","3×10–15","ribs toward pelvis; controlled.","reps"]
  ]},
 {day:4,name:"Push + Core B",color:"#ff7f23",warm:"Arm circles, shoulder rolls, band pull-aparts, 5–8 easy push-ups.",
  exercises:[
   ["Feet-elevated push-ups","3×8–12","upper chest and shoulders.","reps"],
   ["Low-to-high band chest press/fly","3×12–15","anchor low and press up and inward.","reps"],
   ["Band lateral raises","3×12–20","side-delt focus.","reps"],
   ["Overhead band triceps extensions","3×10–15","full triceps stretch.","reps"],
   ["Lying knee raises / leg raises","3×10–15","lower-ab focus.","reps"],
   ["Hollow-body hold","3×20–40 sec","brace abs, low back down.","sec"]
  ]},
 {day:5,name:"Pull + Core B",color:"#7b3fe4",warm:"Shoulder rolls, band pull-aparts, arm swings, 8–10 easy band rows.",
  exercises:[
   ["Standing band row","3×8–12","chest-height anchor; squeeze shoulder blades.","reps"],
   ["Single-arm kettlebell row","3×8–12 each side","slower lowering phase.","reps"],
   ["Band reverse fly","3×12–15","rear delts and upper back.","reps"],
   ["Hammer curls with bands","3×10–15","neutral grip; biceps/forearms.","reps"],
   ["Russian twists","3×10–15 each side","controlled rotation.","reps"],
   ["Side plank with hip lift","3×8–12 each side","harder lateral-core progression.","reps"]
  ]},
 {day:6,name:"Legs + Core B",color:"#f1b316",warm:"Bodyweight squats ×10, hip hinges ×10, alternating knee raises ×10 each, easy reverse lunges ×5 each.",
  exercises:[
   ["Vest + kettlebell sumo squats","3×8–12","wide stance; glutes/adductors/quads.","reps"],
   ["Supported reverse lunges","3×8–12 each leg","hold wall or doorframe.","reps"],
   ["Weighted glute bridges","3×10–15","pause and squeeze at top.","reps"],
   ["Weighted wall sit","3×30–60 sec","quad burn and endurance.","sec"],
   ["Band crunches","3×10–15","direct abs.","reps"],
   ["Bird dogs","3×8–12 each side","core and back stability.","reps"]
  ]},
 {day:7,name:"Core + Mobility / Recovery",color:"#20b8d5",warm:"Easy movement, relaxed breathing, then core and mobility.",
  exercises:[
   ["Front plank","3×45–60 sec","controlled full-body brace.","sec"],
   ["Side plank","3×30–45 sec each side","lateral stability.","sec"],
   ["Band crunches","3×10–15","ribs toward pelvis.","reps"],
   ["Reverse crunches","3×10–15","curl pelvis upward.","reps"],
   ["Pallof press","3×10–12 each side","anti-rotation core work.","reps"],
   ["Mobility sequence","~10 min","Cat-cow; child’s pose w/ side reach; half-kneeling hip flexor; bent-knee hamstring; figure-4 glute; doorway chest stretch.","sec"]
  ]}
];

const WARMUPS = {
  1: [
    ["Arm circles","easy","reps"],
    ["Shoulder rolls","easy","reps"],
    ["Band pull-aparts","easy","reps"],
    ["Easy push-ups","5–8 reps","reps"]
  ],
  2: [
    ["Shoulder rolls","easy","reps"],
    ["Band pull-aparts","easy","reps"],
    ["Arm swings","easy","reps"],
    ["Light band rows","8–10 reps","reps"]
  ],
  3: [
    ["Bodyweight squats","10 reps","reps"],
    ["Alternating knee raises","10 each side","reps"],
    ["Hip circles","easy","reps"],
    ["Easy calf raises","10–15 reps","reps"]
  ],
  4: [
    ["Arm circles","easy","reps"],
    ["Shoulder rolls","easy","reps"],
    ["Band pull-aparts","easy","reps"],
    ["Easy push-ups","5–8 reps","reps"]
  ],
  5: [
    ["Shoulder rolls","easy","reps"],
    ["Band pull-aparts","easy","reps"],
    ["Arm swings","easy","reps"],
    ["Easy band rows","8–10 reps","reps"]
  ],
  6: [
    ["Bodyweight squats","10 reps","reps"],
    ["Hip hinges","10 reps","reps"],
    ["Alternating knee raises","10 each side","reps"],
    ["Easy reverse lunges","5 each side","reps"]
  ],
  7: [
    ["Easy movement","time as needed","sec"],
    ["Relaxed breathing","time as needed","sec"]
  ]
};

const STORAGE_KEY="chatgpt_workout_tracker_v1";
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"selectedDay":1,"drafts":{},"history":[]}');
let timerLeft=60, timerId=null;

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1700)}
function fmtDate(d=new Date()){return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}
function selectedPlan(){return PLAN.find(p=>p.day===state.selectedDay)}
function warmupsForDay(day){return WARMUPS[day] || []}
function draftKey(){return "d"+state.selectedDay}
function getDraft(){
  const p=selectedPlan(), key=draftKey(), warmups=warmupsForDay(p.day);
  if(!state.drafts[key]){
    state.drafts[key]={date:new Date().toISOString().slice(0,10),notes:"",warmup:false,warmupEntries:warmups.map(()=>({weight:"",value:"",done:false})),sets:p.exercises.map(ex=>Array.from({length:3},()=>({weight:"",value:"",done:false})))};
  }
  if(!Array.isArray(state.drafts[key].warmupEntries)) state.drafts[key].warmupEntries=warmups.map(()=>({weight:"",value:"",done:false}));
  while(state.drafts[key].warmupEntries.length<warmups.length) state.drafts[key].warmupEntries.push({weight:"",value:"",done:false});
  if(state.drafts[key].warmupEntries.length>warmups.length) state.drafts[key].warmupEntries=state.drafts[key].warmupEntries.slice(0,warmups.length);
  while(state.drafts[key].sets.length<p.exercises.length) state.drafts[key].sets.push(Array.from({length:3},()=>({weight:"",value:"",done:false})));
  return state.drafts[key];
}
function renderDays(){
  const el=document.getElementById('days');
  el.innerHTML=PLAN.map(p=>`<button class="day ${p.day===state.selectedDay?'active':''}" style="--dayColor:${p.color}" onclick="selectDay(${p.day})"><strong>DAY ${p.day}</strong><small>${p.name}</small></button>`).join('');
}
window.selectDay=(d)=>{state.selectedDay=d;save();renderToday()}

function totals(){
  const p=selectedPlan(), d=getDraft();
  let doneSets=0,totalSets=0,reps=0,volume=0,doneEx=0;
  d.sets.forEach((sets,i)=>{
    let exDone=true;
    sets.forEach(s=>{
      totalSets++;
      if(s.done) doneSets++; else exDone=false;
      const v=parseFloat(s.value)||0, w=parseFloat(s.weight)||0;
      if(p.exercises[i][3]==="reps"){reps+=v; volume+=v*w}
    });
    if(exDone && sets.length) doneEx++;
  });
  return {doneSets,totalSets,reps,volume,doneEx};
}

function renderToday(){
  renderDays();
  const p=selectedPlan(), d=getDraft(), t=totals(), warmups=warmupsForDay(p.day);
  const html=[];
  html.push(`<div class="hero" style="border-color:${p.color}">
    <h1>DAY ${p.day} — ${p.name}</h1>
    <div class="sub">${fmtDate(new Date(d.date+"T12:00:00"))}</div>
    <div class="stats">
      <div class="stat"><b>${t.doneEx}/${p.exercises.length}</b><span>Exercises</span></div>
      <div class="stat"><b>${t.doneSets}/${t.totalSets}</b><span>Sets</span></div>
      <div class="stat"><b>${t.reps}</b><span>Reps</span></div>
      <div class="stat"><b>${Math.round(t.volume).toLocaleString()} lb</b><span>Volume</span></div>
    </div>
  </div>`);
  html.push(`<div class="warmup"><b>🔥 Warm-up</b><div>${p.warm}</div><div class="spacer"></div>`);
  warmups.forEach((w,i)=>{
    const entry=d.warmupEntries[i], type=w[2];
    html.push(`<div class="history-ex"><b>${w[0]}</b><div class="muted">${w[1]}</div>
      <div class="setrow">
        <div class="setlabel">Warm</div>
        <div class="field"><input inputmode="decimal" placeholder="weight" value="${entry.weight}" oninput="updateWarmup(${i},'weight',this.value)"><span>lb</span></div>
        <div class="field"><input inputmode="numeric" placeholder="${type==='sec'?'seconds':'reps'}" value="${entry.value}" oninput="updateWarmup(${i},'value',this.value)"><span>${type==='sec'?'sec':'reps'}</span></div>
        <button class="done ${entry.done?'on':''}" onclick="toggleWarmupEntry(${i})">${entry.done?'✓':'○'}</button>
      </div>
    </div>`);
  });
  html.push(`<div class="setactions"><button class="mini" onclick="toggleWarmup()">${d.warmup?'✓ Warm-up done':'Mark warm-up done'}</button></div></div>`);
  p.exercises.forEach((ex,i)=>{
    const type=ex[3];
    html.push(`<div class="exercise" style="--dayColor:${p.color}">
      <div class="exhead"><div class="num">${i+1}</div><div class="exinfo"><h3>${ex[0]}</h3><div class="target">${ex[1]}</div><div class="note">${ex[2]}</div></div></div>
      <div class="settable">`);
    d.sets[i].forEach((s,j)=>{
      html.push(`<div class="setrow">
        <div class="setlabel">Set ${j+1}</div>
        <div class="field"><input inputmode="decimal" placeholder="${type==='sec'?'load':'weight'}" value="${s.weight}" oninput="updateSet(${i},${j},'weight',this.value)"><span>lb</span></div>
        <div class="field"><input inputmode="numeric" placeholder="${type==='sec'?'seconds':'reps'}" value="${s.value}" oninput="updateSet(${i},${j},'value',this.value)"><span>${type==='sec'?'sec':'reps'}</span></div>
        <button class="done ${s.done?'on':''}" onclick="toggleSet(${i},${j})">${s.done?'✓':'○'}</button>
      </div>`);
    });
    html.push(`<div class="setactions"><button class="mini" onclick="addSet(${i})">+ Add set</button>${d.sets[i].length>1?`<button class="mini" onclick="removeSet(${i})">− Remove set</button>`:''}<button class="mini" onclick="copyPrevious(${i})">Use previous</button></div></div></div>`);
  });
  html.push(`<div class="bottomgrid">
    <div class="card"><h3>⏱ Rest timer</h3><div id="timer" class="timer">${formatTimer(timerLeft)}</div>
      <div class="toolbar"><button class="btn good" onclick="startTimer()">Start</button><button class="btn" onclick="resetTimer()">Reset</button></div>
      <div class="toolbar">${[30,45,60,90].map(n=>`<button class="mini" onclick="setTimer(${n})">${n}s</button>`).join('')}</div>
    </div>
    <div class="card"><h3>📝 Notes</h3><textarea placeholder="How did today feel?" oninput="updateNotes(this.value)">${d.notes||''}</textarea></div>
  </div>
  <div class="toolbar"><button class="btn good" onclick="saveWorkout()">Save Workout</button><button class="btn primary" onclick="copyCurrent()">Copy for ChatGPT</button><button class="btn danger" onclick="resetDay()">Reset Day</button></div>`);
  document.getElementById('todayContent').innerHTML=html.join('');
  save();
}
window.toggleWarmup=()=>{getDraft().warmup=!getDraft().warmup;save();renderToday()}
window.updateWarmup=(i,k,v)=>{getDraft().warmupEntries[i][k]=v;save()}
window.toggleWarmupEntry=(i)=>{getDraft().warmupEntries[i].done=!getDraft().warmupEntries[i].done;save();renderToday()}
window.updateSet=(i,j,k,v)=>{getDraft().sets[i][j][k]=v;save();updateSummaryOnly()}
window.toggleSet=(i,j)=>{getDraft().sets[i][j].done=!getDraft().sets[i][j].done;save();renderToday()}
window.addSet=(i)=>{getDraft().sets[i].push({weight:"",value:"",done:false});save();renderToday()}
window.removeSet=(i)=>{getDraft().sets[i].pop();save();renderToday()}
window.updateNotes=(v)=>{getDraft().notes=v;save()}
function updateSummaryOnly(){const t=totals();const stats=document.querySelectorAll('.stat b');if(stats.length===4){stats[0].textContent=`${t.doneEx}/${selectedPlan().exercises.length}`;stats[1].textContent=`${t.doneSets}/${t.totalSets}`;stats[2].textContent=t.reps;stats[3].textContent=`${Math.round(t.volume).toLocaleString()} lb`;}}
window.copyPrevious=(i)=>{
  const name=selectedPlan().exercises[i][0];
  const prev=[...state.history].reverse().find(h=>h.exercises.some(e=>e.name===name));
  if(!prev){toast("No previous workout found");return}
  const ex=prev.exercises.find(e=>e.name===name);
  getDraft().sets[i]=ex.sets.map(s=>({weight:String(s.weight??""),value:String(s.value??""),done:false}));
  save();renderToday();toast("Previous sets loaded");
}
window.resetDay=()=>{if(confirm("Clear this day's current entries?")){delete state.drafts[draftKey()];save();renderToday()}}
window.saveWorkout=()=>{
  const p=selectedPlan(), d=getDraft(), t=totals(), warmups=warmupsForDay(p.day);
  const entry={id:Date.now(),date:d.date,day:p.day,name:p.name,warmup:d.warmup,notes:d.notes||"",volume:t.volume,reps:t.reps,
    warmupEntries:warmups.map((w,i)=>({name:w[0],target:w[1],type:w[2],weight:parseFloat(d.warmupEntries[i].weight)||0,value:parseFloat(d.warmupEntries[i].value)||0,done:!!d.warmupEntries[i].done})),
    exercises:p.exercises.map((ex,i)=>({name:ex[0],target:ex[1],type:ex[3],sets:d.sets[i].map(s=>({weight:parseFloat(s.weight)||0,value:parseFloat(s.value)||0,done:!!s.done}))}))};
  state.history.push(entry); save(); renderHistory(); renderProgress(); toast("Workout saved");
}
function formatTimer(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
window.setTimer=(n)=>{clearInterval(timerId);timerId=null;timerLeft=n;renderToday()}
window.resetTimer=()=>{clearInterval(timerId);timerId=null;timerLeft=60;renderToday()}
window.startTimer=()=>{if(timerId)return;timerId=setInterval(()=>{timerLeft--;const el=document.getElementById('timer');if(el)el.textContent=formatTimer(timerLeft);if(timerLeft<=0){clearInterval(timerId);timerId=null;timerLeft=0;toast("Rest complete")}},1000)}

function formatWarmupEntry(e){
  const pieces=[];
  if(e.weight) pieces.push(`${e.weight} lb`);
  if(e.value) pieces.push(`${e.value} ${e.type==="sec"?"sec":"reps"}`);
  if(!pieces.length) pieces.push("not logged");
  if(e.done) pieces.push("✓");
  return pieces.join(" • ");
}

function summaryText(h){
  if(!h) return "No saved workouts yet.";
  const lines=[`${h.date} — Day ${h.day}: ${h.name}`];
  if(h.warmupEntries?.length){
    lines.push("Warm-up:");
    h.warmupEntries.forEach(e=>lines.push(`- ${e.name}: ${formatWarmupEntry(e)}`));
  } else if(h.warmup){
    lines.push("Warm-up: complete");
  }
  h.exercises.forEach(e=>{
    const sets=e.sets.map(s=>e.type==="sec" ? `${s.weight?`${s.weight} lb × `:""}${s.value}s${s.done?" ✓":""}` : `${s.weight?`${s.weight} lb × `:""}${s.value} reps${s.done?" ✓":""}`).join(" | ");
    lines.push(`${e.name}: ${sets}`);
  });
  lines.push(`Total reps: ${h.reps}`);
  lines.push(`Total volume: ${Math.round(h.volume).toLocaleString()} lb`);
  if(h.notes) lines.push(`Notes: ${h.notes}`);
  return lines.join("\n");
}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast("Copied")}catch{prompt("Copy this:",text)}}
window.copyCurrent=()=>{
  const p=selectedPlan(),d=getDraft(),t=totals(),warmups=warmupsForDay(p.day);
  const h={date:d.date,day:p.day,name:p.name,warmup:d.warmup,notes:d.notes,reps:t.reps,volume:t.volume,
    warmupEntries:warmups.map((w,i)=>({name:w[0],type:w[2],weight:parseFloat(d.warmupEntries[i].weight)||0,value:parseFloat(d.warmupEntries[i].value)||0,done:d.warmupEntries[i].done})),
    exercises:p.exercises.map((ex,i)=>({name:ex[0],type:ex[3],sets:d.sets[i].map(s=>({weight:parseFloat(s.weight)||0,value:parseFloat(s.value)||0,done:s.done}))}))};
  copyText(summaryText(h));
}

function renderHistory(){
  const el=document.getElementById('historyList');
  if(!state.history.length){el.innerHTML='<div class="card muted">No saved workouts yet.</div>';return}
  el.innerHTML=[...state.history].reverse().map(h=>`<div class="history-item">
    <h3>${h.date} — Day ${h.day}: ${h.name}</h3>
    <div class="muted">${h.reps} reps • ${Math.round(h.volume).toLocaleString()} lb volume</div>
    ${h.warmupEntries?.length?`<div class="history-ex"><b>Warm-up</b><div class="muted">${h.warmupEntries.map(e=>`${e.name}: ${formatWarmupEntry(e)}`).join("<br>")}</div></div>`:(h.warmup?'<div class="history-ex"><b>Warm-up</b><div class="muted">Complete</div></div>':'')}
    ${h.exercises.map(e=>`<div class="history-ex"><b>${e.name}</b><div class="muted">${e.sets.map(s=>e.type==="sec"?`${s.value}s${s.weight?` @ ${s.weight} lb`:""}`:`${s.weight||"BW"} × ${s.value}`).join(" • ")}</div></div>`).join('')}
    ${h.notes?`<div class="history-ex"><b>Notes:</b> ${h.notes}</div>`:''}
    <div class="toolbar"><button class="mini" onclick="copyHistory(${h.id})">Copy</button><button class="mini" onclick="deleteHistory(${h.id})">Delete</button></div>
  </div>`).join('');
}
window.copyHistory=(id)=>copyText(summaryText(state.history.find(h=>h.id===id)))
window.deleteHistory=(id)=>{if(confirm("Delete this saved workout?")){state.history=state.history.filter(h=>h.id!==id);save();renderHistory();renderProgress()}}

function renderProgress(){
  const by={};
  state.history.forEach(h=>h.exercises.forEach(e=>{
    if(!by[e.name]) by[e.name]={maxWeight:0,maxReps:0,maxSec:0,volume:0,sessions:0,type:e.type};
    const o=by[e.name];o.sessions++;
    e.sets.forEach(s=>{
      o.maxWeight=Math.max(o.maxWeight,s.weight||0);
      if(e.type==="sec") o.maxSec=Math.max(o.maxSec,s.value||0); else o.maxReps=Math.max(o.maxReps,s.value||0);
      if(e.type==="reps")o.volume+=(s.weight||0)*(s.value||0);
    });
  }));
  const el=document.getElementById('progressGrid');
  const keys=Object.keys(by);
  if(!keys.length){el.innerHTML='<div class="card muted">Save some workouts to build progress stats.</div>';return}
  el.innerHTML=keys.map(k=>{const o=by[k];return `<div class="pr"><h4>${k}</h4>
    <div class="big">${o.type==="sec"?`${o.maxSec}s`:`${o.maxWeight?`${o.maxWeight} lb`:`${o.maxReps} reps`}`}</div>
    <div class="muted">${o.type==="sec"?"Best hold":o.maxWeight?`Best weight • ${o.maxReps} max reps`:"Best reps"}<br>${o.sessions} saved session${o.sessions===1?"":"s"}${o.volume?` • ${Math.round(o.volume).toLocaleString()} lb total volume`:""}</div></div>`}).join('');
}

document.querySelectorAll('.tabbtn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tabbtn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));document.getElementById(b.dataset.tab).classList.add('active');
  if(b.dataset.tab==="history")renderHistory(); if(b.dataset.tab==="progress")renderProgress();
}));

document.getElementById('exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='workout-tracker-backup.json';a.click();URL.revokeObjectURL(a.href);
};
document.getElementById('importFile').onchange=(ev)=>{
  const f=ev.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.history||!x.drafts)throw 0;state=x;save();renderToday();renderHistory();renderProgress();toast("Data imported")}catch{alert("That file doesn't look like a valid workout tracker backup.")}};
  r.readAsText(f);
};
document.getElementById('copyBtn').onclick=()=>copyText(summaryText(state.history[state.history.length-1]));
document.getElementById('shareBtn').onclick=async()=>{
  const text=summaryText(state.history[state.history.length-1]);
  if(navigator.share){try{await navigator.share({title:"Workout Summary",text})}catch{}}
  else copyText(text);
};

renderToday(); renderHistory(); renderProgress();