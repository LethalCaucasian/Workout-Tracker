(() => {
  if(!window.WorkoutProfiles) return;

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function newId(){
    if(globalThis.crypto?.randomUUID) return `p-${crypto.randomUUID()}`;
    return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function blankState(){
    return {
      selectedDay:1,
      drafts:{},
      history:[],
      customPlans:{},
      exerciseLibrary:{},
      warmupWeightEnabled:{},
      routineBlank:true
    };
  }
  function routineOnlyState(source){
    const s=source||{};
    return {
      selectedDay:1,
      drafts:{},
      history:[],
      customPlans:clone(s.customPlans||{}),
      exerciseLibrary:clone(s.exerciseLibrary||{}),
      warmupWeightEnabled:{},
      routineBlank:!!s.routineBlank
    };
  }
  function makeProfile(name,data){
    const now=Date.now();
    return {id:newId(),name,createdAt:now,updatedAt:now,data};
  }

  function addBlankProfile(){
    const name=prompt('Profile name:','');
    if(name===null) return;
    const clean=name.trim();
    if(!clean){alert('Enter a profile name.');return;}
    const bundle=WorkoutProfiles.getStore();
    const p=makeProfile(clean,blankState());
    bundle.profiles.push(p);
    bundle.activeProfileId=p.id;
    bundle.updatedAt=Date.now();
    WorkoutProfiles.importData(bundle);
    if(typeof toast==='function') toast(`Added ${clean} — blank routine`);
  }

  function duplicateRoutine(){
    const bundle=WorkoutProfiles.getStore();
    const source=bundle.profiles.find(p=>p.id===bundle.activeProfileId);
    if(!source) return;
    const name=prompt('Name for duplicated routine:',`${source.name} Copy`);
    if(name===null) return;
    const clean=name.trim();
    if(!clean){alert('Enter a profile name.');return;}
    const p=makeProfile(clean,routineOnlyState(source.data));
    bundle.profiles.push(p);
    bundle.activeProfileId=p.id;
    bundle.updatedAt=Date.now();
    WorkoutProfiles.importData(bundle);
    if(typeof toast==='function') toast(`Copied routine to ${clean}`);
  }

  document.addEventListener('click',event=>{
    const add=event.target.closest?.('#profileAdd');
    const dup=event.target.closest?.('#profileDuplicate');
    if(!add && !dup) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(add) addBlankProfile();
    else duplicateRoutine();
  },true);

  function relabel(){
    const add=document.getElementById('profileAdd');
    const dup=document.getElementById('profileDuplicate');
    if(add && add.textContent!=='+ Blank Profile') add.textContent='+ Blank Profile';
    if(dup && dup.textContent!=='Duplicate Routine') dup.textContent='Duplicate Routine';
  }
  new MutationObserver(relabel).observe(document.body,{childList:true,subtree:true});
  relabel();
})();
