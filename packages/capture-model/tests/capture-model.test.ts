import { describe, expect, it } from 'vitest';
import {
  captureSessionSchema,
  describeCaptureEnvironment,
  evidenceTextAnnotationSchema,
  runtimeRequestSchema,
} from '../src/index';

describe('capture contracts', () => {
  it('accepts a bounded start-session request', () => {
    expect(
      runtimeRequestSchema.parse({
        type: 'session:start',
        tabId: 7,
        sessionId: '00000000-0000-4000-8000-000000000000',
      }),
    ).toEqual({
      type: 'session:start',
      tabId: 7,
      sessionId: '00000000-0000-4000-8000-000000000000',
    });
  });

  it('rejects invalid session transitions at the data seam', () => {
    const result = captureSessionSchema.safeParse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      status: 'uploaded',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a reviewable capture interruption reason', () => {
    const result = captureSessionSchema.safeParse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      status: 'ready-for-review',
      tabId: 7,
      windowId: 2,
      origin: 'https://example.com',
      startedAt: new Date().toISOString(),
      stoppedAt: new Date().toISOString(),
      summary: 'Bug report',
      expectedBehavior: '',
      actualBehavior: '',
      steps: [],
      diagnostics: [],
      endReason: 'tab-closed',
      filtering: { redactionCount: 0, droppedEventCount: 0 },
    });

    expect(result.success && result.data.endReason).toBe('tab-closed');
  });

  it('accepts a bounded review draft update', () => {
    const request = runtimeRequestSchema.parse({
      type: 'session:update-review',
      summary: 'Checkout fails',
      expectedBehavior: 'The order should complete.',
      actualBehavior: 'The payment button stays disabled.',
      steps: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          position: 0,
          text: 'Open checkout',
        },
      ],
    });

    expect(request.type).toBe('session:update-review');
  });

  it('accepts bounded metadata for a locally selected video frame', () => {
    const request = runtimeRequestSchema.parse({
      type: 'session:set-selected-frame',
      frame: {
        blobId: '00000000-0000-4000-8000-000000000004',
        mimeType: 'image/png',
        sizeBytes: 24_000,
        videoTimeMs: 3_067,
        width: 1_280,
        height: 720,
      },
    });

    expect(request.type).toBe('session:set-selected-frame');
  });

  it('rejects selected frame metadata outside the recording duration ceiling', () => {
    const result = runtimeRequestSchema.safeParse({
      type: 'session:set-selected-frame',
      frame: {
        blobId: '00000000-0000-4000-8000-000000000004',
        mimeType: 'image/png',
        sizeBytes: 24_000,
        videoTimeMs: 3_600_001,
        width: 1_280,
        height: 720,
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts a bounded text selection tied to captured evidence', () => {
    expect(
      evidenceTextAnnotationSchema.parse({
        id: '00000000-0000-4000-8000-000000000010',
        source: 'network',
        eventId: '00000000-0000-4000-8000-000000000011',
        field: 'responseBody',
        start: 10,
        end: 18,
        color: '#e2a90a',
      }),
    ).toMatchObject({ start: 10, end: 18 });
  });

  it('rejects an empty or reversed evidence text selection', () => {
    const result = evidenceTextAnnotationSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000010',
      source: 'console',
      eventId: '00000000-0000-4000-8000-000000000011',
      field: 'message',
      start: 18,
      end: 10,
      color: '#e2a90a',
    });

    expect(result.success).toBe(false);
  });

  it('describes the browser and operating system from captured environment data', () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';

    expect(
      describeCaptureEnvironment({
        userAgent,
        platform: 'Win32',
        reproKitVersion: '0.1.3',
      }),
    ).toEqual({
      browser: 'Microsoft Edge 140.0.0.0',
      operatingSystem: 'Windows 10 or 11',
      platform: 'Win32',
      userAgent,
    });
  });

  it('uses explicit unknown values when environment metadata is unavailable', () => {
    expect(describeCaptureEnvironment(undefined)).toEqual({
      browser: 'Unknown',
      operatingSystem: 'Unknown',
      platform: 'Unknown',
      userAgent: 'Unknown',
    });
  });
});
