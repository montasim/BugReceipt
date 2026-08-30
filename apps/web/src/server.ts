import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { handleReportEmailRequest } from './server/report-email';

const LANDING_DESIGN_CONTRACT = `<!--
THESIS: One uninterrupted evidence trace turns a browser failure into a reproducible local report; this surface refuses the stacked hero-and-feature-card landing page.
OWN-WORLD: Cool paper and fog fields, ink navy structure, teal traces, coral failure signals, square evidence windows, Bricolage display type, and JetBrains Mono only for time, code, and measurement.
STORY: A tester records once, follows screen, console, network, and manual context through review, then downloads only the evidence they choose.
FIRST VIEWPORT: Benefit statement fills the left half, the extension panel docks high right, and a five-event trace spans the viewport into real evidence excerpts and the local-first boundary; download is visible in the hero.
FORM: Failure Trace Timeline, fourth grounded structure, seed a8f5b8a7.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

export default createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/reports' && ['OPTIONS', 'POST'].includes(request.method)) {
      return handleReportEmailRequest(request);
    }
    const response = await handler.fetch(request);
    if (
      request.method === 'GET' &&
      url.pathname === '/' &&
      response.headers.get('content-type')?.includes('text/html')
    ) {
      const html = await response.text();
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      return new Response(html.replace(/<body([^>]*)>/, `$&\n${LANDING_DESIGN_CONTRACT}`), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return response;
  },
});
