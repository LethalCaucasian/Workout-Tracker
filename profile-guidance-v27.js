(() => {
  const root=document.getElementById('fitnessProfileContent');
  if(!root) return;

  const style=document.createElement('style');
  style.textContent=`
    .weight-consistency-tip{margin:8px 0 10px;padding:9px 10px;border:1px solid #29405f;border-radius:9px;background:#0a1422;color:#b7c6d9;font-size:12px;line-height:1.45}
    .weight-consistency-tip b{color:#f3f6fb}
  `;
  document.head.appendChild(style);

  function inject(){
    if(root.querySelector('.weight-consistency-tip')) return;
    const card=[...root.querySelectorAll('.fitness-card')].find(card=>card.querySelector('h3')?.textContent?.includes('Weight Trend'));
    if(!card) return;
    const intro=card.querySelector('.fitness-note');
    const tip=document.createElement('div');
    tip.className='weight-consistency-tip';
    tip.innerHTML='<b>Consistency tip:</b> For the most comparable trend, weigh under similar conditions each time—ideally in the morning after using the restroom and before eating or drinking, using the same scale and similar clothing.';
    if(intro) intro.insertAdjacentElement('afterend',tip);
    else card.querySelector('h3')?.insertAdjacentElement('afterend',tip);
  }

  inject();
  const observer=new MutationObserver(()=>inject());
  observer.observe(root,{childList:true,subtree:true});
  document.querySelector('.tabbtn[data-tab="profile"]')?.addEventListener('click',()=>setTimeout(inject,0));
  window.addEventListener('workout-profile-store-change',()=>setTimeout(inject,0));
  window.addEventListener('pageshow',()=>setTimeout(inject,0));
})();
