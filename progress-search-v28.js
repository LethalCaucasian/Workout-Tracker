(() => {
  const style=document.createElement('style');
  style.textContent=`
    .progress-search-wrap{position:relative;margin:0 0 10px}
    .progress-search{width:100%;box-sizing:border-box;background:#091321;color:#fff;border:1px solid #2b3f5e;border-radius:11px;padding:11px 12px;font-size:15px;outline:none}
    .progress-search:focus{border-color:#3ba8ff}
    .progress-search-empty{display:none;padding:18px 12px;text-align:center;color:#91a2b8;border:1px solid #20314b;border-radius:11px;background:#0d1827;margin-top:8px}
    .progress-search-empty.show{display:block}
  `;
  document.head.appendChild(style);

  let query='';

  function ensureSearch(){
    const section=document.getElementById('progress');
    const grid=document.getElementById('progressGrid');
    if(!section||!grid) return null;
    let wrap=document.getElementById('progressSearchWrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='progressSearchWrap';
      wrap.className='progress-search-wrap';
      wrap.innerHTML=`<input id="progressSearch" class="progress-search" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Search exercises…" aria-label="Search progress exercises"><div id="progressSearchEmpty" class="progress-search-empty">No matching exercises.</div>`;
      grid.parentNode.insertBefore(wrap,grid);
      const input=wrap.querySelector('#progressSearch');
      input.value=query;
      const sync=()=>{query=input.value;applyFilter();};
      input.addEventListener('input',sync);
      input.addEventListener('search',sync);
    }
    return wrap;
  }

  function applyFilter(){
    const wrap=ensureSearch();
    const grid=document.getElementById('progressGrid');
    if(!wrap||!grid) return;
    const input=wrap.querySelector('#progressSearch');
    const empty=wrap.querySelector('#progressSearchEmpty');
    if(input && input.value!==query) input.value=query;

    const q=query.trim().toLowerCase();
    const cards=[...grid.querySelectorAll('.pr')];
    let shown=0;
    cards.forEach(card=>{
      const name=card.querySelector('h4')?.textContent?.toLowerCase()||'';
      const match=!q||name.includes(q);
      card.style.display=match?'':'none';
      if(match) shown++;
    });
    empty?.classList.toggle('show',!!q && cards.length>0 && shown===0);
  }

  ensureSearch();
  applyFilter();

  const grid=document.getElementById('progressGrid');
  if(grid){
    const observer=new MutationObserver(()=>applyFilter());
    observer.observe(grid,{childList:true,subtree:false});
  }

  document.querySelector('.tabbtn[data-tab="progress"]')?.addEventListener('click',()=>setTimeout(()=>{ensureSearch();applyFilter();},0));
  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{ensureSearch();applyFilter();},0));
})();
