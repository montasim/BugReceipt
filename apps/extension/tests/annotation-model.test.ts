import { describe, expect, it } from 'vitest';
import {
  clientPointToImage,
  commitAnnotation,
  createAnnotationDocument,
  createAnnotationHistory,
  createRectangleAnnotation,
  createTextNoteAnnotation,
  isAnnotationDocument,
  redoAnnotation,
  resizeRectangleAnnotation,
  translateAnnotation,
  undoAnnotation,
  type MarkerAnnotation,
  type TextNoteAnnotation,
} from '../src/application/annotation-model';

describe('annotation model', () => {
  it('maps a scaled pointer into intrinsic frame coordinates', () => {
    expect(
      clientPointToImage(
        250,
        450,
        { left: 50, top: 50, width: 400, height: 800 },
        { imageWidth: 2_000, imageHeight: 4_000 },
      ),
    ).toEqual({ x: 1_000, y: 2_000 });
  });

  it('commits annotations through undo and redo history', () => {
    const rectangle = createRectangleAnnotation({
      id: 'border-1',
      kind: 'border',
      start: { x: 300, y: 400 },
      end: { x: 100, y: 200 },
      color: '#ff5c3a',
      strokeWidth: 8,
    });
    const initial = createAnnotationHistory(createAnnotationDocument(1_200, 1_800));
    const committed = commitAnnotation(initial, { type: 'add', annotation: rectangle });

    expect(committed.present.items).toEqual([
      expect.objectContaining({ x: 100, y: 200, width: 200, height: 200 }),
    ]);
    expect(undoAnnotation(committed).present.items).toHaveLength(0);
    expect(redoAnnotation(undoAnnotation(committed)).present.items).toHaveLength(1);
  });

  it('keeps moved and resized annotations inside the frame', () => {
    const document = createAnnotationDocument(1_000, 800);
    const border = createRectangleAnnotation({
      id: 'border-1',
      kind: 'border',
      start: { x: 100, y: 100 },
      end: { x: 300, y: 250 },
      color: '#1f9fae',
      strokeWidth: 6,
    });

    expect(translateAnnotation(border, { x: 900, y: 700 }, document)).toEqual(
      expect.objectContaining({ x: 800, y: 650 }),
    );
    expect(resizeRectangleAnnotation(border, 'top-left', { x: -100, y: -100 }, document)).toEqual(
      expect.objectContaining({ x: 0, y: 0, width: 300, height: 250 }),
    );
  });

  it('moves a marker as one annotation', () => {
    const marker: MarkerAnnotation = {
      id: 'marker-1',
      kind: 'marker',
      color: '#102332',
      strokeWidth: 10,
      points: [
        { x: 50, y: 60 },
        { x: 90, y: 120 },
      ],
    };

    expect(
      translateAnnotation(marker, { x: -200, y: -200 }, createAnnotationDocument(500, 500)),
    ).toEqual(
      expect.objectContaining({
        points: [
          { x: 5, y: 5 },
          { x: 45, y: 65 },
        ],
      }),
    );
  });

  it('creates, validates, moves, and resizes a text note inside the frame', () => {
    const document = createAnnotationDocument(1_600, 900);
    const note = createTextNoteAnnotation({
      id: 'note-1',
      anchor: { x: 1_500, y: 850 },
      color: '#e2a90a',
      document,
    });
    const populated: TextNoteAnnotation = { ...note, text: 'Check the total before submitting.' };
    const withNote = { ...document, items: [populated] };

    expect(note).toEqual(
      expect.objectContaining({ kind: 'text', x: 1_088, y: 738, width: 512, height: 162 }),
    );
    expect(isAnnotationDocument(withNote, 1_600, 900)).toBe(true);
    expect(translateAnnotation(populated, { x: -2_000, y: -2_000 }, document)).toEqual(
      expect.objectContaining({ x: 0, y: 0 }),
    );
    expect(resizeRectangleAnnotation(populated, 'top-left', { x: 900, y: 600 }, document)).toEqual(
      expect.objectContaining({ x: 900, y: 600, width: 700, height: 300 }),
    );
  });
});
