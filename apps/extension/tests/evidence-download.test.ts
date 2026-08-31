import type { CaptureSession } from '@bugreceipt/capture-model';
import { describe, expect, it } from 'vitest';
import {
  serializeConsoleEvidence,
  serializeNetworkEvidenceAsHar,
} from '../src/infrastructure/evidence-download';

interface ConsoleEvidenceExport {
  schemaVersion: number;
  source: string;
  capture: {
    id: string;
    page: { title: string; url: string };
  };
  filtering: CaptureSession['filtering'];
  events: CaptureSession['diagnostics'];
}

interface HarEvidenceExport {
  log: {
    version: string;
    creator: { name: string; version: string };
    entries: Array<{
      startedDateTime: string;
      time: number;
      request: {
        method: string;
        url: string;
        queryString: Array<{ name: string; value: string }>;
        postData?: { text: string };
      };
      response: { status: number; content: { text?: string } };
      timings: { send: number; wait: number; receive: number };
      _resourceType: string;
    }>;
    _bugReceipt: { filtering: CaptureSession['filtering'] };
  };
}

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
      id: '00000000-0000-4000-8000-000000000010',
      occurredAt: '2026-08-27T12:00:15.000Z',
      kind: 'console',
      level: 'error',
      message: 'Payment request failed',
      stack: 'at submit (checkout.js:42:3)',
    },
  ],
  network: [
    {
      id: '00000000-0000-4000-8000-000000000011',
      occurredAt: '2026-08-27T12:00:15.100Z',
      method: 'POST',
      url: 'https://example.com/api/payment?attempt=2',
      resourceType: 'fetch',
      status: 500,
      durationMs: 235,
      requestBody: '{"amount":12900}',
      responseBody: '{"error":"declined"}',
    },
  ],
  page: {
    url: 'https://example.com/checkout',
    title: 'Checkout',
    capturedAt: '2026-08-27T12:01:00.000Z',
  },
  environment: {
    userAgent: 'Chrome test agent',
    platform: 'Win32',
    reproKitVersion: '0.1.5',
  },
  filtering: { redactionCount: 2, droppedEventCount: 1 },
};

describe('diagnostic evidence downloads', () => {
  it('serializes retained console evidence with capture and filtering context', () => {
    const output = JSON.parse(serializeConsoleEvidence(session)) as ConsoleEvidenceExport;

    expect(output).toMatchObject({
      schemaVersion: 1,
      source: 'console',
      capture: {
        id: session.id,
        page: { title: 'Checkout', url: 'https://example.com/checkout' },
      },
      filtering: { redactionCount: 2, droppedEventCount: 1 },
    });
    expect(output.events).toEqual(session.diagnostics);
  });

  it('serializes retained network evidence as an importable HAR 1.2 document', () => {
    const output = JSON.parse(serializeNetworkEvidenceAsHar(session)) as HarEvidenceExport;
    const entry = output.log.entries[0];

    expect(output.log.version).toBe('1.2');
    expect(output.log.creator).toEqual({ name: 'BugReceipt', version: '0.1.5' });
    expect(entry).toMatchObject({
      startedDateTime: '2026-08-27T12:00:15.100Z',
      time: 235,
      request: {
        method: 'POST',
        url: 'https://example.com/api/payment?attempt=2',
        queryString: [{ name: 'attempt', value: '2' }],
        postData: { text: '{"amount":12900}' },
      },
      response: {
        status: 500,
        content: { text: '{"error":"declined"}' },
      },
      timings: { send: 0, wait: 235, receive: 0 },
      _resourceType: 'fetch',
    });
    expect(output.log._bugReceipt.filtering).toEqual(session.filtering);
  });
});
