import { describe, expect, it, vi } from 'vitest';
import { createAnnotationDocument } from '../src/application/annotation-model';
import { paintAnnotations } from '../src/application/render-annotations';

describe('annotation renderer', () => {
  it('paints marker, highlight, and border annotations in document order', () => {
    const calls: string[] = [];
    const save = vi.fn(() => calls.push('save'));
    const restore = vi.fn(() => calls.push('restore'));
    const context = {
      save,
      restore,
      beginPath: vi.fn(() => calls.push('begin')),
      moveTo: vi.fn((x: number, y: number) => calls.push(`move:${x},${y}`)),
      lineTo: vi.fn((x: number, y: number) => calls.push(`line:${x},${y}`)),
      stroke: vi.fn(() => calls.push('stroke')),
      fillRect: vi.fn((x: number, y: number, width: number, height: number) =>
        calls.push(`fill:${x},${y},${width},${height}`),
      ),
      strokeRect: vi.fn((x: number, y: number, width: number, height: number) =>
        calls.push(`strokeRect:${x},${y},${width},${height}`),
      ),
      set strokeStyle(_value: string) {},
      set fillStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set globalAlpha(_value: number) {},
      set lineCap(_value: CanvasLineCap) {},
      set lineJoin(_value: CanvasLineJoin) {},
    } as unknown as CanvasRenderingContext2D;
    const document = {
      ...createAnnotationDocument(1_000, 1_500),
      items: [
        {
          id: 'marker',
          kind: 'marker' as const,
          color: '#ff5c3a' as const,
          strokeWidth: 8,
          points: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        },
        {
          id: 'highlight',
          kind: 'highlight' as const,
          color: '#e2a90a' as const,
          strokeWidth: 6,
          x: 50,
          y: 60,
          width: 100,
          height: 80,
        },
        {
          id: 'border',
          kind: 'border' as const,
          color: '#1f9fae' as const,
          strokeWidth: 10,
          x: 200,
          y: 300,
          width: 120,
          height: 90,
        },
      ],
    };

    paintAnnotations(context, document);

    expect(calls).toContain('move:10,20');
    expect(calls).toContain('line:30,40');
    expect(calls).toContain('fill:50,60,100,80');
    expect(calls).toContain('strokeRect:205,305,110,80');
    expect(save).toHaveBeenCalledTimes(3);
    expect(restore).toHaveBeenCalledTimes(3);
  });
});
