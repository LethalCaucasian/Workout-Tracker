(() => {
  const PROFILE_KEY = 'workout_tracker_profiles_v1';
  const PROFILE_KIND = 'workout-tracker-profiles';
  const appSave = save;
  let profileStore = loadOrMigrate();

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function newId(){
    if(globalThis.crypto?.randomUUID) return `p-${crypto.randomUUID()}`;
    return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function cleanState(value){
    const next = clone(value || {});
    // Old single-profile GitHub sync used this field. Profile timestamps now
    // live in the profile store instead, so it does not belong in each plan.
    delete next._syncUpdatedAt;
    if(!next.selectedDay) next.selectedDay = 1;
    if(!next.drafts || typeof next.drafts !== 'object') next.drafts = {};
    if(!Array.isArray(next.history)) next.history = [];
    return next;
  }

  function makeProfile(name, data){
    const now = Date.now();
    return {
      id:newId(),
      name:String(name || 'New Profile').trim() || 'New Profile',
      createdAt:now,
      updatedAt:now,
      data:cleanState(data)
    };
  }

  function freshState(){
    return {selectedDay:1,drafts:{},history:[],customPlans:{}};
  }

  function loadOrMigrate(){
    try{
      const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      if(parsed?.kind === PROFILE_KIND && Array.isArray(parsed.profiles) && parsed.profiles.length){
        const active = parsed.profiles.find(p=>p.id===parsed.activeProfileId) || parsed.profiles[0];
        parsed.activeProfileId = active.id;
        parsed.version = 1;
        parsed.updatedAt = Number(parsed.updatedAt || Date.now());
        parsed.profiles = parsed.profiles.map(p=>({
          ...p,
          createdAt:Number(p.createdAt || Date.now()),
          updatedAt:Number(p.updatedAt || Date.now()),
          data:cleanState(p.data)
        }));
        state = clone(active.data);
        appSave();
        return parsed;
      }
    }catch{}

    const first = makeProfile('My Profile', state);
    const migrated = {
      kind:PROFILE_KIND,
      version:1,
      activeProfileId:first.id,
      updatedAt:Date.now(),
      profiles:[first]
    };
    localStorage.setItem(PROFILE_KEY,JSON.stringify(migrated));
    state = clone(first.data);
    appSave();
    return migrated;
  }

  function activeProfile(){
    return profileStore.profiles.find(p=>p.id===profileStore.activeProfileId) || profileStore.profiles[0];
  }

  function persistStore(){
    localStorage.setItem(PROFILE_KEY,JSON.stringify(profileStore));
  }

  function notifyChange(reason='data'){
    window.dispatchEvent(new CustomEvent('workout-profile-store-change',{detail:{reason,updatedAt:profileStore.updatedAt,profileId:profileStore.activeProfileId}}));
  }

  function captureActive({force=false,reason='data'}={}){
    const p=activeProfile();
    if(!p) return false;
    const current=cleanState(state);
    const oldJson=JSON.stringify(p.data);
    const newJson=JSON.stringify(current);
    if(!force && oldJson===newJson) return false;
    const now=Date.now();
    p.data=current;
    p.updatedAt=now;
    profileStore.updatedAt=now;
    persistStore();
    notifyChange(reason);
    return true;
  }

  save = function(){
    appSave();
    captureActive();
  };

  function loadActiveIntoApp(){
    const p=activeProfile();
    state=clone(p?.data || freshState());
    appSave();
    renderToday();
    renderHistory();
    renderProgress();
    renderProfileBar();
  }

  function setActive(id){
    if(id===profileStore.activeProfileId) return;
    captureActive();
    const target=profileStore.profiles.find(p=>p.id===id);
    if(!target) return;
    profileStore.activeProfileId=id;
    profileStore.updatedAt=Date.now();
    persistStore();
    loadActiveIntoApp();
    notifyChange('active-profile');
    toast(`Profile: ${target.name}`);
  }

  function addProfile(){
    const name=prompt('Profile name:','');
    if(name===null) return;
    const clean=name.trim();
    if(!clean){alert('Enter a profile name.');return;}
    captureActive();
    const p=makeProfile(clean,freshState());
    profileStore.profiles.push(p);
    profileStore.activeProfileId=p.id;
    profileStore.updatedAt=Date.now();
    persistStore();
    loadActiveIntoApp();
    notifyChange('add-profile');
    toast(`Added ${p.name}`);
  }

  function renameProfile(){
    const p=activeProfile();
    if(!p) return;
    const name=prompt('Rename profile:',p.name);
    if(name===null) return;
    const clean=name.trim();
    if(!clean){alert('Enter a profile name.');return;}
    p.name=clean;
    p.updatedAt=Date.now();
    profileStore.updatedAt=p.updatedAt;
    persistStore();
    renderProfileBar();
    notifyChange('rename-profile');
    toast('Profile renamed');
  }

  function duplicateProfile(){
    const source=activeProfile();
    if(!source) return;
    const name=prompt('Name for duplicated profile:',`${source.name} Copy`);
    if(name===null) return;
    const clean=name.trim();
    if(!clean){alert('Enter a profile name.');return;}
    captureActive();
    const p=makeProfile(clean,source.data);
    profileStore.profiles.push(p);
    profileStore.activeProfileId=p.id;
    profileStore.updatedAt=Date.now();
    persistStore();
    loadActiveIntoApp();
    notifyChange('duplicate-profile');
    toast(`Duplicated ${source.name}`);
  }

  function deleteProfile(){
    const p=activeProfile();
    if(!p) return;
    if(profileStore.profiles.length<=1){alert('Keep at least one profile.');return;}
    if(!confirm(`Delete ${p.name}? This removes that profile's local workout history and drafts.`)) return;
    profileStore.profiles=profileStore.profiles.filter(x=>x.id!==p.id);
    profileStore.activeProfileId=profileStore.profiles[0].id;
    profileStore.updatedAt=Date.now();
    persistStore();
    loadActiveIntoApp();
    notifyChange('delete-profile');
    toast('Profile deleted');
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const style=document.createElement('style');
  style.textContent=`
    .profilebar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 12px;padding:9px 10px;border:1px solid #20334e;background:#0d1727;border-radius:12px}
    .profilebar .profile-label{font-size:11px;font-weight:900;letter-spacing:.55px;color:#91a2b8;text-transform:uppercase}
    .profilebar select{min-width:150px;max-width:240px;flex:1;background:#091321;color:#fff;border:1px solid #2b3f5e;border-radius:9px;padding:9px 10px;font-weight:800;outline:none}
    .profilebar .profile-actions{display:flex;gap:6px;flex-wrap:wrap}
    .profilebar .profile-btn{border:1px solid #2b3f5e;background:#122138;color:#dce7f4;border-radius:8px;padding:8px 9px;font-size:12px;font-weight:800}
    .profilebar .profile-btn.danger{border-color:#673344;color:#ffb2bf}
    @media(max-width:620px){.profilebar{align-items:stretch}.profilebar .profile-label{width:100%}.profilebar select{max-width:none;width:100%}.profilebar .profile-actions{width:100%}.profilebar .profile-btn{flex:1}}
  `;
  document.head.appendChild(style);

  function ensureProfileBar(){
    let bar=document.getElementById('profileBar');
    if(bar) return bar;
    bar=document.createElement('div');
    bar.id='profileBar';
    bar.className='profilebar';
    const top=document.querySelector('.topbar');
    if(top) top.insertAdjacentElement('afterend',bar);
    return bar;
  }

  function renderProfileBar(){
    const bar=ensureProfileBar();
    if(!bar) return;
    const active=activeProfile();
    bar.innerHTML=`
      <span class="profile-label">Profile</span>
      <select id="profileSelect" aria-label="Workout profile">
        ${profileStore.profiles.map(p=>`<option value="${escapeHtml(p.id)}" ${p.id===active?.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
      </select>
      <div class="profile-actions">
        <button class="profile-btn" id="profileAdd" type="button">+ Add</button>
        <button class="profile-btn" id="profileRename" type="button">Rename</button>
        <button class="profile-btn" id="profileDuplicate" type="button">Duplicate</button>
        <button class="profile-btn danger" id="profileDelete" type="button">Delete</button>
      </div>`;
    bar.querySelector('#profileSelect').onchange=e=>setActive(e.target.value);
    bar.querySelector('#profileAdd').onclick=addProfile;
    bar.querySelector('#profileRename').onclick=renameProfile;
    bar.querySelector('#profileDuplicate').onclick=duplicateProfile;
    bar.querySelector('#profileDelete').onclick=deleteProfile;
  }

  function normalizeImportedBundle(bundle){
    if(bundle?.kind!==PROFILE_KIND || !Array.isArray(bundle.profiles) || !bundle.profiles.length) throw new Error('Invalid profile backup');
    const now=Date.now();
    const profiles=bundle.profiles.map(p=>({
      id:String(p.id || newId()),
      name:String(p.name || 'Profile'),
      createdAt:Number(p.createdAt || now),
      updatedAt:Number(p.updatedAt || now),
      data:cleanState(p.data)
    }));
    const active=profiles.some(p=>p.id===bundle.activeProfileId)?bundle.activeProfileId:profiles[0].id;
    return {kind:PROFILE_KIND,version:1,activeProfileId:active,updatedAt:Number(bundle.updatedAt || now),profiles};
  }

  function importBundle(bundle,{preserveActive=false,notify=true}={}){
    captureActive();
    const oldActive=profileStore.activeProfileId;
    profileStore=normalizeImportedBundle(bundle);
    if(preserveActive && profileStore.profiles.some(p=>p.id===oldActive)) profileStore.activeProfileId=oldActive;
    persistStore();
    loadActiveIntoApp();
    if(notify) notifyChange('import-profiles');
  }

  function importLegacyState(legacy,name='Imported Profile',{notify=true}={}){
    const p=makeProfile(name,legacy);
    profileStore={kind:PROFILE_KIND,version:1,activeProfileId:p.id,updatedAt:Date.now(),profiles:[p]};
    persistStore();
    loadActiveIntoApp();
    if(notify) notifyChange('import-legacy');
  }

  // Export/import now backs up every managed profile while still accepting the
  // original single-profile JSON format.
  const exportBtn=document.getElementById('exportBtn');
  if(exportBtn){
    exportBtn.onclick=()=>{
      captureActive();
      const blob=new Blob([JSON.stringify(profileStore,null,2)],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='workout-tracker-profiles-backup.json';
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  const importFile=document.getElementById('importFile');
  if(importFile){
    importFile.onchange=(ev)=>{
      const f=ev.target.files[0];
      if(!f) return;
      const r=new FileReader();
      r.onload=()=>{
        try{
          const x=JSON.parse(r.result);
          if(x?.kind===PROFILE_KIND) importBundle(x);
          else if(x?.history && x?.drafts) {
            state=cleanState(x);
            appSave();
            captureActive({force:true,reason:'import-legacy-into-profile'});
            loadActiveIntoApp();
          } else throw new Error('Invalid backup');
          toast('Data imported');
        }catch{
          alert("That file doesn't look like a valid workout tracker backup.");
        }
        ev.target.value='';
      };
      r.readAsText(f);
    };
  }

  window.WorkoutProfiles={
    exportData(){captureActive();return clone(profileStore);},
    importData(bundle,options={}){importBundle(bundle,options);},
    importLegacyState(legacy,name,options={}){importLegacyState(legacy,name,options);},
    getUpdatedAt(){captureActive();return Number(profileStore.updatedAt || 0);},
    getActiveProfile(){const p=activeProfile();return p?{id:p.id,name:p.name}:null;},
    listProfiles(){return profileStore.profiles.map(p=>({id:p.id,name:p.name,createdAt:p.createdAt,updatedAt:p.updatedAt}));},
    getStore(){captureActive();return clone(profileStore);}
  };

  renderProfileBar();
  loadActiveIntoApp();
})();
