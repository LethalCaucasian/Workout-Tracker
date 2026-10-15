(() => {
  const SETTINGS_KEY='workout_tracker_github_sync_v1';
  const TOKEN_SESSION_KEY='workout_tracker_github_token_session_v1';
  const TOKEN_LOCAL_KEY='workout_tracker_github_token_local_v1';
  const FAMILY_CLIENT_KEY='workout_tracker_family_client_v1';
  const MANIFEST_KIND='workout-tracker-profile-manifest';

  const stateInfo=window.WorkoutStartupCloudState={checked:false,failed:false,skipped:false};

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function loadJson(storage,key){try{return JSON.parse(storage.getItem(key)||'null')}catch{return null}}
  function settings(){return loadJson(localStorage,SETTINGS_KEY)||{};}
  function token(){return sessionStorage.getItem(TOKEN_SESSION_KEY)||localStorage.getItem(TOKEN_LOCAL_KEY)||'';}
  function familyMode(){
    const c=loadJson(localStorage,FAMILY_CLIENT_KEY);
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    return !!(c?.profileId&&c?.key&&c?.api) || !!(hash.get('profile')&&hash.get('key')&&hash.get('api'));
  }
  function valid(cfg){return !!(cfg?.owner&&cfg?.repo&&cfg?.branch&&cfg?.path&&token());}
  function decodeBase64(str){
    const binary=atob(String(str||'').replace(/\n/g,''));
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function apiUrl(cfg,path){
    const safe=String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${safe}`;
  }
  function manifestDir(cfg){
    const i=String(cfg.path||'profiles.json').lastIndexOf('/');
    return i>=0?cfg.path.slice(0,i+1):'';
  }
  function profilePath(cfg,id){return `${manifestDir(cfg)}profiles/${id}.json`;}
  function headers(){return {
    'Accept':'application/vnd.github+json',
    'Authorization':`Bearer ${token()}`,
    'X-GitHub-Api-Version':'2022-11-28'
  };}
  async function fetchJson(cfg,path){
    const res=await fetch(`${apiUrl(cfg,path)}?ref=${encodeURIComponent(cfg.branch)}`,{headers:headers()});
    if(res.status===404) return null;
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.message||`GitHub request failed (${res.status})`);
    return {sha:data.sha,value:JSON.parse(decodeBase64(data.content))};
  }
  function meaningfulDraft(d){
    if(!d||typeof d!=='object') return false;
    if(String(d.notes||'').trim()) return true;
    const sections=[...(d.warmupEntries||[]),...(d.cooldownEntries||[])];
    if(sections.some(x=>x?.done||String(x?.weight||'').trim()||String(x?.value||'').trim())) return true;
    return (d.sets||[]).some(rows=>(rows||[]).some(x=>x?.done||String(x?.weight||'').trim()||String(x?.value||'').trim()));
  }
  function meaningfulProfile(p){
    const d=p?.data||{};
    if(Array.isArray(d.history)&&d.history.length) return true;
    if(d.customPlans&&Object.keys(d.customPlans).length) return true;
    if(d.exerciseLibrary&&Object.keys(d.exerciseLibrary).length) return true;
    if(d.routineBlank===true) return true;
    return Object.values(d.drafts||{}).some(meaningfulDraft);
  }
  async function remoteBundle(cfg){
    const manifest=await fetchJson(cfg,cfg.path);
    if(!manifest) return null;
    const m=manifest.value;
    if(m?.history&&m?.drafts) return {legacy:true,state:m};
    if(m?.kind!==MANIFEST_KIND||!Array.isArray(m.profiles)) throw new Error('Remote manifest is not valid workout profile data');
    const profiles=await Promise.all(m.profiles.map(async meta=>{
      const file=await fetchJson(cfg,meta.file||profilePath(cfg,meta.id));
      if(!file?.value) throw new Error(`Missing profile file for ${meta.name||meta.id}`);
      const p=file.value;
      return {
        id:String(p.id||meta.id),name:String(p.name||meta.name||'Profile'),
        createdAt:Number(p.createdAt||meta.createdAt||Date.now()),
        updatedAt:Number(p.updatedAt||meta.updatedAt||0),data:p.data||p.state||{}
      };
    }));
    return {legacy:false,bundle:{
      kind:'workout-tracker-profiles',version:1,
      activeProfileId:m.activeProfileId||profiles[0]?.id,
      updatedAt:Number(m.updatedAt||0),profiles
    }};
  }
  function merge(local,remote){
    const map=new Map();
    (remote.profiles||[]).forEach(p=>{if(p?.id)map.set(String(p.id),clone(p));});
    (local.profiles||[]).forEach(p=>{
      if(!p?.id) return;
      const id=String(p.id),r=map.get(id),meaningful=meaningfulProfile(p);
      if(!r){
        if(meaningful||String(p.name||'')!=='My Profile') map.set(id,clone(p));
        return;
      }
      if(meaningful&&Number(p.updatedAt||0)>Number(r.updatedAt||0)) map.set(id,clone(p));
    });
    const profiles=[...map.values()];
    const active=profiles.some(p=>p.id===local.activeProfileId)?local.activeProfileId:
      (profiles.some(p=>p.id===remote.activeProfileId)?remote.activeProfileId:profiles[0]?.id);
    const updatedAt=Math.max(Number(remote.updatedAt||0),...profiles.map(p=>Number(p.updatedAt||0)),0);
    return {kind:'workout-tracker-profiles',version:1,activeProfileId:active,updatedAt,profiles};
  }
  function setStatus(text,type=''){
    const el=document.getElementById('ghSyncStatus');
    if(el){el.textContent=text;el.className=`gh-sync-status ${type}`;}
  }

  window.WorkoutStartupCloudReady=(async()=>{
    if(familyMode()){
      stateInfo.checked=true;stateInfo.skipped=true;
      return true;
    }
    const cfg=settings();
    if(!cfg.initialized||!cfg.autoSync||!valid(cfg)){
      stateInfo.checked=true;stateInfo.skipped=true;
      return true;
    }
    try{
      setStatus('Checking saved cloud data before uploads…');
      const remote=await remoteBundle(cfg);
      if(!remote){
        stateInfo.checked=true;
        return true;
      }
      if(!window.WorkoutProfiles){throw new Error('Profile manager is not ready');}
      if(remote.legacy){
        WorkoutProfiles.importLegacyState(remote.state,'Imported Profile',{notify:false});
      }else{
        const local=WorkoutProfiles.getStore();
        const combined=merge(local,remote.bundle);
        WorkoutProfiles.importData(combined,{preserveActive:true,notify:false});
      }
      const latest=settings();
      latest.lastSync=Date.now();
      localStorage.setItem(SETTINGS_KEY,JSON.stringify(latest));
      stateInfo.checked=true;
      setStatus('Cloud data checked and protected before uploads.','ok');
      return true;
    }catch(err){
      stateInfo.failed=true;
      stateInfo.checked=false;
      setStatus(`Startup cloud check failed: ${err.message}. Uploads are blocked to protect saved data.`,'err');
      throw err;
    }
  })();
})();
