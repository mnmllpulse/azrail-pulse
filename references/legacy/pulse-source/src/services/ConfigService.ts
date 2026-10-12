// src/services/ConfigService.ts

export const ConfigService = {
  get: <T>(key: string, defaultValue: T): T => {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T;
    }
  },
  set: (key: string, value: any): void => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    // Future: Centralized cloud sync point
  }
};
