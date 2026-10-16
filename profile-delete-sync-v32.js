(() => {
  const KEY='workout_tracker_profile_deletions_v1';
  const SETTINGS_KEY='workout_tracker_github_sync_v1';
  const TOKEN_SESSION_KEY='workout_tracker_github_token_session_v1';
  const TOKEN_LOCAL_KEY='workout_tracker_github_token_local_v1';
  let pendingDelete=null;

  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
      if(!raw||typeof raw!=='object'||Array.isArray(raw)) return {};
      const out={};
      Object.entries(raw).forEach(([id,ts])=>{const n=Number(ts||0);if(id&&n>0)out[String(id)]=n;});
      return out;
    }catch{return {};}
  }

  function save(value){localStorage.setItem(KEY,JSON.stringify(value||{}));}

  function mark(id,when=Date.now()){
    if(!id)return;
    const all=load(),key=String(id),ts=Number(when||Date.now());
    all[key]=Math.max(Number(all[key]||0),ts);
    save(all);
    return all[key];
  }

  function get(id){return Number(load()[String(id)]||0);}
  function all(){return {...load()};}
  function isDeleted(id,updatedAt=0){
    const ts=get(id);
    return ts>0 && ts>=Number(updatedAt||0);
  }

  function token(){return sessionStorage.getItem(TOKEN_SESSION_KEY)||localStorage.getItem(TOKEN_LOCAL_KEY)||'';}
  function settings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}catch{return {};}}
  function manifestDir(cfg){const path=String(cfg?.path||'profiles.json'),i=path.lastIndexOf('/');return i>=0?path.slice(0,i+1):'';}
  function apiUrl(cfg,path){
    const safe=String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${safe}`;
  }
  function headers(tok){return {'Accept':'application/vnd.github+json','Authorization':`Bearer ${tok}`,'X-GitHub-Api-Version':'2022-11-28'};}
  function decodeBase64(str){
    const binary=atob(String(str||'').replace(/\n/g,''));
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function encodeBase64(str){
    const bytes=new TextEncoder().encode(str);
    let binary='';
    for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary);
  }

  async function removeFromManifest(cfg,tok,id){
    const url=apiUrl(cfg,cfg.path);
    const current=await fetch(`${url}?ref=${encodeURIComponent(cfg.branch||'main')}`,{headers:headers(tok)});
    if(current.status===404)return false;
    if(!current.ok)return false;
    const file=await current.json().catch(()=>null);
    if(!file?.sha||!file?.content)return false;

    let manifest;
    try{manifest=JSON.parse(decodeBase64(file.content));}catch{return false;}
    if(!manifest||!Array.isArray(manifest.profiles))return false;

    const deletedAt=get(id)||Date.now();
    const deletedProfiles={...(manifest.deletedProfiles||{})};
    deletedProfiles[String(id)]=Math.max(Number(deletedProfiles[String(id)]||0),deletedAt);
    const profiles=manifest.profiles.filter(p=>String(p?.id||'')!==String(id));
    let activeProfileId=manifest.activeProfileId;
    if(String(activeProfileId||'')===String(id)) activeProfileId=profiles[0]?.id||null;
    const next={
      ...manifest,
      updatedAt:Math.max(Number(manifest.updatedAt||0),deletedAt),
      activeProfileId,
      deletedProfiles,
      profiles
    };
    const res=await fetch(url,{
      method:'PUT',
      headers:{...headers(tok),'Content-Type':'application/json'},
      body:JSON.stringify({
        message:`Remove deleted workout profile ${id} from manifest`,
        sha:file.sha,
        branch:cfg.branch||'main',
        content:encodeBase64(JSON.stringify(next,null,2))
      })
    });
    return res.ok;
  }

  async function deleteRemoteFile(cfg,tok,path,message){
    const url=apiUrl(cfg,path);
    const current=await fetch(`${url}?ref=${encodeURIComponent(cfg.branch||'main')}`,{headers:headers(tok)});
    if(current.status===404)return true;
    if(!current.ok)return false;
    const data=await current.json().catch(()=>null);
    if(!data?.sha)return false;
    const res=await fetch(url,{
      method:'DELETE',
      headers:{...headers(tok),'Content-Type':'application/json'},
      body:JSON.stringify({message,sha:data.sha,branch:cfg.branch||'main'})
    });
    return res.ok||res.status===404;
  }

  async function cleanupCloud(id){
    const cfg=settings(),tok=token();
    if(!id||!cfg?.owner||!cfg?.repo||!cfg?.branch||!cfg?.path||!tok)return false;
    const dir=manifestDir(cfg);
    const profilePath=`${dir}profiles/${id}.json`;
    try{
      // Remove the manifest reference first. This prevents auto-sync from trying
      // to load a profile file while that file is being deleted.
      const manifestUpdated=await removeFromManifest(cfg,tok,id);
      if(!manifestUpdated)return false;
      const profileDeleted=await deleteRemoteFile(cfg,tok,profilePath,`Delete workout profile ${id}`);
      const accessDeleted=await deleteRemoteFile(cfg,tok,`access/${id}.json`,`Revoke workout profile access ${id}`);
      return profileDeleted&&accessDeleted;
    }catch{return false;}
  }

  async function cleanupAll(){
    const ids=Object.keys(load());
    for(const id of ids) await cleanupCloud(id);
  }

  window.WorkoutProfileDeletions={load:all,mark,get,isDeleted,cleanupCloud,cleanupAll};

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#profileDelete');
    if(!btn)return;
    const active=window.WorkoutProfiles?.getActiveProfile?.();
    pendingDelete=active?.id?{id:String(active.id),name:String(active.name||'Profile')}:null;
  },true);

  window.addEventListener('workout-profile-store-change',e=>{
    if(e?.detail?.reason!=='delete-profile'||!pendingDelete?.id)return;
    const id=pendingDelete.id;
    const stillExists=(window.WorkoutProfiles?.listProfiles?.()||[]).some(p=>String(p.id)===id);
    if(stillExists)return;
    mark(id,Date.now());
    pendingDelete=null;
    // Start cloud cleanup before the normal 1.8 s auto-sync debounce fires.
    setTimeout(()=>cleanupCloud(id),120);
  });

  window.addEventListener('load',()=>setTimeout(cleanupAll,5000));
})();
