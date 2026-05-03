const STORAGE_KEY = 'nebula:demoUserId';

export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return 'ssr-anon';
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = `demo-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return 'demo-anon';
  }
}

export function resetCurrentUserId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
