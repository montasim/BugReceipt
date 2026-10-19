import { ArrowIcon, ChromeIcon, SiteShell, storeUrl } from './site-shell';
import { Receipt } from './receipt';
import { hero } from './landing-content';

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
      </main>
    </SiteShell>
  );
}
