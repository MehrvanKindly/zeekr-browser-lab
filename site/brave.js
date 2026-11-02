(function () {
  "use strict";
  window.BraveInstaller = {
    attach: function (session) {
      var $ = function (id) { return document.getElementById(id); };
      var release = window.BraveRelease;
      var enabled = false;
      var current = null;
      var labels = {
        download: "Official APK download", handoff: "APK intent handoff",
        manual: "Manual downloaded-file route", launch: "Open Brave"
      };
      var outcomes = {
        uncertain: "Unsure / not recorded", downloaded: "APK downloaded",
        "installer-shown": "Installer prompt appeared", installed: "Installation completed",
        "brave-opened": "Brave opened", fallback: "Fallback or another handler appeared",
        "policy-blocked": "Blocked by device policy", incompatible: "Incompatible APK / parse error",
        "no-effect": "No visible effect", cancelled: "Cancelled by user"
      };
      function say(text) { $("brave-notice").textContent = text; }
      $("brave-release-label").textContent = release.tag + " · snapshot checked " + release.checkedOn;
      $("brave-release-source").href = release.releaseUrl;
      release.assets.forEach(function (asset) {
        var option = document.createElement("option");
        option.value = asset.name;
        option.textContent = asset.label + " · " + Math.round(asset.bytes / 1048576) + " MiB";
        $("brave-asset").appendChild(option);
      });
      function setLink(id, url) {
        var element = $(id);
        element.setAttribute("aria-disabled", String(!url));
        element.setAttribute("tabindex", url ? "0" : "-1");
        if (url) element.href = url;
        else element.removeAttribute("href");
      }
      function gate(parked) {
        enabled = parked;
        current = null;
        var launch = null;
        try {
          launch = window.BrowserLab.braveRoutes(release, release.assets[0].name, window.location.href).launch;
          if ($("brave-asset").value) current = window.BrowserLab.braveRoutes(release, $("brave-asset").value, window.location.href);
        } catch (_) { say("Official release metadata is unavailable; APK routes are disabled."); }
        setLink("brave-download", enabled && current ? current.download : null);
        setLink("brave-handoff", enabled && current ? current.handoff : null);
        setLink("brave-launch", enabled ? launch : null);
        $("brave-manual").disabled = !enabled || !current;
        $("brave-record").disabled = !enabled;
        $("brave-asset-info").textContent = current ? current.asset.name + " · " + Math.round(current.asset.bytes / 1048576) + " MiB" : "Select a build to see its filename and download size.";
        $("brave-metadata").textContent = current ? JSON.stringify({
          release: release.tag, checkedOn: release.checkedOn, asset: current.asset,
          downloadedFileVerified: false
        }, null, 2) : "No APK selected.";
      }
      $("brave-asset").addEventListener("change", function () {
        gate($("parked").checked);
        say(current ? "Selected " + current.asset.name + ". Try one route, then record what happened." : "Choose an APK architecture before downloading.");
      });
      function details(route, destination) {
        var data = {
          route: route, label: labels[route], destination: destination || null,
          installationVerified: false,
          interpretation: "A requested action is not confirmation of download, installation or app launch."
        };
        if (route !== "launch" && current) {
          data.release = release.tag;
          data.asset = current.asset.name;
          data.apkUrl = current.asset.url;
          data.publishedSha256 = current.asset.digest;
        }
        if (route === "launch") data.package = "com.brave.browser";
        return data;
      }
      ["download", "handoff", "launch"].forEach(function (route) {
        $("brave-" + route).addEventListener("click", function (event) {
          var link = $("brave-" + route);
          if (!session.allowed() || !link.hasAttribute("href") || (route !== "launch" && !current)) {
            event.preventDefault();
            say("Confirm you are parked and select an APK for download or intent testing.");
            return;
          }
          var data = details(route, link.href);
          data.userActivation = navigator.userActivation ? navigator.userActivation.isActive : "API unavailable";
          var entry = session.add("brave.attempt", "unknown", labels[route] + " requested; outcome unverified.", data);
          $("brave-attempt").value = entry.id;
          say("Attempt recorded. Return here after the device responds, then save your observed outcome.");
        });
      });
      $("brave-manual").addEventListener("click", function () {
        if (!session.allowed() || !current) return;
        var entry = session.add("brave.attempt", "unknown", "Manual file route selected; open the downloaded APK on the device.", details("manual"), "user-reported");
        $("brave-attempt").value = entry.id;
        say("Open " + current.asset.name + " in the device’s Downloads or Files app. This page has only logged your selection.");
      });
      $("brave-record").addEventListener("click", function () {
        if (!session.allowed()) return;
        var attemptId = $("brave-attempt").value;
        var attempt = session.getReport().entries.find(function (entry) { return entry.id === attemptId && entry.test === "brave.attempt"; });
        if (!attempt) { say("Try a Brave route before recording its outcome."); return; }
        var outcome = $("brave-outcome").value;
        if (!Object.prototype.hasOwnProperty.call(outcomes, outcome)) return;
        session.add("brave.manual", outcome === "uncertain" ? "unknown" : "observed",
          "User reported: " + outcomes[outcome] + ".", {
            attemptId: attemptId, route: attempt.details.route,
            asset: attempt.details.asset || null, release: attempt.details.release || null,
            outcome: outcome, installationVerified: false,
            interpretation: "User-reported only. The webpage cannot verify Android package installation."
          }, "user-reported");
        say("Saved your observation for " + (attempt.details.label || "this Brave attempt") + ".");
      });
      function render(report) {
        var entries = report.entries.filter(function (entry) { return entry.test.indexOf("brave.") === 0; });
        $("brave-output").textContent = entries.length ? JSON.stringify(entries, null, 2) : "No Brave attempts yet.";
        $("brave-status").textContent = entries.length ? "Attempts recorded" : "Not attempted";
        $("brave-status").setAttribute("data-state", "unknown");
        var attempts = entries.filter(function (entry) { return entry.test === "brave.attempt"; });
        var selected = $("brave-attempt").value;
        $("brave-attempt").textContent = "";
        if (!attempts.length) {
          var empty = document.createElement("option");
          empty.value = ""; empty.textContent = "Try a route first";
          $("brave-attempt").appendChild(empty);
        }
        attempts.slice().reverse().forEach(function (entry) {
          var option = document.createElement("option");
          option.value = entry.id;
          option.textContent = (entry.details.label || "Brave route") + " · " + (entry.details.asset || "installed app") + " · " + new Date(entry.at).toLocaleTimeString();
          $("brave-attempt").appendChild(option);
        });
        if (attempts.some(function (entry) { return entry.id === selected; })) $("brave-attempt").value = selected;
      }
      function handleFallback() {
        var route = window.location.hash === "#brave-intent-fallback" ? "handoff" : window.location.hash === "#brave-launch-fallback" ? "launch" : null;
        if (!route) return;
        var attempts = session.getReport().entries.filter(function (entry) { return entry.test === "brave.attempt" && entry.details.route === route; });
        if (attempts.length) {
          var attempt = attempts[attempts.length - 1];
          session.add("brave.fallback", "unknown", "Brave route fallback loaded; installation and launch remain unverified.", {
            attemptId: attempt.id, route: route, installationVerified: false,
            interpretation: "Fallback fragment observed after a recorded request. It is not an Android acknowledgement."
          });
        }
        say("The browser returned to the fallback page. This does not confirm installation or app launch.");
        try { history.replaceState(null, "", window.location.pathname + "#brave-install"); } catch (_) {}
      }
      function reset() {
        $("brave-asset").value = "";
        $("brave-outcome").value = "uncertain";
        say("Confirm the device is parked above, then choose an APK.");
      }
      return { gate: gate, render: render, reset: reset, handleFallback: handleFallback };
    }
  };
}());

