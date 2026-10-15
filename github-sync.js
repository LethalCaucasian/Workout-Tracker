(() => {
  const SETTINGS_KEY = 'workout_tracker_github_sync_v1';
  const TOKEN_SESSION_KEY = 'workout_tracker_github_token_session_v1';
  const TOKEN_LOCAL_KEY = 'workout_tracker_github_token_local_v1';
  const MANIFEST_KIND = 'workout-tracker-profile-manifest';

  let settings = loadSettings();
  let syncTimer = null;
  let syncBusy = false;
  let suppressAutoSync = false;

  const style = document.createElement('style');
  style.textContent = `
    .gh-sync-card{margin-top:10px}
    .gh-sync-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .gh-sync-field{display:flex;flex-direction:column;gap:5px}
    .gh-sync-field.full{grid-column:1/-1}
    .gh-sync-field label{font-size:11px;color:#99a8bc;font-weight:800;text-transform:uppercase;letter-spacing:.4px}
    .gh-sync-field input{width:100%;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:9px;padding:10px;outline:none}
    .gh-sync-options{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0}
    .gh-sync-options label{display:flex;align-items:center;gap:7px;color:#c8d3e1;font-size:13px}
    .gh-sync-status{margin-top:8px;font-size:12px;color:#99a8bc;line-height:1.4}
    .gh-sync-status.ok{color:#42d38a}
    .gh-sync-status.warn{color:#ffcf5a}
    .gh-sync-status.err{color:#ff9dab}
    @media(max-width:620px){.gh-sync-grid{grid-template-columns:1fr}.gh-sync-field.full{grid-column:auto}}
  `;
  document.head.appendChild(style);

  function loadSettings(){
    try{
      const stored=JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const next={
        owner:'LethalCaucasian',repo:'',branch:'main',path:'profiles.json',
        autoSync:true,rememberToken:false,initialized:false,...stored
      };
      if(!next.initialized && next.path==='workout-data.json') next.path='profiles.json';
      return next;
    }catch{
      return {owner:'LethalCaucasian',repo:'',branch:'main',path:'profiles.json',autoSync:true,rememberToken:false,initialized:false};
    }
  }

  function persistSettings(){
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  }

  function getToken(){
    return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_LOCAL_KEY) || '';
  }

  function storeToken(token,remember){
    const clean=String(token || '').trim();
    if(clean) sessionStorage.setItem(TOKEN_SESSION_KEY,clean);
    else sessionStorage.removeItem(TOKEN_SESSION_KEY);
    if(remember && clean) localStorage.setItem(TOKEN_LOCAL_KEY,clean);
    else localStorage.removeItem(TOKEN_LOCAL_KEY);
  }

  function validConfig(){
    return settings.owner && settings.repo && settings.branch && settings.path && getToken();
  }

  function status(text,type=''){
    const el=document.getElementById('ghSyncStatus');
    if(!el) return;
    el.textContent=text;
    el.className=`gh-sync-status ${type}`;
  }

  function encodeBase64(str){
    const bytes=new TextEncoder().encode(str);
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(binary);
  }

  function decodeBase64(str){
    const binary=atob(String(str || '').replace(/\n/g,''));
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function apiUrl(path){
    const safe=String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${safe}`;
  }

  function manifestDir(){
    const i=settings.path.lastIndexOf('/');
    return i>=0?settings.path.slice(0,i+1):'';
  }

  function profileFilePath(id){
    return `${manifestDir()}profiles/${id}.json`;
  }

  async function githubRequest(url,options={}){
    const res=await fetch(url,{
      ...options,
      headers:{
        'Accept':'application/vnd.github+json',
        'Authorization':`Bearer ${getToken()}`,
        'X-GitHub-Api-Version':'2022-11-28',
        ...(options.headers || {})
      }
    });
    if(res.status===204) return null;
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      const err=new Error(data.message || `GitHub request failed (${res.status})`);
      err.status=res.status;
      throw err;
    }
    return data;
  }

  async function fetchJsonFile(path){
    try{
      const data=await githubRequest(`${apiUrl(path)}?ref=${encodeURIComponent(settings.branch)}`);
      return {sha:data.sha,value:JSON.parse(decodeBase64(data.content))};
    }catch(err){
      if(err.status===404) return null;
      throw err;
    }
  }

  async function putJsonFile(path,value,message){
    const existing=await fetchJsonFile(path);
    const body={message,content:encodeBase64(JSON.stringify(value,null,2)),branch:settings.branch};
    if(existing?.sha) body.sha=existing.sha;
    return githubRequest(apiUrl(path),{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
  }

  function localBundle(){
    if(window.WorkoutProfiles) return WorkoutProfiles.exportData();
    return {
      kind:'workout-tracker-profiles',version:1,activeProfileId:'legacy',updatedAt:Date.now(),
      profiles:[{id:'legacy',name:'My Profile',createdAt:Date.now(),updatedAt:Date.now(),data:JSON.parse(JSON.stringify(state))}]
    };
  }

  async function fetchRemoteManifest(){
    return fetchJsonFile(settings.path);
  }

  async function fetchRemoteBundle(){
    const remote=await fetchRemoteManifest();
    if(!remote) return null;
    const value=remote.value;

    // Backward compatibility with the first single-profile sync format.
    if(value?.history && value?.drafts){
      return {legacy:true,sha:remote.sha,state:value,updatedAt:Number(value._syncUpdatedAt || 0)};
    }

    if(value?.kind!==MANIFEST_KIND || !Array.isArray(value.profiles)) throw new Error('Remote manifest is not valid workout profile data');
    const loaded=await Promise.all(value.profiles.map(async meta=>{
      const file=await fetchJsonFile(meta.file || profileFilePath(meta.id));
      if(!file?.value) throw new Error(`Missing profile file for ${meta.name || meta.id}`);
      const payload=file.value;
      return {
        id:String(payload.id || meta.id),
        name:String(payload.name || meta.name || 'Profile'),
        createdAt:Number(payload.createdAt || meta.createdAt || Date.now()),
        updatedAt:Number(payload.updatedAt || meta.updatedAt || 0),
        data:payload.data || payload.state || {}
      };
    }));

    return {
      legacy:false,
      sha:remote.sha,
      updatedAt:Number(value.updatedAt || 0),
      bundle:{
        kind:'workout-tracker-profiles',version:1,
        activeProfileId:value.activeProfileId || loaded[0]?.id,
        updatedAt:Number(value.updatedAt || Date.now()),
        profiles:loaded
      }
    };
  }

  async function pushBundle(manual=false){
    if(syncBusy) return;
    if(!validConfig()){
      if(manual) status('Enter the repo details and token first.','warn');
      return;
    }

    syncBusy=true;
    if(manual) status('Uploading profiles…');
    try{
      const bundle=localBundle();
      const now=Date.now();
      if(!bundle.updatedAt) bundle.updatedAt=now;

      await Promise.all(bundle.profiles.map(profile=>putJsonFile(
        profileFilePath(profile.id),
        {
          kind:'workout-tracker-profile',version:1,
          id:profile.id,name:profile.name,
          createdAt:profile.createdAt,updatedAt:profile.updatedAt,
          data:profile.data
        },
        `Sync workout profile: ${profile.name}`
      )));

      const manifest={
        kind:MANIFEST_KIND,version:1,
        updatedAt:Number(bundle.updatedAt || now),
        activeProfileId:bundle.activeProfileId,
        profiles:bundle.profiles.map(profile=>({
          id:profile.id,name:profile.name,
          createdAt:profile.createdAt,updatedAt:profile.updatedAt,
          file:profileFilePath(profile.id)
        }))
      };
      await putJsonFile(settings.path,manifest,'Sync workout profile manifest');

      settings.initialized=true;
      settings.lastSync=Date.now();
      persistSettings();
      status(`Synced ${bundle.profiles.length} profile${bundle.profiles.length===1?'':'s'} • ${new Date(settings.lastSync).toLocaleString()}`,'ok');
    }catch(err){
      status(`GitHub sync failed: ${err.message}`,'err');
    }finally{
      syncBusy=false;
    }
  }

  async function pullBundle(manual=false){
    if(syncBusy) return;
    if(!validConfig()){
      if(manual) status('Enter the repo details and token first.','warn');
      return;
    }

    syncBusy=true;
    if(manual) status('Downloading profiles…');
    try{
      const remote=await fetchRemoteBundle();
      if(!remote){
        status('No profile data exists in that repo yet. Use Push Now to create it.','warn');
        return;
      }

      suppressAutoSync=true;
      if(remote.legacy){
        if(window.WorkoutProfiles) WorkoutProfiles.importLegacyState(remote.state,'Imported Profile',{notify:false});
        else {state=remote.state;save();renderToday();renderHistory();renderProgress();}
      }else if(window.WorkoutProfiles){
        WorkoutProfiles.importData(remote.bundle,{preserveActive:true,notify:false});
      }else{
        state=remote.bundle.profiles[0]?.data || state;
        save();renderToday();renderHistory();renderProgress();
      }
      suppressAutoSync=false;

      settings.initialized=true;
      settings.lastSync=Date.now();
      persistSettings();
      const count=remote.legacy?1:remote.bundle.profiles.length;
      status(`Pulled ${count} profile${count===1?'':'s'} • ${new Date(settings.lastSync).toLocaleString()}`,'ok');
    }catch(err){
      status(`GitHub pull failed: ${err.message}`,'err');
    }finally{
      suppressAutoSync=false;
      syncBusy=false;
    }
  }

  async function autoSync(){
    if(!settings.autoSync || !settings.initialized || !validConfig() || syncBusy) return;
    syncBusy=true;
    try{
      const remote=await fetchRemoteBundle();
      const local=localBundle();
      const localTime=Number(local.updatedAt || 0);
      const remoteTime=Number(remote?.updatedAt || 0);

      if(remote && remoteTime>localTime){
        suppressAutoSync=true;
        if(remote.legacy){
          WorkoutProfiles?.importLegacyState(remote.state,'Imported Profile',{notify:false});
        }else{
          WorkoutProfiles?.importData(remote.bundle,{preserveActive:true,notify:false});
        }
        suppressAutoSync=false;
        settings.lastSync=Date.now();
        persistSettings();
        status(`Auto-pulled newer profile data • ${new Date(settings.lastSync).toLocaleTimeString()}`,'ok');
      }else if(!remote || localTime>remoteTime){
        syncBusy=false;
        await pushBundle(false);
        return;
      }
    }catch(err){
      status(`Auto-sync paused: ${err.message}`,'err');
    }finally{
      suppressAutoSync=false;
      syncBusy=false;
    }
  }

  function scheduleAutoSync(){
    if(suppressAutoSync || !settings.autoSync || !settings.initialized) return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(autoSync,1800);
  }

  window.addEventListener('workout-profile-store-change',scheduleAutoSync);

  function saveUiSettings(){
    const oldKey=`${settings.owner}/${settings.repo}/${settings.branch}/${settings.path}`;
    settings.owner=document.getElementById('ghOwner').value.trim();
    settings.repo=document.getElementById('ghRepo').value.trim();
    settings.branch=document.getElementById('ghBranch').value.trim() || 'main';
    settings.path=document.getElementById('ghPath').value.trim() || 'profiles.json';
    settings.autoSync=document.getElementById('ghAuto').checked;
    settings.rememberToken=document.getElementById('ghRemember').checked;
    storeToken(document.getElementById('ghToken').value,settings.rememberToken);
    const newKey=`${settings.owner}/${settings.repo}/${settings.branch}/${settings.path}`;
    if(newKey!==oldKey) settings.initialized=false;
    persistSettings();
    status('GitHub sync settings saved. Use Push Now or Pull Now for the first sync.','ok');
  }

  function injectUi(){
    const section=document.getElementById('settings');
    if(!section || document.getElementById('githubSyncCard')) return;

    const card=document.createElement('div');
    card.id='githubSyncCard';
    card.className='card gh-sync-card';
    card.innerHTML=`
      <h3>☁️ GitHub Sync</h3>
      <p class="install-note">Backs up every workout profile to one GitHub repo. Each person is stored in a separate profile file, with one small manifest tying them together. A <b>private</b> repo is recommended.</p>
      <div class="gh-sync-grid">
        <div class="gh-sync-field"><label>Owner</label><input id="ghOwner" value="${escapeHtml(settings.owner)}" placeholder="GitHub username"></div>
        <div class="gh-sync-field"><label>Repository</label><input id="ghRepo" value="${escapeHtml(settings.repo)}" placeholder="e.g. Workout-Tracker-Data"></div>
        <div class="gh-sync-field"><label>Branch</label><input id="ghBranch" value="${escapeHtml(settings.branch)}" placeholder="main"></div>
        <div class="gh-sync-field"><label>Manifest file</label><input id="ghPath" value="${escapeHtml(settings.path)}" placeholder="profiles.json"></div>
        <div class="gh-sync-field full"><label>Fine-grained access token</label><input id="ghToken" type="password" value="${escapeHtml(getToken())}" autocomplete="off" placeholder="GitHub token with Contents: read/write"></div>
      </div>
      <div class="gh-sync-options">
        <label><input id="ghAuto" type="checkbox" ${settings.autoSync?'checked':''}> Auto-sync changes</label>
        <label><input id="ghRemember" type="checkbox" ${settings.rememberToken?'checked':''}> Remember token on this device</label>
      </div>
      <div class="toolbar">
        <button class="btn" id="ghSaveSettings" type="button">Save Settings</button>
        <button class="btn good" id="ghPush" type="button">Push Now</button>
        <button class="btn primary" id="ghPull" type="button">Pull Now</button>
      </div>
      <div id="ghSyncStatus" class="gh-sync-status">${settings.lastSync?`Last sync: ${new Date(settings.lastSync).toLocaleString()}`:'Not synced yet.'}</div>
      <p class="install-note">Use a fine-grained token limited to the private data repo with only <b>Contents: Read and write</b>. Friends and family do not need GitHub accounts because you manage the repo. The token is never written into profile files or exports.</p>`;

    const phoneCard=[...section.querySelectorAll('.card')].find(c=>c.querySelector('h3')?.textContent.includes('Phone use'));
    section.insertBefore(card,phoneCard || null);
    card.querySelector('#ghSaveSettings').onclick=saveUiSettings;
    card.querySelector('#ghPush').onclick=()=>{saveUiSettings();pushBundle(true)};
    card.querySelector('#ghPull').onclick=()=>{saveUiSettings();pullBundle(true)};
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  injectUi();
  if(settings.autoSync && settings.initialized && validConfig()) setTimeout(autoSync,700);
})();
