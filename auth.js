/* ============================================================
   SmartHatch — client-side auth (demo only, localStorage backed)
   Real deployments must replace this with a server session.
   ============================================================ */

(function () {
  "use strict";

  var KEYS = {
    users: "smarthatch.users.v1",
    session: "smarthatch.session.v1",
    tickets: "smarthatch.tickets.v1",
    ideas: "smarthatch.ideas.v1"
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable (private mode) — state stays in memory */
      memory[key] = value;
    }
  }

  var memory = {};
  function get(key, fallback) {
    return key in memory ? memory[key] : read(key, fallback);
  }
  function set(key, value) {
    write(key, value);
    memory[key] = value;
  }

  /* Demo-grade digest. Not for production secrets. */
  function digest(text) {
    var h = 5381;
    var salted = "sh1:" + text + ":hatch";
    for (var i = 0; i < salted.length; i++) {
      h = (h * 33) ^ salted.charCodeAt(i);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  function isEmail(v) { return EMAIL_RE.test(String(v || "").trim()); }

  function normalize(email) { return String(email || "").trim().toLowerCase(); }

  function users() { return get(KEYS.users, []); }
  function saveUsers(list) { set(KEYS.users, list); }

  function findUser(email) {
    var e = normalize(email);
    return users().filter(function (u) { return u.email === e; })[0] || null;
  }

  function publicUser(u) {
    if (!u) return null;
    return { name: u.name, email: u.email, provider: u.provider, createdAt: u.createdAt, initials: u.initials };
  }

  function initialsOf(name, email) {
    var src = (name || email || "?").trim();
    var parts = src.split(/[\s._@-]+/).filter(Boolean);
    var out = (parts[0] || "?").slice(0, 1);
    if (parts.length > 1) out += (parts[1] || "").slice(0, 1);
    return out.toUpperCase();
  }

  function seed() {
    if (users().length) return;
    var created = Date.now() - 1000 * 60 * 60 * 24 * 12;
    saveUsers([
      {
        id: "u-demo",
        name: "Aria Nguyen",
        email: "demo@smarthatch.com",
        pass: digest("Hatch2026"),
        provider: "email",
        createdAt: created,
        initials: "AN"
      }
    ]);
  }

  /* ---------------- session ---------------- */

  function session() { return get(KEYS.session, null); }

  function startSession(user) {
    var s = {
      email: user.email,
      name: user.name,
      provider: user.provider,
      initials: user.initials,
      since: Date.now()
    };
    set(KEYS.session, s);
    return s;
  }

  function endSession() {
    try { localStorage.removeItem(KEYS.session); } catch (e) {}
    delete memory[KEYS.session];
  }

  function guard() {
    if (session()) return true;
    var back = encodeURIComponent(location.pathname.split("/").pop() || "index.html");
    location.replace("login.html?next=" + back);
    return false;
  }

  /* ---------------- accounts ---------------- */

  function signUp(input) {
    var name = String(input.name || "").trim();
    var email = normalize(input.email);
    if (name.length < 2) return { ok: false, error: "Please enter your full name." };
    if (!isEmail(email)) return { ok: false, error: "That email address does not look right." };
    if (findUser(email)) return { ok: false, error: "An account with this email already exists. Try logging in." };
    if (String(input.password || "").length < 8) return { ok: false, error: "Password must be at least 8 characters." };

    var user = {
      id: "u-" + Math.random().toString(36).slice(2, 9),
      name: name,
      email: email,
      pass: digest(input.password),
      provider: "email",
      createdAt: Date.now(),
      initials: initialsOf(name, email)
    };
    var list = users();
    list.push(user);
    saveUsers(list);
    return { ok: true, user: user, session: startSession(user) };
  }

  function signIn(email, password) {
    var user = findUser(email);
    if (!user) return { ok: false, error: "No SmartHatch account found for that email." };
    if (user.provider !== "email") {
      return { ok: false, error: "This account uses " + providerLabel(user.provider) + ". Continue with that provider instead." };
    }
    if (user.pass !== digest(password)) return { ok: false, error: "Incorrect password. Try again or reset it." };
    return { ok: true, user: user, session: startSession(user) };
  }

  function providerLabel(p) {
    return p === "google" ? "Google" : p === "microsoft" ? "Microsoft" : "email";
  }

  function providerEmail(name, domain) {
    var handle = normalize(name).replace(/[^a-z0-9._-]+/g, ".").replace(/^\.+|\.+$/g, "") || "founder";
    return handle + "@" + domain;
  }

  function providerSignIn(provider, rawName, rawEmail) {
    var name = String(rawName || "").trim();
    var email = normalize(rawEmail || providerEmail(name || provider + " user", provider === "google" ? "gmail.com" : "outlook.com"));
    if (!isEmail(email)) return { ok: false, error: "Enter a valid " + providerLabel(provider) + " email address." };
    var display = name || email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });

    var user = findUser(email);
    if (!user) {
      user = {
        id: "u-" + Math.random().toString(36).slice(2, 9),
        name: display,
        email: email,
        pass: null,
        provider: provider,
        createdAt: Date.now(),
        initials: initialsOf(display, email)
      };
      var list = users();
      list.push(user);
      saveUsers(list);
    } else if (user.provider !== provider) {
      return { ok: false, error: "That email is registered with " + providerLabel(user.provider) + ". Use the matching sign-in option." };
    }
    return { ok: true, user: user, session: startSession(user) };
  }

  /* ---------------- password reset ---------------- */

  var CODE_TTL = 10 * 60 * 1000;

  function tickets() { return get(KEYS.tickets, {}); }

  function requestReset(email) {
    var e = normalize(email);
    if (!isEmail(e)) return { ok: false, error: "Enter a valid email address." };
    var user = findUser(e);
    var t = tickets();
    var code = String(Math.floor(100000 + Math.random() * 900000));
    /* Always report success so accounts cannot be enumerated. */
    t[e] = { code: code, exp: Date.now() + CODE_TTL, tries: 0 };
    set(KEYS.tickets, t);
    return { ok: true, email: e, code: code, existing: !!user, provider: user ? user.provider : null };
  }

  function verifyReset(email, code) {
    var e = normalize(email);
    var t = tickets();
    var ticket = t[e];
    if (!ticket) return { ok: false, error: "This reset request has expired. Start again." };
    if (Date.now() > ticket.exp) { delete t[e]; set(KEYS.tickets, t); return { ok: false, error: "That code expired. Request a new one." }; }
    if (ticket.tries >= 5) return { ok: false, error: "Too many attempts. Request a new code." };
    if (ticket.code !== String(code).trim()) {
      ticket.tries++;
      set(KEYS.tickets, t);
      return { ok: false, error: "That code is not correct. " + (5 - ticket.tries) + " attempts left." };
    }
    delete t[e];
    set(KEYS.tickets, t);
    return { ok: true, email: e };
  }

  function completeReset(email, password) {
    var e = normalize(email);
    if (String(password || "").length < 8) return { ok: false, error: "Password must be at least 8 characters." };
    var user = findUser(e);
    if (!user) return { ok: false, error: "Account not found." };
    var list = users();
    user.pass = digest(password);
    user.provider = "email";
    saveUsers(list);
    return { ok: true };
  }

  /* ---------------- per-user workspace data ---------------- */

  function seedIdeas(email) {
    var all = get(KEYS.ideas, {});
    if (all[email]) return all[email];
    var ideas = [
      { title: "Cold-brew vending kiosks", stage: "Validating", progress: 62, team: "Retail Ops", updated: "2h ago" },
      { title: "Freight CO₂ ledger", stage: "Building", progress: 41, team: "Climate", updated: "yesterday" },
      { title: "Grandparent tutoring app", stage: "Hatched", progress: 100, team: "Education", updated: "3d ago" },
      { title: "Modular farm housing", stage: "Screening", progress: 18, team: "Agri", updated: "5d ago" }
    ];
    all[email] = ideas;
    set(KEYS.ideas, all);
    return ideas;
  }

  function ideas() {
    var s = session();
    if (!s) return [];
    return seedIdeas(normalize(s.email));
  }

  function addIdea(idea) {
    var s = session();
    if (!s) return { ok: false, error: "Sign in first." };
    var all = get(KEYS.ideas, {});
    var list = all[normalize(s.email)] || [];
    list.unshift({
      title: String(idea.title).trim(),
      stage: idea.stage || "Screening",
      progress: 5,
      team: idea.team || "Unassigned",
      updated: "just now"
    });
    all[normalize(s.email)] = list;
    set(KEYS.ideas, all);
    return { ok: true };
  }

  seed();

  window.SH = {
    isEmail: isEmail,
    normalize: normalize,
    session: session,
    guard: guard,
    signUp: signUp,
    signIn: signIn,
    providerSignIn: providerSignIn,
    providerLabel: providerLabel,
    endSession: endSession,
    requestReset: requestReset,
    verifyReset: verifyReset,
    completeReset: completeReset,
    findUser: findUser,
    ideas: ideas,
    addIdea: addIdea,
    publicUser: publicUser
  };
})();
