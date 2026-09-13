import { useRef, useState, type CSSProperties } from 'react';
import type {
  Annotation,
  AnnotationColor,
  AnnotationDocument,
  AnnotationPoint,
  AnnotationTool,
  MarkerAnnotation,
  ResizableAnnotation,
  RectangleHandle,
  TextNoteAnnotation,
} from '../../application/annotation-model';
import {
  clientPointToImage,
  createRectangleAnnotation,
  createTextNoteAnnotation,
  displayStrokeToImage,
  getAnnotationBounds,
  MAX_ANNOTATION_NOTE_LENGTH,
  resizeRectangleAnnotation,
  translateAnnotation,
} from '../../application/annotation-model';
import { useOffensiveLanguageValidation } from '../use-offensive-language-validation';

type Gesture =
  | { type: 'draw-rectangle'; start: AnnotationPoint }
  | { type: 'draw-marker'; start: AnnotationPoint }
  | { type: 'move'; start: AnnotationPoint; source: Annotation }
  | {
      type: 'resize';
      start: AnnotationPoint;
      source: ResizableAnnotation;
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
  onUpdate: (annotation: Annotation) => void;
  onRemove: (id: string) => void;
  onTextPlaced: () => void;
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
  onUpdate,
  onRemove,
  onTextPlaced,
}: AnnotationOverlayProps) {
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const draftRef = useRef<Annotation | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditHasHistoryEntry, setTextEditHasHistoryEntry] = useState(false);
  const suppressTextClick = useRef(false);
  const gestureHasHistoryEntry = useRef(false);
  const selected = document.items.find((item) => item.id === selectedId) ?? null;
  const activeEditingTextId =
    editing &&
    (tool === 'select' || tool === 'text') &&
    document.items.some((item) => item.id === editingTextId)
      ? editingTextId
      : null;
  const items = draft
    ? [...document.items.filter((item) => item.id !== draft.id), draft]
    : document.items;

  function updateDraft(next: Annotation | null) {
    draftRef.current = next;
    setDraft(next);
  }

  function imagePoint(event: React.MouseEvent<SVGSVGElement>): AnnotationPoint {
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
    if (tool === 'text') return;
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
      updateDraft(annotation);
    } else {
      setGesture({ type: 'draw-rectangle', start });
      updateDraft(
        createRectangleAnnotation({ id, kind: tool, start, end: start, color, strokeWidth }),
      );
    }
    onSelect(id);
  }

  function click(event: React.MouseEvent<SVGSVGElement>) {
    if (
      !editing ||
      tool !== 'text' ||
      !(event.target instanceof Element) ||
      !event.target.classList.contains('frame-annotation-interaction-surface')
    ) {
      return;
    }
    const id = createAnnotationId();
    const annotation = createTextNoteAnnotation({
      id,
      anchor: imagePoint(event),
      color,
      document,
    });
    onAdd(annotation);
    onSelect(id);
    setEditingTextId(id);
    setTextEditHasHistoryEntry(true);
    onTextPlaced();
  }

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!gesture || !draft) return;
    const point = imagePoint(event);
    if (gesture.type === 'draw-marker' && draft.kind === 'marker') {
      const previous = draft.points.at(-1) ?? gesture.start;
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < draft.strokeWidth / 3) return;
      updateDraft({ ...draft, points: [...draft.points, point] });
      return;
    }
    if (gesture.type === 'draw-rectangle' && draft.kind !== 'marker' && draft.kind !== 'text') {
      updateDraft(createRectangleAnnotation({ ...draft, start: gesture.start, end: point }));
      return;
    }
    if (gesture.type === 'move') {
      const distance = Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y);
      if (gesture.source.kind === 'text' && distance <= 3) return;
      if (gesture.source.kind === 'text' && distance > 3) {
        suppressTextClick.current = true;
      }
      const next = translateAnnotation(
        gesture.source,
        { x: point.x - gesture.start.x, y: point.y - gesture.start.y },
        document,
      );
      updateDraft(next);
      if (gestureHasHistoryEntry.current) onUpdate(next);
      else {
        onReplace(next);
        gestureHasHistoryEntry.current = true;
      }
      return;
    }
    if (gesture.type === 'resize' && draft.kind !== 'marker') {
      const next = resizeRectangleAnnotation(gesture.source, gesture.handle, point, document);
      updateDraft(next);
      if (gestureHasHistoryEntry.current) onUpdate(next);
      else {
        onReplace(next);
        gestureHasHistoryEntry.current = true;
      }
    }
  }

  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const finalDraft = draftRef.current;
    if (!gesture || !finalDraft) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (gesture.type === 'move' && gesture.source.kind === 'text' && !suppressTextClick.current) {
      setEditingTextId(gesture.source.id);
      setTextEditHasHistoryEntry(false);
      onSelect(gesture.source.id);
      setGesture(null);
      updateDraft(null);
      return;
    }
    const isNew = gesture.type === 'draw-marker' || gesture.type === 'draw-rectangle';
    const isUseful =
      finalDraft.kind === 'marker'
        ? finalDraft.points.length > 1
        : finalDraft.kind === 'text'
          ? finalDraft.width >= finalDraft.fontSize * 4 &&
            finalDraft.height >= finalDraft.fontSize * 2.5
          : finalDraft.width >= finalDraft.strokeWidth &&
            finalDraft.height >= finalDraft.strokeWidth;
    if (isUseful) {
      if (isNew) onAdd(finalDraft);
      else if (!gestureHasHistoryEntry.current) onReplace(finalDraft);
    } else if (isNew) {
      onSelect(null);
    }
    if (suppressTextClick.current) {
      globalThis.setTimeout(() => {
        suppressTextClick.current = false;
      }, 0);
    }
    setGesture(null);
    updateDraft(null);
    gestureHasHistoryEntry.current = false;
  }

  function startMove(event: React.PointerEvent<SVGElement>, annotation: Annotation) {
    if (!editing || tool !== 'select') return;
    suppressTextClick.current = false;
    gestureHasHistoryEntry.current = false;
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
    updateDraft(annotation);
    onSelect(annotation.id);
  }

  function startResize(
    event: React.PointerEvent<SVGRectElement>,
    annotation: ResizableAnnotation,
    handle: RectangleHandle,
  ) {
    if (!editing || tool !== 'select') return;
    gestureHasHistoryEntry.current = false;
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
    updateDraft(annotation);
  }

  function beginTextEdit(event: React.SyntheticEvent, annotation: TextNoteAnnotation) {
    if (!editing || tool !== 'select') return;
    event.preventDefault();
    event.stopPropagation();
    if (suppressTextClick.current) {
      suppressTextClick.current = false;
      return;
    }
    setEditingTextId(annotation.id);
    setTextEditHasHistoryEntry(false);
    onSelect(annotation.id);
  }

  function updateTextNote(annotation: TextNoteAnnotation, text: string) {
    const size = measureTextNote(text, annotation, document);
    const next = {
      ...annotation,
      text: text.slice(0, MAX_ANNOTATION_NOTE_LENGTH),
      ...size,
    };
    if (textEditHasHistoryEntry) {
      onUpdate(next);
    } else {
      onReplace(next);
      setTextEditHasHistoryEntry(true);
    }
  }

  function finishTextEdit(annotation: TextNoteAnnotation) {
    setEditingTextId(null);
    if (!annotation.text.trim()) {
      onRemove(annotation.id);
      onSelect(null);
    }
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
      onClick={click}
    >
      <rect
        className="frame-annotation-interaction-surface"
        x="0"
        y="0"
        width={document.imageWidth}
        height={document.imageHeight}
        fill="transparent"
      />
      {items.map((annotation) => (
        <AnnotationShape
          key={annotation.id}
          annotation={annotation}
          editing={editing}
          selected={annotation.id === selectedId}
          tool={tool}
          textEditing={annotation.kind === 'text' && annotation.id === activeEditingTextId}
          onPointerDown={(event) => startMove(event, annotation)}
          onFocus={() => onSelect(annotation.id)}
          onBeginTextEdit={(event) =>
            annotation.kind === 'text' ? beginTextEdit(event, annotation) : undefined
          }
          onTextChange={(text) =>
            annotation.kind === 'text' ? updateTextNote(annotation, text) : undefined
          }
          onFinishTextEdit={() =>
            annotation.kind === 'text' ? finishTextEdit(annotation) : undefined
          }
        />
      ))}
      {selected &&
      selected.kind !== 'marker' &&
      tool === 'select' &&
      activeEditingTextId !== selected.id ? (
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
  textEditing,
  onPointerDown,
  onFocus,
  onBeginTextEdit,
  onTextChange,
  onFinishTextEdit,
}: {
  annotation: Annotation;
  editing: boolean;
  selected: boolean;
  tool: AnnotationTool;
  textEditing: boolean;
  onPointerDown: (event: React.PointerEvent<SVGElement>) => void;
  onFocus: () => void;
  onBeginTextEdit: (event: React.SyntheticEvent) => void;
  onTextChange: (text: string) => void;
  onFinishTextEdit: () => void;
}) {
  const bounds = getAnnotationBounds(annotation);
  return (
    <g
      className={`frame-annotation-shape${selected ? ' is-selected' : ''}${textEditing ? ' is-text-editing' : ''}`}
      data-annotation-id={annotation.id}
      role={editing && !textEditing ? 'button' : undefined}
      aria-label={editing ? `${annotation.kind} annotation` : undefined}
      tabIndex={editing && tool === 'select' && !textEditing ? 0 : -1}
      onPointerDown={onPointerDown}
      onClick={annotation.kind === 'text' ? onBeginTextEdit : undefined}
      onDoubleClick={annotation.kind === 'text' ? onBeginTextEdit : undefined}
      onKeyDown={(event) => {
        if (annotation.kind === 'text' && event.key === 'Enter') onBeginTextEdit(event);
      }}
      onFocus={onFocus}
    >
      {annotation.kind === 'marker' ? (
        <path
          d={markerPath(annotation.points)}
          fill="none"
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          vectorEffect="non-scaling-stroke"
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
      ) : annotation.kind === 'text' ? (
        <TextNoteShape
          annotation={annotation}
          editing={textEditing}
          onChange={onTextChange}
          onFinish={onFinishTextEdit}
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
          vectorEffect="non-scaling-stroke"
        />
      )}
      {selected && !textEditing ? (
        <rect
          className={`frame-annotation-hit-area${annotation.kind === 'text' ? ' frame-annotation-note-move-surface' : ''}`}
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          onPointerDown={annotation.kind === 'text' ? onPointerDown : undefined}
        />
      ) : null}
    </g>
  );
}

function TextNoteShape({
  annotation,
  editing,
  onChange,
  onFinish,
}: {
  annotation: TextNoteAnnotation;
  editing: boolean;
  onChange: (text: string) => void;
  onFinish: () => void;
}) {
  const moderation = useOffensiveLanguageValidation(annotation.text);
  const errorId = `annotation-note-error-${annotation.id}`;
  const style = {
    '--annotation-note-color': annotation.color,
    '--annotation-note-font-size': `${annotation.fontSize}px`,
  } as CSSProperties;
  return (
    <foreignObject
      className="frame-annotation-note"
      x={annotation.x}
      y={annotation.y}
      width={annotation.width}
      height={annotation.height}
      style={{ pointerEvents: 'all' }}
    >
      <div className={`frame-annotation-note-card${editing ? ' is-editing' : ''}`} style={style}>
        {editing ? (
          <>
            <textarea
              autoFocus
              aria-label="Note text"
              aria-busy={moderation.checking}
              aria-invalid={Boolean(moderation.error)}
              aria-describedby={moderation.error ? errorId : undefined}
              maxLength={MAX_ANNOTATION_NOTE_LENGTH}
              placeholder="Type a note…"
              value={annotation.text}
              onChange={(event) => onChange(event.currentTarget.value)}
              onBlur={onFinish}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (
                  event.key === 'Escape' ||
                  ((event.metaKey || event.ctrlKey) && event.key === 'Enter')
                ) {
                  event.currentTarget.blur();
                }
              }}
            />
            {moderation.error ? (
              <span id={errorId} className="frame-annotation-note-error" role="alert">
                {moderation.error}
              </span>
            ) : null}
          </>
        ) : (
          <p>{annotation.text || 'Type a note…'}</p>
        )}
      </div>
    </foreignObject>
  );
}

