import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { formatJsonBody, NetworkBody } from '../src/ui/review/network-body';

afterEach(cleanup);

describe('network body JSON display', () => {
  it('formats nested JSON and the XSSI-prefixed arrays used by Google APIs', () => {
    expect(formatJsonBody('{"ok":true,"items":[1,2]}')).toBe(
      JSON.stringify({ ok: true, items: [1, 2] }, null, 2),
    );
    expect(formatJsonBody(')]}\'\n\n[["identity.hfcr",600],["di",50]]')).toBe(
      JSON.stringify(
        [
          ['identity.hfcr', 600],
          ['di', 50],
        ],
        null,
        2,
      ),
    );
    expect(formatJsonBody('not JSON')).toBeNull();
    expect(formatJsonBody('{"truncated":')).toBeNull();
  });
  it('keeps raw evidence available for annotations', () => {
    render(
      <NetworkBody value={'{"ok":true}'}>
        <span>raw evidence</span>
      </NetworkBody>,
    );
    expect(screen.getByText(/"ok": true/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'View raw' }));
    expect(screen.getByText('raw evidence')).toBeDefined();
  });
  it('opens existing annotations in raw view', () => {
    render(
      <NetworkBody value={'{"ok":true}'} annotated>
        <mark>existing highlight</mark>
      </NetworkBody>,
    );
    expect(screen.getByText('existing highlight')).toBeDefined();
  });
});
