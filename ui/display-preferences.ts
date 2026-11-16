export type Density = 'comfortable' | 'compact' | 'spacious';
export type TextScale = 'normal' | 'large';
export type DisplayPrefs = { density: Density; textScale: TextScale; reduceMotion: boolean; highContrast: boolean };

export const DEFAULT_PREFS: DisplayPrefs = { density: 'comfortable', textScale: 'normal', reduceMotion: false, highContrast: false };

const KEYS = { density: 'pulse.uiDensity', textScale: 'pulse.uiTextScale', reduceMotion: 'pulse.uiReduceMotion', highContrast: 'pulse.uiContrast' } as const;
const DENSITIES: readonly Density[] = ['comfortable', 'compact', 'spacious'];
const SCALES: readonly TextScale[] = ['normal', 'large'];

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };

export function readDisplayPrefs(): DisplayPrefs {
  const density = read(KEYS.density) as Density | null;
  const textScale = read(KEYS.textScale) as TextScale | null;
  return {
    density: density && DENSITIES.includes(density) ? density : DEFAULT_PREFS.density,
    textScale: textScale && SCALES.includes(textScale) ? textScale : DEFAULT_PREFS.textScale,
    reduceMotion: read(KEYS.reduceMotion) === '1',
    highContrast: read(KEYS.highContrast) === '1',
  };
}

export function applyDisplayPrefs(prefs: DisplayPrefs, root: HTMLElement = document.documentElement): void {
  root.dataset.settingsDensity = prefs.density;
  root.dataset.settingsTextScale = prefs.textScale;
  root.dataset.settingsMotion = prefs.reduceMotion ? 'reduced' : 'full';
  root.dataset.settingsContrast = prefs.highContrast ? 'high' : 'normal';
}

/** false, если браузер не дал записать: вызывающий обязан сообщить об этом. */
export function saveDisplayPrefs(prefs: DisplayPrefs): boolean {
  try {
    localStorage.setItem(KEYS.density, prefs.density);
    localStorage.setItem(KEYS.textScale, prefs.textScale);
    localStorage.setItem(KEYS.reduceMotion, prefs.reduceMotion ? '1' : '0');
    localStorage.setItem(KEYS.highContrast, prefs.highContrast ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}
