import type { CaptureSession, RuntimeRequest, RuntimeResponse } from '@bugreceipt/capture-model';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnnotationDocument } from '../src/application/annotation-model';
import { sendRuntimeMessage } from '../src/application/protocol';
import { renderAnnotatedPng } from '../src/application/render-annotations';
import {
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
const deleteTextAnnotations = vi.mocked(deleteTextAnnotationDocument);
const readTextAnnotations = vi.mocked(getTextAnnotationDocument);
const saveTextAnnotations = vi.mocked(saveTextAnnotationDocument);
const renderAnnotations = vi.mocked(renderAnnotatedPng);
const writeClipboard = vi.fn().mockResolvedValue(undefined);

function selectText(root: HTMLElement, start: number, end: number) {
  const textNode = root.firstChild;
  if (!textNode) throw new Error('Expected annotatable evidence text.');
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.mouseUp(root);
}

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
    expect(support.getAttribute('href')).toBe('https://www.supportkori.com/montasim');
    expect(support.getAttribute('target')).toBe('_blank');
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

  it('highlights selected console and network text and includes it in Markdown', async () => {
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
    selectText(screen.getByText('Payment request failed'), 0, 7);

    expect(screen.getByText('Payment', { selector: 'mark' })).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: /^Network 1$/ }));
    const url = screen.getByText('https://example.com/api/payment');
    selectText(url, 19, 31);
    expect(screen.getByText('/api/payment', { selector: 'mark' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(saveTextAnnotations).toHaveBeenCalledWith(
        diagnosticSession.id,
        expect.objectContaining({
          items: [
            expect.objectContaining({ source: 'console', field: 'message', start: 0, end: 7 }),
            expect.objectContaining({ source: 'network', field: 'url', start: 19, end: 31 }),
          ],
        }),
      ),
    );

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
    expect(screen.getByRole('button', { name: 'Download recording.webm' })).toBeDefined();
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

  it('captures the current playback frame as local PNG evidence', async () => {
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
    send.mockImplementation((request: RuntimeRequest): Promise<RuntimeResponse> => {
      if (request.type === 'session:get') {
        return Promise.resolve({ ok: true, session: recordingSession });
      }
      if (request.type === 'session:set-selected-frame') {
        return Promise.resolve({
          ok: true,
          session: {
            ...recordingSession,
            page: { ...recordingSession.page!, selectedFrame: request.frame },
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
        (request): request is Extract<RuntimeRequest, { type: 'session:set-selected-frame' }> =>
          request.type === 'session:set-selected-frame',
      );
    expect(frameRequest?.frame).toMatchObject({
      videoTimeMs: 3_067,
      width: 1_280,
      height: 720,
    });
    expect(
      await screen.findByRole('img', {
        name: 'Selected frame from the screen recording at 00:03.067',
      }),
    ).toBeDefined();
    expect(screen.queryByText('No frame saved yet')).toBeNull();
    expect(screen.getByText('Frame at 00:03.067 saved locally')).toBeDefined();
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
    expect(
      screen
        .getByRole('button', { name: 'Download PNG' })
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
