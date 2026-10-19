import { ArrowIcon, ChromeIcon, SiteShell, storeUrl } from './site-shell';
import { BrowserFrame, EvidenceTabs } from './evidence-tabs';
import { Receipt } from './receipt';
import { demoVideo, hero, steps } from './landing-content';

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
                  <BrowserFrame src={step.image.src} alt={step.image.alt} />
                ) : (
                  <img
                    className="panel-shot"
                    src={step.image.src}
                    alt={step.image.alt}
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
      </main>
    </SiteShell>
  );
}
