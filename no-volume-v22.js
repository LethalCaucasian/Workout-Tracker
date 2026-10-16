(() => {
  if(typeof state === 'undefined') return;

  const style=document.createElement('style');
  style.textContent=`
    .stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  `;
  document.head.appendChild(style);

  function stripStoredVolume(){
    let changed=false;
    (state.history||[]).forEach(h=>{
      if(h && Object.prototype.hasOwnProperty.call(h,'volume')){
        delete h.volume;
        changed=true;
      }
    });
    if(changed && typeof save==='function') save();
    return changed;
  }

  function cleanToday(){
    const root=document.getElementById('todayContent');
    if(!root) return;
    root.querySelectorAll('.stat').forEach(stat=>{
      const label=stat.querySelector('span')?.textContent?.trim().toLowerCase();
      if(label==='volume') stat.remove();
    });
  }

  function cleanHistory(){
    const root=document.getElementById('historyList');
    if(!root) return;
    root.querySelectorAll('.history-item').forEach(card=>{
      const summary=[...card.children].find(el=>el.classList?.contains('muted'));
      if(!summary) return;
      summary.textContent=summary.textContent
        .replace(/\s*•\s*(?:NaN|[-\d,.]+)\s*lb\s+volume\b/i,'')
        .trim();
    });
  }

  if(typeof window.renderToday==='function'){
    const baseRenderToday=window.renderToday;
    window.renderToday=function(...args){
      const result=baseRenderToday.apply(this,args);
      cleanToday();
      return result;
    };
  }

  if(typeof window.renderHistory==='function'){
    const baseRenderHistory=window.renderHistory;
    window.renderHistory=function(...args){
      const result=baseRenderHistory.apply(this,args);
      cleanHistory();
      return result;
    };
  }

  if(typeof window.updateSummaryOnly==='function'){
    window.updateSummaryOnly=function(){
      if(typeof totals!=='function' || typeof selectedPlan!=='function') return;
      const t=totals();
      const stats=document.querySelectorAll('#todayContent .stat b');
      if(stats.length>=3){
        stats[0].textContent=`${t.doneEx}/${selectedPlan().exercises.length}`;
        stats[1].textContent=`${t.doneSets}/${t.totalSets}`;
        stats[2].textContent=t.reps;
      }
    };
  }

  if(typeof window.saveWorkout==='function'){
    const baseSaveWorkout=window.saveWorkout;
    window.saveWorkout=function(...args){
      const result=baseSaveWorkout.apply(this,args);
      stripStoredVolume();
      cleanToday();
      cleanHistory();
      return result;
    };
  }

  stripStoredVolume();
  cleanToday();
  cleanHistory();

  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{
    stripStoredVolume();
    cleanToday();
    cleanHistory();
  },0));
})();
