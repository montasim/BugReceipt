import type { CaptureSession } from '@bugreceipt/capture-model';
import { describe, expect, it } from 'vitest';
import { getIssueValidationErrors, renderGitHubIssue } from '../src/index';

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';

const session: CaptureSession = {
  schemaVersion: 1,
  id: '00000000-0000-4000-8000-000000000000',
  status: 'ready-for-review',
  tabId: 1,
  windowId: 1,
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
    reproKitVersion: '0.1.4',
  },
  filtering: { redactionCount: 0, droppedEventCount: 0 },
};

describe('GitHub issue renderer', () => {
  it('renders a deterministic report', () => {
    const markdown = renderGitHubIssue(session);
    expect(markdown).toContain('# Checkout fails');
    expect(markdown).toContain('1. Pay');
    expect(markdown).toContain('Captured locally with BugReceipt');
  });

  it('includes readable and raw environment metadata', () => {
    const markdown = renderGitHubIssue(session);

    expect(markdown).toContain('- Started: 2026-08-27T12:00:00.000Z');
    expect(markdown).toContain('- Operating system: Windows 10 or 11');
    expect(markdown).toContain('- Browser: Chrome 140.0.0.0');
    expect(markdown).toContain('- Platform: Win32');
    expect(markdown).toContain(`- User agent: ${userAgent}`);
    expect(markdown).toContain('- BugReceipt: 0.1.4');
  });

  it('reports the fields that make an export incomplete', () => {
    expect(getIssueValidationErrors({ ...session, summary: '', steps: [] })).toEqual([
      'Add an issue title.',
    ]);
  });

  it('allows steps and behavior descriptions to be omitted', () => {
    expect(getIssueValidationErrors({ ...session, steps: [] })).toEqual([]);
    expect(renderGitHubIssue({ ...session, steps: [] })).toContain(
      '_No reproduction steps provided._',
    );
    expect(renderGitHubIssue({ ...session, steps: [] })).toContain('_Not provided._');
  });

  it('rejects a blank step that is still present in the draft', () => {
    expect(
      getIssueValidationErrors({
        ...session,
        expectedBehavior: 'The order should complete.',
        actualBehavior: 'The button stays disabled.',
        steps: [{ ...session.steps[0]!, text: '   ' }],
      }),
    ).toContain('Fill in or remove every reproduction step.');
  });

  it('omits the screenshot attachment prompt when no screenshot was captured', () => {
    expect(renderGitHubIssue(session)).not.toContain('Attach screenshot.png');
  });

  it('links to the locally exported screen recording when one was captured', () => {
    const markdown = renderGitHubIssue({
      ...session,
      page: {
        url: 'https://example.com',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        recording: {
          blobId: session.id,
          mimeType: 'video/webm;codecs=vp9',
          sizeBytes: 1_024,
          durationMs: 10_000,
        },
      },
    });

    expect(markdown).toContain('## Screen recording');
    expect(markdown).toContain('[Open the screen recording](./recording.webm)');
    expect(markdown).not.toContain('<!-- Attach');
  });

  it('embeds a timestamped selected frame beside its source recording', () => {
    const markdown = renderGitHubIssue({
      ...session,
      page: {
        url: 'https://example.com',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        recording: {
          blobId: session.id,
          mimeType: 'video/webm;codecs=vp9',
          sizeBytes: 1_024,
          durationMs: 10_000,
        },
        selectedFrame: {
          blobId: '00000000-0000-4000-8000-000000000004',
          mimeType: 'image/png',
          sizeBytes: 512,
          videoTimeMs: 3_067,
          width: 1_280,
          height: 720,
        },
      },
    });

    expect(markdown).toContain('## Selected video frame');
    expect(markdown).toContain('![Frame captured at 00:03.067](./selected-frame.png)');
    expect(markdown).toContain('[Open the screen recording](./recording.webm)');
  });

  it('embeds every selected frame with stable numbered filenames', () => {
    const markdown = renderGitHubIssue({
      ...session,
      page: {
        url: 'https://example.com',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        selectedFrames: [3_067, 4_500].map((videoTimeMs) => ({
          blobId: crypto.randomUUID(),
          mimeType: 'image/png' as const,
          sizeBytes: 512,
          videoTimeMs,
          width: 1_280,
          height: 720,
        })),
      },
    });

    expect(markdown).toContain('## Selected video frames');
    expect(markdown).toContain('![Frame 1 captured at 00:03.067](./selected-frame-01.png)');
    expect(markdown).toContain('![Frame 2 captured at 00:04.500](./selected-frame-02.png)');
  });

  it('includes console and network evidence in the report', () => {
    const markdown = renderGitHubIssue({
      ...session,
      diagnostics: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          occurredAt: '2026-08-27T12:00:10.000Z',
          kind: 'console',
          level: 'log',
          message: 'Submitting payment',
        },
      ],
      network: [
        {
          id: '00000000-0000-4000-8000-000000000003',
          occurredAt: '2026-08-27T12:00:11.000Z',
          method: 'POST',
          url: 'https://example.com/api/pay',
          resourceType: 'fetch',
          status: 422,
          durationMs: 125,
          requestBody: '{"amount":42}',
          responseBody: '{"error":"declined"}',
        },
      ],
    });

    expect(markdown).toContain('## Console messages');
    expect(markdown).toContain('Submitting payment');
    expect(markdown).toContain('## Network activity');
    expect(markdown).toContain('POST 422 https://example.com/api/pay');
    expect(markdown).toContain('Response: {"error":"declined"}');
  });

  it('preserves selected console and network text annotations in Markdown', () => {
    const consoleId = '00000000-0000-4000-8000-000000000002';
    const networkId = '00000000-0000-4000-8000-000000000003';
    const annotatedSession: CaptureSession = {
      ...session,
      diagnostics: [
        {
          id: consoleId,
          occurredAt: '2026-08-27T12:00:10.000Z',
          kind: 'console',
          level: 'error',
          message: 'Payment request failed',
        },
      ],
      network: [
        {
          id: networkId,
          occurredAt: '2026-08-27T12:00:11.000Z',
          method: 'POST',
          url: 'https://example.com/api/pay',
          resourceType: 'fetch',
          status: 500,
          durationMs: 125,
          responseBody: '{"error":"declined"}',
        },
      ],
    };

    const markdown = renderGitHubIssue(annotatedSession, [
      {
        id: '00000000-0000-4000-8000-000000000010',
        source: 'console',
        eventId: consoleId,
        field: 'message',
        start: 0,
        end: 7,
        color: '#ff5c3a',
      },
      {
        id: '00000000-0000-4000-8000-000000000011',
        source: 'network',
        eventId: networkId,
        field: 'responseBody',
        start: 10,
        end: 18,
        color: '#1f9fae',
      },
    ]);

    expect(markdown).toContain('⟦Payment⟧ request failed');
    expect(markdown).toContain('Response: {"error":"⟦declined⟧"}');
    expect(markdown).toContain('Annotated selections are wrapped in ⟦double brackets⟧.');
  });
});
