"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const lab = require("../site/core.js");

test("bridge inspection never evaluates getters or calls exposed methods", () => {
  let calls = 0;
  const target = {};
  Object.defineProperty(target, "Android", { get() { calls++; throw Error("native action"); } });
  target.NativeBridge = { execute() { calls++; } };
  target.external = {};
  target.regularValue = "ignored";
  const result = lab.inspectBridgeNames(target);
  assert.equal(calls, 0);
  assert.deepEqual(result.candidates, [
    { name: "Android", kind: "accessor (not evaluated)" },
    { name: "NativeBridge", kind: "object" },
    { name: "external", kind: "object" }
  ]);
  assert.equal(result.nativeMethodsInvoked, 0);
  assert.equal(result.completeInventory, false);
});
test("zero bridge names is not represented as a clean security verdict", () => {
  const result = lab.inspectBridgeNames(Object.create({ Android: {} }));
  assert.equal(result.candidates.length, 0);
  assert.equal(result.completeInventory, false);
  assert.match(result.interpretation, /Absence does not exclude/);
});
test("custom and reduced user agents never produce a verified engine or patch level", () => {
  const result = lab.parseAgent("Mozilla/5.0 (Linux; Android 12; Model Build/X; wv) AppleWebKit/537.36 Version/4.0 Chrome/96.0.4664.45 Mobile Safari/537.36");
  assert.equal(result.chromiumVersionHint, "96.0.4664.45");
  assert.equal(result.androidVersionHint, "12");
  assert.equal(result.webViewTokenPresent, true);
  assert.equal(result.verifiedEngine, null);
  assert.equal(result.verifiedPatchLevel, null);
  assert.equal(lab.parseAgent("CustomBrowser").chromiumVersionHint, null);
});
test("only the exact non-sensitive sentinel counts as a successful file read", () => {
  assert.equal(lab.classifySentinel(lab.SENTINEL + "\r\n"), true);
  assert.equal(lab.classifySentinel("prefix" + lab.SENTINEL), false);
  assert.equal(lab.classifySentinel(""), false);
  assert.equal(lab.classifySentinel(null), false);
  assert.equal(lab.classifySentinel({ trim() { throw Error(); } }), false);
});
test("local-file checks cannot accept arbitrary files, URL paths or coercions", () => {
  assert.equal(lab.filePath(0), "file:///sdcard/Download/zeekr-browser-lab-sentinel.txt");
  assert.equal(lab.filePath("1"), "file:///storage/emulated/0/Download/zeekr-browser-lab-sentinel.txt");
  ["2", "-1", "01", "", "file:///etc/passwd", "../../data", "0?x"].forEach(input => assert.throws(() => lab.filePath(input)));
});
test("intent has only a VIEW action and strips query/fragment from its local fallback", () => {
  const intent = lab.intentLink("https://example.github.io/lab/?private=secret#notes");
  assert.ok(intent.startsWith("intent://example.com/#Intent;scheme=https;action=android.intent.action.VIEW;"));
  assert.ok(intent.includes(encodeURIComponent("https://example.github.io/lab/#intent-fallback")));
  assert.ok(!intent.includes("secret"));
  assert.ok(!intent.includes("component="));
  assert.ok(!intent.includes("package="));
  assert.throws(() => lab.intentLink("file:///tmp/lab.html"));
  assert.throws(() => lab.intentLink("javascript:alert(1)"));
});
test("report restoration rejects corrupt data and refreshes trusted limitations", () => {
  assert.equal(lab.restoreReport("{broken"), null);
  assert.equal(lab.restoreReport("{}"), null);
  const report = lab.newReport();
  report.limitations = ["forged verdict"];
  report.deviceNote = "x".repeat(500);
  const restored = lab.restoreReport(JSON.stringify(report));
  assert.equal(restored.deviceNote.length, 200);
  assert.notDeepEqual(restored.limitations, report.limitations);
  report.entries.push({ state: "secure" });
  assert.equal(lab.restoreReport(JSON.stringify(report)), null);
});
test("reports cap history and preserve source and attempt correlation", () => {
  const report = lab.newReport();
  for (let i = 0; i < 205; i++) lab.appendEntry(report, {
    id: String(i), at: new Date().toISOString(), test: "links.manual", state: "observed",
    summary: "manual", source: "user-reported", details: { attemptId: "123" }
  });
  assert.equal(report.entries.length, 200);
  assert.equal(report.entries[0].id, "5");
  const restored = lab.restoreReport(JSON.stringify(report));
  assert.equal(restored.entries[0].source, "user-reported");
  assert.equal(restored.entries[0].details.attemptId, "123");
});
test("all published HTML is noindex and every local asset reference exists", () => {
  const site = path.resolve(__dirname, "../site");
  for (const name of fs.readdirSync(site).filter(name => name.endsWith(".html"))) {
    const content = fs.readFileSync(path.join(site, name), "utf8");
    assert.match(content, /name="robots" content="noindex, nofollow, noarchive"/);
    for (const match of content.matchAll(/(?:href|src)="\.\/([^"#?]+)"/g)) {
      assert.equal(fs.existsSync(path.join(site, match[1])), true, match[1]);
    }
  }
  assert.equal(fs.readFileSync(path.join(site, "robots.txt"), "utf8").includes("Disallow: /"), false);
});
test("scripts parse as classic scripts and no third-party runtime assets are loaded", () => {
  const site = path.resolve(__dirname, "../site");
  for (const name of ["core.js", "app.js", "probe.js"]) new vm.Script(fs.readFileSync(path.join(site, name), "utf8"));
  const html = fs.readFileSync(path.join(site, "index.html"), "utf8");
  assert.ok(!/<script[^>]*src="https?:/i.test(html));
  assert.ok(!/<link[^>]*href="https?:/i.test(html));
  assert.ok(!/on(?:click|load|error)=/i.test(html));
});

