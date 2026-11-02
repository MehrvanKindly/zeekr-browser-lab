"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const core = require("../site/advanced-core.js");

function clockFixture() {
  let now = 0, nextId = 1, allowed = true;
  const pending = new Map(), fired = [], cancelled = [];
  const action = core.delayedAction({
    now: () => now, setTimeout: fn => { const id = nextId++; pending.set(id, fn); return id; },
    clearTimeout: id => pending.delete(id), isAllowed: () => allowed,
    onTick: () => {}, onFire: elapsed => fired.push(elapsed), onCancel: reason => cancelled.push(reason)
  });
  function tickAt(value) { now = value; const tasks = [...pending.values()]; pending.clear(); tasks.forEach(fn => fn()); }
  return { action, fired, cancelled, pending, tickAt, setAllowed: value => { allowed = value; } };
}
test("delayed launch requires explicit start, cannot duplicate, and fires only once", () => {
  const f = clockFixture();
  assert.equal(f.pending.size, 0);
  assert.equal(f.action.start(), true);
  assert.equal(f.action.start(), false);
  f.tickAt(6999);
  assert.equal(f.fired.length, 0);
  f.tickAt(7000);
  assert.deepEqual(f.fired, [7000]);
  f.tickAt(9000);
  assert.equal(f.fired.length, 1);
});
test("explicit cancellation and lost visibility/authorization prevent delayed actions", () => {
  for (const mode of ["cancel", "hidden"]) {
    const f = clockFixture(); f.action.start();
    if (mode === "cancel") f.action.cancel("User cancelled");
    else f.setAllowed(false);
    f.tickAt(7000);
    assert.equal(f.fired.length, 0);
    assert.equal(f.cancelled.length, 1);
    assert.equal(f.action.isActive(), false);
  }
});
test("suspended or late timers cancel rather than launching unexpectedly", () => {
  const f = clockFixture(); f.action.start(); f.tickAt(12000);
  assert.equal(f.fired.length, 0);
  assert.match(f.cancelled[0], /suspended/);
});
test("settings links allow only two screen actions and carry no package grants or commands", () => {
  for (const kind of ["install", "developer"]) {
    const intent = core.settingsIntent(kind, "https://example.org/lab/?token=secret#old");
    assert.match(intent, /^intent:#Intent;action=android.settings./);
    assert.ok(!/component=|launchFlags=|package=|secret|ADB_ENABLED/.test(intent));
    const fallback = decodeURIComponent(/S.browser_fallback_url=([^;]+)/.exec(intent)[1]);
    assert.equal(fallback, "https://example.org/lab/#settings-" + kind + "-fallback");
  }
  for (const kind of ["adb", "root", "__proto__", "developer;component=x"])
    assert.throws(() => core.settingsIntent(kind, "https://example.org"));
  assert.throws(() => core.settingsIntent("install", "file:///tmp/index.html"));
});

function uiFixture(requestPermission) {
  const nodes = new Map(), entries = [], timers = new Map(), pageListeners = {};
  let nextTimer = 1, calls = 0, now = 0, navigations = [];
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      value: "", checked: id === "parked", children: [], attrs: {}, listeners: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      setAttribute(key, value) { this.attrs[key] = value; },
      removeAttribute(key) { delete this.attrs[key]; if (key === "href") delete this.href; },
      hasAttribute(key) { return key === "href" ? !!this.href : key in this.attrs; },
      appendChild(child) { this.children.push(child); }
    });
    return nodes.get(id);
  }
  const document = {
    visibilityState: "visible", getElementById: node,
    createElement: () => ({ value: "", textContent: "" }),
    addEventListener(type, fn) { pageListeners[type] = fn; }
  };
  const window = {
    AdvancedLabCore: core, isSecureContext: true,
    location: { href: "https://example.org/lab/", hash: "", assign: value => navigations.push(value) },
    setTimeout(fn) { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(type, fn) { pageListeners[type] = fn; },
    Notification: { permission: "default", requestPermission(callback) { calls++; return requestPermission(callback); } },
    BraveRelease: { assets: [{ name: "fixture.apk" }] },
    BrowserLab: { braveRoutes: () => ({ launch: "intent://example.com/#Intent;package=com.brave.browser;end" }) }
  };
  const navigator = { userActivation: { isActive: false } };
  const context = { window, document, navigator, performance: { now: () => now }, history: { replaceState() {} } };
  vm.runInNewContext(fs.readFileSync(require.resolve("../site/advanced.js"), "utf8"), context);
  const report = { entries };
  const session = {
    allowed: () => node("parked").checked,
    getReport: () => report,
    add(test, state, summary, details, source) {
      const entry = { id: String(entries.length + 1), test, state, summary, details, source };
      entries.push(entry); return entry;
    }
  };
  const ui = window.AdvancedLab.attach(session);
  function click(id) { node(id).listeners.click({ preventDefault() {} }); }
  function tickAt(value) { now = value; const tasks = [...timers.values()]; timers.clear(); tasks.forEach(fn => fn()); }
  return { ui, node, click, entries, timers, navigations, navigator, tickAt, calls: () => calls };
}
test("attaching and enabling advanced UI does not request permissions or launch apps", () => {
  const f = uiFixture(() => Promise.resolve("denied"));
  f.ui.gate(true);
  assert.equal(f.calls(), 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.navigations.length, 0);
  assert.equal(f.entries.length, 0);
});
test("notification callback plus Promise produces one result and no notifications", async () => {
  const f = uiFixture(callback => { callback("denied"); return Promise.resolve("denied"); });
  f.ui.gate(true); f.click("advanced-notifications");
  await Promise.resolve();
  assert.equal(f.calls(), 1);
  assert.equal(f.entries.filter(e => e.test === "advanced.notification").length, 1);
  const result = f.entries.find(e => e.test === "advanced.notification");
  assert.equal(result.details.permissionAfter, "denied");
  assert.equal(result.details.notificationsSent, 0);
  assert.equal(result.details.promptVisibilityVerified, false);
});
test("late permission replies are discarded after session reset", async () => {
  let resolve;
  const f = uiFixture(() => new Promise(done => { resolve = done; }));
  f.ui.gate(true); f.click("advanced-notifications");
  f.ui.reset(); f.entries.length = 0;
  resolve("granted"); await Promise.resolve();
  assert.equal(f.entries.length, 0);
});
test("fresh activation skips the delayed launch; no activation makes only one logged request", () => {
  for (const active of [true, false]) {
    const f = uiFixture(() => Promise.resolve("denied"));
    f.ui.gate(true); f.click("advanced-schedule");
    f.navigator.userActivation.isActive = active;
    f.tickAt(7000);
    assert.equal(f.navigations.length, active ? 0 : 1);
    const attempt = f.entries.find(e => e.test === "brave.attempt");
    if (!active) {
      assert.equal(attempt.state, "unknown");
      assert.equal(attempt.details.installationVerified, false);
      assert.equal(attempt.details.userActivation, false);
    }
  }
});
