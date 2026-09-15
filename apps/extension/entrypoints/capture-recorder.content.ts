import { defineContentScript } from 'wxt/utils/define-content-script';
import { installRecorder } from '../src/infrastructure/page-instrumentation';

export default defineContentScript({
  registration: 'runtime',
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    installRecorder();
  },
});
