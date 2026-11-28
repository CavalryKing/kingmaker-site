// Fetch wrapper for /api. Every state-changing call carries X-KM-Admin (see worker index.ts).

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(method, path, data) {
  const opts = { method, headers: { 'X-KM-Admin': '1' }, credentials: 'same-origin' };
  if (data !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);
  }
  let res;
  try { res = await fetch('/api' + path, opts); }
  catch { throw new ApiError(0, { error: 'No connection. Check your internet and try again.' }); }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login') { onUnauthorized(); }
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

export const get = (p) => api('GET', p);
export const post = (p, d = {}) => api('POST', p, d);
export const put = (p, d = {}) => api('PUT', p, d);
export const del = (p) => api('DELETE', p);
