import { describe, expect, it } from 'vitest';
import { filterPayload, filterRequestHeaders } from '@bugreceipt/privacy';

describe('request header privacy', () => {
  it('filters sensitive fields inside prefixed JSON before display', () => {
    const filtered = filterPayload(')]}\'\n{"token":"private-value","ok":true}');
    expect(filtered.value).not.toContain('private-value');
    expect(filtered.value).toContain('[REDACTED]');
  });
  it('redacts credentials and strips referrer query parameters', () => {
    const result = filterRequestHeaders([
      { name: 'Authorization', value: 'Basic private-credentials' },
      { name: 'Cookie', value: 'id=private-cookie' },
      { name: 'X-API-Key', value: 'private-key' },
      { name: 'Referer', value: 'https://example.com/?secret=private#fragment' },
      { name: 'Content-Type', value: 'application/json' },
    ]);
    expect(result.headers.map((h) => h.value)).toEqual([
      '[REDACTED]',
      '[REDACTED]',
      '[REDACTED]',
      'https://example.com/',
      'application/json',
    ]);
    expect(result.redactionCount).toBe(3);
  });
});
