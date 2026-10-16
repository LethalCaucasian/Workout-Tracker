(() => {
  if(typeof state==='undefined') return;

  const style=document.createElement('style');
  style.textContent=`
    .dob-entry{display:grid;grid-template-columns:.8fr .8fr 1.25fr;gap:7px}
    .dob-entry input{width:100%;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:9px;padding:10px;text-align:center;outline:none}
    .dob-entry input::placeholder{color:#66778e}
    .dob-entry.invalid input{border-color:#8b3f4f}
    .dob-entry-error{display:none;color:#ff9dab;font-size:11px;line-height:1.35;margin-top:4px}
    .dob-entry-error.show{display:block}
  `;
  document.head.appendChild(style);

  const pad=n=>String(n).padStart(2,'0');

  function dobParts(value){
    const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match?{year:match[1],month:String(Number(match[2])),day:String(Number(match[3]))}:{year:'',month:'',day:''};
  }

  function validDob(year,month,day){
    const y=Number(year),m=Number(month),d=Number(day),now=new Date();
    if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)) return false;
    if(y<1900||y>now.getFullYear()||m<1||m>12||d<1||d>31) return false;
    const date=new Date(y,m-1,d,12,0,0);
    if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d) return false;
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59);
    return date<=today;
  }

  function enhance(){
    const root=document.getElementById('fitnessProfileContent');
    const native=root?.querySelector('#fpDob');
    if(!native) return;
    const field=native.closest('.fitness-field');
    if(!field||field.dataset.dobEntryV24==='1') return;
    field.dataset.dobEntryV24='1';

    const current=dobParts(state.fitnessProfile?.dob);
    const wrap=document.createElement('div');
    wrap.className='dob-entry';
    wrap.innerHTML=`
      <input id="fpDobMonth" inputmode="numeric" autocomplete="bday-month" maxlength="2" placeholder="MM" aria-label="Birth month" value="${current.month}">
      <input id="fpDobDay" inputmode="numeric" autocomplete="bday-day" maxlength="2" placeholder="DD" aria-label="Birth day" value="${current.day}">
      <input id="fpDobYear" inputmode="numeric" autocomplete="bday-year" maxlength="4" placeholder="YYYY" aria-label="Birth year" value="${current.year}">`;
    const error=document.createElement('div');
    error.className='dob-entry-error';
    error.textContent='Enter a valid date of birth as month, day, and 4-digit year.';

    native.replaceWith(wrap);
    const help=field.querySelector('.field-help');
    if(help) help.insertAdjacentElement('beforebegin',error); else field.appendChild(error);

    const month=wrap.querySelector('#fpDobMonth');
    const day=wrap.querySelector('#fpDobDay');
    const year=wrap.querySelector('#fpDobYear');
    [month,day,year].forEach(input=>{
      input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,input.maxLength);wrap.classList.remove('invalid');error.classList.remove('show');});
    });

    const commit=()=>{
      const m=month.value.trim(),d=day.value.trim(),y=year.value.trim();
      if(!m&&!d&&!y){
        if(state.fitnessProfile?.dob){state.fitnessProfile.dob='';save();}
        return;
      }
      if(!m||!d||y.length!==4||!validDob(y,m,d)){
        wrap.classList.add('invalid');
        error.classList.add('show');
        return;
      }
      const dob=`${y}-${pad(Number(m))}-${pad(Number(d))}`;
      if(!state.fitnessProfile||typeof state.fitnessProfile!=='object') state.fitnessProfile={};
      if(state.fitnessProfile.dob!==dob){
        state.fitnessProfile.dob=dob;
        save();
      }
    };

    [month,day,year].forEach(input=>input.addEventListener('change',commit));
  }

  const observer=new MutationObserver(()=>enhance());
  const root=document.getElementById('fitnessProfileContent');
  if(root) observer.observe(root,{childList:true,subtree:true});
  window.addEventListener('workout-profile-store-change',()=>setTimeout(enhance,0));
  window.addEventListener('pageshow',()=>setTimeout(enhance,0));
  document.querySelector('.tabbtn[data-tab="profile"]')?.addEventListener('click',()=>setTimeout(enhance,0));
  enhance();
})();
