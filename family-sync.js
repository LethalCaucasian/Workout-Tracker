(() => {
  const CLIENT_KEY='workout_tracker_family_client_v1';
  const API_KEY='workout_tracker_family_api_v1';
  const GH_SETTINGS_KEY='workout_tracker_github_sync_v1';
  const GH_TOKEN_SESSION='workout_tracker_github_token_session_v1';
  const GH_TOKEN_LOCAL='workout_tracker_github_token_local_v1';

  let client=loadClient();
  let syncTimer=null;
  let syncBusy=false;
  let suppress=false;
  let lastRemoteUpdatedAt=0;

  const style=document.createElement('style');
  style.textContent=`
    .family-card{margin-top:10px}
    .family-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}
    .family-field{display:flex;flex-direction:column;gap:5px}
    .family-field label{font-size:11px;color:#99a8bc;font-weight:800;text-transform:uppercase;letter-spacing:.4px}
    .family-field input{width:100%;border:1px solid #2b3f5e;background:#091321;color:#fff;border-radius:9px;padding:10px;outline:none}
    .family-status{margin-top:8px;font-size:12px;color:#99a8bc;line-height:1.4}
    .family-status.ok{color:#42d38a}.family-status.warn{color:#ffcf5a}.family-status.err{color:#ff9dab}
    .family-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:9px 11px;border:1px solid #285445;background:#0d211c;border-radius:11px;color:#cfeee3;font-size:12px;font-weight:800}
    .family-banner .family-live{color:#42d38a}
  `;
  document.head.appendChild(style);

  function loadClient(){
    try{return JSON.parse(localStorage.getItem(CLIENT_KEY)||'null')}catch{return null}
  }

  function saveClient(value){
    client=value;
    if(value) localStorage.setItem(CLIENT_KEY,JSON.stringify(value));
    else localStorage.removeItem(CLIENT_KEY);
  }

  function parseInvite(){
    const raw=location.hash.replace(/^#/,'');
    if(!raw) return false;
    const p=new URLSearchParams(raw);
    const profileId=p.get('profile');
    const key=p.get('key');
    const api=p.get('api');
    if(!profileId || !key || !api) return false;
    saveClient({profileId,key,api:api.replace(/\/$/,''),savedAt:Date.now()});
    localStorage.setItem(API_KEY,client.api);
    history.replaceState(null,'',location.pathname+location.search);
    return true;
  }

  const openedInvite=parseInvite();
  const familyMode=()=>!!(client?.profileId && client?.key && client?.api);

  function familyStatus(text,type=''){
    const el=document.getElementById('familyStatus');
    if(el){el.textContent=text;el.className=`family-status ${type}`;}
    const banner=document.getElementById('familyBannerStatus');
    if(banner) banner.textContent=text;
  }

  function apiUrl(){return `${client.api}/api/profile`;}

  async function apiRequest(options={}){
    const res=await fetch(options.url||`${apiUrl()}?id=${encodeURIComponent(client.profileId)}`,{
      ...options,
      headers:{
        'Content-Type':'application/json',
        'X-Profile-Key':client.key,
        ...(options.headers||{})
      }
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      const err=new Error(data.error||`Sync request failed (${res.status})`);
      err.status=res.status;
      throw err;
    }
    return data;
  }

  function oneProfileBundle(profile){
    return {
      kind:'workout-tracker-profiles',version:1,
      activeProfileId:profile.id,
      updatedAt:Number(profile.updatedAt||Date.now()),
      profiles:[{
        id:profile.id,name:profile.name||'Shared Profile',
        createdAt:Number(profile.createdAt||Date.now()),
        updatedAt:Number(profile.updatedAt||Date.now()),
        data:profile.data||{}
      }]
    };
  }

  async function pullFamily(manual=false){
    if(!familyMode() || syncBusy) return;
    syncBusy=true;
    if(manual) familyStatus('Downloading workout data…');
    try{
      const data=await apiRequest({method:'GET'});
      const profile=data.profile;
      if(!profile?.id) throw new Error('Profile data was not returned');
      suppress=true;
      WorkoutProfiles.importData(oneProfileBundle(profile),{preserveActive:false,notify:false});
      suppress=false;
      lastRemoteUpdatedAt=Number(profile.updatedAt||0);
      lockFamilyUi(profile.name);
      familyStatus(`Synced • ${new Date().toLocaleTimeString()}`,'ok');
    }catch(err){
      familyStatus(`Sync failed: ${err.message}`,'err');
    }finally{
      suppress=false;
      syncBusy=false;
    }
  }

  async function pushFamily(){
    if(!familyMode() || syncBusy) return;
    const store=WorkoutProfiles.getStore();
    const profile=store.profiles.find(p=>p.id===client.profileId) || store.profiles[0];
    if(!profile) return;
    syncBusy=true;
    familyStatus('Saving…');
    try{
      const data=await apiRequest({
        method:'PUT',
        body:JSON.stringify({profileId:client.profileId,data:profile.data,baseUpdatedAt:lastRemoteUpdatedAt})
      });
      if(data.profile?.updatedAt) lastRemoteUpdatedAt=Number(data.profile.updatedAt);
      familyStatus(`Saved • ${new Date().toLocaleTimeString()}`,'ok');
    }catch(err){
      familyStatus(`Save failed: ${err.message}`,'err');
    }finally{
      syncBusy=false;
    }
  }

  function scheduleFamilyPush(){
    if(suppress || !familyMode()) return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(pushFamily,1400);
  }

  window.addEventListener('workout-profile-store-change',scheduleFamilyPush);

  function escapeHtml(v){
    return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function lockFamilyUi(name){
    const bar=document.getElementById('profileBar');
    if(bar){
      const actions=bar.querySelector('.profile-actions');
      if(actions) actions.style.display='none';
      const select=bar.querySelector('select');
      if(select) select.disabled=true;
      const label=bar.querySelector('.profile-label');
      if(label) label.textContent='Shared Profile';
    }
    const gh=document.getElementById('githubSyncCard');
    if(gh) gh.style.display='none';
    const admin=document.getElementById('familySharingCard');
    if(admin) admin.style.display='none';

    let banner=document.getElementById('familyBanner');
    if(!banner){
      banner=document.createElement('div');
      banner.id='familyBanner';
      banner.className='family-banner';
      const today=document.getElementById('today');
      if(today) today.insertBefore(banner,today.firstChild);
    }
    banner.innerHTML=`<span>👤 ${escapeHtml(name||'Shared Profile')}</span><span id="familyBannerStatus" class="family-live">Connected</span>`;
  }

  function injectFamilyClientCard(){
    const section=document.getElementById('settings');
    if(!section || document.getElementById('familyClientCard')) return;
    const card=document.createElement('div');
    card.id='familyClientCard';
    card.className='card family-card';
    card.innerHTML=`
      <h3>👥 Shared Profile</h3>
      <p class="install-note">This device is connected directly to one workout profile. No GitHub account or token is needed.</p>
      <div class="toolbar">
        <button class="btn primary" id="familyPullNow" type="button">Sync Now</button>
        <button class="btn" id="familyForget" type="button">Disconnect This Device</button>
      </div>
      <div id="familyStatus" class="family-status">Connecting…</div>`;
    const phoneCard=[...section.querySelectorAll('.card')].find(c=>c.querySelector('h3')?.textContent.includes('Phone use'));
    section.insertBefore(card,phoneCard||null);
    card.querySelector('#familyPullNow').onclick=()=>pullFamily(true);
    card.querySelector('#familyForget').onclick=()=>{
      if(!confirm('Disconnect this device from the shared workout profile?')) return;
      saveClient(null);
      location.reload();
    };
  }

  function ghConfig(){
    try{return JSON.parse(localStorage.getItem(GH_SETTINGS_KEY)||'{}')}catch{return {}}
  }

  function ghToken(){
    return sessionStorage.getItem(GH_TOKEN_SESSION)||localStorage.getItem(GH_TOKEN_LOCAL)||'';
  }

  function ghApiUrl(cfg,path){
    const safe=String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${safe}`;
  }

  function base64Utf8(text){
    const bytes=new TextEncoder().encode(text);
    let binary='';
    for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary);
  }

  async function writeAccessFile(profileId,hash){
    const cfg=ghConfig();
    const token=ghToken();
    if(!cfg.owner || !cfg.repo || !cfg.branch || !token) throw new Error('Save the GitHub Sync settings and token first');
    const path=`access/${profileId}.json`;
    const url=ghApiUrl(cfg,path);
    const headers={
      'Accept':'application/vnd.github+json',
      'Authorization':`Bearer ${token}`,
      'X-GitHub-Api-Version':'2022-11-28'
    };
    let sha;
    const existing=await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}`,{headers});
    if(existing.ok){sha=(await existing.json()).sha;}
    else if(existing.status!==404){
      const e=await existing.json().catch(()=>({}));
      throw new Error(e.message||`GitHub request failed (${existing.status})`);
    }
    const body={
      message:'Create/reset shared workout access',
      branch:cfg.branch,
      content:base64Utf8(JSON.stringify({
        kind:'workout-tracker-profile-access',version:1,
        profileId,hash,updatedAt:Date.now()
      },null,2))
    };
    if(sha) body.sha=sha;
    const saved=await fetch(url,{
      method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)
    });
    if(!saved.ok){
      const e=await saved.json().catch(()=>({}));
      throw new Error(e.message||`GitHub request failed (${saved.status})`);
    }
  }

  function randomKey(){
    const bytes=new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function sha256Hex(text){
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }

  function adminStatus(text,type=''){
    const el=document.getElementById('familyAdminStatus');
    if(el){el.textContent=text;el.className=`family-status ${type}`;}
  }

  function updateAdminProfileName(){
    const el=document.getElementById('familyActiveProfile');
    const p=WorkoutProfiles?.getActiveProfile();
    if(el) el.value=p?.name||'No profile selected';
  }

  async function createInvite(){
    const api=document.getElementById('familyApiUrl')?.value.trim().replace(/\/$/,'');
    if(!api){adminStatus('Enter the deployed sync API URL first.','warn');return;}
    localStorage.setItem(API_KEY,api);
    const p=WorkoutProfiles?.getActiveProfile();
    if(!p){adminStatus('Select a profile first.','warn');return;}
    adminStatus(`Creating a new invite for ${p.name}…`);
    try{
      const key=randomKey();
      const hash=await sha256Hex(key);
      await writeAccessFile(p.id,hash);
      const link=`${location.origin}${location.pathname}#profile=${encodeURIComponent(p.id)}&key=${encodeURIComponent(key)}&api=${encodeURIComponent(api)}`;
      const out=document.getElementById('familyInviteLink');
      if(out) out.value=link;
      await navigator.clipboard?.writeText(link).catch(()=>{});
      adminStatus(`Invite link created for ${p.name}. The link was copied if clipboard access was allowed.`,'ok');
    }catch(err){
      adminStatus(`Invite failed: ${err.message}`,'err');
    }
  }

  function injectFamilyAdminCard(){
    if(familyMode()) return;
    const section=document.getElementById('settings');
    if(!section || document.getElementById('familySharingCard')) return;
    const api=localStorage.getItem(API_KEY)||'';
    const card=document.createElement('div');
    card.id='familySharingCard';
    card.className='card family-card';
    card.innerHTML=`
      <h3>👥 Family Sharing</h3>
      <p class="install-note">Create a private link for the selected profile. The recipient opens the link once and their device will stay connected to that profile without a GitHub account.</p>
      <div class="family-grid">
        <div class="family-field"><label>Sync API URL</label><input id="familyApiUrl" value="${escapeHtml(api)}" placeholder="https://your-sync-api.vercel.app"></div>
        <div class="family-field"><label>Selected profile</label><input id="familyActiveProfile" value="${escapeHtml(WorkoutProfiles?.getActiveProfile()?.name||'')}" readonly></div>
        <div class="family-field"><label>Latest invite link</label><input id="familyInviteLink" value="" readonly placeholder="Create an invite to generate a link"></div>
      </div>
      <div class="toolbar" style="margin-top:10px">
        <button class="btn" id="familySaveApi" type="button">Save API URL</button>
        <button class="btn primary" id="familyCreateInvite" type="button">Create / Reset Invite Link</button>
      </div>
      <div id="familyAdminStatus" class="family-status">Creating a new link invalidates the previous link for that profile.</div>`;
    const gh=document.getElementById('githubSyncCard');
    if(gh) gh.insertAdjacentElement('afterend',card);
    else section.appendChild(card);
    card.querySelector('#familySaveApi').onclick=()=>{
      const value=card.querySelector('#familyApiUrl').value.trim().replace(/\/$/,'');
      localStorage.setItem(API_KEY,value);
      adminStatus('Sync API URL saved.','ok');
    };
    card.querySelector('#familyCreateInvite').onclick=createInvite;
    window.addEventListener('workout-profile-store-change',updateAdminProfileName);
  }

  if(familyMode()){
    injectFamilyClientCard();
    lockFamilyUi('Shared Profile');
    setTimeout(()=>pullFamily(openedInvite),250);
  }else{
    injectFamilyAdminCard();
  }
})();
