import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_KEY = 'bugreceipt:theme';

export function getSystemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export async function getStoredTheme(): Promise<Theme | null> {
  try {
    const value =
      typeof chrome !== 'undefined'
        ? (await chrome.storage?.local?.get(THEME_KEY))?.[THEME_KEY]
        : undefined;
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export async function resolveTheme(): Promise<Theme> {
  return (await getStoredTheme()) ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export async function initializeTheme(): Promise<Theme> {
  const theme = await resolveTheme();
  applyTheme(theme);
  return theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      const applied = document.documentElement.dataset.theme;
      if (applied === 'light' || applied === 'dark') return applied;
    }
    return getSystemTheme();
  });

  useEffect(() => {
    let disposed = false;
    void resolveTheme().then((resolved) => {
      if (disposed) return;
      setTheme(resolved);
      applyTheme(resolved);
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      const value = changes[THEME_KEY]?.newValue;
      if (area !== 'local' || (value !== 'light' && value !== 'dark')) return;
      setTheme(value);
      applyTheme(value);
    };
    const storageChanges = typeof chrome !== 'undefined' ? chrome.storage?.onChanged : undefined;
    storageChanges?.addListener(handleStorageChange);
    return () => {
      disposed = true;
      storageChanges?.removeListener(handleStorageChange);
    };
  }, []);

  async function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    try {
      if (typeof chrome !== 'undefined') {
        await chrome.storage?.local?.set({ [THEME_KEY]: next });
      }
    } catch {
      // The visual change still applies when storage is unavailable.
    }
  }

  return { theme, toggleTheme };
}
