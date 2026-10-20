(() => {
  // Non-destructive reconciliation used by startup, auto-sync and GitHub writes.
  // Explicit profile deletions are managed separately by deletion tombstones.
  const clone=x=>JSON.parse(JSON.stringify(x));
  const date=x=>String(x?.date||'');
  const profileData=p=>p?.data||p?.state||{};
  const number=x=>Number(x||0);
  function draftRichness(d){
    if(!d||typeof d!=='object')return 0;
    let count=String(d.notes||'').trim()?2:0;
    for(const entries of [d.warmupEntries,d.cooldownEntries]){
      for(const s of entries||[])count+=(s?.done?4:0)+(String(s?.weight??'').trim()?1:0)+(String(s?.value??'').trim()?2:0);
    }
    for(const rows of d.sets||[])for(const s of rows||[])
      count+=(s?.done?4:0)+(String(s?.weight??'').trim()?1:0)+(String(s?.value??'').trim()?2:0);
    return count;
  }
  function chooseDraft(a,b,preferB){
    if(!a)return clone(b);
    if(!b)return clone(a);
    const as=draftRichness(a),bs=draftRichness(b);
    if(!as&&bs)return clone(b);
    if(!bs&&as)return clone(a);
    if(as&&bs&&date(a)!==date(b))return clone(date(b)>date(a)?b:a);
    if(as!==bs)return clone(as>bs?a:b);
    return clone(preferB?b:a);
  }
  function historyKey(h){
    return h?.id!=null?String(h.id):'legacy-'+String(h?.date||'')+'-'+String(h?.day||'')+'-'+String(h?.name||'');
  }
  function mergeProfile(a,b){
    if(!a)return clone(b);
    if(!b)return clone(a);
    const newerB=number(b.updatedAt)>=number(a.updatedAt);
    const older=newerB?a:b,newer=newerB?b:a;
    const first=profileData(older),second=profileData(newer);
    const byHistory=new Map();
    for(const h of first.history||[])if(h)byHistory.set(historyKey(h),clone(h));
    for(const h of second.history||[])if(h)byHistory.set(historyKey(h),clone(h));
    const history=[...byHistory.values()].sort((x,y)=>date(x).localeCompare(date(y))||number(x.id)-number(y.id));
    const drafts={};
    for(const key of new Set([...Object.keys(first.drafts||{}),...Object.keys(second.drafts||{})]))
      drafts[key]=chooseDraft(first.drafts?.[key],second.drafts?.[key],true);
    const data={
      ...clone(first),
      ...clone(second),
      history,
      drafts,
      customPlans:{...clone(first.customPlans||{}),...clone(second.customPlans||{})}
    };
    // Other profile properties (fitness/weight tracking) should not lose
    // fields solely because a device had an older incomplete object.
    for(const field of ['fitnessProfile','progressPrefs','exerciseLibrary','sectionItemIds']){
      if(first[field]&&second[field]&&!Array.isArray(first[field])&&!Array.isArray(second[field])
        &&typeof first[field]==='object'&&typeof second[field]==='object')
        data[field]={...clone(first[field]),...clone(second[field])};
    }
    return {
      ...clone(older),...clone(newer),
      id:String(newer.id||older.id),
      updatedAt:Math.max(number(a.updatedAt),number(b.updatedAt)),
      data
    };
  }
  window.WorkoutCloudMerge={mergeProfile,draftRichness};
})();