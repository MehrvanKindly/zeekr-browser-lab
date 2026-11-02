(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BrowserLab = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var SENTINEL = "ZEEKR_BROWSER_LAB_SENTINEL_V1";
  var FILE_NAME = "zeekr-browser-lab-sentinel.txt";
  var PATHS = [
    "file:///sdcard/Download/" + FILE_NAME,
    "file:///storage/emulated/0/Download/" + FILE_NAME
  ];
  function parseAgent(agent) {
    var chromium = /(?:Chrome|Chromium)\/([\d.]+)/.exec(agent);
    var android = /Android\s+([\d.]+)/.exec(agent);
    return {
      chromiumVersionHint: chromium ? chromium[1] : null,
      androidVersionHint: android ? android[1] : null,
      webViewTokenPresent: /(?:;\s*wv\)|\bwv\b)/.test(agent),
      verifiedEngine: null,
      verifiedPatchLevel: null,
      interpretation: "Self-reported hints only. Reduced or customized user agents and vendor backports prevent a patch verdict."
    };
  }
  function inspectBridgeNames(target) {
    var pattern = /android|native|bridge|webkit|cordova|external|zeekr|3ready|3ss|qt|cef|flutter|reactnative/i;
    var names = Object.getOwnPropertyNames(target);
    var candidates = [];
    names.forEach(function (name) {
      if (!pattern.test(name)) return;
      try {
        var desc = Object.getOwnPropertyDescriptor(target, name);
        if (!desc) return;
        candidates.push({
          name: name,
          kind: Object.prototype.hasOwnProperty.call(desc, "value") ? typeof desc.value : "accessor (not evaluated)"
        });
      } catch (_) {
        candidates.push({ name: name, kind: "descriptor unavailable" });
      }
    });
    return {
      inspectedOwnNameCount: names.length,
      candidates: candidates,
      completeInventory: false,
      nativeMethodsInvoked: 0,
      interpretation: "Name-based hints only; standard browser objects can match. Absence does not exclude bridges, messages, or inherited properties."
    };
  }
  function classifySentinel(text) {
    return typeof text === "string" && text.trim() === SENTINEL;
  }
  function filePath(index) {
    if (String(index) !== "0" && String(index) !== "1") throw new Error("Only the two fixed sentinel paths are allowed.");
    return PATHS[Number(index)];
  }
  function intentLink(baseUrl) {
    var base = new URL(baseUrl);
    if (!/^https?:$/.test(base.protocol)) throw new Error("Serve this lab over HTTP or HTTPS.");
    base.search = "";
    base.hash = "intent-fallback";
    return "intent://example.com/#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=" + encodeURIComponent(base.href) + ";end";
  }
  function newReport() {
    return {
      schema: "browser-lab-report/v1",
      session: Date.now().toString(36),
      createdAt: new Date().toISOString(),
      deviceNote: "",
      sessionNote: "",
      entries: [],
      limitations: [
        "No verified EU 7X exploit or implementation is established by this report.",
        "Native method invocation, permission prompts, automatic app launches, exploit payloads, vehicle control, APK installation and ADB are not tested.",
        "Engine patch status, root access and comprehensive file/bridge security remain unknown.",
        "Manual observations are user-reported, not automatically verified.",
        "File-origin and content-URI access settings are not covered by the HTTPS sentinel check."
      ]
    };
  }
  function appendEntry(report, entry) {
    report.entries.push(entry);
    if (report.entries.length > 200) report.entries.splice(0, report.entries.length - 200);
    return report;
  }
  function restoreReport(raw) {
    try {
      var report = JSON.parse(raw);
      if (!report || report.schema !== "browser-lab-report/v1" || !Array.isArray(report.entries) ||
          typeof report.session !== "string" || typeof report.createdAt !== "string") return null;
      if (report.entries.some(function (e) {
        return !e || typeof e.id !== "string" || typeof e.at !== "string" ||
          typeof e.test !== "string" || typeof e.summary !== "string" ||
          !e.details || typeof e.details !== "object" || Array.isArray(e.details) ||
          ["observed", "review", "unknown"].indexOf(e.state) < 0;
      })) return null;
      var clean = newReport();
      clean.session = report.session.slice(0, 40);
      clean.createdAt = report.createdAt;
      clean.entries = report.entries.slice(-200);
      clean.deviceNote = typeof report.deviceNote === "string" ? report.deviceNote.slice(0, 200) : "";
      clean.sessionNote = typeof report.sessionNote === "string" ? report.sessionNote.slice(0, 2000) : "";
      return clean;
    } catch (_) { return null; }
  }
  return {
    SENTINEL: SENTINEL, FILE_NAME: FILE_NAME, parseAgent: parseAgent,
    inspectBridgeNames: inspectBridgeNames, classifySentinel: classifySentinel,
    filePath: filePath, intentLink: intentLink, newReport: newReport,
    appendEntry: appendEntry, restoreReport: restoreReport
  };
}));

