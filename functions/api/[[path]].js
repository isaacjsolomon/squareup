
// Cloudflare Pages Functions: server-side Supabase access.
// SUPABASE_SERVICE_ROLE_KEY must be configured as an encrypted Cloudflare secret.
const URL_BASE = 'https://pajrdqarszbnrlstoyly.supabase.co';
const json = (v, status = 200) => Response.json(v, { status });
const fail = (message, status = 400) => json({ error: message }, status);
const clean = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// SUPPORTED CURRENCIES
const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD',
  'JPY', 'CHF', 'CNY', 'INR', 'MXN',
  'BRL', 'KRW', 'SGD', 'HKD', 'NZD',
  'SEK', 'NOK', 'DKK', 'ILS', 'ZAR'
];

const validCurrency = currency =>
  CURRENCIES.includes(String(currency || '').toUpperCase());

// Fetch exchange rates for converting expenses
async function exchangeRate(from, to) {
  if (from === to) return 1;

  const response = await fetch(
    'https://open.er-api.com/v6/latest/' +
    encodeURIComponent(from)
  );

  if (!response.ok) {
    throw Error('Exchange rates unavailable. Please try again later.');
  }

  const data = await response.json();
  const rate = Number(data?.rates?.[to]);

  if (data.result !== 'success' || !(rate > 0)) {
    throw Error('Exchange rate unavailable for ' + from + '/' + to);
  }

  return rate;
}
const presets = ['indigo', 'sunset', 'ocean', 'forest', 'night', 'berry'];

function kind(b) {
  return b[0] === 255 && b[1] === 216 && b[2] === 255 ? 'image/jpeg' :
    b[0] === 137 && b[1] === 80 && b[2] === 78 ? 'image/png' :
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP' ? 'image/webp' : null;
}

function validate(v) {
  const type = ['debt', 'payment'].includes(v?.type) ? v.type : null;
  const from = clean(v?.from, 60);
  const to = clean(v?.to, 60);
  const amount = Math.round(Number(v?.amount) * 100) / 100;

  if (!type || !from || !to ||
      from.toLowerCase() === to.toLowerCase() ||
      !(amount > 0) || amount > 1e9) return null;

  return {
    type,
    from_name: from,
    to_name: to,
    amount,
    note: clean(v.note, 200),
    date_label: clean(v.date, 40),
    due_date: type === 'debt' &&
      /^\d{4}-\d{2}-\d{2}$/.test(v.dueDate || '')
      ? v.dueDate : null
  };
}


// WEB PUSH NOTIFICATIONS
// Send empty-payload notifications to protect private expense details.

function pushB64(bytes) {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function pushBytes(s) {
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(
    normalized + '='.repeat((4 - normalized.length % 4) % 4)
  );
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function pushVapidToken(endpoint, env) {
  const key = pushBytes(env.VAPID_PUBLIC_KEY || '');
  if (key.length !== 65 || key[0] !== 4) {
    throw Error('Invalid VAPID public key');
  }

  const privateBytes = pushBytes(env.VAPID_PRIVATE_KEY || '');
  if (privateBytes.length !== 32) {
    throw Error('Invalid VAPID private key');
  }

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: pushB64(key.slice(1, 33)),
    y: pushB64(key.slice(33)),
    d: pushB64(privateBytes),
    ext: false
  };

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const origin = new URL(endpoint).origin;
  const subject = env.VAPID_SUBJECT;

  const header = pushB64(
    new TextEncoder().encode(
      JSON.stringify({ typ: 'JWT', alg: 'ES256' })
    )
  );

  const claims = pushB64(
    new TextEncoder().encode(JSON.stringify({
      aud: origin,
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: subject
    }))
  );

  const unsigned = header + '.' + claims;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(unsigned)
  );

  return {
    jwt: unsigned + '.' + pushB64(new Uint8Array(signature)),
    publicKey: env.VAPID_PUBLIC_KEY
  };
}

async function encryptPushPayload(subscription, payload) {
  const encoder = new TextEncoder();

  const clientPublicKey = pushBytes(subscription.p256dh);
  const authSecret = pushBytes(subscription.auth);

  // Generate a fresh encryption key for each notification.
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const serverPublicKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey)
  );

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeys.privateKey,
    256
  );

  async function hkdf(ikm, salt, info, length) {
    const key = await crypto.subtle.importKey(
      'raw',
      ikm,
      'HKDF',
      false,
      ['deriveBits']
    );

    return new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt,
          info
        },
        key,
        length * 8
      )
    );
  }

  function joinBytes(...arrays) {
    const result = new Uint8Array(
      arrays.reduce((total, item) => total + item.length, 0)
    );

    let offset = 0;

    for (const item of arrays) {
      result.set(item, offset);
      offset += item.length;
    }

    return result;
  }

  const info = joinBytes(
    encoder.encode('WebPush: info\0'),
    clientPublicKey,
    serverPublicKey
  );

  const ikm = await hkdf(
    sharedSecret,
    authSecret,
    info,
    32
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const contentKey = await hkdf(
    ikm,
    salt,
    encoder.encode('Content-Encoding: aes128gcm\0'),
    16
  );

  const nonce = await hkdf(
    ikm,
    salt,
    encoder.encode('Content-Encoding: nonce\0'),
    12
  );

  const plaintext = joinBytes(
    encoder.encode(JSON.stringify(payload)),
    new Uint8Array([2])
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentKey,
    'AES-GCM',
    false,
    ['encrypt']
  );

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      plaintext
    )
  );

  // Web Push aes128gcm record header.
  const recordHeader = new Uint8Array(5);
  new DataView(recordHeader.buffer).setUint32(0, 4096);
  recordHeader[4] = serverPublicKey.length;

  return joinBytes(
    salt,
    recordHeader,
    serverPublicKey,
    ciphertext
  );
}



async function sendPush(subscription, env, content) {
  if (
    !env.VAPID_PUBLIC_KEY ||
    !env.VAPID_PRIVATE_KEY ||
    !env.VAPID_SUBJECT
  ) return null;

  const endpoint = subscription.endpoint;

  const { jwt, publicKey } = await pushVapidToken(
    endpoint,
    env
  );

  const payload = await encryptPushPayload(
    subscription,
    {
      title: content.title,
      body: content.body,
      url: '/'
    }
  );

  return fetch(endpoint, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Authorization: 'vapid t=' + jwt + ', k=' + publicKey,
      TTL: '300',
      Urgency: 'normal',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream'
    },
    body: payload
  });
}



