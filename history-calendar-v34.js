(() => {
  if(typeof state==='undefined' || typeof window.renderHistory!=='function') return;

  const style=document.createElement('style');
  style.textContent=`
    .history-calendar{border:1px solid var(--wt-border,#243651);background:var(--wt-surface,#0d1827);border-radius:14px;padding:12px;margin:0 0 12px}
    .history-cal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
    .history-cal-title{font-weight:900;font-size:16px;text-align:center;flex:1}
    .history-cal-nav,.history-cal-clear{border:1px solid var(--wt-border,#2b3f5e);background:var(--wt-surface2,#132238);color:var(--wt-text,#f3f6fb);border-radius:9px;padding:7px 10px;font-size:12px;font-weight:800}
    .history-cal-weekdays,.history-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
    .history-cal-weekdays span{text-align:center;color:var(--wt-muted,#99a8bc);font-size:10px;font-weight:900;text-transform:uppercase;padding:3px 0}
    .history-cal-day,.history-cal-blank{aspect-ratio:1/1;min-height:42px;border-radius:9px}
    .history-cal-day{position:relative;border:1px solid transparent;background:transparent;color:var(--wt-muted,#99a8bc);display:flex;align-items:flex-start;justify-content:flex-start;padding:7px;font-weight:800}
    .history-cal-day.has-workout{border-color:var(--wt-border,#243651);background:var(--wt-field,#091321);color:var(--wt-text,#f3f6fb);cursor:pointer}
    .history-cal-day.has-workout:hover{border-color:var(--wt-accent,#3ba8ff)}
    .history-cal-day.selected{outline:2px solid var(--wt-accent,#3ba8ff);background:color-mix(in srgb,var(--wt-accent,#3ba8ff) 14%,var(--wt-field,#091321))}
    .history-cal-day.today{box-shadow:inset 0 0 0 1px var(--wt-accent,#3ba8ff)}
    .history-cal-count{position:absolute;right:5px;bottom:5px;min-width:18px;height:18px;border-radius:9px;padding:0 5px;background:var(--wt-accent,#3ba8ff);color:#fff;display:grid;place-items:center;font-size:9px;font-weight:1000}
    .history-cal-filter{display:none;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--wt-border,#243651);font-size:12px;color:var(--wt-muted,#99a8bc)}
    .history-cal-filter.show{display:flex}
    .history-calendar-empty{display:none;border:1px dashed var(--wt-border,#243651);border-radius:11px;padding:16px;text-align:center;color:var(--wt-muted,#99a8bc);margin:8px 0}
    .history-calendar-empty.show{display:block}
    @media(max-width:560px){.history-calendar{padding:9px}.history-cal-day,.history-cal-blank{min-height:36px}.history-cal-day{padding:5px;font-size:12px}.history-cal-count{right:3px;bottom:3px;min-width:16px;height:16px;font-size:8px}.history-cal-nav{padding:6px 8px}}
  `;
  document.head.appendChild(style);

  let selectedDate='';
  let viewYear=null,viewMonth=null;

  function parseDate(s){const d=new Date(`${String(s||'')}T12:00:00`);return Number.isNaN(d.getTime())?null:d;}
  function iso(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  function latestHistoryDate(){
    const dates=(state.history||[]).map(h=>String(h.date||'')).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
    return dates.length?parseDate(dates[dates.length-1]):new Date();
  }
  function ensureView(){
    if(viewYear!==null&&viewMonth!==null)return;
    const d=latestHistoryDate();viewYear=d.getFullYear();viewMonth=d.getMonth();
  }
  function ensureCalendar(){
    const section=document.getElementById('history'),list=document.getElementById('historyList');
    if(!section||!list)return null;
    let cal=document.getElementById('historyCalendar');
    if(!cal){
      cal=document.createElement('div');cal.id='historyCalendar';cal.className='history-calendar';
      list.parentNode.insertBefore(cal,list);
      cal.addEventListener('click',e=>{
        const nav=e.target.closest('[data-cal-nav]');
        if(nav){
          ensureView();
          const delta=Number(nav.dataset.calNav||0);viewMonth+=delta;
          if(viewMonth<0){viewMonth=11;viewYear--;}else if(viewMonth>11){viewMonth=0;viewYear++;}
          renderCalendar();return;
        }
        const day=e.target.closest('[data-cal-date]');
        if(day&&day.classList.contains('has-workout')){
          selectedDate=day.dataset.calDate;renderCalendar();applyFilter();return;
        }
        if(e.target.closest('[data-cal-clear]')){selectedDate='';renderCalendar();applyFilter();}
      });
    }
    return cal;
  }
  function counts(){
    const map=new Map();
    (state.history||[]).forEach(h=>{const d=String(h.date||'');if(/^\d{4}-\d{2}-\d{2}$/.test(d))map.set(d,(map.get(d)||0)+1);});
    return map;
  }
  function renderCalendar(){
    ensureView();
    const cal=ensureCalendar();if(!cal)return;
    const c=counts(),first=new Date(viewYear,viewMonth,1),days=new Date(viewYear,viewMonth+1,0).getDate(),start=first.getDay();
    const title=first.toLocaleDateString(undefined,{month:'long',year:'numeric'}),today=new Date(),todayIso=iso(today.getFullYear(),today.getMonth(),today.getDate());
    const cells=[];
    for(let i=0;i<start;i++)cells.push('<div class="history-cal-blank"></div>');
    for(let d=1;d<=days;d++){
      const key=iso(viewYear,viewMonth,d),count=c.get(key)||0;
      cells.push(`<button type="button" class="history-cal-day ${count?'has-workout':''} ${selectedDate===key?'selected':''} ${todayIso===key?'today':''}" data-cal-date="${key}" ${count?'':`tabindex="-1" aria-disabled="true"`}><span>${d}</span>${count?`<span class="history-cal-count">${count}</span>`:''}</button>`);
    }
    cal.innerHTML=`<div class="history-cal-head"><button type="button" class="history-cal-nav" data-cal-nav="-1" aria-label="Previous month">‹</button><div class="history-cal-title">${title}</div><button type="button" class="history-cal-nav" data-cal-nav="1" aria-label="Next month">›</button></div><div class="history-cal-weekdays">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<span>${x}</span>`).join('')}</div><div class="history-cal-grid">${cells.join('')}</div><div class="history-cal-filter ${selectedDate?'show':''}"><span>${selectedDate?`Showing workouts from ${selectedDate}`:''}</span><button type="button" class="history-cal-clear" data-cal-clear>All workouts</button></div>`;
  }
  function tagItems(){
    const items=[...document.querySelectorAll('#historyList .history-item')],rows=[...(state.history||[])].reverse();
    items.forEach((item,i)=>{item.dataset.historyDate=String(rows[i]?.date||'');});
  }
  function applyFilter(){
    const list=document.getElementById('historyList');if(!list)return;
    const items=[...list.querySelectorAll('.history-item')];let shown=0;
    items.forEach(item=>{const show=!selectedDate||item.dataset.historyDate===selectedDate;item.style.display=show?'':'none';if(show)shown++;});
    let empty=document.getElementById('historyCalendarEmpty');
    if(!empty){empty=document.createElement('div');empty.id='historyCalendarEmpty';empty.className='history-calendar-empty';list.insertAdjacentElement('beforebegin',empty);}
    empty.textContent=selectedDate?`No saved workouts on ${selectedDate}.`:'';
    empty.classList.toggle('show',!!selectedDate&&shown===0);
  }

  if(!window.renderHistory._historyCalendarV34){
    const base=window.renderHistory;
    const wrapped=function(...args){const result=base.apply(this,args);tagItems();renderCalendar();applyFilter();return result;};
    wrapped._historyCalendarV34=true;window.renderHistory=wrapped;
  }

  document.querySelector('.tabbtn[data-tab="history"]')?.addEventListener('click',()=>setTimeout(()=>{renderCalendar();tagItems();applyFilter();},0));
  window.addEventListener('workout-profile-store-change',()=>{selectedDate='';viewYear=null;viewMonth=null;setTimeout(()=>{renderCalendar();tagItems();applyFilter();},0);});
  renderCalendar();tagItems();applyFilter();
})();
