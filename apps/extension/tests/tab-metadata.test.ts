import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTabWithMetadata, withTabMetadata } from '../src/infrastructure/tab-metadata';

afterEach(() => vi.unstubAllGlobals());

describe('tab metadata without tabs permission', () => {
  it('matches by tab ID even when another tab has the same URL', async () => {
    vi.stubGlobal('chrome', {
      tabs: { get: vi.fn().mockResolvedValue({ id: 7, windowId: 2, active: true }) },
      debugger: {
        getTargets: vi.fn().mockResolvedValue([
          { type: 'page', tabId: 8, url: 'https://example.com/', title: 'Wrong tab' },
          { type: 'page', tabId: 7, url: 'https://example.com/', title: 'Correct tab' },
        ]),
      },
    });
    expect(await getTabWithMetadata(7)).toEqual({
      id: 7,
      windowId: 2,
      active: true,
      url: 'https://example.com/',
      title: 'Correct tab',
    });
  });

  it('reads updated metadata after cross-origin navigation', async () => {
    const getTargets = vi
      .fn()
      .mockResolvedValueOnce([
        { type: 'page', tabId: 7, url: 'https://example.com/?q=1', title: 'Before' },
      ])
      .mockResolvedValueOnce([
        { type: 'page', tabId: 7, url: 'https://other.example/checkout', title: 'After' },
      ]);
    vi.stubGlobal('chrome', { debugger: { getTargets } });
    const tab = { id: 7 } as chrome.tabs.Tab;
    expect((await withTabMetadata(tab)).url).toBe('https://example.com/?q=1');
    expect((await withTabMetadata(tab)).title).toBe('After');
  });

  it('does not substitute another target when the selected tab is missing', async () => {
    vi.stubGlobal('chrome', {
      debugger: {
        getTargets: vi
          .fn()
          .mockResolvedValue([
            { type: 'page', tabId: 8, url: 'https://other.example/', title: 'Other' },
          ]),
      },
    });
    expect(await withTabMetadata({ id: 7 } as chrome.tabs.Tab)).toEqual({ id: 7 });
  });
});
