/* global fetch, WebSocket */
import process from 'node:process';
import console from 'node:console';
// Isolated Chromium integration test. Build first; set CHROMIUM_PATH to a Chromium executable.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const output = resolve(import.meta.dirname, '../.output');
const profile = await mkdtemp(join(tmpdir(), 'bugreceipt-browser-test-'));
const server = createServer((req, res) => {
  if (req.url === '/redirect') {
    res.writeHead(302, { location: '/api' });
    res.end();
    return;
  }
  if (req.url === '/api') {
    res.setHeader('content-type', 'application/json');
    res.end('{"token":"fixture-secret","ok":true}');
    return;
  }
  if (req.url === '/pending') {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write('data: hello\n\n');
    return;
  }
  if (req.url === '/worker.js') {
    res.setHeader('content-type', 'text/javascript');
    res.end(`console.warn('worker-startup'); fetch('/api');`);
    return;
  }
  res.setHeader('content-type', 'text/html');
  if (req.url === '/frame') {
    res.end(
      `<script>console.log('frame-startup'); new Worker('/worker.js'); fetch('/api');</script>`,
    );
    return;
  }
  res.end(
    `<script>console.log('top-startup'); console.table([{name:'fixture'}]); fetch('/redirect'); fetch('/pending'); fetch('http://127.0.0.1:1/blocked').catch(()=>{}); Promise.reject(new Error('fixture-rejection'));</script><iframe src="http://localhost:${server.address().port}/frame"></iframe>`,
  );
});
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const child = spawn(
  process.env.CHROMIUM_PATH || 'chromium',
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--enable-unsafe-extension-debugging',
    `--user-data-dir=${profile}`,
    '--remote-debugging-port=0',
    `--disable-extensions-except=${output}`,
    `--load-extension=${output}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
let stderr = '';
child.stderr.on('data', (data) => {
  stderr += data;
});
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try {
      port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      break;
    } catch {
      await delay(100);
    }
  }
  assert.ok(port, `Chromium did not start: ${stderr.slice(-1500)}`);
  const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  socket = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const callbacks = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const callback = callbacks.get(message.id);
    callbacks.delete(message.id);
    if (message.error) callback?.reject(new Error(message.error.message));
    else callback?.resolve(message.result);
  });
  const command = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      callbacks.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  const { id: extensionId } = await command('Extensions.loadUnpacked', { path: output });
  const extensionUrl = `chrome-extension://${extensionId}`;
  const { targetId: panelId } = await command('Target.createTarget', {
    url: `${extensionUrl}/review.html`,
  });
  const { sessionId: panel } = await command('Target.attachToTarget', {
    targetId: panelId,
    flatten: true,
  });
  const evaluate = async (expression) => {
    const result = await command(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      panel,
    );
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  for (let i = 0; i < 50; i++) {
    if (await evaluate('typeof chrome.tabs !== "undefined"').catch(() => false)) break;
    await delay(100);
  }
  assert.ok(
    await evaluate('typeof chrome.tabs !== "undefined"'),
    JSON.stringify(
      await evaluate('({url:location.href,body:document.body.innerText.slice(0,300)})'),
    ),
  );
  const tab = await evaluate(`chrome.tabs.create({url:${JSON.stringify(base)},active:true})`);
  const start = await evaluate(
    `chrome.runtime.sendMessage({type:'session:start',tabId:${tab.id},sessionId:crypto.randomUUID(),recordingError:'Integration test: visual capture disabled.'})`,
  );
  assert.equal(start.ok, true, JSON.stringify(start));
  await evaluate(`chrome.tabs.reload(${tab.id})`);
  let captured;
  for (let i = 0; i < 80; i++) {
    captured = await evaluate(`chrome.runtime.sendMessage({type:'session:get'})`);
    if (
      captured.session.diagnostics.some((event) => event.message.includes('worker-startup')) &&
      captured.session.network.some((event) => event.error?.includes('ERR_UNSAFE_PORT'))
    )
      break;
    await delay(100);
  }
  const messages = captured.session.diagnostics.map((event) => event.message).join('\n');
  assert.match(messages, /top-startup/);
  assert.match(messages, /frame-startup/);
  assert.match(messages, /worker-startup/);
  assert.match(messages, /fixture-rejection/);
  assert.ok(
    captured.session.network.some((event) => event.status === 302),
    'Redirect missing',
  );
  assert.ok(
    captured.session.network.some((event) => event.error?.includes('ERR_UNSAFE_PORT')),
    'Browser-blocked request missing',
  );
  assert.ok(
    captured.session.network.some((event) => event.responseBody?.includes('ok')),
    'Response body missing',
  );
  assert.ok(!JSON.stringify(captured.session).includes('fixture-secret'), 'Secret was persisted');
  const stop = await evaluate(`chrome.runtime.sendMessage({type:'session:stop'})`);
  assert.equal(stop.ok, true, JSON.stringify(stop));
  assert.ok(
    stop.session.network.some(
      (event) => event.url.endsWith('/pending') && event.error?.includes('still in progress'),
    ),
  );
  assert.deepEqual(stop.session.captureWarnings ?? [], [], 'Unexpected capture interruption');
  await evaluate(`chrome.tabs.update(${tab.id}, {active:true})`);
  const second = await evaluate(
    `chrome.runtime.sendMessage({type:'session:start',tabId:${tab.id},sessionId:crypto.randomUUID(),recordingError:'Integration test: visual capture disabled.'})`,
  );
  assert.equal(second.ok, true);
  await evaluate(`chrome.tabs.remove(${tab.id})`);
  let interrupted;
  for (let i = 0; i < 50; i++) {
    interrupted = await evaluate(`chrome.runtime.sendMessage({type:'session:get'})`);
    if (interrupted.session.status === 'ready-for-review') break;
    await delay(100);
  }
  assert.equal(
    interrupted.session.endReason,
    'tab-closed',
    'Closing the tab did not finalize the partial capture',
  );
  await evaluate(`chrome.runtime.sendMessage({type:'session:discard'})`);
  console.log(
    `PASS: real Chromium refresh, cross-origin frame, worker startup, rejection, blocked request, redirect, privacy filtering, pending request and stop (${stop.session.diagnostics.length} console, ${stop.session.network.length} network).`,
  );
} finally {
  socket?.close();
  child.kill('SIGTERM');
  server.closeAllConnections();
  server.close();
  await delay(300);
  await rm(profile, { recursive: true, force: true });
}
