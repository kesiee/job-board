// Simple in-memory TTL cache for server-side queries
const cache = new Map<string, { data: unknown; expires: number }>();

export function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expires > now) {
    return Promise.resolve(entry.data as T);
  }

  return fn().then((data) => {
    cache.set(key, { data, expires: now + ttlSeconds * 1000 });
    return data;
  });
}
