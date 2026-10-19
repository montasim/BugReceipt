import type { ReactNode } from 'react';
import { ArrowIcon, ChromeIcon, SiteShell, storeUrl } from './site-shell';
import { EvidenceTabs } from './evidence-tabs';
import { Proof, Shot } from './proof';
import { Receipt } from './receipt';
import {
  audiences,
  corrections,
  deliverables,
  demoVideo,
  faqs,
  hero,
  privacyColumns,
  privacyFootnote,
  steps,
} from './landing-content';

export function LandingPage() {
  return (
    <SiteShell>
      <main id="top" className="landing">
        <section className="clean-shell hero">
          <div className="hero-copy">
            <h1>{hero.title}</h1>
            <p className="hero-lead">{hero.lead}</p>
            <div className="hero-actions">
              <a className="btn-primary" href={storeUrl} target="_blank" rel="noreferrer">
                <ChromeIcon /> Add to Chrome
              </a>
              <a className="btn-link" href="/guide">
                Read the user guide <ArrowIcon />
              </a>
            </div>
            <p className="hero-fine">{hero.finePrint}</p>
          </div>
          <Proof className="hero-scene" caption={hero.scene.caption}>
            <div className="scene">
              <Shot className="scene-page" image={hero.scene.page} eager skipBelow={700} />
              <Shot className="scene-panel" image={hero.scene.panel} eager />
            </div>
          </Proof>
        </section>

        <Section
          id="how-it-works"
          eyebrow="How it works"
          title="Three actions. One report."
          lead="Capture is intentional: it starts when you choose a tab and ends when you stop it."
        >
          <ol className="cols steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <div className="step-shot">
                  <Shot image={step.image} />
                </div>
                <span className="mono">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <figure className="proof video-frame">
            <iframe
              src={demoVideo.src}
              title={demoVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
            <figcaption>{demoVideo.caption}</figcaption>
          </figure>
        </Section>

        <Section
          id="evidence"
          eyebrow="Review evidence"
          title="Inspect everything before it leaves."
          lead="Three views over the same capture. Remove what should not be shared; the count of sensitive values redacted locally stays visible while you do."
        >
          <EvidenceTabs />
        </Section>

        <Section
          id="deliverable"
          eyebrow="Export"
          title={deliverables.title}
          lead={deliverables.lead}
        >
          <figure className="proof proof-receipt">
            <Receipt />
            <figcaption>{deliverables.receiptCaption}</figcaption>
          </figure>
          <div className="cols">
            {deliverables.files.map((file) => (
              <div key={file.label}>
                <span className="mono">{file.label}</span>
                <h3>{file.title}</h3>
                <p>{file.body}</p>
              </div>
            ))}
          </div>
          <p className="section-note">{deliverables.note}</p>
        </Section>

        <Section
          id="privacy"
          eyebrow="Privacy"
          title="Privacy by construction."
          lead="Filtering happens before anything is stored. You inspect the capture and choose which local files to export."
        >
          <div className="cols">
            {privacyColumns.map((column) => (
              <div key={column.title}>
                <span className="mono">{column.label}</span>
                <h3>{column.title}</h3>
                <ul>
                  {column.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="section-note is-quiet">{privacyFootnote}</p>
        </Section>

        <Section
          id="corrections"
          eyebrow="Text corrections"
          title={corrections.title}
          lead={corrections.body}
        >
          <Proof caption={corrections.scene.caption}>
            <div className="scene">
              <Shot className="scene-page" image={corrections.scene.page} skipBelow={700} />
              <Shot className="scene-panel" image={corrections.scene.panel} />
            </div>
          </Proof>
          <div className="section-actions">
            <a className="btn-link" href={corrections.link.href}>
              {corrections.link.label} <ArrowIcon />
            </a>
          </div>
        </Section>

        <Section id="audiences" eyebrow="Built for" title="Whoever has to explain the failure.">
          <div className="cols">
            {audiences.map((audience) => (
              <div key={audience.title}>
                <span className="mono">{audience.label}</span>
                <h3>{audience.title}</h3>
                <p>{audience.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="faq" eyebrow="FAQ" title="Questions before you install.">
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>
                  {faq.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </Section>

        <section className="clean-shell content-section closing">
          <h2>Install it before the next bug.</h2>
          <p>Free, local-first, no account. Works on Chrome desktop 125 and newer.</p>
          <div className="hero-actions">
            <a className="btn-primary" href={storeUrl} target="_blank" rel="noreferrer">
              <ChromeIcon /> Add to Chrome
            </a>
            <a className="btn-link" href="/guide">
              Read the user guide <ArrowIcon />
            </a>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}

/** Every landing section shares one grammar: centered heading, then proof, then detail. */
function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section className="clean-shell content-section" id={id}>
      <div className="section-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {lead ? <p>{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}
