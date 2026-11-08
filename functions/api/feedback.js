// DoWeo private beta feedback API. Exact /api/feedback route takes priority over /api/[[path]].
// Only the Cloudflare server uses the service-role key. Never send it to the browser.
const DEFAULT_SUPABASE_URL = 'https://pajrdqarszbnrlstoyly.supabase.co';
const TABLE = 'doweo_beta_feedback';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(['bug', 'idea', 'rating']);
const DEVICES = new Set(['desktop', 'mobile', 'tablet', 'other']);

function reply(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
function trimmed(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
}
function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !KINDS.has(value.kind))
    return { error: 'Choose bug report, feature idea, or rating.' };

  const kind = value.kind;
  const title = trimmed(value.title, 120);
  const details = trimmed(value.details, 2000);
  const steps = trimmed(value.steps, 900);
  const device = DEVICES.has(value.device) ? value.device : 'other';
  const rating = value.rating;
  const page = typeof value.page === 'string' && value.page.startsWith('/')
    ? value.page.split('?')[0].split('#')[0].slice(0, 120) : '/';

  if (kind === 'rating') {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return { error: 'Select a rating from 1 to 5 stars.' };
    if (details.length > 2000)
      return { error: 'Your feedback is too long (maximum 2,000 characters).' };
    return { data: { kind, title: '', details, steps: '', rating, device, page } };
  }

  if (title.length < 5 || title.length > 120)
    return { error: 'Add a title between 5 and 120 characters.' };
  if (details.length < 15 || details.length > 2000)
    return { error: 'Please add 15–2,000 characters of detail.' };
  if (kind === 'bug' && steps.length > 900)
    return { error: 'Steps to reproduce must be under 900 characters.' };

  return { data: { kind, title, details, steps: kind === 'bug' ? steps : '', rating: null, device, page } };
}

async function rest(url, key, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Accept': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(12000)
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'POST')
    return reply({ error: 'Only GET and POST are supported.' }, 405);

  // Same-origin requests only, in addition to verifying the user session.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin)
    return reply({ error: 'Origin not allowed.' }, 403);

  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return reply({ error: 'Feedback is temporarily unavailable.' }, 503);
  const base = (env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ') || authorization.length > 5000)
    return reply({ error: 'Please sign in to send feedback.' }, 401);

  let user;
  try {
    const auth = await fetch(base + '/auth/v1/user', {
      headers: { apikey: key, Authorization: authorization },
      signal: AbortSignal.timeout(12000)
    });
    if (!auth.ok) return reply({ error: 'Your session expired. Please sign in again.' }, 401);
    user = await auth.json();
  } catch (_) {
    return reply({ error: 'Unable to verify your session right now.' }, 503);
  }
  if (!ID.test(user?.id || ''))
    return reply({ error: 'Please sign in again.' }, 401);

  const userFilter = 'user_id=eq.' + encodeURIComponent(user.id);
  const tableUrl = base + '/rest/v1/' + TABLE;

  try {
    if (request.method === 'GET') {
      const url = tableUrl + '?select=id,kind,title,details,rating,status,created_at'
        + '&' + userFilter + '&order=created_at.desc&limit=12';
      const result = await rest(url, key);
      if (!result.ok) {
        console.error('Feedback history unavailable:', result.status);
        return reply({ error: 'Feedback history is temporarily unavailable.' }, 503);
      }
      return reply({ items: await result.json() });
    }

    if (!(request.headers.get('Content-Type') || '').toLowerCase().includes('application/json'))
      return reply({ error: 'Send feedback as JSON.' }, 415);

    const raw = await request.text();
    if (raw.length > 6500) return reply({ error: 'Feedback is too long.' }, 413);
    let payload;
    try { payload = JSON.parse(raw); }
    catch (_) { return reply({ error: 'Invalid feedback form.' }, 400); }
    const checked = validate(payload);
    if (checked.error) return reply({ error: checked.error }, 400);

    // Best-effort per-user rolling rate limit, stored in Postgres so it works across Workers.
    // This is not atomic; concurrent bursts should also be handled by upstream abuse controls.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentUrl = tableUrl + '?select=id&' + userFilter
      + '&created_at=gte.' + encodeURIComponent(since) + '&limit=6';
    const recent = await rest(recentUrl, key);
    if (!recent.ok) return reply({ error: 'Feedback is temporarily unavailable.' }, 503);
    const entries = await recent.json();
    if (!Array.isArray(entries)) return reply({ error: 'Feedback is temporarily unavailable.' }, 503);
    if (entries.length >= 6)
      return reply({ error: 'You have sent several reports recently. Please try again in an hour.' }, 429);

    const result = await rest(tableUrl, key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ ...checked.data, user_id: user.id })
    });
    if (!result.ok) {
      console.error('Feedback insert failed:', result.status);
      return reply({ error: 'Could not save feedback right now. Please try again.' }, 503);
    }
    const rows = await result.json();
    const saved = rows?.[0];
    if (!saved?.id) return reply({ error: 'Could not confirm your feedback was saved.' }, 503);
    return reply({ ok: true, id: saved.id, message: 'Thank you — your feedback was received.' }, 201);
  } catch (_) {
    return reply({ error: 'Feedback is temporarily unavailable. Please try again later.' }, 503);
  }
}

// Exported for lightweight isolated tests. Not a user-facing API.
export { validate };
