// Web storage can throw (private mode, blocked storage); persistence is a convenience, never required.
type Area = 'local' | 'session';
const area = (where: Area): Storage => (where === 'local' ? localStorage : sessionStorage);

export function loadJson<T>(key: string, fallback: T, where: Area = 'local'): T {
  try {
    const raw = area(where).getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** The text stored under `key`, or null when there is none or storage is unavailable. */
export function loadText(key: string, where: Area = 'local'): string | null {
  try {
    return area(where).getItem(key);
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown, where: Area = 'local'): void {
  try {
    area(where).setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`could not persist '${key}':`, error);
  }
}
