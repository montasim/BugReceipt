import type { CaptureSession, RuntimeRequest, RuntimeResponse } from '@bugreceipt/capture-model';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnnotationDocument } from '../src/application/annotation-model';
import { OFFENSIVE_LANGUAGE_ERROR } from '../src/application/content-moderation';
import { sendRuntimeMessage } from '../src/application/protocol';
import { renderAnnotatedPng } from '../src/application/render-annotations';
import {
  deleteAnnotationDocument,
  getAnnotationDocument,
  saveAnnotationDocument,
} from '../src/infrastructure/annotation-store';
import { readRecording } from '../src/infrastructure/recording-store';
import { downloadReportFolder } from '../src/infrastructure/report-folder-download';
import { isReportEmailConfigured, sendReportEmail } from '../src/infrastructure/report-email';
import {
  deleteScreenshot,
  readScreenshot,
  saveScreenshotBlob,
} from '../src/infrastructure/screenshot-store';
import { captureVideoFrame } from '../src/infrastructure/video-frame';
import {
  deleteTextAnnotationDocument,
  getTextAnnotationDocument,
  saveTextAnnotationDocument,
} from '../src/infrastructure/text-annotation-store';
import { ReviewApp } from '../src/ui/review/review-app';

vi.mock('../src/application/protocol', () => ({ sendRuntimeMessage: vi.fn() }));
vi.mock('../src/infrastructure/recording-store', () => ({
  readRecording: vi.fn().mockResolvedValue(null),
}));
vi.mock('../src/infrastructure/report-folder-download', () => ({
  downloadReportFolder: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/infrastructure/report-email', () => ({
  isReportEmailConfigured: vi.fn().mockReturnValue(true),
  sendReportEmail: vi.fn().mockResolvedValue({ visualAttached: false }),
}));
vi.mock('../src/infrastructure/screenshot-store', () => ({
  deleteScreenshot: vi.fn().mockResolvedValue(undefined),
  readScreenshot: vi.fn().mockResolvedValue(null),
  saveScreenshotBlob: vi.fn(),
}));
vi.mock('../src/infrastructure/video-frame', () => ({
  captureVideoFrame: vi.fn(),
}));
vi.mock('../src/infrastructure/annotation-store', () => ({
  deleteAnnotationDocument: vi.fn().mockResolvedValue(undefined),
  getAnnotationDocument: vi.fn().mockResolvedValue(null),
  saveAnnotationDocument: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/infrastructure/text-annotation-store', () => ({
  deleteTextAnnotationDocument: vi.fn().mockResolvedValue(undefined),
  getTextAnnotationDocument: vi.fn().mockResolvedValue(null),
  saveTextAnnotationDocument: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/application/render-annotations', () => ({
  renderAnnotatedPng: vi.fn(),
}));

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';

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
  environment: {
    userAgent,
    platform: 'Win32',
    reproKitVersion: '0.1.3',
  },
  filtering: { redactionCount: 0, droppedEventCount: 0 },
};

