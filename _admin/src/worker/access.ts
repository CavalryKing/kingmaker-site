// Cloudflare Access check (second lock, on top of the password).
// Access puts a signed JWT in Cf-Access-Jwt-Assertion on every request it lets through.
// When ACCESS_TEAM_DOMAIN and ACCESS_AUD are set, /api refuses anything without a valid one,
// so even a mistake in the Access dashboard can't open the API to the world.

type Jwk = JsonWebKey & { kid: string };
let certs: { at: number; keys: Jwk[] } | null = null;

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));

async function keys(team: string): Promise<Jwk[]> {
  if (certs && Date.now() - certs.at < 3600_000) return certs.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('access certs ' + res.status);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  certs = { at: Date.now(), keys };
  return keys;
}

export function accessEnabled(env: Env): boolean {
  return !!(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD);
}

export async function accessOk(request: Request, env: Env): Promise<boolean> {
  if (!accessEnabled(env)) return true;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return false;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const claims = JSON.parse(new TextDecoder().decode(b64url(p)));
    const jwk = (await keys(env.ACCESS_TEAM_DOMAIN)).find(k => k.kid === header.kid);
    if (!jwk || header.alg !== 'RS256') return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return false;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(env.ACCESS_AUD)) return false;
    if (!(claims.exp > Date.now() / 1000)) return false;
    if (claims.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return false;
    return true;
  } catch (e) {
    console.error(JSON.stringify({ evt: 'access_verify_error', error: String(e) }));
    return false;
  }
}
