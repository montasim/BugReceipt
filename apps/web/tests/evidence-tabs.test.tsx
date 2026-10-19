import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EvidenceTabs } from '../src/prototypes/landing/evidence-tabs';

afterEach(cleanup);

describe('EvidenceTabs', () => {
  it('shows the visual tab first and switches with arrow keys', () => {
    render(<EvidenceTabs />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Play it.');

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Console' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Every message since recording started');
    const consoleTab = screen.getByRole('tab', { name: 'Console' });
    expect(document.activeElement).toBe(consoleTab);
    expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', consoleTab.id);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Console' }), { key: 'End' });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('The failing request');
  });

  it('leaves browser shortcuts alone', () => {
    render(<EvidenceTabs />);
    const tabs = screen.getAllByRole('tab');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight', altKey: true });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('switches on click', () => {
    render(<EvidenceTabs />);
    fireEvent.click(screen.getByRole('tab', { name: 'Network' }));
    expect(screen.getByRole('img', { name: /Network evidence tab/ })).toBeTruthy();
  });
});
