import type { CaptureSession, RuntimeRequest, RuntimeResponse } from '@reprokit/capture-model';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendRuntimeMessage } from '../src/application/protocol';
import { startDesktopRecording } from '../src/infrastructure/desktop-recorder';
import { PopupApp } from '../src/ui/popup/popup-app';

vi.mock('../src/application/protocol', () => ({ sendRuntimeMessage: vi.fn() }));
vi.mock('../src/infrastructure/desktop-recorder', () => ({
  abortDesktopRecording: vi.fn().mockResolvedValue(undefined),
  startDesktopRecording: vi.fn().mockResolvedValue(undefined),
}));

const session: CaptureSession = {
  schemaVersion: 1,
  id: '00000000-0000-4000-8000-000000000000',
  status: 'recording',
  tabId: 7,
  windowId: 2,
  origin: 'https://example.com',
  startedAt: '2026-08-27T12:00:00.000Z',
  summary: 'Bug report',
  expectedBehavior: '',
  actualBehavior: '',
  steps: [],
  diagnostics: [],
  network: [],
  filtering: { redactionCount: 0, droppedEventCount: 0 },
};

const send = vi.mocked(sendRuntimeMessage);
const startRecording = vi.mocked(startDesktopRecording);
const updateTab = vi.fn().mockResolvedValue(undefined);
const updateWindow = vi.fn().mockResolvedValue(undefined);
const tabActivated = { addListener: vi.fn(), removeListener: vi.fn() };
const requestPermission = vi.fn().mockResolvedValue(true);
const containsPermission = vi.fn().mockResolvedValue(true);
const chooseDesktopMedia = vi
  .fn()
  .mockImplementation((_sources: string[], callback: (streamId: string) => void) => {
    callback('desktop-stream');
    return 1;
  });

beforeEach(() => {
  send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
    if (request.type === 'session:get') return Promise.resolve({ ok: true, session });
    return Promise.resolve({ ok: true });
  });
  vi.stubGlobal('chrome', {
    tabs: {
      query: () => Promise.resolve([{ id: 9, url: 'https://example.com/dashboard' }]),
      update: updateTab,
      onActivated: tabActivated,
    },
    windows: { update: updateWindow },
    permissions: { contains: containsPermission, request: requestPermission },
    desktopCapture: { chooseDesktopMedia },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function getSentStartRequest(): Extract<RuntimeRequest, { type: 'session:start' }> | undefined {
  return send.mock.calls
    .map(([request]) => request)
    .find(
      (request): request is Extract<RuntimeRequest, { type: 'session:start' }> =>
        request.type === 'session:start',
    );
}

describe('capture popup', () => {
  it('shows the white product header with a SupportKori action', async () => {
    render(<PopupApp />);

    const support = await screen.findByRole('link', { name: 'Support ReproKit on SupportKori' });
    expect(support.getAttribute('href')).toBe('https://www.supportkori.com/montasim');
    expect(support.getAttribute('target')).toBe('_blank');
    expect(screen.getByLabelText('ReproKit')).toBeDefined();
  });

  it('starts capture with the tab explicitly selected by the user', async () => {
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session: null });
      return Promise.resolve({ ok: true, session });
    });
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab & start' }));

    await waitFor(() => expect(getSentStartRequest()).toMatchObject({ tabId: 9 }));
    const startRequest = getSentStartRequest();
    expect(typeof startRequest?.sessionId).toBe('string');
    expect(startRecording).toHaveBeenCalledWith(startRequest?.sessionId, 'desktop-stream');
    expect(startRecording.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder.at(-1)!,
    );
    expect(chooseDesktopMedia).toHaveBeenCalledWith(['tab'], expect.any(Function));
    expect(containsPermission).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('grants site access before offering a fresh recording gesture', async () => {
    containsPermission.mockResolvedValueOnce(false);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session: null });
      return Promise.resolve({ ok: true, session });
    });
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Allow site access' }));

    await waitFor(() =>
      expect(requestPermission).toHaveBeenCalledWith({ origins: ['https://example.com/*'] }),
    );
    expect(send.mock.calls.some(([request]) => request.type === 'session:start')).toBe(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab & start' }));
    await waitFor(() => expect(getSentStartRequest()).toMatchObject({ tabId: 9 }));
  });

  it('does not start capture when the tab chooser is cancelled', async () => {
    chooseDesktopMedia.mockImplementationOnce(
      (_sources: string[], callback: (streamId: string) => void) => {
        callback('');
        return 1;
      },
    );
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session: null });
      return Promise.resolve({ ok: true, session });
    });
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab & start' }));

    expect(
      await screen.findByText('No tab was selected. Select a tab to start recording.'),
    ).toBeDefined();
    expect(send.mock.calls.some(([request]) => request.type === 'session:start')).toBe(false);
  });

  it('preserves the recorder failure reason in the screenshot fallback session', async () => {
    startRecording.mockRejectedValueOnce(new Error('Selected stream could not be opened.'));
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session: null });
      return Promise.resolve({ ok: true, session });
    });
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab & start' }));

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session:start',
          recordingError:
            'Selected stream could not be opened. A final screenshot will be captured instead.',
        }),
      ),
    );
  });

  it('does not start capture when site access is denied', async () => {
    containsPermission.mockResolvedValueOnce(false);
    requestPermission.mockResolvedValueOnce(false);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session: null });
      return Promise.resolve({ ok: true, session });
    });
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Allow site access' }));

    expect(await screen.findByText('Site access is required to capture this tab.')).toBeDefined();
    expect(send.mock.calls.some(([request]) => request.type === 'session:start')).toBe(false);
  });

  it('guides the user back when recording is active in another tab', async () => {
    render(<PopupApp />);

    await screen.findByText('Recording another tab');
    expect(screen.queryByLabelText('What did you do?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Return to recorded tab' }));

    await waitFor(() => expect(updateWindow).toHaveBeenCalledWith(2, { focused: true }));
    expect(updateTab).toHaveBeenCalledWith(7, { active: true });
  });
});
