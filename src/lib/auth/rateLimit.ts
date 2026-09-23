// Rate limiting for the 4-digit-code sign-in route.
//
// In-memory and single-instance (fine for this deployment; move to a shared
// store like Redis if it is ever scaled horizontally). With only 10,000
// possible codes, throttling matters: 10 attempts per IP per minute, and a
// code locks for ~5 minutes after 5 failed attempts.

const IP_LIMIT = 10;
const IP_WINDOW_MS = 60_000;
const CODE_FAIL_LIMIT = 5;
const CODE_WINDOW_MS = 5 * 60_000;

const attempts = new Map<string, number[]>(); // "ip:<ip>" -> attempt times
const failures = new Map<string, number[]>(); // "code:<code>" -> failure times

function recent(list: number[] | undefined, now: number, windowMs: number): number[] {
  const cutoff = now - windowMs;
  return (list ?? []).filter((t) => t > cutoff);
}

function sweep(map: Map<string, number[]>, now: number) {
  // Keep memory bounded: periodically drop keys with no fresh entries.
  if (map.size < 4096) return;
  const cutoff = now - Math.max(IP_WINDOW_MS, CODE_WINDOW_MS);
  for (const [key, list] of map) {
    if (!list.some((t) => t > cutoff)) map.delete(key);
  }
}

/** Record a sign-in attempt. Returns false once the IP is throttled. */
export function allowIp(ip: string): boolean {
  const now = Date.now();
  const key = `ip:${ip}`;
  const list = recent(attempts.get(key), now, IP_WINDOW_MS);
  if (list.length >= IP_LIMIT) return false;
  list.push(now);
  attempts.set(key, list);
  sweep(attempts, now);
  return true;
}

/** Whether a code is locked out after too many failed attempts. */
export function isCodeLocked(code: string): boolean {
  const now = Date.now();
  return recent(failures.get(`code:${code}`), now, CODE_WINDOW_MS).length >= CODE_FAIL_LIMIT;
}

/** Record a failed attempt for a code. */
export function recordCodeFailure(code: string): void {
  const now = Date.now();
  const key = `code:${code}`;
  const list = recent(failures.get(key), now, CODE_WINDOW_MS);
  list.push(now);
  failures.set(key, list);
  sweep(failures, now);
}

/** Clear a code's failure history after a successful sign-in. */
export function clearCodeFailures(code: string): void {
  failures.delete(`code:${code}`);
}