(() => {
  function ensureState(){
    if(!state.customPlans || typeof state.customPlans!=='object') state.customPlans={};
    if(!state.exerciseLibrary || typeof state.exerciseLibrary!=='object') state.exerciseLibrary={};
    if(!state.drafts || typeof state.drafts!=='object') state.drafts={};
    if(!Array.isArray(state.history)) state.history=[];
    if(typeof state.routineBlank!=='boolean') state.routineBlank=false;
  }
  ensureState();

  const baseSelectedPlan=selectedPlan;
  selectedPlan=function(){ensureState();return baseSelectedPlan();};
  const baseRenderToday=renderToday;
  renderToday=function(){ensureState();return baseRenderToday();};
  const baseRenderHistory=renderHistory;
  renderHistory=function(){ensureState();return baseRenderHistory();};
  const baseRenderProgress=renderProgress;
  renderProgress=function(){ensureState();return baseRenderProgress();};

  const style=document.createElement('style');
  style.textContent=`
    .setrow:has(.mixed-mode){grid-template-columns:44px 74px minmax(70px,1fr) minmax(70px,1fr) 54px}
    @media(max-width:620px){.setrow:has(.mixed-mode){grid-template-columns:40px 68px minmax(64px,1fr) minmax(64px,1fr) 48px;gap:5px}}
  `;
  document.head.appendChild(style);
})();
