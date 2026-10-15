const crypto = require('crypto');

const OWNER = process.env.GITHUB_OWNER || 'LethalCaucasian';
const REPO = process.env.GITHUB_REPO || 'Workout-Tracker-Data';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://lethalcaucasian.github.io';
const MANIFEST_PATH = process.env.MANIFEST_PATH || 'profiles.json';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (!origin || origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGIN);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Profile-Key');
  res.setHeader('Cache-Control', 'no-store');
}

function validOrigin(req) {
  const origin = req.headers.origin || '';
  return !origin || origin === ALLOWED_ORIGIN;
}

function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9._-]{1,140}$/.test(id);
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function safeEqualHex(a, b) {
  if (!/^[a-f0-9]{64}$/i.test(String(a)) || !/^[a-f0-9]{64}$/i.test(String(b))) return false;
  const aa = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function contentUrl(path) {
  const safe = String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${safe}`;
}

async function ghRequest(url, options = {}) {
  if (!GH_TOKEN) throw Object.assign(new Error('Server GitHub token is not configured'), { status: 500 });
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GH_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || `GitHub request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

async function getJson(path) {
  try {
    const file = await ghRequest(`${contentUrl(path)}?ref=${encodeURIComponent(BRANCH)}`);
    const text = Buffer.from(String(file.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
    return { sha: file.sha, value: JSON.parse(text) };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function putJson(path, value, message, knownSha) {
  const existingSha = knownSha || (await getJson(path))?.sha;
  const body = {
    message,
    branch: BRANCH,
    content: Buffer.from(JSON.stringify(value, null, 2), 'utf8').toString('base64')
  };
  if (existingSha) body.sha = existingSha;
  return ghRequest(contentUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function authorize(profileId, key) {
  if (!key) return false;
  const access = await getJson(`access/${profileId}.json`);
  if (!access?.value?.hash) return false;
  return safeEqualHex(access.value.hash, sha256(key));
}

async function updateManifest(profile, now) {
  const remote = await getJson(MANIFEST_PATH);
  if (!remote?.value || !Array.isArray(remote.value.profiles)) return;
  const manifest = remote.value;
  const meta = manifest.profiles.find(p => p.id === profile.id);
  if (meta) {
    meta.name = profile.name;
    meta.updatedAt = now;
    meta.file = meta.file || `profiles/${profile.id}.json`;
  }
  manifest.updatedAt = now;
  await putJson(MANIFEST_PATH, manifest, 'Sync shared workout profile manifest', remote.sha);
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!validOrigin(req)) return res.status(403).json({ error: 'Origin not allowed' });
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const profileId = req.method === 'GET' ? req.query.id : (req.body?.profileId || req.query.id);
  if (!validId(profileId)) return res.status(400).json({ error: 'Invalid profile id' });

  const key = req.headers['x-profile-key'];
  try {
    if (!(await authorize(profileId, key))) return res.status(401).json({ error: 'This profile link is invalid or has been reset' });

    const remote = await getJson(`profiles/${profileId}.json`);
    if (!remote?.value) return res.status(404).json({ error: 'Workout profile not found. Ask the profile manager to sync it first.' });

    if (req.method === 'GET') return res.status(200).json({ profile: remote.value });

    if (!req.body || typeof req.body.data !== 'object' || Array.isArray(req.body.data)) {
      return res.status(400).json({ error: 'Invalid workout data' });
    }

    const now = Date.now();
    const current = remote.value;
    const updated = {
      ...current,
      kind: 'workout-tracker-profile',
      version: 1,
      id: profileId,
      updatedAt: now,
      data: req.body.data
    };

    await putJson(`profiles/${profileId}.json`, updated, `Save shared workout profile: ${current.name || profileId}`, remote.sha);
    await updateManifest(updated, now);
    return res.status(200).json({ profile: updated });
  } catch (err) {
    console.error(err);
    return res.status(err.status >= 400 && err.status < 600 ? err.status : 500).json({ error: err.message || 'Server error' });
  }
};
