import type { CaptureSession, RuntimeRequest, RuntimeResponse } from '@bugreceipt/capture-model';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendRuntimeMessage } from '../src/application/protocol';
import { readRecording } from '../src/infrastructure/recording-store';
import { isReportEmailConfigured, sendReportEmail } from '../src/infrastructure/report-email';
import { ReviewApp } from '../src/ui/review/review-app';

vi.mock('../src/application/protocol', () => ({ sendRuntimeMessage: vi.fn() }));
vi.mock('../src/infrastructure/recording-store', () => ({
  readRecording: vi.fn().mockResolvedValue(null),
}));
vi.mock('../src/infrastructure/report-email', () => ({
  isReportEmailConfigured: vi.fn().mockReturnValue(true),
  sendReportEmail: vi.fn().mockResolvedValue({ visualAttached: false }),
}));
vi.mock('../src/infrastructure/screenshot-store', () => ({
  readScreenshot: vi.fn().mockResolvedValue(null),
}));

const session: CaptureSession = {
  schemaVersion: 1,
  id: '00000000-0000-4000-8000-000000000000',
  status: 'ready-for-review',
  tabId: 7,
  windowId: 2,
  origin: 'https://example.com',
  startedAt: '2026-08-27T12:00:00.000Z',
  stoppedAt: '2026-08-27T12:01:00.000Z',
  summary: 'Checkout fails',
  expectedBehavior: '',
  actualBehavior: '',
  steps: [{ id: '00000000-0000-4000-8000-000000000001', position: 0, text: 'Pay' }],
  diagnostics: [],
  network: [],
  filtering: { redactionCount: 0, droppedEventCount: 0 },
};

const send = vi.mocked(sendRuntimeMessage);
const recording = vi.mocked(readRecording);
const email = vi.mocked(sendReportEmail);
const emailConfigured = vi.mocked(isReportEmailConfigured);
const writeClipboard = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  recording.mockResolvedValue(null);
  emailConfigured.mockReturnValue(true);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: writeClipboard },
  });
  send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
    if (request.type === 'session:get') return Promise.resolve({ ok: true, session });
    if (request.type === 'session:update-review') {
      return Promise.resolve({
        ok: true,
        session: {
          ...session,
          summary: request.summary,
          expectedBehavior: request.expectedBehavior,
          actualBehavior: request.actualBehavior,
          steps: request.steps,
        },
      });
    }
    return Promise.resolve({ ok: true });
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('review editor', () => {
  it('shows neutral empty states for console and network evidence', async () => {
    render(<ReviewApp />);

    expect(
      await screen.findByText('No console messages were captured after recording started.'),
    ).toBeDefined();
    expect(
      screen.getByText('No network activity was captured after recording started.'),
    ).toBeDefined();
    expect(screen.queryByText('No console errors occurred after recording started.')).toBeNull();
  });

  it('allows export when optional steps and behavior descriptions are empty', async () => {
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    const download = screen.getByRole('button', { name: 'Download Markdown' });
    expect((download as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText('Complete the report before export')).toBeNull();
    expect(screen.getByLabelText('Expected behavior (optional)')).toBeDefined();
    expect(screen.getByLabelText('Actual behavior (optional)')).toBeDefined();
    expect(screen.getByText('Steps to reproduce (optional)')).toBeDefined();
  });

  it('downloads one ZIP containing the report and captured recording', async () => {
    const video = new Blob(['captured-video'], { type: 'video/webm' });
    const recordingSession: CaptureSession = {
      ...session,
      page: {
        url: 'https://example.com/checkout',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        recording: {
          blobId: session.id,
          mimeType: 'video/webm',
          sizeBytes: video.size,
          durationMs: 1_000,
        },
      },
    };
    recording.mockResolvedValue(video);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: recordingSession } : { ok: true },
      ),
    );
    const objectUrl = vi.spyOn(URL, 'createObjectURL');
    objectUrl.mockReturnValueOnce('blob:recording').mockReturnValueOnce('blob:report-bundle');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(video),
    } as Response);

    render(<ReviewApp />);
    fireEvent.click(await screen.findByRole('button', { name: 'Download report ZIP' }));

    await waitFor(() => expect(objectUrl).toHaveBeenCalledTimes(2));
    const bundle = objectUrl.mock.calls[1]?.[0];
    expect(bundle).toBeInstanceOf(Blob);
    const archive = await JSZip.loadAsync(await (bundle as Blob).arrayBuffer());
    expect(await archive.file('issue.md')?.async('string')).toContain('./recording.webm');
    expect(await archive.file('recording.webm')?.async('string')).toBe('captured-video');
  });

  it('saves edited report fields locally', async () => {
    render(<ReviewApp />);

    const title = await screen.findByDisplayValue('Checkout fails');
    fireEvent.change(title, { target: { value: 'Checkout remains disabled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session:update-review',
          summary: 'Checkout remains disabled',
        }),
      ),
    );
    expect(await screen.findByText('Review saved locally')).toBeDefined();
  });

  it('auto-saves edits before copying Markdown to the clipboard', async () => {
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    fireEvent.change(screen.getByLabelText('Actual behavior (optional)'), {
      target: { value: 'The payment control remains disabled.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }));

    await waitFor(() => expect(writeClipboard).toHaveBeenCalledTimes(1));
    expect(writeClipboard).toHaveBeenCalledWith(
      expect.stringContaining('The payment control remains disabled.'),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'session:update-review',
        actualBehavior: 'The payment control remains disabled.',
      }),
    );
  });

  it('requires confirmation before deleting the local capture', async () => {
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    fireEvent.click(screen.getByRole('button', { name: 'Delete local capture' }));

    expect(screen.getByText('Delete this capture permanently?')).toBeDefined();
    expect(send.mock.calls.some(([request]) => request.type === 'session:discard')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Keep capture' }));
    expect(screen.queryByText('Delete this capture permanently?')).toBeNull();
  });

  it('auto-saves a complete report before sharing it by email', async () => {
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    fireEvent.change(screen.getByLabelText('Expected behavior (optional)'), {
      target: { value: 'The order should complete.' },
    });
    fireEvent.change(screen.getByLabelText('Actual behavior (optional)'), {
      target: { value: 'The payment button stays disabled.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Share by email' }));

    await waitFor(() => expect(email).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'session:update-review',
        expectedBehavior: 'The order should complete.',
        actualBehavior: 'The payment button stays disabled.',
      }),
    );
    expect(email).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: session.id,
        subject: 'Checkout fails',
      }),
    );
    expect(await screen.findByText('Report emailed')).toBeDefined();
  });

  it('labels email as unavailable when the build has no report endpoint', async () => {
    emailConfigured.mockReturnValue(false);
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    const emailButton = screen.getByRole('button', { name: 'Email unavailable' });
    expect((emailButton as HTMLButtonElement).disabled).toBe(true);
    expect(emailButton.getAttribute('title')).toContain('VITE_BUGRECEIPT_REPORT_ENDPOINT');
  });
});
