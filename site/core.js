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
  function braveRoutes(release, assetName, baseUrl) {
    var allowedAssets = ["Bravearm64Universal.apk", "BraveMonoarm64.apk", "BraveMonoarm.apk", "BraveMonox64.apk", "BraveMonox86.apk"];
    if (!release || !/^v\d+\.\d+\.\d+$/.test(release.tag) || allowedAssets.indexOf(assetName) < 0) throw new Error("Choose a verified official Brave APK.");
    var asset = release.assets.find(function (item) { return item.name === assetName; });
    var expected = "https://github.com/brave/brave-browser/releases/download/" + release.tag + "/" + assetName;
    if (!asset || asset.url !== expected || !/^sha256:[a-f0-9]{64}$/.test(asset.digest) || !(asset.bytes > 0)) throw new Error("Invalid official APK metadata.");
    var base = new URL(baseUrl);
    if (!/^https?:$/.test(base.protocol)) throw new Error("Serve this lab over HTTP or HTTPS.");
    base.search = "";
    base.hash = "brave-intent-fallback";
    var handoff = "intent://" + expected.slice("https://".length) + "#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;type=application/vnd.android.package-archive;S.browser_fallback_url=" + encodeURIComponent(base.href) + ";end";
    base.hash = "brave-launch-fallback";
    var launch = "intent://example.com/#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.brave.browser;S.browser_fallback_url=" + encodeURIComponent(base.href) + ";end";
    return { asset: asset, release: release.tag, download: expected, handoff: handoff, launch: launch };
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
        "Unknown native method invocation, exploit payloads, vehicle control, silent installation, protection bypass, rooting and enabling ADB are not tested.",
        "One explicitly scheduled Brave launch, notification permission and Android settings-screen requests may be tested. These do not verify installation rights or change Android settings.",
        "Brave download and Android handoff routes are user-triggered; Android owns installation consent. Installation outcomes are user-reported, never automatically verified.",
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
    filePath: filePath, intentLink: intentLink, braveRoutes: braveRoutes, newReport: newReport,
    appendEntry: appendEntry, restoreReport: restoreReport
  };
}));

