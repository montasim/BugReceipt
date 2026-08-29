import type { CSSProperties, ReactNode } from 'react';
import {
  ANNOTATION_COLORS,
  type AnnotationColor,
  type AnnotationTool,
} from '../../application/annotation-model';
import {
  BorderIcon,
  CheckIcon,
  ClearIcon,
  HighlightIcon,
  MarkerIcon,
  PointerIcon,
  RedoIcon,
  UndoIcon,
} from './annotation-icons';

type AnnotationToolbarProps = {
  tool: AnnotationTool;
  color: AnnotationColor;
  strokeWidth: number;
  count: number;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: AnnotationColor) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCancel: () => void;
  onDone: () => void;
};

const tools = [
  { id: 'select', label: 'Select', icon: <PointerIcon /> },
  { id: 'marker', label: 'Marker', icon: <MarkerIcon /> },
  { id: 'highlight', label: 'Highlight', icon: <HighlightIcon /> },
  { id: 'border', label: 'Border', icon: <BorderIcon /> },
] as const;

export function AnnotationToolbar({
  tool,
  color,
  strokeWidth,
  count,
  canUndo,
  canRedo,
  saving,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  onCancel,
  onDone,
}: AnnotationToolbarProps) {
  return (
    <section className="frame-annotation-toolbar" aria-label="Annotation tools">
      <div className="frame-annotation-toolbar-inner">
        <div className="frame-annotation-tool-group" role="toolbar" aria-label="Drawing tools">
          {tools.map((item) => (
            <button
              key={item.id}
              className={`frame-annotation-tool${tool === item.id ? ' is-active' : ''}`}
              type="button"
              aria-pressed={tool === item.id}
              title={item.label}
              disabled={saving}
              onClick={() => onToolChange(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
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

        <label className="frame-stroke-control">
          <span>Width</span>
          <select
            value={strokeWidth}
            aria-label="Annotation width"
            disabled={saving}
            onChange={(event) => onStrokeWidthChange(Number(event.target.value))}
          >
            <option value="3">Thin</option>
            <option value="6">Medium</option>
            <option value="10">Thick</option>
          </select>
        </label>

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
            label="Clear all"
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
      <p className="sr-only" aria-live="polite">
        {count} {count === 1 ? 'annotation' : 'annotations'} on the selected frame.
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
