(function () {
  "use strict";
  window.AdvancedLab = {
    attach: function (session) {
      var $ = function (id) { return document.getElementById(id); };
      var core = window.AdvancedLabCore;
      var enabled = false;
      var permissionPending = false;
      var permissionEpoch = 0;
      var silenceCancel = false;
      var scheduleId = null;
      function say(text) { $("advanced-notice").textContent = text; }
      function activation() { return navigator.userActivation ? navigator.userActivation.isActive : "API unavailable"; }
      function controls() {
        $("advanced-schedule").disabled = !enabled || delayed.isActive() || permissionPending;
        $("advanced-cancel").disabled = !delayed.isActive();
        $("advanced-notifications").disabled = !enabled || permissionPending || delayed.isActive();
        $("advanced-record").disabled = !enabled;
      }
      var delayed = core.delayedAction({
        now: function () { return performance.now(); },
        setTimeout: function (fn, ms) { return window.setTimeout(fn, ms); },
        clearTimeout: function (id) { window.clearTimeout(id); },
        isAllowed: function () { return $("parked").checked && document.visibilityState === "visible"; },
        onTick: function (seconds) {
          say("One Brave launch attempt in " + seconds + " seconds. Avoid interacting; Cancel stops it.");
          controls();
        },
        onCancel: function (reason) {
          controls();
          if (!silenceCancel) session.add("advanced.cancelled", "observed", "Scheduled Brave launch cancelled.", { scheduleId: scheduleId, reason: reason, launchRequested: false });
          say("Scheduled Brave launch cancelled: " + reason + ".");
        },
        onFire: function (elapsed) {
          controls();
          var active = activation();
          if (active === true) {
            session.add("advanced.skipped", "unknown", "Delayed launch skipped because user activation was still present.", { scheduleId: scheduleId, elapsedMs: elapsed, userActivation: active, launchRequested: false });
            say("New or retained user activation was detected. No launch requested; retry without interacting.");
            return;
          }
          var url = window.BrowserLab.braveRoutes(window.BraveRelease, window.BraveRelease.assets[0].name, window.location.href).launch;
          var entry = session.add("brave.attempt", "unknown", "Delayed Brave launch requested; app opening is unverified.", {
            route: "delayed-launch", label: "Delayed Brave launch", destination: url, package: "com.brave.browser",
            scheduleId: scheduleId, elapsedMs: elapsed, userActivation: active, installationVerified: false,
            interpretation: "One explicitly scheduled request. Observe the device; an attempt is not proof of app launch or installation."
          });
          $("brave-attempt").value = entry.id;
          say("Delayed launch requested. Record the actual outcome under Brave attempts.");
          try { window.location.assign(url); }
          catch (error) { session.add("advanced.launch-error", "unknown", "Delayed launch navigation was rejected.", { attemptId: entry.id, errorName: error.name }); }
        }
      });
      $("advanced-schedule").addEventListener("click", function () {
        if (!session.allowed() || delayed.isActive() || permissionPending || document.visibilityState !== "visible") return;
        var entry = session.add("advanced.scheduled", "unknown", "One Brave launch scheduled after 7 seconds.", { delayMs: 7000, launchRequested: false });
        scheduleId = entry.id;
        delayed.start();
        controls();
      });
      $("advanced-cancel").addEventListener("click", function () { delayed.cancel("Cancelled by user"); });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible") delayed.cancel("Tab hidden");
      });
      document.addEventListener("click", function (event) {
        var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
        if (link && link.getAttribute("href").charAt(0) !== "#") delayed.cancel("Another link was selected");
      }, true);
      window.addEventListener("pagehide", function () {
        permissionEpoch += 1;
        delayed.cancel("Page navigation");
      });
      $("advanced-notifications").addEventListener("click", function () {
        if (!session.allowed() || permissionPending) return;
        delayed.cancel("Notification permission requested");
        if (!window.isSecureContext || typeof window.Notification === "undefined" || typeof window.Notification.requestPermission !== "function") {
          session.add("advanced.notification", "unknown", "Notification permission API unavailable in this context.", {
            secureContext: window.isSecureContext === true, permissionRequested: false,
            interpretation: "Unavailable API or insecure context; this says nothing about installation permissions."
          });
          say("This context cannot request notification permission.");
          return;
        }
        var before = window.Notification.permission;
        var epoch = permissionEpoch;
        var attempt = session.add("advanced.permission-request", "unknown", "Notification permission requested; prompt visibility is unverified.", {
          permissionBefore: before, userActivation: activation(), notificationsSent: 0
        });
        permissionPending = true;
        controls();
        say("Respond to any browser permission prompt. No notification will be sent.");
        var settled = false;
        function finish(value, errorName) {
          if (settled) return;
          settled = true;
          permissionPending = false;
          controls();
          if (epoch !== permissionEpoch) {
            say("Previous permission request finished; its result was discarded after pause, navigation or reset.");
            return;
          }
          var valid = ["granted", "denied", "default"].indexOf(value) >= 0;
          session.add("advanced.notification", valid ? "observed" : "unknown", valid ? "Notification API returned: " + value + "." : "Notification permission request failed.", {
            attemptId: attempt.id, permissionBefore: before, permissionAfter: valid ? value : null,
            errorName: errorName || null, promptVisibilityVerified: false, notificationsSent: 0,
            interpretation: "API result only. Prior decisions or policy can suppress a prompt. No APK permission or native access is established."
          });
          say(valid ? "Notification API returned " + value + ". No notification sent." : "Notification permission request was unavailable or rejected.");
        }
        try {
          var result = window.Notification.requestPermission(function (value) { finish(value); });
          if (result && typeof result.then === "function") result.then(function (value) { finish(value); }, function (error) { finish(null, error && error.name || "Error"); });
        } catch (error) { finish(null, error.name); }
      });
      ["install", "developer"].forEach(function (kind) {
        $("advanced-" + kind).addEventListener("click", function (event) {
          var link = $("advanced-" + kind);
          if (!session.allowed() || !link.hasAttribute("href")) { event.preventDefault(); return; }
          delayed.cancel("A settings screen was requested");
          var entry = session.add("advanced.attempt", "unknown", (kind === "install" ? "Installation-source" : "Developer") + " settings requested; opening is unverified.", {
            kind: kind, destination: link.href, settingsChanged: false, adbEnabled: false,
            interpretation: "Documented screen request only. The browser or Android may reject it."
          });
          $("advanced-attempt").value = entry.id;
          say("Settings screen requested. Return and record what you saw; this page changed no settings.");
        });
      });
      $("advanced-record").addEventListener("click", function () {
        if (!session.allowed()) return;
        var attempt = session.getReport().entries.find(function (entry) { return entry.test === "advanced.attempt" && entry.id === $("advanced-attempt").value; });
        if (!attempt) { say("Request a settings screen first."); return; }
        var outcome = $("advanced-outcome").value;
        session.add("advanced.manual", outcome === "uncertain" ? "unknown" : "observed", "Settings-screen outcome recorded by user.", {
          attemptId: attempt.id, kind: attempt.details.kind, outcome: outcome,
          interpretation: "User-reported screen behavior only; no permission, ADB or installation change is verified."
        }, "user-reported");
        say("Settings outcome saved.");
      });
      function gate(parked) {
        if (!parked && enabled) {
          permissionEpoch += 1;
          delayed.cancel("Parked confirmation removed");
        }
        enabled = parked;
        ["install", "developer"].forEach(function (kind) {
          var link = $("advanced-" + kind);
          link.removeAttribute("href");
          if (enabled) {
            try { link.href = core.settingsIntent(kind, window.location.href); } catch (_) {}
          }
          link.setAttribute("aria-disabled", String(!link.hasAttribute("href")));
          link.setAttribute("tabindex", link.hasAttribute("href") ? "0" : "-1");
        });
        controls();
      }
      function render(report) {
        var entries = report.entries.filter(function (entry) { return entry.test.indexOf("advanced.") === 0 || (entry.test === "brave.attempt" && entry.details.route === "delayed-launch"); });
        $("advanced-output").textContent = entries.length ? JSON.stringify(entries, null, 2) : "No additional observations yet.";
        var attempts = entries.filter(function (entry) { return entry.test === "advanced.attempt"; });
        var previous = $("advanced-attempt").value;
        $("advanced-attempt").textContent = "";
        if (!attempts.length) {
          var empty = document.createElement("option");
          empty.value = ""; empty.textContent = "Request a settings screen first";
          $("advanced-attempt").appendChild(empty);
        }
        attempts.slice().reverse().forEach(function (entry) {
          var option = document.createElement("option");
          option.value = entry.id;
          option.textContent = entry.details.kind + " settings · " + new Date(entry.at).toLocaleTimeString();
          $("advanced-attempt").appendChild(option);
        });
        if (attempts.some(function (entry) { return entry.id === previous; })) $("advanced-attempt").value = previous;
      }
      function handleFallback() {
        var match = /^#settings-(install|developer)-fallback$/.exec(window.location.hash);
        if (!match) return;
        var attempts = session.getReport().entries.filter(function (entry) { return entry.test === "advanced.attempt" && entry.details.kind === match[1]; });
        if (attempts.length) session.add("advanced.fallback", "unknown", "Settings fallback observed; screen opening is unverified.", { attemptId: attempts[attempts.length - 1].id, kind: match[1] });
        say(attempts.length ? "Settings fallback observed. No setting change or successful screen opening is established." : "Fallback marker has no matching settings request in this tab.");
        try { history.replaceState(null, "", window.location.pathname + "#advanced-tests"); } catch (_) {}
      }
      function reset() {
        permissionEpoch += 1;
        silenceCancel = true;
        delayed.cancel("Session cleared");
        silenceCancel = false;
        $("advanced-outcome").value = "uncertain";
        say(permissionPending ? "An earlier browser permission prompt may still be open; its result will not be saved." : "No additional test is running.");
      }
      return { gate: gate, render: render, reset: reset, handleFallback: handleFallback };
    }
  };
}());