export async function onRequest({ request, env, params, waitUntil }) {

  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) return fail(
    'Backend not configured: add SUPABASE_SERVICE_ROLE_KEY in Cloudflare Pages secrets.',
    503
  );

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin)
    return fail('Origin not allowed.', 403);

  const bearer = request.headers.get('Authorization') || '';
  if (!bearer.startsWith('Bearer '))
    return fail('Please log in first.', 401);

  const userRes = await fetch(URL_BASE + '/auth/v1/user', {
    headers: { apikey: key, Authorization: bearer }
  });

  if (!userRes.ok) return fail('Session expired. Please log in.', 401);

  const user = await userRes.json();
  const me = {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name ||
      user.email?.split('@')[0] || ''
  };

  const baseHeaders = {
    apikey: key,
    Authorization: 'Bearer ' + key
  };

  async function db(table, {
    select = '*',
    filters = {},
    method = 'GET',
    body,
    order,
    limit
  } = {}) {
    const u = new URL(URL_BASE + '/rest/v1/' + table);

    if (select) u.searchParams.set('select', select);

    for (const [k, v] of Object.entries(filters))
      u.searchParams.set(k, v);

    if (order) u.searchParams.set('order', order);
    if (limit) u.searchParams.set('limit', limit);

    const r = await fetch(u, {
      method,
      headers: {
        ...baseHeaders,
      
Prefer: method === 'POST' &&
        table === 'squareup_notification_preferences'
  ? 'resolution=merge-duplicates,return=representation'
  : 'return=representation',

        ...(method !== 'GET'
          ? { 'Content-Type': 'application/json' }
          : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const data = await r.json().catch(() => []);

    if (!r.ok)
      throw new Error(
        data.message || data.error || 'Database request failed'
      );


// Send categorized push alerts when new notifications are saved.
if (
  table === 'squareup_notifications' &&
  method === 'POST' &&
  waitUntil
) {
  const rows = Array.isArray(data) ? data : [];

  // Choose a short, privacy-friendly notification for each event.
  function pushContent(row) {
    switch (row.kind) {
      case 'chat':
        return {
          title: 'New Chat Message',
          body: 'Someone sent a message in your SquareUp tracker.'
        };

      case 'mention':
        return {
          title: 'You Were Mentioned',
          body: 'Someone mentioned you in a group chat.'
        };

      case 'expense':
        return {
          title: 'New Expense Logged',
          body: 'A new expense was added to your tracker.'
        };

      case 'payment_pending':
        return {
          title: 'Payment Awaiting Confirmation',
          body: 'A payment is waiting for your confirmation.'
        };

      case 'payment_confirmed':
        return {
          title: 'Payment Confirmed',
          body: 'Your payment has been confirmed.'
        };

      case 'payment_disputed':
        return {
          title: 'Payment Disputed',
          body: 'A payment needs your attention.'
        };

      default:
        return {
          title: 'SquareUp Notification',
          body: 'You have new activity.'
        };
    }
  }

  if (rows.length) {
    waitUntil((async () => {
      try {
        const recipients = [
          ...new Set(rows.map(r => r.recipient_id).filter(Boolean))
        ];


        // Load each recipient's saved push preferences.
        const preferenceRows = await db(
          'squareup_notification_preferences',
          {
            filters: {
              user_id: 'in.(' + recipients.join(',') + ')'
            },
            limit: 500
          }
        );

        const preferencesByUser = new Map(
          preferenceRows.map(row => [row.user_id, row])
        );

        function allowedPush(row) {
          const prefs = preferencesByUser.get(row.recipient_id);

          // New users receive notifications by default.
          if (!prefs) return true;

          const kind = String(row.kind || '').toLowerCase();

          let category = 'expenses';

          if (kind.includes('chat') ||
              kind.includes('message') ||
              kind.includes('mention')) {
            category = 'messages';
          } else if (kind.includes('payment') ||
                     kind.includes('confirm') ||
                     kind.includes('dispute')) {
            category = 'payments';
          } else if (kind.includes('remind') ||
                     kind.includes('due')) {
            category = 'reminders';
          }

          return prefs[category] !== false;
        }

        
        const subscriptions = await db(
          'squareup_push_subscriptions',
          {
            filters: {
              user_id: 'in.(' + recipients.join(',') + ')'
            },
            limit: 500
          }
        );
        
        // Send each device its recipient's notification category.
        await Promise.all(subscriptions.map(async s => {
          try {
          

            const recipientRows = rows.filter(
              r => r.recipient_id === s.user_id
            );

            const preference = preferencesByUser.get(s.user_id) || {};

            const allowedRows = recipientRows.filter(
  r => allowedPush(r)
);

            if (!allowedRows.length) return;

            // Use the most recent allowed notification.
            const content = pushContent(
              allowedRows[allowedRows.length - 1]
            );


            const response = await sendPush(
              s,
              env,
              content
            );

            if (response && [404, 410].includes(response.status)) {
              await db('squareup_push_subscriptions', {
                method: 'DELETE',
                filters: {
                  endpoint: 'eq.' + s.endpoint
                }
              });
            } else if (response && !response.ok) {
              console.error(
                'Push delivery rejected:',
                response.status
              );
            }
          } catch (error) {
            console.error('Push delivery error:', error.message);
          }
        }));
      } catch (error) {
        console.error(
          'Push notification dispatch:',
          error.message
        );
      }
    })());
  }
}


    
    return data;
  }

  async function storage(bucket, path, method = 'GET', bytes, type) {
    const u = URL_BASE + '/storage/v1/object/' + bucket + '/' + path;

    const r = await fetch(u, {
      method,
      headers: {
        ...baseHeaders,
        ...(type ? { 'Content-Type': type } : {})
      },
      body: bytes
    });

    if (!r.ok) {
      if (method === 'GET') return null;
      throw Error('Photo storage request failed');
    }

    return r;
  }

  const parts = params.path || [];
  console.log('SquareUp API route debug:', {
  path: new URL(request.url).pathname,
  parts,
  method: request.method
});
  const method = request.method;

  // Verify tracker ownership against the original trackers table
  // as well as tracker_members.
  // This preserves access to legacy owner-created trackers.
  
async function member(id) {
  
if (
  typeof id !== 'string' ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
) {
  console.error('Invalid tracker ID:', id);
  return null;
}

  const trackers = await db('trackers', {
    filters: { id: 'eq.' + id },
    limit: 1
  });

  const tracker = trackers[0];

  if (!tracker) {
    console.error(
      'TRACKER ACCESS DIAGNOSTIC: tracker absent from backend database',
      {
        trackerId: id,
        supabaseProject: new URL(URL_BASE).hostname
      }
    );
    return null;
  }

  const members = await db('tracker_members', {
    filters: { tracker_id: 'eq.' + id }
  });

  const currentUserId = String(me.id).toLowerCase();

  const match = members.find(row =>
    String(row.user_id).toLowerCase() === currentUserId
  );

  if (match) return match;

  if (String(tracker.owner_id).toLowerCase() === currentUserId) {
    return {
      tracker_id: id,
      user_id: me.id,
      role: 'owner',
      name: me.name
    };
  }

  console.error(
    'TRACKER ACCESS DIAGNOSTIC: user not authorized for tracker',
    {
      trackerId: id,
      userId: me.id,
      memberCount: members.length,
      supabaseProject: new URL(URL_BASE).hostname
    }
  );

  return null;
}


  function advanceDate(date, freq) {
    const d = new Date(date + 'T12:00:00Z');

    if (freq === 'daily')
      d.setUTCDate(d.getUTCDate() + 1);
    else if (freq === 'weekly')
      d.setUTCDate(d.getUTCDate() + 7);
    else if (freq === 'biweekly')
      d.setUTCDate(d.getUTCDate() + 14);
    else if (freq === 'monthly') {
      const day = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + 1);

      const month = d.getUTCMonth();
      d.setUTCDate(Math.min(
        day,
        new Date(Date.UTC(
          d.getUTCFullYear(), month + 1, 0
        )).getUTCDate()
      ));
    }

    return d.toISOString().slice(0, 10);
  }

  async function materializeRecurring(id) {
    const schedules = await db('squareup_recurring_expenses', {
      filters: {
        tracker_id: 'eq.' + id,
        active: 'eq.true'
      }
    });

    const today = new Date().toISOString().slice(0, 10);

    for (const s of schedules) {
      let next = s.next_date;
      let n = 0;

      while (next <= today && n < 24) {
        const existing = await db('tracker_entries', {
          filters: {
            recurring_id: 'eq.' + s.id,
            recurring_on: 'eq.' + next
          }
        });

        if (!existing.length) {
          const created = (await db('tracker_entries', {
            method: 'POST',
            body: {
              tracker_id: id,
              created_by: s.created_by,
              type: 'debt',
              from_name: s.from_name,
              to_name: s.to_name,
              amount: s.amount,
              note: s.note,
              date_label: next,
              due_date: null,
              payment_status: 'confirmed',
              recurring_id: s.id,
              recurring_on: next
            }
          }))[0];

          const recipient = (await db('tracker_members', {
            filters: { tracker_id: 'eq.' + id }
          })).find(
            m => m.name.toLowerCase() ===
              s.from_name.toLowerCase()
          );

          if (recipient && recipient.user_id !== s.created_by) {
            await db('squareup_notifications', {
              method: 'POST',
              body: {
                recipient_id: recipient.user_id,
                tracker_id: id,
                entry_id: created.id,
                kind: 'expense',
                title: 'Recurring expense',
                message: s.from_name + ' owes ' + s.to_name +
                  ' $' + Number(s.amount).toFixed(2) +
                  ' · ' + s.note
              }
            });
          }
        }

        next = advanceDate(next, s.frequency);
        n++;
      }

      if (n) {
        await db('squareup_recurring_expenses', {
          method: 'PATCH',
          filters: {
            id: 'eq.' + s.id,
            tracker_id: 'eq.' + id
          },
          body: { next_date: next }
        });
      }
    }
  }

  async function detail(id) {
    const t = (await db('trackers', {
      filters: { id: 'eq.' + id }
    }))[0];

    const m = await member(id);

    if (!t || !m) throw Error('Tracker not found');

    const members = await db('tracker_members', {
      filters: { tracker_id: 'eq.' + id }
    });

    const entries = await db('tracker_entries', {
      filters: { tracker_id: 'eq.' + id },
      order: 'created_at.asc'
    });

    const profiles = await db('profiles', {
      filters: {
        user_id: 'in.(' +
          members.map(x => x.user_id).join(',') +
          ')'
      }
    }).catch(() => []);

    return {
      id: t.id,
      name: t.name,
      currency: t.currency || 'USD',
budget: t.budget_amount == null
  ? null
  : Number(t.budget_amount),
      role: m.role,
      inviteToken: t.invite_token,
      backdrop: {
        preset: t.backdrop,
        photo: t.backdrop === 'photo' && t.backdrop_image
          ? t.backdrop_image.split('/').pop()
          : null
      },
      members: members.map(x => ({
        id: x.user_id,
        email: x.email,
        name: profiles.find(
          p => p.user_id === x.user_id
        )?.display_name || x.name,
      
role: x.role,
isYou: x.user_id === me.id,
username: profiles.find(
  p => p.user_id === x.user_id
)?.username || '',

        photo: profiles.find(
          p => p.user_id === x.user_id
        )?.photo_key?.split('/').pop() || null,
        payments: {
          venmo: profiles.find(
            p => p.user_id === x.user_id
          )?.venmo_username || '',
          cashapp: profiles.find(
            p => p.user_id === x.user_id
          )?.cashapp_username || ''
        }
      })),
      entries: entries.map(e => ({
        id: e.id,
        type: e.type,
        from: e.from_name,
        to: e.to_name,
        amount: Number(e.amount),
        originalAmount: e.original_amount == null
  ? Number(e.amount)
  : Number(e.original_amount),

originalCurrency: e.original_currency || t.currency || 'USD',

exchangeRate: e.exchange_rate == null
  ? 1
  : Number(e.exchange_rate),
        note: e.note,
        date: e.date_label,
        dueDate: e.due_date || null,
        paymentStatus: e.payment_status || 'confirmed',
        createdBy: members.find(
          m => m.user_id === e.created_by
        )?.name || '',
        pinned: !!e.is_pinned,
        recurringId: e.recurring_id || null
      }))
    };
  }

  try {
   
const body = ['POST', 'PATCH', 'DELETE'].includes(method) &&

  (request.headers.get('Content-Type') || '')
    .includes('application/json')
      ? await request.json().catch(() => ({}))
      : {};

    // ACCOUNT DELETION
    if (parts[0] === 'account' &&
        parts.length === 1 && method === 'DELETE') {

      const owned = await db('trackers', {
        filters: { owner_id: 'eq.' + me.id }
      });

      for (const t of owned) {
        if (t.backdrop_image)
          await storage(
            'tracker-backdrops',
            t.backdrop_image,
            'DELETE'
          );

        await db('tracker_entries', {
          method: 'DELETE',
          filters: { tracker_id: 'eq.' + t.id }
        });

        await db('tracker_members', {
          method: 'DELETE',
          filters: { tracker_id: 'eq.' + t.id }
        });

        await db('trackers', {
          method: 'DELETE',
          filters: { id: 'eq.' + t.id }
        });
      }

      await db('tracker_entries', {
        method: 'DELETE',
        filters: { created_by: 'eq.' + me.id }
      });

      await db('tracker_members', {
        method: 'DELETE',
        filters: { user_id: 'eq.' + me.id }
      });

      const p = (await db('profiles', {
        filters: { user_id: 'eq.' + me.id }
      }))[0];

      if (p?.photo_key)
        await storage(
          'profile-photos',
          p.photo_key,
          'DELETE'
        );

await db('squareup_push_subscriptions', {
  method: 'DELETE',
  filters: {
    user_id: 'eq.' + me.id
  }
});

      await db('profiles', {
        method: 'DELETE',
        filters: { user_id: 'eq.' + me.id }
      });

      const authDelete = await fetch(
        URL_BASE + '/auth/v1/admin/users/' +
          encodeURIComponent(me.id),
        {
          method: 'DELETE',
          headers: baseHeaders
        }
      );

      if (!authDelete.ok) {
        const info = await authDelete.json().catch(() => ({}));
        throw Error(
          info.msg || info.message ||
          'Could not delete login account. Contact support.'
        );
      }

      return json({ ok: true });
    }

    // JOIN TRACKER
    if (parts[0] === 'join' && parts[1] && method === 'POST') {
      const t = (await db('trackers', {
        filters: { invite_token: 'eq.' + parts[1] }
      }))[0];

      if (!t)
        return fail(
          'This invite link is no longer valid.',
          404
        );

      await db('tracker_members', {
        method: 'POST',
        body: {
          tracker_id: t.id,
          user_id: me.id,
          email: me.email,
          name: me.name,
          role: 'member'
        },
        select: '*'
      }).catch(async e => {
        if (!String(e).includes('duplicate')) throw e;
      });

      return json({ id: t.id, name: t.name });
    }

    // PROFILE
    if (parts[0] === 'profile') {
      const target = parts[2] || me.id;

      if (parts.length === 1 && method === 'GET') {
        const p = (await db('profiles', {
          filters: { user_id: 'eq.' + me.id }
        }))[0];

        return json({
          photo: p?.photo_key?.split('/').pop() || null,
          displayName: p?.display_name || me.name,
          username: p?.username || '',
          bio: p?.bio || '',
          venmo: p?.venmo_username || '',
          cashapp: p?.cashapp_username || ''
        });
      }

      if (parts.length === 1 && method === 'PATCH') {
        const p = (await db('profiles', {
          filters: { user_id: 'eq.' + me.id }
        }))[0];

        const update = {
          updated_at: new Date().toISOString()
        };

        if (body.displayName !== undefined) {
          const name = clean(body.displayName, 60);
          if (!name) return fail('Enter a display name.', 400);
          update.display_name = name;
        }

        if (body.username !== undefined) {
          const name = clean(
            body.username, 24
          ).toLowerCase();

          if (!/^[a-z0-9_]{3,24}$/.test(name))
            return fail(
              'Username must be 3–24 letters, numbers or underscores.',
              400
            );

          const taken = await db('profiles', {
            filters: { username: 'eq.' + name }
          });

          if (taken.some(x => x.user_id !== me.id))
            return fail(
              'That username is already taken.',
              409
            );

          update.username = name;
        }

        if (body.bio !== undefined)
          update.bio = clean(body.bio, 180);

        if (body.venmo !== undefined) {
          const v = clean(
            body.venmo, 30
          ).replace(/^@/, '');

          if (v && !/^[a-zA-Z0-9_-]{3,30}$/.test(v))
            return fail(
              'Enter a valid Venmo username.',
              400
            );

          update.venmo_username = v;
        }

        if (body.cashapp !== undefined) {
          const v = clean(
            body.cashapp, 21
          ).replace(/^\$/, '');

          if (v && !/^[a-zA-Z][a-zA-Z0-9]{0,19}$/.test(v))
            return fail(
              'Enter a valid Cash App $Cashtag.',
              400
            );

          update.cashapp_username = v;
        }

        try {
          if (p) {
            await db('profiles', {
              method: 'PATCH',
              filters: { user_id: 'eq.' + me.id },
              body: update
            });
          } else {
            await db('profiles', {
              method: 'POST',
              body: {
                user_id: me.id,
                ...update
              }
            });
          }
        } catch (err) {
          if (String(err.message).includes('duplicate'))
            return fail(
              'That username is already taken.',
              409
            );
          throw err;
        }

        if (update.display_name) {
          const memberships = await db('tracker_members', {
            filters: { user_id: 'eq.' + me.id }
          });

          for (const m of memberships) {
            await db('tracker_members', {
              method: 'PATCH',
              filters: {
                user_id: 'eq.' + me.id,
                tracker_id: 'eq.' + m.tracker_id
              },
              body: { name: update.display_name }
            });
          }
        }

        const saved = (await db('profiles', {
          filters: { user_id: 'eq.' + me.id }
        }))[0];

        return json({
          photo: saved?.photo_key?.split('/').pop() || null,
          displayName: saved.display_name || me.name,
          username: saved.username || '',
          bio: saved.bio || '',
          venmo: saved.venmo_username || '',
          cashapp: saved.cashapp_username || ''
        });
      }

      if (parts[1] !== 'photo')
        return fail('Not found', 404);

      if (method === 'GET') {
        if (target !== me.id) {
          const mine = await db('tracker_members', {
            filters: { user_id: 'eq.' + me.id }
          });

          const theirs = await db('tracker_members', {
            filters: { user_id: 'eq.' + target }
          });

          if (!mine.some(a => theirs.some(
            b => b.tracker_id === a.tracker_id
          )))
            return fail('No profile photo.', 404);
        }

        const p = (await db('profiles', {
          filters: { user_id: 'eq.' + target }
        }))[0];

        if (!p?.photo_key)
          return fail('No profile photo.', 404);

        const r = await storage(
          'profile-photos',
          p.photo_key
        );

        if (!r)
          return fail('No profile photo.', 404);

        return new Response(r.body, {
          headers: {
            'Content-Type':
              r.headers.get('Content-Type') ||
              'image/jpeg',
            'Cache-Control': 'private, max-age=60'
          }
        });
      }

      if (parts[2])
        return fail('Not found', 404);

      const p = (await db('profiles', {
        filters: { user_id: 'eq.' + me.id }
      }))[0];

      if (method === 'DELETE') {
        await db('profiles', {
          method: 'POST',
          body: {
            user_id: me.id,
            photo_key: null
          },
          select: '*'
        }).catch(async () => db('profiles', {
          method: 'PATCH',
          filters: { user_id: 'eq.' + me.id },
          body: { photo_key: null }
        }));

        if (p?.photo_key)
          await storage(
            'profile-photos',
            p.photo_key,
            'DELETE'
          );

        return json({ photo: null });
      }

      if (method === 'PUT') {
        const bytes = new Uint8Array(
          await request.arrayBuffer()
        );

        const type = kind(bytes);

        if (!bytes.length ||
            bytes.length > 2 * 1024 * 1024 ||
            !type)
          return fail(
            'Upload a JPEG, PNG or WebP under 2 MB.',
            400
          );

        const version = crypto.randomUUID();
        const path = me.id + '/' + version;

        await storage(
          'profile-photos',
          path,
          'POST',
          bytes,
          type
        );

        if (p) {
          await db('profiles', {
            method: 'PATCH',
            filters: { user_id: 'eq.' + me.id },
            body: {
              photo_key: path,
              updated_at: new Date().toISOString()
            }
          });
        } else {
          await db('profiles', {
            method: 'POST',
            body: {
              user_id: me.id,
              photo_key: path
            }
          });
        }

        if (p?.photo_key)
          await storage(
            'profile-photos',
            p.photo_key,
            'DELETE'
          );

        return json({ photo: version });
      }

      return fail('Method not allowed', 405);
    }

   
// PUSH SUBSCRIPTIONS

if (
  parts[0] === 'push' &&
  parts[1] === 'config' &&
  parts.length === 2 &&
  method === 'GET'
) {
  if (
    !env.VAPID_PUBLIC_KEY ||
    !env.VAPID_PRIVATE_KEY ||
    !env.VAPID_SUBJECT
  ) {
    return fail('Push notifications are not configured yet.', 503);
  }

  return json({ publicKey: env.VAPID_PUBLIC_KEY });
}

if (
  parts[0] === 'push' &&
  parts[1] === 'subscription' &&
  parts.length === 2
) {
  if (method === 'POST') {
    const sub = body.subscription;
    const endpoint =
      typeof sub?.endpoint === 'string' ? sub.endpoint : '';

    let url;

    try {
      url = new URL(endpoint);
    } catch {
      return fail('Invalid push endpoint.', 400);
    }

    if (
      url.protocol !== 'https:' ||
      endpoint.length > 2000 ||
      !sub?.keys?.p256dh ||
      !sub?.keys?.auth
    ) {
      return fail('Invalid push subscription.', 400);
    }

    // Only allow recognized browser push services.
    const host = url.hostname.toLowerCase();

    const trusted =
      host === 'updates.push.services.mozilla.com' ||
      host === 'fcm.googleapis.com' ||
      host === 'web.push.apple.com' ||
      host === 'push.services.mozilla.com' ||
      host.endsWith('.push.apple.com') ||
      host === 'push.googleapis.com';

    if (!trusted) {
      return fail('Unsupported push provider.', 400);
    }

    await db('squareup_push_subscriptions', {
      method: 'POST',
      body: {
        user_id: me.id,
        endpoint,
        p256dh: String(sub.keys.p256dh).slice(0, 256),
        auth: String(sub.keys.auth).slice(0, 128)
      }
    }).catch(async error => {
      if (!/duplicate|unique/i.test(String(error.message))) {
        throw error;
      }

      const existing = await db('squareup_push_subscriptions', {
        filters: { endpoint: 'eq.' + endpoint },
        limit: 1
      });

      if (existing[0]?.user_id !== me.id) {
        throw Error('Subscription belongs to another account.');
      }

      await db('squareup_push_subscriptions', {
        method: 'PATCH',
        filters: {
          endpoint: 'eq.' + endpoint,
          user_id: 'eq.' + me.id
        },
        body: {
          p256dh: String(sub.keys.p256dh).slice(0, 256),
          auth: String(sub.keys.auth).slice(0, 128)
        }
      });
    });

    return json({ ok: true });
  }

  if (method === 'DELETE') {
    const endpoint = String(body.endpoint || '');

    if (!endpoint || endpoint.length > 2000) {
      return fail('Invalid endpoint.', 400);
    }

    await db('squareup_push_subscriptions', {
      method: 'DELETE',
      filters: {
        endpoint: 'eq.' + endpoint,
        user_id: 'eq.' + me.id
      }
    });

    return json({ ok: true });
  }

  return fail('Method not allowed', 405);
}


  // PUSH SUBSCRIPTIONS
// ... existing push subscription code ...

    
    // NOTIFICATION PREFERENCES
    if (parts[0] === 'notification-preferences' && parts.length === 1) { 
      const defaults = {
        expenses: true,
        payments: true,
        messages: true,
        mentions: true,
        reminders: true
      };

      if (method === 'GET') {
        const rows = await db('squareup_notification_preferences', {
          filters: { user_id: 'eq.' + me.id },
          limit: 1
        });

        return json({
          ...defaults,
          ...(rows[0] || {})
        });
      }

      if (method === 'PATCH' || method === 'PUT') {
        const changes = {};

        for (const field of Object.keys(defaults)) {
          if (Object.prototype.hasOwnProperty.call(body, field)) {
            if (typeof body[field] !== 'boolean') {
              return fail('All notification settings must be true or false.', 400);
            }
            changes[field] = body[field];
          }
        }

        if (!Object.keys(changes).length) {
          return fail('No valid preferences supplied.', 400);
        }

        const existing = await db('squareup_notification_preferences', {
          filters: { user_id: 'eq.' + me.id },
          limit: 1
        });

        const saved = await db('squareup_notification_preferences', {
          method: 'POST',
          filters: { on_conflict: 'user_id' },
          body: {
            ...defaults,
            ...(existing[0] || {}),
            ...changes,
            user_id: me.id,
            updated_at: new Date().toISOString()
          }
        });

        return json({
          ...defaults,
          ...(saved[0] || {}),
          ...changes
        });
      }

      return fail('Method not allowed', 405);
    }


    
    // NOTIFICATIONS
    if (parts[0] === 'notifications') {
      // Mark all notifications as read for the signed-in user.
if (
  parts.length === 2 &&
  parts[1] === 'read-all' &&
  method === 'PATCH'
) {
  const readAt = new Date().toISOString();

  await db('squareup_notifications', {
    method: 'PATCH',
    filters: {
      recipient_id: 'eq.' + me.id,
      read_at: 'is.null'
    },
    body: {
      read_at: readAt
    }
  });

  return json({
    ok: true,
    read_at: readAt
  });
}
      if (parts.length === 1 && method === 'GET') {
        const rows = await db('squareup_notifications', {
          filters: { recipient_id: 'eq.' + me.id },
          order: 'created_at.desc',
          limit: 100
        });

        return json(rows);
      }

      // Support UUID and numeric notification IDs.
      if (parts.length === 2 && method === 'PATCH') {
        const notificationId = String(parts[1] || '');

       
if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationId) &&
  !/^[0-9]{1,19}$/.test(notificationId)
) {
  return fail('Invalid notification ID.', 400);
}


        const updated = await db('squareup_notifications', {
          method: 'PATCH',
          filters: {
            id: 'eq.' + notificationId,
            recipient_id: 'eq.' + me.id
          },
          body: {
            read_at: new Date().toISOString()
          }
        });

        if (!updated.length) {
          return fail('Notification not found.', 404);
        }

        return json({
          ok: true,
          notification: updated[0]
        });
      }

      return fail('Not found', 404);
    }

    
    // SOCIAL: Tracker invitations and notifications
    if (parts[0] === 'social' && parts[1] === 'notifications') {
      if (method === 'GET' && parts.length === 2) {
        return json(await db('sq_social_notifications', {
          filters: { recipient_id: 'eq.' + me.id },
          order: 'created_at.desc',
          limit: 100
        }));
      }

      if (method === 'PATCH' && uuid.test(parts[2] || '')) {
        const rows = await db('sq_social_notifications', {
          method: 'PATCH',
          filters: {
            id: 'eq.' + parts[2],
            recipient_id: 'eq.' + me.id
          },
          body: { read_at: new Date().toISOString() }
        });

        return rows.length
          ? json({ ok: true })
          : fail('Notification not found', 404);
      }

      return fail('Not found', 404);
    }

    if (parts[0] === 'social' && parts[1] === 'invitations') {
      // Get invitations sent to the signed-in user.
      if (method === 'GET' && parts.length === 2) {
        return json(await db('sq_tracker_invitations', {
          filters: {
            recipient_id: 'eq.' + me.id,
            status: 'eq.pending'
          },
          order: 'created_at.desc',
          limit: 100
        }));
      }

      // Invite an accepted friend to a tracker you own.
      if (method === 'POST' && parts.length === 2) {
        const trackerId = String(body.trackerId || '');
        const recipientId = String(body.recipientId || '');

        if (!uuid.test(trackerId) ||
            !uuid.test(recipientId) ||
            recipientId === me.id) {
          return fail('Invalid invitation.', 400);
        }

        const tracker = (await db('trackers', {
          filters: { id: 'eq.' + trackerId },
          limit: 1
        }))[0];

        if (!tracker ||
            String(tracker.owner_id).toLowerCase() !== me.id.toLowerCase()) {
          return fail('Only the tracker owner can invite friends.', 403);
        }

        const [lo, hi] = [me.id, recipientId].sort();

        const friendship = await db('sq_friendships', {
          filters: {
            user_low: 'eq.' + lo,
            user_high: 'eq.' + hi,
            status: 'eq.accepted'
          },
          limit: 1
        });

        if (!friendship.length) {
          return fail('You must be friends to invite this user.', 403);
        }

        const existing = await db('tracker_members', {
          filters: {
            tracker_id: 'eq.' + trackerId,
            user_id: 'eq.' + recipientId
          },
          limit: 1
        });

        if (existing.length) {
          return fail('This friend is already a tracker member.', 409);
        }

        const pending = await db('sq_tracker_invitations', {
          filters: {
            tracker_id: 'eq.' + trackerId,
            recipient_id: 'eq.' + recipientId,
            status: 'eq.pending'
          },
          limit: 1
        });

        if (pending.length) {
          return fail('An invitation is already pending.', 409);
        }

        const invitation = (await db('sq_tracker_invitations', {
          method: 'POST',
          body: {
            tracker_id: trackerId,
            tracker_name: tracker.name,
            sender_id: me.id,
            recipient_id: recipientId,
            status: 'pending'
          }
        }))[0];

        await db('sq_social_notifications', {
          method: 'POST',
          body: {
            recipient_id: recipientId,
            kind: 'tracker_invite',
            title: 'Tracker invitation',
            message: 'You were invited to ' + tracker.name,
            invitation_id: invitation.id
          }
        });

        return json(invitation, 201);
      }

      // Accept or decline an invitation.
      if (method === 'POST' &&
          parts.length === 4 &&
          uuid.test(parts[2] || '')) {

        const action = parts[3];

        if (!['accept', 'decline'].includes(action)) {
          return fail('Invalid invitation action.', 400);
        }

        const invitation = (await db('sq_tracker_invitations', {
          filters: {
            id: 'eq.' + parts[2],
            recipient_id: 'eq.' + me.id,
            status: 'eq.pending'
          },
          limit: 1
        }))[0];

        if (!invitation) {
          return fail('Invitation no longer pending.', 404);
        }

        if (action === 'accept') {
          const tracker = (await db('trackers', {
            filters: { id: 'eq.' + invitation.tracker_id },
            limit: 1
          }))[0];

          if (!tracker) {
            return fail('Tracker no longer exists.', 404);
          }

          const existing = await db('tracker_members', {
            filters: {
              tracker_id: 'eq.' + invitation.tracker_id,
              user_id: 'eq.' + me.id
            },
            limit: 1
          });

          if (!existing.length) {
            await db('tracker_members', {
              method: 'POST',
              body: {
                tracker_id: invitation.tracker_id,
                user_id: me.id,
                email: me.email,
                name: me.name,
                role: 'member'
              }
            });
          }
        }

        const updated = await db('sq_tracker_invitations', {
          method: 'PATCH',
          filters: {
            id: 'eq.' + invitation.id,
            recipient_id: 'eq.' + me.id,
            status: 'eq.pending'
          },
          body: {
            status: action === 'accept' ? 'accepted' : 'declined',
            updated_at: new Date().toISOString()
          }
        });

        if (!updated.length) {
          return fail('Invitation already handled.', 409);
        }

        await db('sq_social_notifications', {
          method: 'POST',
          body: {
            recipient_id: invitation.sender_id,
            kind: 'tracker_invite_' + action,
            title: 'Tracker invitation ' +
              (action === 'accept' ? 'accepted' : 'declined'),
            message: me.name +
              (action === 'accept'
                ? ' joined '
                : ' declined an invitation to ') +
              invitation.tracker_name
          }
        });

        return json({
          ok: true,
          trackerId: invitation.tracker_id
        });
      }

      return fail('Not found', 404);
    }


    if (parts[0] !== 'trackers')
      return fail('Not found', 404);

    const id = parts[1];

    // LIST AND CREATE TRACKERS
    if (!id) {
      if (method === 'GET') {
        const members = await db('tracker_members', {
          filters: { user_id: 'eq.' + me.id }
        });

        // Include owner-created trackers even when a legacy
        // membership lookup does not return the owner's row.
        const owned = await db('trackers', {
          filters: { owner_id: 'eq.' + me.id }
        });

        const ids = [...new Set([
          ...members.map(m => m.tracker_id),
          ...owned.map(t => t.id)
        ])];

        if (!ids.length) return json([]);

        const ts = await db('trackers', {
          filters: { id: 'in.(' + ids.join(',') + ')' },
          order: 'created_at.asc'
        });

        const counts = await db('tracker_members', {
          filters: {
            tracker_id: 'in.(' + ids.join(',') + ')'
          }
        });

        return json(ts.map(t => ({
          id: t.id,
          name: t.name,
          currency: t.currency || 'USD',
          role: members.find(
            m => m.tracker_id === t.id
          )?.role,
          memberCount: counts.filter(
            m => m.tracker_id === t.id
          ).length
        })));
      }

      if (method === 'POST') {
        const name = clean(body.name, 80) || 'My tracker';

        const currency = String(body.currency || 'USD').toUpperCase();

if (!validCurrency(currency)) {
  return fail('Unsupported currency.', 400);
}

        const t = (await db('trackers', {
          method: 'POST',
          body: {
            name,
            currency,
            owner_id: me.id
          }
        }))[0];

        await db('tracker_members', {
          method: 'POST',
          body: {
            tracker_id: t.id,
            user_id: me.id,
            email: me.email,
            name: me.name,
            role: 'owner'
          }
        });

        const entries = (
          Array.isArray(body.entries)
            ? body.entries : []
        ).slice(0, 2000).map(validate).filter(Boolean);

        if (entries.length) {
          await db('tracker_entries', {
            method: 'POST',
            body: entries.map(e => ({
              ...e,
              tracker_id: t.id,
              created_by: me.id
            }))
          });
        }

        return json(await detail(t.id), 201);
      }

      return fail('Method not allowed', 405);
    }

    const m = await member(id);

   if (!m) {
  console.error('Tracker membership check failed', {
    trackerId: id,
    userId: me.id
  });

  return fail('Tracker not found.', 404);
}

  const owner = m.role === 'owner';
const sub = parts[2];

// PAYMENT CONFIRMATIONS
console.log('PAYMENT ROUTE CHECK', {
  sub,
  paymentId: parts[3],
  action: parts[4],
  validUUID: uuid.test(parts[3] || ''),
  partsLength: parts.length,
  method
});
    
  if (
  sub === 'payments' &&
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[3] || '') &&
  parts.length === 5 &&
  method === 'POST'
) {
  const action = parts[4];

  if (!['confirm', 'dispute'].includes(action)) {
    return fail('Invalid payment action.', 400);
  }

  const paymentId = parts[3];

  const entry = (await db('tracker_entries', {
    filters: {
      id: 'eq.' + paymentId,
      tracker_id: 'eq.' + id
    },
    limit: 1
  }))[0];

  if (!entry) {
  return fail('Payment record not found.', 404);
}

if (entry.type !== 'payment') {
  return fail(
    'This notification refers to an expense, not a payment. Please review the expense instead.',
    409
  );
}

  const members = await db('tracker_members', {
    filters: {
      tracker_id: 'eq.' + id
    }
  });

  const recipient = members.find(member =>
    member.user_id === me.id
  );

  if (
    !recipient ||
    recipient.name.toLowerCase() !==
      String(entry.to_name).toLowerCase()
  ) {
    return fail(
      'Only the payment recipient can respond.',
      403
    );
  }

  if (entry.payment_status !== 'pending') {
    return fail(
      'Payment has already been reviewed.',
      409
    );
  }

  const status =
    action === 'confirm' ? 'confirmed' : 'disputed';

  const updated = await db('tracker_entries', {
    method: 'PATCH',
    filters: {
      id: 'eq.' + paymentId,
      tracker_id: 'eq.' + id,
      type: 'eq.payment',
      payment_status: 'eq.pending'
    },
    body: {
      payment_status: status
    }
  });

  if (!updated.length) {
    return fail(
      'Payment was already reviewed. Please refresh.',
      409
    );
  }

  if (entry.created_by && entry.created_by !== me.id) {
    try {
      await db('squareup_notifications', {
        method: 'POST',
        body: {
          recipient_id: entry.created_by,
          tracker_id: id,
          entry_id: entry.id,
          kind: 'payment_' + status,
          title: 'Payment ' + status,
          message:
            me.name + ' ' +
            (status === 'confirmed'
              ? 'confirmed'
              : 'disputed') +
            ' a $' +
            Number(entry.amount).toFixed(2) +
            ' payment.'
        }
      });
    } catch (error) {
      console.error(
        'Payment notification failed:',
        error.message
      );
    }
  }

  return json(await detail(id));
}

    console.log('TRACKER ROUTE REACHED', {
  trackerId: id,
  sub,
  method,
  partsLength: parts.length
});

    // TRACKER DETAILS
    if (!sub) {
      if (method === 'GET') {
        // Load existing tracker data first.
        // A recurring sync error must not hide it.
        const result = await detail(id);

        try {
          await materializeRecurring(id);
          return json(await detail(id));
        } catch (recurringError) {
          console.error(
            'Recurring sync failed; returning existing tracker data:',
            recurringError
          );

          return json({
            ...result,
            recurringWarning:
              'Recurring expenses could not sync: ' +
              recurringError.message
          });
        }
      }

      if (method === 'PATCH') {
        const patch = {};

        if (body.name !== undefined) {
          patch.name = clean(body.name, 80);

          if (!patch.name)
            return fail(
              'Give the tracker a name.',
              400
            );
        }

        if (body.backdrop !== undefined) {
          if (!presets.includes(body.backdrop))
            return fail(
              'Pick one of the backdrops.',
              400
            );

          patch.backdrop = body.backdrop;
          patch.backdrop_image = null;
        }

        if (Object.keys(patch).length) {
          await db('trackers', {
            method: 'PATCH',
            filters: { id: 'eq.' + id },
            body: patch
          });
        }

        return json(await detail(id));
      }

      if (method === 'DELETE') {
        if (owner) {
          await db('trackers', {
            method: 'DELETE',
            filters: { id: 'eq.' + id }
          });
        } else {
          await db('tracker_members', {
            method: 'DELETE',
            filters: {
              tracker_id: 'eq.' + id,
              user_id: 'eq.' + me.id
            }
          });
        }

        return json({ ok: true });
      }
    }

    // =============================================
// GROUP BUDGETS
// =============================================

if (sub === 'budget' && parts.length === 3) {
  if (method !== 'PATCH') {
    return fail('Method not allowed', 405);
  }

  const amount =
    body.amount === null || body.amount === ''
      ? null
      : Number(body.amount);

  if (
    amount !== null &&
    (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1e10
    )
  ) {
    return fail('Enter a positive budget or clear it.', 400);
  }

  await db('trackers', {
    method: 'PATCH',
    filters: {
      id: 'eq.' + id
    },
    body: {
      budget_amount:
        amount === null
          ? null
          : Math.round(amount * 100) / 100
    }
  });

  return json(await detail(id));
}


// =============================================
// CHAT PHOTO SHARING - VIEW PHOTOS
// =============================================

if (
  sub === 'chat-photo' &&
  parts.length === 4 &&
  method === 'GET'
) {
  const photoId = String(parts[3] || '');

  if (!uuid.test(photoId)) {
    return fail('Photo not found.', 404);
  }

  const records = await db('squareup_chat_photos', {
    filters: {
      id: 'eq.' + photoId,
      tracker_id: 'eq.' + id
    },
    limit: 1
  });

  if (!records.length) {
    return fail('Photo not found.', 404);
  }

  const stored = await storage(
    'squareup-chat-photos',
    records[0].storage_path
  );

  if (!stored) {
    return fail('Photo not found.', 404);
  }

  return new Response(stored.body, {
    headers: {
      'Content-Type':
        stored.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': 'private, max-age=120',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}


// =============================================
// CHAT PHOTO SHARING - UPLOAD PHOTOS
// =============================================

if (
  sub === 'chat-photo' &&
  parts.length === 3 &&
  method === 'POST'
) {
  const bytes = new Uint8Array(
    await request.arrayBuffer()
  );

  const type = bytes.length >= 12
    ? kind(bytes)
    : null;

  if (
    !type ||
    bytes.length > 4 * 1024 * 1024
  ) {
    return fail(
      'Upload a JPEG, PNG or WebP image under 4 MB.',
      400
    );
  }

  const photoId = crypto.randomUUID();
  const path = id + '/' + photoId;

  await storage(
    'squareup-chat-photos',
    path,
    'POST',
    bytes,
    type
  );

  try {
    await db('squareup_chat_photos', {
      method: 'POST',
      body: {
        id: photoId,
        tracker_id: id,
        uploaded_by: me.id,
        storage_path: path,
        content_type: type
      }
    });
  } catch (error) {
    await storage(
      'squareup-chat-photos',
      path,
      'DELETE'
    ).catch(() => {});

    throw error;
  }

  return json({ photoId }, 201);
}
    
    // TRACKER GROUP CHAT
    if (sub === 'chat' && parts.length === 3) {
      if (method === 'GET') {
        const rows = await db('squareup_chat_messages', {
          filters: { tracker_id: 'eq.' + id },
          order: 'created_at.asc',
          limit: 200
        });

        const reactionRows = rows.length
          ? await db('squareup_chat_reactions', {
              filters: { tracker_id: 'eq.' + id },
              limit: 1000
            })
          : [];

        return json(rows.map(r => ({
          id: r.id,
          replyTo: r.reply_to || null,
          reactions: Object.values(
            reactionRows
              .filter(x => String(x.message_id) === String(r.id))
              .reduce((acc, x) => {
                const emoji = x.emoji;

                if (!acc[emoji]) {
                  acc[emoji] = {
                    emoji,
                    count: 0,
                    mine: false
                  };
                }

                acc[emoji].count++;

                if (x.user_id === me.id) {
                  acc[emoji].mine = true;
                }

                return acc;
              }, {})
          ),
          senderId: r.sender_id,
         senderName: r.sender_name,
message: r.message,
photoId: r.photo_id || null,
mentions: r.mentions || [],
createdAt: r.created_at
        })));
      }

      if (method === 'POST') {
        const message = clean(body.message, 1200);
        const photoId = body.photoId
  ? String(body.photoId)
  : null;

if (!message && !photoId) {
  return fail('Write a message or attach a photo.', 400);
}
        const replyTo = body.replyTo
          ? String(body.replyTo)
          : null;

if (photoId) {
  if (!uuid.test(photoId)) {
    return fail('Invalid photo.', 400);
  }

  const photos = await db('squareup_chat_photos', {
    filters: {
      id: 'eq.' + photoId,
      tracker_id: 'eq.' + id,
      uploaded_by: 'eq.' + me.id
    },
    limit: 1
  });

  if (!photos.length) {
    return fail('Photo not found.', 404);
  }

  const used = await db('squareup_chat_messages', {
    filters: { photo_id: 'eq.' + photoId },
    limit: 1
  });

  if (used.length) {
    return fail('Photo already attached.', 400);
  }
}
        if (
          replyTo &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replyTo) &&
          !/^[0-9]{1,19}$/.test(replyTo)
        ) {
          return fail('Invalid reply message.', 400);
        }

        if (replyTo) {
          const parent = await db('squareup_chat_messages', {
            filters: {
              id: 'eq.' + replyTo,
              tracker_id: 'eq.' + id
            },
            limit: 1
          });

          if (!parent.length) {
            return fail(
              'Message being replied to was not found.',
              404
            );
          }
        }

        const members = await db('tracker_members', {
          filters: { tracker_id: 'eq.' + id }
        });

        const mine = members.find(
          x => x.user_id === me.id
        );

        const senderName = mine?.name || me.name;
const requestedMentions = Array.isArray(body.mentions)
  ? body.mentions.slice(0, 30)
  : [];

const mentions = [
  ...new Set(requestedMentions.map(String))
].filter(userId =>
  userId !== me.id &&
  members.some(x => x.user_id === userId)
);
        const row = (await db('squareup_chat_messages', {
          method: 'POST',
          body: {
            tracker_id: id,
            sender_id: me.id,
            sender_name: senderName,
  message,
photo_id: photoId,
mentions,
reply_to: replyTo
          }
        }))[0];

        const others = members.filter(
          x => x.user_id !== me.id
        );

        if (others.length) {
          await db('squareup_notifications', {
            method: 'POST',
            body: others.map(x => ({
              recipient_id: x.user_id,
              tracker_id: id,
              kind: mentions.includes(x.user_id)
  ? 'mention'
  : 'chat',

title: mentions.includes(x.user_id)
  ? senderName + ' mentioned you'
  : 'New group message',
              message: senderName + ': ' +
(message || 'Shared a photo').slice(0, 180)
            }))
          });
        }

        return json({ id: row.id }, 201);
      }

      return fail('Method not allowed', 405);
    }

    // CHAT REACTIONS
    if (
      sub === 'chat' &&
      parts.length === 5 &&
      parts[4] === 'reactions' &&
      method === 'POST'
    ) {
      const messageId = String(parts[3] || '');

    
if (
  !messageId ||
  messageId === 'undefined' ||
  messageId === 'null' ||
  messageId.length > 200
) {
  return fail('Invalid message ID.', 400);
}


      const emoji = clean(body.emoji, 10);

      if (!['❤️', '👍', '😂', '🎉'].includes(emoji)) {
        return fail('Unsupported reaction.', 400);
      }

      const messages = await db('squareup_chat_messages', {
        filters: {
          id: 'eq.' + messageId,
          tracker_id: 'eq.' + id
        },
        limit: 1
      });

      if (!messages.length) {
        return fail('Message not found.', 404);
      }

      const filters = {
        tracker_id: 'eq.' + id,
        message_id: 'eq.' + messageId,
        user_id: 'eq.' + me.id,
        emoji: 'eq.' + emoji
      };

      const existing = await db('squareup_chat_reactions', {
        filters,
        limit: 1
      });

      if (existing.length) {
        await db('squareup_chat_reactions', {
          method: 'DELETE',
          filters
        });
      } else {
        await db('squareup_chat_reactions', {
          method: 'POST',
          body: {
            tracker_id: id,
            message_id: messageId,
            user_id: me.id,
            emoji
          }
        });
      }

      return json({
        ok: true,
        selected: !existing.length
      });
    }


    // RECURRING EXPENSES
    if (sub === 'recurring') {
      if (method === 'GET') {
        return json(
          await db('squareup_recurring_expenses', {
            filters: { tracker_id: 'eq.' + id },
            order: 'created_at.desc'
          })
        );
      }

      if (method === 'DELETE' &&
          uuid.test(parts[3] || '')) {
        await db('squareup_recurring_expenses', {
          method: 'PATCH',
          filters: {
            tracker_id: 'eq.' + id,
            id: 'eq.' + parts[3]
          },
          body: { active: false }
        });

        return json({ ok: true });
      }

      return fail('Method not allowed', 405);
    }


    // EXPENSE APPROVALS
    if (
      sub === 'entries' &&
      parts[3] &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[3]) &&
      parts[4] === 'approval' &&
      method === 'PATCH'
    ) {
      const action = body.action;

      if (!['approve', 'dispute'].includes(action)) {
        return fail('Invalid approval action.', 400);
      }

      const entry = (await db('tracker_entries', {
        filters: {
          tracker_id: 'eq.' + id,
          id: 'eq.' + parts[3]
        },
        limit: 1
      }))[0];

      if (!entry || entry.type !== 'debt') {
        return fail('Expense not found.', 404);
      }

      const members = await db('tracker_members', {
        filters: { tracker_id: 'eq.' + id }
      });

      const debtor = members.find(
        member =>
          member.name.toLowerCase() ===
          String(entry.from_name).toLowerCase()
      );

      if (!debtor || debtor.user_id !== me.id) {
        return fail(
          'Only the person charged can review this expense.',
          403
        );
      }

      if (entry.payment_status !== 'pending') {
        return fail('Expense has already been reviewed.', 409);
      }

      const newStatus =
        action === 'approve' ? 'confirmed' : 'disputed';

    const updated = await db('tracker_entries', {
  method: 'PATCH',
  filters: {
    tracker_id: 'eq.' + id,
    id: 'eq.' + parts[3],
    type: 'eq.debt',
    payment_status: 'eq.pending'
  },
  body: {
    payment_status: newStatus
  }
});

      if (!updated.length) {
        return fail(
          'Expense was already reviewed. Please refresh.',
          409
        );
      }

      if (entry.created_by && entry.created_by !== me.id) {
        try {
          await db('squareup_notifications', {
            method: 'POST',
            body: {
              recipient_id: entry.created_by,
              tracker_id: id,
              entry_id: entry.id,
              kind: 'expense',
              title: action === 'approve'
                ? 'Expense approved'
                : 'Expense disputed',
              message: me.name +
                (action === 'approve'
                  ? ' approved an expense.'
                  : ' disputed an expense.')
            }
          });
        } catch (error) {
          console.error(
            'Approval notification failed:',
            error.message
          );
        }
      }

      return json(await detail(id));
    }

    
    // PIN AND UNPIN EXPENSES
    if (sub === 'entries' &&
        parts[3] &&
        uuid.test(parts[3]) &&
        parts[4] === 'pin' &&
        method === 'PATCH') {

      const e = (await db('tracker_entries', {
        filters: {
          tracker_id: 'eq.' + id,
          id: 'eq.' + parts[3]
        }
      }))[0];

      if (!e)
        return fail('Expense not found', 404);

      await db('tracker_entries', {
        method: 'PATCH',
        filters: {
          tracker_id: 'eq.' + id,
          id: 'eq.' + parts[3]
        },
        body: {
          is_pinned: !!body.pinned
        }
      });

      return json(await detail(id));
    }

   

    // ADD OR DELETE EXPENSES
    if (sub === 'entries') {
      if (method === 'POST' && !parts[3]) {
        const e = validate(body);

        if (!e)
          return fail(
            'Check the names and amount.',
            400
          );
// CONVERT EXPENSES INTO TRACKER CURRENCY

const tracker = (await db('trackers', {
  filters: { id: 'eq.' + id },
  limit: 1
}))[0];

const baseCurrency = tracker.currency || 'USD';

const originalCurrency = String(
  body.currency || baseCurrency
).toUpperCase();

if (!validCurrency(originalCurrency)) {
  return fail('Unsupported currency.', 400);
}

if (
  e.type === 'payment' &&
  originalCurrency !== baseCurrency
) {
  return fail(
    'Record payments in the tracker currency.',
    400
  );
}

const originalAmount = e.amount;

const rate = await exchangeRate(
  originalCurrency,
  baseCurrency
);

e.amount = Math.round(
  originalAmount * rate * 100
) / 100;

if (!(e.amount > 0)) {
  return fail('Converted amount is too small.', 400);
}
        const members = await db('tracker_members', {
          filters: { tracker_id: 'eq.' + id }
        });

        const findName = n => members.find(
          x => x.name.toLowerCase() ===
            n.toLowerCase()
        );

        const debtor = findName(e.from_name);
        const creditor = findName(e.to_name);

        if (!debtor || !creditor)
          return fail(
            'Select tracker members.',
            400
          );

        if (e.type === 'payment' &&
            debtor.user_id !== me.id)
          return fail(
            'You can only report payments made by you.',
            403
          );


const pending =
  e.type === 'payment' ||
  (
    e.type === 'debt' &&
    debtor.user_id !== me.id
  );

        const created = (await db('tracker_entries', {
          method: 'POST',
          body: {
            ...e,
            original_amount: originalAmount,
original_currency: originalCurrency,
exchange_rate: rate,
            tracker_id: id,
            created_by: me.id,
            payment_status: pending
              ? 'pending' : 'confirmed'
          }
        }))[0];

        if (e.type === 'debt' &&
            body.recurring &&
            body.recurring !== 'none') {

          const freq = body.recurring;

          if (![
            'daily',
            'weekly',
            'biweekly',
            'monthly'
          ].includes(freq))
            return fail(
              'Invalid recurrence',
              400
            );

          const start = new Date()
            .toISOString().slice(0, 10);

          const next = advanceDate(start, freq);

          await db('squareup_recurring_expenses', {
            method: 'POST',
            body: {
              tracker_id: id,
              created_by: me.id,
              from_name: e.from_name,
              to_name: e.to_name,
              amount: e.amount,
              note: e.note,
              frequency: freq,
              next_date: next,
              active: true
            }
          });
        }

       const notify =
  e.type === 'payment'
    ? creditor
    : debtor;


if (notify.user_id !== me.id) {
  const isPayment = e.type === 'payment';
  const needsApproval = e.type === 'debt' && pending;

  await db('squareup_notifications', {
    method: 'POST',
    body: {
      recipient_id: notify.user_id,
      tracker_id: id,
      entry_id: created.id,
      kind: isPayment
        ? 'payment_pending'
        : 'expense',
      title: isPayment
        ? 'Payment awaiting confirmation'
        : needsApproval
          ? 'Expense awaiting approval'
          : 'New expense',
      message: isPayment
        ? me.name +
          ' reported paying you $' +
          e.amount.toFixed(2) +
          '. Confirm or dispute it.'
        : needsApproval
          ? e.from_name +
            ' was charged $' +
            e.amount.toFixed(2) +
            ' by ' + e.to_name +
            '. Review this expense.'
          : e.from_name +
            ' owes ' + e.to_name +
            ' $' + e.amount.toFixed(2) + '.'
    }
  });
}


        return json(await detail(id), 201);
      }

 
if (method === 'DELETE') {
  // Require a valid entry ID to prevent accidental bulk deletion.

const entryId = String(
  new URL(request.url).pathname.split('/').filter(Boolean).at(-1) || ''
);


 
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entryId)) {
  return json({
    error: 'Invalid entry ID.',
    receivedEntryId: entryId,
    routeParts: parts,
    requestPath: new URL(request.url).pathname
  }, 400);
}

  // Find the entry in this tracker.
  const existing = await db('tracker_entries', {
    filters: {
      id: 'eq.' + entryId,
      tracker_id: 'eq.' + id
    },
    limit: 1
  });

  if (!existing.length) {
    return json({
      error: 'Entry not found in this tracker. Refresh the tracker and try again.',
      code: 'ENTRY_NOT_IN_TRACKER',
      entryId
    }, 404);
  }

  // Delete the specific entry.
  const deleted = await db('tracker_entries', {
    method: 'DELETE',
    filters: {
      id: 'eq.' + entryId,
      tracker_id: 'eq.' + id
    }
  });

  if (!deleted.length) {
    return fail('Entry could not be deleted. Please retry.', 409);
  }

  // Clean up notifications for the deleted entry.
  try {
    await db('squareup_notifications', {
      method: 'DELETE',
      filters: {
        entry_id: 'eq.' + entryId,
        tracker_id: 'eq.' + id
      }
    });
  } catch (notificationError) {
    console.error(
      'Notification cleanup failed:',
      notificationError
    );
  }

  return json(await detail(id));

  return json(await detail(id));
}
}


    // SHARE TRACKER
    if (sub === 'invite' && parts.length === 3 && method === 'POST') {
      const trackers = await db('trackers', {
        filters: { id: 'eq.' + id },
        limit: 1
      });

      const t = trackers[0];

      if (!t) {
        return fail('Tracker not found.', 404);
      }

      // Verify ownership using the trackers table,
      // not just the tracker_members role.
      const isOwner =
        String(t.owner_id).toLowerCase() ===
        String(me.id).toLowerCase();

      const wantsReset = body.reset === true;

      // Only the owner can reset an existing invitation.
      if (wantsReset && !isOwner) {
        return fail(
          'Only the owner can reset the invite link.',
          403
        );
      }

      // Members may reuse an existing invitation link,
      // but only the owner can generate a missing one.
      if (!t.invite_token && !isOwner) {
        return fail(
          'Only the owner can create an invite link.',
          403
        );
      }

      let token = t.invite_token;

      if (wantsReset || !token) {
        token =
          crypto.randomUUID().replaceAll('-', '') +
          crypto.randomUUID()
            .replaceAll('-', '').slice(0, 4);

        await db('trackers', {
          method: 'PATCH',
          filters: {
            id: 'eq.' + id,
            owner_id: 'eq.' + me.id
          },
          body: {
            invite_token: token
          }
        });
      }

      return json({ token });
    }


    // REMOVE TRACKER MEMBER
    if (sub === 'members' &&
        parts[3] &&
        method === 'DELETE') {

      if (!owner)
        return fail(
          'Only the owner can remove people.',
          403
        );

      if (parts[3] === me.id)
        return fail(
          "You can't remove yourself as the owner.",
          400
        );

      await db('tracker_members', {
        method: 'DELETE',
        filters: {
          tracker_id: 'eq.' + id,
          user_id: 'eq.' + parts[3]
        }
      });

      return json(await detail(id));
    }

    // TRACKER BACKDROP
    if (sub === 'backdrop') {
      const t = (await db('trackers', {
        filters: { id: 'eq.' + id }
      }))[0];

      if (method === 'GET') {
        if (!t?.backdrop_image)
          return fail(
            'No backdrop photo.',
            404
          );

        const r = await storage(
          'tracker-backdrops',
          t.backdrop_image
        );

        if (!r)
          return fail(
            'No backdrop photo.',
            404
          );

        return new Response(r.body, {
          headers: {
            'Content-Type':
              r.headers.get('Content-Type') ||
              'image/jpeg',
            'Cache-Control':
              'private, max-age=60'
          }
        });
      }

      if (method === 'PUT') {
        const bytes = new Uint8Array(
          await request.arrayBuffer()
        );

        const type = kind(bytes);

        if (!bytes.length ||
            bytes.length > 5 * 1024 * 1024 ||
            !type)
          return fail(
            'Upload a JPEG, PNG or WebP under 5 MB.',
            400
          );

        const path = id + '/' + crypto.randomUUID();

        await storage(
          'tracker-backdrops',
          path,
          'POST',
          bytes,
          type
        );

        await db('trackers', {
          method: 'PATCH',
          filters: { id: 'eq.' + id },
          body: {
            backdrop: 'photo',
            backdrop_image: path
          }
        });

        if (t?.backdrop_image)
          await storage(
            'tracker-backdrops',
            t.backdrop_image,
            'DELETE'
          );

        return json(await detail(id));
      }
    }

    return fail('Not found', 404);
  } catch (e) {
    return fail(
      e.message || 'Unexpected server error',
      500
    );
  }
}
