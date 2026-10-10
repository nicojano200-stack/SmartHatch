/* ============================================================
   SmartHatch — page controllers
   pages: landing | login | signup | forgot | dashboard
   ============================================================ */

(function () {
  "use strict";

  var $ = SHUI.$, $$ = SHUI.$$, esc = SHUI.esc;

  var ICON = {
    google: '<svg class="provider-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.5 3.8l-.1.2 3.6 2.8.3.3c2.3-2.1 3.7-5.3 3.7-9z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5l-.1.1-3.5 2.7v.1C3.4 21.4 7.4 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.4c-.3-.8-.4-1.6-.4-2.4s.1-1.6.4-2.4v-.2L1.2 6.6l-.2.1A12 12 0 0 0 0 12c0 1.9.5 3.7 1 5.3z"/><path fill="#EA4335" d="M12 4.7c2.3 0 3.9 1 4.7 1.8l3.5-3.4C18 1.1 15.2 0 12 0 7.4 0 3.4 2.6 1.2 6.6l4 3.1c.9-2.9 3.6-5 6.8-5z"/></svg>',
    microsoft: '<svg class="provider-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9.2v9.2H2z"/><path fill="#7FBA00" d="M12.8 2H22v9.2h-9.2z"/><path fill="#00A4EF" d="M2 12.8h9.2V22H2z"/><path fill="#FFB900" d="M12.8 12.8H22V22h-9.2z"/></svg>',
    mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="m3 7 9 6 9-6"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
    lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="4" y="10.5" width="16" height="10" rx="3"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>',
    chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
    spark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7l-2.8 2.8"/></svg>'
  };

  var WAIT = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 750); }); };
  var NEXT_KEY = "smarthatch.next";
  var LAST_KEY = "smarthatch.lastEmail";

  /* Returns the submit button, or null when a submission is already in flight. */
  function submitting(e) {
    var btn = e.target.querySelector('button[type="submit"]');
    if (btn && btn.disabled) return null;
    return btn;
  }

  function goTo(next) {
    var page = next || "dashboard.html";
    location.href = page;
  }

  function afterAuth(session) {
    var next = sessionStorage.getItem(NEXT_KEY) || "dashboard.html";
    sessionStorage.removeItem(NEXT_KEY);
    if (session && next.indexOf("login") === -1) {
      SHUI.toast("Welcome back, " + String(session.name).split(" ")[0], "Your workspace is ready.", "ok");
    }
    setTimeout(function () { goTo(next); }, 420);
  }

  function readNextParam() {
    var p = new URLSearchParams(location.search).get("next");
    if (p && /^[\w.-]+\.html$/.test(decodeURIComponent(p))) sessionStorage.setItem(NEXT_KEY, decodeURIComponent(p));
  }

  /* Redirect authenticated users away from login/signup */
  function redirectIfSignedIn(only) {
    if (!SH.session()) return false;
    if (only === "login" || only === "signup") {
      $("#authNotice") && $("#authNotice").classList.remove("hide");
      setTimeout(function () { location.href = "dashboard.html"; }, 1400);
      return true;
    }
    return false;
  }

  /* ---------------- provider (Google / Microsoft) ---------------- */

  function openProviderModal(provider, purpose) {
    var modal = $("#providerModal");
    if (!modal) return;
    var label = SH.providerLabel(provider);
    var last = localStorage.getItem(LAST_KEY) || "";

    modal.querySelector("[data-p-ico]").innerHTML = provider === "google" ? ICON.google : ICON.microsoft;
    modal.querySelector("[data-p-title]").textContent = "Continue with " + label;
    modal.querySelector("[data-p-sub]").textContent =
      "This demo simulates the " + label + " consent screen. No data leaves your browser.";
    var nameInput = modal.querySelector("[data-p-name]");
    var mailInput = modal.querySelector("[data-p-mail]");
    nameInput.value = "";
    mailInput.value = provider === "google" ? (/@gmail\.com$/i.test(last) ? last : "") : (/@outlook\.com|@hotmail\.com$/i.test(last) ? last : "");
    modal.dataset.provider = provider;
    modal.dataset.purpose = purpose || "login";
    SHUI.openModal(modal);
  }

  function bindProviderModal() {
    var modal = $("#providerModal");
    if (!modal) return;
    var form = modal.querySelector("form");
    var errEl = modal.querySelector("[data-p-error]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn.disabled) return;
      var provider = modal.dataset.provider;
      var name = form.querySelector("[data-p-name]").value.trim();
      var email = form.querySelector("[data-p-mail]").value.trim();
      errEl.classList.add("hide");

      if (!name && !email) {
        errEl.textContent = "Enter your name or the email used with your " + SH.providerLabel(provider) + " account.";
        errEl.classList.remove("hide");
        return;
      }
      if (email && !SH.isEmail(email)) {
        errEl.textContent = "That email address does not look right.";
        errEl.classList.remove("hide");
        return;
      }
      var guess = email || (name.split(/[\s.]+/)[0] || "founder").toLowerCase() + "." + provider + "@smarthatch.com";

      SHUI.busy(btn, true, "Connecting…");
      WAIT(950).then(function () {
        var res = SH.providerSignIn(provider, name, guess);
        SHUI.busy(btn, false);
        if (!res.ok) {
          errEl.textContent = res.error;
          errEl.classList.remove("hide");
          modal.querySelector(".modal__box").classList.add("shake");
          setTimeout(function () { modal.querySelector(".modal__box").classList.remove("shake"); }, 420);
          return;
        }
        localStorage.setItem(LAST_KEY, res.session.email);
        SHUI.closeModal(modal);
        afterAuth(res.session);
      });
    });
  }

  function providerTiles(root, purpose) {
    if (!root) return;
    $$("[data-provider]", root).forEach(function (btn) {
      btn.addEventListener("click", function () { openProviderModal(btn.dataset.provider, purpose); });
    });
  }

  /* ---------------- login page ---------------- */

  function pageLogin() {
    readNextParam();
    if (redirectIfSignedIn("login")) return;

    var chooser = $("#chooserStep");
    var emailStep = $("#emailStep");
    var form = $("#loginForm");
    var emailInput = $("#loginEmail");
    var passInput = $("#loginPassword");
    var formErr = $("#loginError");
    var remember = $("#rememberMe");

    var last = localStorage.getItem(LAST_KEY);
    if (last) {
      emailInput.value = last;
      if (remember) remember.checked = true;
      $("#savedEmail").textContent = last;
      $("#savedBanner") && $("#savedBanner").classList.remove("hide");
    }

    /* chooser: Google → Microsoft → Other email (displayed first, as requested) */
    $$("[data-provider]").forEach(function (btn) {
      btn.addEventListener("click", function () { openProviderModal(btn.dataset.provider, "login"); });
    });

    var otherBtn = $("[data-go='email']", chooser);
    if (otherBtn) {
      otherBtn.addEventListener("click", function () {
        chooser.classList.add("hide");
        emailStep.classList.remove("hide");
        emailStep.classList.add("swap");
        setTimeout(function () { emailInput.focus(); }, 120);
      });
    }
    $$("[data-back]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        emailStep.classList.add("hide");
        chooser.classList.remove("hide");
        chooser.classList.add("swap");
      });
    });

    function showErr(msg) {
      formErr.textContent = msg;
      formErr.classList.remove("hide");
      formErr.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg><span>' + esc(msg) + "</span>";
      emailStep.querySelector(".auth__formbox").classList.add("shake");
      setTimeout(function () { emailStep.querySelector(".auth__formbox").classList.remove("shake"); }, 420);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = submitting(e);
      if (!btn) return;
      formErr.classList.add("hide");
      SHUI.clearErrors(form);
      var bad = false;
      if (!SH.isEmail(emailInput.value)) { SHUI.setFieldError(emailInput, "Enter a valid email address."); bad = true; }
      if (!passInput.value) { SHUI.setFieldError(passInput, "Enter your password."); bad = true; }
      if (bad) { showErr("Check the highlighted fields and try again."); return; }

      SHUI.busy(btn, true, "Verifying…");
      WAIT(700).then(function () {
        var res = SH.signIn(emailInput.value, passInput.value);
        SHUI.busy(btn, false);
        if (!res.ok) { showErr(res.error); return; }
        if (remember && remember.checked) localStorage.setItem(LAST_KEY, res.session.email);
        else localStorage.removeItem(LAST_KEY);
        afterAuth(res.session);
      });
    });

    $$("input", form).forEach(function (i) {
      i.addEventListener("input", function () { SHUI.setFieldError(i, ""); });
    });

    bindProviderModal();
  }

  /* ---------------- signup page ---------------- */

  function pageSignup() {
    readNextParam();
    if (redirectIfSignedIn("signup")) return;

    var form = $("#signupForm");
    var nameI = $("#suName"), mailI = $("#suEmail"), passI = $("#suPass"), termsI = $("#suTerms");
    var meter = $("#suMeter"), meterLabel = $("#suMeterLabel"), err = $("#suError");
    providerTiles($("#suProviders"), "signup");

    var chips = { len: $('[data-chip="len"]'), mix: $('[data-chip="mix"]'), num: $('[data-chip="num"]'), sym: $('[data-chip="sym"]') };
    var words = ["Too short", "Weak", "Fair", "Strong", "Excellent"];

    passI.addEventListener("input", function () {
      var s = SHUI.strength(passI.value);
      meter.dataset.score = s;
      meterLabel.textContent = s ? words[s] : "Use 8+ characters";
      if (chips.len) chips.len.classList.toggle("is-on", passI.value.length >= 8);
      if (chips.mix) chips.mix.classList.toggle("is-on", /[A-Z]/.test(passI.value) && /[a-z]/.test(passI.value));
      if (chips.num) chips.num.classList.toggle("is-on", /\d/.test(passI.value));
      if (chips.sym) chips.sym.classList.toggle("is-on", /[^A-Za-z0-9]/.test(passI.value));
      SHUI.setFieldError(passI, "");
    });

    function showErr(msg) {
      err.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg><span>' + esc(msg) + "</span>";
      err.classList.remove("hide");
      form.classList.add("shake");
      setTimeout(function () { form.classList.remove("shake"); }, 420);
    }

    [nameI, mailI, passI].forEach(function (i) {
      i.addEventListener("input", function () { SHUI.setFieldError(i, ""); err.classList.add("hide"); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = submitting(e);
      if (!btn) return;
      SHUI.clearErrors(form);
      var bad = false;
      if (nameI.value.trim().length < 2) { SHUI.setFieldError(nameI, "Tell us your full name."); bad = true; }
      if (!SH.isEmail(mailI.value)) { SHUI.setFieldError(mailI, "Enter a valid work email."); bad = true; }
      if (passI.value.length < 8) { SHUI.setFieldError(passI, "At least 8 characters, please."); bad = true; }
      else if (SHUI.strength(passI.value) < 2) { SHUI.setFieldError(passI, "Add a capital letter or number to strengthen this."); bad = true; }
      if (bad) { showErr("Please fix the highlighted fields."); return; }
      if (!termsI.checked) { showErr("Accept the Terms and Privacy Policy to create an account."); return; }

      SHUI.busy(btn, true, "Creating workspace…");
      WAIT(900).then(function () {
        var res = SH.signUp({ name: nameI.value, email: mailI.value, password: passI.value });
        SHUI.busy(btn, false);
        if (!res.ok) { showErr(res.error); return; }
        localStorage.setItem(LAST_KEY, res.session.email);
        afterAuth(res.session);
      });
    });

    bindProviderModal();
  }

  /* ---------------- forgot password ---------------- */

  function pageForgot() {
    var steps = $("#fpSteps");
    var panes = { 1: $("#fpMail"), 2: $("#fpCode"), 3: $("#fpNew"), 4: $("#fpDone") };
    var state = { email: "", ticket: "" };
    var current = 1;

    function mark(n) {
      $$(".step", steps).forEach(function (s) {
        var i = Number(s.dataset.step);
        s.classList.toggle("is-active", i === n);
        s.classList.toggle("is-done", i < n);
      });
    }

    function show(n) {
      Object.keys(panes).forEach(function (k) { panes[k].classList.add("hide"); });
      panes[n].classList.remove("hide");
      panes[n].classList.add("swap");
      current = n;
      if (n < 4) mark(n);
      setTimeout(function () {
        var f = panes[n].querySelector("input");
        if (f && n !== 4) f.focus();
      }, 130);
    }

    function errBox(pane, msg) {
      var el = pane.querySelector("[data-err]");
      if (!el) return;
      el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg><span>' + esc(msg) + "</span>";
      el.classList.remove("hide");
      pane.querySelector(".auth__formbox").classList.add("shake");
      setTimeout(function () { pane.querySelector(".auth__formbox").classList.remove("shake"); }, 420);
    }
    function hideErr(pane) { var el = pane.querySelector("[data-err]"); if (el) el.classList.add("hide"); }

    /* step 1 — email */
    var mailPane = panes[1];
    var mailInput = $("#fpEmail");
    $("#fpMailForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = submitting(e);
      if (!btn) return;
      hideErr(mailPane);
      if (!SH.isEmail(mailInput.value)) { errBox(mailPane, "Enter the email you signed up with."); SHUI.setFieldError(mailInput, "Invalid email."); return; }
      SHUI.busy(btn, true, "Sending code…");
      WAIT(850).then(function () {
        SHUI.busy(btn, false);
        var res = SH.requestReset(mailInput.value);
        state.email = res.email;
        state.ticket = res.code;
        $("#fpSentTo").textContent = res.email;
        $("#fpDemoCode").textContent = res.code;
        show(2);
        SHUI.toast("6-digit code sent", "Demo mode: no email server, code is shown on screen.", "info");
      });
    });
    mailInput.addEventListener("input", function () { SHUI.setFieldError(mailInput, ""); });

    /* step 2 — code */
    var codePane = panes[2];
    var boxes = $$("[data-code]", codePane);
    boxes.forEach(function (box, idx) {
      box.addEventListener("input", function () {
        box.value = box.value.replace(/\D/g, "").slice(0, 1);
        box.classList.toggle("filled", !!box.value);
        if (box.value && boxes[idx + 1]) boxes[idx + 1].focus();
        var joined = boxes.map(function (b) { return b.value; }).join("");
        if (joined.length === 6) $("#fpCodeForm").requestSubmit();
      });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !box.value && boxes[idx - 1]) boxes[idx - 1].focus();
        if (e.key === "ArrowLeft" && boxes[idx - 1]) boxes[idx - 1].focus();
        if (e.key === "ArrowRight" && boxes[idx + 1]) boxes[idx + 1].focus();
      });
      box.addEventListener("paste", function (e) {
        e.preventDefault();
        var digits = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6).split("");
        boxes.forEach(function (b, i) { b.value = digits[i] || ""; b.classList.toggle("filled", !!b.value); });
        if (digits.length === 6) $("#fpCodeForm").requestSubmit();
      });
    });

    $("#fpCodeForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = submitting(e);
      if (!btn) return;
      hideErr(codePane);
      var code = boxes.map(function (b) { return b.value; }).join("");
      if (code.length < 6) { errBox(codePane, "Enter all 6 digits."); return; }
      SHUI.busy(btn, true, "Checking…");
      WAIT(650).then(function () {
        SHUI.busy(btn, false);
        var res = SH.verifyReset(state.email, code);
        if (!res.ok) { errBox(codePane, res.error); return; }
        $("#fpResetTo").textContent = state.email;
        show(3);
      });
    });

    $("#fpResend").addEventListener("click", function () {
      var res = SH.requestReset(state.email);
      state.ticket = res.code;
      $("#fpDemoCode").textContent = res.code;
      SHUI.toast("New code sent", "Your previous code is now invalid.", "ok");
    });

    /* step 3 — new password */
    var newPane = panes[3];
    var p1 = $("#fpPass"), p2 = $("#fpPass2"), meter = $("#fpMeter");
    p1.addEventListener("input", function () { meter.dataset.score = SHUI.strength(p1.value); });
    $("#fpNewForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = submitting(e);
      if (!btn) return;
      hideErr(newPane);
      if (p1.value.length < 8) { errBox(newPane, "Password must be at least 8 characters."); return; }
      if (SHUI.strength(p1.value) < 2) { errBox(newPane, "Use a mix of letters and numbers."); return; }
      if (p1.value !== p2.value) { errBox(newPane, "The two passwords do not match."); return; }
      SHUI.busy(btn, true, "Updating…");
      WAIT(800).then(function () {
        SHUI.busy(btn, false);
        var res = SH.completeReset(state.email, p1.value);
        if (!res.ok) { errBox(newPane, res.error); return; }
        $("#fpDoneMail").textContent = state.email;
        show(4);
      });
    });

    $$("[data-back]").forEach(function (b) {
      b.addEventListener("click", function () { show(Number(b.dataset.back)); });
    });

    show(1);
  }

  /* ---------------- dashboard ---------------- */

  function pageDashboard() {
    var s = SH.session();
    if (!s) { location.replace("login.html?next=dashboard.html"); return; }

    $("#dName").textContent = s.name;
    $("#dMail").textContent = s.email;
    $("#dInitials").textContent = s.initials || SHUI.esc(String(s.name).slice(0, 1).toUpperCase());
    $("#dGreet").textContent = "Good " + (new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening") + ", " + String(s.name).split(" ")[0];
    $("#dProvider").textContent = s.provider === "email" ? "Email account" : SH.providerLabel(s.provider) + " account";
    $("#dSince").textContent = "Signed in " + SHUI.timeAgo(s.since);

    var ideas = SH.ideas();
    var list = $("#ideaList");
    function render(rows) {
      if (!rows.length) {
        list.innerHTML = '<div class="empty">No ideas yet. Hatch your first one.</div>';
        return;
      }
      list.innerHTML = rows.map(function (i) {
        var cls = i.stage === "Hatched" ? "tag--ok" : i.stage === "Screening" ? "tag" : i.stage === "Building" ? "tag--now" : "tag--wait";
        return '<div class="list__item">' +
          '<div class="avatar avatar--sm">' + esc(i.title.slice(0, 2).toUpperCase()) + "</div>" +
          '<div class="grow"><div class="list__title">' + esc(i.title) + "</div>" +
          '<div class="list__meta">' + esc(i.team) + " · " + esc(i.updated) + "</div>" +
          '<div class="progress" style="margin-top:8px"><i data-w="' + i.progress + '"></i></div></div>' +
          '<span class="' + cls + '">' + esc(i.stage) + "</span></div>";
      }).join("");
      requestAnimationFrame(function () {
        $$(".progress i", list).forEach(function (bar) { bar.style.width = bar.dataset.w + "%"; });
      });
    }
    render(ideas);

    $("#kpiIdeas").textContent = ideas.length;
    $("#kpiHatched").textContent = ideas.filter(function (i) { return i.stage === "Hatched"; }).length;
    $("#kpiAvg").textContent = Math.round(ideas.reduce(function (a, i) { return a + i.progress; }, 0) / Math.max(1, ideas.length)) + "%";

    /* new idea */
    $("#ideaForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = submitting(e);
      if (!btn) return;
      var title = $("#iTitle").value.trim();
      var err = $("#iError");
      err.classList.add("hide");
      if (title.length < 3) {
        err.textContent = "Give the idea a name of at least 3 characters.";
        err.classList.remove("hide");
        return;
      }
      SHUI.busy(btn, true, "Hatching…");
      WAIT(600).then(function () {
        SHUI.busy(btn, false);
        SH.addIdea({ title: title, team: $("#iTeam").value.trim() || "Unassigned", stage: "Screening" });
        $("#ideaForm").reset();
        SHUI.closeModal("ideaModal");
        var rows = SH.ideas();
        render(rows);
        $("#kpiIdeas").textContent = rows.length;
        $("#kpiAvg").textContent = Math.round(rows.reduce(function (a, i) { return a + i.progress; }, 0) / rows.length) + "%";
        SHUI.toast("Idea added", "“" + title + "” is now in screening.", "ok");
      });
    });

    /* user menu + logout */
    var logoutIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h9"/></svg>';
    var plusIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    var mailIcon = ICON.mail.replace('width="18" height="18"', 'viewBox="0 0 24 24"');

    $("#userChip").addEventListener("click", function () {
      SHUI.menu($("#userChip"), [
        { head: '<div class="row"><div class="avatar avatar--sm">' + esc(s.initials || "S") + '</div><div><div class="small" style="font-weight:600">' + esc(s.name) + '</div><div class="tiny muted">' + esc(s.email) + "</div></div></div>" },
        { label: "New idea", icon: plusIcon, action: "idea" },
        { label: "Copy email", icon: mailIcon, action: "copy" },
        { separator: true },
        { label: "Log out", icon: logoutIcon, danger: true, action: "logout" }
      ].map(function (it) {
        if (it.action === "idea") it.onClick = function () { SHUI.openModal("ideaModal"); };
        if (it.action === "copy") it.onClick = function () {
          (navigator.clipboard ? navigator.clipboard.writeText(s.email) : Promise.reject()).then(
            function () { SHUI.toast("Email copied", s.email, "ok"); },
            function () { SHUI.toast("Copy failed", "Select the email manually.", "err"); }
          );
        };
        if (it.action === "logout") it.onClick = function () { SHUI.openModal("logoutModal"); };
        return it;
      }));
    });

    $("#logoutConfirm").addEventListener("click", function () {
      var btn = $("#logoutConfirm");
      if (btn.disabled) return;
      SHUI.busy(btn, true, "Logging out…");
      WAIT(500).then(function () {
        SH.endSession();
        sessionStorage.setItem("sh.signedout", "1");
        location.href = "index.html";
      });
    });
  }

  /* ---------------- landing ---------------- */

  function pageLanding() {
    if (sessionStorage.getItem("sh.signedout")) {
      sessionStorage.removeItem("sh.signedout");
      SHUI.toast("Signed out", "Your workspace stays saved on this device.", "ok");
    }
    var s = SH.session();
    if (s) {
      $$("[data-guest]").forEach(function (el) { el.classList.add("hide"); });
      $$("[data-user]").forEach(function (el) {
        el.classList.remove("hide");
        el.innerHTML = '<span class="avatar avatar--sm">' + esc(s.initials || "S") + "</span><span>Open workspace</span>";
        el.href = "dashboard.html";
      });
      $("#guestLabel") && ($("#guestLabel").textContent = "Signed in as " + s.email);
    }
    providerTiles($("#landingProviders"), "login");
    bindProviderModal();
  }

  /* ---------------- boot ---------------- */

  function route() {
    var page = document.body.dataset.page;
    var run = function () {
      if (page === "login") pageLogin();
      else if (page === "signup") pageSignup();
      else if (page === "forgot") pageForgot();
      else if (page === "dashboard") pageDashboard();
      else if (page === "landing") pageLanding();
    };
    if (window.__shReady) run();
    else document.addEventListener("sh:ready", run, { once: true });
  }

  window.SHIcons = ICON;
  route();
})();
