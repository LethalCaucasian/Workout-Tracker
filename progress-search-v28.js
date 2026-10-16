(() => {
  const style=document.createElement('style');
  style.textContent=`
    .progress-search-wrap{position:relative;margin:0 0 10px}
    .progress-search{width:100%;box-sizing:border-box;background:#091321;color:#fff;border:1px solid #2b3f5e;border-radius:11px;padding:11px 38px 11px 12px;font-size:15px;outline:none}
    .progress-search:focus{border-color:#3ba8ff}
    .progress-search-clear{position:absolute;right:7px;top:50%;transform:translateY(-50%);width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#91a2b8;font-size:20px;line-height:1;display:none;align-items:center;justify-content:center}
    .progress-search-clear.show{display:flex}
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
      wrap.innerHTML=`<input id="progressSearch" class="progress-search" type="search" inputmode="search" autocomplete="off" placeholder="Search exercises…" aria-label="Search progress exercises"><button id="progressSearchClear" class="progress-search-clear" type="button" aria-label="Clear search">×</button><div id="progressSearchEmpty" class="progress-search-empty">No matching exercises.</div>`;
      grid.parentNode.insertBefore(wrap,grid);
      const input=wrap.querySelector('#progressSearch');
      const clear=wrap.querySelector('#progressSearchClear');
      input.value=query;
      input.addEventListener('input',()=>{query=input.value;applyFilter();});
      clear.addEventListener('click',()=>{query='';input.value='';applyFilter();input.focus();});
    }
    return wrap;
  }

  function applyFilter(){
    const wrap=ensureSearch();
    const grid=document.getElementById('progressGrid');
    if(!wrap||!grid) return;
    const input=wrap.querySelector('#progressSearch');
    const clear=wrap.querySelector('#progressSearchClear');
    const empty=wrap.querySelector('#progressSearchEmpty');
    if(input && input.value!==query) input.value=query;
    clear?.classList.toggle('show',!!query.trim());

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
