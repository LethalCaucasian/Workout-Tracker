(() => {
  if(typeof state==='undefined') return;

  const style=document.createElement('style');
  style.textContent=`
    .exercise-detail-overlay{position:fixed;inset:0;z-index:10000;background:rgba(3,8,15,.78);display:none;align-items:flex-start;justify-content:center;padding:18px;overflow:auto}
    .exercise-detail-overlay.show{display:flex}
    .exercise-detail-modal{width:min(760px,100%);margin:auto;background:#0d1827;border:1px solid #2a3e5b;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.48);overflow:hidden}
    .exercise-detail-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px;background:#0d1827;border-bottom:1px solid #20314b}
    .exercise-detail-head h2{margin:0;font-size:22px}.exercise-detail-sub{margin-top:3px;color:#91a2b8;font-size:12px}
    .exercise-detail-close{flex:0 0 auto;width:36px;height:36px;border:1px solid #314661;border-radius:10px;background:#101f33;color:#dbe7f5;font-size:22px;line-height:1}
    .exercise-detail-body{padding:14px}
    .exercise-detail-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px}
    .exercise-detail-metric{border:1px solid #243651;background:#091321;border-radius:10px;padding:10px;min-width:0}.exercise-detail-metric b{display:block;font-size:18px}.exercise-detail-metric span{display:block;margin-top:3px;color:#91a2b8;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.35px}
    .exercise-detail-section{margin-top:12px}.exercise-detail-section h3{margin:0 0 7px;font-size:15px}
    .exercise-detail-chart{border:1px solid #243651;background:#091321;border-radius:12px;padding:8px;margin-bottom:9px}.exercise-detail-chart-title{font-size:11px;font-weight:900;color:#a8b7c9;text-transform:uppercase;letter-spacing:.4px;margin:2px 4px 6px}.exercise-detail-chart svg{display:block;width:100%;height:auto}.exercise-detail-chart .grid{stroke:#22334c;stroke-width:1}.exercise-detail-chart .line{fill:none;stroke:#3ba8ff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.exercise-detail-chart .dot{fill:#42d38a;stroke:#091321;stroke-width:2}.exercise-detail-chart text{fill:#91a2b8;font-size:10px;font-family:Inter,system-ui,sans-serif}
    .exercise-session-list{display:flex;flex-direction:column;gap:8px}.exercise-session{border:1px solid #243651;background:#091321;border-radius:11px;padding:10px}.exercise-session-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:7px}.exercise-session-date{font-weight:900}.exercise-session-best{font-size:11px;color:#79bfff;text-align:right}.exercise-set-list{display:flex;flex-direction:column;gap:5px}.exercise-set-row{display:grid;grid-template-columns:52px 1fr;gap:8px;padding:6px 7px;border-radius:7px;background:#0d1a2a;font-size:12px}.exercise-set-row span:first-child{color:#8294aa;font-weight:800}.exercise-detail-empty{padding:24px;text-align:center;color:#91a2b8}
    @media(max-width:620px){.exercise-detail-overlay{padding:8px}.exercise-detail-modal{border-radius:13px}.exercise-detail-body{padding:10px}.exercise-detail-metrics{grid-template-columns:1fr 1fr}.exercise-detail-head h2{font-size:19px}}
  `;
  document.head.appendChild(style);

  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function slug(v){return String(v||'exercise').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'exercise';}
  function fmt(v){const n=Number(v||0);return Number.isInteger(n)?String(n):String(Math.round(n*100)/100);}
  function dateLabel(date){const d=new Date(`${date}T12:00:00`);return Number.isNaN(d.getTime())?date:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
  function modeFor(ex,set){const t=['reps','sec','min','mixed'].includes(ex?.type)?ex.type:'reps';return t==='mixed'&&['reps','sec','min'].includes(set?.mode)?set.mode:t==='mixed'?'reps':t;}
  function keyFor(ex){return ex?.exerciseId||`legacy-${slug(ex?.name)}`;}

  function sessionsFor(key){
    const rows=[];
    (state.history||[]).forEach((h,historyIndex)=>{
      if(window.WorkoutProgressTools?.inRange && !WorkoutProgressTools.inRange(h.date))return;
      (h.exercises||[]).forEach((ex,exerciseIndex)=>{
        if(keyFor(ex)!==key)return;
        let maxWeight=0,maxReps=0,maxSeconds=0;
        const sets=(ex.sets||[]).map((s,i)=>{
          const mode=modeFor(ex,s),weight=Number(s?.weight||0),value=Number(s?.value||0),seconds=mode==='min'?value*60:mode==='sec'?value:0;
          maxWeight=Math.max(maxWeight,weight);
          if(mode==='reps')maxReps=Math.max(maxReps,value);else maxSeconds=Math.max(maxSeconds,seconds);
          return {index:i+1,mode,weight,value,seconds,done:s?.done};
        });
        rows.push({date:String(h.date||''),name:ex.name||'Exercise',sets,maxWeight,maxReps,maxSeconds,historyIndex,exerciseIndex});
      });
    });
    rows.sort((a,b)=>a.date.localeCompare(b.date)||a.historyIndex-b.historyIndex||a.exerciseIndex-b.exerciseIndex);
    return rows;
  }

  function setText(s){
    const weight=s.weight>0?`${fmt(s.weight)} lb`:'';
    let value='';
    if(s.mode==='reps')value=s.value?`${fmt(s.value)} reps`:'';
    else if(s.mode==='min')value=s.value?`${fmt(s.value)} min`:'';
    else value=s.value?`${fmt(s.value)} sec`:'';
    if(weight&&value)return `${weight} × ${value}`;
    return weight||value||'—';
  }

  function bestText(s){
    const parts=[];
    if(s.maxWeight)parts.push(`${fmt(s.maxWeight)} lb`);
    if(s.maxReps)parts.push(`${fmt(s.maxReps)} reps`);
    if(s.maxSeconds)parts.push(`${fmt(s.maxSeconds)} sec`);
    return parts.join(' • ')||'No recorded value';
  }

  function chart(title,sessions,field,unit){
    const pts=sessions.filter(s=>Number(s[field])>0).map(s=>({date:s.date,value:Number(s[field])}));
    if(!pts.length)return '';
    const W=640,H=205,L=48,R=18,T=16,B=34,pw=W-L-R,ph=H-T-B;
    const values=pts.map(p=>p.value),rawMin=Math.min(...values),rawMax=Math.max(...values),pad=Math.max(unit==='lb'?2:1,(rawMax-rawMin)*.18),min=Math.max(0,rawMin-pad),max=rawMax+pad,span=max-min||1;
    const x=i=>pts.length===1?L+pw/2:L+(i/(pts.length-1))*pw;
    const y=v=>T+((max-v)/span)*ph;
    const grid=[0,.25,.5,.75,1].map(t=>{const yy=T+t*ph,val=max-t*span;return `<line class="grid" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"></line><text x="5" y="${yy+4}">${esc(fmt(val))}</text>`;}).join('');
    const poly=pts.length>1?`<polyline class="line" points="${pts.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ')}"></polyline>`:'';
    const dots=pts.map((p,i)=>`<circle class="dot" cx="${x(i)}" cy="${y(p.value)}" r="4"><title>${esc(dateLabel(p.date))}: ${esc(fmt(p.value))} ${esc(unit)}</title></circle>`).join('');
    const first=pts[0],last=pts[pts.length-1];
    return `<div class="exercise-detail-chart"><div class="exercise-detail-chart-title">${esc(title)}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)} over time">${grid}${poly}${dots}<text x="${L}" y="${H-9}">${esc(dateLabel(first.date))}</text><text x="${W-R}" y="${H-9}" text-anchor="end">${esc(dateLabel(last.date))}</text></svg></div>`;
  }

  function ensureModal(){
    let overlay=document.getElementById('exerciseDetailOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='exerciseDetailOverlay';
    overlay.className='exercise-detail-overlay';
    overlay.innerHTML=`<div class="exercise-detail-modal" role="dialog" aria-modal="true" aria-labelledby="exerciseDetailTitle"><div class="exercise-detail-head"><div><h2 id="exerciseDetailTitle">Exercise</h2><div id="exerciseDetailSub" class="exercise-detail-sub"></div></div><button id="exerciseDetailClose" class="exercise-detail-close" type="button" aria-label="Close">×</button></div><div id="exerciseDetailBody" class="exercise-detail-body"></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#exerciseDetailClose').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    return overlay;
  }

  let lastFocus=null;
  function close(){const overlay=document.getElementById('exerciseDetailOverlay');if(!overlay)return;overlay.classList.remove('show');document.body.style.overflow='';lastFocus?.focus?.();}

  function open(key,source){
    const sessions=sessionsFor(key);if(!sessions.length)return;
    lastFocus=source||document.activeElement;
    const name=sessions[sessions.length-1].name;
    const maxWeight=Math.max(0,...sessions.map(s=>s.maxWeight));
    const maxReps=Math.max(0,...sessions.map(s=>s.maxReps));
    const maxSeconds=Math.max(0,...sessions.map(s=>s.maxSeconds));
    const hasReps=sessions.some(s=>s.sets.some(set=>set.mode==='reps'));
    const hasHold=sessions.some(s=>s.sets.some(set=>set.mode==='sec'||set.mode==='min'));
    const overlay=ensureModal();
    overlay.querySelector('#exerciseDetailTitle').textContent=name;
    const range=window.WorkoutProgressTools?.rangeLabel?.()||'All Time';
    overlay.querySelector('#exerciseDetailSub').textContent=`${range} • ${sessions.length} saved session${sessions.length===1?'':'s'} • ${dateLabel(sessions[0].date)} to ${dateLabel(sessions[sessions.length-1].date)}`;
    const metric=(label,value)=>`<div class="exercise-detail-metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
    const metrics=[metric('Best Weight',maxWeight?`${fmt(maxWeight)} lb`:'—')];
    if(hasReps)metrics.push(metric('Best Reps',maxReps?fmt(maxReps):'—'));
    if(hasHold)metrics.push(metric('Best Hold',maxSeconds?`${fmt(maxSeconds)} sec`:'—'));
    metrics.push(metric('Sessions',fmt(sessions.length)));
    const history=[...sessions].reverse().map(s=>`<div class="exercise-session"><div class="exercise-session-head"><div class="exercise-session-date">${esc(dateLabel(s.date))}</div><div class="exercise-session-best">${esc(bestText(s))}</div></div><div class="exercise-set-list">${s.sets.length?s.sets.map(set=>`<div class="exercise-set-row"><span>Set ${set.index}</span><span>${esc(setText(set))}</span></div>`).join(''):'<div class="exercise-detail-empty">No saved sets.</div>'}</div></div>`).join('');
    overlay.querySelector('#exerciseDetailBody').innerHTML=`<div class="exercise-detail-metrics">${metrics.join('')}</div><div class="exercise-detail-section"><h3>Progress over time</h3>${chart('Best weight',sessions,'maxWeight','lb')}${hasReps?chart('Best reps',sessions,'maxReps','reps'):''}${hasHold?chart('Best hold',sessions,'maxSeconds','sec'):''}${(!maxWeight&&!maxReps&&!maxSeconds?'<div class="exercise-detail-empty">No chartable values yet.</div>':'')}</div><div class="exercise-detail-section"><h3>Workout history</h3><div class="exercise-session-list">${history}</div></div>`;
    overlay.classList.add('show');document.body.style.overflow='hidden';overlay.querySelector('#exerciseDetailClose').focus();
  }

  const grid=document.getElementById('progressGrid');
  if(grid){
    grid.addEventListener('click',e=>{if(e.target.closest('.progress-pin'))return;const card=e.target.closest('.pr[data-progress-key]');if(card&&grid.contains(card))open(card.dataset.progressKey,card);});
    grid.addEventListener('keydown',e=>{if(e.target.closest('.progress-pin'))return;const card=e.target.closest('.pr[data-progress-key]');if(!card)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();open(card.dataset.progressKey,card);}});
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('exerciseDetailOverlay')?.classList.contains('show'))close();});
  window.addEventListener('workout-profile-store-change',close);
})();
