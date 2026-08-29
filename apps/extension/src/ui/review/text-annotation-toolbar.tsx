import type { CSSProperties, ReactNode } from 'react';

import { ANNOTATION_COLORS, type AnnotationColor } from '../../application/annotation-model';
import { CheckIcon, ClearIcon, HighlightIcon, RedoIcon, UndoIcon } from './annotation-icons';

type TextAnnotationToolbarProps = {
  color: AnnotationColor;
  count: number;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  onColorChange: (color: AnnotationColor) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCancel: () => void;
  onDone: () => void;
};

export function TextAnnotationToolbar({
  color,
  count,
  canUndo,
  canRedo,
  saving,
  onColorChange,
  onUndo,
  onRedo,
  onClear,
  onCancel,
  onDone,
}: TextAnnotationToolbarProps) {
  return (
    <section
      className="frame-annotation-toolbar text-annotation-toolbar"
      aria-label="Text annotation tools"
    >
      <div className="frame-annotation-toolbar-inner">
        <div className="text-annotation-mode" aria-hidden="true">
          <HighlightIcon />
          <span>Highlight text</span>
        </div>

        <span className="frame-toolbar-separator" aria-hidden="true" />

        <div className="frame-annotation-colors" role="group" aria-label="Annotation color">
          {ANNOTATION_COLORS.map((item) => (
            <button
              key={item.value}
              className={`frame-color-swatch${color === item.value ? ' is-active' : ''}`}
              type="button"
              title={item.name}
              aria-label={item.name}
              aria-pressed={color === item.value}
              disabled={saving}
              style={{ '--swatch-color': item.value } as CSSProperties}
              onClick={() => onColorChange(item.value)}
            />
          ))}
        </div>

        <span className="frame-toolbar-separator" aria-hidden="true" />

        <div className="frame-annotation-history-actions" role="group" aria-label="Edit history">
          <ToolbarIconButton
            label="Undo"
            disabled={!canUndo || saving}
            icon={<UndoIcon />}
            onClick={onUndo}
          />
          <ToolbarIconButton
            label="Redo"
            disabled={!canRedo || saving}
            icon={<RedoIcon />}
            onClick={onRedo}
          />
          <ToolbarIconButton
            label="Clear all text annotations"
            disabled={count === 0 || saving}
            icon={<ClearIcon />}
            onClick={onClear}
          />
        </div>

        <div className="frame-annotation-finish-actions">
          <button
            className="frame-annotation-cancel"
            type="button"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="frame-annotation-done"
            type="button"
            disabled={saving}
            onClick={onDone}
          >
            <CheckIcon />
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
      <p className="text-annotation-instruction">
        Select text in an evidence field to highlight it. Select a saved highlight to remove it.
      </p>
      <p className="sr-only" aria-live="polite">
        {count} text {count === 1 ? 'annotation' : 'annotations'} in this capture.
      </p>
    </section>
  );
}

function ToolbarIconButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="frame-toolbar-icon-button"
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
