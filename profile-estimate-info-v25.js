(() => {
  const INFO={
    BMI:{title:'BMI',full:'Body Mass Index',text:'A height-to-weight screening estimate. It does not directly measure body fat or fitness.'},
    BMR:{title:'BMR',full:'Basal Metabolic Rate',text:'Estimated calories your body uses each day at complete rest for basic functions.'},
    TDEE:{title:'TDEE',full:'Total Daily Energy Expenditure',text:'Estimated total calories you burn in a day after activity is included. This is also the app’s maintenance-calorie estimate.'}
  };

  const style=document.createElement('style');
  style.textContent=`
    .estimate-label-row{display:flex;align-items:center;gap:6px;margin-top:3px}
    .estimate-label-row>span{margin-top:0!important}
    .estimate-info-btn{width:20px;height:20px;border-radius:50%;border:1px solid #3a5577;background:#102039;color:#bcd4ef;padding:0;display:grid;place-items:center;font-size:12px;font-weight:900;line-height:1;flex:0 0 auto}
    .estimate-info-btn[aria-expanded="true"]{background:#1e88ff;border-color:#1e88ff;color:#fff}
    .estimate-info-panel{display:none;margin-top:8px;padding:8px 9px;border:1px solid #27405e;border-radius:8px;background:#081522;color:#aebdd0;font-size:11px;line-height:1.4}
    .estimate-info-panel.open{display:block}
    .estimate-info-panel b{display:inline;font-size:11px;color:#eef5ff}
  `;
  document.head.appendChild(style);

  function decorate(){
    const root=document.getElementById('fitnessProfileContent');
    if(!root) return;
    root.querySelectorAll('.estimate').forEach(card=>{
      if(card.dataset.infoReady==='1') return;
      const label=card.querySelector(':scope > span');
      if(!label) return;
      const raw=label.textContent.trim();
      let key=null;
      if(raw==='BMI') key='BMI';
      else if(raw==='BMR') key='BMR';
      else if(raw==='Maintenance' || raw==='TDEE / Maintenance') key='TDEE';
      if(!key) return;

      const info=INFO[key];
      if(key==='TDEE') label.textContent='TDEE / Maintenance';
      const row=document.createElement('div');
      row.className='estimate-label-row';
      label.insertAdjacentElement('beforebegin',row);
      row.appendChild(label);

      const btn=document.createElement('button');
      btn.type='button';
      btn.className='estimate-info-btn';
      btn.textContent='i';
      btn.setAttribute('aria-label',`What does ${info.title} mean?`);
      btn.setAttribute('aria-expanded','false');
      row.appendChild(btn);

      const panel=document.createElement('div');
      panel.className='estimate-info-panel';
      panel.innerHTML=`<b>${info.title} — ${info.full}</b><br>${info.text}`;
      row.insertAdjacentElement('afterend',panel);

      btn.onclick=()=>{
        const open=!panel.classList.contains('open');
        panel.classList.toggle('open',open);
        btn.setAttribute('aria-expanded',open?'true':'false');
      };
      card.dataset.infoReady='1';
    });
  }

  const root=document.getElementById('fitnessProfileContent');
  if(root){
    new MutationObserver(()=>decorate()).observe(root,{childList:true,subtree:true});
  }
  document.querySelector('.tabbtn[data-tab="profile"]')?.addEventListener('click',()=>setTimeout(decorate,0));
  window.addEventListener('workout-profile-store-change',()=>setTimeout(decorate,0));
  window.addEventListener('pageshow',()=>setTimeout(decorate,0));
  decorate();
})();
