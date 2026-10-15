(() => {
  if(typeof state === 'undefined') return;

  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function slug(value){
    return String(value || 'exercise').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'exercise';
  }
  function formatValue(v){
    const n=Number(v||0);
    return Number.isInteger(n) ? String(n) : String(Math.round(n*100)/100);
  }
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
      const o=by[key];
      o.name=e.name||o.name;
      o.sessions++;
      (e.sets||[]).forEach(s=>{
        const mode=setMode(e,s), w=Number(s.weight||0), v=Number(s.value||0);
        o.maxWeight=Math.max(o.maxWeight,w);
        if(mode==='reps'){
          o.maxReps=Math.max(o.maxReps,v);
          o.totalReps+=v;
        }else{
          o.maxSeconds=Math.max(o.maxSeconds,mode==='min'?v*60:v);
        }
      });
    }));

    const el=document.getElementById('progressGrid');
    if(!el) return;
    const keys=Object.keys(by);
    if(!keys.length){
      el.innerHTML='<div class="card muted">Save some workouts to build progress stats.</div>';
      return;
    }

    el.innerHTML=keys.map(k=>{
      const o=by[k];
      const big=o.maxWeight?`${formatValue(o.maxWeight)} lb`:o.maxReps?`${formatValue(o.maxReps)} reps`:o.maxSeconds?`${formatValue(o.maxSeconds)} sec`:'—';
      const details=[];
      if(o.maxReps) details.push(`Best reps ${formatValue(o.maxReps)}`);
      if(o.maxSeconds) details.push(`Best hold ${formatValue(o.maxSeconds)} sec`);
      details.push(`${o.sessions} saved session${o.sessions===1?'':'s'}`);
      details.push(`${formatValue(o.totalReps)} total reps`);
      return `<div class="pr"><h4>${esc(o.name)}</h4><div class="big">${big}</div><div class="muted">${details.join(' • ')}</div></div>`;
    }).join('');
  };

  renderProgress();
})();
