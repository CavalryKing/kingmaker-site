export const json = (data: unknown, init: ResponseInit = {}) =>
  Response.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init.headers ?? {}) } });

export const bad = (error: string, status = 400) => json({ error }, { status });

export const now = () => new Date().toISOString();

export const uid = () => crypto.randomUUID();

export const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const toInt = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : fallback;
};

export const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Parse a JSON body; null if it isn't an object. */
export async function body<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  const b = await request.json().catch(() => null);
  return b && typeof b === 'object' && !Array.isArray(b) ? (b as T) : null;
}
