/* global fetch, WebSocket */
// Captures real light-theme screenshots of the built extension for the /guide page.
// Run `pnpm build:extension` first. Needs Chrome (CHROME_PATH, default google-chrome).
import { spawn } from 'node:child_process';
import console from 'node:console';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '../../..');
const output = join(root, 'apps/extension/.output');
const outDir = join(root, 'apps/web/public/guide');
const SCALE = 2;
const PANEL = { width: 440, height: 760 };
const DESKTOP = { width: 1440, height: 900 };

const demoPage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Everyday Supply · Checkout</title>
<style>
body{margin:0;font:16px/1.5 system-ui,sans-serif;color:#13242f;background:#f3f5f6}
header{display:flex;justify-content:space-between;align-items:center;padding:18px 48px;background:#fff;border-bottom:1px solid #dce3e6}
header b{font-size:18px}header span{font-size:12px;color:#5d6d76;letter-spacing:.08em}
main{max-width:1040px;margin:40px auto;padding:0 24px;display:grid;grid-template-columns:1.4fr 1fr;gap:32px}
h1{margin:0 0 6px;font-size:32px}.muted{color:#5d6d76;margin:0 0 24px}
.card{background:#fff;border:1px solid #dce3e6;border-radius:12px;padding:22px 24px}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eef1f3}.row:last-child{border:0}
.item{display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid #eef1f3}.thumb{width:56px;height:56px;border-radius:10px;background:#1f5f58}
button{margin-top:18px;width:100%;padding:14px;border:0;border-radius:10px;background:#13242f;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
.err{display:none;margin-top:16px;padding:12px 14px;border:1px solid #f1c3bd;background:#fff1ef;color:#9b2c1e;border-radius:10px;font-size:14px}
.err.show{display:block}
</style></head><body>
<header><b>Everyday Supply</b><span>DEMO STORE</span></header>
<main>
<section><h1>Checkout</h1><p class="muted">Almost ready to go. Your everyday backpack is ready for its next adventure.</p>
<div class="card"><div class="item"><div class="thumb"></div><div><b>Everyday backpack</b><br><small class="muted">Forest green · Quantity 1</small></div></div>
<div class="row"><span>Discount code</span><b>WELCOME10</b></div></div></section>
<aside><div class="card"><b>Order summary</b>
<div class="row"><span>Subtotal</span><b>$89.00</b></div><div class="row"><span>Shipping</span><b>Free</b></div><div class="row"><span>Discount</span><b>-$8.90</b></div><div class="row"><span>Total</span><b>$80.10</b></div>
<button id="place">Place order</button>
<div class="err" id="err"><b>We couldn’t place your order.</b><br>This discount is no longer available.</div></div></aside>
</main>
<script>
console.log('Checkout initialized · 1 item in cart');
fetch('/api/cart').then(r=>r.json()).then(c=>console.log('Cart loaded', c));
document.getElementById('place').addEventListener('click', async () => {
  console.log('Discount applied: WELCOME10');
  console.warn('Payment request retry: attempt 1 of 3');
  const r = await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer demo-secret-token'},body:JSON.stringify({sku:'BP-EVERYDAY-GRN',quantity:1,discountCode:'WELCOME10',email:'demo@example.com'})});
  const body = await r.json();
  if(!r.ok){ document.getElementById('err').classList.add('show');
    console.error('CheckoutError: Unable to place order\\n    at submitOrder (checkout.js:142:18)\\n    at onPaymentSubmit (payment.js:86:12)');
    console.error('POST /api/orders returned ' + r.status, body); }
});
</script></body></html>`;

const server = createServer((req, res) => {
  if (req.url === '/api/cart') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ items: 1, subtotal: 89, currency: 'USD' }));
    return;
  }
  if (req.url === '/api/orders') {
    res.writeHead(422, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'DISCOUNT_EXPIRED',
        message: 'This discount is no longer available.',
        details: { field: 'discountCode', retryable: false },
      }),
    );
    return;
  }
  res.setHeader('content-type', 'text/html');
  res.end(demoPage);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const host = 'shop.example.test';
const pageUrl = `http://${host}/checkout`;

const profile = await mkdtemp(join(tmpdir(), 'bugreceipt-guide-shots-'));
const chrome = spawn(
  process.env.CHROME_PATH || 'google-chrome',
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--hide-scrollbars',
    '--enable-unsafe-extension-debugging',
    `--host-resolver-rules=MAP ${host} 127.0.0.1:${port}`,
    `--user-data-dir=${profile}`,
    '--remote-debugging-port=0',
    `--window-size=${DESKTOP.width},${DESKTOP.height}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
let stderr = '';
chrome.stderr.on('data', (data) => (stderr += data));

let socket;
try {
  let devtoolsPort;
  for (let i = 0; i < 100 && !devtoolsPort; i++) {
    devtoolsPort = Number(
      await readFile(join(profile, 'DevToolsActivePort'), 'utf8')
        .then((text) => text.split('\n')[0])
        .catch(() => 0),
    );
    if (!devtoolsPort) await delay(100);
  }
  if (!devtoolsPort) throw new Error(`Chrome did not start: ${stderr.slice(-1500)}`);
  const version = await (await fetch(`http://127.0.0.1:${devtoolsPort}/json/version`)).json();
  const chromeVersion = version.Browser.split('/')[1];
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((done) => socket.addEventListener('open', done, { once: true }));

  let id = 0;
  const callbacks = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const callback = callbacks.get(message.id);
    callbacks.delete(message.id);
    clearTimeout(callback?.timer);
    if (message.error) callback?.reject(new Error(message.error.message));
    else callback?.resolve(message.result);
  });
  const command = (method, params = {}, sessionId) =>
    new Promise((done, fail) => {
      const requestId = ++id;
      const timer = setTimeout(() => {
        callbacks.delete(requestId);
        fail(new Error(`Timed out: ${method}`));
      }, 20_000);
      callbacks.set(requestId, { resolve: done, reject: fail, timer });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  const { id: extensionId } = await command('Extensions.loadUnpacked', { path: output });
  const extensionUrl = `chrome-extension://${extensionId}`;

  async function openTarget(url, size, { newWindow = false } = {}) {
    const { targetId } = await command('Target.createTarget', { url, newWindow });
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
    await command(
      'Emulation.setDeviceMetricsOverride',
      { ...size, deviceScaleFactor: SCALE, mobile: false },
      sessionId,
    );
    await command(
      'Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-color-scheme', value: 'light' }] },
      sessionId,
    );
    const evaluate = async (expression) => {
      const result = await command(
        'Runtime.evaluate',
        { expression, awaitPromise: true, returnByValue: true },
        sessionId,
      );
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed');
      }
      return result.result.value;
    };
    const waitForText = async (text) => {
      for (let i = 0; i < 100; i++) {
        if (
          await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`).catch(
            () => false,
          )
        )
          return;
        await delay(100);
      }
      const body = await evaluate('document.body.innerText.slice(0, 400)').catch(() => '?');
      throw new Error(`Never saw "${text}" at ${url}. Page shows: ${body}`);
    };
    const shoot = async (file, clip) => {
      await evaluate('document.fonts.ready.then(() => true)');
      await delay(600);
      const { data } = await command(
        'Page.captureScreenshot',
        { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) },
        sessionId,
      );
      await writeFile(join(outDir, file), Buffer.from(data, 'base64'));
      console.log('wrote', file);
    };
    const close = () => command('Target.closeTarget', { targetId });
    return { targetId, sessionId, evaluate, waitForText, shoot, close };
  }

  // Wait until the extension's service worker exists before opening its pages.
  for (let i = 0; i < 100; i++) {
    const { targetInfos } = await command('Target.getTargets');
    if (targetInfos.some((t) => t.type === 'service_worker' && t.url.startsWith(extensionUrl)))
      break;
    await delay(100);
  }

  // Driver page: an extension context with chrome.* access, never screenshotted.
  const driver = await openTarget(`${extensionUrl}/review.html`, DESKTOP);
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    ready = await driver
      .evaluate('Boolean(globalThis.chrome?.tabs && globalThis.chrome?.storage?.session)')
      .catch(() => false);
    if (!ready) {
      if (i % 10 === 9) {
        await command(
          'Page.navigate',
          { url: `${extensionUrl}/review.html` },
          driver.sessionId,
        ).catch(() => undefined);
      }
      await delay(100);
    }
  }
  if (!ready) {
    throw new Error(
      `Extension APIs unavailable in driver: ${await driver.evaluate('location.href + " " + document.body.innerText.slice(0, 200)').catch(() => '?')}`,
    );
  }
  await driver.evaluate(`chrome.storage.local.set({ 'bugreceipt:theme': 'light' })`);
  const send = (request) =>
    driver.evaluate(`chrome.runtime.sendMessage(${JSON.stringify(request)})`);
  const SESSION_KEY = 'reprokit:capture-session';
  const readSession = () =>
    driver.evaluate(
      `chrome.storage.session.get(${JSON.stringify(SESSION_KEY)}).then(v => v[${JSON.stringify(SESSION_KEY)}])`,
    );
  const writeSession = (session) =>
    driver.evaluate(
      `chrome.storage.session.set({ ${JSON.stringify(SESSION_KEY)}: ${JSON.stringify(session)} })`,
    );
  const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

  await mkdir(outDir, { recursive: true });

  // 01 · side panel, nothing captured yet
  let panel = await openTarget(`${extensionUrl}/sidepanel.html`, PANEL, { newWindow: true });
  await panel.waitForText('Choose tab to record');
  await panel.shoot('01-side-panel.png');
  await panel.close();
  // 02 · the same start screen at a shorter panel height, as Chrome shows it on small windows
  panel = await openTarget(
    `${extensionUrl}/sidepanel.html`,
    { width: PANEL.width, height: 600 },
    { newWindow: true },
  );
  await panel.waitForText('Choose tab to record');
  await panel.shoot('02-choose-tab.png');
  await panel.close();

  // Open the demo page and start a real capture (video needs a user gesture, so it is skipped).
  const tab = await driver.evaluate(
    `chrome.tabs.create({ url: ${JSON.stringify(pageUrl)}, active: true })`,
  );
  await delay(1_500);
  const start = await send({
    type: 'session:start',
    tabId: tab.id,
    sessionId: crypto.randomUUID(),
    recordingError: 'Guide capture runs without a tab recording.',
  });
  if (!start.ok) throw new Error(start.message);
  await delay(800);

  const { targetInfos } = await command('Target.getTargets');
  const pageTarget = targetInfos.find((t) => t.type === 'page' && t.url.startsWith(pageUrl));
  const { sessionId: pageSession } = await command('Target.attachToTarget', {
    targetId: pageTarget.targetId,
    flatten: true,
  });
  await command('Runtime.evaluate', { expression: 'location.reload()' }, pageSession);
  await delay(1_500);
  for (const text of [
    'Opened the checkout page with one item in the cart',
    'Applied the WELCOME10 discount code',
  ]) {
    await send({ type: 'session:add-step', text });
  }
  await command(
    'Runtime.evaluate',
    { expression: `document.getElementById('place').click()`, awaitPromise: true },
    pageSession,
  );
  await delay(1_500);
  await send({ type: 'session:add-step', text: 'Clicked Place order and saw the error' });

  // Hide the "no recording" note so the panel looks like an ordinary capture.
  let session = await readSession();
  delete session.page.recordingError;
  await writeSession(session);

  // 03 · side panel while recording. It must share a window with the recorded tab, and that
  // tab must be the active one, exactly like Chrome's real side panel.
  panel = await openTarget(`${extensionUrl}/sidepanel.html`, PANEL);
  await delay(500);
  await driver.evaluate(`chrome.tabs.update(${tab.id}, { active: true })`);
  await panel.waitForText('Stop & review');
  await panel.shoot('03-recording.png');
  await panel.close();

  // Stop: background captures the fallback screenshot of the demo page.
  await driver.evaluate(`chrome.tabs.update(${tab.id}, { active: true })`);
  await delay(300);
  const stop = await send({ type: 'session:stop' });
  if (!stop.ok) throw new Error(stop.message);
  await delay(500);

  // Headless Chrome cannot captureVisibleTab, so store a CDP screenshot of the demo page as the
  // session screenshot, then promote it into a short WebM so the review shows a recording.
  session = await readSession();
  const { data: pageShot } = await command(
    'Page.captureScreenshot',
    { format: 'png' },
    pageSession,
  );
  const screenshotId = crypto.randomUUID();
  const recordingId = crypto.randomUUID();
  await driver.evaluate(
    `chrome.tabs.getCurrent().then((t) => chrome.tabs.update(t.id, { active: true }))`,
  );
  const recording = await driver.evaluate(`(async () => {
    const open = () => new Promise((ok, no) => {
      const r = indexedDB.open('reprokit-artifacts', 2);
      r.onupgradeneeded = () => { for (const name of ['screenshots', 'recordings']) if (!r.result.objectStoreNames.contains(name)) r.result.createObjectStore(name); };
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
    });
    const db = await open();
    const put = (store, key, value) => new Promise((ok, no) => { const t = db.transaction(store, 'readwrite').objectStore(store).put(value, key); t.onsuccess = () => ok(); t.onerror = () => no(t.error); });
    const shot = await (await fetch('data:image/png;base64,${pageShot}')).blob();
    await put('screenshots', ${JSON.stringify(screenshotId)}, shot);
    if (typeof MediaRecorder === 'undefined') return null;
    const bitmap = await createImageBitmap(shot);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) return null;
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((ok) => (rec.onstop = ok));
    ctx.drawImage(bitmap, 0, 0);
    await new Promise((ok) => setTimeout(ok, 200));
    rec.start(100);
    const startedAt = performance.now();
    await new Promise((ok) => { const draw = () => { ctx.drawImage(bitmap, 0, 0); if (performance.now() - startedAt < 4000) setTimeout(draw, 40); else ok(); }; draw(); });
    rec.stop();
    await done;
    const blob = new Blob(chunks, { type: 'video/webm' });
    await put('recordings', ${JSON.stringify(recordingId)}, blob);
    return { mimeType: 'video/webm', sizeBytes: blob.size, durationMs: 4000 };
  })()`);
  session.page.screenshotBlobId = screenshotId;
  delete session.page.screenshotError;
  if (recording) {
    session.page.recording = { blobId: recordingId, ...recording };
    delete session.page.recordingError;
  } else {
    console.warn('MediaRecorder unavailable; review will show the screenshot only');
  }
  session.environment = { ...session.environment, userAgent };
  await writeSession(session);
  await send({
    type: 'session:update-review',
    summary: 'Checkout fails after applying a discount',
    description: 'The order cannot be placed after applying the WELCOME10 discount.',
    expectedBehavior: 'The order is placed and a confirmation appears.',
    actualBehavior: 'An error appears and checkout stays on the payment page.',
    steps: session.steps,
  });

  // 04 · side panel with a capture waiting for review
  panel = await openTarget(`${extensionUrl}/sidepanel.html`, PANEL, { newWindow: true });
  await panel.waitForText('Review existing capture');
  await panel.shoot('04-ready-for-review.png');
  await panel.close();

  // 05–09 · review workbench stages
  const review = await openTarget(`${extensionUrl}/review.html`, DESKTOP, { newWindow: true });
  await review.waitForText('Complete the report');
  await review.shoot('05-report-details.png');
  const clickText = (selector, text) =>
    review.evaluate(
      `(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => el.textContent.includes(${JSON.stringify(text)})); if (!el) throw new Error('missing ' + ${JSON.stringify(text)}); el.click(); return true; })()`,
    );
  await clickText('nav button', 'Review evidence');
  await review.waitForText('Visual evidence');
  await delay(1_000);
  await review.shoot('06-visual-evidence.png');
  await clickText('[role="tab"]', 'Console');
  await review.waitForText('Console evidence');
  await review.shoot('07-console-evidence.png');
  await clickText('[role="tab"]', 'Network');
  await review.waitForText('Network evidence');
  await review.evaluate(
    `[...document.querySelectorAll('button')].find((el) => el.textContent.includes('/api/orders') && el.textContent.includes('POST'))?.click()`,
  );
  await delay(300);
  await delay(400);
  await review.evaluate(
    `(() => { const el = [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent.trim() === 'Response'); if (!el) throw new Error('missing Response tab'); el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); el.click(); return true; })()`,
  );
  await delay(400);
  await review.shoot('08-network-evidence.png');
  await clickText('nav button', 'Choose files');
  await review.waitForText('issue.md');
  await review.shoot('09-choose-files.png');
  await review.close();

  // Part 2 · text corrections. Chrome's native context menu cannot be screenshotted, so the
  // page selection is made directly and the resulting correction is seeded the way the
  // "Suggest a correction" menu item stores it.
  await command('Runtime.evaluate', { expression: 'location.reload()' }, pageSession);
  await delay(1_200);
  await command(
    'Emulation.setDeviceMetricsOverride',
    { ...DESKTOP, deviceScaleFactor: SCALE, mobile: false },
    pageSession,
  );
  const selectOnPage = async (text) => {
    const { result } = await command(
      'Runtime.evaluate',
      {
        expression: `(() => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const index = node.textContent.indexOf(${JSON.stringify(text)});
            if (index < 0) continue;
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + ${text.length});
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            return selection.toString();
          }
          return '';
        })()`,
        returnByValue: true,
      },
      pageSession,
    );
    if (result.value !== text) throw new Error(`Could not select "${text}" on the page`);
  };
  const firstOriginal =
    'Almost ready to go. Your everyday backpack is ready for its next adventure.';
  const secondOriginal = 'Discount code';
  await selectOnPage(firstOriginal);
  await delay(300);
  const { data: selectionShot } = await command(
    'Page.captureScreenshot',
    { format: 'png' },
    pageSession,
  );
  await writeFile(join(outDir, '11-select-text.png'), Buffer.from(selectionShot, 'base64'));
  console.log('wrote 11-select-text.png');
  const correctionShotId = crypto.randomUUID();
  await driver.evaluate(`(async () => {
    const db = await new Promise((ok, no) => { const r = indexedDB.open('reprokit-artifacts', 2); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const blob = await (await fetch('data:image/png;base64,${selectionShot}')).blob();
    await new Promise((ok, no) => { const t = db.transaction('screenshots', 'readwrite').objectStore('screenshots').put(blob, ${JSON.stringify(correctionShotId)}); t.onsuccess = () => ok(); t.onerror = () => no(t.error); });
    return true;
  })()`);

  const now = new Date().toISOString();
  const correction = (originalText, proposedText, locale) => ({
    schemaVersion: 1,
    id: crypto.randomUUID(),
    status: 'draft',
    originalText,
    proposedText,
    locale,
    page: {
      url: pageUrl,
      title: 'Everyday Supply · Checkout',
      capturedAt: now,
      screenshotBlobId: correctionShotId,
    },
    context: { element: 'p' },
    environment: { ...session.environment },
  });
  const seedCorrections = (corrections, activeIndex) =>
    driver.evaluate(
      `chrome.storage.session.set({ 'reprokit:correction-collection': ${JSON.stringify({
        schemaVersion: 1,
        id: crypto.randomUUID(),
        page: { url: pageUrl, title: 'Everyday Supply · Checkout' },
        activeCorrectionId: corrections[activeIndex].id,
        corrections,
        createdAt: now,
        updatedAt: now,
      })} })`,
    );
  const shootPanel = async (file, { scrollToEnd = false } = {}) => {
    panel = await openTarget(`${extensionUrl}/sidepanel.html`, PANEL, { newWindow: true });
    await panel.waitForText('Suggested text');
    if (scrollToEnd) {
      await panel.evaluate(
        `(() => { const box = document.querySelector('main > div.overflow-y-auto'); box.scrollTop = box.scrollHeight; return box.scrollTop; })()`,
      );
      await delay(300);
    }
    await panel.shoot(file);
    await panel.close();
  };

  // 12 · the panel opens with the selected text, nothing suggested yet
  await seedCorrections([correction(firstOriginal, '', { source: 'en' })], 0);
  await shootPanel('12-correction-opened.png');
  // 13 · suggested wording and locales entered
  const first = correction(
    firstOriginal,
    'Almost there. Your everyday backpack is packed for its next adventure.',
    {
      source: 'en',
      target: 'en',
    },
  );
  await seedCorrections([first], 0);
  await shootPanel('13-correction-suggestion.png');
  // 14 · a second selection joins the same batch
  const second = correction(secondOriginal, 'Promo code', { source: 'en', target: 'en' });
  await seedCorrections([first, second], 1);
  await shootPanel('14-correction-batch.png');
  // 15 · screenshot preview and export
  await shootPanel('15-correction-export.png', { scrollToEnd: true });
} finally {
  socket?.close();
  chrome.kill('SIGKILL');
  server.close();
  await rm(profile, { recursive: true, force: true }).catch(() => undefined);
}
