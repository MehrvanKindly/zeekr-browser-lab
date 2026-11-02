(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AdvancedLabCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function settingsIntent(kind, pageUrl) {
    var actions = {
      install: "android.settings.MANAGE_UNKNOWN_APP_SOURCES",
      developer: "android.settings.APPLICATION_DEVELOPMENT_SETTINGS"
    };
    if (!Object.prototype.hasOwnProperty.call(actions, kind)) throw new Error("Unknown settings screen.");
    var base = new URL(pageUrl);
    if (!/^https?:$/.test(base.protocol)) throw new Error("HTTP or HTTPS required.");
    base.search = "";
    base.hash = "settings-" + kind + "-fallback";
    return "intent:#Intent;action=" + actions[kind] + ";category=android.intent.category.BROWSABLE;S.browser_fallback_url=" + encodeURIComponent(base.href) + ";end";
  }
  function delayedAction(options) {
    var timer = null;
    var startedAt = 0;
    var active = false;
    var delay = 7000;
    function cancel(reason) {
      if (!active) return false;
      active = false;
      options.clearTimeout(timer);
      timer = null;
      options.onCancel(reason);
      return true;
    }
    function tick() {
      if (!active) return;
      if (!options.isAllowed()) { cancel("Page hidden or parked confirmation removed"); return; }
      var elapsed = options.now() - startedAt;
      if (elapsed < 0 || elapsed > delay + 2000) { cancel("Timer interrupted or suspended"); return; }
      if (elapsed >= delay) {
        active = false;
        timer = null;
        options.onFire(elapsed);
        return;
      }
      options.onTick(Math.ceil((delay - elapsed) / 1000));
      timer = options.setTimeout(tick, Math.min(250, delay - elapsed));
    }
    function start() {
      if (active || !options.isAllowed()) return false;
      active = true;
      startedAt = options.now();
      tick();
      return true;
    }
    return { start: start, cancel: cancel, isActive: function () { return active; } };
  }
  return { settingsIntent: settingsIntent, delayedAction: delayedAction };
}));

