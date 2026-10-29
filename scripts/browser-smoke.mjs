// Real Chrome/CDP smoke tests. No packages, existing profiles, or production data.
// Run: node scripts/browser-smoke.mjs
// Artifacts: %LOCALAPPDATA%/hermes/cache/scratch/invokas-web-qa
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir, stat, rm, access } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.INVOKAS_QA_DIR || 'C:/Users/zorca/AppData/Local/hermes/cache/scratch/invokas-web-qa';
const runDir = path.join(out, new Date().toISOString().replace(/[:.]/g, '-'));
const downloads = path.join(runDir, 'downloads');
const base = 'http://127.0.0.1:5175';
const report = { startedAt: new Date().toISOString(), root, base, runDir, tests: [], consoleErrors: [], browserExceptions: [], downloads: [], screenshots: [] };
let chrome, vite, socket, sequence = 0;
const pending = new Map();
let serverLog = '';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const j = JSON.stringify;
async function waitFor(fn, label, timeout = 25000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const result = await fn(); if (result) return result; } catch (error) { last = error; }
    await delay(100);
  }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
}
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 45000);
    pending.set(id, { resolve, reject, timer });
    socket.send(j({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const body = () => evaluate('document.body.innerText');
async function text(value) { return waitFor(async () => (await body()).includes(value), `visible text ${value}`); }
async function click(value, selector = 'button') {
  const query = `Array.from(document.querySelectorAll(${j(selector)})).find(e => (e.innerText?.replace(/\\s+/g,'').trim() === ${j(value.replace(/\s+/g, ''))} || e.getAttribute('aria-label') === ${j(value)}) && e.getBoundingClientRect().width && !e.disabled)`;
  await waitFor(() => evaluate(`Boolean(${query})`), `click target ${value}`);
  // Dispatch genuine pointer events through Chrome, not synthetic React callbacks.
  const box = await evaluate(`(() => { const e = ${query}; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...box });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...box });
}
async function fill(selector, value) {
  await waitFor(() => evaluate(`Boolean(document.querySelector(${j(selector)}))`), `input ${selector}`);
  await evaluate(`(() => {const e=document.querySelector(${j(selector)});e.scrollIntoView({block:'center'});e.focus();e.select();})()`);
  await cdp('Input.insertText', { text: value });
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
}
async function screenshot(name) {
  await evaluate('document.fonts.ready.then(() => true)');
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const dest = path.join(runDir, `${name}.png`);
  await writeFile(dest, Buffer.from(result.data, 'base64'));
  report.screenshots.push(dest);
}
async function test(name, fn) {
  const start = Date.now();
  try { const details = await fn(); report.tests.push({ name, status: 'passed', durationMs: Date.now() - start, details }); console.log(`PASS ${name}`); return true; }
  catch (error) {
    report.tests.push({ name, status: 'failed', durationMs: Date.now() - start, error: error.stack });
    console.error(`FAIL ${name}: ${error.message}`);
    try { await screenshot(`failure-${name.replace(/[^a-z0-9]/gi, '-')}`); await writeFile(path.join(runDir, 'last-dom.txt'), await body()); } catch { /* startup may have failed */ }
    return false;
  }
}
function skip(name, reason) { report.tests.push({ name, status: 'blocked', reason }); }
async function navigate(section) { await click(section, 'nav button'); await text(section); }
async function downloaded(ext, action) {
  const before = new Set(await readdir(downloads));
  await action();
  const file = await waitFor(async () => {
    const entries = await readdir(downloads);
    for (const entry of entries) if (!before.has(entry) && entry.toLowerCase().endsWith(ext)) {
      const p = path.join(downloads, entry); if ((await stat(p)).size) return p;
    }
    return false;
  }, `completed ${ext} browser download`, 60000);
  const bytes = await readFile(file);
  report.downloads.push({ file, bytes: bytes.length });
  return { file, bytes };
}
async function freePort() { const s = net.createServer(); await new Promise(resolve => s.listen(0, '127.0.0.1', resolve)); const port = s.address().port; await new Promise(resolve => s.close(resolve)); return port; }
async function killTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') await new Promise(resolve => { const p = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); p.once('exit', resolve); p.once('error', resolve); });
  else child.kill('SIGTERM');
}

await mkdir(downloads, { recursive: true });
try {
  report.buildExists = await access(path.join(root, 'dist/index.html')).then(() => true, () => false);
  // A strict port prevents silently testing an unrelated existing server.
  vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  vite.stdout.on('data', b => { serverLog += b; }); vite.stderr.on('data', b => { serverLog += b; });
  await waitFor(async () => { if (vite.exitCode !== null) throw new Error(`Vite exited ${vite.exitCode}: ${serverLog}`); return (await fetch(base)).ok; }, 'owned Vite server', 45000);
  const port = await freePort();
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--hide-scrollbars', `--user-data-dir=${path.join(runDir, 'chrome-profile')}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  const target = await waitFor(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'), 'Chrome CDP');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer); if (msg.error) p.reject(new Error(j(msg.error))); else p.resolve(msg.result); }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') report.consoleErrors.push(msg.params.args.map(a => a.value ?? a.description).join(' '));
    if (msg.method === 'Runtime.exceptionThrown') report.browserExceptions.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  };
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Log.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `const NativeWorker=window.Worker; window.Worker=class extends NativeWorker { constructor(...args) { super(...args); this.addEventListener('error', e=>console.error('PDF worker error',e.message,e.filename,e.lineno)); this.addEventListener('messageerror',()=>console.error('PDF worker message decoding failed')); } };` });
  await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: base });
  const onboarding = await test('onboarding completion', async () => {
    await waitFor(() => evaluate(`Array.from(document.querySelectorAll('button')).some(e=>e.textContent.includes('English'))`), 'onboarding language buttons');
    await screenshot('onboarding');
    await click('ENEnglish');
    await click('Next');
    await text('Your details');
    const placeholder = await evaluate(`Array.from(document.querySelectorAll('input')).find(e=>!e.disabled && e.type==='text')?.placeholder`);
    if (placeholder !== undefined) await fill(`input[placeholder=${j(placeholder)}]`, 'QA Browser Seller');
    await click('Next');
    await click('Start using Invokas');
    await waitFor(() => evaluate(`Boolean(document.querySelector('nav button'))`), 'main navigation');
    await text('Invoices');
    return { language: 'English', isolation: 'new temporary Chrome profile' };
  });
  let clientId, invoiceId;
  const client = onboarding && await test('create client through UI', async () => {
    await navigate('Clients'); await click('New client');
    await fill('input[name="name"]', 'QA Browser Client');
    await fill('input[name="email"]', 'qa@example.test');
    await click('Save');
    await text('QA Browser Client');
    const rows = await evaluate(`import('/src/lib/db/clients.ts').then(m=>m.listClients())`);
    const saved = rows.find(c => c.name === 'QA Browser Client');
    if (!saved || saved.email !== 'qa@example.test') throw new Error(`Client not persisted: ${j(rows)}`);
    clientId = saved.id; return saved;
  });
  if (!onboarding) skip('create client through UI', 'onboarding blocked');
  const seeded = client && await test('deterministic invoice seed through real DB module', async () => {
    invoiceId = await evaluate(`(async()=>{const m=await import('/src/lib/db/invoices.ts'); return m.saveInvoice({invoice_id:null,input:{number:'QA-BROWSER-0001',sequence_key:'qa-browser',status:'draft',issue_date:'2026-10-29',due_date:'2026-11-12',document_language:'en',client_id:${clientId},client_name:'QA Browser Client',client_company:'',client_company_code:'',client_personal_code:'',client_self_employment_id:'',client_vat_code:'',client_address:'QA Street 1',client_email:'qa@example.test',currency:'EUR',subtotal_minor:12345,discount_minor:0,total_minor:12345,notes:'Browser fixture',terms:'Pay within 14 days'},items:[{position:0,description:'QA browser service',unit:'pcs',quantity_milli:1000,unit_price_minor:12345,discount_bp:0,line_total_minor:12345}]});})()`);
    return { invoiceId, amountMinor: 12345 };
  });
  if (!client) skip('deterministic invoice seed through real DB module', 'client creation blocked');
  const saved = seeded && await test('invoice UI edit and save', async () => {
    await navigate('Invoices'); await text('QA-BROWSER-0001');
    await click('QA-BROWSER-0001', 'button,td');
    await fill('input[placeholder="Description of the item"]', 'QA browser service edited');
    await click('Save draft');
    await waitFor(async () => { const items = await evaluate(`import('/src/lib/db/invoices.ts').then(m=>m.getInvoiceItems(${invoiceId}))`); return items[0]?.description === 'QA browser service edited'; }, 'invoice save read-back');
    await screenshot('invoice-desktop');
    return { invoiceId, description: 'QA browser service edited' };
  });
  if (!seeded) skip('invoice UI edit and save', 'fixture blocked');
  if (saved) {
    await test('PDF real browser download', async () => {
      await navigate('Invoices'); await text('QA-BROWSER-0001');
      await click('QA-BROWSER-0001', 'button,td');
      await text('Export PDF');
      await screenshot('invoice-desktop');
      const { file, bytes } = await downloaded('.pdf', () => click('Export PDF'));
      if (bytes.subarray(0, 5).toString() !== '%PDF-' || bytes.length < 1000 || !bytes.toString('latin1').includes('%%EOF')) throw new Error('Download is not a complete PDF');
      return { file, bytes: bytes.length, signature: '%PDF-', complete: true };
    });
    await test('refresh persistence', async () => {
      await cdp('Page.reload'); await waitFor(() => evaluate(`Boolean(document.querySelector('nav button'))`), 'app after reload');
      const result = await evaluate(`(async()=>{const c=await import('/src/lib/db/clients.ts');const i=await import('/src/lib/db/invoices.ts');return {clients:await c.listClients(),invoices:await i.listInvoices(),items:await i.getInvoiceItems(${invoiceId})}})()`);
      if (!result.clients.some(c=>c.id===clientId) || !result.invoices.some(i=>i.number==='QA-BROWSER-0001' && i.total_minor===12345) || result.items[0]?.description !== 'QA browser service edited') throw new Error(`Refresh lost fixture: ${j(result)}`);
      return result;
    });
    await test('CSV real browser download', async () => {
      await navigate('Invoices'); await text('QA-BROWSER-0001');
      const { file, bytes } = await downloaded('.csv', () => click('Export CSV'));
      const csv = bytes.toString('utf8');
      if (!csv.includes('QA-BROWSER-0001') || !csv.includes('QA Browser Client') || !csv.includes('123.45')) throw new Error(`CSV missing fixture: ${csv}`);
      return { file, bytes: bytes.length, content: csv };
    });
  } else for (const name of ['PDF real browser download', 'refresh persistence', 'CSV real browser download']) skip(name, 'invoice save blocked');
  if (onboarding) {
    await test('settings tabs and save persistence', async () => {
      await navigate('Settings'); await click('Numbering', '[role="tab"]');
      await fill('input[placeholder="INV-{YYYY}-{NNNN}"]', 'QA-{YYYY}-{NNNN}');
      await click('Save');
      await waitFor(() => evaluate(`import('/src/lib/db/settings.ts').then(async m=>(await m.getSettings()).number_mask==='QA-{YYYY}-{NNNN}')`), 'settings save read-back');
      await cdp('Page.reload'); await waitFor(() => evaluate(`Boolean(document.querySelector('nav button'))`), 'reload settings');
      await navigate('Settings'); await click('Numbering', '[role="tab"]');
      await waitFor(()=>evaluate(`Array.from(document.querySelectorAll('input')).some(e=>e.value==='QA-{YYYY}-{NNNN}')`), 'saved numbering field');
      for (const tab of ['Requisites','Amounts','Language','Data']) await click(tab, '[role="tab"]');
      await screenshot('settings-desktop'); return { numberMask: 'QA-{YYYY}-{NNNN}' };
    });
    await test('backup real browser download', async () => {
      await navigate('Settings'); await click('Data', '[role="tab"]');
      const { file, bytes } = await downloaded('.json', () => click('Create backup…'));
      const backup = JSON.parse(bytes.toString('utf8'));
      const serialized = j(backup);
      if (saved && (!serialized.includes('QA-BROWSER-0001') || !serialized.includes('QA browser service edited'))) throw new Error('Backup missing saved invoice');
      return { file, bytes: bytes.length, keys: Object.keys(backup) };
    });
    for (const width of [375, 768]) await test(`mobile ${width}px`, async () => {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
      const audits = [];
      for (const section of ['Invoices', 'Clients', 'Settings']) {
        await navigate(section);
        await screenshot(`mobile-${width}-${section.toLowerCase()}`);
        const audit = await evaluate(`({section:${j(section)},viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,nav:Array.from(document.querySelectorAll('nav button')).map(e=>({name:e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),overflow:Array.from(document.querySelectorAll('main *')).filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'}).slice(0,10).map(e=>({tag:e.tagName,text:e.textContent.slice(0,80)}))})`);
        audits.push(audit);
        if (audit.scrollWidth > width + 1 || audit.viewport !== width) throw new Error(`Page-level horizontal overflow: ${j(audit)}`);
      }
      if (saved) { await navigate('Invoices'); await click('QA-BROWSER-0001', 'button,td'); await text('QA browser service edited'); await screenshot(`mobile-${width}-invoice`); const sw=await evaluate('document.documentElement.scrollWidth'); if(sw>width+1) throw new Error(`Invoice page overflow ${sw} > ${width}`); }
      return audits;
    });
  } else for (const name of ['settings tabs and save persistence','backup real browser download','mobile 375px','mobile 768px']) skip(name, 'onboarding blocked');
  await test('downloaded file:// blocked', async () => {
    const html = await (await fetch(base)).text();
    const local = path.join(runDir, 'downloaded-page.html'); await writeFile(local, html);
    await cdp('Page.navigate', { url: pathToFileURL(local).href });
    await waitFor(async()=> /Invokas/.test(await body()) && /сайт|site|https?|unsupported/i.test(await body()), 'downloaded page warning');
    const warning = await body();
    if (await evaluate(`Boolean(document.querySelector('nav,form,input'))`)) throw new Error('Downloaded page exposes app instead of block');
    await screenshot('file-protocol-block'); return { file: local, warning };
  });
} catch (error) { report.tests.push({ name: 'browser startup/runtime', status: 'failed', error: error.stack }); }
finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Browser closed')); }
  pending.clear();
  await killTree(chrome); await killTree(vite);
  // Do not retain a running browser or a reusable profile after the test.
  await rm(path.join(runDir, 'chrome-profile'), { recursive: true, force: true }).catch(() => {});
  report.finishedAt = new Date().toISOString();
  report.summary = Object.fromEntries(['passed','failed','blocked'].map(s=>[s,report.tests.filter(t=>t.status===s).length]));
  await writeFile(path.join(runDir, 'vite.log'), serverLog);
  await writeFile(path.join(runDir, 'report.json'), j(report, null, 2));
  await writeFile(path.join(out, 'latest-report.json'), j(report, null, 2));
  console.log(j({ ...report.summary, report: path.join(runDir, 'report.json') }, null, 2));
  process.exitCode = report.summary.failed || report.summary.blocked ? 1 : 0;
}
