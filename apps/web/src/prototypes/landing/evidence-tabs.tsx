import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { evidenceTabs } from './landing-content';

export function BrowserFrame({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <div className="browser-frame">
      <div className="browser-frame-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <img src={src} alt={alt} width={width} height={height} loading="lazy" />
    </div>
  );
}

export function EvidenceTabs() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = evidenceTabs[active];

  const focusTab = (index: number) => {
    const next = (index + evidenceTabs.length) % evidenceTabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') focusTab(index + 1);
    else if (event.key === 'ArrowLeft') focusTab(index - 1);
    else if (event.key === 'Home') focusTab(0);
    else if (event.key === 'End') focusTab(evidenceTabs.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div className="evidence">
      <div className="evidence-copy">
        <div role="tablist" aria-label="Evidence views" className="evidence-tablist">
          {evidenceTabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={index === active}
              aria-controls={`${baseId}-panel`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <h3>{current.title}</h3>
        <p>{current.body}</p>
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        tabIndex={0}
        className="evidence-panel"
        key={current.id}
      >
        <span className="visually-hidden">{current.title}</span>
        <BrowserFrame {...current.image} />
      </div>
    </div>
  );
}
