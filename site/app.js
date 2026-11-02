(function () {
  "use strict";
  var lab = window.BrowserLab;
  var $ = function (id) { return document.getElementById(id); };
  var storageKey = "zeekr-browser-lab:session:v1";
  var storageAvailable = true;
  var report;
  var generation = 0;
  var counter = 0;
  var isolationRunning = false;
  var fileRunning = false;
  var pendingCancels = [];
  var braveUI;
  var advancedUI;
  try { report = lab.restoreReport(sessionStorage.getItem(storageKey)); }
  catch (_) { storageAvailable = false; }
  report = report || lab.newReport();

  function notice(message) { $("notice").textContent = message; }
  function allowed() {
    if ($("parked").checked) return true;
    notice("Confirm you are parked and authorized before starting a check.");
    return false;
  }
  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(report)); }
    catch (_) { storageAvailable = false; }
    if (!storageAvailable) $("session-storage-note").textContent = "Session storage is unavailable. Results are in memory only and may be lost when you leave. View or export before navigating.";
  }
  function add(test, state, summary, details, source) {
    var entry = {
      id: Date.now().toString(36) + "-" + (++counter),
      at: new Date().toISOString(), test: test, state: state,
      source: source || "browser-observation", summary: summary, details: details || {}
    };
    lab.appendEntry(report, entry);
    persist();
    render();
    notice(summary);
    return entry;
  }
  function badge(id, state, label) {
    $(id).textContent = label;
    $(id).setAttribute("data-state", state);
  }
  function entriesFor(prefix) {
    return report.entries.filter(function (entry) { return entry.test.indexOf(prefix) === 0; });
  }
  function updateOutput(prefix, output, status) {
    var entries = entriesFor(prefix);
    $(output).textContent = entries.length ? JSON.stringify(entries, null, 2) : "No observations yet.";
    if (entries.length) {
      var last = entries[entries.length - 1];
      var review = entries.some(function (entry) { return entry.state === "review"; });
      badge(status, review ? "review" : last.state, review ? "Needs review" : last.state === "observed" ? "Observed" : "Inconclusive");
    } else badge(status, "unknown", prefix === "links" || prefix === "files" ? "Manual" : "Not run");
  }
  function render() {
    $("session-id").textContent = report.session.toUpperCase().slice(-6);
    $("report-count").textContent = String(report.entries.length);
    $("event-total").textContent = report.entries.length + (report.entries.length === 1 ? " entry" : " entries");
    $("boundary-status").textContent = report.entries.some(function (entry) { return entry.state === "review"; }) ?
      "Review an observation" : report.entries.length ? "Limited observations only" : "Awaiting observations";
    updateOutput("bridge", "bridge-output", "bridge-status");
    updateOutput("engine", "engine-output", "engine-status");
    updateOutput("links", "links-output", "links-status");
    updateOutput("files", "files-output", "files-status");
    if (braveUI) braveUI.render(report);
    if (advancedUI) advancedUI.render(report);
    var timeline = $("timeline");
    timeline.textContent = "";
    if (!report.entries.length) {
      var empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Your observations will appear here. Start with the baseline checks.";
      timeline.appendChild(empty);
    }
    report.entries.slice(-12).reverse().forEach(function (entry) {
      var item = document.createElement("li");
      var time = document.createElement("time");
      time.dateTime = entry.at;
      time.textContent = new Date(entry.at).toLocaleTimeString() + " / " + entry.state.toUpperCase();
      var title = document.createElement("strong");
      title.textContent = entry.summary;
      var source = document.createElement("span");
      source.textContent = entry.test + " · " + entry.source;
      item.appendChild(time); item.appendChild(title); item.appendChild(source);
      timeline.appendChild(item);
    });
    var select = $("link-attempt");
    var selected = select.value;
    var attempts = report.entries.filter(function (entry) { return entry.test === "links.attempt"; });
    select.textContent = "";
    if (!attempts.length) {
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Tap a test link first";
      select.appendChild(placeholder);
    }
    attempts.slice().reverse().forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry.id;
      option.textContent = (entry.details.kind || "Link") + " · " + new Date(entry.at).toLocaleTimeString();
      select.appendChild(option);
    });
    if (attempts.some(function (entry) { return entry.id === selected; })) select.value = selected;
    if (!$("report-panel").hidden) $("report-json").value = JSON.stringify(report, null, 2);
  }
  function updateGates() {
    var enabled = $("parked").checked;
    Array.prototype.forEach.call(document.querySelectorAll("[data-test]"), function (node) { node.disabled = !enabled; });
    Array.prototype.forEach.call(document.querySelectorAll(".gated-link"), function (node) { node.setAttribute("aria-disabled", String(!enabled)); });
    $("run-isolation").disabled = !enabled || isolationRunning;
    $("run-baseline").disabled = !enabled || isolationRunning;
    $("run-file").disabled = !enabled || fileRunning;
    if (braveUI) braveUI.gate(enabled);
    if (advancedUI) advancedUI.gate(enabled);
  }
  function environment() {
    if (!allowed()) return;
    var agent = navigator.userAgent || "";
    var details = {
      userAgent: agent,
      hints: lab.parseAgent(agent),
      secureContext: window.isSecureContext === true,
      pageProtocol: window.location.protocol,
      viewport: { width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio },
      available: {
        WebAssembly: typeof window.WebAssembly === "object",
        Worker: typeof window.Worker === "function",
        serviceWorkerAPI: "serviceWorker" in navigator,
        fileReader: typeof window.FileReader === "function",
        blob: typeof window.Blob === "function",
        clipboardAPI: "clipboard" in navigator
      },
      interpretation: "API presence is not permission or exploitability. No API permissions were requested; no workers were started."
    };
    if (navigator.userAgentData) {
      details.userAgentData = {
        brands: navigator.userAgentData.brands,
        mobile: navigator.userAgentData.mobile,
        platform: navigator.userAgentData.platform
      };
    }
    add("engine.environment", "observed", "Environment captured; engine patch status remains unknown.", details);
  }
  function bridges() {
    if (!allowed()) return;
    try {
      var result = lab.inspectBridgeNames(window);
      add("bridge.names", "observed", result.candidates.length + " bridge-like names found; native access is unverified.", result);
    } catch (_) {
      add("bridge.names", "unknown", "Global property inspection was unavailable.", { interpretation: "No security conclusion." });
    }
  }
  function isolation() {
    if (!allowed() || isolationRunning) return;
    isolationRunning = true;
    updateGates();
    var startedGeneration = generation;
    var frame = document.createElement("iframe");
    frame.title = "Sandbox boundary test";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.src = "./probe.html";
    var done = false;
    var timer;
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("message", receive);
      if (frame.parentNode) frame.parentNode.removeChild(frame);
      isolationRunning = false;
      pendingCancels = pendingCancels.filter(function (cancel) { return cancel !== cancelTest; });
      updateGates();
    }
    function finish(state, summary, details) {
      if (done) return;
      done = true;
      cleanup();
      if (generation === startedGeneration) add("engine.sandbox", state, summary, details);
    }
    function cancelTest() { done = true; cleanup(); }
    function receive(event) {
      if (event.source !== frame.contentWindow || !event.data || event.data.type !== "browser-lab-sandbox-ready-v1") return;
      if (event.origin !== "null") {
        finish("review", "Sandbox frame did not report an opaque origin; investigate.", { observedOrigin: event.origin, exploitability: "Unknown" });
        return;
      }
      try {
        var doc = frame.contentWindow.document;
        finish("review", "Sandbox DOM was readable despite an opaque origin; investigate.", { documentReadable: !!doc, exploitability: "Unknown" });
      } catch (error) {
        if (error.name === "SecurityError") {
          finish("observed", "Sandbox DOM access was blocked as expected in this check.", {
            exception: "SecurityError", origin: "null",
            interpretation: "This one DOM boundary held. It does not rule out engine vulnerabilities or native-bridge exposure."
          });
        } else finish("unknown", "Sandbox check ended with an unexpected error.", { errorName: error.name });
      }
    }
    window.addEventListener("message", receive);
    timer = window.setTimeout(function () {
      finish("unknown", "Sandbox probe did not answer within 5 seconds.", { interpretation: "Load, script or policy failure is possible. No security conclusion." });
    }, 5000);
    pendingCancels.push(cancelTest);
    $("probe-host").appendChild(frame);
    notice("Checking the sandbox frame’s DOM boundary…");
  }
  function downloadText(text, filename, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type || "text/plain;charset=utf-8" }));
    var link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  function annotateLink(id, kind) {
    $(id).addEventListener("click", function (event) {
      if (!allowed()) { event.preventDefault(); return; }
      var entry = add("links.attempt", "unknown", kind + " link tapped; outcome not yet verified.", {
        kind: kind, destination: $(id).href,
        userActivation: navigator.userActivation ? navigator.userActivation.isActive : "API unavailable"
      });
      $("link-attempt").value = entry.id;
    });
  }
  try { $("intent-link").href = lab.intentLink(window.location.href); }
  catch (_) { $("intent-link").setAttribute("aria-disabled", "true"); }
  annotateLink("https-link", "HTTPS control");
  annotateLink("intent-link", "Android VIEW intent");
  annotateLink("geo-link", "Map search: Oslo");
  $("record-link").addEventListener("click", function () {
    if (!allowed()) return;
    var attemptId = $("link-attempt").value;
    var attempt = report.entries.find(function (entry) { return entry.id === attemptId && entry.test === "links.attempt"; });
    if (!attempt) { notice("Tap a test link, return here, then record your observation."); return; }
    add("links.manual", $("link-observation").value === "uncertain" ? "unknown" : "observed", "Manual outcome saved for " + attempt.details.kind + ".", {
      attemptId: attemptId, kind: attempt.details.kind, outcome: $("link-observation").value,
      interpretation: "User-reported. Opening an app does not establish privilege escalation."
    }, "user-reported");
  });
  $("download-static").addEventListener("click", function (event) {
    if (!allowed()) { event.preventDefault(); return; }
    add("files.download-attempt", "unknown", "Text download requested; saving is unverified.", { mode: "same-origin-text" });
  });
  $("download-blob").addEventListener("click", function () {
    if (!allowed()) return;
    var attempt = add("files.download-attempt", "unknown", "Blob download requested; saving is unverified.", { mode: "blob" });
    try { downloadText(lab.SENTINEL + "\n", lab.FILE_NAME); }
    catch (error) { add("files.download-error", "unknown", "Blob download could not be requested.", { attemptId: attempt.id, errorName: error.name }); }
  });
  $("record-download").addEventListener("click", function () {
    if (!allowed()) return;
    var attempts = report.entries.filter(function (entry) { return entry.test === "files.download-attempt"; });
    if (!attempts.length) { notice("Try a text or Blob download first."); return; }
    var attempt = attempts[attempts.length - 1];
    add("files.download-manual", $("download-observation").value === "uncertain" ? "unknown" : "observed", "Manual " + attempt.details.mode + " download outcome saved.", {
      attemptId: attempt.id, outcome: $("download-observation").value,
      interpretation: "Download handling is separate from bridge, intent and file-access permissions."
    }, "user-reported");
  });
  $("sentinel-picker").addEventListener("change", function () {
    if (!allowed()) { this.value = ""; return; }
    var file = this.files && this.files[0];
    if (!file) return;
    if (file.name !== lab.FILE_NAME || file.size > 1024) {
      notice("Only the named sentinel text file, at most 1 KB, is read. Selection discarded.");
      this.value = "";
      return;
    }
    if (typeof FileReader !== "function") {
      add("files.picker", "unknown", "FileReader is unavailable in this browser.", {});
      this.value = "";
      return;
    }
    var currentGeneration = generation;
    var reader = new FileReader();
    reader.onload = function () {
      if (generation !== currentGeneration || !$("parked").checked) return;
      var matched = lab.classifySentinel(reader.result);
      add("files.picker", matched ? "observed" : "unknown",
        matched ? "Selected sentinel read with explicit user permission." : "Selected file did not match the sentinel.",
        { sentinelMatched: matched, fileContentsStored: false, interpretation: "User-selected file access is not a vulnerability." });
    };
    reader.onerror = function () {
      if (generation === currentGeneration && $("parked").checked) add("files.picker", "unknown", "The selected sentinel could not be read.", {});
    };
    reader.readAsText(file);
    this.value = "";
  });
  $("run-file").addEventListener("click", function () {
    if (!allowed() || fileRunning) return;
    if (!$("sentinel-ready").checked) { notice("Place the sentinel at the selected path and check the confirmation first."); return; }
    var path = lab.filePath($("sentinel-path").value);
    var currentGeneration = generation;
    fileRunning = true;
    updateGates();
    var xhr = new XMLHttpRequest();
    var ended = false;
    var cspBlocked = false;
    function policy(event) {
      if (event.effectiveDirective === "connect-src" && String(event.blockedURI).indexOf("file") === 0) cspBlocked = true;
    }
    function finish(state, summary, details) {
      if (ended) return;
      ended = true;
      fileRunning = false;
      window.clearTimeout(timer);
      window.removeEventListener("securitypolicyviolation", policy);
      pendingCancels = pendingCancels.filter(function (cancel) { return cancel !== cancelTest; });
      updateGates();
      if (generation === currentGeneration) {
        details.path = path;
        details.cspBlockedObserved = cspBlocked;
        details.fileContentsStored = false;
        add("files.local-sentinel", state, summary, details);
      }
    }
    function cancelTest() {
      if (ended) return;
      generation += 1;
      xhr.abort();
      finish("unknown", "Check cancelled.", {});
    }
    window.addEventListener("securitypolicyviolation", policy);
    var timer = window.setTimeout(function () {
      finish("unknown", "Sentinel path timed out; local-file policy remains unknown.", { outcome: "timeout" });
      xhr.abort();
    }, 4500);
    pendingCancels.push(cancelTest);
    xhr.onload = function () {
      var matched = lab.classifySentinel(xhr.responseText);
      finish(matched ? "review" : "unknown",
        matched ? "Unexpected local sentinel read from this page; vendor review recommended." : "Sentinel was not matched; local-file policy remains unknown.",
        { sentinelMatched: matched, status: xhr.status, interpretation: matched ? "Only this fixed file was readable. No claim about root, arbitrary files or vehicle access." : "Missing file, unsupported scheme, or policy restrictions may explain this result." });
    };
    xhr.onerror = function () { finish("unknown", "Local file read failed; cause and policy are unverified.", { outcome: "request-error" }); };
    xhr.ontimeout = function () { finish("unknown", "Local file read timed out; policy is unverified.", { outcome: "timeout" }); };
    xhr.onabort = function () { finish("unknown", "Local file check was aborted.", { outcome: "aborted" }); };
    try {
      xhr.open("GET", path, true);
      xhr.timeout = 4000;
      xhr.send();
      notice("Checking only the selected sentinel path…");
    } catch (error) {
      finish("unknown", "Browser rejected the sentinel request; policy remains unverified.", { errorName: error.name });
    }
  });
  $("run-environment").addEventListener("click", environment);
  $("run-bridges").addEventListener("click", bridges);
  $("run-isolation").addEventListener("click", isolation);
  $("run-baseline").addEventListener("click", function () { if (allowed()) { environment(); bridges(); isolation(); } });
  $("parked").addEventListener("change", function () {
    if (!this.checked) {
      generation += 1;
      pendingCancels.slice().forEach(function (cancel) { cancel(); });
    }
    updateGates();
    notice(this.checked ? "Checks enabled. Each app link and file operation still needs your action." : "Checks paused. Confirm you are parked to continue.");
  });
  $("device-note").value = report.deviceNote;
  $("session-note").value = report.sessionNote;
  ["device-note", "session-note"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      report.deviceNote = $("device-note").value.slice(0, 200);
      report.sessionNote = $("session-note").value.slice(0, 2000);
      persist();
      if (!$("report-panel").hidden) $("report-json").value = JSON.stringify(report, null, 2);
    });
  });
  $("show-report").addEventListener("click", function () {
    $("report-panel").hidden = !$("report-panel").hidden;
    this.textContent = $("report-panel").hidden ? "View report" : "Hide report";
    $("report-json").value = JSON.stringify(report, null, 2);
    if (!$("report-panel").hidden) $("report-json").focus();
  });
  $("export-report").addEventListener("click", function () {
    $("report-panel").hidden = false;
    $("show-report").textContent = "Hide report";
    $("report-json").value = JSON.stringify(report, null, 2);
    try {
      downloadText($("report-json").value + "\n", "browser-lab-" + report.session + ".json", "application/json");
      notice("JSON download requested. If nothing happens, select the visible report text.");
    } catch (_) { notice("Download unavailable. Select the visible report text instead."); }
  });
  $("clear-report").addEventListener("click", function () {
    generation += 1;
    pendingCancels.slice().forEach(function (cancel) { cancel(); });
    if (advancedUI) advancedUI.reset();
    report = lab.newReport();
    $("device-note").value = ""; $("session-note").value = "";
    $("sentinel-ready").checked = false; $("parked").checked = false;
    if (braveUI) braveUI.reset();
    persist(); render(); updateGates();
    notice("This lab’s session cleared. Existing exported files are unchanged.");
  });
  braveUI = window.BraveInstaller.attach({ add: add, allowed: allowed, getReport: function () { return report; } });
  braveUI.handleFallback();
  advancedUI = window.AdvancedLab.attach({ add: add, allowed: allowed, getReport: function () { return report; } });
  advancedUI.handleFallback();
  window.addEventListener("hashchange", function () { braveUI.handleFallback(); advancedUI.handleFallback(); });
  /* Only annotate a fallback when this tab has a matching intent attempt.
     A fragment alone is never treated as evidence of app launch. */
  if (window.location.hash === "#intent-fallback") {
    var intents = report.entries.filter(function (entry) { return entry.test === "links.attempt" && entry.details.kind === "Android VIEW intent"; });
    if (intents.length) add("links.fallback", "observed", "Intent fallback page loaded; external app launch is not established.", {
      attemptId: intents[intents.length - 1].id,
      interpretation: "Fallback fragment observed after a recorded attempt. This is not an app-launch acknowledgement."
    });
    try { history.replaceState(null, "", window.location.pathname); } catch (_) {}
  }
  /* Back/forward navigation can restore form values after deferred scripts run.
     Reset the gate on pageshow so a restored checkmark never disagrees with buttons. */
  window.addEventListener("pageshow", function () {
    generation += 1;
    pendingCancels.slice().forEach(function (cancel) { cancel(); });
    $("parked").checked = false;
    $("sentinel-ready").checked = false;
    updateGates();
  });
  persist(); render(); updateGates();
}());

