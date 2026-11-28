// Password login, same pattern as the jnluxe.com admin: one password (secret ADMIN_PASSWORD),
// then a signed HttpOnly cookie for 30 days. Changing the password logs every device out,
// because the cookie is signed with a key derived from it.

import { json } from './util.ts';

const COOKIE = 'km_admin';
const SESSION_SECONDS = 30 * 24 * 3600;
const MIN_PASSWORD_LEN = 12;

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode('km-admin-session:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

/** Constant-time string compare (via HMAC so lengths don't leak either). */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([hmac('cmp', a), hmac('cmp', b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function password(env: Env): string | null {
  const p = (env.ADMIN_PASSWORD ?? '').trim();
  return p.length >= MIN_PASSWORD_LEN ? p : null;
}

export async function isAuthed(request: Request, env: Env): Promise<boolean> {
  const pw = password(env);
  if (!pw) return false;
  const m = (request.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([0-9a-f]{64})`));
  if (!m) return false;
  const exp = Number(m[1]);
  if (!(exp > Date.now() / 1000)) return false;
  return safeEqual(m[2], await hmac(pw, String(exp)));
}

export async function login(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.LOGIN_LIMITER.limit({ key: ip });
  if (!success) return json({ error: 'Too many attempts. Wait a minute and try again.' }, { status: 429 });

  const pw = password(env);
  if (!pw) {
    const len = (env.ADMIN_PASSWORD ?? '').trim().length;
    console.error(JSON.stringify({ evt: 'admin_login_unconfigured', length: len }));
    return json({ error: len ? `The admin password is too short (needs ${MIN_PASSWORD_LEN}+ characters). Set a longer one with wrangler secret put ADMIN_PASSWORD.` : 'Admin password is not set up yet.' }, { status: 503 });
  }
  const body = await request.json().catch(() => ({})) as { password?: unknown };
  const given = typeof body.password === 'string' ? body.password.trim() : '';
  if (!(await safeEqual(given, pw))) {
    console.warn(JSON.stringify({ evt: 'admin_login_failed', ip }));
    return json({ error: 'Wrong password.' }, { status: 401 });
  }
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const secure = new URL(request.url).protocol === 'https:' ? ' Secure;' : '';
  const cookie = `${COOKIE}=${exp}.${await hmac(pw, String(exp))}; Path=/api; HttpOnly;${secure} SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
  console.log(JSON.stringify({ evt: 'admin_login', ip }));
  return json({ ok: true }, { headers: { 'Set-Cookie': cookie } });
}

export const logout = () =>
  json({ ok: true }, { headers: { 'Set-Cookie': `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0` } });
