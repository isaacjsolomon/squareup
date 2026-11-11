const $ = id => document.getElementById(id);
const escapeHtml = v => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
async function api(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}
const notice = message => { $('notice').textContent = message; };
async function status() {
  try {
    const s = await api('/api/status');
    $('branch').textContent = s.branch || 'Not checked out';
    $('codex').textContent = s.codex;
    $('dirty').textContent = s.dirty ? 'Modified' : 'Clean';
    $('running').textContent = s.running ? 'Agent active' : 'Idle';
    $('branch').style.color = s.safe ? '#80e9d5' : '#ffb4a8';
  } catch(e) { notice(e.message); }
}
async function refresh() {
  await status();
  try { renderTasks(await api('/api/tasks')); }
  catch(e) { notice(e.message); }
}
function renderTasks(tasks) {
  const container = $('tasks');
  container.className = '';
  if (!tasks.length) { container.className = 'empty'; container.textContent = 'No tasks queued.'; return; }
  container.replaceChildren();
  for (const task of tasks) {
    const el = document.createElement('div');
    el.className = 'task';
    const heading = document.createElement('span');
    heading.className = 'status';
    heading.textContent = task.status + ' • ' + task.branch;
    const request = document.createElement('p');
    request.textContent = task.request;
    el.append(heading, request);
    if (task.status === 'pending') {
      const row = document.createElement('div'); row.className = 'actions';
      for (const action of ['approve','reject']) {
        const btn = document.createElement('button');
        btn.textContent = action === 'approve' ? 'Approve coding run' : 'Reject';
        if (action === 'reject') btn.className = 'danger';
        btn.onclick = async () => {
          if (action === 'approve' && !confirm('Allow Codex to edit files on this development branch? It will NOT deploy or merge.')) return;
          btn.disabled = true;
          try { await api('/api/tasks/' + task.id + '/' + action, { method: 'POST', body: '{}' }); notice('Task ' + action + 'd.'); await refresh(); }
          catch(e) { notice(e.message); btn.disabled = false; }
        };
        row.append(btn);
      }
      el.append(row);
    }
    if (task.diff || task.log || task.tests) {
      const details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = 'View execution log and results';
      const pre = document.createElement('pre'); pre.className = 'log';
      pre.textContent = [task.diff, task.tests?.output, task.log].filter(Boolean).join('\n\n');
      details.append(summary, pre); el.append(details);
    }
    container.append(el);
  }
}
$('queue').onclick = async () => {
  try {
    const request = $('request').value;
    await api('/api/tasks', { method: 'POST', body: JSON.stringify({ request }) });
    $('request').value = ''; notice('Task queued. Review and approve below.'); await refresh();
  } catch(e) { notice(e.message); }
};
$('refresh').onclick = refresh;
$('test').onclick = async () => {
  $('output').textContent = 'Running tests...';
  try { const r = await api('/api/tests', { method: 'POST', body: '{}' }); $('output').textContent = r.output; notice(r.ok ? 'Tests passed.' : 'Tests failed.'); }
  catch(e) { notice(e.message); }
};
$('diff').onclick = async () => {
  try { const r = await api('/api/diff'); $('output').textContent = r.patch || r.stat || 'No uncommitted tracked changes.'; }
  catch(e) { notice(e.message); }
};
$('searchBtn').onclick = async () => {
  try { const r = await api('/api/search?q=' + encodeURIComponent($('search').value)); $('output').textContent = r.matches || 'No matches found.'; }
  catch(e) { notice(e.message); }
};
refresh();
setInterval(refresh, 5000);
