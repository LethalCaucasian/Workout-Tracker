(() => {
  function fmtSet(set,type){
    if(window.WorkoutV2?.formatSet) return WorkoutV2.formatSet(set,type);
    const mode=type==='mixed'?(set.mode||'reps'):type;
    const prefix=set.weight?`${set.weight} lb × `:'';
    if(mode==='sec') return `${prefix}${set.value} sec${set.done?' ✓':''}`;
    if(mode==='min') return `${prefix}${set.value} min${set.done?' ✓':''}`;
    return `${prefix}${set.value} reps${set.done?' ✓':''}`;
  }

  summaryText=function(h){
    if(!h) return 'No saved workouts yet.';
    const lines=[`${h.date} — Day ${h.day}: ${h.name}`];
    if(h.warmupEntries?.length){lines.push('Warm-up:');h.warmupEntries.forEach(e=>lines.push(`- ${e.name}: ${formatWarmupEntry(e)}`));}
    else if(h.warmup) lines.push('Warm-up: complete');
    (h.exercises||[]).forEach(e=>lines.push(`${e.name}: ${(e.sets||[]).map(s=>fmtSet(s,e.type)).join(' | ')}`));
    if(h.cooldown) lines.push(`Cooldown: ${h.cooldown}`);
    if(h.notes) lines.push(`Notes: ${h.notes}`);
    return lines.join('\n');
  };

  window.copyCurrent=()=>{
    const p=selectedPlan(),d=getDraft(),warmups=warmupsForDay(p.day);
    const h={
      date:d.date,day:p.day,name:p.name||`Day ${p.day}`,warmup:d.warmup,cooldown:d.cooldown||'',notes:d.notes||'',
      warmupEntries:warmups.map((w,i)=>({name:w[0],type:w[2],weight:parseFloat(d.warmupEntries[i].weight)||0,value:parseFloat(d.warmupEntries[i].value)||0,done:!!d.warmupEntries[i].done})),
      exercises:p.exercises.map((ex,i)=>({exerciseId:ex[4],name:ex[0],type:ex[3],sets:(d.sets[i]||[]).map(s=>({weight:parseFloat(s.weight)||0,value:parseFloat(s.value)||0,done:!!s.done,mode:s.mode||ex[3]}))}))
    };
    copyText(summaryText(h));
  };
})();
