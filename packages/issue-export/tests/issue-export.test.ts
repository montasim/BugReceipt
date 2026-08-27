import type { CaptureSession } from '@reprokit/capture-model';
import { describe, expect, it } from 'vitest';
import { getIssueValidationErrors, renderGitHubIssue } from '../src/index';

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
  filtering: { redactionCount: 0, droppedEventCount: 0 },
};

describe('GitHub issue renderer', () => {
  it('renders a deterministic report', () => {
    const markdown = renderGitHubIssue(session);
    expect(markdown).toContain('# Checkout fails');
    expect(markdown).toContain('1. Pay');
    expect(markdown).toContain('Captured locally with ReproKit');
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
});
