import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnnotationDocument } from '../src/application/annotation-model';
import { AnnotationOverlay } from '../src/ui/review/annotation-overlay';

afterEach(cleanup);

describe('annotation overlay cursor', () => {
  it('uses a crosshair only while a drawing tool is active in annotation mode', () => {
    const props = {
      document: createAnnotationDocument(1_280, 720),
      tool: 'marker' as const,
      color: '#ff5c3a' as const,
      displayStrokeWidth: 4,
      selectedId: null,
      onSelect: vi.fn(),
      onAdd: vi.fn(),
      onReplace: vi.fn(),
      onUpdate: vi.fn(),
      onRemove: vi.fn(),
      onTextPlaced: vi.fn(),
    };
    const { rerender } = render(<AnnotationOverlay {...props} editing />);
    const canvas = screen.getByRole('application', { name: 'Selected frame annotation canvas' });
    const surface = canvas.querySelector('[data-annotation-surface]');
    expect(canvas.getAttribute('class')).toContain('cursor-crosshair');
    expect(surface?.getAttribute('class')).toContain('pointer-events-auto');

    rerender(<AnnotationOverlay {...props} editing={false} />);
    expect(canvas.getAttribute('class')).toContain('cursor-default');
    expect(canvas.getAttribute('class')).not.toContain('cursor-crosshair');
    expect(surface?.getAttribute('class')).toContain('pointer-events-none');
  });
});
