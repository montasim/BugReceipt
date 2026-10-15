import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, getSystemTheme, getStoredTheme, THEME_KEY } from '../src/ui/theme';

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
});

describe('extension theme', () => {
  it('applies the theme to the document root', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('reads only valid stored themes', async () => {
    vi.stubGlobal('chrome', {
      storage: { local: { get: vi.fn().mockResolvedValue({ [THEME_KEY]: 'dark' }) } },
    });
    await expect(getStoredTheme()).resolves.toBe('dark');
  });

  it('falls back to dark when no light system preference is available', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    expect(getSystemTheme()).toBe('dark');
  });
});
