import type { ReactNode } from 'react';

export type Capture = {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
};

// 1x1 transparent GIF: lets a <picture> skip a capture entirely at widths where CSS hides it.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** A real product capture: WebP with PNG fallback, lazy unless it is above the fold. */
export function Shot({
  image,
  className,
  eager = false,
  skipBelow,
}: {
  image: Capture;
  className?: string;
  eager?: boolean;
  skipBelow?: number;
}) {
  return (
    <picture>
      {skipBelow ? <source media={`(max-width: ${skipBelow}px)`} srcSet={BLANK} /> : null}
      <source type="image/webp" srcSet={image.src.replace(/\.png$/, '.webp')} />
      <img
        className={className}
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={eager ? undefined : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
      />
    </picture>
  );
}

/** The one chrome the site draws around captures: a three-dot bar and a line border. */
export function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="browser-frame">
      <div className="browser-frame-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {children}
    </div>
  );
}

/** A section's proof artifact: full width, framed, captioned. */
export function Proof({
  caption,
  className,
  children,
}: {
  caption: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={className ? `proof ${className}` : 'proof'}>
      <BrowserFrame>{children}</BrowserFrame>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
