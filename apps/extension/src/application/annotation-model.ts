export const ANNOTATION_COLORS = [
  { name: 'Signal coral', value: '#ff5c3a' },
  { name: 'Marker yellow', value: '#e2a90a' },
  { name: 'Trace teal', value: '#1f9fae' },
  { name: 'Evidence ink', value: '#102332' },
] as const;

export type AnnotationColor = (typeof ANNOTATION_COLORS)[number]['value'];
export type AnnotationTool = 'select' | 'marker' | 'highlight' | 'border';
export type RectangleHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type AnnotationPoint = {
  x: number;
  y: number;
};

type AnnotationBase = {
  id: string;
  color: AnnotationColor;
};

export type MarkerAnnotation = AnnotationBase & {
  kind: 'marker';
  points: AnnotationPoint[];
  strokeWidth: number;
};

export type RectangleAnnotation = AnnotationBase & {
  kind: 'highlight' | 'border';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
};

export type Annotation = MarkerAnnotation | RectangleAnnotation;

export type AnnotationDocument = {
  version: 1;
  imageWidth: number;
  imageHeight: number;
  items: Annotation[];
};

export type AnnotationHistory = {
  past: AnnotationDocument[];
  present: AnnotationDocument;
  future: AnnotationDocument[];
};

export type AnnotationCommand =
  | { type: 'add'; annotation: Annotation }
  | { type: 'replace'; annotation: Annotation }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

type DisplayBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function createAnnotationDocument(
  imageWidth: number,
  imageHeight: number,
): AnnotationDocument {
  return { version: 1, imageWidth, imageHeight, items: [] };
}

export function createAnnotationHistory(document: AnnotationDocument): AnnotationHistory {
  return { past: [], present: document, future: [] };
}

export function commitAnnotation(
  history: AnnotationHistory,
  command: AnnotationCommand,
): AnnotationHistory {
  const next = updateAnnotationDocument(history.present, command);
  if (next === history.present) return history;
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function undoAnnotation(history: AnnotationHistory): AnnotationHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoAnnotation(history: AnnotationHistory): AnnotationHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function updateAnnotationDocument(
  document: AnnotationDocument,
  command: AnnotationCommand,
): AnnotationDocument {
  if (command.type === 'clear') {
    return document.items.length === 0 ? document : { ...document, items: [] };
  }
  if (command.type === 'add') {
    return { ...document, items: [...document.items, command.annotation] };
  }
  if (command.type === 'remove') {
    const items = document.items.filter((item) => item.id !== command.id);
    return items.length === document.items.length ? document : { ...document, items };
  }
  const index = document.items.findIndex((item) => item.id === command.annotation.id);
  if (index < 0) return document;
  const items = [...document.items];
  items[index] = command.annotation;
  return { ...document, items };
}

export function clientPointToImage(
  clientX: number,
  clientY: number,
  bounds: DisplayBounds,
  document: Pick<AnnotationDocument, 'imageWidth' | 'imageHeight'>,
): AnnotationPoint {
  if (bounds.width <= 0 || bounds.height <= 0) return { x: 0, y: 0 };
  return {
    x: clamp(
      ((clientX - bounds.left) / bounds.width) * document.imageWidth,
      0,
      document.imageWidth,
    ),
    y: clamp(
      ((clientY - bounds.top) / bounds.height) * document.imageHeight,
      0,
      document.imageHeight,
    ),
  };
}

export function displayStrokeToImage(
  displayPixels: number,
  displayWidth: number,
  imageWidth: number,
): number {
  if (displayWidth <= 0) return displayPixels;
  return Math.max(1, displayPixels * (imageWidth / displayWidth));
}

export function createRectangleAnnotation({
  id,
  kind,
  start,
  end,
  color,
  strokeWidth,
}: {
  id: string;
  kind: 'highlight' | 'border';
  start: AnnotationPoint;
  end: AnnotationPoint;
  color: AnnotationColor;
  strokeWidth: number;
}): RectangleAnnotation {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  return {
    id,
    kind,
    color,
    strokeWidth,
    x: left,
    y: top,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function translateAnnotation(
  annotation: Annotation,
  delta: AnnotationPoint,
  document: Pick<AnnotationDocument, 'imageWidth' | 'imageHeight'>,
): Annotation {
  const bounds = getAnnotationBounds(annotation);
  const x = clamp(delta.x, -bounds.x, document.imageWidth - bounds.x - bounds.width);
  const y = clamp(delta.y, -bounds.y, document.imageHeight - bounds.y - bounds.height);
  if (annotation.kind === 'marker') {
    return {
      ...annotation,
      points: annotation.points.map((point) => ({ x: point.x + x, y: point.y + y })),
    };
  }
  return { ...annotation, x: annotation.x + x, y: annotation.y + y };
}

export function resizeRectangleAnnotation(
  annotation: RectangleAnnotation,
  handle: RectangleHandle,
  point: AnnotationPoint,
  document: Pick<AnnotationDocument, 'imageWidth' | 'imageHeight'>,
): RectangleAnnotation {
  const right = annotation.x + annotation.width;
  const bottom = annotation.y + annotation.height;
  const target = {
    x: clamp(point.x, 0, document.imageWidth),
    y: clamp(point.y, 0, document.imageHeight),
  };
  const opposite = {
    x: handle.includes('left') ? right : annotation.x,
    y: handle.includes('top') ? bottom : annotation.y,
  };
  return createRectangleAnnotation({ ...annotation, start: opposite, end: target });
}

export function getAnnotationBounds(annotation: Annotation): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (annotation.kind !== 'marker') {
    return {
      x: annotation.x,
      y: annotation.y,
      width: annotation.width,
      height: annotation.height,
    };
  }
  const xValues = annotation.points.map((point) => point.x);
  const yValues = annotation.points.map((point) => point.y);
  const padding = annotation.strokeWidth / 2;
  const left = Math.min(...xValues) - padding;
  const top = Math.min(...yValues) - padding;
  const right = Math.max(...xValues) + padding;
  const bottom = Math.max(...yValues) + padding;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function isAnnotationDocument(
  value: unknown,
  imageWidth: number,
  imageHeight: number,
): value is AnnotationDocument {
  if (!value || typeof value !== 'object') return false;
  const document = value as Partial<AnnotationDocument>;
  if (
    document.version !== 1 ||
    document.imageWidth !== imageWidth ||
    document.imageHeight !== imageHeight ||
    !Array.isArray(document.items)
  ) {
    return false;
  }
  return document.items.every(isAnnotation);
}

function isAnnotation(value: unknown): value is Annotation {
  if (!value || typeof value !== 'object') return false;
  const annotation = value as Partial<Annotation>;
  if (
    typeof annotation.id !== 'string' ||
    !ANNOTATION_COLORS.some((color) => color.value === annotation.color)
  ) {
    return false;
  }
  if (annotation.kind === 'marker') {
    return (
      typeof annotation.strokeWidth === 'number' &&
      Array.isArray(annotation.points) &&
      annotation.points.length > 1 &&
      annotation.points.every(
        (point) =>
          typeof point?.x === 'number' &&
          Number.isFinite(point.x) &&
          typeof point?.y === 'number' &&
          Number.isFinite(point.y),
      )
    );
  }
  return (
    (annotation.kind === 'highlight' || annotation.kind === 'border') &&
    typeof annotation.x === 'number' &&
    typeof annotation.y === 'number' &&
    typeof annotation.width === 'number' &&
    typeof annotation.height === 'number' &&
    typeof annotation.strokeWidth === 'number'
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
