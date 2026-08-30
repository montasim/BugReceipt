import { useState } from 'react';
import type {
  Annotation,
  AnnotationColor,
  AnnotationDocument,
  AnnotationPoint,
  AnnotationTool,
  MarkerAnnotation,
  RectangleAnnotation,
  RectangleHandle,
} from '../../application/annotation-model';
import {
  clientPointToImage,
  createRectangleAnnotation,
  displayStrokeToImage,
  getAnnotationBounds,
  resizeRectangleAnnotation,
  translateAnnotation,
} from '../../application/annotation-model';

type Gesture =
  | { type: 'draw-rectangle'; start: AnnotationPoint }
  | { type: 'draw-marker'; start: AnnotationPoint }
  | { type: 'move'; start: AnnotationPoint; source: Annotation }
  | {
      type: 'resize';
      start: AnnotationPoint;
      source: RectangleAnnotation;
      handle: RectangleHandle;
    };

type AnnotationOverlayProps = {
  ariaLabel?: string;
  document: AnnotationDocument;
  editing: boolean;
  tool: AnnotationTool;
  color: AnnotationColor;
  displayStrokeWidth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (annotation: Annotation) => void;
  onReplace: (annotation: Annotation) => void;
};

export function AnnotationOverlay({
  ariaLabel = 'Selected frame annotation canvas',
  document,
  editing,
  tool,
  color,
  displayStrokeWidth,
  selectedId,
  onSelect,
  onAdd,
  onReplace,
}: AnnotationOverlayProps) {
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const selected = document.items.find((item) => item.id === selectedId) ?? null;
  const items = draft
    ? [...document.items.filter((item) => item.id !== draft.id), draft]
    : document.items;

  function imagePoint(event: React.PointerEvent<SVGSVGElement>): AnnotationPoint {
    return clientPointToImage(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      document,
    );
  }

  function pointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!editing) return;
    if (tool === 'select') {
      onSelect(null);
      return;
    }
    const start = imagePoint(event);
    const strokeWidth = displayStrokeToImage(
      displayStrokeWidth,
      event.currentTarget.getBoundingClientRect().width,
      document.imageWidth,
    );
    const id = createAnnotationId();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === 'marker') {
      const annotation: MarkerAnnotation = {
        id,
        kind: 'marker',
        color,
        strokeWidth,
        points: [start],
      };
      setGesture({ type: 'draw-marker', start });
      setDraft(annotation);
    } else {
      setGesture({ type: 'draw-rectangle', start });
      setDraft(
        createRectangleAnnotation({ id, kind: tool, start, end: start, color, strokeWidth }),
      );
    }
    onSelect(id);
  }

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!gesture || !draft) return;
    const point = imagePoint(event);
    if (gesture.type === 'draw-marker' && draft.kind === 'marker') {
      const previous = draft.points.at(-1) ?? gesture.start;
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < draft.strokeWidth / 3) return;
      setDraft({ ...draft, points: [...draft.points, point] });
      return;
    }
    if (gesture.type === 'draw-rectangle' && draft.kind !== 'marker') {
      setDraft(createRectangleAnnotation({ ...draft, start: gesture.start, end: point }));
      return;
    }
    if (gesture.type === 'move') {
      setDraft(
        translateAnnotation(
          gesture.source,
          { x: point.x - gesture.start.x, y: point.y - gesture.start.y },
          document,
        ),
      );
      return;
    }
    if (gesture.type === 'resize' && draft.kind !== 'marker') {
      setDraft(resizeRectangleAnnotation(gesture.source, gesture.handle, point, document));
    }
  }

  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!gesture || !draft) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const isNew = gesture.type === 'draw-marker' || gesture.type === 'draw-rectangle';
    const isUseful =
      draft.kind === 'marker'
        ? draft.points.length > 1
        : draft.width >= draft.strokeWidth && draft.height >= draft.strokeWidth;
    if (isUseful) {
      if (isNew) onAdd(draft);
      else onReplace(draft);
    } else if (isNew) {
      onSelect(null);
    }
    setGesture(null);
    setDraft(null);
  }

  function startMove(event: React.PointerEvent<SVGGElement>, annotation: Annotation) {
    if (!editing || tool !== 'select') return;
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const start = clientPointToImage(
      event.clientX,
      event.clientY,
      svg.getBoundingClientRect(),
      document,
    );
    svg.setPointerCapture(event.pointerId);
    setGesture({ type: 'move', start, source: annotation });
    setDraft(annotation);
    onSelect(annotation.id);
  }

  function startResize(
    event: React.PointerEvent<SVGRectElement>,
    annotation: RectangleAnnotation,
    handle: RectangleHandle,
  ) {
    if (!editing || tool !== 'select') return;
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const start = clientPointToImage(
      event.clientX,
      event.clientY,
      svg.getBoundingClientRect(),
      document,
    );
    svg.setPointerCapture(event.pointerId);
    setGesture({ type: 'resize', start, source: annotation, handle });
    setDraft(annotation);
  }

  return (
    <svg
      className={`frame-annotation-overlay${editing ? ' is-editing' : ''}${tool !== 'select' ? ' is-drawing' : ''}`}
      viewBox={`0 0 ${document.imageWidth} ${document.imageHeight}`}
      preserveAspectRatio="none"
      role={editing ? 'application' : undefined}
      aria-label={editing ? ariaLabel : undefined}
      aria-hidden={editing ? undefined : true}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      {items.map((annotation) => (
        <AnnotationShape
          key={annotation.id}
          annotation={annotation}
          editing={editing}
          selected={annotation.id === selectedId}
          tool={tool}
          onPointerDown={(event) => startMove(event, annotation)}
          onFocus={() => onSelect(annotation.id)}
        />
      ))}
      {selected && selected.kind !== 'marker' && tool === 'select' ? (
        <SelectionHandles
          annotation={draft?.id === selected.id && draft.kind !== 'marker' ? draft : selected}
          imageWidth={document.imageWidth}
          onPointerDown={startResize}
        />
      ) : null}
    </svg>
  );
}

