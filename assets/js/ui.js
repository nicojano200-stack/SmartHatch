/* ============================================================
   SmartHatch — shared UI behaviours (nav, motion, modal, toast)
   ============================================================ */

(function () {
  "use strict";

  var UI = {};

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  UI.$ = $;
  UI.$$ = $$;

  UI.esc = function (text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  UI.reduced = reduced;

  /* ---------------- nav ---------------- */

  function initNav() {
    var nav = $(".nav");
    if (nav) {
      var onScroll = function () { nav.classList.toggle("is-stuck", window.scrollY > 12); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    var burger = $(".burger");
    var menu = $(".mobile-menu");
    if (burger && menu) {
      burger.addEventListener("click", function () {
        var open = menu.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
      });
      menu.addEventListener("click", function (e) {
        if (e.target.closest("a, button:not(.burger)")) {
          menu.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* ---------------- reveal on scroll ---------------- */

  function initReveal() {
    var items = $$(".reveal");
    if (!items.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.dataset.delay || 0);
        setTimeout(function () { el.classList.add("is-in"); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- counters ---------------- */

  function initCounters() {
    var nodes = $$("[data-count]");
    if (!nodes.length) return;
    var run = function (el) {
      var target = parseFloat(el.dataset.count);
      var suffix = el.dataset.suffix || "";
      var dur = 1300;
      var start = performance.now();
      var tick = function (now) {
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = target >= 100 ? Math.round(target * eased) : (target * eased).toFixed(1);
        el.textContent = val + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      if (reduced) { el.textContent = target + suffix; return; }
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- ripple ---------------- */

  function initRipple() {
    document.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest(".btn, .tile");
      if (!btn || reduced) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = size + "px";
      span.style.left = (e.clientX - r.left - size / 2) + "px";
      span.style.top = (e.clientY - r.top - size / 2) + "px";
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 640);
    });
  }

  /* ---------------- toast ---------------- */

  var ICONS = {
    ok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    err: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2.2" stroke-linecap="round"><path d="M12 16v-5"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>'
  };
  UI.ICONS = ICONS;

  UI.toast = function (title, body, kind) {
    kind = kind || "info";
    var host = $(".toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "toasts";
      document.body.appendChild(host);
    }
    var el = document.createElement("div");
    el.className = "toast toast--" + kind;
    el.setAttribute("role", kind === "err" ? "alert" : "status");
    el.innerHTML = ICONS[kind] + '<div><div class="toast__title">' + UI.esc(title) + "</div>" +
      (body ? '<div class="toast__body">' + UI.esc(body) + "</div>" : "") + "</div>";
    host.appendChild(el);
    var kill = function () {
      el.classList.add("is-out");
      setTimeout(function () { el.remove(); }, 320);
    };
    var timer = setTimeout(kill, 4200);
    el.addEventListener("click", function () { clearTimeout(timer); kill(); });
  };

  /* ---------------- modal ---------------- */

  var lastFocus = null;

  UI.openModal = function (modal) {
    if (typeof modal === "string") modal = $("#" + modal);
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    var first = modal.querySelector("input, select, textarea, button");
    if (first) setTimeout(function () { first.focus(); }, 60);
  };

  UI.closeModal = function (modal) {
    if (typeof modal === "string") modal = $("#" + modal);
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  function initModals() {
    $$(".modal").forEach(function (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal || e.target.closest("[data-close]")) UI.closeModal(modal);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var open = $(".modal.is-open");
        if (open) UI.closeModal(open);
        $$(".menu").forEach(function (m) { m.remove(); });
        var sb = $(".sidebar");
        if (sb) { sb.classList.remove("is-open"); $(".scrim") && $(".scrim").classList.remove("is-open"); }
      }
    });
  }

  /* ---------------- dropdown menu ---------------- */

  UI.menu = function (anchor, items) {
    $$(".menu").forEach(function (m) { m.remove(); });
    var el = document.createElement("div");
    el.className = "menu";
    el.setAttribute("role", "menu");
    el.innerHTML = items.map(function (it) {
      if (it.head) return '<div class="menu__head">' + it.head + "</div>";
      if (it.separator) return '<div style="height:1px;background:var(--line);margin:6px 4px"></div>';
      var label = (it.icon || "") + "<span>" + UI.esc(it.label) + "</span>";
      return it.href
        ? '<a role="menuitem" href="' + it.href + '">' + label + "</a>"
        : '<button type="button" role="menuitem" class="' + (it.danger ? "is-danger" : "") + '" data-action="' + UI.esc(it.action || "") + '">' + label + "</button>";
    }).join("");

    var wrap = anchor.parentElement;
    if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
    wrap.appendChild(el);

    el.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-action]");
      if (!btn) return;
      close();
      var found = items.filter(function (i) { return i.action === btn.dataset.action; })[0];
      if (found && found.onClick) found.onClick();
    });

    function close() {
      el.remove();
      document.removeEventListener("click", onDoc);
    }
    function onDoc(e) { if (!el.contains(e.target) && e.target !== anchor) close(); }
    setTimeout(function () { document.addEventListener("click", onDoc); }, 0);
    return el;
  };

  /* ---------------- field helpers ---------------- */

  UI.setFieldError = function (input, message) {
    var field = input.closest(".field");
    if (!field) return;
    field.classList.toggle("is-invalid", !!message);
    field.classList.toggle("is-valid", !message && !!String(input.value).trim());
    var err = field.querySelector(".error-text");
    if (err) err.textContent = message || "";
    input.setAttribute("aria-invalid", message ? "true" : "false");
  };

  UI.clearErrors = function (form) {
    $$(".field", form).forEach(function (f) { f.classList.remove("is-invalid", "is-valid"); });
    $$(".error-text", form).forEach(function (e) { e.textContent = ""; });
  };

  UI.busy = function (btn, on, label) {
    if (!btn) return;
    if (on) {
      btn.dataset.prevHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span class="btn__label">' + UI.esc(label || "Working…") + "</span>";
    } else {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      if (btn.dataset.prevHtml) btn.innerHTML = btn.dataset.prevHtml;
    }
  };

  UI.strength = function (pwd) {
    var p = String(pwd || "");
    var score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) score++;
    if (p.length === 0) score = 0;
    if (p.length > 0 && score === 0) score = 1;
    return score;
  };

  UI.timeAgo = function (ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return "just now";
    if (d < 3600) return Math.floor(d / 60) + " min ago";
    if (d < 86400) return Math.floor(d / 3600) + " h ago";
    return Math.floor(d / 86400) + " d ago";
  };

  /* ---------------- boot ---------------- */

  function boot() {
    var page = document.body.dataset.page || "";
    document.documentElement.classList.add("js");
    initNav();
    initReveal();
    initCounters();
    initRipple();
    initModals();

    /* password visibility toggles */
    $$("[data-toggle-pass]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.dataset.togglePass);
        if (!input) return;
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        btn.classList.toggle("is-on", show);
        var eye = btn.querySelector("[data-eye-off]");
        if (eye) eye.style.display = show ? "none" : "block";
        var slash = btn.querySelector("[data-eye-on]");
        if (slash) slash.style.display = show ? "block" : "none";
      });
    });

    /* sidebar drawer (dashboard) */
    var burgerSide = $("[data-side-toggle]");
    var sidebar = $(".sidebar");
    if (burgerSide && sidebar) {
      var scrim = $(".scrim");
      if (!scrim) {
        scrim = document.createElement("div");
        scrim.className = "scrim";
        document.body.appendChild(scrim);
      }
      var close = function () { sidebar.classList.remove("is-open"); scrim.classList.remove("is-open"); burgerSide.setAttribute("aria-expanded", "false"); };
      burgerSide.addEventListener("click", function () {
        var open = sidebar.classList.toggle("is-open");
        scrim.classList.toggle("is-open", open);
        burgerSide.setAttribute("aria-expanded", open ? "true" : "false");
      });
      scrim.addEventListener("click", close);
      sidebar.addEventListener("click", function (e) { if (e.target.closest("a,button")) close(); });
    }

    window.__shReady = true;
    document.dispatchEvent(new CustomEvent("sh:ready", { detail: { page: page } }));
  }

  UI.initRevealAfterUpdate = initReveal;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.SHUI = UI;
})();
