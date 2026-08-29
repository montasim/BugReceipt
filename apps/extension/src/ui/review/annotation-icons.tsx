import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
        {children}
      </g>
    </svg>
  );
}

export function AnnotateIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Z" />
      <path d="m13.8 7 3.2 3.2M4 20h5" />
    </IconBase>
  );
}

export function PointerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 3l13 9-6 1.5L9 20 5 3Z" />
    </IconBase>
  );
}

export function MarkerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 17 10-10 3 3L8 20H5v-3Z" />
      <path d="m13 9 3 3M4 21h8" />
    </IconBase>
  );
}

export function HighlightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="6" width="16" height="12" />
      <path d="M7 15h10" strokeWidth="3.5" opacity="0.5" />
    </IconBase>
  );
}

export function BorderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="14" />
      <path d="M8 5V3M16 5V3M8 21v-2M16 21v-2" />
    </IconBase>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" />
    </IconBase>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m15 7 5 5-5 5M19 12h-8a6 6 0 0 0-6 6" />
    </IconBase>
  );
}

export function ClearIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 7h14M9 3h6l1 4H8l1-4ZM8 10v8M12 10v8M16 10v8M7 7l1 14h8l1-14" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 4 4L19 6" />
    </IconBase>
  );
}
