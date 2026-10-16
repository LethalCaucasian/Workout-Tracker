(() => {
  const STORAGE_KEY='workout_tracker_theme_v1';
  const THEMES={
    midnight:{name:'Midnight',bg:'#08111f',bg2:'#0a1424',surface:'#0d1827',surface2:'#132238',field:'#091321',border:'#243651',text:'#f3f6fb',muted:'#99a8bc',accent:'#3ba8ff',good:'#42d38a',danger:'#ff5d6c'},
    graphite:{name:'Graphite',bg:'#111317',bg2:'#181b20',surface:'#1b1f25',surface2:'#252a31',field:'#14171b',border:'#3a4048',text:'#f4f5f7',muted:'#a7adb6',accent:'#9ca8b8',good:'#5bd19a',danger:'#ff6b76'},
    forest:{name:'Forest',bg:'#07150f',bg2:'#0a1d15',surface:'#0d241a',surface2:'#123124',field:'#081a12',border:'#244c38',text:'#f0f8f3',muted:'#9bb5a5',accent:'#35c77a',good:'#67dfa1',danger:'#ff6b78'},
    ember:{name:'Ember',bg:'#190c0a',bg2:'#24100c',surface:'#2a1510',surface2:'#3a1d16',field:'#1d0e0b',border:'#613328',text:'#fff4ef',muted:'#c3a69b',accent:'#ff7a3d',good:'#62d395',danger:'#ff6371'},
    violet:{name:'Violet',bg:'#100b1d',bg2:'#171027',surface:'#1c1430',surface2:'#281c42',field:'#140d24',border:'#49356d',text:'#f7f2ff',muted:'#afa2c6',accent:'#a66cff',good:'#5fd59a',danger:'#ff6688'}
  };

  const style=document.createElement('style');
  style.textContent=`
    html{
      --wt-bg:#08111f;--wt-bg2:#0a1424;--wt-surface:#0d1827;--wt-surface2:#132238;--wt-field:#091321;
      --wt-border:#243651;--wt-text:#f3f6fb;--wt-muted:#99a8bc;--wt-accent:#3ba8ff;--wt-good:#42d38a;--wt-danger:#ff5d6c;
    }
    body{background:linear-gradient(180deg,var(--wt-bg),var(--wt-bg2) 28%,var(--wt-bg))!important;color:var(--wt-text)!important}
    .topbar{background:var(--wt-bg)!important}
    .tabs,.day,.warmup,.exercise,.card,.history-item,.pr,.profilebar,.exercise-detail-modal,.exercise-detail-head{background:var(--wt-surface)!important;border-color:var(--wt-border)!important}
    .hero{background:linear-gradient(135deg,var(--wt-surface2),var(--wt-surface))!important;border-color:var(--wt-border)!important}
    .stat,.field,.profilebar select,.fitness-metric,.estimate,.weight-chart-wrap,.weight-row,.progress-metric,.progress-search,.exercise-detail-metric,.exercise-detail-chart,.exercise-session{background:var(--wt-field)!important;border-color:var(--wt-border)!important;color:var(--wt-text)!important}
    .mini,.btn,.done,.profilebar .profile-btn,.exercise-detail-close{background:var(--wt-surface2)!important;border-color:var(--wt-border)!important;color:var(--wt-text)!important}
    textarea,input,select{color:var(--wt-text)}
    textarea{background:var(--wt-field)!important;border-color:var(--wt-border)!important}
    .tabbtn.active,.btn.primary{background:var(--wt-accent)!important;border-color:var(--wt-accent)!important;color:white!important}
    .done.on,.btn.good{background:var(--wt-good)!important;border-color:var(--wt-good)!important;color:white!important}
    .muted,.install-note,.note,.setlabel,.day small,.hero .sub,.fitness-note,.exercise-detail-sub{color:var(--wt-muted)!important}
    .progress-search:focus,.field:focus-within,textarea:focus{border-color:var(--wt-accent)!important}
    .progress-metric b,.fitness-metric b,.estimate b,.exercise-detail-metric b{color:var(--wt-text)!important}
    .progress-metric span,.fitness-metric span,.estimate span,.exercise-detail-metric span{color:var(--wt-muted)!important}
    .weight-chart .line,.exercise-detail-chart .line{stroke:var(--wt-accent)!important}
    .weight-chart .dot,.exercise-detail-chart .dot{fill:var(--wt-good)!important;stroke:var(--wt-field)!important}
    .exercise-set-row{background:var(--wt-surface)!important}
    .exercise-session-best{color:var(--wt-accent)!important}
    .theme-picker-card{margin-top:10px}
    .theme-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}
    .theme-choice{border:1px solid var(--wt-border);background:var(--wt-field);color:var(--wt-text);border-radius:11px;padding:9px 7px;text-align:center;font-size:12px;font-weight:800}
    .theme-choice.active{outline:2px solid var(--wt-accent);border-color:var(--wt-accent)}
    .theme-swatch{height:34px;border-radius:8px;margin-bottom:6px;border:1px solid rgba(255,255,255,.12);display:grid;grid-template-columns:1fr 1fr;overflow:hidden}
    .theme-swatch span:last-child{display:flex;align-items:flex-end;justify-content:flex-end;padding:4px}
    .theme-swatch i{display:block;width:12px;height:12px;border-radius:50%}
    @media(max-width:700px){.theme-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  function validTheme(name){return Object.prototype.hasOwnProperty.call(THEMES,name)?name:'midnight';}

  function applyTheme(name,{save=true}={}){
    name=validTheme(name);
    const t=THEMES[name],root=document.documentElement;
    root.dataset.workoutTheme=name;
    root.style.setProperty('--wt-bg',t.bg);
    root.style.setProperty('--wt-bg2',t.bg2);
    root.style.setProperty('--wt-surface',t.surface);
    root.style.setProperty('--wt-surface2',t.surface2);
    root.style.setProperty('--wt-field',t.field);
    root.style.setProperty('--wt-border',t.border);
    root.style.setProperty('--wt-text',t.text);
    root.style.setProperty('--wt-muted',t.muted);
    root.style.setProperty('--wt-accent',t.accent);
    root.style.setProperty('--wt-good',t.good);
    root.style.setProperty('--wt-danger',t.danger);
    root.style.setProperty('--bg',t.bg);
    root.style.setProperty('--panel',t.surface);
    root.style.setProperty('--panel2',t.surface2);
    root.style.setProperty('--text',t.text);
    root.style.setProperty('--muted',t.muted);
    root.style.setProperty('--line',t.border);
    root.style.setProperty('--accent',t.accent);
    root.style.setProperty('--good',t.good);
    root.style.setProperty('--danger',t.danger);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',t.bg);
    if(save) localStorage.setItem(STORAGE_KEY,name);
    renderActiveChoice();
  }

  function swatch(theme){
    const t=THEMES[theme];
    return `<span class="theme-swatch"><span style="background:${t.surface}"></span><span style="background:${t.bg2}"><i style="background:${t.accent}"></i></span></span>`;
  }

  function ensurePicker(){
    const settings=document.getElementById('settings');
    if(!settings||document.getElementById('themePickerCard')) return;
    const phoneCard=[...settings.querySelectorAll('.card')].find(x=>x.querySelector('h3')?.textContent?.trim()==='Phone use');
    const card=document.createElement('div');
    card.id='themePickerCard';
    card.className='card theme-picker-card';
    card.innerHTML=`<h3>App Theme</h3><p class="install-note">Choose the look for this device. Theme preference is kept locally and does not change workout data.</p><div class="theme-grid">${Object.entries(THEMES).map(([key,t])=>`<button type="button" class="theme-choice" data-theme-choice="${key}" aria-label="Use ${t.name} theme">${swatch(key)}<span>${t.name}</span></button>`).join('')}</div>`;
    if(phoneCard) phoneCard.insertAdjacentElement('beforebegin',card); else settings.appendChild(card);
    card.addEventListener('click',e=>{
      const btn=e.target.closest('[data-theme-choice]');
      if(!btn)return;
      applyTheme(btn.dataset.themeChoice);
      if(typeof toast==='function')toast(`${THEMES[btn.dataset.themeChoice].name} theme applied`);
    });
    renderActiveChoice();
  }

  function renderActiveChoice(){
    const current=validTheme(document.documentElement.dataset.workoutTheme||localStorage.getItem(STORAGE_KEY)||'midnight');
    document.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.classList.toggle('active',btn.dataset.themeChoice===current));
  }

  applyTheme(validTheme(localStorage.getItem(STORAGE_KEY)||'midnight'),{save:false});
  ensurePicker();
  document.querySelector('.tabbtn[data-tab="settings"]')?.addEventListener('click',()=>setTimeout(ensurePicker,0));
})();
