(() => {
  if(typeof state === 'undefined') return;

  const style=document.createElement('style');
  style.textContent=`
    .progress-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}
    .progress-metric{padding:8px;border:1px solid #243651;border-radius:9px;background:#0a1422}
    .progress-metric b{display:block;font-size:15px;color:#f3f6fb}.progress-metric span{display:block;margin-top:2px;font-size:10px;color:#91a2b8;text-transform:uppercase;font-weight:900;letter-spacing:.35px}
    .pr[data-progress-key]{cursor:pointer}
    .pr[data-progress-key]:focus-visible{outline:2px solid #3ba8ff;outline-offset:2px}
    .progress-open-hint{margin-top:9px;color:#78bfff;font-size:11px;font-weight:800}
    @media(min-width:720px){.progress-metrics{grid-template-columns:repeat(5,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  function esc(value){return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function slug(value){return String(value || 'exercise').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'exercise';}
  function formatValue(v){const n=Number(v||0);return Number.isInteger(n) ? String(n) : String(Math.round(n*100)/100);}
  function setMode(ex,set){
    const type=['reps','sec','min','mixed'].includes(ex?.type) ? ex.type : 'reps';
    if(type==='mixed') return ['reps','sec','min'].includes(set?.mode) ? set.mode : 'reps';
    return type;
  }

  renderProgress=function(){
    const by={};
    (state.history||[]).forEach(h=>(h.exercises||[]).forEach(e=>{
      const key=e.exerciseId||`legacy-${slug(e.name)}`;
      if(!by[key]) by[key]={name:e.name,maxWeight:0,maxReps:0,maxSeconds:0,totalReps:0,sessions:0};
      const o=by[key];o.name=e.name||o.name;o.sessions++;
      (e.sets||[]).forEach(s=>{
        const mode=setMode(e,s),w=Number(s.weight||0),v=Number(s.value||0);
        o.maxWeight=Math.max(o.maxWeight,w);
        if(mode==='reps'){o.maxReps=Math.max(o.maxReps,v);o.totalReps+=v;}
        else o.maxSeconds=Math.max(o.maxSeconds,mode==='min'?v*60:v);
      });
    }));

    const el=document.getElementById('progressGrid');if(!el)return;
    const keys=Object.keys(by);
    if(!keys.length){el.innerHTML='<div class="card muted">Save some workouts to build progress stats.</div>';return;}

    el.innerHTML=keys.map(k=>{
      const o=by[k];
      const lead=o.maxWeight?`${formatValue(o.maxWeight)} lb`:o.maxReps?`${formatValue(o.maxReps)} reps`:o.maxSeconds?`${formatValue(o.maxSeconds)} sec`:'—';
      const metric=(label,value)=>`<div class="progress-metric"><b>${value}</b><span>${label}</span></div>`;
      return `<div class="pr" data-progress-key="${esc(k)}" role="button" tabindex="0" aria-label="View ${esc(o.name)} progress details"><h4>${esc(o.name)}</h4><div class="big">${lead}</div><div class="progress-metrics">${metric('Best Weight',o.maxWeight?`${formatValue(o.maxWeight)} lb`:'—')}${metric('Best Reps',o.maxReps?formatValue(o.maxReps):'—')}${metric('Best Hold',o.maxSeconds?`${formatValue(o.maxSeconds)} sec`:'—')}${metric('Total Reps',formatValue(o.totalReps))}${metric('Sessions',formatValue(o.sessions))}</div><div class="progress-open-hint">View details →</div></div>`;
    }).join('');
  };

  renderProgress();
})();
