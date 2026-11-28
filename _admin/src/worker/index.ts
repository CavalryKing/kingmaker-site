// Worker entry. Static app shell comes from ASSETS; /api/* runs here first
// (run_worker_first in wrangler.jsonc).
//
// Two locks on the API:
//   1. Cloudflare Access (checked here too when ACCESS_TEAM_DOMAIN + ACCESS_AUD are set)
//   2. The admin password -> signed HttpOnly cookie (auth.ts, same as the jnluxe admin)

import { accessEnabled, accessOk } from './access.ts';
import { handleApi } from './api.ts';
import { isAuthed, login, logout } from './auth.ts';
import { exportAll, importAll } from './backup.ts';
import { handlePublish } from './publish.ts';
import { json } from './util.ts';

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      if (!(await accessOk(request, env))) return json({ error: 'access_denied' }, { status: 403 });

      // State-changing calls must carry our header. Browsers won't send a custom header
      // cross-site without a CORS preflight, which this API never answers (on top of SameSite=Strict).
      if (request.method !== 'GET' && request.headers.get('X-KM-Admin') !== '1')
        return json({ error: 'Missing X-KM-Admin header' }, { status: 400 });

      if (pathname === '/api/login' && request.method === 'POST') return await login(request, env);
      if (pathname === '/api/logout' && request.method === 'POST') return logout();

      const authed = await isAuthed(request, env);
      if (pathname === '/api/session') return json({ authed, access: accessEnabled(env) });
      if (!authed) return json({ error: 'unauthorized' }, { status: 401 });

      if (pathname === '/api/export' && request.method === 'GET') return await exportAll(env);
      if (pathname === '/api/import' && request.method === 'POST') return await importAll(request, env);
      if (pathname.startsWith('/api/publish')) return await handlePublish(request, env, url);

      const res = await handleApi(request, env, url);
      return res ?? json({ error: 'not_found' }, { status: 404 });
    } catch (e) {
      console.error(JSON.stringify({ evt: 'api_error', path: pathname, error: String((e as Error)?.stack ?? e) }));
      return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
