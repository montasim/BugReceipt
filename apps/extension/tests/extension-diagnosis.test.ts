import type { CaptureSession } from '@bugreceipt/capture-model';
import { describe, expect, it } from 'vitest';
import { renderExtensionDiagnosisReport } from '../src/application/extension-diagnosis';

describe('extension diagnosis report', () => {
  it('includes useful filtered metadata without visual evidence or network bodies', () => {
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
      steps: [],
      diagnostics: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          occurredAt: '2026-08-27T12:00:30.000Z',
          kind: 'console',
          level: 'error',
          message: 'TypeError: Failed to fetch',
        },
      ],
      network: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          occurredAt: '2026-08-27T12:00:31.000Z',
          method: 'POST',
          url: 'https://example.com/api/checkout',
          resourceType: 'fetch',
          status: 500,
          durationMs: 42,
          requestBody: 'private request body',
          responseBody: 'private response body',
        },
      ],
      page: {
        url: 'https://example.com/checkout',
        title: 'Checkout',
        capturedAt: '2026-08-27T12:01:00.000Z',
        recording: {
          blobId: '00000000-0000-4000-8000-000000000003',
          mimeType: 'video/webm',
          sizeBytes: 1_024,
          durationMs: 60_000,
        },
      },
      environment: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
        platform: 'Win32',
        reproKitVersion: '0.1.4',
      },
      filtering: { redactionCount: 2, droppedEventCount: 1 },
    };

    const report = renderExtensionDiagnosisReport(session);

    expect(report).toContain('# BugReceipt diagnosis report');
    expect(report).toContain('BugReceipt version: 0.1.4');
    expect(report).toContain('Browser: Chrome 140.0.0.0');
    expect(report).toContain('TypeError: Failed to fetch');
    expect(report).toContain('POST · https://example.com/api/checkout');
    expect(report).not.toContain('private request body');
    expect(report).not.toContain('private response body');
    expect(report).toContain('Recordings, screenshots, selected frames');
  });
});
