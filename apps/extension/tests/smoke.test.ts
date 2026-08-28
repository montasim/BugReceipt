import { runtimeRequestSchema } from '@bugreceipt/capture-model';
import { describe, expect, it } from 'vitest';

describe('extension protocol', () => {
  it('rejects unbounded manual steps before they reach the background worker', () => {
    const result = runtimeRequestSchema.safeParse({
      type: 'session:add-step',
      text: 'x'.repeat(1_001),
    });
    expect(result.success).toBe(false);
  });
});