function AnnotationShape({
  annotation,
  editing,
  selected,
  tool,
  onPointerDown,
  onFocus,
}: {
  annotation: Annotation;
  editing: boolean;
  selected: boolean;
  tool: AnnotationTool;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
  onFocus: () => void;
}) {
  const bounds = getAnnotationBounds(annotation);
  return (
    <g
      className={`frame-annotation-shape${selected ? ' is-selected' : ''}`}
      data-annotation-id={annotation.id}
      role={editing ? 'button' : undefined}
      aria-label={editing ? `${annotation.kind} annotation` : undefined}
      tabIndex={editing && tool === 'select' ? 0 : -1}
      onPointerDown={onPointerDown}
      onFocus={onFocus}
    >
      {annotation.kind === 'marker' ? (
        <path
          d={markerPath(annotation.points)}
          fill="none"
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.82"
        />
      ) : annotation.kind === 'highlight' ? (
        <rect
          x={annotation.x}
          y={annotation.y}
          width={annotation.width}
          height={annotation.height}
          fill={annotation.color}
          opacity="0.28"
        />
      ) : (
        <rect
          x={annotation.x + annotation.strokeWidth / 2}
          y={annotation.y + annotation.strokeWidth / 2}
          width={Math.max(0, annotation.width - annotation.strokeWidth)}
          height={Math.max(0, annotation.height - annotation.strokeWidth)}
          fill="none"
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
        />
      )}
      {selected ? (
        <rect
          className="frame-annotation-hit-area"
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
        />
      ) : null}
    </g>
  );
}

function SelectionHandles({
  annotation,
  imageWidth,
  onPointerDown,
}: {
  annotation: RectangleAnnotation;
  imageWidth: number;
  onPointerDown: (
    event: React.PointerEvent<SVGRectElement>,
    annotation: RectangleAnnotation,
    handle: RectangleHandle,
  ) => void;
}) {
  const handleSize = Math.max(12, imageWidth / 95);
  const half = handleSize / 2;
  const handles: Array<{ name: RectangleHandle; x: number; y: number }> = [
    { name: 'top-left', x: annotation.x, y: annotation.y },
    { name: 'top-right', x: annotation.x + annotation.width, y: annotation.y },
    { name: 'bottom-left', x: annotation.x, y: annotation.y + annotation.height },
    {
      name: 'bottom-right',
      x: annotation.x + annotation.width,
      y: annotation.y + annotation.height,
    },
  ];
  return (
    <g className="frame-annotation-selection">
      <rect x={annotation.x} y={annotation.y} width={annotation.width} height={annotation.height} />
      {handles.map((handle) => (
        <rect
          key={handle.name}
          className="frame-annotation-handle"
          x={handle.x - half}
          y={handle.y - half}
          width={handleSize}
          height={handleSize}
          onPointerDown={(event) => onPointerDown(event, annotation, handle.name)}
        />
      ))}
    </g>
  );
}

function markerPath(points: AnnotationPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

function createAnnotationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `annotation-${Date.now()}-${Math.random()}`;
}
