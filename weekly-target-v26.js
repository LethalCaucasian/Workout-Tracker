(() => {
  if(typeof state==='undefined') return;

  const RATES=[0.25,0.5,1,1.5,2];
  const BASE_RATES=[0.5,1,1.5];
  const ACTIVITY_FACTORS={sedentary:1.2,light:1.375,moderate:1.55,very:1.725,extra:1.9};

  function profile(){
    if(!state.fitnessProfile || typeof state.fitnessProfile!=='object') state.fitnessProfile={};
    return state.fitnessProfile;
  }

  function selectedRate(){
    const p=profile();
    const extended=Number(p.weeklyRateExtended);
    if(RATES.includes(extended)) return extended;
    const base=Number(p.weeklyRate);
    return RATES.includes(base)?base:1;
  }

  function ageFromDob(dob){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dob||''))) return null;
    const [y,m,d]=String(dob).split('-').map(Number),now=new Date();
    let age=now.getFullYear()-y;
    if((now.getMonth()+1<m)||((now.getMonth()+1===m)&&now.getDate()<d)) age--;
    return age>=0&&age<130?age:null;
  }

  function currentWeight(){
    const rows=Array.isArray(profile().weightHistory)?profile().weightHistory:[];
    const valid=rows.map(x=>({date:String(x?.date||''),weight:Number(x?.weight||0)}))
      .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.weight>0)
      .sort((a,b)=>a.date.localeCompare(b.date));
    return valid.length?valid[valid.length-1].weight:0;
  }

  function updateGoalCalories(){
    const p=profile(),rate=selectedRate(),weightLb=currentWeight(),heightIn=Number(p.heightIn||0),age=ageFromDob(p.dob),sex=p.sex;
    if(!(weightLb>0&&heightIn>0&&age!==null&&(sex==='male'||sex==='female'))) return;
    const factor=ACTIVITY_FACTORS[p.activity]||ACTIVITY_FACTORS.moderate;
    const kg=weightLb*0.45359237,cm=heightIn*2.54;
    const bmr=10*kg+6.25*cm-5*age+(sex==='male'?5:-161);
    const tdee=bmr*factor;
    const adjust=p.goal==='lose'?-500*rate:p.goal==='gain'?500*rate:0;
    const calories=Math.round(tdee+adjust).toLocaleString();
    const root=document.getElementById('fitnessProfileContent');
    if(!root) return;
    [...root.querySelectorAll('.estimate')].forEach(card=>{
      const label=card.querySelector('span')?.textContent?.trim().toLowerCase();
      if(label==='goal calories'){
        const value=card.querySelector('b');
        if(value) value.textContent=`${calories} kcal`;
      }
    });
  }

  function patchRateSelect(){
    const old=document.getElementById('fpRate');
    if(!old || old.dataset.weeklyTargetV26==='1'){
      updateGoalCalories();
      return;
    }

    const rate=selectedRate();
    const select=old.cloneNode(false);
    select.id='fpRate';
    select.dataset.weeklyTargetV26='1';
    select.disabled=old.disabled;
    select.innerHTML=RATES.map(v=>`<option value="${v}">${v===1?'1.0':v} lb/week</option>`).join('');
    select.value=String(rate);
    old.replaceWith(select);

    select.addEventListener('change',()=>{
      const next=Number(select.value);
      if(!RATES.includes(next)) return;
      const p=profile();
      p.weeklyRateExtended=next;
      // Keep the legacy field valid so the original Profile renderer does not
      // normalize 0.25 or 2.0 back to 1.0 on its next render.
      p.weeklyRate=BASE_RATES.includes(next)?next:1;
      if(typeof save==='function') save();
      setTimeout(()=>{patchRateSelect();updateGoalCalories();},0);
    });

    updateGoalCalories();
  }

  function syncExistingRate(){
    const p=profile();
    if(!RATES.includes(Number(p.weeklyRateExtended))){
      const base=Number(p.weeklyRate);
      if(RATES.includes(base)) p.weeklyRateExtended=base;
    }
  }

  syncExistingRate();
  patchRateSelect();

  const root=document.getElementById('fitnessProfileContent');
  if(root){
    const observer=new MutationObserver(()=>setTimeout(patchRateSelect,0));
    observer.observe(root,{childList:true,subtree:true});
  }

  document.querySelector('.tabbtn[data-tab="profile"]')?.addEventListener('click',()=>setTimeout(patchRateSelect,0));
  window.addEventListener('workout-profile-store-change',()=>setTimeout(()=>{syncExistingRate();patchRateSelect();},0));
  window.addEventListener('pageshow',()=>setTimeout(patchRateSelect,0));
})();
