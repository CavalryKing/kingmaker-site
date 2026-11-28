// Bindings from wrangler.jsonc (kept by hand; small enough not to need `wrangler types`).
interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  LOGIN_LIMITER: { limit(o: { key: string }): Promise<{ success: boolean }> };
  ADMIN_PASSWORD?: string;
  GITHUB_TOKEN?: string;
  SITE_REPO: string;
  SITE_BRANCH: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
}
