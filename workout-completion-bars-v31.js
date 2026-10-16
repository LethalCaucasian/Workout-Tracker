(() => {
  if(typeof state==='undefined') return;

  const style=document.createElement('style');
  style.textContent=`
    .stat.completion-stat{position:relative;overflow:hidden;padding-bottom:15px}
    .completion-track{position:absolute;left:9px;right:9px;bottom:7px;height:5px;border-radius:999px;background:var(--wt-surface2,#132238);overflow:hidden;border:1px solid color-mix(in srgb,var(--wt-border,#243651) 82%,transparent)}
    .completion-fill{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,var(--wt-accent,#3ba8ff),var(--wt-good,#42d38a));transition:width .28s ease;box-shadow:0 0 8px color-mix(in srgb,var(--wt-accent,#3ba8ff) 45%,transparent)}
    .stat.completion-stat.complete .completion-fill{box-shadow:0 0 10px color-mix(in srgb,var(--wt-good,#42d38a) 60%,transparent)}
  `;
  document.head.appendChild(style);

  function pct(done,total){
    if(!total) return 0;
    return Math.max(0,Math.min(100,(Number(done||0)/Number(total||1))*100));
  }

  function decorate(){
    if(typeof totals!=='function' || typeof selectedPlan!=='function') return;
    const root=document.getElementById('todayContent');
    if(!root) return;
    const t=totals();
    const plan=selectedPlan();
    const values={
      exercises:{done:t.doneEx,total:(plan?.exercises||[]).length},
      sets:{done:t.doneSets,total:t.totalSets}
    };

    root.querySelectorAll('.stat').forEach(stat=>{
      const label=stat.querySelector('span')?.textContent?.trim().toLowerCase();
      const info=values[label];
      if(!info) return;
      const percent=pct(info.done,info.total);
      stat.classList.add('completion-stat');
      stat.classList.toggle('complete',info.total>0 && info.done>=info.total);
      let track=stat.querySelector('.completion-track');
      if(!track){
        track=document.createElement('div');
        track.className='completion-track';
        track.setAttribute('role','progressbar');
        track.innerHTML='<div class="completion-fill"></div>';
        stat.appendChild(track);
      }
      track.setAttribute('aria-label',`${label} completion`);
      track.setAttribute('aria-valuemin','0');
      track.setAttribute('aria-valuemax','100');
      track.setAttribute('aria-valuenow',String(Math.round(percent)));
      track.querySelector('.completion-fill').style.width=`${percent}%`;
    });
  }

  if(typeof window.renderToday==='function'){
    const baseRenderToday=window.renderToday;
    window.renderToday=function(...args){
      const result=baseRenderToday.apply(this,args);
      decorate();
      return result;
    };
  }

  if(typeof window.updateSummaryOnly==='function'){
    const baseUpdateSummaryOnly=window.updateSummaryOnly;
    window.updateSummaryOnly=function(...args){
      const result=baseUpdateSummaryOnly.apply(this,args);
      decorate();
      return result;
    };
  }

  const root=document.getElementById('todayContent');
  if(root){
    const observer=new MutationObserver(()=>decorate());
    observer.observe(root,{childList:true,subtree:false});
  }

  window.addEventListener('workout-profile-store-change',()=>setTimeout(decorate,0));
  setTimeout(decorate,0);
})();
