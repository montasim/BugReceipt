import { describe, expect, it } from 'vitest';

import {
  commitTextAnnotation,
  createTextAnnotationDocument,
  createTextAnnotationHistory,
  isTextAnnotationDocument,
  redoTextAnnotation,
  removeTextAnnotationsForEvent,
  undoTextAnnotation,
  type TextAnnotation,
} from '../src/application/text-annotation-model';

const annotation: TextAnnotation = {
  id: '00000000-0000-4000-8000-000000000010',
  source: 'console',
  eventId: '00000000-0000-4000-8000-000000000011',
  field: 'message',
  start: 4,
  end: 11,
  color: '#ff5c3a',
};

describe('text annotation model', () => {
  it('commits selections through undo and redo history', () => {
    const initial = createTextAnnotationHistory(
      createTextAnnotationDocument('00000000-0000-4000-8000-000000000000'),
    );
    const committed = commitTextAnnotation(initial, { type: 'add', annotation });

    expect(committed.present.items).toEqual([annotation]);
    expect(undoTextAnnotation(committed).present.items).toHaveLength(0);
    expect(redoTextAnnotation(undoTextAnnotation(committed)).present.items).toEqual([annotation]);
  });

  it('replaces an overlapping selection in the same evidence field', () => {
    const initial = createTextAnnotationHistory({
      ...createTextAnnotationDocument('00000000-0000-4000-8000-000000000000'),
      items: [annotation],
    });
    const replacement: TextAnnotation = {
      ...annotation,
      id: '00000000-0000-4000-8000-000000000012',
      start: 8,
      end: 16,
      color: '#1f9fae',
    };

    expect(
      commitTextAnnotation(initial, { type: 'add', annotation: replacement }).present.items,
    ).toEqual([replacement]);
  });

  it('removes annotations when their source evidence is deleted', () => {
    const document = {
      ...createTextAnnotationDocument('00000000-0000-4000-8000-000000000000'),
      items: [annotation],
    };

    expect(removeTextAnnotationsForEvent(document, annotation.eventId).items).toHaveLength(0);
  });

  it('validates the stored document against its capture session', () => {
    const document = {
      ...createTextAnnotationDocument('00000000-0000-4000-8000-000000000000'),
      items: [annotation],
    };

    expect(isTextAnnotationDocument(document, document.sessionId)).toBe(true);
    expect(isTextAnnotationDocument(document, '00000000-0000-4000-8000-000000000099')).toBe(false);
  });
});
