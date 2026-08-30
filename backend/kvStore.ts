import { Redis } from '@upstash/redis';

const INCIDENTS_KEY = 'ems:incidents';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis !== null) return redis;
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
  if (url && token) {
    redis = new Redis({ url, token });
  }
  return redis;
}

export async function loadIncidents(): Promise<any[] | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const data = await r.get(INCIDENTS_KEY);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function saveIncidents(incidents: any[]): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(INCIDENTS_KEY, JSON.stringify(incidents));
  } catch (err) {
    console.error('Failed to save incidents to KV:', err);
  }
}

export function isKVAvailable(): boolean {
  return getRedis() !== null;
}