const send = vi.mocked(sendRuntimeMessage);
const recording = vi.mocked(readRecording);
const downloadFolder = vi.mocked(downloadReportFolder);
const screenshot = vi.mocked(readScreenshot);
const saveFrame = vi.mocked(saveScreenshotBlob);
const removeFrameBlob = vi.mocked(deleteScreenshot);
const captureFrame = vi.mocked(captureVideoFrame);
const email = vi.mocked(sendReportEmail);
const emailConfigured = vi.mocked(isReportEmailConfigured);
const readAnnotations = vi.mocked(getAnnotationDocument);
const saveAnnotations = vi.mocked(saveAnnotationDocument);
const deleteAnnotations = vi.mocked(deleteAnnotationDocument);
const deleteTextAnnotations = vi.mocked(deleteTextAnnotationDocument);
const readTextAnnotations = vi.mocked(getTextAnnotationDocument);
const saveTextAnnotations = vi.mocked(saveTextAnnotationDocument);
const renderAnnotations = vi.mocked(renderAnnotatedPng);
const writeClipboard = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  recording.mockResolvedValue(null);
  downloadFolder.mockResolvedValue(undefined);
  screenshot.mockResolvedValue(null);
  saveFrame.mockResolvedValue('00000000-0000-4000-8000-000000000004');
  removeFrameBlob.mockResolvedValue(undefined);
  captureFrame.mockResolvedValue({
    blob: new Blob(['selected-frame'], { type: 'image/png' }),
    videoTimeMs: 3_067,
    width: 1_280,
    height: 720,
  });
  readAnnotations.mockResolvedValue(null);
  saveAnnotations.mockResolvedValue(undefined);
  deleteAnnotations.mockResolvedValue(undefined);
  deleteTextAnnotations.mockResolvedValue(undefined);
  readTextAnnotations.mockResolvedValue(null);
  saveTextAnnotations.mockResolvedValue(undefined);
  renderAnnotations.mockImplementation((source) => Promise.resolve(source));
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
  it('keeps the local upload status and puts support in the review navbar', async () => {
    render(<ReviewApp />);

    expect(await screen.findByText('Nothing has been uploaded')).toBeDefined();
    const support = screen.getByRole('link', { name: 'Support BugReceipt on SupportKori' });
    const reportIssue = screen.getByRole('button', { name: 'Report an issue' });
    expect(support.getAttribute('href')).toBe('https://www.supportkori.com/montasim');
    expect(support.getAttribute('target')).toBe('_blank');
    expect(reportIssue.nextElementSibling).toBe(support);
  });

  it('opens the issue form and sends the subject and description by email', async () => {
    render(<ReviewApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Report an issue' }));
    expect(screen.getByRole('dialog', { name: 'Report an issue' })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: /Include diagnosis report/ })).toBeDefined();

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Review controls stop responding' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'The annotation toolbar stops responding after I save a frame.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send email' }));

    await waitFor(() => expect(email).toHaveBeenCalledTimes(1));
    const sentIssue = email.mock.calls[0]?.[0];
    expect(sentIssue?.sessionId).toBe(session.id);
    expect(sentIssue?.subject).toBe('Extension issue: Review controls stop responding');
    expect(sentIssue?.markdown).toContain(
      'The annotation toolbar stops responding after I save a frame.',
    );
    expect(sentIssue).not.toHaveProperty('diagnosis');
    expect(screen.queryByRole('dialog', { name: 'Report an issue' })).toBeNull();
    expect(await screen.findByText('Issue emailed without a diagnosis report')).toBeDefined();
  });

  it('attaches the extension diagnosis only after checkbox consent', async () => {
    render(<ReviewApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Report an issue' }));
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Review controls stop responding' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'The review page stopped responding.' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Include diagnosis report/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send email' }));

    await waitFor(() => expect(email).toHaveBeenCalledTimes(1));
    expect(email.mock.calls[0]?.[0].diagnosis).toContain('# BugReceipt diagnosis report');
    expect(await screen.findByText('Issue emailed with diagnosis.md')).toBeDefined();
  });

  it('shows required errors before sending an empty issue report', async () => {
    render(<ReviewApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Report an issue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send email' }));

    expect(await screen.findByText('Enter a subject.')).toBeDefined();
    expect(screen.getByText('Describe the problem.')).toBeDefined();
    expect(email).not.toHaveBeenCalled();
  });

  it('validates the issue subject and description while the user types', async () => {
    render(<ReviewApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Report an issue' }));
    const subject = screen.getByLabelText<HTMLInputElement>('Subject');
    const description = screen.getByLabelText<HTMLTextAreaElement>('Description');
    const sendIssue = screen.getByRole<HTMLButtonElement>('button', { name: 'Send email' });

    for (const field of [subject, description]) {
      fireEvent.change(field, { target: { value: 'This fucking extension is broken' } });
      await waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('true'));
      const errorId = field.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      expect(document.getElementById(errorId!)?.textContent).toBe(OFFENSIVE_LANGUAGE_ERROR);
      expect(sendIssue.disabled).toBe(true);

      fireEvent.change(field, { target: { value: 'The review controls stopped responding' } });
      await waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('false'));
    }
  });

  it('checks the issue fields again before sending an email', async () => {
    render(<ReviewApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Report an issue' }));
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'This fucking extension is broken' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'The review controls stopped responding.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send email' }));

    expect(await screen.findByText(OFFENSIVE_LANGUAGE_ERROR)).toBeDefined();
    expect(email).not.toHaveBeenCalled();
  });

  it('shows readable and raw capture environment metadata', async () => {
    render(<ReviewApp />);

    expect(await screen.findByText('Windows 10 or 11')).toBeDefined();
    expect(screen.getByText('Chrome 140.0.0.0')).toBeDefined();
    expect(screen.getByText('Win32')).toBeDefined();
    expect(screen.getByText(userAgent)).toBeDefined();
    expect(screen.getByText('0.1.3')).toBeDefined();
  });

  it('offers visual, console, and network evidence in keyboard-accessible tabs', async () => {
    render(<ReviewApp />);

    const visualTab = await screen.findByRole('tab', { name: 'Visual evidence' });
    const consoleTab = screen.getByRole('tab', { name: /^Console 0$/ });
    const networkTab = screen.getByRole('tab', { name: /^Network 0$/ });
    expect(visualTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').getAttribute('id')).toBe('visual-evidence-panel');

    fireEvent.click(consoleTab);
    expect(consoleTab.getAttribute('aria-selected')).toBe('true');
    expect(
      screen.getByText('No console messages were captured after recording started.'),
    ).toBeDefined();

    consoleTab.focus();
    fireEvent.keyDown(consoleTab, { key: 'ArrowRight' });
    expect(networkTab.getAttribute('aria-selected')).toBe('true');
    expect(
      screen.getByText('No network activity was captured after recording started.'),
    ).toBeDefined();

    networkTab.focus();
    fireEvent.keyDown(networkTab, { key: 'ArrowRight' });
    expect(visualTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('tab', { name: /Console \+ network/ })).toBeNull();
  });

  it('reuses the visual annotation workspace for console and network evidence', async () => {
    const diagnosticSession: CaptureSession = {
      ...session,
      diagnostics: [
        {
          id: '00000000-0000-4000-8000-000000000010',
          occurredAt: '2026-08-27T12:00:15.000Z',
          kind: 'console',
          level: 'error',
          message: 'Payment request failed',
        },
      ],
      network: [
        {
          id: '00000000-0000-4000-8000-000000000011',
          occurredAt: '2026-08-27T12:00:15.100Z',
          method: 'POST',
          url: 'https://example.com/api/payment',
          resourceType: 'fetch',
          status: 500,
          durationMs: 235,
          responseBody: '{"error":"declined"}',
        },
      ],
    };
    const consoleDocument = {
      ...createAnnotationDocument(1_600, 720),
      items: [
        {
          id: 'console-border-1',
          kind: 'border' as const,
          color: '#ff5c3a' as const,
          strokeWidth: 6,
          x: 120,
          y: 80,
          width: 460,
          height: 160,
        },
      ],
    };
    const networkDocument = {
      ...createAnnotationDocument(1_600, 720),
      items: [
        {
          id: 'network-highlight-1',
          kind: 'highlight' as const,
          color: '#e2a90a' as const,
          strokeWidth: 6,
          x: 80,
          y: 180,
          width: 720,
          height: 110,
        },
      ],
    };
    readAnnotations.mockImplementation((targetId) => {
      if (targetId.endsWith(':evidence:console')) return Promise.resolve(consoleDocument);
      if (targetId.endsWith(':evidence:network')) return Promise.resolve(networkDocument);
      return Promise.resolve(null);
    });
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') {
        return Promise.resolve({ ok: true, session: diagnosticSession });
      }
      if (request.type === 'session:update-review') {
        return Promise.resolve({ ok: true, session: diagnosticSession });
      }
      return Promise.resolve({ ok: true });
    });
    render(<ReviewApp />);

    fireEvent.click(await screen.findByRole('tab', { name: /^Console 1$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Annotate console evidence' }));
    expect(
      screen.getByRole('application', { name: 'Console evidence annotation canvas' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Select' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Marker' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Highlight' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Border' })).toBeDefined();
    expect(screen.getByRole<HTMLButtonElement>('tab', { name: /^Network 1$/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(saveAnnotations).toHaveBeenCalledWith(
        `${diagnosticSession.id}:evidence:console`,
        expect.objectContaining({ items: [] }),
      ),
    );

    fireEvent.click(screen.getByRole('tab', { name: /^Network 1$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Annotate network evidence' }));
    expect(
      screen.getByRole('application', { name: 'Network evidence annotation canvas' }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(saveAnnotations).toHaveBeenCalledWith(
        `${diagnosticSession.id}:evidence:network`,
        expect.objectContaining({ items: networkDocument.items }),
      ),
    );
  });

  it('keeps existing text highlights in exported Markdown', async () => {
    const diagnosticSession: CaptureSession = {
      ...session,
      diagnostics: [
        {
          id: '00000000-0000-4000-8000-000000000010',
          occurredAt: '2026-08-27T12:00:15.000Z',
          kind: 'console',
          level: 'error',
          message: 'Payment request failed',
        },
      ],
      network: [
        {
          id: '00000000-0000-4000-8000-000000000011',
          occurredAt: '2026-08-27T12:00:15.100Z',
          method: 'POST',
          url: 'https://example.com/api/payment',
          resourceType: 'fetch',
          status: 500,
          durationMs: 235,
        },
      ],
    };
    readTextAnnotations.mockResolvedValue({
      version: 1,
      sessionId: diagnosticSession.id,
      items: [
        {
          id: '00000000-0000-4000-8000-000000000012',
          source: 'console',
          eventId: diagnosticSession.diagnostics[0]!.id,
          field: 'message',
          start: 0,
          end: 7,
          color: '#e2a90a',
        },
        {
          id: '00000000-0000-4000-8000-000000000013',
          source: 'network',
          eventId: diagnosticSession.network[0]!.id,
          field: 'url',
          start: 19,
          end: 31,
          color: '#e2a90a',
        },
      ],
    });
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: diagnosticSession } : { ok: true },
      ),
    );
    render(<ReviewApp />);

    fireEvent.click(await screen.findByRole('tab', { name: /^Console 1$/ }));
    await screen.findByText('Payment', { selector: 'mark' });
    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }));
    await waitFor(() => expect(writeClipboard).toHaveBeenCalledOnce());
    expect(writeClipboard).toHaveBeenCalledWith(expect.stringContaining('⟦Payment⟧'));
    expect(writeClipboard).toHaveBeenCalledWith(expect.stringContaining('⟦/api/payment⟧'));
  });

  it('allows export when optional steps and behavior descriptions are empty', async () => {
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    const download = screen.getByRole('button', { name: 'Download report' });
    expect((download as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Save locally' })).toBeNull();
    expect(screen.queryByText('Saved locally')).toBeNull();
    expect(screen.queryByText('Complete the report before export')).toBeNull();
    expect(screen.getByLabelText('Expected behavior (optional)')).toBeDefined();
    expect(screen.getByLabelText('Actual behavior (optional)')).toBeDefined();
    expect(screen.getByLabelText('Steps to reproduce (optional)')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Add step' })).toBeNull();

    fireEvent.click(download);
    expect(screen.getByRole('menuitem', { name: /Download folder/ })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Download ZIP/ })).toBeDefined();
  });

  it('validates every report input and textarea as the user types', async () => {
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    const fields = [
      screen.getByLabelText<HTMLInputElement>('Issue title'),
      screen.getByLabelText<HTMLTextAreaElement>('Expected behavior (optional)'),
      screen.getByLabelText<HTMLTextAreaElement>('Actual behavior (optional)'),
      screen.getByLabelText<HTMLTextAreaElement>('Steps to reproduce (optional)'),
    ];

    for (const field of fields) {
      fireEvent.change(field, { target: { value: 'This fucking form is broken' } });
      await waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('true'));
      const errorId = field.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      expect(document.getElementById(errorId!)?.textContent).toBe(OFFENSIVE_LANGUAGE_ERROR);

      fireEvent.change(field, { target: { value: 'The form remains disabled' } });
      await waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('false'));
    }
  });

  it('checks the latest report values again before export', async () => {
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    fireEvent.change(screen.getByLabelText('Actual behavior (optional)'), {
      target: { value: 'This fucking form is broken' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }));

    expect(await screen.findByText(OFFENSIVE_LANGUAGE_ERROR)).toBeDefined();
    expect(writeClipboard).not.toHaveBeenCalled();
    expect(send.mock.calls.some(([request]) => request.type === 'session:update-review')).toBe(
      false,
    );
  });

  it('edits reproduction steps as one textarea line per exported step', async () => {
    render(<ReviewApp />);

    const steps = await screen.findByLabelText<HTMLTextAreaElement>(
      'Steps to reproduce (optional)',
    );
    await waitFor(() => expect(steps.value).toBe('Pay'));
    fireEvent.change(steps, {
      target: { value: 'Opened checkout\nClicked Pay\n\nObserved the failure' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }));

    await waitFor(() => expect(writeClipboard).toHaveBeenCalledOnce());
    const updateRequest = send.mock.calls
      .map(([request]) => request)
      .find((request) => request.type === 'session:update-review');
    expect(updateRequest?.type === 'session:update-review' ? updateRequest.steps : []).toEqual([
      expect.objectContaining({ position: 0, text: 'Opened checkout' }),
      expect.objectContaining({ position: 1, text: 'Clicked Pay' }),
      expect.objectContaining({ position: 2, text: 'Observed the failure' }),
    ]);
  });

  it('downloads the report files unzipped into a named folder', async () => {
    render(<ReviewApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Download report' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Download folder/ }));

    await waitFor(() => expect(downloadFolder).toHaveBeenCalledOnce());
    const [folderName, files] = downloadFolder.mock.calls[0] ?? [];
    expect(folderName).toBe('bugreceipt-checkout-fails-20260827T120000Z');
    expect(files?.map((file) => file.filename)).toContain('issue.md');
    expect(files?.find((file) => file.filename === 'issue.md')?.blob).toBeInstanceOf(Blob);
  });

  it('downloads one ZIP containing the report, recording, and selected frame', async () => {
    const video = new Blob(['captured-video'], { type: 'video/webm' });
    const frame = new Blob(['selected-frame'], { type: 'image/png' });
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
        selectedFrame: {
          blobId: '00000000-0000-4000-8000-000000000004',
          mimeType: 'image/png',
          sizeBytes: frame.size,
          videoTimeMs: 3_067,
          width: 1_280,
          height: 720,
        },
      },
    };
    recording.mockResolvedValue(video);
    screenshot.mockResolvedValue(frame);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: recordingSession } : { ok: true },
      ),
    );
    const objectUrl = vi.spyOn(URL, 'createObjectURL');
    objectUrl
      .mockReturnValueOnce('blob:recording')
      .mockReturnValueOnce('blob:selected-frame')
      .mockReturnValueOnce('blob:report-bundle');
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const requestedUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(requestedUrl === 'blob:selected-frame' ? frame : video),
      } as Response);
    });

    render(<ReviewApp />);
    const recordingActions = await screen.findByRole('group', { name: 'Recording actions' });
    expect(recordingActions.closest('.studio-heading')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Download video' })).toBeDefined();
    fireEvent.click(await screen.findByRole('button', { name: 'Download report' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Download ZIP/ }));

    await waitFor(() => expect(objectUrl).toHaveBeenCalledTimes(3));
    const bundle = objectUrl.mock.calls[2]?.[0];
    expect(bundle).toBeInstanceOf(Blob);
    const archive = await JSZip.loadAsync(await (bundle as Blob).arrayBuffer());
    expect(await archive.file('issue.md')?.async('string')).toContain('./recording.webm');
    expect(await archive.file('issue.md')?.async('string')).toContain('./selected-frame.png');
    expect(await archive.file('recording.webm')?.async('string')).toBe('captured-video');
    expect(await archive.file('selected-frame.png')?.async('string')).toBe('selected-frame');
  });

  it('includes every selected frame in report exports with numbered filenames', async () => {
    const firstFrame = new Blob(['first-frame'], { type: 'image/png' });
    const secondFrame = new Blob(['second-frame'], { type: 'image/png' });
    const firstBlobId = '00000000-0000-4000-8000-000000000004';
    const secondBlobId = '00000000-0000-4000-8000-000000000005';
    const multiFrameSession: CaptureSession = {
      ...session,
      page: {
        url: 'https://example.com/checkout',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        selectedFrames: [
          {
            blobId: firstBlobId,
            mimeType: 'image/png',
            sizeBytes: firstFrame.size,
            videoTimeMs: 3_067,
            width: 1_280,
            height: 720,
          },
          {
            blobId: secondBlobId,
            mimeType: 'image/png',
            sizeBytes: secondFrame.size,
            videoTimeMs: 4_500,
            width: 1_280,
            height: 720,
          },
        ],
      },
    };
    screenshot.mockImplementation((blobId) =>
      Promise.resolve(blobId === firstBlobId ? firstFrame : secondFrame),
    );
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: multiFrameSession } : { ok: true },
      ),
    );
    const objectUrl = vi.spyOn(URL, 'createObjectURL');
    objectUrl.mockReturnValueOnce('blob:first-frame').mockReturnValueOnce('blob:report-bundle');

    render(<ReviewApp />);
    fireEvent.click(await screen.findByRole('button', { name: 'Download report' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Download ZIP/ }));

    await waitFor(() => expect(objectUrl).toHaveBeenCalledTimes(2));
    const bundle = objectUrl.mock.calls[1]?.[0];
    const archive = await JSZip.loadAsync(await (bundle as Blob).arrayBuffer());
    expect(await archive.file('selected-frame-01.png')?.async('string')).toBe('first-frame');
    expect(await archive.file('selected-frame-02.png')?.async('string')).toBe('second-frame');
    expect(await archive.file('issue.md')?.async('string')).toContain('./selected-frame-02.png');

    fireEvent.click(screen.getByRole('button', { name: 'Share by email' }));
    await waitFor(() => expect(email).toHaveBeenCalledTimes(1));
    const emailedVisuals = email.mock.calls[0]?.[0].visuals ?? [];
    expect(emailedVisuals.map((visual) => visual.filename)).toEqual([
      'selected-frame-01.png',
      'selected-frame-02.png',
    ]);
  });

  it('captures the current playback frame as local PNG evidence', async () => {
    const video = new Blob(['captured-video'], { type: 'video/webm' });
    const frame = new Blob(['selected-frame'], { type: 'image/png' });
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
          durationMs: 10_000,
        },
      },
    };
    recording.mockResolvedValue(video);
    screenshot.mockResolvedValue(frame);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') {
        return Promise.resolve({ ok: true, session: recordingSession });
      }
      if (request.type === 'session:add-selected-frame') {
        return Promise.resolve({
          ok: true,
          session: {
            ...recordingSession,
            page: { ...recordingSession.page!, selectedFrames: [request.frame] },
          },
        });
      }
      return Promise.resolve({ ok: true });
    });
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:recording')
      .mockReturnValueOnce('blob:selected-frame');

    render(<ReviewApp />);
    const player = await screen.findByLabelText<HTMLVideoElement>('Screen recording of Checkout');
    Object.defineProperties(player, {
      duration: { configurable: true, value: 10 },
      currentTime: { configurable: true, writable: true, value: 0 },
    });
    fireEvent(player, new Event('loadedmetadata'));
    expect(screen.getByText('No frame saved yet')).toBeDefined();
    expect(screen.queryByText('Capture a specific frame')).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Video frame time' })).toBeNull();

    player.currentTime = 3;
    fireEvent.click(screen.getByRole('button', { name: 'Capture current frame at 00:00.000' }));

    await waitFor(() => expect(captureFrame).toHaveBeenCalledWith(player, 3, 10));
    expect(saveFrame).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/png' }));
    const frameRequest = send.mock.calls
      .map(([request]) => request)
      .find(
        (request): request is Extract<RuntimeRequest, { type: 'session:add-selected-frame' }> =>
          request.type === 'session:add-selected-frame',
      );
    expect(frameRequest?.frame).toMatchObject({
      videoTimeMs: 3_067,
      width: 1_280,
      height: 720,
    });
    expect(
      await screen.findByRole('img', {
        name: 'Selected frame 1 of 1 from the screen recording at 00:03.067',
      }),
    ).toBeDefined();
    expect(screen.queryByText('No frame saved yet')).toBeNull();
    expect(screen.getByText('Frame 1 of 20 saved at 00:03.067')).toBeDefined();
  });

  it('navigates selected frames and removes only the active frame', async () => {
    const firstFrame = new Blob(['first-frame'], { type: 'image/png' });
    const secondFrame = new Blob(['second-frame'], { type: 'image/png' });
    const firstBlobId = '00000000-0000-4000-8000-000000000004';
    const secondBlobId = '00000000-0000-4000-8000-000000000005';
    const selectedFrames = [
      {
        blobId: firstBlobId,
        mimeType: 'image/png' as const,
        sizeBytes: firstFrame.size,
        videoTimeMs: 3_067,
        width: 1_280,
        height: 720,
      },
      {
        blobId: secondBlobId,
        mimeType: 'image/png' as const,
        sizeBytes: secondFrame.size,
        videoTimeMs: 4_500,
        width: 1_280,
        height: 720,
      },
    ];
    const multiFrameSession: CaptureSession = {
      ...session,
      page: {
        url: 'https://example.com/checkout',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        selectedFrames,
      },
    };
    screenshot.mockImplementation((blobId) =>
      Promise.resolve(blobId === firstBlobId ? firstFrame : secondFrame),
    );
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') {
        return Promise.resolve({ ok: true, session: multiFrameSession });
      }
      if (request.type === 'session:remove-selected-frame') {
        return Promise.resolve({
          ok: true,
          session: {
            ...multiFrameSession,
            page: { ...multiFrameSession.page!, selectedFrames: [selectedFrames[0]!] },
          },
        });
      }
      return Promise.resolve({ ok: true });
    });
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:first-frame')
      .mockReturnValueOnce('blob:second-frame')
      .mockReturnValueOnce('blob:first-frame-after-remove');

    render(<ReviewApp />);

    expect(
      await screen.findByRole('img', {
        name: 'Selected frame 1 of 2 from the screen recording at 00:03.067',
      }),
    ).toBeDefined();
    expect(screen.getByText('1 / 2')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'View next selected frame' }));
    expect(
      await screen.findByRole('img', {
        name: 'Selected frame 2 of 2 from the screen recording at 00:04.500',
      }),
    ).toBeDefined();
    expect(screen.getByText('2 / 2')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Remove selected frame' }));

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith({
        type: 'session:remove-selected-frame',
        blobId: secondBlobId,
      }),
    );
    expect(
      await screen.findByRole('img', {
        name: 'Selected frame 1 of 1 from the screen recording at 00:03.067',
      }),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'View next selected frame' })).toBeNull();
  });

  it('disables capture after the twentieth selected frame', async () => {
    const video = new Blob(['captured-video'], { type: 'video/webm' });
    const frame = new Blob(['selected-frame'], { type: 'image/png' });
    const fullSession: CaptureSession = {
      ...session,
      page: {
        url: 'https://example.com/checkout',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        recording: {
          blobId: session.id,
          mimeType: 'video/webm',
          sizeBytes: video.size,
          durationMs: 10_000,
        },
        selectedFrames: Array.from({ length: 20 }, (_, index) => ({
          blobId: crypto.randomUUID(),
          mimeType: 'image/png' as const,
          sizeBytes: frame.size,
          videoTimeMs: index * 250,
          width: 1_280,
          height: 720,
        })),
      },
    };
    recording.mockResolvedValue(video);
    screenshot.mockResolvedValue(frame);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: fullSession } : { ok: true },
      ),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:evidence');

    render(<ReviewApp />);

    const captureAction = await screen.findByRole('button', {
      name: 'Maximum of 20 frames reached',
    });
    expect(captureAction.hasAttribute('disabled')).toBe(true);
    expect(captureAction.textContent).toContain('20 frame limit');
  });

  it('opens the selected frame annotation workspace and saves edits locally', async () => {
    const frame = new Blob(['selected-frame'], { type: 'image/png' });
    const selectedFrameSession: CaptureSession = {
      ...session,
      page: {
        url: 'https://example.com/checkout',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        selectedFrame: {
          blobId: '00000000-0000-4000-8000-000000000004',
          mimeType: 'image/png',
          sizeBytes: frame.size,
          videoTimeMs: 3_067,
          width: 1_280,
          height: 720,
        },
      },
    };
    const document = {
      ...createAnnotationDocument(1_280, 720),
      items: [
        {
          id: 'border-1',
          kind: 'border' as const,
          color: '#ff5c3a' as const,
          strokeWidth: 6,
          x: 120,
          y: 80,
          width: 300,
          height: 180,
        },
      ],
    };
    screenshot.mockResolvedValue(frame);
    readAnnotations.mockResolvedValue(document);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: selectedFrameSession } : { ok: true },
      ),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:selected-frame');

    render(<ReviewApp />);
    const annotateAction = await screen.findByRole('button', {
      name: 'Annotate selected frame',
    });

    expect(annotateAction.closest('.selected-frame-heading-actions')).not.toBeNull();
    expect(annotateAction.classList.contains('text-action')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Download frame' })
        .closest('.selected-frame-heading-actions'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Remove selected frame' })
        .closest('.selected-frame-heading-actions'),
    ).not.toBeNull();

    fireEvent.click(annotateAction);

    expect(
      screen.getByRole('application', { name: 'Selected frame annotation canvas' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Border' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() =>
      expect(saveAnnotations).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000004',
        expect.objectContaining({ items: [] }),
      ),
    );
    expect(
      screen.queryByRole('application', { name: 'Selected frame annotation canvas' }),
    ).toBeNull();
  });

  it('flattens saved annotations into the selected frame inside the report ZIP', async () => {
    const frame = new Blob(['selected-frame'], { type: 'image/png' });
    const annotatedFrame = new Blob(['annotated-frame'], { type: 'image/png' });
    const selectedFrameSession: CaptureSession = {
      ...session,
      page: {
        url: 'https://example.com/checkout',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        selectedFrame: {
          blobId: '00000000-0000-4000-8000-000000000004',
          mimeType: 'image/png',
          sizeBytes: frame.size,
          videoTimeMs: 3_067,
          width: 1_280,
          height: 720,
        },
      },
    };
    const document = {
      ...createAnnotationDocument(1_280, 720),
      items: [
        {
          id: 'border-1',
          kind: 'border' as const,
          color: '#ff5c3a' as const,
          strokeWidth: 6,
          x: 120,
          y: 80,
          width: 300,
          height: 180,
        },
      ],
    };
    screenshot.mockResolvedValue(frame);
    readAnnotations.mockResolvedValue(document);
    renderAnnotations.mockResolvedValue(annotatedFrame);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: selectedFrameSession } : { ok: true },
      ),
    );
    const objectUrl = vi.spyOn(URL, 'createObjectURL');
    objectUrl.mockReturnValueOnce('blob:selected-frame').mockReturnValueOnce('blob:report-bundle');

    render(<ReviewApp />);
    fireEvent.click(await screen.findByRole('button', { name: 'Download report' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Download ZIP/ }));

    await waitFor(() => expect(objectUrl).toHaveBeenCalledTimes(2));
    expect(renderAnnotations).toHaveBeenCalledWith(frame, document);
    const bundle = objectUrl.mock.calls[1]?.[0];
    expect(bundle).toBeInstanceOf(Blob);
    const archive = await JSZip.loadAsync(await (bundle as Blob).arrayBuffer());
    expect(await archive.file('selected-frame.png')?.async('string')).toBe('annotated-frame');
  });

  it('enables in-player frame capture when video duration becomes available', async () => {
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
          durationMs: 10_000,
        },
      },
    };
    recording.mockResolvedValue(video);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: recordingSession } : { ok: true },
      ),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:recording');

    render(<ReviewApp />);
    const player = await screen.findByLabelText('Screen recording of Checkout');
    Object.defineProperties(player, {
      duration: { configurable: true, value: 10 },
      currentTime: { configurable: true, writable: true, value: 2.881 },
    });
    fireEvent.timeUpdate(player);

    expect(
      screen
        .getByRole('button', {
          name: 'Capture current frame at 00:02.881',
        })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('falls back to the captured duration when the WebM preview reports infinity', async () => {
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
          durationMs: 10_000,
        },
      },
    };
    recording.mockResolvedValue(video);
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> =>
      Promise.resolve(
        request.type === 'session:get' ? { ok: true, session: recordingSession } : { ok: true },
      ),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:recording');

    render(<ReviewApp />);
    const player = await screen.findByLabelText('Screen recording of Checkout');
    Object.defineProperties(player, {
      duration: { configurable: true, value: Number.POSITIVE_INFINITY },
      currentTime: { configurable: true, writable: true, value: 2.881 },
    });
    fireEvent.loadedMetadata(player);

    expect(
      screen
        .getByRole('button', { name: 'Capture current frame at 00:02.881' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('applies edited report fields automatically before folder export', async () => {
    render(<ReviewApp />);

    const title = await screen.findByDisplayValue('Checkout fails');
    fireEvent.change(title, { target: { value: 'Checkout remains disabled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download report' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Download folder/ }));

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session:update-review',
          summary: 'Checkout remains disabled',
        }),
      ),
    );
    expect(downloadFolder).toHaveBeenCalled();
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
        visuals: [],
      }),
    );
    expect(await screen.findByText('Emailed issue.md')).toBeDefined();
  });

  it('labels email as unavailable when the build has no report endpoint', async () => {
    emailConfigured.mockReturnValue(false);
    render(<ReviewApp />);

    await screen.findByDisplayValue('Checkout fails');
    const emailButton = screen.getByRole('button', { name: 'Email unavailable' });
    expect((emailButton as HTMLButtonElement).disabled).toBe(true);
    expect(emailButton.getAttribute('title')).toContain('VITE_BUGRECEIPT_REPORT_ENDPOINT');

    fireEvent.click(screen.getByRole('button', { name: 'Report an issue' }));
    expect(
      screen.getByText('Email delivery is unavailable in this extension build.'),
    ).toBeDefined();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Send email' }).disabled).toBe(
      true,
    );
  });
});
