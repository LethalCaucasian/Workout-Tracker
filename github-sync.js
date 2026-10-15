(() => {
  const SETTINGS_KEY = 'workout_tracker_github_sync_v1';
  const TOKEN_SESSION_KEY = 'workout_tracker_github_token_session_v1';
  const TOKEN_LOCAL_KEY = 'workout_tracker_github_token_local_v1';

  let settings = loadSettings();
  let syncTimer = null;
  let syncBusy = false;
  let suppressAutoSync = false;

  const baseSave = save;
  save = function(){
    state._syncUpdatedAt = Date.now();
    baseSave();
    if(!suppressAutoSync) scheduleAutoSync();
  };

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
      return {
        owner:'LethalCaucasian', repo:'', branch:'main', path:'workout-data.json',
        autoSync:true, rememberToken:false, initialized:false,
        ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
      };
    }catch{
      return {owner:'LethalCaucasian',repo:'',branch:'main',path:'workout-data.json',autoSync:true,rememberToken:false,initialized:false};
    }
  }

  function persistSettings(){
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function getToken(){
    return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_LOCAL_KEY) || '';
  }

  function storeToken(token, remember){
    const clean = String(token || '').trim();
    if(clean) sessionStorage.setItem(TOKEN_SESSION_KEY, clean);
    else sessionStorage.removeItem(TOKEN_SESSION_KEY);

    if(remember && clean) localStorage.setItem(TOKEN_LOCAL_KEY, clean);
    else localStorage.removeItem(TOKEN_LOCAL_KEY);
  }

  function validConfig(){
    return settings.owner && settings.repo && settings.branch && settings.path && getToken();
  }

  function status(text, type=''){
    const el = document.getElementById('ghSyncStatus');
    if(!el) return;
    el.textContent = text;
    el.className = `gh-sync-status ${type}`;
  }

  function encodeBase64(str){
    const bytes = new TextEncoder().encode(str);
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk){
      binary += String.fromCharCode(...bytes.subarray(i,i+chunk));
    }
    return btoa(binary);
  }

  function decodeBase64(str){
    const binary = atob(String(str || '').replace(/\n/g,''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function apiUrl(){
    const path = settings.path.split('/').map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${path}`;
  }

  async function githubRequest(url, options={}){
    const token = getToken();
    const res = await fetch(url, {
      ...options,
      headers:{
        'Accept':'application/vnd.github+json',
        'Authorization':`Bearer ${token}`,
        'X-GitHub-Api-Version':'2022-11-28',
        ...(options.headers || {})
      }
    });
    if(res.status === 204) return null;
    const data = await res.json().catch(()=>({}));
    if(!res.ok){
      const err = new Error(data.message || `GitHub request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function fetchRemote(){
    try{
      const data = await githubRequest(`${apiUrl()}?ref=${encodeURIComponent(settings.branch)}`);
      return {sha:data.sha, state:JSON.parse(decodeBase64(data.content))};
    }catch(err){
      if(err.status === 404) return null;
      throw err;
    }
  }

  function renderAll(){
    renderToday();
    renderHistory();
    renderProgress();
  }

  async function pushToGitHub(manual=false){
    if(syncBusy) return;
    if(!validConfig()){
      if(manual) status('Enter the repo details and token first.','warn');
      return;
    }

    syncBusy=true;
    if(manual) status('Uploading workout data…');
    try{
      const remote = await fetchRemote();
      suppressAutoSync=true;
      state._syncUpdatedAt = Date.now();
      baseSave();
      suppressAutoSync=false;

      const body={
        message:'Sync workout tracker data',
        content:encodeBase64(JSON.stringify(state,null,2)),
        branch:settings.branch
      };
      if(remote?.sha) body.sha=remote.sha;

      await githubRequest(apiUrl(),{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body)
      });

      settings.initialized=true;
      settings.lastSync=Date.now();
      persistSettings();
      status(`Synced to GitHub • ${new Date(settings.lastSync).toLocaleString()}`,'ok');
    }catch(err){
      status(`GitHub sync failed: ${err.message}`,'err');
    }finally{
      suppressAutoSync=false;
      syncBusy=false;
    }
  }

  async function pullFromGitHub(manual=false){
    if(syncBusy) return;
    if(!validConfig()){
      if(manual) status('Enter the repo details and token first.','warn');
      return;
    }

    syncBusy=true;
    if(manual) status('Downloading workout data…');
    try{
      const remote = await fetchRemote();
      if(!remote){
        status('No workout data file exists in that repo yet. Use Push Now to create it.','warn');
        return;
      }
      if(!remote.state || !remote.state.history || !remote.state.drafts){
        throw new Error('Remote file is not valid workout tracker data');
      }

      suppressAutoSync=true;
      state = remote.state;
      baseSave();
      suppressAutoSync=false;
      settings.initialized=true;
      settings.lastSync=Date.now();
      persistSettings();
      renderAll();
      status(`Pulled from GitHub • ${new Date(settings.lastSync).toLocaleString()}`,'ok');
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
      const remote = await fetchRemote();
      const localTime = Number(state._syncUpdatedAt || 0);
      const remoteTime = Number(remote?.state?._syncUpdatedAt || 0);

      if(remote && remoteTime > localTime){
        suppressAutoSync=true;
        state = remote.state;
        baseSave();
        suppressAutoSync=false;
        renderAll();
        settings.lastSync=Date.now();
        persistSettings();
        status(`Auto-pulled newer data • ${new Date(settings.lastSync).toLocaleTimeString()}`,'ok');
      }else{
        // Release the busy flag before calling the normal push routine.
        syncBusy=false;
        await pushToGitHub(false);
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
    if(!settings.autoSync || !settings.initialized) return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(autoSync,1800);
  }

  function saveUiSettings(){
    settings.owner = document.getElementById('ghOwner').value.trim();
    settings.repo = document.getElementById('ghRepo').value.trim();
    settings.branch = document.getElementById('ghBranch').value.trim() || 'main';
    settings.path = document.getElementById('ghPath').value.trim() || 'workout-data.json';
    settings.autoSync = document.getElementById('ghAuto').checked;
    settings.rememberToken = document.getElementById('ghRemember').checked;
    storeToken(document.getElementById('ghToken').value, settings.rememberToken);
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
      <p class="install-note">Syncs your workout data between devices using a GitHub repo. A separate <b>private</b> repo is recommended so your workout history is not public.</p>
      <div class="gh-sync-grid">
        <div class="gh-sync-field"><label>Owner</label><input id="ghOwner" value="${escapeHtml(settings.owner)}" placeholder="GitHub username"></div>
        <div class="gh-sync-field"><label>Repository</label><input id="ghRepo" value="${escapeHtml(settings.repo)}" placeholder="e.g. Workout-Tracker-Data"></div>
        <div class="gh-sync-field"><label>Branch</label><input id="ghBranch" value="${escapeHtml(settings.branch)}" placeholder="main"></div>
        <div class="gh-sync-field"><label>Data file</label><input id="ghPath" value="${escapeHtml(settings.path)}" placeholder="workout-data.json"></div>
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
      <div id="ghSyncStatus" class="gh-sync-status">${settings.lastSync ? `Last sync: ${new Date(settings.lastSync).toLocaleString()}` : 'Not synced yet.'}</div>
      <p class="install-note">For the safest setup, create a private data repo and use a fine-grained token limited to that repo with only <b>Contents: Read and write</b>. The token is never included in workout exports or committed to GitHub. “Remember token” stores it only in this browser so automatic sync can continue after reopening the app.</p>`;

    const phoneCard=[...section.querySelectorAll('.card')].find(c=>c.querySelector('h3')?.textContent.includes('Phone use'));
    section.insertBefore(card, phoneCard || null);

    card.querySelector('#ghSaveSettings').onclick=saveUiSettings;
    card.querySelector('#ghPush').onclick=()=>{saveUiSettings();pushToGitHub(true)};
    card.querySelector('#ghPull').onclick=()=>{saveUiSettings();pullFromGitHub(true)};
  }

  function escapeHtml(v){
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  injectUi();

  // Automatic syncing only starts after the user has completed one explicit
  // Push or Pull, preventing an accidental overwrite during first-time setup.
  if(settings.autoSync && settings.initialized && validConfig()){
    setTimeout(autoSync,700);
  }
})();
