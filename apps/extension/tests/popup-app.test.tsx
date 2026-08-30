import type { CaptureSession, RuntimeRequest, RuntimeResponse } from '@bugreceipt/capture-model';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendRuntimeMessage } from '../src/application/protocol';
import { OFFENSIVE_LANGUAGE_ERROR } from '../src/application/content-moderation';
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
const createTab = vi.fn().mockResolvedValue(undefined);
const setBadgeText = vi.fn().mockResolvedValue(undefined);
const closeSidePanel = vi.fn().mockResolvedValue(undefined);
const queryTabs = vi.fn().mockResolvedValue([{ id: 9, url: 'https://example.com/dashboard' }]);
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
      query: queryTabs,
      create: createTab,
      update: updateTab,
      onActivated: tabActivated,
    },
    action: { setBadgeText },
    runtime: {
      getURL: (path: string) => `chrome-extension://bugreceipt${path}`,
      getManifest: () => ({ version: '0.1.4' }),
    },
    sidePanel: { close: closeSidePanel },
    windows: { update: updateWindow },
    permissions: { contains: containsPermission, request: requestPermission },
    desktopCapture: { chooseDesktopMedia },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

    const support = await screen.findByRole('link', { name: 'Support BugReceipt on SupportKori' });
    expect(support.getAttribute('href')).toBe('https://www.supportkori.com/montasim');
    expect(support.getAttribute('target')).toBe('_blank');
    expect(screen.getByLabelText('BugReceipt version 0.1.4')).toBeDefined();
    expect(screen.getByText('v0.1.4')).toBeDefined();
  });

  it('accepts a multiline manual step in a textarea', async () => {
    queryTabs.mockResolvedValueOnce([{ id: session.tabId, url: session.origin }]);
    render(<PopupApp />);

    const step = await screen.findByLabelText<HTMLTextAreaElement>('What did you do?');
    expect(step.tagName).toBe('TEXTAREA');
    expect(step.getAttribute('rows')).toBe('3');

    fireEvent.change(step, { target: { value: 'Opened settings\nChanged the plan' } });
    expect(screen.getByText('32/1,000')).toBeDefined();
    fireEvent.keyDown(step, { key: 'Enter', ctrlKey: true });

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith({
        type: 'session:add-step',
        text: 'Opened settings\nChanged the plan',
      }),
    );
  });

  it('shows offensive-language feedback while typing and blocks the step action', async () => {
    queryTabs.mockResolvedValueOnce([{ id: session.tabId, url: session.origin }]);
    render(<PopupApp />);

    const step = await screen.findByLabelText<HTMLTextAreaElement>('What did you do?');
    fireEvent.change(step, { target: { value: 'This fucking form is broken' } });
    fireEvent.keyDown(step, { key: 'Enter', ctrlKey: true });

    expect(await screen.findByText(OFFENSIVE_LANGUAGE_ERROR)).toBeDefined();
    expect(step.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Add step' }).disabled).toBe(true);
    expect(send.mock.calls.some(([request]) => request.type === 'session:add-step')).toBe(false);
  });

  it('shows elapsed recording time from the persisted capture start', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-27T12:00:08.900Z'));
    const schedule = vi.spyOn(window, 'setInterval');
    render(<PopupApp />);

    const timer = await screen.findByRole('timer', { name: 'Recording duration' });
    await waitFor(() => expect(timer.textContent).toBe('00:08'));
    expect(timer.getAttribute('datetime')).toBe('PT8S');

    const tick = schedule.mock.calls.find(([, delay]) => delay === 1_000)?.[0];
    expect(typeof tick).toBe('function');
    now.mockReturnValue(Date.parse('2026-08-27T12:00:09.900Z'));
    act(() => {
      if (typeof tick === 'function') tick();
    });
    expect(timer.textContent).toBe('00:09');
  });

  it('does not open a duplicate review after the background stops the recording', async () => {
    queryTabs.mockResolvedValueOnce([{ id: session.tabId, url: session.origin }]);
    const readySession: CaptureSession = {
      ...session,
      status: 'ready-for-review',
      stoppedAt: '2026-08-27T12:00:10.000Z',
    };
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session });
      if (request.type === 'session:stop') {
        return Promise.resolve({ ok: true, session: readySession });
      }
      return Promise.resolve({ ok: true });
    });
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Stop & review' }));

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith({
        type: 'session:stop',
      }),
    );
    expect(createTab).not.toHaveBeenCalled();
    expect(closeSidePanel).not.toHaveBeenCalled();
  });

  it('closes the side panel when reopening a ready review', async () => {
    const readySession: CaptureSession = {
      ...session,
      status: 'ready-for-review',
      stoppedAt: '2026-08-27T12:00:10.000Z',
    };
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: readySession } : { ok: true },
      ),
    );
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open review' }));

    await waitFor(() =>
      expect(createTab).toHaveBeenCalledWith({
        url: 'chrome-extension://bugreceipt/review.html',
      }),
    );
    expect(closeSidePanel).toHaveBeenCalledWith({ windowId: session.windowId });
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
