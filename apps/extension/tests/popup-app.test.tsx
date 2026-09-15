import type { CaptureSession, RuntimeRequest, RuntimeResponse } from '@bugreceipt/capture-model';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendRuntimeMessage } from '../src/application/protocol';
import { OFFENSIVE_LANGUAGE_ERROR } from '../src/application/content-moderation';
import { startDesktopRecording } from '../src/infrastructure/desktop-recorder';
import { SidePanelApp as PopupApp } from '../src/ui/sidepanel/sidepanel-app';

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
const getTargets = vi.fn().mockResolvedValue([]);
const tabActivated = { addListener: vi.fn(), removeListener: vi.fn() };
const chooseDesktopMedia = vi
  .fn()
  .mockImplementation((_sources: string[], callback: (streamId: string) => void) => {
    callback('desktop-stream');
    return 1;
  });

beforeEach(() => {
  startRecording.mockResolvedValue(undefined);
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
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    debugger: { getTargets },
    action: { setBadgeText },
    runtime: {
      getURL: (path: string) => `chrome-extension://bugreceipt${path}`,
      getManifest: () => ({ version: '0.1.6' }),
    },
    sidePanel: { close: closeSidePanel },
    windows: { update: updateWindow },
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
  it('shows the product header with the SupportKori action', async () => {
    render(<PopupApp />);

    expect(await screen.findByLabelText('BugReceipt')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Support BugReceipt on SupportKori' })).toBeDefined();
    expect(screen.queryByText('v0.1.6')).toBeNull();
  });

  it('guides a new user through the capture workflow', async () => {
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(request.type === 'session:get' ? { ok: true, session: null } : { ok: true }),
    );
    render(<PopupApp />);

    expect(
      await screen.findByRole('heading', { name: 'Ready to record the problem?' }),
    ).toBeDefined();
    expect(
      screen.getByText('Open the page where the problem happens, then choose that tab to begin.'),
    ).toBeDefined();
    const guide = screen.getByLabelText('How capture works');
    expect(within(guide).getByText('Choose the affected tab')).toBeDefined();
    expect(within(guide).getByText('Reproduce the problem')).toBeDefined();
    expect(within(guide).getByText('Stop and review')).toBeDefined();
    expect(within(guide).queryByText('Console')).toBeNull();
    expect(screen.getByRole('button', { name: 'Choose tab to record' })).toBeDefined();
  });

  it('accepts a multiline manual step in a textarea', async () => {
    queryTabs.mockResolvedValueOnce([{ id: session.tabId, url: session.origin }]);
    render(<PopupApp />);

    const step = await screen.findByLabelText<HTMLTextAreaElement>('Add a step you performed');
    expect(step.className).toContain('max-h-[calc(6lh+1rem+2px)]');
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

    const step = await screen.findByLabelText<HTMLTextAreaElement>('Add a step you performed');
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

    expect(await screen.findByText('Existing capture')).toBeDefined();
    expect(
      screen.getByRole('heading', { name: 'A capture is already waiting for review.' }),
    ).toBeDefined();
    expect(
      screen.getByText(
        'Open it to review or download the report. To record something new, discard this capture first.',
      ),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Discard to start new' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Review existing capture' }));

    await waitFor(() =>
      expect(createTab).toHaveBeenCalledWith({
        url: 'chrome-extension://bugreceipt/review.html',
      }),
    );
    expect(closeSidePanel).toHaveBeenCalledWith({ windowId: session.windowId });
  });

  it('starts without tabs permission using debugger metadata', async () => {
    queryTabs.mockResolvedValueOnce([{ id: 9 }]);
    getTargets.mockResolvedValueOnce([
      {
        id: 'target-9',
        type: 'page',
        tabId: 9,
        title: 'Checkout',
        url: 'https://example.com/checkout',
        attached: false,
      },
    ]);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve({ ok: true, session: request.type === 'session:get' ? null : session }),
    );
    render(<PopupApp />);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab to record' }));
    await waitFor(() => expect(getSentStartRequest()).toMatchObject({ tabId: 9 }));
    expect(chooseDesktopMedia).toHaveBeenCalledOnce();
  });

  it('starts capture with the tab explicitly selected by the user', async () => {
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session: null });
      return Promise.resolve({ ok: true, session });
    });
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab to record' }));

    await waitFor(() => expect(getSentStartRequest()).toMatchObject({ tabId: 9 }));
    const startRequest = getSentStartRequest();
    expect(typeof startRequest?.sessionId).toBe('string');
    expect(startRecording).toHaveBeenCalledWith(startRequest?.sessionId, 'desktop-stream');
    expect(startRecording.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder.at(-1)!,
    );
    expect(chooseDesktopMedia).toHaveBeenCalledWith(['tab'], expect.any(Function));
  });

  it('blocks the Chrome Web Store before opening the tab chooser', async () => {
    queryTabs.mockResolvedValueOnce([
      {
        id: 9,
        url: 'https://chromewebstore.google.com/detail/bugreceipt/example-extension-id',
      },
    ]);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session: null });
      return Promise.resolve({
        ok: false,
        code: 'capture-unavailable',
        message: 'The extensions gallery cannot be scripted.',
      });
    });
    render(<PopupApp />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Choose tab to record',
      }),
    );

    expect(
      await screen.findByText(
        'This page cannot be recorded. Open a regular HTTP or HTTPS page, then return to BugReceipt.',
      ),
    ).toBeDefined();
    expect(screen.queryByText('The extensions gallery cannot be scripted.')).toBeNull();
    expect(chooseDesktopMedia).not.toHaveBeenCalled();
    expect(send.mock.calls.some(([request]) => request.type === 'session:start')).toBe(false);
  });

  it('keeps the capture action visible with progress feedback while starting', async () => {
    let finishStarting: (() => void) | undefined;
    startRecording.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishStarting = resolve;
        }),
    );
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') return Promise.resolve({ ok: true, session: null });
      return Promise.resolve({ ok: true, session });
    });
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab to record' }));

    const starting = await screen.findByRole<HTMLButtonElement>('button', {
      name: 'Starting capture',
    });
    expect(starting.disabled).toBe(true);
    expect(starting.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('Checking for an active capture…')).toBeNull();

    act(() => finishStarting?.());
    await waitFor(() => expect(getSentStartRequest()).toBeDefined());
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

    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab to record' }));

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

    fireEvent.click(await screen.findByRole('button', { name: 'Choose tab to record' }));

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

  it('confirms before permanently discarding a capture', async () => {
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Discard capture' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Discard this capture?')).toBeDefined();
    expect(send.mock.calls.some(([request]) => request.type === 'session:discard')).toBe(false);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard capture' }));

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith({
        type: 'session:discard',
      }),
    );
  });

  it('guides the user back when recording is active in another tab', async () => {
    render(<PopupApp />);

    await screen.findByText('Recording continues in another tab');
    expect(screen.queryByLabelText('Add a step you performed')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Return to recorded tab' }));

    await waitFor(() => expect(updateWindow).toHaveBeenCalledWith(2, { focused: true }));
    expect(updateTab).toHaveBeenCalledWith(7, { active: true });
  });
});
