import { ArrowIcon, ChromeIcon, SiteShell, storeUrl } from './site-shell';
import { BrowserFrame, EvidenceTabs } from './evidence-tabs';
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
      <main id="top">
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
          <figure className="hero-receipt">
            <Receipt />
            <figcaption>{hero.receiptCaption}</figcaption>
          </figure>
        </section>
        <section className="clean-shell content-section" id="how-it-works">
          <div className="section-heading">
            <p className="eyebrow">How it works</p>
            <h2>Three actions. One report.</h2>
            <p>
              Capture is intentional: it starts when you choose a tab and ends when you stop it.
            </p>
          </div>
          <ol className="steps">
            {steps.map((step, index) => (
              <li className="step" key={step.title}>
                <div className="step-copy">
                  <span className="mono">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
                {'frame' in step.image ? (
                  <BrowserFrame {...step.image} />
                ) : (
                  <img
                    className="panel-shot"
                    src={step.image.src}
                    alt={step.image.alt}
                    width={step.image.width}
                    height={step.image.height}
                    loading="lazy"
                  />
                )}
              </li>
            ))}
          </ol>
          <figure className="video-frame">
            <iframe
              src={demoVideo.src}
              title={demoVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
            <figcaption>{demoVideo.caption}</figcaption>
          </figure>
        </section>
        <section className="evidence-section" id="evidence">
          <div className="clean-shell content-section">
            <div className="section-heading">
              <p className="eyebrow">Review evidence</p>
              <h2>Inspect everything before it leaves.</h2>
              <p>
                Three views over the same capture. Remove what should not be shared; the count of
                sensitive values redacted locally stays visible while you do.
              </p>
            </div>
            <EvidenceTabs />
          </div>
        </section>

        <section className="clean-shell content-section deliverable" id="deliverable">
          <div>
            <p className="eyebrow">Export</p>
            <h2>{deliverables.title}</h2>
            <p className="deliverable-lead">{deliverables.lead}</p>
            <div className="deliverable-copy">
              {deliverables.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <BrowserFrame {...deliverables.image} />
        </section>

        <section className="privacy-section" id="privacy">
          <div className="clean-shell content-section">
            <div className="section-heading">
              <p className="eyebrow">Privacy</p>
              <h2>Privacy by construction.</h2>
              <p>
                Filtering happens before anything is stored. You inspect the capture and choose
                which local files to export.
              </p>
            </div>
            <div className="privacy-table">
              {privacyColumns.map((column) => (
                <div key={column.title}>
                  <h3>{column.title}</h3>
                  <ul>
                    {column.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="privacy-footnote">{privacyFootnote}</p>
          </div>
        </section>

        <section className="clean-shell content-section corrections" id="corrections">
          <div>
            <p className="eyebrow">Text corrections</p>
            <h2>{corrections.title}</h2>
            <p className="corrections-body">{corrections.body}</p>
            <a className="btn-link" href={corrections.link.href}>
              {corrections.link.label} <ArrowIcon />
            </a>
          </div>
          <div className="corrections-shots">
            <BrowserFrame {...corrections.images[0]} />
            <img
              className="panel-shot"
              src={corrections.images[1].src}
              alt={corrections.images[1].alt}
              width={corrections.images[1].width}
              height={corrections.images[1].height}
              loading="lazy"
            />
          </div>
        </section>

        <section className="audiences-section" id="audiences">
          <div className="clean-shell content-section">
            <div className="section-heading">
              <p className="eyebrow">Built for</p>
              <h2>Whoever has to explain the failure.</h2>
            </div>
            <div className="audiences">
              {audiences.map((audience) => (
                <div key={audience.title}>
                  <h3>{audience.title}</h3>
                  <p>{audience.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="clean-shell content-section faq" id="faq">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Questions before you install.</h2>
          </div>
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
        </section>

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
