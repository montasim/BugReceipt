import { describe, expect, it } from 'vitest';
import { filterPayload, filterText, filterUrl } from '../src/index';

describe('privacy filter', () => {
  it('removes URL queries and fragments', () => {
    expect(filterUrl('https://example.com/path?token=secret#private')).toBe(
      'https://example.com/path',
    );
  });

  it('redacts emails and bearer tokens', () => {
    const result = filterText('user@example.com Bearer abc.def-123');
    expect(result.value).toBe('[REDACTED] [REDACTED]');
    expect(result.redactionCount).toBe(2);
  });

  it('redacts sensitive fields in JSON network bodies', () => {
    const result = filterPayload(
      JSON.stringify({ email: 'user@example.com', password: 'private', profile: { token: 'abc' } }),
    );
    expect(JSON.parse(result.value)).toEqual({
      email: '[REDACTED]',
      password: '[REDACTED]',
      profile: { token: '[REDACTED]' },
    });
    expect(result.redactionCount).toBe(3);
  });
});
