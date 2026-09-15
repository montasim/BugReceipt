import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDocumentStartMatch,
  registerDocumentStartRecorder,
  unregisterDocumentStartRecorder,
} from '../src/infrastructure/document-start-recorder';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('document-start recorder registration', () => {
  it('creates an origin-scoped match pattern without broad host access', () => {
    expect(getDocumentStartMatch('https://ispcine.netlify.app/watch?id=42')).toBe(
      'https://ispcine.netlify.app/*',
    );
    expect(getDocumentStartMatch('chrome://extensions')).toBeNull();
  });

  it('registers the main-world recorder before page scripts run', async () => {
    const registerContentScripts = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      scripting: {
        getRegisteredContentScripts: vi.fn().mockResolvedValue([]),
        registerContentScripts,
      },
    });

    await registerDocumentStartRecorder('https://ispcine.netlify.app');

    expect(registerContentScripts).toHaveBeenCalledWith([
      expect.objectContaining({
        js: ['content-scripts/capture-recorder.js'],
        matches: ['https://ispcine.netlify.app/*'],
        runAt: 'document_start',
        world: 'MAIN',
      }),
    ]);
  });

  it('removes the recorder registration when capture ends', async () => {
    const unregisterContentScripts = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      scripting: {
        getRegisteredContentScripts: vi.fn().mockResolvedValue([{ id: 'existing' }]),
        unregisterContentScripts,
      },
    });

    await unregisterDocumentStartRecorder();

    expect(unregisterContentScripts).toHaveBeenCalledOnce();
  });
});
