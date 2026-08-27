import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { handleReportEmailRequest } from './server/report-email';

export default createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/reports' && ['OPTIONS', 'POST'].includes(request.method)) {
      return handleReportEmailRequest(request);
    }
    return handler.fetch(request);
  },
});
