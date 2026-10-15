(() => {
  const baseFetch=window.fetch.bind(window);
  let writeQueue=Promise.resolve();

  function requestUrl(input){return typeof input==='string'?input:input?.url||'';}
  function requestMethod(input,init={}){return String(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();}
  function isContentsWrite(input,init={}){
    const url=requestUrl(input),method=requestMethod(input,init);
    return (method==='PUT'||method==='DELETE')&&/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\//.test(url);
  }
  function isManifest(url){return /\/contents\/(?:.*\/)?profiles\.json(?:\?|$)/.test(url);}
  function isProfileFile(url){return /\/contents\/(?:.*\/)?profiles\/[^/?]+\.json(?:\?|$)/.test(url);}
  function branchFrom(body){return String(body?.branch||'main');}

  function decodeJsonBase64(value){
    try{
      const binary=atob(String(value||'').replace(/\n/g,''));
      const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    }catch{return null;}
  }
  function encodeJsonBase64(value){
    try{
      const bytes=new TextEncoder().encode(JSON.stringify(value,null,2));
      let binary='';
      for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
      return btoa(binary);
    }catch{return null;}
  }

  function mergeManifest(remote,intended){
    if(!Array.isArray(remote?.profiles)||!Array.isArray(intended?.profiles))return intended;
    const merged=new Map();
    remote.profiles.forEach(p=>{if(p?.id)merged.set(String(p.id),p);});
    intended.profiles.forEach(p=>{
      if(!p?.id)return;
      const id=String(p.id),old=merged.get(id);
      if(!old||Number(p.updatedAt||0)>=Number(old.updatedAt||0))merged.set(id,p);
    });
    const profiles=[...merged.values()];
    let active=intended.activeProfileId;
    if(!active||!profiles.some(p=>String(p.id)===String(active)))active=remote.activeProfileId||profiles[0]?.id;
    return {
      ...remote,
      ...intended,
      kind:'workout-tracker-profile-manifest',
      version:1,
      updatedAt:Math.max(Number(remote.updatedAt||0),Number(intended.updatedAt||0)),
      activeProfileId:active,
      profiles
    };
  }

  async function fetchCurrent(url,body,headers){
    const sep=url.includes('?')?'&':'?';
    const res=await baseFetch(`${url}${sep}ref=${encodeURIComponent(branchFrom(body))}`,{headers:headers||{}});
    if(res.status===404)return null;
    if(!res.ok)return null;
    return res.json().catch(()=>null);
  }

  async function prepare(input,init={}){
    if(requestMethod(input,init)!=='PUT'||typeof init.body!=='string')return init;
    const url=requestUrl(input);
    if(!isManifest(url)&&!isProfileFile(url))return init;

    let body;
    try{body=JSON.parse(init.body);}catch{return init;}
    if(!body?.content)return init;

    const current=await fetchCurrent(url,body,init.headers);
    if(!current?.sha){delete body.sha;return {...init,body:JSON.stringify(body)};}

    const intended=decodeJsonBase64(body.content);
    const remote=decodeJsonBase64(current.content);
    if(isManifest(url)&&intended&&remote){
      const encoded=encodeJsonBase64(mergeManifest(remote,intended));
      if(encoded)body.content=encoded;
    }else if(isProfileFile(url)&&intended&&remote){
      const intendedTime=Number(intended.updatedAt||0),remoteTime=Number(remote.updatedAt||0);
      if(remoteTime&&intendedTime&&remoteTime>intendedTime){
        throw new Error('Remote workout data is newer on GitHub. Pull Now, then retry the sync.');
      }
    }
    body.sha=current.sha;
    return {...init,body:JSON.stringify(body)};
  }

  async function runWrite(input,init){
    let prepared=await prepare(input,init);
    let res=await baseFetch(input,prepared);
    if(res.ok||![409,422].includes(res.status)||requestMethod(input,init)!=='PUT')return res;
    prepared=await prepare(input,init);
    return baseFetch(input,prepared);
  }

  window.fetch=function(input,init={}){
    if(!isContentsWrite(input,init))return baseFetch(input,init);
    const task=writeQueue.then(()=>runWrite(input,init),()=>runWrite(input,init));
    writeQueue=task.catch(()=>{});
    return task;
  };
})();
