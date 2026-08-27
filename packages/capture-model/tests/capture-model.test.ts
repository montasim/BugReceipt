import { describe, expect, it } from 'vitest';
import { captureSessionSchema, runtimeRequestSchema } from '../src/index';

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
});
