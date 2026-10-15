(() => {
  function status(text,type=''){
    const el=document.getElementById('familyAdminStatus');
    if(el){
      el.textContent=text;
      el.className=`family-status ${type}`;
    }
    if(typeof toast==='function') toast(text);
  }

  async function copyText(text){
    if(!text) return false;
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch{}

    const area=document.createElement('textarea');
    area.value=text;
    area.setAttribute('readonly','');
    area.style.position='fixed';
    area.style.opacity='0';
    area.style.pointerEvents='none';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0,area.value.length);
    let ok=false;
    try{ok=document.execCommand('copy');}catch{}
    area.remove();
    return ok;
  }

  async function copyInvite(){
    const input=document.getElementById('familyInviteLink');
    const link=input?.value?.trim();
    if(!link){
      status('Create an invite link first.','warn');
      return;
    }

    const ok=await copyText(link);
    if(ok){
      status('Invite link copied.','ok');
      return;
    }

    try{
      input.focus();
      input.select();
      input.setSelectionRange(0,input.value.length);
    }catch{}
    status('Could not copy automatically. The invite link is selected so you can use Copy.','warn');
  }

  function inject(){
    const card=document.getElementById('familySharingCard');
    if(!card || document.getElementById('familyCopyInvite')) return false;
    const create=card.querySelector('#familyCreateInvite');
    const toolbar=create?.closest('.toolbar');
    if(!toolbar) return false;

    const btn=document.createElement('button');
    btn.className='btn';
    btn.id='familyCopyInvite';
    btn.type='button';
    btn.textContent='Copy Invite Link';
    btn.onclick=copyInvite;
    toolbar.appendChild(btn);
    return true;
  }

  if(!inject()){
    const observer=new MutationObserver(()=>{
      if(inject()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),10000);
  }
})();