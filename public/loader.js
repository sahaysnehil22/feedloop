/* FeedLoop embed loader — the only thing that touches your page's main thread.
   Renders a floating Feedback pill; the full widget loads in an isolated iframe. */
(function () {
  "use strict";
  var script = document.currentScript || document.querySelector('script[data-feedloop-key]');
  if (!script) return;
  var key = script.getAttribute("data-feedloop-key");
  if (!key) {
    console.warn("[feedloop] Missing data-feedloop-key attribute.");
    return;
  }
  var scriptOrigin = new URL(script.src, window.location.href).origin;
  var api = script.getAttribute("data-feedloop-api") || scriptOrigin;

  var ARIA = {
    en: "Open feedback panel",
    es: "Abrir panel de feedback"
  };

  var defaults = {
    accent_color: "#111111",
    widget_position: "bottom-right",
    theme: "light",
    language: "en",
    hide_badge: false
  };

  var cacheKey = "feedloop_cfg_" + key;
  function readCache() {
    try {
      var raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.at > 10 * 60 * 1000) return null;
      return parsed.cfg;
    } catch (e) { return null; }
  }
  function writeCache(cfg) {
    try { localStorage.setItem(cacheKey, JSON.stringify({ cfg: cfg, at: Date.now() })); } catch (e) {}
  }

  var cfg = Object.assign({}, defaults, readCache() || {});
  var langAttr = script.getAttribute("data-feedloop-lang");
  if (langAttr === "es" || langAttr === "en") cfg.language = langAttr;
  if (script.getAttribute("data-feedloop-theme") === "dark") cfg.theme = "dark";

  var side = cfg.widget_position === "bottom-left" ? "left" : "right";

  // Fetch fresh config in the background; apply when it arrives.
  fetch(api + "/api/public/config?key=" + encodeURIComponent(key))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (fresh) {
      if (fresh && typeof fresh === "object") {
        writeCache(fresh);
        apply(Object.assign({}, defaults, fresh));
      }
    })
    .catch(function () {});

  var pill = document.createElement("button");
  pill.type = "button";
  pill.setAttribute("aria-label", ARIA[cfg.language] || ARIA.en);
  pill.style.cssText =
    "position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;" +
    "display:flex;align-items:center;gap:8px;height:38px;padding:0 18px;" +
    "border:none;border-radius:999px;cursor:pointer;" +
    "background:" + cfg.accent_color + ";color:#fff;" +
    "font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;font-weight:700;" +
    "letter-spacing:1.4px;text-transform:uppercase;" +
    "box-shadow:0 4px 18px rgba(0,0,0,.22);transition:transform .16s ease;";
  pill.innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/></svg>' +
    "<span>Feedback</span>";
  pill.addEventListener("mouseenter", function () { pill.style.transform = "translateY(-2px)"; });
  pill.addEventListener("mouseleave", function () { pill.style.transform = "none"; });

  var frame = null;
  var open = false;

  function frameUrl(c) {
    return (
      api + "/w?key=" + encodeURIComponent(key) +
      "&theme=" + encodeURIComponent(c.theme || "light") +
      "&accent=" + encodeURIComponent(c.accent_color || "#111111") +
      "&lang=" + encodeURIComponent(c.language || "en") +
      (c.hide_badge ? "&hide_badge=1" : "")
    );
  }

  function buildFrame(c) {
    var f = document.createElement("iframe");
    f.title = "FeedLoop — feedback";
    f.src = frameUrl(c);
    var dark = c.theme === "dark";
    f.style.cssText =
      "position:fixed;bottom:70px;" + side + ":20px;z-index:2147483000;" +
      "width:384px;height:min(624px,calc(100vh - 96px));max-width:calc(100vw - 40px);" +
      "border:1px solid " + (dark ? "#2c2a27" : "#e8e3d9") + ";border-radius:20px;" +
      "background:" + (dark ? "#1e1d1b" : "#ffffff") + ";" +
      "box-shadow:0 18px 60px rgba(0,0,0,.28);" +
      "opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;" +
      "transition:opacity .2s ease,transform .22s cubic-bezier(.34,1.3,.64,1);";
    f.setAttribute("data-theme", dark ? "dark" : "light");
    return f;
  }

  function apply(c) {
    cfg = c;
    side = c.widget_position === "bottom-left" ? "left" : "right";
    pill.style.background = c.accent_color || defaults.accent_color;
    pill.style.left = side === "left" ? "20px" : "auto";
    pill.style.right = side === "right" ? "20px" : "auto";
    pill.setAttribute("aria-label", ARIA[c.language] || ARIA.en);
    if (frame) {
      frame.src = frameUrl(c);
      frame.style.left = side === "left" ? "20px" : "auto";
      frame.style.right = side === "right" ? "20px" : "auto";
    }
  }

  function toggle() {
    open = !open;
    if (open && !frame) {
      frame = buildFrame(cfg);
      document.body.appendChild(frame);
      // Let it mount before animating in.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          frame.style.opacity = "1";
          frame.style.transform = "none";
          frame.style.pointerEvents = "auto";
        });
      });
    } else if (frame) {
      frame.style.opacity = "0";
      frame.style.transform = "translateY(12px) scale(.98)";
      frame.style.pointerEvents = "none";
    }
  }

  pill.addEventListener("click", toggle);
  document.body.appendChild(pill);

  // Close the panel with Escape.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) toggle();
  });
})();
