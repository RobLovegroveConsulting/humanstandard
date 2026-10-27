import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/analytics.js', import.meta.url), 'utf8');
const edgeSource = readFileSync(new URL('../netlify/edge-functions/analytics-region.js', import.meta.url), 'utf8');
const { default: edge } = await import('data:text/javascript;base64,' + Buffer.from(edgeSource).toString('base64'));

test('country policy defaults to opt-in, and never trusts client country overrides', async () => {
  for (const country of ['AU', 'NZ', 'US', 'DE', 'FR', 'GB', 'CH', 'BR', 'CA', '', undefined]) {
    const response = edge(new Request('https://humanstandard.au/analytics-region.json?country=AU', { headers: { 'X-Country': 'AU' } }), { geo: { country: { code: country } } });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const body = await response.json();
    assert.equal(body.consentRequired, !['AU', 'NZ', 'US'].includes(country));
    assert.deepEqual(Object.keys(body), ['consentRequired', 'privacyOptOut']);
  }
  for (const header of ['Sec-GPC', 'DNT']) {
    const response = edge(new Request('https://humanstandard.au/analytics-region.json', { headers: { [header]: '1' } }), { geo: { country: { code: 'AU' } } });
    assert.equal((await response.json()).privacyOptOut, true);
  }
});

function browser({ choice, region = { consentRequired: false }, navigator = {}, error = false, pending = false, hostname = 'humanstandard.au' } = {}) {
  class Element {
    hidden = false;
    events = {};
    children = [];
    dataset = {};
    addEventListener(name, fn) { this.events[name] = fn; }
    setAttribute() {}
    appendChild(el) { this.children.push(el); }
    focus() { this.focused = true; }
    click() { this.events.click?.(); }
    querySelector(selector) { return selector === 'button' ? decline : elements[selector]; }
    querySelectorAll() { return [decline, accept]; }
  }
  const accept = new Element(); accept.dataset.analytics = 'accepted';
  const decline = new Element(); decline.dataset.analytics = 'declined';
  const close = new Element();
  const message = new Element();
  const settings = new Element();
  const elements = { '[data-analytics="accepted"]': accept, '[data-analytics-close]': close, '[data-analytics-message]': message };
  const head = new Element();
  const body = new Element();
  const storage = new Map(choice ? [['hs-analytics-consent', choice]] : []);
  let fetchCount = 0, reloads = 0, resolve;
  const gate = pending ? new Promise(r => { resolve = r; }) : Promise.resolve();
  const context = {
    document: { head, body, cookie: '_ga=old', referrer: 'https://example.com/?email=private', createElement: () => new Element(), querySelectorAll: () => [settings] },
    location: { hostname, origin: 'https://' + hostname, pathname: '/resources/', reload: () => { reloads++; } },
    navigator,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    AbortController, setTimeout, clearTimeout,
    fetch: async () => { fetchCount++; await gate; if (error) throw new Error('Unavailable'); return { ok: true, json: async () => region }; }
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return { context, head, body, settings, accept, decline, storage, resolve, banner: () => body.children[0], fetchCount: () => fetchCount, reloads: () => reloads };
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('Australia loads once with no prompt after server decision; footer opt-out stops and reloads', async () => {
  const b = browser(); await settled();
  assert.equal(b.head.children.length, 1);
  assert.match(b.head.children[0].src, /G-WS3JRYW0HP/);
  assert.equal(b.banner().hidden, true);
  assert.equal(b.storage.has('hs-analytics-consent'), false); // automatic is not consent
  b.settings.click(); assert.equal(b.banner().hidden, false);
  b.decline.click();
  assert.equal(b.context['ga-disable-G-WS3JRYW0HP'], true);
  assert.equal(b.reloads(), 1);
  assert.equal(b.storage.get('hs-analytics-consent'), 'declined');
});

test('opt-in region blocks Google until accepted; accepted visitor is remembered', async () => {
  const b = browser({ region: { consentRequired: true } }); await settled();
  assert.equal(b.head.children.length, 0); assert.equal(b.banner().hidden, false);
  b.accept.click(); assert.equal(b.head.children.length, 1); assert.equal(b.banner().hidden, true);
  b.accept.click(); assert.equal(b.head.children.length, 1);
  const returning = browser({ choice: 'accepted', region: { consentRequired: true } }); await settled();
  assert.equal(returning.head.children.length, 1);
});

test('existing decline, GPC, DNT and server privacy signals prevent automatic tracking', async () => {
  for (const options of [{ choice: 'declined' }, { navigator: { globalPrivacyControl: true } }, { navigator: { doNotTrack: '1' } }, { region: { consentRequired: false, privacyOptOut: true } }]) {
    const b = browser(options); await settled();
    assert.equal(b.head.children.length, 0); assert.equal(b.banner().hidden, true);
  }
});

test('failed or malformed geo uses opt-in; preview hosts never load or fetch', async () => {
  for (const options of [{ error: true }, { region: {} }]) {
    const b = browser(options); await settled();
    assert.equal(b.head.children.length, 0); assert.equal(b.banner().hidden, false);
  }
  const preview = browser({ hostname: 'deploy-preview-2--humanstandard.netlify.app' }); await settled();
  assert.equal(preview.fetchCount(), 0); assert.equal(preview.head.children.length, 0);
});

test('preference change while geo is pending is respected; no early Google request', async () => {
  const b = browser({ pending: true });
  b.settings.click(); b.accept.click(); assert.equal(b.head.children.length, 0);
  b.decline.click(); b.resolve(); await settled();
  assert.equal(b.head.children.length, 0);
  const c = browser({ pending: true }); c.settings.click(); c.accept.click();
  c.resolve(); await settled(); assert.equal(c.head.children.length, 1);
});
