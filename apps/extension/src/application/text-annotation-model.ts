import {
  evidenceTextAnnotationSchema,
  type EvidenceTextAnnotation,
} from '@bugreceipt/capture-model';

import { ANNOTATION_COLORS, type AnnotationColor } from './annotation-model';

export type TextAnnotation = Omit<EvidenceTextAnnotation, 'color'> & {
  color: AnnotationColor;
};

export type TextAnnotationDocument = {
  version: 1;
  sessionId: string;
  items: TextAnnotation[];
};

export type TextAnnotationHistory = {
  past: TextAnnotationDocument[];
  present: TextAnnotationDocument;
  future: TextAnnotationDocument[];
};

export type TextAnnotationCommand =
  { type: 'add'; annotation: TextAnnotation } | { type: 'remove'; id: string } | { type: 'clear' };

const MAX_TEXT_ANNOTATIONS = 500;

export function createTextAnnotationDocument(sessionId: string): TextAnnotationDocument {
  return { version: 1, sessionId, items: [] };
}

export function createTextAnnotationHistory(
  document: TextAnnotationDocument,
): TextAnnotationHistory {
  return { past: [], present: document, future: [] };
}

export function commitTextAnnotation(
  history: TextAnnotationHistory,
  command: TextAnnotationCommand,
): TextAnnotationHistory {
  const next = updateTextAnnotationDocument(history.present, command);
  if (next === history.present) return history;
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function undoTextAnnotation(history: TextAnnotationHistory): TextAnnotationHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoTextAnnotation(history: TextAnnotationHistory): TextAnnotationHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function updateTextAnnotationDocument(
  document: TextAnnotationDocument,
  command: TextAnnotationCommand,
): TextAnnotationDocument {
  if (command.type === 'clear') {
    return document.items.length === 0 ? document : { ...document, items: [] };
  }
  if (command.type === 'remove') {
    const items = document.items.filter((item) => item.id !== command.id);
    return items.length === document.items.length ? document : { ...document, items };
  }
  if (document.items.length >= MAX_TEXT_ANNOTATIONS) return document;
  const annotation = command.annotation;
  if (!isTextAnnotation(annotation)) return document;
  const items = document.items.filter(
    (item) => !targetsSameField(item, annotation) || !rangesOverlap(item, annotation),
  );
  return { ...document, items: [...items, annotation] };
}

export function removeTextAnnotationsForEvent(
  document: TextAnnotationDocument,
  eventId: string,
): TextAnnotationDocument {
  const items = document.items.filter((item) => item.eventId !== eventId);
  return items.length === document.items.length ? document : { ...document, items };
}

export function isTextAnnotationDocument(
  value: unknown,
  sessionId: string,
): value is TextAnnotationDocument {
  if (!value || typeof value !== 'object') return false;
  const document = value as Partial<TextAnnotationDocument>;
  return (
    document.version === 1 &&
    document.sessionId === sessionId &&
    Array.isArray(document.items) &&
    document.items.length <= MAX_TEXT_ANNOTATIONS &&
    document.items.every(isTextAnnotation)
  );
}

function isTextAnnotation(value: unknown): value is TextAnnotation {
  const result = evidenceTextAnnotationSchema.safeParse(value);
  return result.success && ANNOTATION_COLORS.some((color) => color.value === result.data.color);
}

function targetsSameField(left: TextAnnotation, right: TextAnnotation): boolean {
  return (
    left.source === right.source && left.eventId === right.eventId && left.field === right.field
  );
}

function rangesOverlap(left: TextAnnotation, right: TextAnnotation): boolean {
  return left.start < right.end && right.start < left.end;
}
