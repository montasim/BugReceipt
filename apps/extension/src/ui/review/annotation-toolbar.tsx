import {
  BorderFullIcon,
  CheckmarkCircle02Icon,
  Cursor01Icon,
  Delete02Icon,
  HighlighterIcon,
  PencilEdit01Icon,
  RedoIcon,
  TextCreationIcon,
  UndoIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import {
  ANNOTATION_COLORS,
  type AnnotationColor,
  type AnnotationTool,
} from '../../application/annotation-model';

type AnnotationToolbarProps = {
  subjectLabel?: string;
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
  { id: 'select', label: 'Select', icon: <HugeiconsIcon icon={Cursor01Icon} /> },
  { id: 'marker', label: 'Marker', icon: <HugeiconsIcon icon={PencilEdit01Icon} /> },
  { id: 'highlight', label: 'Highlight', icon: <HugeiconsIcon icon={HighlighterIcon} /> },
  { id: 'border', label: 'Border', icon: <HugeiconsIcon icon={BorderFullIcon} /> },
  { id: 'text', label: 'Add text', icon: <HugeiconsIcon icon={TextCreationIcon} /> },
] as const;

export function AnnotationToolbar({
  subjectLabel = 'selected frame',
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
    <section className="mt-4 rounded-xl border bg-card p-3 shadow-sm" aria-label="Annotation tools">
      <div className="flex min-h-12 flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={tool}
          variant="outline"
          size="sm"
          aria-label="Drawing tools"
          onValueChange={(value) => {
            if (value) onToolChange(value as AnnotationTool);
          }}
        >
          {tools.map((item) => (
            <ToggleGroupItem
              key={item.id}
              value={item.id}
              aria-label={item.label}
              disabled={saving}
            >
              {item.icon}
              <span className="hidden xl:inline">{item.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator className="mx-1 h-7" orientation="vertical" />

        <div className="flex items-center gap-2" role="group" aria-label="Annotation color">
          {ANNOTATION_COLORS.map((item) => (
            <Button
              key={item.value}
              className={`size-7 rounded-full border-4 border-card p-0 ${color === item.value ? 'ring-2 ring-ring ring-offset-2 ring-offset-card' : 'ring-1 ring-border'}`}
              type="button"
              variant="ghost"
              size="icon-xs"
              title={item.name}
              aria-label={item.name}
              aria-pressed={color === item.value}
              disabled={saving}
              style={{ backgroundColor: item.value }}
              onClick={() => onColorChange(item.value)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>Width</span>
          <Select
            value={String(strokeWidth)}
            disabled={saving || tool === 'text'}
            onValueChange={(value) => onStrokeWidthChange(Number(value))}
          >
            <SelectTrigger className="w-24" size="sm" aria-label="Annotation width">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Thin</SelectItem>
              <SelectItem value="6">Medium</SelectItem>
              <SelectItem value="10">Thick</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="mx-1 h-7" orientation="vertical" />

        <div className="flex items-center gap-1" role="group" aria-label="Edit history">
          <ToolbarIconButton
            label="Undo"
            disabled={!canUndo || saving}
            icon={<HugeiconsIcon icon={UndoIcon} />}
            onClick={onUndo}
          />
          <ToolbarIconButton
            label="Redo"
            disabled={!canRedo || saving}
            icon={<HugeiconsIcon icon={RedoIcon} />}
            onClick={onRedo}
          />
          <ToolbarIconButton
            label="Clear annotations"
            disabled={count === 0 || saving}
            icon={<HugeiconsIcon icon={Delete02Icon} />}
            onClick={onClear}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" type="button" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" type="button" disabled={saving} onClick={onDone}>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} />
            {saving ? 'Saving…' : 'Save annotations'}
          </Button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {count} {count === 1 ? 'annotation' : 'annotations'} on {subjectLabel}.
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
