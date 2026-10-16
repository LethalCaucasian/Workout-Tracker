(() => {
  if(typeof state === 'undefined') return;

  const RANGES={all:null,30:30,90:90,180:180,365:365};
  const RANGE_LABELS={all:'All Time',30:'30 Days',90:'3 Months',180:'6 Months',365:'1 Year'};

  const style=document.createElement('style');
  style.textContent=`
    .progress-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
    .progress-range-label{font-size:11px;font-weight:900;color:var(--wt-muted,#91a2b8);text-transform:uppercase;letter-spacing:.35px;margin-right:2px}
    .progress-range-btn{border:1px solid var(--wt-border,#243651);background:var(--wt-surface,#0d1827);color:var(--wt-muted,#99a8bc);border-radius:9px;padding:7px 9px;font-size:11px;font-weight:800}
    .progress-range-btn.active{background:var(--wt-accent,#3ba8ff);border-color:var(--wt-accent,#3ba8ff);color:#fff}
    .progress-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}
    .progress-metric{padding:8px;border:1px solid #243651;border-radius:9px;background:#0a1422}
    .progress-metric b{display:block;font-size:15px;color:#f3f6fb}.progress-metric span{display:block;margin-top:2px;font-size:10px;color:#91a2b8;text-transform:uppercase;font-weight:900;letter-spacing:.35px}
    .pr[data-progress-key]{cursor:pointer;position:relative;padding-right:46px}
    .pr[data-progress-key]:focus-visible{outline:2px solid #3ba8ff;outline-offset:2px}
    .progress-pin{position:absolute;right:9px;top:9px;width:30px;height:30px;border:1px solid var(--wt-border,#2b3f5e);border-radius:9px;background:var(--wt-field,#091321);color:var(--wt-muted,#99a8bc);display:grid;place-items:center;font-size:17px;line-height:1;padding:0}
    .progress-pin.pinned{color:#ffd166;border-color:#8b733c;background:rgba(255,209,102,.08)}
    .progress-open-hint{margin-top:9px;color:#78bfff;font-size:11px;font-weight:800}
    @media(min-width:720px){.progress-metrics{grid-template-columns:repeat(auto-fit,minmax(95px,1fr))}}
  `;
  document.head.appendChild(style);

  function esc(value){return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
  function slug(value){return String(value || 'exercise').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'exercise';}
  function formatValue(v){const n=Number(v||0);return Number.isInteger(n) ? String(n) : String(Math.round(n*100)/100);}
  function setMode(ex,set){
    const type=['reps','sec','min','mixed'].includes(ex?.type) ? ex.type : 'reps';
    if(type==='mixed') return ['reps','sec','min'].includes(set?.mode) ? set.mode : 'reps';
    return type;
  }
  function betterPair(weight,value,bestWeight,bestValue){
    const w=Number(weight||0),v=Number(value||0),bw=Number(bestWeight||0),bv=Number(bestValue||0);
    if(v<=0)return false;
    return w>bw || (w===bw && v>bv);
  }
  function prefs(){
    if(!state.progressPrefs || typeof state.progressPrefs!=='object') state.progressPrefs={};
    if(!Object.prototype.hasOwnProperty.call(RANGES,String(state.progressPrefs.range||'all'))) state.progressPrefs.range='all';
    if(!Array.isArray(state.progressPrefs.pinned)) state.progressPrefs.pinned=[];
    return state.progressPrefs;
  }
  function inRange(date,range){
    const days=RANGES[String(range||'all')];
    if(!days) return true;
    const d=new Date(`${String(date||'')}T12:00:00`);
    if(Number.isNaN(d.getTime())) return false;
    const cutoff=new Date();
    cutoff.setHours(0,0,0,0);
    cutoff.setDate(cutoff.getDate()-(days-1));
    return d>=cutoff;
  }
  function filteredHistory(){const p=prefs();return (state.history||[]).filter(h=>inRange(h.date,p.range));}

  function ensureControls(){
    const grid=document.getElementById('progressGrid');
    if(!grid)return null;
    let controls=document.getElementById('progressControls');
    if(!controls){
      controls=document.createElement('div');
      controls.id='progressControls';
      controls.className='progress-controls';
      grid.parentNode.insertBefore(controls,grid);
      controls.addEventListener('click',e=>{
        const btn=e.target.closest('[data-progress-range]');
        if(!btn)return;
        const range=String(btn.dataset.progressRange||'all');
        if(!Object.prototype.hasOwnProperty.call(RANGES,range))return;
        prefs().range=range;
        if(typeof save==='function')save();
        renderProgress();
      });
    }
    const current=String(prefs().range||'all');
    controls.innerHTML=`<span class="progress-range-label">Range</span>${Object.keys(RANGES).map(key=>`<button type="button" class="progress-range-btn ${key===current?'active':''}" data-progress-range="${key}">${RANGE_LABELS[key]}</button>`).join('')}`;
    return controls;
  }

  function togglePin(key){
    const p=prefs(),id=String(key),index=p.pinned.indexOf(id);
    if(index>=0)p.pinned.splice(index,1);else p.pinned.unshift(id);
    if(typeof save==='function')save();
    renderProgress();
  }

  const grid=document.getElementById('progressGrid');
  if(grid && !grid.dataset.progressPinBound){
    grid.dataset.progressPinBound='1';
    grid.addEventListener('click',e=>{
      const btn=e.target.closest('.progress-pin');
      if(!btn)return;
      e.preventDefault();e.stopImmediatePropagation();
      togglePin(btn.dataset.progressPin);
    });
  }

  renderProgress=function(){
    ensureControls();
    const by={};
    filteredHistory().forEach(h=>(h.exercises||[]).forEach(e=>{
      const key=e.exerciseId||`legacy-${slug(e.name)}`;
      if(!by[key]) by[key]={name:e.name,bestRepsWeight:0,bestReps:0,bestHoldWeight:0,bestSeconds:0,totalReps:0,sessions:0,hasReps:false,hasHold:false};
      const o=by[key];o.name=e.name||o.name;o.sessions++;
      (e.sets||[]).forEach(s=>{
        const mode=setMode(e,s),w=Number(s.weight||0),v=Number(s.value||0);
        if(mode==='reps'){
          o.hasReps=true;
          o.totalReps+=v;
          if(betterPair(w,v,o.bestRepsWeight,o.bestReps)){
            o.bestRepsWeight=w;
            o.bestReps=v;
          }
        }else{
          o.hasHold=true;
          const seconds=mode==='min'?v*60:v;
          if(betterPair(w,seconds,o.bestHoldWeight,o.bestSeconds)){
            o.bestHoldWeight=w;
            o.bestSeconds=seconds;
          }
        }
      });
    }));

    const el=document.getElementById('progressGrid');if(!el)return;
    const p=prefs(),pinRank=new Map(p.pinned.map((key,i)=>[String(key),i]));
    const keys=Object.keys(by).sort((a,b)=>{
      const ap=pinRank.has(a),bp=pinRank.has(b);
      if(ap&&bp)return pinRank.get(a)-pinRank.get(b);
      if(ap)return -1;if(bp)return 1;
      return String(by[a].name||'').localeCompare(String(by[b].name||''));
    });
    if(!keys.length){
      const label=RANGE_LABELS[String(p.range||'all')]||'selected range';
      el.innerHTML=`<div class="card muted">${p.range==='all'?'Save some workouts to build progress stats.':`No saved exercise progress in ${label}.`}</div>`;
      return;
    }

    el.innerHTML=keys.map(k=>{
      const o=by[k],isPinned=p.pinned.includes(k);
      const bestWeight=o.hasReps&&!o.hasHold?o.bestRepsWeight:o.hasHold&&!o.hasReps?o.bestHoldWeight:Math.max(o.bestRepsWeight,o.bestHoldWeight);
      const lead=bestWeight?`${formatValue(bestWeight)} lb`:o.bestReps?`${formatValue(o.bestReps)} reps`:o.bestSeconds?`${formatValue(o.bestSeconds)} sec`:'—';
      const metric=(label,value)=>`<div class="progress-metric"><b>${value}</b><span>${label}</span></div>`;
      const metrics=[metric('Best Weight',bestWeight?`${formatValue(bestWeight)} lb`:'—')];
      if(o.hasReps) metrics.push(metric('Best Reps',o.bestReps?formatValue(o.bestReps):'—'));
      if(o.hasHold) metrics.push(metric('Best Hold',o.bestSeconds?`${formatValue(o.bestSeconds)} sec`:'—'));
      if(o.hasReps) metrics.push(metric('Total Reps',formatValue(o.totalReps)));
      metrics.push(metric('Sessions',formatValue(o.sessions)));
      return `<div class="pr" data-progress-key="${esc(k)}" role="button" tabindex="0" aria-label="View ${esc(o.name)} progress details"><button type="button" class="progress-pin ${isPinned?'pinned':''}" data-progress-pin="${esc(k)}" aria-label="${isPinned?'Unpin':'Pin'} ${esc(o.name)}" title="${isPinned?'Unpin':'Pin'} exercise">${isPinned?'★':'☆'}</button><h4>${esc(o.name)}</h4><div class="big">${lead}</div><div class="progress-metrics">${metrics.join('')}</div><div class="progress-open-hint">View details →</div></div>`;
    }).join('');
  };

  window.WorkoutProgressTools={
    rangeLabel(){return RANGE_LABELS[String(prefs().range||'all')]||'All Time';},
    inRange(date){return inRange(date,prefs().range);},
    getRange(){return String(prefs().range||'all');}
  };

  renderProgress();
})();
