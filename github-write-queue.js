(() => {
  const baseFetch = window.fetch.bind(window);
  let githubWriteQueue = Promise.resolve();

  function requestUrl(input){
    return typeof input === 'string' ? input : input?.url || '';
  }
  function requestMethod(input, init={}){
    return String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  }
  function isGitHubContentsWrite(input, init={}){
    const url=requestUrl(input), method=requestMethod(input,init);
    return (method==='PUT' || method==='DELETE') && /^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\//.test(url);
  }
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
      for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
      return btoa(binary);
    }catch{return null;}
  }
  function mergeManifest(remote,intended){
    if(!Array.isArray(remote?.profiles) || !Array.isArray(intended?.profiles)) return intended;
    const merged=new Map();
    remote.profiles.forEach(p=>{if(p?.id) merged.set(String(p.id),p);});
    intended.profiles.forEach(p=>{if(p?.id) merged.set(String(p.id),p);});
    const profiles=[...merged.values()];
    const active=intended.activeProfileId && profiles.some(p=>p.id===intended.activeProfileId)
      ? intended.activeProfileId
      : remote.activeProfileId;
    return {
      ...remote,
      ...intended,
      updatedAt:Math.max(Number(remote.updatedAt||0),Number(intended.updatedAt||0)),
      activeProfileId:active,
      profiles
    };
  }
  function branchFromBody(body){return String(body?.branch||'main');}

  async function retryStaleWrite(input,init,firstResponse){
    if(![409,422].includes(firstResponse.status)) return firstResponse;
    const url=requestUrl(input), method=requestMethod(input,init);
    if(method!=='PUT' || typeof init?.body!=='string') return firstResponse;

    let body;
    try{body=JSON.parse(init.body);}catch{return firstResponse;}
    if(!body || !body.content) return firstResponse;

    const sep=url.includes('?')?'&':'?';
    const currentResponse=await baseFetch(`${url}${sep}ref=${encodeURIComponent(branchFromBody(body))}`,{
      headers:init.headers||{}
    });
    if(!currentResponse.ok) return firstResponse;
    const current=await currentResponse.json().catch(()=>null);
    if(!current?.sha) return firstResponse;

    const intended=decodeJsonBase64(body.content);
    const remote=decodeJsonBase64(current.content);
    const isManifest=/\/contents\/(?:.*\/)?profiles\.json(?:\?|$)/.test(url);

    if(isManifest && intended && remote){
      const merged=mergeManifest(remote,intended);
      const encoded=encodeJsonBase64(merged);
      if(encoded) body.content=encoded;
    }else if(intended && remote){
      const intendedTime=Number(intended.updatedAt||0);
      const remoteTime=Number(remote.updatedAt||0);
      if(remoteTime && intendedTime && remoteTime>intendedTime){
        throw new Error('Remote workout data is newer on GitHub. Pull Now, then retry the sync.');
      }
    }

    body.sha=current.sha;
    return baseFetch(input,{...init,body:JSON.stringify(body)});
  }

  async function runWrite(input,init){
    const first=await baseFetch(input,init);
    if(first.ok) return first;
    return retryStaleWrite(input,init,first);
  }

  window.fetch=function(input,init={}){
    if(!isGitHubContentsWrite(input,init)) return baseFetch(input,init);
    const run=()=>runWrite(input,init);
    const task=githubWriteQueue.then(run,run);
    githubWriteQueue=task.catch(()=>{});
    return task;
  };
})();
