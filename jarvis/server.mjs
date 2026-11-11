import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { isSafeBranch, validateTask, safeSearch } from './policy.mjs';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const host = '127.0.0.1';
const port = Number(process.env.JARVIS_PORT || 4177);
const tasks = new Map();
let running = false;
const git = async (...args) => (await exec('git', args, { cwd: root, timeout: 12000, maxBuffer: 1_000_000 })).stdout.trim();
const send = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
};
const readBody = async req => {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16000) throw new Error('Request too large');
  }
  return JSON.parse(body || '{}');
};
async function branchState() {
  const [branch, dirty] = await Promise.all([git('branch', '--show-current'), git('status', '--short')]);
  return { branch, safe: isSafeBranch(branch), dirty: !!dirty, changes: dirty.split('\n').filter(Boolean).slice(0, 40) };
}
async function runCommand(cmd, args, timeout = 120000) {
  try {
    const result = await exec(cmd, args, { cwd: root, timeout, maxBuffer: 600_000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    return { ok: true, output: (result.stdout + '\n' + result.stderr).slice(-20000) };
  } catch (e) {
    return { ok: false, output: String((e.stdout || '') + '\n' + (e.stderr || '') + '\n' + e.message).slice(-20000) };
  }
}
async function executeTask(task) {
  if (running) throw new Error('Another task is running');
  const status = await branchState();
  if (!status.safe || status.branch !== task.branch || status.dirty) throw new Error('Use an unchanged jarvis/* or feature/jarvis-* branch before approval');
  running = true;
  task.status = 'running';
  task.startedAt = new Date().toISOString();
  const prompt = [
    'You are Jarvis, the DoWeo development coding agent.',
    'Work only inside the current checked-out development branch. Never deploy, merge, push, commit, or change branches.',
    'Never access production Supabase data, credentials, .env files, or live payment information.',
    'Do not use destructive operations or network calls. Make small scoped code edits and add tests.',
    'User request:', task.request
  ].join('\n');
  // No shell interpolation. Codex runs with workspace-write sandbox.
  const child = spawn('codex', ['exec', '--sandbox', 'workspace-write', '--cd', root, prompt], {
    cwd: root, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, shell: false, stdio: ['ignore', 'pipe', 'pipe']
  });
  const append = data => { task.log = (task.log + data.toString()).slice(-40000); };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  const timeout = setTimeout(() => child.kill('SIGTERM'), 8 * 60 * 1000);
  child.on('error', err => { append('\n' + err.message); task.status = 'failed'; clearTimeout(timeout); running = false; });
  child.on('close', async code => {
    clearTimeout(timeout);
    if (task.status !== 'failed') task.status = code === 0 ? 'review' : 'failed';
    task.finishedAt = new Date().toISOString();
    try {
      task.diff = (await git('diff', '--stat')).slice(0, 10000);
      task.tests = await runCommand('node', ['--test', 'jarvis/tests/policy.test.mjs'], 30000);
    } catch (err) { append('\nPost-run check failed: ' + err.message); }
    running = false;
  });
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.host !== host + ':' + port) return send(res, 403, { error: 'Invalid host' });
    if (req.method === 'POST' && req.headers.origin !== 'http://' + host + ':' + port) return send(res, 403, { error: 'Invalid origin' });
    const url = new URL(req.url, 'http://' + host + ':' + port);
    if (req.method === 'GET' && url.pathname === '/') {
      const html = await fs.readFile(path.join(here, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' });
      return res.end(html);
    }
    if (req.method === 'GET' && url.pathname === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(await fs.readFile(path.join(here, 'app.js')));
    }
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const state = await branchState();
      const codex = await runCommand('codex', ['--version'], 5000);
      return send(res, 200, { ...state, codex: codex.ok ? codex.output.trim() : 'Not installed or not authenticated', running });
    }
    if (req.method === 'GET' && url.pathname === '/api/tasks') return send(res, 200, [...tasks.values()].reverse());
    if (req.method === 'GET' && url.pathname === '/api/diff') {
      return send(res, 200, { stat: await git('diff', '--stat'), patch: (await git('diff', '--', '.', ':!*.env')).slice(0, 50000) });
    }
    if (req.method === 'GET' && url.pathname === '/api/search') {
      const query = safeSearch(url.searchParams.get('q'));
      if (!query) return send(res, 400, { error: 'Use 2-60 letters or numbers' });
      const result = await runCommand('git', ['grep', '-n', '-I', '-m', '2', '--', query], 15000);
      return send(res, 200, { matches: result.output.slice(0, 12000) });
    }
    if (req.method === 'POST' && url.pathname === '/api/tasks') {
      const { request } = await readBody(req);
      const error = validateTask(request);
      if (error) return send(res, 400, { error });
      const branch = await branchState();
      if (!branch.safe) return send(res, 409, { error: 'Switch to a jarvis development branch first' });
      const task = { id: randomUUID(), request: request.trim(), branch: branch.branch, status: 'pending', createdAt: new Date().toISOString(), log: '', diff: '', tests: null };
      tasks.set(task.id, task);
      return send(res, 201, task);
    }
    const action = /^\/api\/tasks\/([a-f0-9-]+)\/(approve|reject)$/.exec(url.pathname);
    if (req.method === 'POST' && action) {
      const task = tasks.get(action[1]);
      if (!task) return send(res, 404, { error: 'Task not found' });
      if (task.status !== 'pending') return send(res, 409, { error: 'Task already handled' });
      if (action[2] === 'reject') { task.status = 'rejected'; return send(res, 200, task); }
      if (running) return send(res, 409, { error: 'A task is already running' });
      await executeTask(task);
      return send(res, 202, task);
    }
    if (req.method === 'POST' && url.pathname === '/api/tests') {
      if (running) return send(res, 409, { error: 'Agent running' });
      const result = await runCommand('node', ['--test', 'jarvis/tests/'], 30000);
      return send(res, 200, result);
    }
    send(res, 404, { error: 'Not found' });
  } catch (err) { send(res, 500, { error: err.message }); }
});
server.listen(port, host, () => console.log('Jarvis local dashboard: http://' + host + ':' + port));
