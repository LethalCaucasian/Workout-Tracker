(() => {
  const baseFetch = window.fetch.bind(window);
  let githubWriteQueue = Promise.resolve();

  function isGitHubContentsWrite(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    return (method === 'PUT' || method === 'DELETE') && /^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\//.test(url);
  }

  window.fetch = function(input, init = {}) {
    if (!isGitHubContentsWrite(input, init)) return baseFetch(input, init);

    const run = () => baseFetch(input, init);
    const task = githubWriteQueue.then(run, run);

    // Keep the queue alive after failures so a single rejected request does not
    // block every later sync attempt.
    githubWriteQueue = task.catch(() => {});
    return task;
  };
})();
