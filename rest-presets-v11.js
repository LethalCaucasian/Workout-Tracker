(() => {
  const PRESETS=[30,45,60,90];

  const style=document.createElement('style');
  style.textContent=`
    .mini-rest-bar [data-rest40]{display:none!important}
    .editor-defaults-row select[data-ex-default="restSec"]{
      width:100%;border:1px solid #2b3f5e;background:#07111e;color:#fff;
      border-radius:8px;padding:7px;outline:none;
    }
  `;
  document.head.appendChild(style);

  function replaceRestInputs(){
    document.querySelectorAll('.editor-defaults-row input[data-ex-default="restSec"]').forEach(input=>{
      const current=String(input.value||'').trim();
      const select=document.createElement('select');
      select.dataset.exDefault='restSec';
      select.innerHTML=`<option value="">None</option>${PRESETS.map(sec=>`<option value="${sec}" ${current===String(sec)?'selected':''}>${sec} sec</option>`).join('')}`;
      input.replaceWith(select);
      select.dispatchEvent(new Event('input',{bubbles:true}));
    });
  }

  let applying=false;
  new MutationObserver(()=>{
    if(applying) return;
    applying=true;
    try{replaceRestInputs();}finally{applying=false;}
  }).observe(document.body,{childList:true,subtree:true});

  replaceRestInputs();
})();
