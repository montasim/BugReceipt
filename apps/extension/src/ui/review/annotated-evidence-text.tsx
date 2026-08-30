import type { EvidenceTextAnnotation } from '@bugreceipt/capture-model';
import type { CSSProperties, KeyboardEvent, MouseEvent, TouchEvent } from 'react';

import type { TextAnnotation } from '../../application/text-annotation-model';

type TextSelection = Pick<EvidenceTextAnnotation, 'source' | 'eventId' | 'field' | 'start' | 'end'>;

type AnnotatedEvidenceTextProps = {
  value: string;
  source: EvidenceTextAnnotation['source'];
  eventId: string;
  field: EvidenceTextAnnotation['field'];
  annotations: readonly TextAnnotation[];
  editing?: boolean;
  onAnnotate?: (selection: TextSelection) => void;
  onRemove?: (id: string) => void;
};

export function AnnotatedEvidenceText({
  value,
  source,
  eventId,
  field,
  annotations,
  editing = false,
  onAnnotate,
  onRemove,
}: AnnotatedEvidenceTextProps) {
  const matches = annotations
    .filter(
      (annotation) =>
        annotation.source === source &&
        annotation.eventId === eventId &&
        annotation.field === field &&
        annotation.start >= 0 &&
        annotation.end <= value.length &&
        annotation.end > annotation.start,
    )
    .sort((left, right) => left.start - right.start);

  function annotateSelection(root: HTMLElement) {
    if (!editing || !onAnnotate) return;
    const selection = window.getSelection();
    const offsets = selection ? getTextSelectionOffsets(root, selection) : null;
    if (!offsets || !value.slice(offsets.start, offsets.end).trim()) return;
    onAnnotate({ source, eventId, field, ...offsets });
    selection?.removeAllRanges();
  }

  function handleMouseUp(event: MouseEvent<HTMLSpanElement>) {
    annotateSelection(event.currentTarget);
  }

  function handleTouchEnd(event: TouchEvent<HTMLSpanElement>) {
    const root = event.currentTarget;
    window.setTimeout(() => annotateSelection(root), 0);
  }

  return (
    <span
      className={`annotatable-evidence-text${editing ? ' is-editing' : ''}`}
      data-annotation-field={field}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      {renderAnnotatedText(value, matches, editing, onRemove)}
    </span>
  );
}

export function getTextSelectionOffsets(
  root: HTMLElement,
  selection: Selection,
): { start: number; end: number } | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const beforeStart = document.createRange();
  beforeStart.selectNodeContents(root);
  beforeStart.setEnd(range.startContainer, range.startOffset);
  const beforeEnd = document.createRange();
  beforeEnd.selectNodeContents(root);
  beforeEnd.setEnd(range.endContainer, range.endOffset);
  const start = beforeStart.toString().length;
  const end = beforeEnd.toString().length;
  return end > start ? { start, end } : null;
}

function renderAnnotatedText(
  value: string,
  annotations: readonly TextAnnotation[],
  editing: boolean,
  onRemove?: (id: string) => void,
) {
  if (!annotations.length) return value;
  const output = [];
  let cursor = 0;
  for (const annotation of annotations) {
    if (annotation.start < cursor) continue;
    if (annotation.start > cursor) output.push(value.slice(cursor, annotation.start));
    output.push(
      <mark
        key={annotation.id}
        className={`text-annotation-mark${editing ? ' is-editing' : ''}`}
        style={{ '--text-annotation-color': annotation.color } as CSSProperties}
        role={editing && onRemove ? 'button' : undefined}
        tabIndex={editing && onRemove ? 0 : undefined}
        title={editing && onRemove ? 'Remove this annotation' : 'Annotated evidence'}
        aria-label={
          editing && onRemove
            ? `Remove annotation: ${value.slice(annotation.start, annotation.end)}`
            : undefined
        }
        onClick={() => {
          if (editing && onRemove && window.getSelection()?.isCollapsed !== false) {
            onRemove(annotation.id);
          }
        }}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          if (!editing || !onRemove || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          onRemove(annotation.id);
        }}
      >
        {value.slice(annotation.start, annotation.end)}
      </mark>,
    );
    cursor = annotation.end;
  }
  if (cursor < value.length) output.push(value.slice(cursor));
  return output;
}
