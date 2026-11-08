
// Cloudflare Pages Functions: server-side Supabase access.
// SUPABASE_SERVICE_ROLE_KEY must be configured as an encrypted Cloudflare secret.
const URL_BASE = 'https://pajrdqarszbnrlstoyly.supabase.co';
const json = (v, status = 200) => Response.json(v, { status });
const fail = (message, status = 400) => json({ error: message }, status);
const clean = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  Prefer:
    method === 'POST' &&
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
  if (typeof id !== 'string' || !uuid.test(id)) {
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
  // Load independent database queries in parallel.
 const [trackers, membership, members, entries, permissionRows] =
  await Promise.all([
    db('trackers', {
      filters: { id: 'eq.' + id },
      limit: 1
    }),
    member(id),
    db('tracker_members', {
      filters: { tracker_id: 'eq.' + id }
    }),
    db('tracker_entries', {
      filters: { tracker_id: 'eq.' + id },
      order: 'created_at.asc'
    }),
    db('squareup_tracker_permissions', {
      filters: { tracker_id: 'eq.' + id }
    })
  ]);

  const t = trackers[0];

  if (!t || !membership) {
    throw Error('Tracker not found');
  }

  const userIds = [...new Set(
    members.map(m => m.user_id).filter(Boolean)
  )];

  const profiles = userIds.length
    ? await db('profiles', {
        filters: {
          user_id: 'in.(' + userIds.join(',') + ')'
        }
      }).catch(() => [])
    : [];

  // Avoid searching the profiles array repeatedly.
  const profileMap = new Map(
    profiles.map(p => [p.user_id, p])
  );

  const memberMap = new Map(
    members.map(m => [m.user_id, m])
  );

const permissionMap = new Map(
  permissionRows.map(p => [
    String(p.user_id).toLowerCase(),
    p
  ])
);

const resolvedRole = memberRow => {
  if (
    String(t.owner_id).toLowerCase() ===
    String(memberRow.user_id).toLowerCase()
  ) {
    return 'owner';
  }

  const saved = permissionMap.get(
    String(memberRow.user_id).toLowerCase()
  );

  return saved?.role === 'viewer' ||
    (!saved && memberRow.role === 'viewer')
      ? 'viewer'
      : 'editor';
};
  
  return {
    id: t.id,
    name: t.name,
    currency: t.currency || 'USD',
    budget: t.budget_amount == null
      ? null
      : Number(t.budget_amount),
    role: resolvedRole(membership),
    inviteToken: t.invite_token,

    backdrop: {
      preset: t.backdrop,
      photo: t.backdrop === 'photo' && t.backdrop_image
        ? t.backdrop_image.split('/').pop()
        : null
    },

    members: members.map(m => {
      const p = profileMap.get(m.user_id);

      return {
        id: m.user_id,
        email: m.email,
        name: p?.display_name || m.name,
        role: resolvedRole(m),
        isYou: m.user_id === me.id,
        username: p?.username || '',
        photo: p?.photo_key?.split('/').pop() || null,
        payments: {
          venmo: p?.venmo_username || '',
          cashapp: p?.cashapp_username || '',
          appleCash: p?.apple_cash_contact || ''
        }
      };
    }),

    entries: entries.map(e => ({
      id: e.id,
      type: e.type,
      from: e.from_name,
      to: e.to_name,
      amount: Number(e.amount),
      originalAmount: e.original_amount == null
        ? Number(e.amount)
        : Number(e.original_amount),
      originalCurrency:
        e.original_currency || t.currency || 'USD',
      exchangeRate: e.exchange_rate == null
        ? 1
        : Number(e.exchange_rate),
      note: e.note,
      date: e.date_label,
      dueDate: e.due_date || null,
      paymentStatus: e.payment_status || 'confirmed',
      createdBy: memberMap.get(e.created_by)?.name || '',
      pinned: !!e.is_pinned,
      recurringId: e.recurring_id || null
    }))
  };
}


  try {
   

const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&


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
await db('squareup_tracker_permissions', {
  method: 'DELETE',
  filters: {
    user_id: 'eq.' + me.id
  }
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
          cashapp: p?.cashapp_username || '',
          appleCash: p?.apple_cash_contact || ''
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
        if (body.appleCash !== undefined) {
          const v = clean(body.appleCash, 120).trim();
          // Apple Cash contacts are phone numbers or Apple Account email addresses.
          if (v && !(/^[+0-9() .-]{7,24}$/.test(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))
            return fail('Enter a valid Apple Cash phone number or email.', 400);
          update.apple_cash_contact = v;
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
          cashapp: saved.cashapp_username || '',
          appleCash: saved.apple_cash_contact || ''
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


  
    // PERSONAL FINANCE HUB
    if (parts[0] === 'finance' && parts[1] === 'transactions') {
      if (parts.length === 2 && method === 'GET') {
        return json(await db('squareup_personal_transactions', {
          filters: { user_id: 'eq.' + me.id },
          order: 'occurred_on.desc,created_at.desc',
          limit: 300
        }));
      }

      if (parts.length === 2 && method === 'POST') {
        const kind = String(body.kind || '');
        const description = clean(body.description, 120);
        const category = clean(body.category, 50);
        const amount = Number(body.amount);

        if (
          !['income', 'expense'].includes(kind) ||
          !description ||
          !category ||
          !Number.isFinite(amount) ||
          amount < 0.01 ||
          amount > 99999999
        ) {
          return fail('Enter a valid personal transaction.', 400);
        }

        const saved = await db('squareup_personal_transactions', {
          method: 'POST',
          body: {
            user_id: me.id,
            kind,
            description,
            category,
            amount: Math.round(amount * 100) / 100,
            currency: 'USD',
            occurred_on: new Date().toISOString().slice(0, 10)
          }
        });

        return json(saved[0], 201);
      }

      if (
        parts.length === 3 &&
        method === 'DELETE' &&
        uuid.test(parts[2])
      ) {
        const deleted = await db('squareup_personal_transactions', {
          method: 'DELETE',
          filters: {
            id: 'eq.' + parts[2],
            user_id: 'eq.' + me.id
          }
        });

        return deleted.length
          ? json({ ok: true })
          : fail('Transaction not found.', 404);
      }

      return fail('Not found', 404);
    }


    // ACCOUNT-SYNCED CURRENCY FAVORITES
    // Requires authenticated user "me" and existing db/json/fail helpers.

    if (
      parts[0] === 'finance' &&
      parts[1] === 'currency-favorites' &&
      parts.length === 2
    ) {
      const table = 'squareup_currency_favorites';

      // Load the signed-in user's favorite currencies.
      if (method === 'GET') {
        const rows = await db(table, {
          filters: { user_id: 'eq.' + me.id },
          limit: 1
        });

        return json({
          favorites: Array.isArray(rows[0]?.favorites)
            ? rows[0].favorites
            : []
        });
      }

      // Save the signed-in user's favorite currencies.
      if (method === 'PUT') {
        const values = body?.favorites;

        if (
          !Array.isArray(values) ||
          values.length > CURRENCIES.length ||
          values.some(
            c => typeof c !== 'string' || !validCurrency(c)
          ) ||
          new Set(values).size !== values.length
        ) {
          return fail('Invalid favorite currencies', 400);
        }

        const rows = await db(table, {
          filters: { user_id: 'eq.' + me.id },
          limit: 1
        });

        const saved = await db(
          table,
          rows.length
            ? {
                method: 'PATCH',
                filters: { user_id: 'eq.' + me.id },
                body: {
                  favorites: values,
                  updated_at: new Date().toISOString()
                }
              }
            : {
                method: 'POST',
                body: {
                  user_id: me.id,
                  favorites: values
                }
              }
        );

        return json({
          favorites: saved[0]?.favorites || values
        });
      }

      return fail('Method not allowed', 405);
    }


    
    // Account-specific Trip/Household directory links. The authenticated caller may
    // link only trackers they can currently access, preventing cross-account access.
    if (parts[0] === 'finance' && parts[1] === 'workspace-links') {
      const table = 'squareup_finance_workspace_links';
      const validTypes = ['trip', 'household'];
      const kind = method === 'POST'
        ? String(body.workspace_type || '')
        : new URL(request.url).searchParams.get('type');
      if (!validTypes.includes(kind)) return fail('Invalid workspace type', 400);

      if (method === 'GET' && parts.length === 2) {
        const rows = await db(table, {
          filters: { user_id: 'eq.' + me.id, workspace_type: 'eq.' + kind },
          order: 'created_at.desc',
          limit: 300
        });
        const authorized = [];
        for (const row of rows) {
          if (await member(row.tracker_id)) authorized.push({tracker_id:row.tracker_id});
        }
        return json(authorized);
      }

      if (method === 'POST' && parts.length === 2) {
        const trackerId = String(body.tracker_id || '');
        if (!uuid.test(trackerId)) return fail('Invalid tracker ID',400);
        if (!(await member(trackerId))) return fail('Tracker not found',404);
        const filters={
          user_id:'eq.'+me.id,tracker_id:'eq.'+trackerId,workspace_type:'eq.'+kind
        };
        const already=await db(table,{filters,limit:1});
        if (!already.length) await db(table,{
          method:'POST',body:{user_id:me.id,tracker_id:trackerId,workspace_type:kind}
        });
        return json({ok:true,tracker_id:trackerId,workspace_type:kind});
      }

      if (method === 'DELETE' && parts.length === 3) {
        const trackerId=String(parts[2]||'');
        if (!uuid.test(trackerId)) return fail('Invalid tracker ID',400);
        await db(table,{
          method:'DELETE',
          filters:{user_id:'eq.'+me.id,tracker_id:'eq.'+trackerId,workspace_type:'eq.'+kind}
        });
        return json({ok:true});
      }
      return fail('Method not allowed',405);
    }


    // FINANCE HUB: trip and household planning records.
    if (parts[0] === 'finance' && parts[1] === 'workspace') {
      const table = 'squareup_finance_workspace_items';

      if (parts.length === 2 && method === 'GET') {
        const kind = new URL(request.url).searchParams.get('type');

        if (!['trip', 'household'].includes(kind)) {
          return fail('Invalid workspace type', 400);
        }

        const rows = await db(table, {
          filters: {
            user_id: 'eq.' + me.id,
            workspace_type: 'eq.' + kind
          },
          order: 'created_at.desc',
          limit: 300
        });

        const allowed = [];

        for (const row of rows) {
          if (await member(row.tracker_id)) allowed.push(row);
        }

        return json(allowed);
      }

      if (parts.length === 2 && method === 'POST') {
        const type = String(body.workspace_type || '');
        const trackerId = String(body.tracker_id || '');
        const title = clean(body.title, 120);
        const itemType = clean(body.item_type, 40);
        const notes = clean(body.notes || '', 500);
        const amount =
          body.amount == null || body.amount === ''
            ? null
            : Number(body.amount);

        if (
          !['trip', 'household'].includes(type) ||
          !uuid.test(trackerId) ||
          !title ||
          !itemType ||
          (amount !== null &&
            (!Number.isFinite(amount) ||
              amount < 0 ||
              amount > 99999999))
        ) {
          return fail('Invalid workspace item', 400);
        }

        if (!await member(trackerId)) {
          return fail('Tracker access denied', 403);
        }

        const saved = await db(table, {
          method: 'POST',
          body: {
            user_id: me.id,
            tracker_id: trackerId,
            workspace_type: type,
            title,
            item_type: itemType,
            notes,
            amount
          }
        });

        return json(saved[0], 201);
      }

      if (
        parts.length === 3 &&
        uuid.test(parts[2]) &&
        ['PATCH', 'DELETE'].includes(method)
      ) {
        const found = await db(table, {
          filters: {
            id: 'eq.' + parts[2],
            user_id: 'eq.' + me.id
          },
          limit: 1
        });

        if (
          !found.length ||
          !await member(found[0].tracker_id)
        ) {
          return fail('Item not found', 404);
        }

        if (method === 'DELETE') {
          await db(table, {
            method: 'DELETE',
            filters: {
              id: 'eq.' + parts[2],
              user_id: 'eq.' + me.id
            }
          });

          return json({ ok: true });
        }

        const patch = {};

        if (Object.prototype.hasOwnProperty.call(body, 'title')) {
          patch.title = clean(body.title, 120);
          if (!patch.title) return fail('Title required', 400);
        }

        if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
          patch.notes = clean(body.notes || '', 500);
        }

        if (typeof body.completed === 'boolean') {
          patch.completed = body.completed;
        }

        if (Object.prototype.hasOwnProperty.call(body, 'amount')) {
          patch.amount =
            body.amount == null ? null : Number(body.amount);

          if (
            patch.amount !== null &&
            (!Number.isFinite(patch.amount) ||
              patch.amount < 0 ||
              patch.amount > 99999999)
          ) {
            return fail('Invalid amount', 400);
          }
        }

        if (!Object.keys(patch).length) {
          return fail('Nothing to update', 400);
        }

        const saved = await db(table, {
          method: 'PATCH',
          filters: {
            id: 'eq.' + parts[2],
            user_id: 'eq.' + me.id
          },
          body: patch
        });

        return json(saved[0]);
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
         role:
  String(t.owner_id).toLowerCase() ===
  String(me.id).toLowerCase()
    ? 'owner'
    : members.find(
        m => m.tracker_id === t.id
      )?.role || 'member',
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

const trackerOwnerRecord = (await db('trackers', {
  filters: {
    id: 'eq.' + id
  },
  limit: 1
}))[0];

const owner =
  String(trackerOwnerRecord?.owner_id).toLowerCase() ===
  String(me.id).toLowerCase() ||
  (!trackerOwnerRecord?.owner_id && m.role === 'owner');
const sub = parts[2];

    
/* =========================================
   SQUAREUP WISHLISTS AND CHAT POLLS
   Add immediately below: const sub = parts[2];
========================================= */

if (sub === 'wishlist') {
  if (parts.length === 3 && method === 'GET') {
    const items = await db('squareup_wishlist_items', {
      filters: { tracker_id: 'eq.' + id },
      order: 'created_at.desc'
    });

    const votes = await db('squareup_wishlist_votes', {
      filters: {
        item_id: 'in.(' + (
          items.map(x => x.id).join(',') ||
          '00000000-0000-0000-0000-000000000000'
        ) + ')'
      }
    });

    return json(items.map(item => ({
      ...item,
      votes: votes.filter(v => v.item_id === item.id).length
    })));
  }

  if (parts.length === 3 && method === 'POST') {
    const title = clean(body?.title, 100);
    const link = clean(body?.link, 500);

    if (!title) return fail('Enter an idea.', 400);

    if (link) {
      try {
        const url = new URL(link);
        if (!['https:', 'http:'].includes(url.protocol)) {
          return fail('Use an HTTP or HTTPS link.', 400);
        }
      } catch {
        return fail('Invalid link.', 400);
      }
    }

    const saved = await db('squareup_wishlist_items', {
      method: 'POST',
      body: {
        tracker_id: id,
        title,
        link,
        created_by: me.id
      }
    });

    return json(saved[0], 201);
  }

  if (parts.length === 4 && method === 'PATCH') {
    const itemId = parts[3];

    const item = (await db('squareup_wishlist_items', {
      filters: {
        id: 'eq.' + itemId,
        tracker_id: 'eq.' + id
      },
      limit: 1
    }))[0];

    if (!item) return fail('Wishlist item not found.', 404);

    if (body?.action === 'vote') {
      const existing = await db('squareup_wishlist_votes', {
        filters: {
          item_id: 'eq.' + itemId,
          user_id: 'eq.' + me.id
        },
        limit: 1
      });

      if (existing.length) {
        await db('squareup_wishlist_votes', {
          method: 'DELETE',
          filters: {
            item_id: 'eq.' + itemId,
            user_id: 'eq.' + me.id
          }
        });
      } else {
        await db('squareup_wishlist_votes', {
          method: 'POST',
          body: { item_id: itemId, user_id: me.id }
        });
      }

      return json({ success: true });
    }

    if (body?.action === 'toggle') {
      if (!owner && item.created_by !== me.id) {
        return fail('Only the creator or tracker owner can change this.', 403);
      }

      await db('squareup_wishlist_items', {
        method: 'PATCH',
        filters: {
          id: 'eq.' + itemId,
          tracker_id: 'eq.' + id
        },
        body: { completed: !item.completed }
      });

      return json({ success: true });
    }

    return fail('Invalid wishlist action.', 400);
  }

  return fail('Method not allowed.', 405);
}

if (sub === 'polls') {
  if (parts.length === 3 && method === 'GET') {
    const polls = await db('squareup_polls', {
      filters: { tracker_id: 'eq.' + id },
      order: 'created_at.desc',
      limit: 30
    });

    if (!polls.length) return json([]);

    const pollIds = polls.map(p => p.id).join(',');

    const options = await db('squareup_poll_options', {
      filters: { poll_id: 'in.(' + pollIds + ')' },
      order: 'position.asc'
    });

    const votes = await db('squareup_poll_votes', {
      filters: { poll_id: 'in.(' + pollIds + ')' }
    });

    return json(polls.map(p => {
      const pollVotes = votes.filter(v => v.poll_id === p.id);

      return {
        id: p.id,
        question: p.question,
        closed: p.closed,
        totalVotes: pollVotes.length,
        canClose: owner || p.created_by === me.id,
        options: options
          .filter(o => o.poll_id === p.id)
          .map(o => ({
            id: o.id,
            label: o.label,
            votes: pollVotes.filter(v => v.option_id === o.id).length,
            mine: pollVotes.some(
              v => v.option_id === o.id && v.user_id === me.id
            )
          }))
      };
    }));
  }

  if (parts.length === 3 && method === 'POST') {
    const question = clean(body?.question, 160);
    const options = Array.isArray(body?.options)
      ? body.options.map(v => clean(v, 100)).filter(Boolean)
      : [];

    if (!question || options.length < 2 || options.length > 4) {
      return fail('Enter a question and 2–4 options.', 400);
    }

    const created = await db('squareup_polls', {
      method: 'POST',
      body: {
        tracker_id: id,
        question,
        created_by: me.id
      }
    });

    const poll = created[0];

    try {
      await db('squareup_poll_options', {
        method: 'POST',
        body: options.map((label, position) => ({
          poll_id: poll.id,
          label,
          position
        }))
      });
    } catch (err) {
      await db('squareup_polls', {
        method: 'DELETE',
        filters: { id: 'eq.' + poll.id }
      });
      throw err;
    }

    return json({ success: true, id: poll.id }, 201);
  }

  if (parts.length === 4 && method === 'PATCH') {
    const pollId = parts[3];

    const poll = (await db('squareup_polls', {
      filters: {
        id: 'eq.' + pollId,
        tracker_id: 'eq.' + id
      },
      limit: 1
    }))[0];

    if (!poll) return fail('Poll not found.', 404);

    if (body?.action === 'close') {
      if (!owner && poll.created_by !== me.id) {
        return fail('Only the creator or owner can close the poll.', 403);
      }

      await db('squareup_polls', {
        method: 'PATCH',
        filters: {
          id: 'eq.' + pollId,
          tracker_id: 'eq.' + id
        },
        body: { closed: true }
      });

      return json({ success: true });
    }

    if (body?.action === 'vote') {
      if (poll.closed) return fail('This poll is closed.', 400);

      const option = (await db('squareup_poll_options', {
        filters: {
          id: 'eq.' + String(body.optionId || ''),
          poll_id: 'eq.' + pollId
        },
        limit: 1
      }))[0];

      if (!option) return fail('Invalid poll option.', 400);

      // One vote per member per poll.
      const existing = await db('squareup_poll_votes', {
        filters: {
          poll_id: 'eq.' + pollId,
          user_id: 'eq.' + me.id
        },
        limit: 1
      });

      if (existing.length) {
        await db('squareup_poll_votes', {
          method: 'PATCH',
          filters: {
            poll_id: 'eq.' + pollId,
            user_id: 'eq.' + me.id
          },
          body: { option_id: option.id }
        });
      } else {
        await db('squareup_poll_votes', {
          method: 'POST',
          body: {
            poll_id: pollId,
            user_id: me.id,
            option_id: option.id
          }
        });
      }

      return json({ success: true });
    }

    return fail('Invalid poll action.', 400);
  }

  return fail('Method not allowed.', 405);
}


 // =============================================
 // SQUAREUP GROUP PROFILES
 // =============================================

if (sub === 'group-profile' && parts.length === 3) {

  if (method === 'GET') {
    const rows = await db('squareup_group_profiles', {
      filters: { tracker_id: 'eq.' + id },
      limit: 1
    });

    return json(rows[0] || {
      tracker_id: id,
      title: trackerOwnerRecord.name,
      description: '',
      emoji: '👥'
    });
  }

  if (method === 'PATCH') {
    if (!owner) {
      return fail(
        'Only the tracker owner can edit the group profile.',
        403
      );
    }

    const title = clean(body.title, 80);
    const description = clean(body.description, 300);
    const emoji = clean(body.emoji, 8) || '👥';

    const existing = await db('squareup_group_profiles', {
      filters: { tracker_id: 'eq.' + id },
      limit: 1
    });

    const changes = {
      title: title || trackerOwnerRecord.name,
      description,
      emoji,
      updated_by: me.id,
      updated_at: new Date().toISOString()
    };

    const saved = await db(
      'squareup_group_profiles',
      existing.length
        ? {
            method: 'PATCH',
            filters: { tracker_id: 'eq.' + id },
            body: changes
          }
        : {
            method: 'POST',
            body: {
              tracker_id: id,
              ...changes
            }
          }
    );

    return json(saved[0]);
  }

  return fail('Method not allowed', 405);
}

    
// Only uniquely identified tracker members can be
// treated as payment participants.
async function sqPaymentParticipants(entry) {
  const members = await db('tracker_members', {
    filters: { tracker_id: 'eq.' + id }
  });

  const match = name => members.filter(x =>
    String(x.name || '').trim().toLowerCase() ===
    String(name || '').trim().toLowerCase()
  );

  const from = match(entry.from_name);
  const to = match(entry.to_name);

  if (
    from.length !== 1 ||
    to.length !== 1 ||
    !from[0].user_id ||
    !to[0].user_id ||
    from[0].user_id === to[0].user_id
  ) {
    return null;
  }

  return {
    fromId: from[0].user_id,
    toId: to[0].user_id
  };
}

// Download attachments only after tracker membership
// has been verified by the existing backend.
if (
  sub === 'feature-attachment' &&
  parts.length === 4 &&
  method === 'GET'
) {
  const record = (await db('squareup_expense_attachments', {
    filters: {
      id: 'eq.' + parts[3],
      tracker_id: 'eq.' + id
    },
    limit: 1
  }))[0];

  if (!record) {
    return fail('Attachment not found.', 404);
  }

  const response = await storage(
    'squareup-expense-attachments',
    record.storage_path,
    'GET'
  );

  if (!response) {
    return fail('Attachment unavailable.', 404);
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': record.mime_type,
      'Content-Disposition':
        'attachment; filename="attachment"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

if (sub === 'features' && parts.length >= 4) {
  const feature = parts[3];
  const entryId = parts[4];

  const permitted = [
    'comments',
    'reactions',
    'attachments',
    'goals',
    'contributions',
    'disputes'
  ];

  if (!permitted.includes(feature)) {
    return fail('Unknown feature.', 404);
  }

  const table = {
    comments: 'squareup_expense_comments',
    reactions: 'squareup_expense_reactions',
    attachments: 'squareup_expense_attachments',
    goals: 'squareup_savings_goals',
    contributions: 'squareup_goal_contributions',
    disputes: 'squareup_dispute_resolutions'
  }[feature];

  const isEntryFeature = [
    'comments',
    'reactions',
    'attachments',
    'disputes'
  ].includes(feature);

  if (isEntryFeature) {
    if (
      !uuid.test(entryId || '') ||
      !(await db('tracker_entries', {
        filters: {
          id: 'eq.' + entryId,
          tracker_id: 'eq.' + id
        },
        limit: 1
      })).length
    ) {
      return fail('Expense not found.', 404);
    }
  }

  if (feature === 'contributions') {
    if (
      !uuid.test(entryId || '') ||
      !(await db('squareup_savings_goals', {
        filters: {
          id: 'eq.' + entryId,
          tracker_id: 'eq.' + id
        },
        limit: 1
      })).length
    ) {
      return fail('Goal not found.', 404);
    }
  }

  const filters = { tracker_id: 'eq.' + id };

  if (isEntryFeature) {
    filters.entry_id = 'eq.' + entryId;
  }

  if (feature === 'contributions') {
    filters.goal_id = 'eq.' + entryId;
  }

  // Read feature data.
  if (method === 'GET') {
    const rows = await db(table, {
      filters,
      order: 'created_at.asc',
      limit: 300
    });

    if (feature === 'attachments') {
      return json(
        rows.map(({ storage_path, ...rest }) => rest)
      );
    }

    return json(rows);
  }

  // Create feature data.
  if (method === 'POST') {
    if (m.role === 'viewer') {
      return fail(
        'Viewers cannot change tracker data.',
        403
      );
    }

    // Expense comments
    if (feature === 'comments') {
      const text = clean(body.text, 1500);

      if (!text) {
        return fail('Enter a comment.');
      }

      return json((await db(table, {
        method: 'POST',
        body: {
          tracker_id: id,
          entry_id: entryId,
          user_id: me.id,
          display_name: me.name,
          text
        }
      }))[0], 201);
    }

    // Expense reactions
    if (feature === 'reactions') {
      const emoji = String(body.emoji || '');

      if (!['👍', '🎉', '❤️', '👀', '😄'].includes(emoji)) {
        return fail('Invalid reaction.');
      }

      const existing = await db(table, {
        filters: {
          ...filters,
          user_id: 'eq.' + me.id,
          emoji: 'eq.' + emoji
        },
        limit: 1
      });

      if (existing.length) {
        await db(table, {
          method: 'DELETE',
          filters: { id: 'eq.' + existing[0].id }
        });

        return json({ removed: true });
      }

      return json((await db(table, {
        method: 'POST',
        body: {
          tracker_id: id,
          entry_id: entryId,
          user_id: me.id,
          display_name: me.name,
          emoji
        }
      }))[0], 201);
    }

    // Shared savings goals
    if (feature === 'goals') {
      const title = clean(body.title, 100);
      const target = Number(body.target);

      if (
        !title ||
        !Number.isFinite(target) ||
        target <= 0 ||
        target > 100000000
      ) {
        return fail('Enter a valid goal and target.');
      }

      return json((await db(table, {
        method: 'POST',
        body: {
          tracker_id: id,
          created_by: me.id,
          title,
          target_amount: Math.round(target * 100) / 100
        }
      }))[0], 201);
    }

    // Savings goal contributions
    if (feature === 'contributions') {
      const amount = Number(body.amount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 100000000
      ) {
        return fail('Enter a valid contribution.');
      }

      return json((await db(table, {
        method: 'POST',
        body: {
          tracker_id: id,
          goal_id: entryId,
          user_id: me.id,
          display_name: me.name,
          amount: Math.round(amount * 100) / 100,
          note: clean(body.note, 200)
        }
      }))[0], 201);
    }

    // Open a payment dispute
    if (feature === 'disputes') {
      const entry = (await db('tracker_entries', {
        filters: {
          id: 'eq.' + entryId,
          tracker_id: 'eq.' + id
        },
        limit: 1
      }))[0];

      if (entry.type !== 'payment') {
        return fail(
          'Disputes in this center apply to payments.',
          400
        );
      }

      const people = await sqPaymentParticipants(entry);

      if (
        !people ||
        ![people.fromId, people.toId].includes(me.id)
      ) {
        return fail(
          'Only verified payment participants can open disputes.',
          403
        );
      }

      const reason = clean(body.reason, 1200);

      if (!reason) {
        return fail('Enter a reason.');
      }

      const existing = await db(table, {
        filters,
        limit: 1
      });

      if (existing.length) {
        return fail(
          'A dispute already exists for this payment.',
          409
        );
      }

      return json((await db(table, {
        method: 'POST',
        body: {
          tracker_id: id,
          entry_id: entryId,
          opened_by: me.id,
          reason,
          status: 'open',
          approvals: []
        }
      }))[0], 201);
    }

    // Expense file attachments
    if (feature === 'attachments') {
      const filename = clean(body.filename, 120);
      const mime = String(body.mime || '');
      const base64 = String(body.base64 || '');

      if (
        ![
          'image/png',
          'image/jpeg',
          'image/webp',
          'application/pdf'
        ].includes(mime) ||
        base64.length > 1400000 ||
        !base64
      ) {
        return fail(
          'Use a PNG, JPG, WebP, or PDF under 1 MB.'
        );
      }

      let bytes;

      try {
        bytes = Uint8Array.from(
          atob(base64),
          c => c.charCodeAt(0)
        );
      } catch {
        return fail('Invalid attachment.');
      }

      if (bytes.length > 1024 * 1024) {
        return fail('File too large.');
      }

      const realMime = mime === 'application/pdf'
        ? bytes[0] === 37 &&
          bytes[1] === 80 &&
          bytes[2] === 68 &&
          bytes[3] === 70
        : kind(bytes) === mime;

      if (!realMime) {
        return fail(
          'File content does not match its type.'
        );
      }

      const path =
        id + '/' + entryId + '/' + crypto.randomUUID();

      await storage(
        'squareup-expense-attachments',
        path,
        'POST',
        bytes,
        mime
      );

      try {
        return json((await db(table, {
          method: 'POST',
          body: {
            tracker_id: id,
            entry_id: entryId,
            user_id: me.id,
            display_name: me.name,
            filename: filename || 'Attachment',
            mime_type: mime,
            storage_path: path
          }
        }))[0], 201);
      } catch (e) {
        await storage(
          'squareup-expense-attachments',
          path,
          'DELETE'
        ).catch(() => {});

        throw e;
      }
    }
  }

  // Both payment participants must approve resolution.
  if (
    feature === 'disputes' &&
    method === 'PATCH' &&
    parts[5] === 'agree'
  ) {
    const rows = await db(table, {
      filters,
      limit: 1
    });

    const dispute = rows[0];

    if (!dispute) {
      return fail('Dispute not found.', 404);
    }

    if (dispute.status === 'resolved') {
      return json(dispute);
    }

    const entry = (await db('tracker_entries', {
      filters: {
        id: 'eq.' + entryId,
        tracker_id: 'eq.' + id
      },
      limit: 1
    }))[0];

    const people = await sqPaymentParticipants(entry);

    if (
      !people ||
      ![people.fromId, people.toId].includes(me.id)
    ) {
      return fail(
        'Only the two verified payment participants can agree.',
        403
      );
    }

    const { fromId, toId } = people;

    const rpc = await fetch(
      URL_BASE + '/rest/v1/rpc/squareup_approve_dispute',
      {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_dispute_id: dispute.id,
          p_actor_id: me.id,
          p_from_id: fromId,
          p_to_id: toId
        })
      }
    );

    const result = await rpc.json().catch(() => null);

    if (!rpc.ok) {
      return fail(
        result?.message || 'Could not record approval.',
        409
      );
    }

    return json(result);
  }

  return fail('Method not allowed.', 405);
}

  
async function requiresExpenseApproval() {
  const rows = await db('squareup_tracker_settings', {
    filters: {
      tracker_id: 'eq.' + id
    },
    limit: 1
  });

  return rows.length
    ? rows[0].require_expense_approval !== false
    : true;
}

if (sub === 'expense-approval-settings' && parts.length === 3) {
  if (method === 'GET') {
    return json({
      requireExpenseApproval: await requiresExpenseApproval()
    });
  }

  if (method === 'PATCH') {
    if (!owner) {
      return fail(
        'Only the tracker owner can change expense approval settings.',
        403
      );
    }

    if (typeof body.requireExpenseApproval !== 'boolean') {
      return fail(
        'Choose whether expense approval is required.',
        400
      );
    }

    const existing = await db('squareup_tracker_settings', {
      filters: {
        tracker_id: 'eq.' + id
      },
      limit: 1
    });

    await db('squareup_tracker_settings', existing.length ? {
      method: 'PATCH',
      filters: {
        tracker_id: 'eq.' + id
      },
      body: {
        require_expense_approval: body.requireExpenseApproval
      }
    } : {
      method: 'POST',
      body: {
        tracker_id: id,
        require_expense_approval: body.requireExpenseApproval
      }
    });

    return json({
      requireExpenseApproval: body.requireExpenseApproval
    });
  }

  return fail('Method not allowed', 405);
}


// =============================================
// TRACKER PERMISSIONS
// =============================================

const PERMISSION_KEYS = [
  'add_expenses',
  'edit_own_expenses',
  'edit_all_expenses',
  'log_payments',
  'delete_expenses',
  'manage_members',
  'change_settings'
];

const ROLE_DEFAULTS = {
  editor: {
    add_expenses: true,
    edit_own_expenses: true,
    edit_all_expenses: false,
    log_payments: true,
    delete_expenses: false,
    manage_members: false,
    change_settings: false
  },

  viewer: {
    add_expenses: false,
    edit_own_expenses: false,
    edit_all_expenses: false,
    log_payments: false,
    delete_expenses: false,
    manage_members: false,
    change_settings: false
  }
};

// Load a member's saved permissions.
async function getPermissions(userId) {
 if (
  String(trackerOwnerRecord?.owner_id).toLowerCase() ===
  String(userId).toLowerCase() ||
  (
    String(m?.user_id).toLowerCase() ===
    String(userId).toLowerCase() &&
    m?.role === 'owner'
  )
) {
  return {
    role: 'owner',
    permissions: Object.fromEntries(
      PERMISSION_KEYS.map(key => [key, true])
    )
  };
}
  const membership = (await db('tracker_members', {
    filters: {
      tracker_id: 'eq.' + id,
      user_id: 'eq.' + userId
    },
    limit: 1
  }))[0];

  if (!membership) return null;

  const saved = (await db('squareup_tracker_permissions', {
    filters: {
      tracker_id: 'eq.' + id,
      user_id: 'eq.' + userId
    },
    limit: 1
  }))[0];

  const role =
    saved?.role === 'viewer' ||
    (!saved && membership.role === 'viewer')
      ? 'viewer'
      : 'editor';

  const permissions = {
    ...ROLE_DEFAULTS[role]
  };

  for (const key of PERMISSION_KEYS) {
    if (typeof saved?.[key] === 'boolean') {
      permissions[key] = saved[key];
    }
  }

  return { role, permissions };
}

// Load the signed-in user's permissions once.
const myPermissions = await getPermissions(me.id);

// Check access before performing an action.
function can(permission) {
  if (owner) return true;

  return myPermissions?.permissions?.[permission] === true;
}


/*
  SQUAREUP NEW FEATURES BACKEND

  Supports:
  - Subscription & Bill Manager
  - Trip Mode planning
  - Shared receipt references

  Requires the Supabase tables:
  - squareup_bills
  - squareup_trips
  - squareup_receipt_refs

  Uses existing:
  - Supabase authentication
  - Tracker membership verification
  - db() database helper
  - can() permission helper
  - owner, me, id, parts, method, body
*/

if (['bills', 'trips', 'vault'].includes(sub)) {

  const tables = {
    bills: 'squareup_bills',
    trips: 'squareup_trips',
    vault: 'squareup_receipt_refs'
  };

  const table = tables[sub];
  const recordId = parts[3];

  // Validate record IDs
  if (
    parts.length > 4 ||
    (recordId && !uuid.test(recordId))
  ) {
    return fail('Invalid record ID.', 400);
  }

  // GET: Load saved records
  if (method === 'GET' && !recordId) {

    const records = await db(table, {
      filters: {
        tracker_id: 'eq.' + id
      },
      order: 'created_at.desc',
      limit: 200
    });

    return json(records);
  }

  // POST: Create new record
  if (method === 'POST' && !recordId) {

    if (!can('add_expenses')) {
      return fail(
        'You cannot add records to this tracker.',
        403
      );
    }

    // Date validation
    const date = value =>
      /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
      !Number.isNaN(
        Date.parse(value + 'T12:00:00Z')
      )
        ? value
        : null;

    // Amount validation
    const amount = value =>
      value === '' || value == null
        ? null
        : Number(value);

    let record = {
      tracker_id: id,
      created_by: me.id
    };

    
if (sub === 'bills') {
  const name = clean(body.name, 90);
  const due = date(body.due);
  const value = amount(body.amount);
  const frequency = String(body.frequency || '');

  if (
    !name ||
    !due ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1e9 ||
    !['weekly', 'monthly', 'yearly'].includes(frequency)
  ) {
    return fail('Invalid bill information.', 400);
  }

  const enabled = body.recurring_enabled === true;
  const kind = String(body.kind || 'bill');
  const icon = clean(body.icon, 30) || 'other';

  if (!['bill', 'subscription'].includes(kind)) {
    return fail('Invalid bill type.', 400);
  }

  let payerId = null;
  let shares = [];
  let splitMode = null;

  if (enabled) {
    payerId = String(body.payer_id || '');
    splitMode = String(body.split_mode || '');

    if (
      !uuid.test(payerId) ||
      !['single', 'equal', 'custom'].includes(splitMode)
    ) {
      return fail('Invalid bill assignment.', 400);
    }

    const members = await db('tracker_members', {
      filters: { tracker_id: 'eq.' + id }
    });

    if (!members.some(x => x.user_id === payerId)) {
      return fail('Payer must belong to the tracker.', 400);
    }

    shares = Array.isArray(body.shares) ? body.shares : [];

    if (
      !shares.length ||
      shares.length > 100 ||
      (splitMode === 'single' && shares.length !== 1)
    ) {
      return fail('Choose valid bill recipients.', 400);
    }

    const used = new Set();
    let cents = 0;

   
for (const x of shares) {
  if (
    !uuid.test(x?.user_id) ||
    used.has(x.user_id) ||
    !members.some(m => m.user_id === x.user_id) ||
    !Number.isSafeInteger(x.amount_cents) ||
    x.amount_cents < 0
  ) {
    return fail('Invalid bill split.', 400);
  }

  used.add(x.user_id);
  cents += x.amount_cents;
}


    if (cents !== Math.round(value * 100)) {
      return fail('Bill shares must equal the full amount.', 400);
    }
  }

  record = {
    ...record,
    name,
    due,
    amount: Math.round(value * 100) / 100,
    frequency,
    kind,
    icon,
    recurring_enabled: enabled,
    active: true,
    payer_id: payerId,
    split_mode: splitMode,
    shares
  };
}


    // TRIP MODE
    else if (sub === 'trips') {

      const name = clean(body.name, 90);

      if (
        !name ||
        (body.date && !date(body.date))
      ) {
        return fail(
          'Invalid trip.',
          400
        );
      }

      record = {
        ...record,
        name,
        date: date(body.date)
      };
    }

    // RECEIPT VAULT REFERENCES
    else {

      const merchant = clean(
        body.merchant,
        100
      );

      const value = amount(body.amount);

      if (
        !merchant ||
        (
          value !== null &&
          (
            !Number.isFinite(value) ||
            value < 0 ||
            value > 1e9
          )
        ) ||
        (
          body.date &&
          !date(body.date)
        )
      ) {
        return fail(
          'Invalid receipt reference.',
          400
        );
      }

      record = {
        ...record,
        merchant,
        amount:
          value === null
            ? null
            : Math.round(value * 100) / 100,
        date: date(body.date),
        note: clean(body.note, 200)
      };
    }

    // Save record to Supabase
    const saved = await db(table, {
      method: 'POST',
      body: record
    });

    return json(saved[0], 201);
  }

  // DELETE: Remove existing record
  if (method === 'DELETE' && recordId) {

    const existing = (
      await db(table, {
        filters: {
          tracker_id: 'eq.' + id,
          id: 'eq.' + recordId
        },
        limit: 1
      })
    )[0];

    if (!existing) {
      return fail(
        'Record not found.',
        404
      );
    }

    // Only creator or tracker owner can delete
    if (
      !owner &&
      existing.created_by !== me.id
    ) {
      return fail(
        'Only the creator or tracker owner can remove this record.',
        403
      );
    }

    await db(table, {
      method: 'DELETE',
      filters: {
        tracker_id: 'eq.' + id,
        id: 'eq.' + recordId
      }
    });

    return json({
      ok: true
    });
  }

  return fail(
    'Method not allowed.',
    405
  );
}

    
// =============================================
// GET TRACKER MEMBER PERMISSIONS
// =============================================

if (
  sub === 'permissions' &&
  parts.length === 3 &&
  method === 'GET'
) {
  const members = await db('tracker_members', {
    filters: {
      tracker_id: 'eq.' + id
    }
  });

  const memberList = await Promise.all(
    members.map(async member => {
      const settings = await getPermissions(
        member.user_id
      );

      return {
        id: member.user_id,
        name: member.name || 'Member',
        email: member.email || '',
        role: settings?.role || 'editor',
        permissions: settings?.permissions || {}
      };
    })
  );

  // Include legacy owners without a membership row.
  if (
    owner &&
    !memberList.some(member => member.id === me.id)
  ) {
    memberList.unshift({
      id: me.id,
      name: me.name,
      email: me.email,
      role: 'owner',
      permissions: Object.fromEntries(
        PERMISSION_KEYS.map(key => [key, true])
      )
    });
  }

  return json({
    owner,
    members: memberList
  });
}


// =============================================
// UPDATE TRACKER MEMBER PERMISSIONS
// =============================================

if (
  sub === 'permissions' &&
  parts.length === 4 &&
  method === 'PATCH'
) {
  if (!owner) {
    return fail(
      'Only the tracker owner can change permissions.',
      403
    );
  }

  const targetId = parts[3];

  if (!uuid.test(targetId)) {
    return fail('Invalid member ID.', 400);
  }

  if (
    String(targetId).toLowerCase() ===
    String(trackerOwnerRecord.owner_id).toLowerCase()
  ) {
    return fail(
      'Owner permissions cannot be changed.',
      403
    );
  }

  const membership = (await db('tracker_members', {
    filters: {
      tracker_id: 'eq.' + id,
      user_id: 'eq.' + targetId
    },
    limit: 1
  }))[0];

  if (!membership) {
    return fail('Member not found.', 404);
  }

  if (membership.role === 'owner') {
    return fail(
      'Owner permissions cannot be changed.',
      403
    );
  }

  const newRole = String(body.role || '').toLowerCase();

  if (!['editor', 'viewer'].includes(newRole)) {
    return fail('Invalid role.', 400);
  }

  const submitted = body.permissions;

  if (
    !submitted ||
    typeof submitted !== 'object' ||
    Array.isArray(submitted)
  ) {
    return fail('Invalid permissions.', 400);
  }

  const changes = {
    tracker_id: id,
    user_id: targetId,
    role: newRole
  };

  for (const key of PERMISSION_KEYS) {
    if (typeof submitted[key] !== 'boolean') {
      return fail(
        'Invalid value for ' + key,
        400
      );
    }

    changes[key] = submitted[key];
  }

  const existing = await db(
    'squareup_tracker_permissions',
    {
      filters: {
        tracker_id: 'eq.' + id,
        user_id: 'eq.' + targetId
      },
      limit: 1
    }
  );

  if (existing.length) {
    await db('squareup_tracker_permissions', {
      method: 'PATCH',
      filters: {
        tracker_id: 'eq.' + id,
        user_id: 'eq.' + targetId
      },
      body: changes
    });
  } else {
    await db('squareup_tracker_permissions', {
      method: 'POST',
      body: changes
    });
  }

  return json({
    ok: true,
    role: newRole,
    permissions: submitted
  });
}
    
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
  if (!can('change_settings')) {
    return fail(
      'You do not have permission to change tracker settings.',
      403
    );
  }

  const patch = {};
        
if (body.name !== undefined) {
  if (!owner) {
    return fail(
      'Only the tracker owner can rename this tracker.',
      403
    );
  }

  patch.name = clean(body.name, 80);

  if (!patch.name) {
    return fail(
      'Give the tracker a name.',
      400
    );
  }
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
          await db('squareup_tracker_permissions', {
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
    if (!can('change_settings')) {
    return fail(
      'You do not have permission to change the group budget.',
      403
    );
  }
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

    if (
  method === 'DELETE' &&
  uuid.test(parts[3] || '')
) {
  const schedule = (await db('squareup_recurring_expenses', {
    filters: {
      tracker_id: 'eq.' + id,
      id: 'eq.' + parts[3]
    },
    limit: 1
  }))[0];

  if (!schedule) {
    return fail('Recurring expense not found.', 404);
  }

  if (
    !can('edit_all_expenses') &&
    !can('delete_expenses') &&
    !(
      can('edit_own_expenses') &&
      String(schedule.created_by).toLowerCase() ===
      String(me.id).toLowerCase()
    )
  ) {
    return fail(
      'You cannot change this recurring expense.',
      403
    );
  }

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

      if (
  !can('edit_all_expenses') &&
  !can('edit_own_expenses')
) {
  return fail(
    'You do not have permission to pin expenses.',
    403
  );
}

      const e = (await db('tracker_entries', {
        filters: {
          tracker_id: 'eq.' + id,
          id: 'eq.' + parts[3]
        }
      }))[0];

      if (!e)
        return fail('Expense not found', 404);

      
if (
  !can('edit_all_expenses') &&
  (
    !can('edit_own_expenses') ||
    String(e.created_by).toLowerCase() !==
      String(me.id).toLowerCase()
  )
) {
  return fail(
    'You do not have permission to pin this expense.',
    403
  );
}

      
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

          const requiredPermission =
    e.type === 'payment'
      ? 'log_payments'
      : 'add_expenses';

  if (!can(requiredPermission)) {
    return fail(
      e.type === 'payment'
        ? 'You do not have permission to log payments.'
        : 'You do not have permission to add expenses.',
      403
    );
  }
        
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
    debtor.user_id !== me.id &&
    await requiresExpenseApproval()
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

if (
  sub === 'entries' &&
  parts.length === 4 &&
  method === 'DELETE'
) {
  
  if (!can('delete_expenses')) {
    return fail(
      'You do not have permission to delete expenses.',
      403
    );
  }

// Require a valid entry ID before deleting anything.
const entryId = String(parts[3] || '');

if (!uuid.test(entryId)) {
  return fail('Invalid entry ID.', 400);
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

      if (!can('manage_members')) {
  return fail(
    'You do not have permission to invite members.',
    403
  );
}

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

// CHANGE TRACKER MEMBER ROLE
// Keeps the older role-changing interface compatible.

if (
  sub === 'members' &&
  parts.length === 5 &&
  parts[4] === 'role' &&
  method === 'PATCH'
) {
  if (!owner) {
    return fail('Only the owner can change roles.', 403);
  }

  const targetId = parts[3];
  const newRole = String(body.role || '').toLowerCase();

  if (!uuid.test(targetId)) {
    return fail('Invalid member ID.', 400);
  }

  if (!['editor', 'viewer'].includes(newRole)) {
    return fail('Choose Editor or Viewer.', 400);
  }

  if (
    targetId.toLowerCase() ===
    String(trackerOwnerRecord?.owner_id).toLowerCase()
  ) {
    return fail('The owner role cannot be changed.', 403);
  }

  const target = (await db('tracker_members', {
    filters: {
      tracker_id: 'eq.' + id,
      user_id: 'eq.' + targetId
    },
    limit: 1
  }))[0];

  if (!target) {
    return fail('Member not found.', 404);
  }

  if (target.role === 'owner') {
    return fail('The owner role cannot be changed.', 403);
  }

  const changes = {
    tracker_id: id,
    user_id: targetId,
    role: newRole,
    ...ROLE_DEFAULTS[newRole]
  };

  const saved = await db('squareup_tracker_permissions', {
    filters: {
      tracker_id: 'eq.' + id,
      user_id: 'eq.' + targetId
    },
    limit: 1
  });

  if (saved.length) {
    await db('squareup_tracker_permissions', {
      method: 'PATCH',
      filters: {
        tracker_id: 'eq.' + id,
        user_id: 'eq.' + targetId
      },
      body: changes
    });
  } else {
    await db('squareup_tracker_permissions', {
      method: 'POST',
      body: changes
    });
  }

  return json(await detail(id));
}
    
    // REMOVE TRACKER MEMBER
    if (sub === 'members' &&
        parts[3] &&
        method === 'DELETE') {

     if (!can('manage_members')) {
  return fail(
    'You do not have permission to remove members.',
    403
  );
}
     const targetId = parts[3];

if (!uuid.test(targetId)) {
  return fail('Invalid member ID.', 400);
}

if (
  targetId.toLowerCase() ===
  String(trackerOwnerRecord?.owner_id).toLowerCase()
) {
  return fail(
    'The tracker owner cannot be removed.',
    403
  );
}

const targetMember = (await db('tracker_members', {
  filters: {
    tracker_id: 'eq.' + id,
    user_id: 'eq.' + targetId
  },
  limit: 1
}))[0];

if (!targetMember) {
  return fail('Member not found.', 404);
}

if (targetMember.role === 'owner') {
  return fail(
    'The tracker owner cannot be removed.',
    403
  );
}

if (targetId === me.id) {
  return fail(
    'You cannot remove yourself using this action.',
    400
  );
}

      await db('tracker_members', {
        method: 'DELETE',
        filters: {
          tracker_id: 'eq.' + id,
          user_id: 'eq.' + parts[3]
        }
      });

      await db('squareup_tracker_permissions', {
  method: 'DELETE',
  filters: {
    tracker_id: 'eq.' + id,
    user_id: 'eq.' + targetId
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
          if (!can('change_settings')) {
    return fail(
      'You do not have permission to change the tracker backdrop.',
      403
    );
  }
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