function measureTextNote(
  text: string,
  annotation: TextNoteAnnotation,
  document: Pick<AnnotationDocument, 'imageWidth' | 'imageHeight'>,
): Pick<TextNoteAnnotation, 'width' | 'height'> {
  const horizontalChrome = annotation.fontSize * 1.3;
  const verticalChrome = annotation.fontSize * 1.71;
  const availableWidth = Math.max(
    annotation.fontSize * 3,
    document.imageWidth - annotation.x - horizontalChrome,
  );
  const characterWidth = annotation.fontSize * 0.58;
  const lines = (text || 'Type a note…').split('\n');
  const lineWidths = lines.map((line) => Math.max(characterWidth, line.length * characterWidth));
  const contentWidth = Math.min(Math.max(...lineWidths), availableWidth);
  const visualLineCount = lineWidths.reduce(
    (count, width) => count + Math.max(1, Math.ceil(width / availableWidth)),
    0,
  );
  return {
    width: Math.ceil(contentWidth + horizontalChrome),
    height: Math.min(
      Math.ceil(visualLineCount * annotation.fontSize * 1.34 + verticalChrome),
      document.imageHeight - annotation.y,
    ),
  };
}

function SelectionHandles({
  annotation,
  imageWidth,
  onPointerDown,
}: {
  annotation: ResizableAnnotation;
  imageWidth: number;
  onPointerDown: (
    event: React.PointerEvent<SVGRectElement>,
    annotation: ResizableAnnotation,
    handle: RectangleHandle,
  ) => void;
}) {
  const handleSize = Math.max(12, imageWidth / 95);
  const half = handleSize / 2;
  const hitSize = Math.max(handleSize * 2.25, imageWidth / 42);
  const hitHalf = hitSize / 2;
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
      {handles.map((handle) => {
        const cursor =
          handle.name === 'top-left' || handle.name === 'bottom-right' ? 'nwse' : 'nesw';
        return (
          <g key={handle.name} className={`frame-annotation-resize-control is-${cursor}`}>
            <rect
              className="frame-annotation-handle-hit-area"
              x={handle.x - hitHalf}
              y={handle.y - hitHalf}
              width={hitSize}
              height={hitSize}
              onPointerDown={(event) => onPointerDown(event, annotation, handle.name)}
            />
            <rect
              className="frame-annotation-handle"
              x={handle.x - half}
              y={handle.y - half}
              width={handleSize}
              height={handleSize}
            />
          </g>
        );
      })}
    </g>
  );
}

function markerPath(points: AnnotationPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

function createAnnotationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `annotation-${Date.now()}-${Math.random()}`;
}
