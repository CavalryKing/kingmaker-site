// Publish prices to the public site. Filled in with the Catalogue module.
import { json } from './util.ts';

export async function handlePublish(_request: Request, _env: Env, _url: URL): Promise<Response> {
  return json({ error: 'not_ready' }, { status: 501 });
}
