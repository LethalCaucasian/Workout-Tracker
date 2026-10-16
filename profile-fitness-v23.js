(() => {
  if(typeof state==='undefined') return;

  const ACTIVITY={
    sedentary:{label:'Sedentary',factor:1.2,note:'Little structured exercise'},
    light:{label:'Lightly active',factor:1.375,note:'Light exercise 1–3 days/week'},
    moderate:{label:'Moderately active',factor:1.55,note:'Moderate exercise 3–5 days/week'},
    very:{label:'Very active',factor:1.725,note:'Hard exercise 6–7 days/week'},
    extra:{label:'Extra active',factor:1.9,note:'Very hard training / highly active work'}
  };

  const style=document.createElement('style');
  style.textContent=`
    .fitness-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
    .fitness-card{border:1px solid var(--line);background:#0d1827;border-radius:14px;padding:14px}
    .fitness-card h3{margin:0 0 4px}.fitness-note{font-size:12px;color:var(--muted);line-height:1.45;margin:4px 0 10px}
    .fitness-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}.fitness-field{display:flex;flex-direction:column;gap:5px}
    .fitness-field.full{grid-column:1/-1}.fitness-field label{font-size:11px;color:#99a8bc;font-weight:900;text-transform:uppercase;letter-spacing:.35px}
    .fitness-field input,.fitness-field select{width:100%;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:9px;padding:10px;outline:none}
    .height-pair{display:grid;grid-template-columns:1fr 1fr;gap:7px}.field-help{font-size:11px;color:var(--muted);line-height:1.35}
    .weight-add{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin-top:10px}
    .fitness-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}
    .fitness-metric{border:1px solid #243651;background:#0a1422;border-radius:10px;padding:10px;min-width:0}
    .fitness-metric b{display:block;font-size:18px}.fitness-metric span{display:block;color:var(--muted);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.35px;margin-top:3px}
    .weight-chart-wrap{margin-top:12px;border:1px solid #243651;border-radius:12px;background:#091321;padding:8px;overflow:hidden}
    .weight-chart{width:100%;height:auto;display:block}.weight-chart .grid{stroke:#22334c;stroke-width:1}.weight-chart .line{fill:none;stroke:#3ba8ff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.weight-chart .dot{fill:#42d38a;stroke:#091321;stroke-width:2}.weight-chart text{fill:#91a2b8;font-size:11px;font-family:Inter,system-ui,sans-serif}
    .weight-empty{padding:28px 10px;text-align:center;color:var(--muted);font-size:13px}
    .weight-list{margin-top:10px;display:flex;flex-direction:column;gap:6px}.weight-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:8px 9px;border:1px solid #20314b;border-radius:9px;background:#091321;font-size:12px}.weight-row strong{font-size:13px}.weight-delete{border:1px solid #613040;background:#29141b;color:#ff9dab;border-radius:7px;padding:5px 7px;font-size:11px}
    .estimate-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.estimate{border:1px solid #243651;background:#0a1422;border-radius:10px;padding:10px}.estimate b{display:block;font-size:19px}.estimate span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;font-weight:900;letter-spacing:.35px;margin-top:3px}.estimate small{display:block;color:#7f91a8;font-size:10px;margin-top:4px;line-height:1.3}
    @media(max-width:760px){.tabs{grid-template-columns:repeat(5,1fr)!important}.tabbtn{font-size:12px}.fitness-grid{grid-template-columns:1fr}.fitness-fields{grid-template-columns:1fr 1fr}.fitness-metrics,.estimate-grid{grid-template-columns:1fr 1fr}.weight-add{grid-template-columns:1fr 1fr}.weight-add .btn{grid-column:1/-1}.fitness-field.full{grid-column:1/-1}}
    @media(max-width:430px){.fitness-fields{grid-template-columns:1fr}.fitness-field.full{grid-column:auto}.height-pair{grid-template-columns:1fr 1fr}.fitness-metrics,.estimate-grid{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const round=(v,d=0)=>{const m=10**d;return Math.round(Number(v)*m)/m;};
  const localDate=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;};

  function data(){
    if(!state.fitnessProfile || typeof state.fitnessProfile!=='object') state.fitnessProfile={};
    const p=state.fitnessProfile;
    if(!Array.isArray(p.weightHistory)) p.weightHistory=[];
    if(!p.activity || !ACTIVITY[p.activity]) p.activity='moderate';
    if(!['lose','maintain','gain'].includes(p.goal)) p.goal='maintain';
    if(![0.5,1,1.5].includes(Number(p.weeklyRate))) p.weeklyRate=1;
    return p;
  }

  function weights(){
    return data().weightHistory
      .map(x=>({date:String(x?.date||''),weight:num(x?.weight)}))
      .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.weight>0)
      .sort((a,b)=>a.date.localeCompare(b.date));
  }

  function currentWeight(){const w=weights();return w.length?w[w.length-1].weight:0;}
  function ageFromDob(dob){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dob||''))) return null;
    const [y,m,d]=dob.split('-').map(Number),now=new Date();
    let age=now.getFullYear()-y;
    const before=(now.getMonth()+1<m)||((now.getMonth()+1===m)&&now.getDate()<d);
    if(before) age--;
    return age>=0&&age<130?age:null;
  }
  function fmtWeight(v){return v?`${round(v,1)} lb`:'—';}
  function fmtChange(v){if(v===null||!Number.isFinite(v))return '—';const r=round(v,1);return `${r>0?'+':''}${r} lb`;}
  function fmtDateShort(date){
    const d=new Date(`${date}T12:00:00`);
    return Number.isNaN(d.getTime())?date:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  }

  function changeForDays(days){
    const w=weights();if(w.length<2)return null;
    const latest=w[w.length-1],end=new Date(`${latest.date}T12:00:00`),target=new Date(end);target.setDate(target.getDate()-days);
    const targetKey=`${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-${String(target.getDate()).padStart(2,'0')}`;
    const prior=[...w].reverse().find(x=>x.date<=targetKey);
    return prior?latest.weight-prior.weight:null;
  }

  function estimates(){
    const p=data(),weightLb=currentWeight(),heightIn=num(p.heightIn),age=ageFromDob(p.dob),sex=p.sex;
    const bmi=weightLb>0&&heightIn>0?(weightLb*703)/(heightIn*heightIn):null;
    let bmr=null,tdee=null,goalCalories=null;
    if(weightLb>0&&heightIn>0&&age!==null&&(sex==='male'||sex==='female')){
      const kg=weightLb*0.45359237,cm=heightIn*2.54;
      bmr=10*kg+6.25*cm-5*age+(sex==='male'?5:-161);
      tdee=bmr*ACTIVITY[p.activity].factor;
      const rate=num(p.weeklyRate)||1;
      const adjust=p.goal==='lose'?-500*rate:p.goal==='gain'?500*rate:0;
      goalCalories=tdee+adjust;
    }
    return {bmi,bmr,tdee,goalCalories,age};
  }

  function chartSvg(){
    const w=weights();
    if(!w.length) return '<div class="weight-empty">Add a weight entry to start the trend.</div>';
    const W=600,H=220,L=48,R=18,T=18,B=38,plotW=W-L-R,plotH=H-T-B;
    const vals=w.map(x=>x.weight),rawMin=Math.min(...vals),rawMax=Math.max(...vals),pad=Math.max(2,(rawMax-rawMin)*0.18),min=rawMin-pad,max=rawMax+pad,span=max-min||1;
    const x=i=>w.length===1?L+plotW/2:L+(i/(w.length-1))*plotW;
    const y=v=>T+((max-v)/span)*plotH;
    const points=w.map((a,i)=>`${x(i).toFixed(1)},${y(a.weight).toFixed(1)}`).join(' ');
    const grid=[0,.25,.5,.75,1].map(t=>{const yy=T+t*plotH,val=max-t*span;return `<line class="grid" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"></line><text x="6" y="${yy+4}">${round(val,1)}</text>`;}).join('');
    const dots=w.map((a,i)=>`<circle class="dot" cx="${x(i)}" cy="${y(a.weight)}" r="4"><title>${esc(fmtDateShort(a.date))}: ${round(a.weight,1)} lb</title></circle>`).join('');
    const line=w.length>1?`<polyline class="line" points="${points}"></polyline>`:'';
    const first=w[0],last=w[w.length-1];
    return `<div class="weight-chart-wrap"><svg class="weight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend chart">${grid}${line}${dots}<text x="${L}" y="${H-10}">${esc(fmtDateShort(first.date))}</text><text x="${W-R}" y="${H-10}" text-anchor="end">${esc(fmtDateShort(last.date))}</text></svg></div>`;
  }

  function metric(label,value){return `<div class="fitness-metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;}
  function estimate(label,value,note=''){return `<div class="estimate"><b>${esc(value)}</b><span>${esc(label)}</span>${note?`<small>${esc(note)}</small>`:''}</div>`;}

  function render(){
    const root=document.getElementById('fitnessProfileContent');if(!root)return;
    const p=data(),w=weights(),cur=w.length?w[w.length-1].weight:0,start=w.length?w[0].weight:0,e=estimates();
    const feet=Math.floor(num(p.heightIn)/12)||'',inches=p.heightIn!==undefined?round(num(p.heightIn)%12,1):'';
    const goalWeight=num(p.goalWeight)||'';
    const ageText=e.age===null?'Age calculates automatically from date of birth.':`Age: ${e.age}`;
    const goalLabel=p.goal==='lose'?'Lose weight':p.goal==='gain'?'Gain weight':'Maintain weight';
    const recent=[...w].reverse().slice(0,8);

    root.innerHTML=`
      <div class="fitness-grid">
        <div class="fitness-card">
          <h3>👤 Profile Info</h3>
          <div class="fitness-note">These values stay with the selected workout profile and are used only for fitness estimates.</div>
          <div class="fitness-fields">
            <div class="fitness-field full"><label>Date of birth</label><input id="fpDob" type="date" value="${esc(p.dob||'')}"><div class="field-help">${esc(ageText)}</div></div>
            <div class="fitness-field"><label>Sex used for BMR estimate</label><select id="fpSex"><option value="" ${!p.sex?'selected':''}>Not set</option><option value="male" ${p.sex==='male'?'selected':''}>Male</option><option value="female" ${p.sex==='female'?'selected':''}>Female</option></select></div>
            <div class="fitness-field"><label>Height</label><div class="height-pair"><input id="fpHeightFt" inputmode="numeric" type="number" min="1" max="8" step="1" placeholder="ft" value="${esc(feet)}"><input id="fpHeightIn" inputmode="decimal" type="number" min="0" max="11.9" step="0.1" placeholder="in" value="${esc(inches)}"></div></div>
            <div class="fitness-field full"><label>Activity level</label><select id="fpActivity">${Object.entries(ACTIVITY).map(([key,a])=>`<option value="${key}" ${p.activity===key?'selected':''}>${esc(a.label)} — ${esc(a.note)}</option>`).join('')}</select></div>
          </div>
        </div>

        <div class="fitness-card">
          <h3>🎯 Current / Goal</h3>
          <div class="fitness-note">Current weight comes from the newest entry in Weight Trend.</div>
          <div class="fitness-fields">
            <div class="fitness-field"><label>Current weight</label><input value="${esc(fmtWeight(cur))}" readonly></div>
            <div class="fitness-field"><label>Goal weight</label><input id="fpGoalWeight" inputmode="decimal" type="number" min="1" step="0.1" placeholder="lb" value="${esc(goalWeight)}"></div>
            <div class="fitness-field"><label>Goal</label><select id="fpGoal"><option value="lose" ${p.goal==='lose'?'selected':''}>Lose weight</option><option value="maintain" ${p.goal==='maintain'?'selected':''}>Maintain weight</option><option value="gain" ${p.goal==='gain'?'selected':''}>Gain weight</option></select></div>
            <div class="fitness-field"><label>Weekly target</label><select id="fpRate" ${p.goal==='maintain'?'disabled':''}><option value="0.5" ${Number(p.weeklyRate)===0.5?'selected':''}>0.5 lb/week</option><option value="1" ${Number(p.weeklyRate)===1?'selected':''}>1.0 lb/week</option><option value="1.5" ${Number(p.weeklyRate)===1.5?'selected':''}>1.5 lb/week</option></select></div>
          </div>
          <div class="fitness-metrics">
            ${metric('Current',fmtWeight(cur))}
            ${metric('Goal',goalWeight?fmtWeight(goalWeight):'—')}
            ${metric('Goal type',goalLabel)}
            ${metric('Total change',w.length>1?fmtChange(cur-start):'—')}
          </div>
        </div>
      </div>

      <div class="fitness-card" style="margin-bottom:10px">
        <h3>📈 Weight Trend</h3>
        <div class="fitness-note">Each update is saved by date. Your newest entry becomes Current Weight and feeds the estimates below.</div>
        <div class="weight-add">
          <div class="fitness-field"><label>Date</label><input id="weightDate" type="date" value="${localDate()}"></div>
          <div class="fitness-field"><label>Weight (lb)</label><input id="weightValue" inputmode="decimal" type="number" min="1" step="0.1" placeholder="Weight"></div>
          <button class="btn primary" id="addWeight" type="button">Add Weight</button>
        </div>
        <div class="fitness-metrics">
          ${metric('Start',fmtWeight(start))}
          ${metric('Current',fmtWeight(cur))}
          ${metric('7-day change',fmtChange(changeForDays(7)))}
          ${metric('30-day change',fmtChange(changeForDays(30)))}
        </div>
        ${chartSvg()}
        ${recent.length?`<div class="weight-list">${recent.map(x=>`<div class="weight-row"><span>${esc(fmtDateShort(x.date))}</span><strong>${esc(fmtWeight(x.weight))}</strong><button class="weight-delete" type="button" data-delete-weight="${esc(x.date)}">Delete</button></div>`).join('')}</div>`:''}
      </div>

      <div class="fitness-card">
        <h3>🔥 Fitness Estimates</h3>
        <div class="fitness-note">BMR uses the Mifflin–St Jeor equation. Maintenance/TDEE applies the selected activity multiplier. Goal calories use a rough 500 kcal/day adjustment per 1 lb/week. These are estimates, not exact requirements.</div>
        <div class="estimate-grid">
          ${estimate('BMI',e.bmi?String(round(e.bmi,1)):'—','Based on current weight and height')}
          ${estimate('BMR',e.bmr?`${Math.round(e.bmr).toLocaleString()} kcal`:'—','Estimated calories/day at rest')}
          ${estimate('Maintenance',e.tdee?`${Math.round(e.tdee).toLocaleString()} kcal`:'—','Estimated TDEE per day')}
          ${estimate('Goal calories',e.goalCalories?`${Math.round(e.goalCalories).toLocaleString()} kcal`:'—',p.goal==='maintain'?'Same as estimated maintenance':'Rough daily target from selected goal')}
        </div>
        <div class="fitness-note" style="margin-top:10px;margin-bottom:0">Metabolism, activity, body composition, and tracking accuracy can move real calorie needs substantially. Use the estimates as a starting point and adjust from the weight trend over time.</div>
      </div>`;

    const commit=(field,value)=>{data()[field]=value;save();render();};
    root.querySelector('#fpDob').onchange=e=>commit('dob',e.target.value);
    root.querySelector('#fpSex').onchange=e=>commit('sex',e.target.value);
    root.querySelector('#fpActivity').onchange=e=>commit('activity',e.target.value);
    root.querySelector('#fpGoalWeight').onchange=e=>commit('goalWeight',Math.max(0,num(e.target.value))||'');
    root.querySelector('#fpGoal').onchange=e=>commit('goal',e.target.value);
    root.querySelector('#fpRate').onchange=e=>commit('weeklyRate',num(e.target.value)||1);

    const saveHeight=()=>{
      const ft=Math.max(0,num(root.querySelector('#fpHeightFt').value)),inch=Math.max(0,Math.min(11.9,num(root.querySelector('#fpHeightIn').value)));
      data().heightIn=ft||inch?ft*12+inch:0;save();render();
    };
    root.querySelector('#fpHeightFt').onchange=saveHeight;
    root.querySelector('#fpHeightIn').onchange=saveHeight;

    root.querySelector('#addWeight').onclick=()=>{
      const date=root.querySelector('#weightDate').value,weight=num(root.querySelector('#weightValue').value);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){if(typeof toast==='function')toast('Choose a date');return;}
      if(!(weight>0)){if(typeof toast==='function')toast('Enter a weight');return;}
      const history=data().weightHistory;
      const existing=history.find(x=>x.date===date);
      if(existing) existing.weight=round(weight,1); else history.push({date,weight:round(weight,1)});
      history.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
      save();render();if(typeof toast==='function')toast(existing?'Weight updated':'Weight added');
    };

    root.querySelectorAll('[data-delete-weight]').forEach(btn=>btn.onclick=()=>{
      const date=btn.dataset.deleteWeight;
      if(!confirm(`Delete weight entry for ${fmtDateShort(date)}?`))return;
      data().weightHistory=data().weightHistory.filter(x=>x.date!==date);save();render();if(typeof toast==='function')toast('Weight entry deleted');
    });
  }

  const tab=document.querySelector('.tabbtn[data-tab="profile"]');
  if(tab) tab.addEventListener('click',()=>setTimeout(render,0));
  window.addEventListener('workout-profile-store-change',()=>setTimeout(render,0));
  window.addEventListener('pageshow',()=>setTimeout(render,0));
  render();
})();
