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
    // Workout history is additive; routine *edits* are not. An explicit
    // deletion or rename must not be undone by an older device re-adding
    // the previous exercise from its local plan.
    for(const day of new Set([...Object.keys(first.customPlans||{}),...Object.keys(second.customPlans||{})])){
      const prior=first.customPlans?.[day],current=second.customPlans?.[day];
      if(!prior||!current)continue;
      const merged=clone(current);
      const priorExerciseTime=number(prior.exercisesUpdatedAt);
      const currentExerciseTime=number(current.exercisesUpdatedAt);
      if(priorExerciseTime||currentExerciseTime){
        // A versioned routine is authoritative over any unversioned copy.
        // If both are versioned, the latest explicit edit wins.
        const latest=priorExerciseTime>currentExerciseTime?prior:current;
        merged.exercises=clone(latest.exercises||[]);
        merged.name=latest.name||'';
        merged.blank=!!latest.blank;
        merged.exercisesUpdatedAt=Math.max(priorExerciseTime,currentExerciseTime);
      }else if(current.blank!==true){
        // Legacy plans predate per-day edit markers. Keep their missing
        // exercise entries once, until a deliberate editor save versions it.
        const existing=new Set((merged.exercises||[]).map(e=>String(e?.[4]||e?.[0]||'')));
        if(!Array.isArray(merged.exercises))merged.exercises=[];
        for(const ex of prior.exercises||[]){
          const id=String(ex?.[4]||ex?.[0]||'');
          if(id&&!existing.has(id)){merged.exercises.push(clone(ex));existing.add(id);}
        }
      }

      const priorSectionTime=number(prior.sectionsUpdatedAt);
      const currentSectionTime=number(current.sectionsUpdatedAt);
      if(priorSectionTime||currentSectionTime){
        const latest=priorSectionTime>currentSectionTime?prior:current;
        for(const key of ['warm','warmups','cooldowns','warmupEnabled','cooldownEnabled','rest']){
          if(Object.prototype.hasOwnProperty.call(latest,key))merged[key]=clone(latest[key]);
          else delete merged[key];
        }
        merged.sectionsUpdatedAt=Math.max(priorSectionTime,currentSectionTime);
      }else if(current.blank!==true){
        // Preserve unmatched legacy warm-up / cooldown items until a setup
        // edit explicitly stamps the section configuration.
        for(const field of ['warmups','cooldowns']){
          if(!Array.isArray(prior[field]))continue;
          if(!Array.isArray(merged[field]))merged[field]=[];
          const seen=new Set(merged[field].map(x=>String(x?.[0]||'').toLowerCase()));
          for(const item of prior[field]){
            const id=String(item?.[0]||'').toLowerCase();
            if(id&&!seen.has(id)){merged[field].push(clone(item));seen.add(id);}
          }
        }
      }
      data.customPlans[day]=merged;
    }
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
  function mergeBundles(local,remote,extraDeletions={}){
    if(!remote?.profiles)return clone(local);
    const deletions={};
    for(const src of [remote.deletedProfiles,local?.deletedProfiles,extraDeletions]){
      for(const [id,value] of Object.entries(src||{})){
        const ts=Number(value||0);
        if(ts>0)deletions[id]=Math.max(Number(deletions[id]||0),ts);
      }
    }
    const removed=p=>!!(p?.id&&Number(deletions[p.id]||0)>=Number(p.updatedAt||0)&&Number(deletions[p.id]||0)>0);
    const profiles=new Map();
    for(const p of remote.profiles||[])if(p?.id&&!removed(p))profiles.set(String(p.id),clone(p));
    for(const p of local?.profiles||[]){
      if(!p?.id||removed(p))continue;
      const id=String(p.id),other=profiles.get(id);
      profiles.set(id,other?mergeProfile(other,p):clone(p));
    }
    const list=[...profiles.values()].filter(p=>!removed(p));
    const active=[local?.activeProfileId,remote.activeProfileId,list[0]?.id].find(id=>list.some(p=>p.id===id));
    const updatedAt=Math.max(0,Number(local?.updatedAt||0),Number(remote.updatedAt||0),...list.map(p=>Number(p.updatedAt||0)),...Object.values(deletions).map(Number));
    return {kind:'workout-tracker-profiles',version:1,activeProfileId:active,updatedAt,deletedProfiles:deletions,profiles:list};
  }
  window.WorkoutCloudMerge={mergeProfile,mergeBundles,draftRichness};
})();