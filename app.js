/* =============================================================================
   dnata "Today" — Geotab Add-In application logic (vanilla JS, no deps)
   Exposes window.DnataToday.mount(rootEl, geotabApi) / .unmount().
   Works both inside MyGeotab (live user + counts) and standalone (demo data).
   ========================================================================== */
window.DnataToday = (function () {
  'use strict';

  /* ── Asset base resolver ──────────────────────────────────────────────────
     Inside MyGeotab the add-in is injected into MyGeotab's own page, so a
     relative asset path (media/…, images/…) would resolve against MyGeotab's
     domain, not where the add-in is hosted. We derive the add-in's real base
     URL from where app.js / data.js / styles.css were actually loaded, and
     prefix every runtime asset with it. Standalone (served from its own
     folder) this resolves to that folder, so behaviour is unchanged. */
  var ASSET_BASE = (function () {
    function dirOf(u) { return u ? u.replace(/[^\/]*(\?.*)?$/, '') : ''; }
    var cs = document.currentScript;
    if (cs && cs.src && /\/app\.js(\?|$)/.test(cs.src)) return dirOf(cs.src);
    var i, s = document.getElementsByTagName('script');
    for (i = s.length - 1; i >= 0; i--) { if (s[i].src && /\/(app|data)\.js(\?|$)/.test(s[i].src)) return dirOf(s[i].src); }
    var l = document.getElementsByTagName('link');
    for (i = 0; i < l.length; i++) { if (l[i].href && /styles\.css(\?|$)/.test(l[i].href)) return dirOf(l[i].href); }
    return '';
  })();
  function assetUrl(p) {
    if (!p) return p;
    if (/^(https?:)?\/\//.test(p) || p.charAt(0) === '/' || p.indexOf('data:') === 0) return p;
    return ASSET_BASE + p;
  }
  // Rewrite every asset path a case references to an absolute URL once, up front.
  function absolutizeAssets(c) {
    (c.evidence || []).forEach(function (e) {
      if (e.src) e.src = assetUrl(e.src);
      if (e.poster) e.poster = assetUrl(e.poster);
      (e.frameEvidence || []).forEach(function (f) { if (f.src) f.src = assetUrl(f.src); });
    });
    (c.frameEvidence || []).forEach(function (f) { if (f.src) f.src = assetUrl(f.src); });
    if (c.subject && c.subject.avatar) c.subject.avatar = assetUrl(c.subject.avatar);
  }

  /* ── Icon registry (Lucide-style, 2px stroke) ─────────────────────────── */
  var P = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    'bar-chart': '<path d="M12 20V10M18 20V4M6 20v-4"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2 2 0 0 0-3 0zM12 15l-3-3a22 22 0 0 1 8-10 22 22 0 0 1 2 10 22 22 0 0 1-7 3z"/><path d="M9 12H4s.5-2.8 2-4a3.5 3.5 0 0 1 3 0M15 12v5s2.8-.5 4-2a3.5 3.5 0 0 0 0-3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    'more-v': '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    'thumbs-up': '<path d="M7 10v11H3V10zM7 10l4-8a2.5 2.5 0 0 1 2.5 2.5V8h5a2 2 0 0 1 2 2.3l-1.3 8a2 2 0 0 1-2 1.7H7"/>',
    'thumbs-down': '<path d="M17 14V3h4v11zM17 14l-4 8a2.5 2.5 0 0 1-2.5-2.5V16h-5a2 2 0 0 1-2-2.3l1.3-8a2 2 0 0 1 2-1.7H17"/>',
    'alert-triangle': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h0"/>',
    thermometer: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    badge: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z"/><path d="m9 12 2 2 4-4"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    'arrow-right': '<path d="M5 12h14M13 5l7 7-7 7"/>',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    'sliders': '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
    'map-pin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0 0 20.5 15"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>'
  };
  function ic(name, size, cls) {
    size = size || 16;
    return '<svg class="' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || '') + '</svg>';
  }

  /* ── module state ─────────────────────────────────────────────────────── */
  var D, root, api = null, state, layer, callTimer = null, evTimer = null, newCaseSeq = 0;

  var NAV = [
    { id: 'cases', label: 'Cases', icon: 'calendar' },
    { id: 'management', label: 'Management', icon: 'users' }
  ];

  /* ── helpers ──────────────────────────────────────────────────────────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function qs(sel) { return root.querySelector(sel); }
  function initialsOf(name) { var p = name.trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); }
  function meUser() { return state.users[0]; }
  function userByName(name) { for (var i = 0; i < state.users.length; i++) if (state.users[i].name === name) return state.users[i]; return null; }
  function findCase(id) { for (var i = 0; i < state.cases.length; i++) if (state.cases[i].id === id) return state.cases[i]; return null; }
  function isCritical(c) { return c.severity === 'High'; }
  function catMeta(cat) { return D.categories[cat] || { icon: 'layers', accent: '#667085' }; }
  function actionIcon(label) {
    if (/fnol/i.test(label)) return 'file-text';
    if (/contact|call/i.test(label)) return 'phone';
    if (/coach/i.test(label)) return 'message-square';
    if (/recognition|kudos|recognize/i.test(label)) return 'award';
    if (/notify|alert|send/i.test(label)) return 'send';
    return 'layers';
  }
  function accChipHtml() {
    return '<span class="dt-chip dt-chip-acc">' + ic('alert-triangle', 12) + 'Accident case</span>';
  }

  /* ── mount ────────────────────────────────────────────────────────────── */
  function mount(rootEl, geotabApi) {
    root = rootEl;
    api = geotabApi || null;
    D = window.DNATA_DATA;
    state = initState();
    root.innerHTML =
      '<header class="dt-header">' + navHtml() + '</header>' +
      '<div class="dt-main dt-scroll" id="dt-main"></div>' +
      '<div id="dt-layer"></div>' +
      '<div class="dt-toasts" id="dt-toasts"></div>';
    layer = qs('#dt-layer');
    bind();
    renderMain();
    loadLiveContext();
  }
  function unmount() {
    if (callTimer) { clearInterval(callTimer); callTimer = null; }
    if (evTimer) { clearInterval(evTimer); evTimer = null; }
    detachEvidenceMedia();
    if (root) root.innerHTML = '';
  }

  function initState() {
    var cases = D.cases.map(function (c) {
      var copy = JSON.parse(JSON.stringify(c));
      copy.pinned = !!c.pinned; copy.saved = false; copy.feedback = null;
      copy.deferred = false; copy.dismissed = false; copy.resolved = false;
      copy.notes = []; copy.extra = []; copy.fnol = null; copy.audit = []; copy.reportShares = [];
      absolutizeAssets(copy); // make every media/image path absolute for the current host
      return copy;
    });
    var users = JSON.parse(JSON.stringify(D.users));
    return {
      view: 'cases', category: 'All', search: '', digestIndex: 0,
      filters: { taskType: [], severity: [], status: [], assignee: [] },
      openId: null, deferredOpen: true, closedOpen: true, activityTab: 'All', modal: null, evidence: null,
      users: users, cases: cases,
      live: { connected: false, deviceCount: null, exCount: null }
    };
  }

  /* ── navigation header ────────────────────────────────────────────────── */
  function navHtml() {
    var nav = '<div class="dt-nav">' +
      // Brand is the official dnata wordmark (the logo IS the title).
      '<span class="dt-brand"><img class="dt-brand-logo" src="' + assetUrl('images/dnata-logo.svg') + '" alt="dnata"></span>' +
      '<span class="dt-divider-v"></span>';
    NAV.forEach(function (n) {
      nav += '<button class="dt-nav-btn' + (state.view === n.id ? ' is-active' : '') + '" data-act="nav:' + n.id + '">' +
        ic(n.icon, 15) + n.label + '</button>';
    });
    nav += '</div>';
    var right = '<button class="dt-ask" data-act="ask">' + ic('sparkle', 16) + 'Ask Clarity</button>';
    return nav + right;
  }

  /* ── main router ──────────────────────────────────────────────────────── */
  function renderMain() {
    qs('.dt-header').innerHTML = navHtml();
    var m = qs('#dt-main');
    if (state.view === 'cases') m.innerHTML = casesHtml();
    else m.innerHTML = placeholderHtml(state.view);
    renderPanel();
  }

  /* ── CASES view ───────────────────────────────────────────────────────── */
  function greetingWord() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  function firstName() { return meUser().name.replace(/\s*\(me\)\s*/, '').split(/\s+/)[0]; }

  function casesHtml() {
    var dg = D.digests[state.digestIndex];
    var greeting =
      '<div class="dt-greet-row"><div style="min-width:0">' +
        '<h1 class="dt-h1">' + esc(greetingWord()) + ', ' + esc(firstName()) + '!' + liveBadgeHtml() + '</h1>' +
        '<div class="dt-digest">' +
          '<span class="dt-digest-icon">' + ic('sparkle', 18) + '</span>' +
          '<span class="dt-digest-text"><strong>' + esc(dg.tag) + ':</strong> ' + esc(dg.text) + '</span>' +
          '<span class="dt-digest-pager">' +
            '<span class="dt-digest-viewed">' + D.digests.length + ' of ' + D.digests.length + ' viewed</span>' +
            '<button class="dt-iconbtn" data-act="digest-prev" title="Previous">' + ic('chevron-left', 14) + '</button>' +
            '<span class="dt-digest-count">' + (state.digestIndex + 1) + '/' + D.digests.length + '</span>' +
            '<button class="dt-iconbtn" data-act="digest-next" title="Next">' + ic('chevron-right', 14) + '</button>' +
          '</span>' +
        '</div>' +
      '</div>' + streakChipHtml() + '</div>';

    // category tabs
    var active = activeCases();
    var counts = { All: active.length };
    D.categoryOrder.forEach(function (c) { counts[c] = active.filter(function (x) { return x.category === c; }).length; });
    var tabs = '<div class="dt-tabs">' + tabBtn('All', counts.All);
    D.categoryOrder.forEach(function (c) { if (counts[c] > 0) tabs += tabBtn(c, counts[c]); });
    tabs += '<span class="dt-tab-sep"></span><button class="dt-tab dt-tab-add" data-act="addview">' + ic('plus', 14) + 'Add view</button></div>';

    // toolbar
    var fCount = filterCount();
    var toolbar = '<div class="dt-toolbar">' +
      '<div class="dt-search">' + ic('search', 18) + '<input type="text" id="dt-search" placeholder="Search cases, drivers, vehicles…" value="' + esc(state.search) + '"></div>' +
      '<button class="dt-btn dt-btn-secondary" data-act="filters">' + ic('filter', 16) + 'Filters' + (fCount ? ' <span class="dt-badge-count">' + fCount + '</span>' : '') + '</button>' +
      '<button class="dt-btn dt-btn-primary" data-act="newcase">' + ic('plus', 16) + 'New Case</button>' +
    '</div>';

    // progress
    var total = state.cases.length;
    var cleared = state.cases.filter(function (c) { return c.resolved || c.dismissed || invIsClosed(c); }).length;
    var progress = '<div class="dt-progress-row"><span class="dt-progress-label">Queue: ' + cleared + ' of ' + total + ' cleared</span>' +
      '<span class="dt-progress-track"><span class="dt-progress-fill" style="width:' + Math.round(cleared / total * 100) + '%"></span></span></div>';

    // queue
    var list = visibleCases();
    var queue;
    if (list.length) queue = '<div class="dt-queue">' + list.map(cardHtml).join('') + '</div>';
    else queue = emptyHtml();

    // deferred
    var deferred = state.cases.filter(function (c) { return c.deferred && !invIsClosed(c); });
    var defHtml = '';
    if (deferred.length) {
      defHtml = '<div class="dt-deferred"><div class="dt-deferred-head" data-act="deferred-toggle">' +
        ic(state.deferredOpen ? 'chevron-down' : 'chevron-right', 16) +
        '<span class="dt-micro">Deferred for later</span><span class="dt-tab-count">' + deferred.length + '</span></div>' +
        (state.deferredOpen ? '<div class="dt-deferred-body">' + deferred.map(defRowHtml).join('') + '</div>' : '') + '</div>';
    }

    // closed cases — out of the active queue but fully accessible, and they
    // respect the same search, category tab and facet filters as the queue
    var closed = state.cases.filter(invIsClosed).filter(matchesQueueFilters);
    var closedHtml = '';
    if (closed.length) {
      closedHtml = '<div class="dt-deferred" style="margin-top:16px"><div class="dt-deferred-head" data-act="closed-toggle">' +
        ic(state.closedOpen ? 'chevron-down' : 'chevron-right', 16) +
        '<span class="dt-micro">Closed cases</span><span class="dt-tab-count">' + closed.length + '</span></div>' +
        (state.closedOpen ? '<div class="dt-deferred-body">' + closed.map(closedRowHtml).join('') + '</div>' : '') + '</div>';
    }

    return '<div class="dt-container">' + greeting + tabs + toolbar + progress + queue + defHtml + closedHtml + '</div>';
  }

  function closedRowHtml(c) {
    var badge = c.outcome === 'false_positive'
      ? '<span class="dt-inv-badge fp">' + ic('x', 12) + 'False positive</span>'
      : '<span class="dt-status st-Dismissed"><span class="dt-dot"></span>Closed</span>';
    return '<div class="dt-defrow" data-act="card:' + c.id + '">' + chipHtml(c.category) +
      '<span class="dt-defrow-title">' + esc(c.title) + '</span>' + badge +
      '<button class="dt-btn dt-btn-ghost" style="height:32px;margin-left:auto" data-act="reopen:' + c.id + '">' + ic('refresh', 13) + 'Reopen</button></div>';
  }

  function tabBtn(cat, n) {
    return '<button class="dt-tab' + (state.category === cat ? ' is-active' : '') + '" data-act="tab:' + esc(cat) + '">' +
      '<span>' + esc(cat) + '</span><span class="dt-tab-count">' + n + '</span></button>';
  }
  function streakChipHtml() {
    var s = D.streak;
    if (!s) return '';
    return '<button class="dt-streak" data-act="streak">' +
      '<span class="dt-streak-icon">' + ic('rocket', 22) + '</span>' +
      '<span><span class="dt-streak-title" style="display:block">' + s.days + ' day streak</span>' +
      '<span class="dt-streak-sub">' + esc(s.subtitle) + '</span></span></button>';
  }
  function liveBadgeHtml() {
    // Only shown when connected to the Geotab API — nothing is rendered otherwise.
    var l = state.live;
    if (!l.connected) return '';
    var txt = 'Live · ' + (l.deviceCount != null ? l.deviceCount + ' devices' : 'connected');
    return '<span class="dt-live is-connected"><span class="dt-dot"></span>' + esc(txt) + '</span>';
  }

  function subjectHtml(s) {
    var av = s.avatar ? '<img class="dt-avatar" src="' + esc(s.avatar) + '" alt="' + esc(s.name) + '">' : '<span class="dt-initials">' + esc(s.initials) + '</span>';
    return '<span class="dt-subject">' + av + '<span class="dt-subject-name">' + esc(s.name) + '</span></span>';
  }
  function sevHtml(sev) { return '<span class="dt-sev sev-' + sev + '"><span class="dt-dot"></span>' + sev + '</span>'; }
  function statusHtml(st) { return '<span class="dt-status st-' + st.replace(/\s/g, '') + '"><span class="dt-dot"></span>' + esc(st) + '</span>'; }
  function chipHtml(cat) { var m = catMeta(cat); return '<span class="dt-chip"><span style="color:' + m.accent + ';display:flex">' + ic(m.icon, 13) + '</span>' + esc(cat) + '</span>'; }
  function assigneeHtml(userName) {
    var u = userByName(userName) || meUser();
    return '<span class="dt-assignee"><span class="dt-initials">' + esc(u.initials) + '</span>' + esc(u.name) + '</span>';
  }

  function cardHtml(c) {
    var mename = state.users[0]; // assignee 'me' resolves to live user
    var assignedName = c.assignee === 'me' ? mename.name : (userByName(c.assignee) ? userByName(c.assignee).name : c.assignee);
    var assignedU = c.assignee === 'me' ? mename : (userByName(assignedName) || mename);
    var top = '<div class="dt-card-top">' +
      '<button class="dt-pin' + (c.pinned ? ' is-pinned' : '') + '" data-act="pin:' + c.id + '" title="Pin">' + ic('star', 16) + '</button>' +
      '<span class="dt-card-title">' + esc(c.title) + '</span>' +
      chipHtml(c.category) +
      (c.accident ? accChipHtml() : '') +
      '<span class="dt-time">' + ic('clock', 13) + esc(c.time) + '</span>' +
      sevHtml(c.severity) +
      '<span class="dt-card-meta">' +
        '<span class="dt-assignee"><span class="dt-initials">' + esc(assignedU.initials) + '</span>' + esc(assignedName) + '</span>' +
        '<span class="dt-due' + (c.due === 'Due today' ? ' is-today' : '') + '">' + ic('calendar', 13) + esc(c.due) + '</span>' +
        statusHtml(c.status) +
        (isCritical(c) ? '' : '<button class="dt-more" data-act="more:' + c.id + '" title="More actions">' + ic('more-v', 16) + '</button>') +
      '</span>' +
    '</div>';
    // accident cards: the primary action follows the workflow state
    var pAction = c.primaryAction;
    if (c.accident) pAction = !c.accident.welfareCall ? c.primaryAction : (!c.fnol ? 'Start FNOL' : 'View FNOL status');
    var bot = '<div class="dt-card-bot">' +
      '<button class="dt-primary-action" data-act="primary:' + c.id + '">' + ic(actionIcon(pAction), 15) + esc(pAction) + '</button>' +
      subjectHtml(c.subject) +
      '<span class="dt-metric"><strong>' + esc(c.metricStrong) + '</strong> ' + esc(c.metricRest) + '</span>' +
      '<span class="dt-chevron">' + ic('chevron-right', 18) + '</span>' +
    '</div>';
    return '<article class="dt-card" data-act="card:' + c.id + '">' + top + bot + '</article>';
  }

  function defRowHtml(c) {
    return '<div class="dt-defrow" data-act="card:' + c.id + '">' + chipHtml(c.category) +
      '<span class="dt-defrow-title">' + esc(c.title) + '</span>' + sevHtml(c.severity) +
      '<button class="dt-btn dt-btn-ghost" style="height:32px;margin-left:auto" data-act="moveback:' + c.id + '">Move back</button></div>';
  }
  function emptyHtml() {
    return '<div class="dt-empty">' + ic('check-circle', 40) +
      '<div class="dt-empty-title">Queue clear</div><div>No cases match this view. Nice work keeping the streak alive.</div></div>';
  }

  /* ── filtering / sorting ──────────────────────────────────────────────── */
  var SEV_RANK = { High: 0, Medium: 1, Low: 2 };
  // Closed investigations (any case type) leave the active Today queue but stay
  // fully accessible — evidence, notes, activity, audit, outcome all preserved.
  function activeCases() { return state.cases.filter(function (c) { return !c.resolved && !c.dismissed && !c.deferred && !invIsClosed(c); }); }
  function matchesQueueFilters(c) {
    var f = state.filters, q = state.search.trim().toLowerCase();
    if (state.category !== 'All' && c.category !== state.category) return false;
    if (f.taskType.length && f.taskType.indexOf(c.category) < 0) return false;
    if (f.severity.length && f.severity.indexOf(c.severity) < 0) return false;
    if (f.status.length && f.status.indexOf(c.status) < 0) return false;
    if (f.assignee.length) { var nm = c.assignee === 'me' ? meUser().name : c.assignee; if (f.assignee.indexOf(nm) < 0) return false; }
    if (q) { var hay = (c.title + ' ' + c.subject.name + ' ' + c.metricStrong + ' ' + c.metricRest + ' ' + c.category).toLowerCase(); if (hay.indexOf(q) < 0) return false; }
    return true;
  }
  function filterCount() { var f = state.filters; return f.taskType.length + f.severity.length + f.status.length + f.assignee.length; }
  function visibleCases() {
    return activeCases().filter(matchesQueueFilters).sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (SEV_RANK[a.severity] !== SEV_RANK[b.severity]) return SEV_RANK[a.severity] - SEV_RANK[b.severity];
      return a.sort - b.sort;
    });
  }

  /* ── detail panel ─────────────────────────────────────────────────────── */
  function openIndexInfo() {
    var list = visibleCases();
    var idx = -1; for (var i = 0; i < list.length; i++) if (list[i].id === state.openId) idx = i;
    return { list: list, idx: idx };
  }
  function renderPanel() {
    // remove existing, preserving scroll position when re-rendering the same case
    var existing = qs('#dt-panelwrap');
    var prevScroll = 0, sameCase = false;
    if (existing) {
      var pb = existing.querySelector('.dt-panel-body');
      prevScroll = pb ? pb.scrollTop : 0;
      sameCase = renderPanel._id === state.openId;
      existing.remove();
    }
    if (!state.openId) { renderPanel._id = null; return; }
    var c = findCase(state.openId); if (!c) { state.openId = null; renderPanel._id = null; return; }
    var info = openIndexInfo();
    var wrap = document.createElement('div'); wrap.id = 'dt-panelwrap';
    wrap.innerHTML = '<div class="dt-scrim" data-act="panel-close"></div><aside class="dt-panel dt-scroll">' + panelHtml(c, info) + '</aside>';
    root.appendChild(wrap);
    renderPanel._id = state.openId;
    if (sameCase && prevScroll) {
      var nb = wrap.querySelector('.dt-panel-body');
      if (nb) nb.scrollTop = prevScroll;
    }
  }
  function panelHtml(c, info) {
    var assignedName = c.assignee === 'me' ? meUser().name : c.assignee;
    var assignedU = userByName(assignedName) || meUser();
    var head =
      '<div class="dt-panel-head">' +
        '<div class="dt-panel-titlerow"><span class="dt-panel-title">' + esc(c.title) + '</span>' +
          '<span class="dt-panel-tools">' +
            '<button class="dt-more" data-act="panel-more">' + ic('more-v', 18) + '</button>' +
            '<span class="dt-pager"><button class="dt-iconbtn" data-act="panel-prev" ' + (info.idx <= 0 ? 'disabled' : '') + '>' + ic('chevron-left', 14) + '</button>' +
            '<span class="dt-pager-count">' + (info.idx >= 0 ? (info.idx + 1) + '/' + info.list.length : '–') + '</span>' +
            '<button class="dt-iconbtn" data-act="panel-next" ' + (info.idx < 0 || info.idx >= info.list.length - 1 ? 'disabled' : '') + '>' + ic('chevron-right', 14) + '</button></span>' +
            '<button class="dt-iconbtn" data-act="panel-close">' + ic('x', 16) + '</button>' +
          '</span>' +
        '</div>' +
        '<div class="dt-panel-meta"><span class="dt-panel-code">CASE #' + esc(c.code) + '</span><span class="dt-panel-dot">·</span>' +
          chipHtml(c.category) + '<span class="dt-time">' + ic('clock', 13) + esc(c.time) + '</span>' +
          '<button class="dt-iconbtn' + (c.feedback === 'up' ? ' is-active' : '') + '" data-act="helpful:' + c.id + '" title="Helpful" style="' + (c.feedback === 'up' ? 'color:var(--success-600);border-color:var(--success-200);background:var(--success-50)' : '') + '">' + ic('thumbs-up', 14) + '</button>' +
          '<button class="dt-iconbtn' + (c.feedback === 'down' ? ' is-active' : '') + '" data-act="nothelpful:' + c.id + '" title="Not helpful">' + ic('thumbs-down', 14) + '</button>' +
        '</div>' +
      '</div>';

    var grid =
      '<div class="dt-statusgrid">' +
        '<div class="dt-sg-cell"><span class="dt-micro">Status · ' + esc(c.status) + '</span><div class="dt-sg-editrow">' +
          (c.status === 'Resolved'
            ? '<span class="dt-status st-Resolved"><span class="dt-dot"></span>Resolved</span>'
            : '<button class="dt-editbtn is-resolve" data-act="resolve:' + c.id + '">' + ic('check', 14) + 'Mark resolved</button>') +
          '<button class="dt-editbtn" data-act="status-edit:' + c.id + '">' + ic('chevron-down', 14) + '</button></div></div>' +
        '<div class="dt-sg-cell"><span class="dt-micro">Severity</span>' +
          '<button class="dt-editbtn" data-act="sev-edit:' + c.id + '">' + sevHtml(c.severity) + ic('chevron-down', 14) + '</button></div>' +
        '<div class="dt-sg-cell"><span class="dt-micro">SLA</span>' +
          '<button class="dt-editbtn is-sla" data-act="noop">' + ic('clock', 13) + esc(c.sla) + '</button></div>' +
        '<div class="dt-sg-cell"><span class="dt-micro">Assigned to</span>' +
          '<button class="dt-editbtn" data-act="assignee-edit:' + c.id + '"><span class="dt-initials">' + esc(assignedU.initials) + '</span>' + esc(assignedName) + ic('chevron-down', 14) + '</button></div>' +
      '</div>';
      // FNOL entry point lives in the Insurance section card (fnolSection) —
      // no duplicate button in the status grid.

    var body = '<div class="dt-panel-body">' +
      (c.accident ? pipelineSection(c) : '') +
      whatSection(c) +
      (c.accident ? welfareSection(c) : '') +
      evidenceSection(c) +
      // Map & location section removed pending real location imagery —
      // re-enable by adding mapSection(c) back here when pictures arrive.
      (c.accident ? photosSection(c) + telematicsSection(c) : '') +
      whyFlaggedSection(c) +
      peerComparisonSection(c) +
      contextSection(c) +
      (c.accident ? incidentDetailsSection(c) : '') +
      promptsSection(c) + recoSection(c) +
      investigationActionsSection(c) +
      fnolSection(c) +
      notesSection(c) +
    '</div>';

    return head + grid + body;
  }

  function whatSection(c) {
    var w = c.whatHappened;
    return '<div class="dt-section"><span class="dt-micro">What happened</span>' +
      '<p class="dt-what"><button class="dt-entity" data-act="entity:' + c.id + '">' + ic('user', 13) + esc(w.entity) + '</button>' + esc(w.text) + '</p></div>';
  }
  function evidenceSection(c) {
    if (!c.evidence || !c.evidence.length) return '';
    // Clicking a clip opens the full-screen Evidence Drawer — never an inline player.
    var clips = c.evidence.map(function (e, i) {
      var isImg = evIsImage(e);
      // Real video without an authored poster keeps the neutral dark tile —
      // the simulated-dashcam still would misrepresent it as camera footage.
      var thumb = e.poster || (isImg ? e.src : (evHasRealVideo(e) ? null : assetUrl('images/dashcam-frame.png')));
      var durLabel = isImg ? '' : evDurationLabel(e);
      return '<button class="dt-clip" data-act="clip:' + c.id + ':' + i + '">' +
        '<span class="dt-clip-thumb"' + (thumb ? ' style="background-image:url(' + esc(thumb) + ')"' : '') + '><span class="dt-clip-play">' + ic(isImg ? 'image' : 'play', 14) + '</span>' +
        (durLabel ? '<span class="dt-clip-dur">' + esc(durLabel) + '</span>' : '') + '</span>' +
        '<span class="dt-clip-place" style="display:block">' + esc(e.place || e.label || '') + '</span><span class="dt-clip-time">' + esc(e.time) + '</span></button>';
    }).join('');
    return '<div class="dt-section"><div class="dt-evhead"><span class="dt-micro">Evidence · ' + c.evidence.length + ' clip' + (c.evidence.length > 1 ? 's' : '') + '</span>' +
      '<button class="dt-btn dt-btn-secondary" style="height:32px" data-act="playclips:' + c.id + '">' + ic('play', 14) + 'Play clips</button></div>' +
      '<div class="dt-clips">' + clips + '</div></div>';
  }
  function contextSection(c) {
    if (!c.context || !c.context.length) return '';
    return '<div class="dt-section"><span class="dt-micro">Operational context</span><ul class="dt-context">' +
      c.context.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
  }
  function promptsSection(c) {
    if (!c.prompts || !c.prompts.length) return '';
    return '<div class="dt-section"><div class="dt-evhead"><span class="dt-micro">Investigate further by asking</span>' +
      '<button class="dt-btn dt-btn-secondary" style="height:32px" data-act="ask">' + ic('sparkle', 14) + 'Ask</button></div>' +
      '<div class="dt-prompts">' + c.prompts.map(function (p) { return '<button class="dt-prompt" data-act="prompt">' + esc(p) + '</button>'; }).join('') + '</div></div>';
  }
  function recoSection(c) {
    var r = c.recommended;
    var primaryAct = 'reco-primary:' + c.id;
    // Accident cases: the recommendation follows the response workflow —
    // welfare call first, then FNOL, then track the insurer response.
    if (c.accident) {
      var a = c.accident;
      var insName = (a.insurer && a.insurer.name) || (D.insurer && D.insurer.name) || 'the insurer';
      if (!a.welfareCall) {
        r = { text: c.recommended.text, primary: 'Contact driver via camera', others: [{ title: 'Flag for review' }] };
        primaryAct = 'call-open:' + c.id;
      } else if (!c.fnol) {
        r = {
          text: a.welfareCall.safeOutcome
            ? 'Driver is safe and the initial statement is attached. Evidence is complete — build and submit the First Notice of Loss to ' + insName + '.'
            : 'Welfare call attached — ' + a.welfareCall.summaryLine + '. Coordinate the response first, then build the First Notice of Loss for ' + insName + '.',
          primary: 'Start First Notice of Loss', others: [{ title: 'Flag for review' }]
        };
        primaryAct = 'fnol-open:' + c.id;
      } else {
        r = { text: 'FNOL was submitted to ' + insName + '. Track the insurer response below — the case closes when the claim is acknowledged.', primary: 'View FNOL submission', others: [{ title: 'Flag for review' }] };
        primaryAct = 'fnol-view:' + c.id;
      }
    }
    c._recoOthers = r.others; // what the 'other:' dispatch should act on
    var others = r.others.map(function (o, i) {
      return '<button class="dt-otherbtn' + (o.sub ? '' : ' inline') + '" data-act="other:' + c.id + ':' + i + '">' +
        ic(o.title && /video|lesson/i.test(o.title) ? 'video' : (o.title && /flag/i.test(o.title) ? 'flag' : 'layers'), 16) +
        '<span><span class="dt-otherbtn-title" style="display:block">' + esc(o.title) + '</span>' + (o.sub ? '<span class="dt-otherbtn-sub">' + esc(o.sub) + '</span>' : '') + '</span></button>';
    });
    // group sub-less ones inline
    var hasSub = r.others.some(function (o) { return o.sub; });
    var othersHtml = hasSub ? '<div class="dt-reco-otherbtns">' + others.join('') + '</div>' : '<div class="dt-otherbtn-wrap">' + others.join('') + '</div>';
    var tertiary = isCritical(c) ? '' :
      '<div class="dt-reco-tertiary"><button class="dt-linkbtn" data-act="defer:' + c.id + '">Defer for later</button>' +
      '<button class="dt-linkbtn danger" data-act="dismiss:' + c.id + '">Dismiss</button></div>';
    return '<div class="dt-section"><div class="dt-reco">' +
      '<div class="dt-reco-head"><span style="color:var(--primary-600);display:flex">' + ic('sparkle', 16) + '</span><span class="dt-micro">Recommended action</span></div>' +
      '<p class="dt-reco-text">' + esc(r.text) + '</p>' +
      '<button class="dt-reco-primary" data-act="' + primaryAct + '">' + esc(r.primary) + '</button>' +
      '<div class="dt-reco-others"><span class="dt-micro">Other actions</span>' + othersHtml + '</div>' +
      tertiary + '</div></div>';
  }
  function auditRows(c) {
    return (c.audit || []).map(function (r) {
      var when = new Date(r.at);
      var ts = isNaN(when.getTime()) ? String(r.at) : when.toLocaleString();
      var kv = [];
      if (r.previousValue != null || r.newValue != null) {
        kv.push('<span class="k">change</span><span>' + esc(String(r.previousValue == null ? '—' : r.previousValue)) + ' → ' + esc(String(r.newValue == null ? '—' : r.newValue)) + '</span>');
      }
      if (r.reason) kv.push('<span class="k">reason</span><span>' + esc(r.reason) + '</span>');
      if (r.notes) kv.push('<span class="k">notes</span><span>' + esc(r.notes) + '</span>');
      Object.keys(r.metadata || {}).forEach(function (k) {
        var v = r.metadata[k];
        kv.push('<span class="k">' + esc(k) + '</span><span>' + esc(Array.isArray(v) ? v.join(', ') : String(v)) + '</span>');
      });
      return '<div class="dt-audit"><div class="dt-audit-head"><strong>' + esc(r.action) + '</strong><span>' + esc(r.author) + ' · ' + esc(ts) + '</span></div>' +
        '<div class="dt-audit-grid">' + kv.join('') + '</div></div>';
    }).join('');
  }
  function notesSection(c) {
    var body;
    if (state.activityTab === 'Audit') {
      body = auditRows(c) || '<div class="dt-tl-meta">No audit records yet — investigation actions are logged here.</div>';
    } else {
      var all = c.notes.concat(c.extra).concat(c.activity);
      var items = all.filter(function (a) {
        if (state.activityTab === 'Notes') return a.kind === 'note';
        if (state.activityTab === 'Activity') return a.kind !== 'note';
        return true;
      });
      body = items.map(function (a) {
        var dot = a.kind === 'ai' ? 'ai' : a.kind === 'note' ? 'note' : '';
        var icon = a.kind === 'ai' ? 'sparkle' : a.kind === 'note' ? 'edit' : 'eye';
        return '<div class="dt-tl"><span class="dt-tl-dot ' + dot + '">' + ic(icon, 13) + '</span>' +
          '<div><div class="dt-tl-text">' + esc(a.text) + '</div><div class="dt-tl-meta">' + esc(a.meta) + '</div></div></div>';
      }).join('') || '<div class="dt-tl-meta">No entries yet.</div>';
    }
    return '<div class="dt-section"><div class="dt-notes-head"><span class="dt-micro">Log notes &amp; activity</span></div>' +
      '<div class="dt-notes-sub">Everything that happened on this case</div>' +
      '<div class="dt-note-compose"><textarea id="dt-note-' + c.id + '" placeholder="Add a note about this case…"></textarea>' +
      '<button class="dt-btn dt-btn-primary" style="height:auto" data-act="add-note:' + c.id + '">Add note</button></div>' +
      '<div class="dt-seg">' + ['All', 'Activity', 'Notes', 'Audit'].map(function (t) { return '<button class="' + (state.activityTab === t ? 'is-active' : '') + '" data-act="activity-tab:' + t + '">' + t + '</button>'; }).join('') + '</div>' +
      '<div class="dt-timeline">' + body + '</div></div>';
  }

  /* ── Accident case: pipeline · welfare call · telematics · FNOL ───────── */
  function pipelineSection(c) {
    var cur = D.accidentStatuses.indexOf(c.accident.status);
    var steps = D.accidentStatuses.map(function (s, i) {
      var cls = i < cur ? 'done' : i === cur ? 'current' : '';
      return '<button class="dt-pipe-step ' + cls + '" data-act="acc-status:' + c.id + ':' + i + '" title="Set accident status">' +
        (i < cur ? ic('check', 12) : '') + esc(s) + '</button>';
    }).join('<span class="dt-pipe-sep">' + ic('chevron-right', 12) + '</span>');
    return '<div class="dt-section"><span class="dt-micro">Accident case status</span><div class="dt-pipe">' + steps + '</div></div>';
  }

  function welfareSection(c) {
    var a = c.accident;
    if (!a.welfareCall) {
      return '<div class="dt-section"><span class="dt-micro">Driver welfare &amp; response</span>' +
        '<div class="dt-welfare">' +
          '<div class="dt-welfare-title">' + ic('phone', 15) + esc(a.driver.name) + ' hasn\'t been contacted yet</div>' +
          '<p>Confirm the driver is safe, whether anyone is injured and whether emergency services are needed. The call is recorded with a notice; the recording, transcript and summary attach to this case automatically.</p>' +
          '<div class="dt-welfare-btns">' +
            '<button class="dt-btn dt-btn-sm dt-btn-primary" data-act="call-open:' + c.id + '">' + ic('video', 15) + 'Contact via camera</button>' +
            '<button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="call-open:' + c.id + '">' + ic('phone', 15) + 'Call phone</button>' +
          '</div>' +
          '<div class="dt-welfare-note">If the driver can\'t be reached, the system escalates automatically: phone → driver app → voice agent → supervisor.</div>' +
        '</div></div>';
    }
    var call = a.welfareCall;
    var chips = call.answers.map(function (an) {
      return '<span class="dt-anschip">' + esc(an.q) + ': <strong>' + esc(an.a) + '</strong></span>';
    }).join('');
    var script = a.callScript || [];
    var tr = '';
    if (a.trOpen && script.length) {
      tr = '<div class="dt-transcript">' + script.map(function (l) {
        return '<div class="dt-tr-line"><strong>' + esc(l.who) + ':</strong> ' + esc(l.line) + '</div>';
      }).join('') + '</div>';
    }
    return '<div class="dt-section"><span class="dt-micro">Driver welfare &amp; response</span>' +
      '<div class="dt-callrec">' +
        '<div class="dt-callrec-head">' + ic('check-circle', 16) + 'Welfare call completed · ' + esc(call.method) + ' · ' + esc(call.duration) + '</div>' +
        '<div class="dt-callrec-body">' +
          '<div class="dt-recnotice" style="margin:0">' + ic('lock', 13) + 'Recorded with notice · access is logged to the case</div>' +
          '<div class="dt-anschips">' + chips + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
            '<button class="dt-securelink" data-act="securelink">' + ic('lock', 12) + 'Call recording · ' + esc(call.duration) + '</button>' +
            (script.length ? '<button class="dt-linkbtn" data-act="call-transcript:' + c.id + '">' + (a.trOpen ? 'Hide transcript' : 'View transcript · ' + script.length + ' lines') + '</button>' : '') +
            '<button class="dt-linkbtn" data-act="call-open:' + c.id + '">Call again</button>' +
          '</div>' + tr +
        '</div>' +
      '</div></div>';
  }

  // Documents & photos preserved on the case (arrive with the welfare call)
  function photosSection(c) {
    var a = c.accident;
    if (!a.photos || !a.photos.length) return '';
    var rows = a.photos.map(function (p) {
      return '<div class="dt-docrow">' + ic('image', 16) +
        '<span style="flex:1;min-width:0"><span class="dt-docrow-name">' + esc(p.name) + '</span>' +
        '<span class="dt-docrow-meta">' + esc(p.meta) + '</span></span>' +
        '<button class="dt-securelink" data-act="securelink">' + ic('lock', 12) + 'View</button></div>';
    }).join('');
    return '<div class="dt-section"><span class="dt-micro">Documents &amp; photos</span>' + rows + '</div>';
  }

  // Stylized location map with the impact pin (demo tile — no external map
  // host). The impact time comes from the case's own accident record; when
  // the record carries no time the pin is labelled plainly.
  function accImpactTimeLabel(a) {
    if (!a || !a.when) return '';
    var bits = String(a.when).split('·');
    return bits[bits.length - 1].trim();
  }
  function mapSvg(a) {
    var impactTime = accImpactTimeLabel(a);
    // Pin wording is a per-case fact (a.pinLabel) — cases with confirmed
    // contact keep the default "Impact"; reported-only cases state less.
    var pinLabel = a.pinLabel || 'Impact';
    return '<svg viewBox="0 0 640 150" width="100%" role="img" aria-label="Map — ' + esc(a.location) + '">' +
      '<rect width="640" height="150" fill="#F2F4F7"></rect>' +
      '<rect x="24" y="16" width="150" height="46" rx="6" fill="#E7EBF0"></rect>' +
      '<rect x="24" y="88" width="104" height="46" rx="6" fill="#E7EBF0"></rect>' +
      '<rect x="472" y="20" width="146" height="112" rx="6" fill="#E7EBF0"></rect>' +
      '<path d="M0 75 H640" stroke="#FFFFFF" stroke-width="18"></path>' +
      '<path d="M200 0 V150" stroke="#FFFFFF" stroke-width="14"></path>' +
      '<path d="M420 0 V150" stroke="#FFFFFF" stroke-width="10"></path>' +
      '<path d="M0 75 H640" stroke="#D0D5DD" stroke-width="1" stroke-dasharray="6 6"></path>' +
      '<path d="M40 118 H196 V82 H414" stroke="#136AB6" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>' +
      '<circle cx="418" cy="82" r="13" fill="#F04438" opacity="0.15"></circle>' +
      '<circle cx="418" cy="82" r="5" fill="#F04438" stroke="#fff" stroke-width="2"></circle>' +
      '<text x="434" y="78" font-size="11" font-weight="600" fill="#B42318">' + esc(pinLabel) + (impactTime ? ' · ' + esc(impactTime) : '') + '</text>' +
      '<text x="434" y="93" font-size="10.5" fill="#667085">' + esc(a.location) + '</text>' +
      '</svg>';
  }
  function mapSection(c) {
    var a = c.accident;
    // Zone/geofence wording is a per-case fact (a.mapCaption); omitted when
    // the case record does not state one.
    return '<div class="dt-section"><span class="dt-micro">Map &amp; location</span>' +
      '<div class="dt-map">' + mapSvg(a) + '</div>' +
      '<div class="dt-graph-caption">' + ic('map-pin', 13) + esc(a.location) + ' · route travelled in blue' +
      (a.mapCaption ? ' · ' + esc(a.mapCaption) : '') + '</div>' +
    '</div>';
  }

  // Compact evidence chart: single series, one axis, impact marker in status red
  // with a text label, event markers as gray dots, native <title> tooltips.
  // secPerSample is the case's own sampling interval; without it the time axis
  // and per-sample second offsets are omitted rather than assumed.
  function fmtRelSec(sec) {
    var v = Math.round(sec * 10) / 10;
    return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' s';
  }
  function graphSvg(vals, impactIdx, color, unit, markers, secPerSample) {
    var W = 320, H = 88, L = 8, R = 8, T = 16, B = 16;
    var max = Math.max.apply(null, vals); if (max <= 0) max = 1; max *= 1.15;
    var iw = W - L - R, ih = H - T - B, n = vals.length - 1;
    function X(i) { return +(L + i * iw / n).toFixed(1); }
    function Y(v) { return +(T + ih - v / max * ih).toFixed(1); }
    var pts = vals.map(function (v, i) { return X(i) + ',' + Y(v); }).join(' ');
    var area = 'M' + X(0) + ',' + (T + ih) + ' L' + pts.split(' ').join(' L') + ' L' + X(n) + ',' + (T + ih) + ' Z';
    var ix = X(impactIdx), iy = Y(vals[impactIdx]);
    var dots = vals.map(function (v, i) {
      var label = (secPerSample != null ? fmtRelSec((i - impactIdx) * secPerSample) + ' · ' : '') + v + ' ' + unit;
      return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="7" fill="transparent"><title>' + esc(label) + '</title></circle>';
    }).join('');
    // event markers before/after impact, drawn on the chart itself; markers
    // outside the sample range are skipped, never plotted at undefined points
    var marks = (markers || []).filter(function (mk) {
      return mk && mk.i != null && mk.i >= 0 && mk.i < vals.length;
    }).map(function (mk) {
      return '<circle cx="' + X(mk.i) + '" cy="' + Y(vals[mk.i]) + '" r="3" fill="#667085" stroke="#fff" stroke-width="1.5"><title>' + esc(mk.label) + '</title></circle>';
    }).join('');
    var axis = secPerSample != null
      ? '<text x="' + L + '" y="' + (H - 3) + '" font-size="10.5" fill="#98A2B3">' + esc(fmtRelSec(-impactIdx * secPerSample)) + '</text>' +
        '<text x="' + (W - R) + '" y="' + (H - 3) + '" font-size="10.5" fill="#98A2B3" text-anchor="end">' + esc(fmtRelSec((vals.length - 1 - impactIdx) * secPerSample)) + '</text>'
      : '';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + esc(unit) + ' around impact">' +
      '<line x1="' + L + '" y1="' + (T + ih) + '" x2="' + (W - R) + '" y2="' + (T + ih) + '" stroke="#EAECF0" stroke-width="1"></line>' +
      '<path d="' + area + '" fill="' + color + '" opacity="0.08"></path>' +
      '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>' +
      '<line x1="' + ix + '" y1="' + (T - 4) + '" x2="' + ix + '" y2="' + (T + ih) + '" stroke="#F04438" stroke-width="1.5" stroke-dasharray="3 3"></line>' +
      marks +
      '<circle cx="' + ix + '" cy="' + iy + '" r="3.5" fill="#F04438" stroke="#fff" stroke-width="1.5"></circle>' +
      '<text x="' + ix + '" y="11" font-size="11" font-weight="600" fill="#B42318" text-anchor="middle">impact</text>' +
      axis +
      dots +
      '</svg>';
  }

  function telematicsSection(c) {
    // Window label, chart markers, acceleration-axis naming and the caption
    // are per-case facts carried on accident.telematics — nothing about
    // another case's event is assumed.
    var a = c.accident, t = a.telematics;
    if (!t || !t.speed || !t.accel) return '';
    var marks = t.markers || [];
    var accelLabel = t.accelLabel || 'Lateral acceleration';
    var accelUnit = t.accelUnit || 'g';
    return '<div class="dt-section"><span class="dt-micro">Telematics — ' + esc(t.windowLabel || 'around the impact') + '</span>' +
      '<div class="dt-graphs">' +
        '<div class="dt-graph"><div class="dt-graph-title"><span>Speed</span><span>mph</span></div>' + graphSvg(t.speed, t.impactIndex, '#136AB6', 'mph', marks, t.secondsPerSample != null ? t.secondsPerSample : null) + '</div>' +
        '<div class="dt-graph"><div class="dt-graph-title"><span>' + esc(accelLabel) + '</span><span>' + esc(accelUnit) + '</span></div>' + graphSvg(t.accel, t.impactIndex, '#0C4677', accelUnit, marks, t.secondsPerSample != null ? t.secondsPerSample : null) + '</div>' +
      '</div>' +
      (t.caption ? '<div class="dt-graph-caption">' + ic('activity', 13) + esc(t.caption) + '</div>' : '') +
    '</div>';
  }

  function incidentDetailsSection(c) {
    var d = c.accident.details;
    var defs = [
      ['injuries', 'Injuries'], ['thirdParty', 'Third party'], ['police', 'Police'],
      ['towing', 'Towing'], ['vehicleCondition', 'Vehicle condition']
    ];
    var rows = defs.map(function (f) {
      return '<div class="dt-field' + (f[0] === 'thirdParty' || f[0] === 'vehicleCondition' ? ' wide' : '') + '">' +
        '<label>' + esc(f[1]) + '</label>' +
        '<input data-field="acc:' + f[0] + '" data-case="' + c.id + '" value="' + esc(d[f[0]]) + '">' +
      '</div>';
    }).join('');
    return '<div class="dt-section"><span class="dt-micro">Incident details</span>' +
      '<div class="dt-form-grid">' + rows + '</div>' +
      '<div class="dt-graph-caption">' + ic('file-text', 13) + 'These feed the FNOL form automatically — confirm or complete anything missing.</div>' +
    '</div>';
  }

  /* ── "Why this event was flagged" — collision signal breakdown ─────────
     Reusable: renders from c.collisionAnalysis for Collisions cases only.
     Missing fields are skipped; every displayed value carries a provenance
     label (Recorded / Derived / Manager confirmed / Illustrative). It makes
     no judgement about whether the accident is confirmed. */
  var WHY_SOURCES = {
    recorded: 'Recorded', derived: 'Derived', confirmed: 'Manager confirmed', illustrative: 'Illustrative',
    reported: 'Reported', demoTelemetry: 'Verified demo telemetry', notVerified: 'Not verified',
    undetermined: 'Undetermined', unavailable: 'Unavailable', workflow: 'Workflow'
  };
  function whySrcPill(src) {
    if (WHY_SOURCES[src]) return '<span class="dt-why-src src-' + src + '">' + WHY_SOURCES[src] + '</span>';
    // An unregistered key shows as itself — never silently relabelled "Recorded".
    return '<span class="dt-why-src src-unknown">' + esc(String(src)) + '</span>';
  }
  function whyRow(kind, text, src) {
    return '<div class="dt-why-row">' + ic(kind === 'counter' ? 'alert-triangle' : 'check-circle', 14) +
      '<span class="dt-why-text">' + text + '</span>' + whySrcPill(src) + '</div>';
  }

  /* ── Step 2: deterministic investigation-priority evaluation ───────────
     Pure function of the collision-analysis fields — no AI model, no API.
     A rule is evaluated only when its inputs exist: missing fields add or
     subtract nothing, are never treated as zero or false, and never appear
     in the calculation details. The score prioritizes review; it does not
     confirm that an accident occurred. */
  function evaluateCollisionCandidate(ca, sources) {
    var srcs = sources || {};
    var res = { score: 0, level: 'Likely false positive', supportingSignals: [], counterSignals: [], reasons: [] };
    if (!ca) return res;
    var raw = 0;
    function has(k) { return ca[k] !== undefined && ca[k] !== null; }
    function apply(kind, text, points, srcKey) {
      raw += points;
      (kind === 'support' ? res.supportingSignals : res.counterSignals)
        .push({ text: text, points: points, source: srcs[srcKey] || 'recorded' });
      res.reasons.push(text + ': ' + (points > 0 ? '+' : '') + points);
    }
    var reduction = (has('speedBeforeKph') && has('speedAfterKph')) ? ca.speedBeforeKph - ca.speedAfterKph : null;

    // supporting rules
    if (has('majorCollisionDetected') && ca.majorCollisionDetected === true)
      apply('support', 'Major Collision signal detected', 15, 'majorCollisionDetected');
    if (reduction !== null && reduction >= 8)
      apply('support', 'Speed reduced by ' + reduction + ' km/h', 20, 'speedBeforeKph');
    if (has('stopDurationSeconds') && ca.stopDurationSeconds >= 5)
      apply('support', 'Vehicle stopped for ' + ca.stopDurationSeconds + ' seconds', 15, 'stopDurationSeconds');
    if (has('peerPercentile') && ca.peerPercentile >= 95)
      apply('support', 'Peer comparison: ' + ca.peerPercentile + 'th percentile', 15, 'peerPercentile');
    if (has('nearbyAssetDistanceM') && ca.nearbyAssetDistanceM <= 10)
      apply('support', 'Nearby asset within ' + ca.nearbyAssetDistanceM + ' m', 15, 'nearbyAssetDistanceM');
    if (has('insideSensitiveZone') && ca.insideSensitiveZone === true)
      apply('support', 'Sensitive airport zone', 10, 'insideSensitiveZone');
    if (has('alertsPrevious24Hours') && ca.alertsPrevious24Hours <= 1)
      apply('support', 'No repeated alerts in 24 hours', 10, 'alertsPrevious24Hours');

    // counter rules
    if (has('alertsPrevious24Hours') && ca.alertsPrevious24Hours >= 3)
      apply('counter', ca.alertsPrevious24Hours + ' collision alerts in the previous 24 hours', -30, 'alertsPrevious24Hours');
    if (reduction !== null && reduction < 3)
      apply('counter', 'Speed reduction below 3 km/h (' + reduction + ' km/h)', -20, 'speedBeforeKph');
    if (has('continuedOperatingAfterEvent') && ca.continuedOperatingAfterEvent === true)
      apply('counter', 'Vehicle continued operating normally after the event', -10, 'continuedOperatingAfterEvent');
    if (has('repeatedLocationPattern') && ca.repeatedLocationPattern === true)
      apply('counter', 'Repeated collision pattern at the same location', -15, 'repeatedLocationPattern');
    if (has('possibleDeviceIssue') && ca.possibleDeviceIssue === true)
      apply('counter', 'Possible device or mounting issue', -25, 'possibleDeviceIssue');

    res.score = Math.max(0, Math.min(100, raw));
    res.level = res.score >= 70 ? 'High investigation priority' : res.score >= 40 ? 'Requires review' : 'Likely false positive';
    return res;
  }
  function whyFlaggedSection(c) {
    var ca = c.collisionAnalysis;
    if (!ca || c.category !== 'Collisions') return '';
    var srcs = c.collisionAnalysisSources || {};
    function src(k) { return srcs[k] || 'recorded'; }
    function has(k) { return ca[k] !== undefined && ca[k] !== null; }
    var support = [], counter = [];

    if (ca.majorCollisionDetected === true) {
      support.push(whyRow('support', 'Major Collision signal detected', src('majorCollisionDetected')));
    }
    if (has('speedBeforeKph') && has('speedAfterKph')) {
      var delta = Math.abs(ca.speedBeforeKph - ca.speedAfterKph);
      if (delta >= 5) {
        support.push(whyRow('support',
          'Speed changed from ' + esc(String(ca.speedBeforeKph)) + ' km/h to ' + esc(String(ca.speedAfterKph)) + ' km/h' +
          (has('speedChangeDurationSeconds') ? ' in ' + esc(String(ca.speedChangeDurationSeconds)) + ' s' : ''),
          src('speedBeforeKph')));
      } else {
        counter.push(whyRow('counter',
          'Minimal or no supporting speed change (' + esc(String(ca.speedBeforeKph)) + ' → ' + esc(String(ca.speedAfterKph)) + ' km/h)',
          src('speedBeforeKph')));
      }
    }
    if (has('speedAfterKph') && ca.speedAfterKph <= 3) {
      support.push(whyRow('support',
        'Vehicle stopped after the event' + (has('stopDurationSeconds') ? ' — stationary for ' + esc(String(ca.stopDurationSeconds)) + ' s' : ''),
        has('stopDurationSeconds') ? src('stopDurationSeconds') : src('speedAfterKph')));
    }
    if (has('peerPercentile')) {
      support.push(whyRow('support', 'Unusual for this asset class — ' + esc(String(ca.peerPercentile)) + 'th percentile vs similar vehicles', src('peerPercentile')));
    }
    if (has('alertsPrevious24Hours')) {
      if (ca.alertsPrevious24Hours <= 1) support.push(whyRow('support', 'No repeated collision alerts in the previous 24 hours', src('alertsPrevious24Hours')));
      else counter.push(whyRow('counter', esc(String(ca.alertsPrevious24Hours)) + ' collision alerts for this vehicle within 24 hours', src('alertsPrevious24Hours')));
    }
    if (has('nearbyAssetDistanceM')) {
      support.push(whyRow('support', 'Another asset was nearby — ' + esc(String(ca.nearbyAssetDistanceM)) + ' m at the time of the event', src('nearbyAssetDistanceM')));
    }
    if (ca.insideSensitiveZone === true) {
      support.push(whyRow('support', 'Event occurred inside a sensitive zone (stand, bay or yard)', src('insideSensitiveZone')));
    }
    if (ca.continuedOperatingAfterEvent === true) {
      counter.push(whyRow('counter', 'Vehicle continued operating normally after the event', src('continuedOperatingAfterEvent')));
    }
    if (ca.repeatedLocationPattern === true) {
      counter.push(whyRow('counter', 'Similar alerts repeatedly occur at this location', src('repeatedLocationPattern')));
    }
    if (ca.possibleDeviceIssue === true) {
      counter.push(whyRow('counter', 'Possible device, mounting, road-surface or operating-condition issue', src('possibleDeviceIssue')));
    }
    // Case-authored qualitative signals and review limitations. Display rows
    // only — they carry no points and never enter the score calculation.
    (ca.observedSignals || []).forEach(function (s) {
      if (s && s.text) support.push(whyRow('support', esc(s.text), s.source || 'recorded'));
    });
    (ca.limitations || []).forEach(function (s) {
      if (!s || !s.text) return;
      counter.push(s.source
        ? whyRow('counter', esc(s.text), s.source)
        : '<div class="dt-why-row">' + ic('alert-triangle', 14) + '<span class="dt-why-text">' + esc(s.text) + '</span></div>');
    });

    if (!support.length && !counter.length) return '';

    // Step 2: deterministic investigation-priority summary (recomputed per case)
    var evald = evaluateCollisionCandidate(ca, srcs);
    // Optional case-authored presentation (ca.scorePresentation): when the
    // automated trigger score and the reviewed evidence diverge, the case
    // reframes the score as detection confidence and states the review
    // outcome separately. The calculation and breakdown are untouched.
    var sp = ca.scorePresentation || null;
    var lvlClass = evald.level === 'High investigation priority' ? 'lvl-high'
      : evald.level === 'Requires review' ? 'lvl-review' : 'lvl-fp';
    var calcRows = evald.supportingSignals.concat(evald.counterSignals).map(function (r) {
      return '<div class="dt-why-calcrow"><span class="dt-why-text">' + esc(r.text) + '</span>' +
        '<span class="dt-why-pts ' + (r.points >= 0 ? 'pos' : 'neg') + '">' + (r.points > 0 ? '+' : '') + r.points + '</span>' +
        whySrcPill(r.source) + '</div>';
    }).join('');
    var assessRows = (sp && sp.assessments && sp.assessments.length)
      ? sp.assessments.map(function (a2) {
          return '<div class="dt-why-assessrow"><span class="k">' + esc(a2[0]) + '</span><span class="v">' + esc(a2[1]) + '</span></div>';
        }).join('')
      : '';
    var priority = '<div class="dt-why-priority ' + lvlClass + '">' +
      '<div class="dt-why-pri-top"><span class="dt-why-label" style="margin-bottom:0">' + esc((sp && sp.scoreLabel) || 'Investigation priority') + '</span>' +
      '<span class="dt-why-score">Score: ' + evald.score + ' / 100</span></div>' +
      '<div class="dt-why-level"><span class="dt-dot"></span>' + esc((sp && sp.interpretation) || evald.level) + '</div>' +
      assessRows +
      '<div class="dt-why-disclaimer">' + esc((sp && sp.note) || 'This score prioritizes review. It does not confirm that an accident occurred.') + '</div>' +
      (evald.reasons.length
        ? '<button class="dt-linkbtn dt-why-calcbtn" data-act="why-calc:' + c.id + '">' +
            ic(c.whyCalcOpen ? 'chevron-down' : 'chevron-right', 13) + 'How this was calculated</button>' +
          (c.whyCalcOpen ? '<div class="dt-why-calc">' + calcRows + '</div>' : '')
        : '') +
    '</div>';

    return '<div class="dt-section"><span class="dt-micro">Why this event was flagged</span>' +
      '<div class="dt-why">' + priority +
        '<div class="dt-why-group"><span class="dt-why-label">Supporting signals</span>' +
          (support.length ? support.join('') : '<div class="dt-why-empty">No supporting signals recorded.</div>') + '</div>' +
        '<div class="dt-why-group is-counter"><span class="dt-why-label">Counter-signals</span>' +
          (counter.length ? counter.join('') : '<div class="dt-why-empty">No counter-signals recorded for this event.</div>') + '</div>' +
      '</div></div>';
  }

  /* ── Step 3: asset-class peer comparison ────────────────────────────────
     Compares the event against vehicles of the SAME equipment type — never
     one universal fleet average. Pure read of the case record: renders only
     for Collisions cases with collisionAnalysis + peerComparison data,
     omits metrics without an event value (no zero substitution), and shows
     the provenance of every displayed value. */
  function peerBar(event, median, p95) {
    if (event == null || median == null) return '';
    var max = Math.max(event, median, p95 == null ? 0 : p95) * 1.08 || 1;
    function pos(v) { return Math.min(98, Math.max(1, Math.round(v / max * 100))); }
    return '<div class="dt-peer-bar">' +
      '<span class="dt-peer-mark" style="left:' + pos(median) + '%" title="Peer median"></span>' +
      (p95 != null ? '<span class="dt-peer-mark p95" style="left:' + pos(p95) + '%" title="Peer 95th percentile"></span>' : '') +
      '<span class="dt-peer-event" style="left:' + pos(event) + '%" title="This event"></span>' +
      '</div>';
  }
  function peerKv(label, value, src, strong) {
    return '<span class="dt-peer-kv">' + esc(label) + ': ' +
      (strong ? '<strong>' : '') + esc(String(value)) + (strong ? '</strong>' : '') + ' ' + whySrcPill(src) + '</span>';
  }
  function peerComparisonSection(c) {
    var pc = c.peerComparison;
    if (!pc || !c.collisionAnalysis || c.category !== 'Collisions') return '';
    var s = c.peerComparisonSources || {};
    var em = pc.eventMetrics || {}, bench = pc.peerBenchmarks || {}, pct = pc.percentiles || {};
    function hasV(v) { return v !== undefined && v !== null; }

    var rows = [];
    function metricRow(name, event, evSrc, unit, median, p95, percentile, opts) {
      if (!hasV(event)) return; // metric without an event value is omitted entirely
      opts = opts || {};
      var kvs = [peerKv(opts.eventLabel || 'This event', event + unit, evSrc, true)];
      var hasBench = hasV(median) || hasV(p95);
      if (hasV(median)) kvs.push(peerKv('Peer median', median + unit, s.peerBenchmarks || 'illustrative'));
      if (hasV(p95)) kvs.push(peerKv('Peer 95th percentile', p95 + unit, s.peerBenchmarks || 'illustrative'));
      if (hasV(percentile)) kvs.push(peerKv('Event percentile', percentile + 'th', s.percentiles || 'illustrative', true));
      if (opts.interpretation) kvs.push(peerKv('Interpretation', opts.interpretation, 'derived'));
      rows.push('<div class="dt-peer-row"><span class="dt-peer-name">' + esc(name) + '</span>' +
        (opts.noBar || !hasBench ? '' : peerBar(event, median, p95)) +
        '<div class="dt-peer-vals">' + kvs.join('') +
        (!hasBench ? '<span class="dt-peer-unavail">Peer benchmark unavailable for this metric.</span>' : '') +
        '</div></div>');
    }
    metricRow('Speed reduction', em.speedReductionKph, s.eventSpeedReduction || 'derived', ' km/h',
      bench.medianSpeedReductionKph, bench.percentile95SpeedReductionKph, pct.speedReduction);
    metricRow('Peak combined acceleration', em.peakCombinedG, s.eventPeakCombinedG || 'recorded', ' g',
      bench.medianPeakCombinedG, bench.percentile95PeakCombinedG, pct.peakCombinedG);
    metricRow('Stop after event', em.stopDurationSeconds, s.eventStopDuration || 'derived', ' seconds',
      bench.medianStopDurationSeconds, null, pct.stopDuration);
    metricRow('Collision alerts in previous 24 hours', em.collisionAlerts24Hours, s.eventCollisionAlerts || 'recorded', '',
      bench.medianCollisionAlerts24Hours, null, null,
      { eventLabel: 'This vehicle', noBar: true,
        interpretation: em.collisionAlerts24Hours <= 1 ? 'Isolated event' : 'Repeated alerts' });
    if (!rows.length) return '';

    var subtitleBits = [];
    if (pc.peerGroupLabel) {
      subtitleBits.push('<span class="dt-peer-kv"><strong>' + esc(pc.peerGroupLabel) + '</strong> ' + whySrcPill(s.assetClass || 'recorded') + '</span>');
    }
    var extra = [];
    if (hasV(pc.peerVehicleCount)) extra.push(pc.peerVehicleCount + ' peer vehicles');
    if (hasV(pc.comparisonWindowDays)) extra.push('previous ' + pc.comparisonWindowDays + ' days');
    if (extra.length) {
      subtitleBits.push('<span class="dt-peer-kv">' + esc(extra.join(' · ')) + ' ' + whySrcPill(s.peerVehicleCount || 'illustrative') + '</span>');
    }

    var classification = pc.classification
      ? '<div class="dt-peer-class">Peer-group interpretation: <strong>' + esc(pc.classification) + '</strong> ' + whySrcPill(s.classification || 'derived') + '</div>'
      : '';
    var note = pc.assetClass
      ? '<div class="dt-peer-note">This comparison evaluates the event against similar ' + esc(pc.assetClass.toLowerCase()) + 's, not against the entire airport fleet.</div>'
      : '';

    return '<div class="dt-section"><span class="dt-micro">Compared with similar airport equipment</span>' +
      '<div class="dt-peer">' +
        '<div class="dt-peer-sub">' + subtitleBits.join('<span class="dt-peer-dot">·</span>') + '</div>' +
        classification + note + rows.join('') +
      '</div></div>';
  }

  /* ── Step 5: investigation actions + structured audit history ──────────
     Actions are shown only for collision/fatigue cases, gated by status.
     Every action writes a structured audit record ({at, author, action,
     caseId, previousValue, newValue, reason, notes, metadata}) plus a
     readable activity summary — both live on the case in the existing
     session-state persistence, never in a live database. */
  var IA_FP_REASONS = ['Routine airport braking', 'Repeated equipment vibration', 'Device or mounting issue', 'Rough operating surface', 'Duplicate event', 'Insufficient supporting evidence', 'Other'];
  var IA_SENS_OPTIONS = ['Review threshold for this asset class', 'Increase repeated-event suppression', 'Review device mounting or calibration', 'Review location-specific pattern', 'No change — investigate further'];
  var IA_TEAMS = ['Airport Safety', 'Operations Supervisor', 'Fleet Maintenance', 'Claims Team']; // prototype team directory (fixture)
  var IA_EXPIRY = ['24 hours', '7 days', '30 days'];

  function invStatusLabel(c) {
    if (c.accident) return c.accident.status;
    if (c.investigationStatus) return c.investigationStatus;
    return c.status;
  }
  function invIsClosed(c) {
    return !!c.outcome || (c.accident && c.accident.status === 'Closed') || c.investigationStatus === 'Closed';
  }
  function invCanInvestigate(c) {
    if (invIsClosed(c)) return false;
    if (c.accident) return D.accidentStatuses.indexOf(c.accident.status) < D.accidentStatuses.indexOf('Under review');
    if (c.investigationStatus) return false; // already under review or beyond
    return c.status === 'Open';
  }
  function recordAction(c, action, opts) {
    if (!c.audit) c.audit = [];
    var rec = {
      at: new Date().toISOString(),
      author: meUser().name,
      action: action,
      caseId: c.id,
      previousValue: opts.previousValue !== undefined ? opts.previousValue : null,
      newValue: opts.newValue !== undefined ? opts.newValue : null,
      reason: opts.reason || null,
      notes: opts.notes || null,
      metadata: opts.metadata || {}
    };
    c.audit.unshift(rec);
    c.extra.unshift({ text: opts.summary, meta: 'Just now · ' + meUser().name, kind: 'note' });
    return rec;
  }

  function investigationActionsSection(c) {
    var mode = evInvestigationMode(c);
    if (mode !== 'collision' && mode !== 'fatigue') return '';
    var badges = '';
    if (c.outcome === 'false_positive') badges += '<span class="dt-inv-badge fp">' + ic('x', 12) + 'Closed · false positive</span>';
    if (c.escalation) badges += '<span class="dt-inv-badge esc">' + ic('send', 12) + 'Escalated · ' + esc(c.escalation.to) + '</span>';
    if (invIsClosed(c)) {
      return '<div class="dt-section"><span class="dt-micro">Investigation actions</span>' +
        (badges ? '<div class="dt-inv-badges">' + badges + '</div>' : '') +
        '<div class="dt-inv-note">Investigation closed — the evidence and audit history remain available below.</div>' +
        '<button class="dt-btn dt-btn-sm dt-btn-secondary" style="margin-top:10px" data-act="reopen:' + c.id + '">' + ic('refresh', 14) + 'Reopen case</button></div>';
    }
    var btns = [];
    function b(act, icon, label, danger) {
      btns.push('<button class="dt-btn dt-btn-sm dt-btn-secondary' + (danger ? ' dt-inv-danger' : '') + '" data-act="' + act + ':' + c.id + '">' + ic(icon, 14) + label + '</button>');
    }
    if (invCanInvestigate(c)) b('inv-investigate', 'search', 'Investigate');
    if (mode === 'collision') b('ia-open:fp', 'x', 'Mark false positive', true);
    if (mode === 'collision' || c.detectionRuleConfigurable === true) b('ia-open:sens', 'sliders', 'Reduce sensitivity');
    b('ia-open:esc', 'send', 'Escalate');
    b('ia-open:reassign', 'users', 'Reassign');
    b('ia-open:share', 'lock', 'Share evidence');
    return '<div class="dt-section"><span class="dt-micro">Investigation actions</span>' +
      (badges ? '<div class="dt-inv-badges">' + badges + '</div>' : '') +
      '<div class="dt-inv-actions">' + btns.join('') + '</div></div>';
  }

  function openIaModal(type, id) {
    var c = findCase(id); if (!c) return;
    var m = { type: 'ia', iaType: type, caseId: id, step: 1, draft: {} };
    if (type === 'fp') m.draft = { reason: '', notes: '' };
    else if (type === 'sens') m.draft = { adjustment: IA_SENS_OPTIONS[0], reason: '' };
    else if (type === 'esc') m.draft = { to: '', reason: '', notes: '' };
    else if (type === 'reassign') m.draft = { assignee: '', reason: '' };
    else if (type === 'share') {
      m.draft = { recipient: '', expiry: '7 days', message: '' };
      // pending items (FNOL summary report before submission) don't exist yet
      // and can't be shared as evidence
      m.evd = fnolContext(c).evd.filter(function (x) { return !x.pending; })
        .map(function (x) { return { label: x.label, on: true }; });
    }
    state.modal = m;
    renderModal();
  }
  function iaSelect(field, options, placeholder, selected, warn) {
    return '<div class="dt-field wide' + (warn ? ' warn' : '') + '"><label>' + esc(placeholder.label) + '</label>' +
      '<select data-field="ia:' + field + '">' +
      (placeholder.hint ? '<option value="">' + esc(placeholder.hint) + '</option>' : '') +
      options.map(function (o) { return '<option' + (selected === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') +
      '</select></div>';
  }
  function iaModalHtml(m) {
    var c = findCase(m.caseId);
    function head(title) {
      return '<div class="dt-modal-head"><span class="dt-modal-title"><span style="color:var(--primary-600);display:flex">' + ic('badge', 18) + '</span>' + esc(title) + '</span>' +
        '<button class="dt-iconbtn" data-act="modal-close">' + ic('x', 16) + '</button></div>';
    }
    function foot(label, danger) {
      return '<div class="dt-modal-foot"><button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="modal-close">Cancel</button>' +
        '<button class="dt-btn dt-btn-sm ' + (danger ? 'dt-btn-danger' : 'dt-btn-primary') + '" data-act="ia-confirm">' + esc(label) + '</button></div>';
    }
    var d = m.draft, body;
    if (m.iaType === 'fp') {
      body = '<div class="dt-modal-body"><div class="dt-form-grid">' +
        iaSelect('reason', IA_FP_REASONS, { label: 'Reason', hint: 'Select a reason…' }, d.reason, m.warn && !d.reason) +
        '<div class="dt-field wide"><label>Notes (optional)</label><textarea data-field="ia:notes">' + esc(d.notes) + '</textarea></div>' +
        '</div><div class="dt-inv-warn">' + ic('alert-triangle', 14) + 'Closing this case as a false positive does not delete the original event or evidence.</div></div>';
      return head('Mark as false positive') + body + foot('Close as false positive', true);
    }
    if (m.iaType === 'sens') {
      var ca = c.collisionAnalysis || {};
      body = '<div class="dt-modal-body">' +
        '<div class="dt-form-sec"><span class="dt-micro">Context</span>' +
        '<div class="dt-frow"><span class="k">Asset class</span><span class="v">' + esc((c.peerComparison && c.peerComparison.assetClass) || '—') + '</span></div>' +
        '<div class="dt-frow"><span class="k">Current case</span><span class="v">' + esc(c.code + ' — ' + c.title) + '</span></div>' +
        '<div class="dt-frow"><span class="k">Current event source</span><span class="v">' + (ca.majorCollisionDetected != null ? 'Geotab Major Collision signal' : 'Camera detection event') + '</span></div></div>' +
        '<div class="dt-form-grid">' +
        iaSelect('adjustment', IA_SENS_OPTIONS, { label: 'Proposed adjustment' }, d.adjustment) +
        '<div class="dt-field wide' + (m.warn && !d.reason ? ' warn' : '') + '"><label>Reason (required)</label><textarea data-field="ia:reason">' + esc(d.reason) + '</textarea></div>' +
        '</div><div class="dt-inv-note" style="margin-top:8px">This prototype records a rule-tuning request. It does not modify the live Geotab rule.</div></div>';
      return head('Request sensitivity adjustment') + body + foot('Submit request');
    }
    if (m.iaType === 'esc') {
      body = '<div class="dt-modal-body"><div class="dt-form-grid">' +
        iaSelect('to', IA_TEAMS, { label: 'Escalation destination (prototype team directory)', hint: 'Select a destination…' }, d.to, m.warn && !d.to) +
        '<div class="dt-field wide' + (m.warn && !d.reason ? ' warn' : '') + '"><label>Reason (required)</label><input data-field="ia:reason" value="' + esc(d.reason) + '"></div>' +
        '<div class="dt-field wide"><label>Note (optional)</label><textarea data-field="ia:notes">' + esc(d.notes) + '</textarea></div>' +
        '</div><div class="dt-inv-note" style="margin-top:8px">The case remains open — the escalation is recorded on the case.</div></div>';
      return head('Escalate case') + body + foot('Escalate');
    }
    if (m.iaType === 'reassign') {
      var curName = c.assignee === 'me' ? meUser().name : c.assignee;
      var others = state.users.map(function (u) { return u.name; }).filter(function (n) { return n !== curName; });
      body = '<div class="dt-modal-body">' +
        '<div class="dt-form-sec"><div class="dt-frow"><span class="k">Current assignee</span><span class="v">' + esc(curName) + '</span></div></div>' +
        '<div class="dt-form-grid">' +
        iaSelect('assignee', others, { label: 'New assignee', hint: 'Select an assignee…' }, d.assignee, m.warn && !d.assignee) +
        '<div class="dt-field wide' + (m.warn && !d.reason ? ' warn' : '') + '"><label>Reason for reassignment (required)</label><input data-field="ia:reason" value="' + esc(d.reason) + '"></div>' +
        '</div></div>';
      return head('Reassign case') + body + foot('Reassign');
    }
    // share
    var evd = (m.evd || []).map(function (x, i) {
      return '<label class="dt-evd-row"><input type="checkbox" ' + (x.on ? 'checked' : '') + ' data-act="ia-evd:' + i + '">' + esc(x.label) + '</label>';
    }).join('');
    body = '<div class="dt-modal-body"><div class="dt-form-grid">' +
      iaSelect('recipient', IA_TEAMS.concat(state.users.map(function (u) { return u.name; })), { label: 'Recipient', hint: 'Select a recipient…' }, d.recipient, m.warn && !d.recipient) +
      iaSelect('expiry', IA_EXPIRY, { label: 'Link expiration' }, d.expiry) +
      '</div>' +
      '<div class="dt-form-sec" style="margin-top:12px"><span class="dt-micro">Evidence to share</span>' + evd + '</div>' +
      '<div class="dt-form-grid"><div class="dt-field wide"><label>Message (optional)</label><textarea data-field="ia:message">' + esc(d.message) + '</textarea></div></div>' +
      '<div class="dt-inv-note" style="margin-top:8px">Evidence is shared as a controlled link — large files are not emailed directly.</div></div>';
    return head('Share case evidence') + body + foot('Create secure link');
  }

  function fnolSection(c) {
    var ins = (c.accident && c.accident.insurer) || D.insurer;
    var shares = c.reportShares || [];
    var shareNote = shares.length
      ? '<div class="dt-graph-caption">' + ic('send', 13) + 'Report shared ' + shares.length + ' time' + (shares.length === 1 ? '' : 's') + ' — last to ' +
        esc(shares[0].to.map(function (r) { return r.label; }).join(', ')) + ' · ' + esc(shares[0].at) + '. See the audit history.</div>'
      : '';
    if (!c.fnol) {
      return '<div class="dt-section"><span class="dt-micro">Insurance</span>' +
        '<div class="dt-fnolcta">' +
          '<span class="dt-fnolcta-icon">' + ic('file-text', 20) + '</span>' +
          '<span style="flex:1;min-width:0"><span class="dt-fnolcta-title" style="display:block">First Notice of Loss</span>' +
          '<span class="dt-fnolcta-sub">Builds the insurer-ready package from this case — prefilled from the record, review before sending' +
          (ins && ins.name && !/requires confirmation|not provided/i.test(ins.name) ? ' to ' + esc(ins.name) + '.' : '. Insurer details require confirmation.') + '</span></span>' +
          '<button class="dt-btn dt-btn-sm dt-btn-primary" data-act="fnol-open:' + c.id + '">Start FNOL</button>' +
        '</div>' + shareNote + '</div>';
    }
    var f = c.fnol;
    var evd = f.evidence.map(function (e) {
      return '<button class="dt-securelink" data-act="securelink">' + ic('lock', 12) + esc(e) + '</button>';
    }).join(' ');
    var docsRow = (f.documents && f.documents.length)
      ? '<div class="dt-frow"><span class="k">Supporting documents</span><span class="v">' +
        f.documents.map(function (d) { return esc(d.cat) + ' — ' + esc(d.name); }).join('<br>') + '</span></div>'
      : '';
    var recipRow = (f.recipients && f.recipients.length)
      ? '<div class="dt-frow"><span class="k">Recipients</span><span class="v">' +
        f.recipients.map(function (r) { return esc(r.label) + ' · ' + esc(r.addr); }).join('<br>') + '</span></div>'
      : '';
    return '<div class="dt-section" id="dt-fnolrec"><span class="dt-micro">Insurance — FNOL submission</span>' +
      '<div class="dt-fnolrec">' +
        '<div class="dt-fnolrec-head">' + ic('check-circle', 16) + 'FNOL submitted · ' + esc(f.at) + '</div>' +
        '<div class="dt-fnolrec-body">' +
          '<div class="dt-frow"><span class="k">Submitted by</span><span class="v">' + esc(f.by) + '</span></div>' +
          '<div class="dt-frow"><span class="k">Sent to</span><span class="v">' + esc(f.to) + (f.webhook ? '<br>Webhook: ' + esc(f.webhook) : '') + '</span></div>' +
          recipRow +
          '<div class="dt-frow"><span class="k">Delivery</span><span class="v" style="color:var(--success-700);font-weight:600">' + esc(f.delivery) + '</span></div>' +
          '<div class="dt-frow"><span class="k">Package</span><span class="v"><button class="dt-securelink" data-act="fnol-download:' + c.id + '">' + ic('file-text', 12) + esc(f.attachment) + ' · download</button> <span style="color:var(--gray-500)">' + f.fieldCount + ' fields</span></span></div>' +
          '<div class="dt-frow"><span class="k">Evidence shared</span><span class="v" style="display:flex;gap:6px;flex-wrap:wrap">' + evd + '</span></div>' +
          docsRow +
          '<div class="dt-frow"><span class="k">Insurer response</span><span class="v">' + esc(f.response) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="dt-graph-caption">' + ic('lock', 13) + 'Video and recordings are shared as controlled links, not email attachments.</div>' +
      shareNote +
    '</div>';
  }

  /* ── Modal engine ─────────────────────────────────────────────────────── */
  function renderModal() {
    // preserve body scroll when re-rendering the same modal step (e.g. answer toggles)
    var ex = qs('#dt-modalwrap');
    var prevScroll = 0, prevKey = renderModal._key;
    if (ex) {
      var b = ex.querySelector('.dt-modal-body');
      prevScroll = b ? b.scrollTop : 0;
      ex.remove();
    }
    if (!state.modal) { renderModal._key = null; return; }
    var m = state.modal;
    var key = m.type + ':' + (m.iaType || '') + ':' + m.step;
    var html = m.type === 'call' ? callModalHtml(m) : m.type === 'newcase' ? newCaseModalHtml(m) : m.type === 'ia' ? iaModalHtml(m) : m.type === 'reset' ? resetModalHtml() : fnolModalHtml(m);
    var wrap = document.createElement('div'); wrap.id = 'dt-modalwrap';
    wrap.innerHTML = '<div class="dt-modal-scrim" data-act="modal-close"></div><div class="dt-modal">' + html + '</div>';
    root.appendChild(wrap);
    renderModal._key = key;
    if (prevKey === key && prevScroll) {
      var nb = wrap.querySelector('.dt-modal-body');
      if (nb) nb.scrollTop = prevScroll;
    }
  }
  function closeModal() {
    if (callTimer) { clearInterval(callTimer); callTimer = null; }
    state.modal = null; renderModal();
    if (state.openId) renderPanel();
  }
  function fmtDur(sec) { return Math.floor(sec / 60) + ' m ' + (sec % 60 < 10 ? '0' : '') + (sec % 60) + ' s'; }

  /* ── Welfare-call modal ───────────────────────────────────────────────── */
  var ANSWER_DEFS = [
    { key: 'safe', q: 'Driver safe', opts: ['Yes', 'No'] },
    { key: 'injuries', q: 'Injuries', opts: ['None', 'Minor', 'Serious'] },
    { key: 'ems', q: 'Emergency services', opts: ['Not needed', 'Dispatched'] },
    { key: 'thirdParty', q: 'Third party', opts: ['None', 'Fixed object', 'Vehicle'] }
  ];
  var ESC_CHAIN = ['Phone', 'Driver app', 'Voice agent', 'Supervisor notified'];

  function openCallModal(id) {
    // Neutral capture defaults; a case may pre-select answers that match its
    // own scripted outcome via accident.callOutcome.defaults.
    var c = findCase(id);
    var seed = (c && c.accident && c.accident.callOutcome && c.accident.callOutcome.defaults) || {};
    state.modal = {
      type: 'call', caseId: id, step: 1, method: null, sec: 0,
      answers: {
        safe: seed.safe || 'Yes', injuries: seed.injuries || 'None',
        // third party starts unselected unless the case seeds it — the manager
        // must confirm involvement rather than inherit a preselected answer
        ems: seed.ems || 'Not needed', thirdParty: seed.thirdParty || ''
      },
      attempts: []
    };
    renderModal();
  }

  function callModalHtml(m) {
    var c = findCase(m.caseId), a = c.accident;
    var head = function (title, icon) {
      return '<div class="dt-modal-head"><span class="dt-modal-title"><span style="color:var(--primary-600);display:flex">' + ic(icon, 18) + '</span>' + title + '</span>' +
        '<button class="dt-iconbtn" data-act="modal-close">' + ic('x', 16) + '</button></div>';
    };
    if (m.step === 1) {
      var kv = [
        ['Driver', a.driver.name + ' (' + a.driver.id + ') · ' + a.driver.phone],
        ['Vehicle', a.vehicle],
        ['When / where', a.when + ' · ' + a.location],
        ['Detected severity', a.detectedSeverity],
        ['Video', a.videoAvailable + ' — attached to this case']
      ].map(function (r) { return '<span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span>'; }).join('');
      var asks = a.keyQuestions.map(function (q) { return '<li>' + ic('check', 13) + esc(q) + '</li>'; }).join('');
      var attempts = m.attempts.length
        ? '<div class="dt-attempts">' + m.attempts.map(function (at) {
            return '<span class="dt-attempt' + (at.ok ? ' ok' : '') + '">' + esc(at.label) + (at.ok ? ' ✓' : ' · no answer') + '</span>';
          }).join('') + '</div>'
        : '';
      return head('Contact driver — pre-call whisper', 'sparkle') +
        '<div class="dt-modal-body">' +
          '<div class="dt-whisper">' +
            '<div class="dt-whisper-title"><span style="color:var(--primary-600);display:flex">' + ic('sparkle', 15) + '</span><span class="dt-micro" style="color:var(--primary-700)">What Clarity already knows</span></div>' +
            '<div class="dt-kv">' + kv + '</div>' +
          '</div>' +
          '<span class="dt-micro" style="display:block;margin-bottom:8px">Ask about</span>' +
          '<ul class="dt-askfor">' + asks + '</ul>' + attempts +
        '</div>' +
        '<div class="dt-modal-foot">' +
          '<button class="dt-linkbtn" data-act="call-esc">Driver unreachable? Escalate</button>' +
          '<span style="display:flex;gap:8px">' +
            '<button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="call-connect:phone">' + ic('phone', 15) + 'Call phone</button>' +
            '<button class="dt-btn dt-btn-sm dt-btn-primary" data-act="call-connect:camera">' + ic('video', 15) + 'Connect via camera · two-way audio</button>' +
          '</span>' +
        '</div>';
    }
    if (m.step === 2) {
      var isCam = m.method === 'camera';
      var video = '<div class="dt-call-video"' + (isCam ? ' style="background-image:url(' + assetUrl('images/dashcam-frame.png') + ')"' : '') + '>' +
        '<span class="dt-rec"><span class="dt-dot"></span>REC</span>' +
        '<span class="dt-call-timer" id="dt-call-timer">' + fmtDur(m.sec) + '</span>' +
        (isCam ? '' : '<span style="color:#fff;display:flex;flex-direction:column;align-items:center;gap:8px">' + ic('phone', 28) + '<span style="font-size:13px;font-weight:600">' + esc(a.driver.phone) + '</span></span>') +
        '<span class="dt-call-label">' + (isCam ? 'Cab camera · two-way audio · ' + esc(a.vehicle) : 'Phone call — camera audio unavailable, escalated') + '</span>' +
      '</div>';
      var rows = ANSWER_DEFS.map(function (def) {
        var btns = def.opts.map(function (o) {
          return '<button class="' + (m.answers[def.key] === o ? 'on' : '') + '" data-act="call-ans:' + def.key + ':' + encodeURIComponent(o) + '">' + esc(o) + '</button>';
        }).join('');
        return '<div class="dt-ans-row"><span class="dt-ans-q">' + esc(def.q) + '</span><span class="dt-ansbtns">' + btns + '</span></div>';
      }).join('');
      // cases without a scripted demo transcript show the recording notice only
      var tr = (a.callScript || []).map(function (l) {
        return '<div class="dt-tr-line"><strong>' + esc(l.who) + ':</strong> ' + esc(l.line) + '</div>';
      }).join('') || '<div class="dt-tr-line" style="color:var(--gray-500)">Live audio in progress. The recording and transcript attach to the case when the call ends.</div>';
      return head('Live call — ' + esc(a.driver.name), isCam ? 'video' : 'phone') +
        '<div class="dt-modal-body">' + video +
          '<div class="dt-recnotice">' + ic('lock', 13) + 'Recording — notice played to the driver. Recording and transcript attach to the case automatically.</div>' +
          '<span class="dt-micro" style="display:block;margin-bottom:2px">Capture responses</span>' + rows +
          '<span class="dt-micro" style="display:block;margin:14px 0 8px">Live transcript</span>' +
          '<div class="dt-transcript">' + tr + '</div>' +
        '</div>' +
        '<div class="dt-modal-foot">' +
          '<span style="font-size:12px;color:var(--gray-500)">' + ic('mic', 12) + ' Two-way audio open</span>' +
          '<button class="dt-btn dt-btn-sm dt-btn-primary" data-act="call-end">' + ic('check', 15) + 'End call &amp; attach to case</button>' +
        '</div>';
    }
    // step 3 — attached confirmation
    var call = a.welfareCall;
    return head('Attached to the case', 'check-circle') +
      '<div class="dt-modal-body">' +
        '<div class="dt-attachlist">' +
          '<div class="dt-attachrow">' + ic('check-circle', 16) + 'Call recording · ' + esc(call.duration) + ' · stored as a secure link (access logged)</div>' +
          ((a.callScript && a.callScript.length) ? '<div class="dt-attachrow">' + ic('check-circle', 16) + 'Transcript · ' + a.callScript.length + ' lines</div>' : '') +
          '<div class="dt-attachrow">' + ic('check-circle', 16) + 'Summary: ' + esc(call.summaryLine) + '</div>' +
          '<div class="dt-attachrow">' + ic('check-circle', 16) + 'Accident status advanced to <strong>&nbsp;' + esc(a.status) + '</strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="dt-modal-foot">' +
        '<button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="modal-close">Done</button>' +
        '<button class="dt-btn dt-btn-sm dt-btn-primary" data-act="fnol-open:' + c.id + '">Continue to FNOL ' + ic('arrow-right', 14) + '</button>' +
      '</div>';
  }

  function startCallTimer() {
    if (callTimer) clearInterval(callTimer);
    callTimer = setInterval(function () {
      if (!state.modal || state.modal.type !== 'call' || state.modal.step !== 2) return;
      state.modal.sec++;
      var el = qs('#dt-call-timer');
      if (el) el.textContent = fmtDur(state.modal.sec);
    }, 1000);
  }

  function endCall() {
    var m = state.modal; if (!m) return;
    var c = findCase(m.caseId), a = c.accident;
    if (callTimer) { clearInterval(callTimer); callTimer = null; }
    var answers = ANSWER_DEFS.map(function (def) { return { q: def.q, a: m.answers[def.key] || 'Not captured' }; });
    var summaryLine = 'driver ' + (m.answers.safe === 'Yes' ? 'safe' : 'NOT safe') +
      ', injuries: ' + m.answers.injuries.toLowerCase() +
      ', EMS ' + (m.answers.ems === 'Not needed' ? 'not needed' : 'dispatched') +
      ', third party: ' + (m.answers.thirdParty ? m.answers.thirdParty.toLowerCase() : 'not captured');
    var safeOutcome = m.answers.safe === 'Yes' && m.answers.injuries === 'None' && m.answers.ems === 'Not needed';
    a.welfareCall = {
      method: m.method === 'camera' ? 'Cab camera · two-way audio' : 'Phone call',
      duration: fmtDur(Math.max(m.sec, 1)), recorded: true, at: 'Just now',
      answers: answers, summaryLine: summaryLine, safeOutcome: safeOutcome
    };
    // every captured answer flows back into the incident record
    a.details.injuries = m.answers.injuries === 'None'
      ? 'None reported — confirmed on welfare call'
      : m.answers.injuries + ' injuries reported on the welfare call' + (m.answers.ems === 'Dispatched' ? ' — EMS dispatched' : '');
    if (m.answers.thirdParty === 'None') a.details.thirdParty = 'None — confirmed on welfare call';
    else if (m.answers.thirdParty === 'Vehicle') a.details.thirdParty = 'Another vehicle involved — exchanging details';
    // The driver statement and any driver photos come from the case's own
    // scripted outcome fixture (accident.callOutcome), and only when the
    // captured answers match the fixture's conditions. Without a fixture the
    // result is neutral — no third party, damage, injury or statement is
    // invented on the case's behalf.
    var fixture = a.callOutcome || null;
    var fixtureApplies = !!fixture && (function (when) {
      if (!when) return true;
      for (var k in when) { if (when.hasOwnProperty(k) && m.answers[k] !== when[k]) return false; }
      return true;
    })(fixture.appliesWhen);
    a.driverStatement = (fixtureApplies && fixture.statement)
      ? fixture.statement + ' — ' + a.driver.name + ', welfare call'
      : 'Driver response recorded — ' + summaryLine + '. Incident details require manager confirmation.';
    var arrivedPhotos = (fixtureApplies && fixture.photos) ? JSON.parse(JSON.stringify(fixture.photos)) : [];
    if (arrivedPhotos.length) a.photos = arrivedPhotos;
    // swap the pending-statement context line regardless of the exact
    // punctuation the case authored it with
    var ctxIdx = -1;
    for (var ci = 0; ci < c.context.length; ci++) {
      if (/welfare call pending/i.test(c.context[ci])) { ctxIdx = ci; break; }
    }
    if (ctxIdx >= 0) c.context[ctxIdx] = 'Driver statement captured on the welfare call — attached below';
    var idx = D.accidentStatuses.indexOf(a.status);
    if (idx < D.accidentStatuses.indexOf('Under review')) a.status = 'Under review';
    var acts = [
      { text: 'Welfare call summary attached — ' + summaryLine, meta: 'Just now · ' + meUser().name, kind: 'note' }
    ];
    if (arrivedPhotos.length) acts.push({ text: arrivedPhotos.length + ' photo' + (arrivedPhotos.length === 1 ? '' : 's') + ' from the driver attached to the case', meta: 'Just now · System', kind: 'ai' });
    acts.push(
      { text: 'Call recording attached (secure link) — ' + a.welfareCall.duration + ', recorded with notice', meta: 'Just now · System', kind: 'ai' },
      { text: (m.method === 'camera' ? 'Two-way camera call' : 'Phone call') + ' with ' + a.driver.name + (m.attempts.length ? ' after escalation (' + m.attempts.map(function (x) { return x.label; }).join(' → ') + ')' : ''), meta: 'Just now · ' + meUser().name, kind: 'note' }
    );
    c.extra.unshift.apply(c.extra, acts);
    m.step = 3;
    renderModal(); rerender();
    toast('Call attached to the case — status moved to ' + a.status + '.');
  }

  /* ── FNOL modal (available on every case) ─────────────────────────────── */
  // Internal FNOL recipients come from the configured directory in the data
  // model (D.fnolInternal) — a real deployment reads these from company
  // settings / the Geotab user directory. Nothing is hardcoded here.
  function fnolInternalDirectory() { return D.fnolInternal || []; }
  // Insured company is a fact of the case record — never a global default.
  function insuredCompanyOf(c) {
    var a = c.accident;
    return (a && a.insured && a.insured.company) || (c.insured && c.insured.company) || '';
  }
  var FNOL_DOC_CATS = [
    "Driver's licence", 'Vehicle registration', 'Insurance / policy document',
    'Photos of vehicle damage', 'Photos of third-party damage', 'Scene photos',
    'Witness statement', 'Police report', 'Towing receipt / report',
    'Repair estimate', 'Supervisor incident report', 'Other attachment'
  ];
  function fnolContext(c) {
    var a = c.accident;
    // Insurer & policy: per-case record first, then the configured default in
    // the data model; when neither exists the fields read as not provided.
    var ins = (a && a.insurer) || D.insurer || { name: 'Not provided', policy: '', destination: '', webhook: '' };
    var insuredCompany = insuredCompanyOf(c);
    var meta = c.evidenceMeta || null;
    function tripDatum(label) {
      if (!meta || !meta.tripData) return '';
      for (var i = 0; i < meta.tripData.length; i++) if (meta.tripData[i][0] === label) return meta.tripData[i][1];
      return '';
    }
    // confirm[key] = prefilled from the record but still needs the manager's
    // confirmation (derived / uncertain values keep the amber treatment).
    var draft, confirm = {};
    if (a) {
      draft = {
        insured: insuredCompany, policy: ins.policy, insurerName: ins.name,
        vehicle: a.vehicle, driver: a.driver ? a.driver.name + ' (' + a.driver.id + ')' : '',
        when: a.when, location: a.location,
        // Composed from the accident record (severity · location · third party)
        // so it always reflects the current record, incl. welfare-call updates.
        description: [a.detectedSeverity, a.location,
          a.details && a.details.thirdParty ? 'Third party: ' + a.details.thirdParty : '']
          .filter(Boolean).join(' · '),
        injuries: a.details.injuries, thirdParty: a.details.thirdParty,
        police: a.details.police, towing: a.details.towing, condition: a.details.vehicleCondition,
        statement: a.driverStatement || ''
      };
      confirm.description = true; // composed narrative — confirm before sending
      // Detail fields the record itself marks as unconfirmed stay amber
      // ("confirm on welfare call", "unknown") — but not values already
      // confirmed ("confirmed on welfare call").
      ['injuries', 'thirdParty', 'police', 'towing', 'condition'].forEach(function (k) {
        if (/unknown|confirm(?!ed)/i.test(draft[k] || '')) confirm[k] = true;
      });
    } else {
      // Generic case: pull everything the record already knows — subject,
      // recorded clip timestamps, trip corridor — and flag derived values
      // for confirmation. Nothing is invented; true unknowns stay blank.
      var isDriverSubject = !!(c.subject && c.subject.avatar);
      var isVehicleSubject = !isDriverSubject && !!(c.subject && /#/.test(c.subject.name));
      var when = (c.evidence && c.evidence[0] && c.evidence[0].time) || tripDatum('Time of day') || c.time || '';
      var location = tripDatum('Corridor') || (c.evidence && c.evidence[0] && c.evidence[0].place) || '';
      draft = {
        insured: insuredCompany, policy: ins.policy, insurerName: ins.name,
        vehicle: isVehicleSubject ? c.subject.name : '',
        driver: isDriverSubject ? c.subject.name : '',
        when: when, location: location,
        description: c.whatHappened ? (c.whatHappened.entity + c.whatHappened.text) : c.title,
        injuries: '', thirdParty: '', police: '', towing: '', condition: '',
        statement: ''
      };
      if (when) confirm.when = true;          // derived from evidence timestamps
      if (location) confirm.location = true;  // derived from clip/trip data
      // Subject-to-field mapping is heuristic (avatar => driver, '#' => vehicle)
      // — e.g. a dashcam unit also matches '#' — so both stay amber until confirmed.
      if (draft.vehicle) confirm.vehicle = true;
      if (draft.driver) confirm.driver = true;
    }
    // Automatically available evidence, grouped for the attachments section.
    // Labels are kind-aware: image items list by their label, video clips by
    // place and duration (no legacy-field assumptions).
    var evd = [];
    (c.evidence || []).forEach(function (e) {
      if (evIsImage(e)) {
        evd.push({ group: 'Images & visuals', label: 'Image · ' + (e.label || e.place || 'evidence image'), secure: true, on: true });
      } else {
        var durL = evDurationLabel(e);
        // A clip that is not camera footage states its own attachment label
        // (e.attachmentLabel) instead of the dashcam default.
        evd.push({ group: 'Video evidence', label: e.attachmentLabel || ('Dashcam clip · ' + (e.place || e.label || '') + (durL ? ' (' + durL + ')' : '')), secure: true, on: true });
      }
    });
    if (a && a.photos && a.photos.length) a.photos.forEach(function (p) {
      evd.push({ group: 'Photos', label: p.name + ' · ' + p.meta, secure: true, on: true });
    });
    if (a && a.telematics) evd.push({ group: 'Telemetry & map', label: 'Telematics graphs · speed + ' + ((a.telematics.accelLabel || 'lateral g').toLowerCase()), secure: false, on: true });
    else if (meta && meta.telemetry) evd.push({ group: 'Telemetry & map', label: 'Telemetry snapshot · speed & events', secure: false, on: true });
    if (a && a.location) evd.push({ group: 'Telemetry & map', label: 'Map & route snapshot · ' + a.location, secure: false, on: true });
    else if (tripDatum('Corridor')) evd.push({ group: 'Telemetry & map', label: 'Map & route snapshot · ' + tripDatum('Corridor'), secure: false, on: true });
    if (a && a.welfareCall) {
      evd.push({ group: 'Statements & transcripts', label: 'Welfare call recording · ' + a.welfareCall.duration, secure: true, on: true });
      if (a.callScript && a.callScript.length) evd.push({ group: 'Statements & transcripts', label: 'Call transcript · ' + a.callScript.length + ' lines', secure: false, on: true });
    }
    if (a && a.driverStatement) evd.push({ group: 'Statements & transcripts', label: 'Driver statement · summarized from the welfare call', secure: false, on: true });
    evd.push({ group: 'Case documents', label: 'Case summary & activity log', secure: false, on: true });
    // pending: only exists once the formal FNOL is submitted — excluded from
    // report shares and evidence shares so we never claim to send it early.
    evd.push({ group: 'Case documents', label: 'FNOL summary report · generated on submit', secure: false, on: true, pending: true });
    // Recipients / destinations. Insurer email + webhook come from the
    // configured insurer; internal stakeholders from the prototype directory.
    // The contact email is not on record anywhere, so it starts blank — never
    // synthesize an address for a real user.
    var contactName = meUser().name.replace(/\s*\(me\)\s*$/, '');
    var recip = {
      insurerEmail: { on: true, addr: ins.destination || '' },
      webhook: { on: true, url: ins.webhook || '' },
      internal: fnolInternalDirectory().map(function (r) { return { label: r.label, addr: r.addr, on: false }; }),
      insured: { company: insuredCompany, contact: contactName, email: '' },
      optional: [
        { label: 'Broker', addr: '', on: false, fixed: true },
        { label: 'Third-party administrator', addr: '', on: false, fixed: true }
      ]
    };
    return { insurer: ins, draft: draft, confirm: confirm, evd: evd, recip: recip };
  }
  function openFnolModal(id) {
    var c = findCase(id); if (!c) return;
    if (callTimer) { clearInterval(callTimer); callTimer = null; }
    var ctx = fnolContext(c);
    state.modal = { type: 'fnol', caseId: id, step: 1, draft: ctx.draft, confirm: ctx.confirm, evd: ctx.evd, docs: [], recip: ctx.recip, insurer: ctx.insurer };
    renderModal();
  }

  // Insured & policy lives in the data model and the review package, but is no
  // longer an editable form section — it comes from the configured policy.
  var FNOL_FIELDS = [
    { sec: 'Vehicle & driver', rows: [['vehicle', 'Vehicle'], ['driver', 'Driver']] },
    { sec: 'Accident', rows: [['when', 'Date & time'], ['location', 'Location']] },
    { sec: 'Incident description', rows: [['description', 'Initial description', 'wide', 'ta']] },
    { sec: 'Status & parties', rows: [['injuries', 'Injury status'], ['thirdParty', 'Third-party involvement'], ['police', 'Police information'], ['towing', 'Towing information'], ['condition', 'Vehicle condition']] },
    { sec: 'Driver statement', rows: [['statement', 'Statement', 'wide', 'ta', 'from welfare call']] }
  ];
  var FNOL_ALL_FIELDS = [{ sec: 'Insured & policy', rows: [['insured', 'Insured company'], ['policy', 'Policy number'], ['insurerName', 'Insurer']] }].concat(FNOL_FIELDS);

  // Everyone the package would actually go to, given the current selection.
  function fnolRecipientList(m) {
    var out = [], R = m.recip;
    if (R.insurerEmail.on && R.insurerEmail.addr) out.push({ label: 'Insurer claims email', addr: R.insurerEmail.addr, type: 'email' });
    if (R.webhook.on && R.webhook.url) out.push({ label: 'Insurer webhook', addr: R.webhook.url, type: 'webhook' });
    R.internal.forEach(function (r) { if (r.on && r.addr) out.push({ label: r.label, addr: r.addr, type: 'email' }); });
    R.optional.forEach(function (r) { if (r.on && r.addr) out.push({ label: r.label || 'Recipient', addr: r.addr, type: 'email' }); });
    return out;
  }
  function fnolAttachmentList(m) {
    // excludes pending items (e.g. the FNOL summary report, which only exists
    // after formal submission) — a report share must not claim to include them
    return m.evd.filter(function (e) { return e.on && !e.pending; }).map(function (e) { return e.label; })
      .concat(m.docs.map(function (d) { return d.cat + ' — ' + d.name; }));
  }

  function fnolModalHtml(m) {
    var c = findCase(m.caseId), ins = m.insurer;
    var head = function (title, actions) {
      return '<div class="dt-modal-head"><span class="dt-modal-title"><span style="color:var(--primary-600);display:flex">' + ic('file-text', 18) + '</span>' + title + '</span>' +
        '<span style="display:flex;gap:8px;align-items:center">' + (actions || '') +
        '<button class="dt-iconbtn" data-act="modal-close">' + ic('x', 16) + '</button></span></div>';
    };
    var R = m.recip;
    if (m.step === 1) {
      var secs = FNOL_FIELDS.map(function (s) {
        var rows = s.rows.map(function (r) {
          var key = r[0], label = r[1], wide = r[2] === 'wide', ta = r[3] === 'ta', src = r[4];
          var val = m.draft[key] || '';
          var needsConfirm = !val || !!m.confirm[key];
          var warn = needsConfirm ? ' warn' : '';
          var srcTag = needsConfirm
            ? '<span class="dt-src" style="color:var(--warning-700)">confirm</span>'
            : (src && val ? '<span class="dt-src">' + esc(src) + '</span>' : '');
          var input = ta
            ? '<textarea data-field="fnol:' + key + '">' + esc(val) + '</textarea>'
            : '<input data-field="fnol:' + key + '" value="' + esc(val) + '">';
          return '<div class="dt-field' + (wide ? ' wide' : '') + warn + '"><label>' + esc(label) + srcTag + '</label>' + input + '</div>';
        }).join('');
        return '<div class="dt-form-sec"><span class="dt-micro">' + esc(s.sec) + '</span><div class="dt-form-grid">' + rows + '</div></div>';
      }).join('');
      // A. Automatically available evidence, grouped by type
      var evdHtml = '', lastGroup = null;
      m.evd.forEach(function (e, i) {
        if (e.group !== lastGroup) { evdHtml += '<div class="dt-evd-group">' + esc(e.group) + '</div>'; lastGroup = e.group; }
        evdHtml += '<label class="dt-evd-row"><input type="checkbox" ' + (e.on ? 'checked' : '') + ' data-act="fnol-evd:' + i + '">' +
          esc(e.label) + (e.secure ? ' <span class="dt-src">' + ic('lock', 10) + ' secure link</span>' : '') + '</label>';
      });
      // B. Third-party / supporting documents — front-end uploads per category
      var docRows = FNOL_DOC_CATS.map(function (cat, i) {
        var chips = '';
        m.docs.forEach(function (d, di) {
          if (d.cat !== cat) return;
          chips += '<span class="dt-doc-file">' + ic('file-text', 11) + esc(d.name) +
            '<button type="button" class="dt-doc-rm" data-act="fnol-doc-rm:' + di + '" title="Remove">' + ic('x', 10) + '</button></span>';
        });
        return '<div class="dt-doc-row"><span class="dt-doc-cat">' + esc(cat) + '</span>' +
          '<label class="dt-doc-upload">' + ic('upload', 12) + (chips ? 'Add file' : 'Upload') + '<input type="file" multiple data-doccat="' + i + '" style="display:none"></label>' +
          (chips ? '<div class="dt-doc-files">' + chips + '</div>' : '') +
        '</div>';
      }).join('');
      // Recipients & destinations
      var recipRow = function (checked, act, label, inputHtml, extra) {
        return '<div class="dt-recip-row"><input type="checkbox" ' + (checked ? 'checked' : '') + ' data-act="' + act + '">' +
          '<span class="dt-recip-label">' + esc(label) + '</span>' + inputHtml + (extra || '') + '</div>';
      };
      var recipHtml =
        '<div class="dt-recip-group">Primary insurance destination · ' + esc(ins.name) + '</div>' +
        recipRow(R.insurerEmail.on, 'fnol-recip:ins', 'Claims email',
          '<input class="dt-recip-input" data-field="fnolr:ins:addr" value="' + esc(R.insurerEmail.addr) + '">') +
        recipRow(R.webhook.on, 'fnol-recip:hook', 'Claims webhook',
          '<input class="dt-recip-input" data-field="fnolr:hook:url" value="' + esc(R.webhook.url) + '">',
          '<span class="dt-src">integration</span>') +
        '<div class="dt-recip-group">Internal stakeholders</div>' +
        R.internal.map(function (r, i) {
          return recipRow(r.on, 'fnol-recip:internal:' + i, r.label,
            '<input class="dt-recip-input" data-field="fnolr:internal:' + i + ':addr" value="' + esc(r.addr) + '">');
        }).join('') +
        '<div class="dt-recip-group">Insured company</div>' +
        '<div class="dt-form-grid" style="margin-top:2px">' +
          '<div class="dt-field' + (R.insured.company ? '' : ' warn') + '"><label>Company name' + (R.insured.company ? '' : '<span class="dt-src" style="color:var(--warning-700)">confirm</span>') + '</label><input data-field="fnolr:insured:company" placeholder="Not provided — requires confirmation" value="' + esc(R.insured.company) + '"></div>' +
          '<div class="dt-field"><label>Internal contact</label><input data-field="fnolr:insured:contact" value="' + esc(R.insured.contact) + '"></div>' +
          '<div class="dt-field"><label>Contact email</label><input data-field="fnolr:insured:email" placeholder="email@company.example" value="' + esc(R.insured.email) + '"></div>' +
        '</div>' +
        '<div class="dt-recip-group">Optional recipients</div>' +
        R.optional.map(function (r, i) {
          var labelHtml = r.fixed
            ? '<span class="dt-recip-label">' + esc(r.label) + '</span>'
            : '<input class="dt-recip-input" style="flex:0 1 160px" placeholder="Recipient name" data-field="fnolr:optional:' + i + ':label" value="' + esc(r.label) + '">';
          return '<div class="dt-recip-row"><input type="checkbox" ' + (r.on ? 'checked' : '') + ' data-act="fnol-recip:optional:' + i + '">' +
            labelHtml +
            '<input class="dt-recip-input" placeholder="email@company.example" data-field="fnolr:optional:' + i + ':addr" value="' + esc(r.addr) + '">' +
            (r.fixed ? '' : '<button type="button" class="dt-doc-rm" data-act="fnol-recip-rm:' + i + '" title="Remove recipient">' + ic('x', 11) + '</button>') +
          '</div>';
        }).join('') +
        '<button class="dt-btn dt-btn-sm dt-btn-secondary" style="margin-top:8px" data-act="fnol-recip-add">' + ic('plus', 13) + 'Add recipient</button>' +
        '<div class="dt-graph-caption" style="margin-top:10px">Checked recipients receive the package. Webhook delivery is separate from email.</div>';
      return head('First Notice of Loss — ' + esc(c.code)) +
        '<div class="dt-modal-body">' + secs +
          '<div class="dt-form-sec"><span class="dt-micro">Attachments — case evidence</span>' +
            '<div class="dt-graph-caption" style="margin:0 0 6px">Included automatically from the case — untick anything that should not be sent.</div>' + evdHtml + '</div>' +
          '<div class="dt-form-sec"><span class="dt-micro">Attachments — supporting documents</span>' +
            '<div class="dt-graph-caption" style="margin:0 0 6px">Upload third-party and supporting documents by category. Files stay in this prototype session.</div>' + docRows + '</div>' +
          '<div class="dt-form-sec"><span class="dt-micro">Recipients & destinations</span>' + recipHtml + '</div>' +
        '</div>' +
        '<div class="dt-modal-foot">' +
          '<span style="font-size:12px;color:var(--gray-500)">Prefilled from the case — amber fields need confirming.</span>' +
          '<button class="dt-btn dt-btn-sm dt-btn-primary" data-act="fnol-review">Review package ' + ic('arrow-right', 14) + '</button>' +
        '</div>';
    }
    if (m.step === 2) {
      var missing = '<span class="dt-missing">Missing / not provided</span>';
      var allRows = [];
      FNOL_ALL_FIELDS.forEach(function (s) {
        s.rows.forEach(function (r) {
          var v = m.draft[r[0]];
          allRows.push('<div class="dt-frow"><span class="k">' + esc(r[1]) + '</span><span class="v">' + (v ? esc(v) : missing) + '</span></div>');
        });
      });
      allRows.push('<div class="dt-frow"><span class="k">Internal contact</span><span class="v">' +
        (R.insured.contact ? esc(R.insured.contact) + (R.insured.email ? ' · ' + esc(R.insured.email) : '') : missing) + '</span></div>');
      // Attachments grouped by type, plus uploaded documents
      var attRows = [], groupOrder = [];
      m.evd.forEach(function (e) { if (e.on && groupOrder.indexOf(e.group) < 0) groupOrder.push(e.group); });
      groupOrder.forEach(function (g) {
        var items = m.evd.filter(function (e) { return e.on && e.group === g; });
        attRows.push('<div class="dt-frow"><span class="k">' + esc(g) + ' (' + items.length + ')</span><span class="v">' +
          items.map(function (e) { return esc(e.label); }).join('<br>') + '</span></div>');
      });
      if (m.docs.length) {
        attRows.push('<div class="dt-frow"><span class="k">Uploaded documents (' + m.docs.length + ')</span><span class="v">' +
          m.docs.map(function (d) { return esc(d.cat) + ' — ' + esc(d.name); }).join('<br>') + '</span></div>');
      }
      if (!attRows.length) attRows.push('<div class="dt-frow"><span class="k">Attachments</span><span class="v">' + missing + '</span></div>');
      // Destination summary
      var destRows = [];
      if (R.insurerEmail.on && R.insurerEmail.addr) destRows.push('<div class="dt-frow"><span class="k">Insurer email</span><span class="v">' + esc(R.insurerEmail.addr) + '</span></div>');
      if (R.webhook.on && R.webhook.url) destRows.push('<div class="dt-frow"><span class="k">Webhook</span><span class="v">' + esc(R.webhook.url) + '</span></div>');
      var internalOn = R.internal.filter(function (r) { return r.on && r.addr; });
      if (internalOn.length) destRows.push('<div class="dt-frow"><span class="k">Internal recipients</span><span class="v">' +
        internalOn.map(function (r) { return esc(r.label) + ' · ' + esc(r.addr); }).join('<br>') + '</span></div>');
      var optionalOn = R.optional.filter(function (r) { return r.on && r.addr; });
      if (optionalOn.length) destRows.push('<div class="dt-frow"><span class="k">Optional recipients</span><span class="v">' +
        optionalOn.map(function (r) { return esc(r.label || 'Recipient') + ' · ' + esc(r.addr); }).join('<br>') + '</span></div>');
      if (!destRows.length) destRows.push('<div class="dt-frow"><span class="k">Destination</span><span class="v"><span class="dt-missing">No destination selected</span></span></div>');
      var sendBtn = '<button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="fnol-send">' + ic('send', 13) + 'Send report</button>';
      return head('Review FNOL package', sendBtn) +
        '<div class="dt-modal-body">' +
          '<div class="dt-fnolrec" style="border-color:var(--gray-200)"><div class="dt-fnolrec-body">' +
            '<div class="dt-evd-group" style="margin-top:0">Case information</div>' + allRows.join('') +
            '<div class="dt-evd-group">Attachments</div>' + attRows.join('') +
            '<div class="dt-evd-group">Destinations</div>' + destRows.join('') +
          '</div></div>' +
          '<div class="dt-graph-caption">' + ic('lock', 13) + 'Large or sensitive items (video, recordings) are shared as controlled links, not attachments.</div>' +
          '<div class="dt-graph-caption" style="margin-top:4px">' + ic('send', 13) + '<strong>Send report</strong>&nbsp;shares this package with the selected recipients without submitting the formal FNOL.</div>' +
        '</div>' +
        '<div class="dt-modal-foot">' +
          '<button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="fnol-back">' + ic('chevron-left', 14) + 'Back</button>' +
          '<button class="dt-btn dt-btn-sm dt-btn-primary" data-act="fnol-submit">' + ic('send', 15) + 'Submit FNOL</button>' +
        '</div>';
    }
    // step 3 — submitted
    var f = c.fnol;
    return head('FNOL submitted') +
      '<div class="dt-modal-body"><div class="dt-attachlist">' +
        '<div class="dt-attachrow">' + ic('check-circle', 16) + 'Package ' + esc(f.attachment) + ' · ' + f.fieldCount + ' fields · generated and preserved on the case</div>' +
        '<div class="dt-attachrow">' + ic('check-circle', 16) + esc(f.delivery) + '</div>' +
        '<div class="dt-attachrow">' + ic('check-circle', 16) + f.evidence.length + ' evidence items shared via secure links' +
          (f.documents && f.documents.length ? ' · ' + f.documents.length + ' supporting document' + (f.documents.length === 1 ? '' : 's') : '') + '</div>' +
        (c.accident
          ? '<div class="dt-attachrow">' + ic('check-circle', 16) + 'Accident status: <strong>&nbsp;Awaiting insurer response</strong></div>'
          : '<div class="dt-attachrow">' + ic('check-circle', 16) + 'Submission preserved on the case — see the Insurance section</div>') +
      '</div></div>' +
      '<div class="dt-modal-foot"><span></span><button class="dt-btn dt-btn-sm dt-btn-primary" data-act="modal-close">Done</button></div>';
  }

  // "Send report" — shares the current package with the selected recipients
  // WITHOUT submitting the formal FNOL. Recorded in the case audit history.
  function sendFnolReport() {
    var m = state.modal; if (!m || m.type !== 'fnol') return;
    var c = findCase(m.caseId);
    var to = fnolRecipientList(m);
    if (!to.length) { toast('Select at least one recipient before sending the report.'); return; }
    var atts = fnolAttachmentList(m);
    c.reportShares = c.reportShares || [];
    c.reportShares.unshift({ at: 'Just now', by: meUser().name, to: to, attachments: atts });
    recordAction(c, 'report_shared', {
      newValue: to.map(function (r) { return r.label; }).join(', '),
      metadata: {
        type: 'Report share — not a formal FNOL submission',
        recipients: to.map(function (r) { return r.label + ' · ' + r.addr; }),
        attachments: atts.length + ' items',
        documents: m.docs.length ? m.docs.map(function (d) { return d.name; }) : 'none'
      },
      summary: 'shared the FNOL report package with ' + to.length + ' recipient' + (to.length === 1 ? '' : 's') + ' — ' + to.map(function (r) { return r.label; }).join(', ')
    });
    rerender();
    toast('Report shared with ' + to.length + ' recipient' + (to.length === 1 ? '' : 's') + ' — recorded in the case audit history.');
  }

  function submitFnol() {
    var m = state.modal; if (!m) return;
    var c = findCase(m.caseId), ins = m.insurer, R = m.recip;
    var evdOn = m.evd.filter(function (e) { return e.on; }).map(function (e) { return e.label; });
    var to = fnolRecipientList(m);
    var fieldCount = 0;
    FNOL_ALL_FIELDS.forEach(function (s) { s.rows.forEach(function (r) { if (m.draft[r[0]]) fieldCount++; }); });
    var emailTo = (R.insurerEmail.on && R.insurerEmail.addr) ? R.insurerEmail.addr : null;
    var deliveryBits = [];
    if (emailTo) deliveryBits.push('Email delivered to ' + emailTo);
    if (R.webhook.on && R.webhook.url) deliveryBits.push('webhook 200 OK');
    var ccCount = to.filter(function (r) { return r.type === 'email' && r.addr !== emailTo; }).length;
    if (ccCount) deliveryBits.push(ccCount + ' additional recipient' + (ccCount === 1 ? '' : 's'));
    c.fnol = {
      by: meUser().name, at: 'Just now',
      to: emailTo || '—',
      webhook: (R.webhook.on && R.webhook.url) ? R.webhook.url : null,
      recipients: to,
      insured: { company: R.insured.company, contact: R.insured.contact, email: R.insured.email },
      delivery: deliveryBits.join(' · ') || 'Recorded on the case (no destination selected)',
      attachment: 'FNOL-' + c.code + '.pdf',
      fieldCount: fieldCount,
      fields: JSON.parse(JSON.stringify(m.draft)),
      evidence: evdOn,
      documents: m.docs.slice(),
      response: 'Awaiting insurer response — claim number pending'
    };
    if (c.accident) c.accident.status = 'Awaiting insurer response';
    recordAction(c, 'fnol_submitted', {
      newValue: ins.name,
      metadata: {
        type: 'Formal FNOL submission',
        recipients: to.length ? to.map(function (r) { return r.label + ' · ' + r.addr; }) : 'none selected',
        evidence: evdOn.length + ' items',
        documents: m.docs.length ? m.docs.map(function (d) { return d.name; }) : 'none',
        package: 'FNOL-' + c.code + '.pdf'
      },
      summary: 'submitted the FNOL to ' + ins.name + ' — ' + (deliveryBits.join(' · ') || 'no destination')
    });
    c.extra.unshift(
      { text: 'FNOL package generated — ' + fieldCount + ' fields, ' + evdOn.length + ' evidence links' + (m.docs.length ? ', ' + m.docs.length + ' supporting document' + (m.docs.length === 1 ? '' : 's') : ''), meta: 'Just now · System', kind: 'ai' }
    );
    m.step = 3;
    renderModal(); rerender();
    toast('FNOL submitted — the full package is preserved on the case.');
  }

  function downloadFnol(id) {
    var c = findCase(id), f = c.fnol; if (!f) return;
    var lines = ['FIRST NOTICE OF LOSS — ' + c.code, 'Submitted ' + f.at + ' by ' + f.by, ''];
    FNOL_ALL_FIELDS.forEach(function (s) {
      lines.push(s.sec.toUpperCase());
      s.rows.forEach(function (r) { lines.push('  ' + r[1] + ': ' + (f.fields[r[0]] || '—')); });
      lines.push('');
    });
    if (f.insured) {
      lines.push('INSURED COMPANY CONTACT');
      lines.push('  Company: ' + (f.insured.company || '—'));
      lines.push('  Contact: ' + (f.insured.contact || '—') + (f.insured.email ? ' <' + f.insured.email + '>' : ''));
      lines.push('');
    }
    lines.push('EVIDENCE (shared via secure links)');
    f.evidence.forEach(function (e) { lines.push('  - ' + e); });
    if (f.documents && f.documents.length) {
      lines.push('', 'SUPPORTING DOCUMENTS');
      f.documents.forEach(function (d) { lines.push('  - ' + d.cat + ': ' + d.name); });
    }
    if (f.recipients && f.recipients.length) {
      lines.push('', 'RECIPIENTS');
      f.recipients.forEach(function (r) { lines.push('  - ' + r.label + ': ' + r.addr); });
    }
    lines.push('', 'Delivery: ' + f.delivery);
    try {
      var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      var el = document.createElement('a');
      el.href = URL.createObjectURL(blob); el.download = f.attachment.replace('.pdf', '.txt');
      document.body.appendChild(el); el.click(); el.remove();
      toast('FNOL package downloaded.');
    } catch (e) { toast('FNOL package ready.'); }
  }

  /* ── New Case modal (created cases get the full toolset, incl. FNOL) ──── */
  function openNewCaseModal() {
    state.modal = {
      type: 'newcase', step: 1,
      draft: { title: '', category: D.categoryOrder[0], urgency: 'Medium', entity: '', assignee: meUser().name, note: '' }
    };
    renderModal();
  }
  function newCaseModalHtml(m) {
    var d = m.draft;
    var head = '<div class="dt-modal-head"><span class="dt-modal-title"><span style="color:var(--primary-600);display:flex">' + ic('plus', 18) + '</span>New case</span>' +
      '<button class="dt-iconbtn" data-act="modal-close">' + ic('x', 16) + '</button></div>';
    var catBtns = D.categoryOrder.map(function (cat) {
      return '<button class="' + (d.category === cat ? 'on' : '') + '" data-act="nc-set:category:' + encodeURIComponent(cat) + '">' + esc(cat) + '</button>';
    }).join('');
    var urgBtns = ['High', 'Medium', 'Low'].map(function (u) {
      return '<button class="' + (d.urgency === u ? 'on' : '') + '" data-act="nc-set:urgency:' + u + '">' + u + '</button>';
    }).join('');
    var users = state.users.map(function (u) {
      return '<option' + (d.assignee === u.name ? ' selected' : '') + '>' + esc(u.name) + '</option>';
    }).join('');
    return head + '<div class="dt-modal-body"><div class="dt-form-sec"><div class="dt-form-grid">' +
      '<div class="dt-field wide' + (m.warnTitle && !d.title.trim() ? ' warn' : '') + '"><label>Title</label><input data-field="nc:title" value="' + esc(d.title) + '" placeholder="e.g. Cracked windshield - Truck #T-310"></div>' +
      '<div class="dt-field"><label>Category</label><span class="dt-ansbtns">' + catBtns + '</span></div>' +
      '<div class="dt-field"><label>Urgency</label><span class="dt-ansbtns">' + urgBtns + '</span></div>' +
      '<div class="dt-field"><label>Link to (driver, vehicle, route…)</label><input data-field="nc:entity" value="' + esc(d.entity) + '" placeholder="Truck #T-310"></div>' +
      '<div class="dt-field"><label>Assignee</label><select data-field="nc:assignee">' + users + '</select></div>' +
      '<div class="dt-field wide"><label>Note</label><textarea data-field="nc:note" placeholder="What’s going on?">' + esc(d.note) + '</textarea></div>' +
      '</div></div></div>' +
      '<div class="dt-modal-foot"><button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="modal-close">Cancel</button>' +
      '<button class="dt-btn dt-btn-sm dt-btn-primary" data-act="nc-create">' + ic('plus', 15) + 'Create case</button></div>';
  }
  function createCase() {
    var m = state.modal; if (!m || m.type !== 'newcase') return;
    var d = m.draft;
    if (!d.title.trim()) { m.warnTitle = true; renderModal(); toast('Give the case a title.'); return; }
    var subjName = d.entity.trim() || 'Unassigned';
    var dueMap = { High: 'Due today', Medium: 'Due tomorrow', Low: 'Due this week' };
    var slaMap = { High: '4 h left', Medium: '1 d left', Low: '5 d left' };
    var note = d.note.trim();
    var c = {
      id: 'u' + (++newCaseSeq), code: 'CS-' + (2412 + newCaseSeq), title: d.title.trim(),
      category: d.category, severity: d.urgency, time: 'Just now', sort: 0,
      assignee: d.assignee === meUser().name ? 'me' : d.assignee,
      due: dueMap[d.urgency], status: 'Open', sla: slaMap[d.urgency],
      primaryAction: 'Review case',
      subject: { initials: (initialsOf(subjName) || 'NA').toUpperCase(), name: subjName },
      metricStrong: 'New case', metricRest: '· created manually' + (note ? ' — ' + note : ''),
      whatHappened: { entity: subjName, text: ' — ' + (note || 'created manually from the New Case form. Add notes and evidence as the case develops.') },
      evidence: [], context: [], prompts: [],
      recommended: {
        text: 'Review the case details and decide the next step. First Notice of Loss is available below if this needs to go to the insurer.',
        primary: 'Review case', others: [{ title: 'Flag for review' }]
      },
      activity: [{ text: 'Case created manually', meta: 'Just now · ' + meUser().name, kind: 'note' }],
      pinned: false, saved: false, feedback: null, deferred: false, dismissed: false, resolved: false,
      notes: [], extra: [], fnol: null, audit: [], reportShares: []
    };
    state.cases.unshift(c);
    closeModal();
    state.openId = c.id;
    refreshQueueOnly(); renderPanel();
    toast('Case ' + c.code + ' created.');
  }

  /* ── Evidence Drawer (full-screen synced dashcam viewer) ─────────────── */
  function evMeta(c) {
    // Fallback keeps the drawer safe for any future case without authored meta.
    // Fallback for cases without authored evidence meta: no fabricated
    // telemetry or camera streams — sections without data are omitted.
    return c.evidenceMeta || {
      cameras: [],
      overlay: ['—', ''],
      ai: ['Clip preserved on the case for review.'],
      driverState: [], tripData: [], safetyHistory: [],
      telemetry: null
    };
  }
  /* Type-aware detection (Step 4). Schema-tolerant: honours explicit
     caseRecord.investigationType, otherwise infers from the analysis
     objects the case carries. Evidence kinds default to 'video'. */
  function evInvestigationMode(c) {
    if (c.investigationType) return c.investigationType;
    if (c.fatigueAnalysis) return 'fatigue';
    if (c.collisionAnalysis && c.category === 'Collisions') return 'collision';
    return 'generic';
  }
  function evKind(clip) {
    if (clip.kind) return clip.kind;
    if (clip.cameraType === 'driver') return 'driverVideo';
    if (clip.cameraType === 'road') return 'roadVideo';
    return 'video';
  }
  function evIsVideoKind(kind) { return kind === 'video' || kind === 'driverVideo' || kind === 'roadVideo'; }
  // A clip with a real media source plays in a native <video>; without one the
  // pre-existing simulated player keeps working unchanged.
  function evHasRealVideo(clip) { return !!(clip && clip.src && evIsVideoKind(evKind(clip))); }
  function evIsImage(clip) { return !!(clip && evKind(clip) === 'image' && clip.src); }
  function evDurationSec(clip) {
    if (clip && typeof clip.durationSeconds === 'number' && clip.durationSeconds > 0) return clip.durationSeconds;
    var m = /^(\d+):(\d+)$/.exec(clip && clip.duration || '');
    return m ? (+m[1]) * 60 + (+m[2]) : 20;
  }
  function evDurationLabel(clip) {
    if (clip && clip.duration) return clip.duration;
    if (clip && typeof clip.durationSeconds === 'number' && clip.durationSeconds > 0) return fmtClock(clip.durationSeconds);
    return '';
  }
  // Frame evidence: extracted stills pinned to clip timestamps (sub-second
  // precision). Either the clip or the case may carry the list; clip wins.
  function evFrames(c, clip) {
    return (clip && clip.frameEvidence) || (c && c.frameEvidence) || [];
  }
  function evSelectedFrame(frames, sec) {
    // -1 = no frame reached yet (playhead before the first frame): none selected
    var sel = -1;
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].timeSeconds != null && frames[i].timeSeconds <= sec + 0.05) sel = i;
    }
    return sel;
  }
  function evDefaultT(c, clip) {
    var t = evMeta(c).telemetry;
    if (t && t.speed && t.speed.length > 1 && t.eventIndex != null) return t.eventIndex / (t.speed.length - 1);
    // No telemetry anchor: real media has no event position to open at,
    // so it starts at the beginning. Simulated players keep the 0.3 default.
    return (evHasRealVideo(clip) || evIsImage(clip)) ? 0 : 0.3;
  }
  function fmtClock(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }

  function openEvidence(id, i) {
    var c = findCase(id);
    if (!c || !c.evidence || !c.evidence[i]) return;
    stopEvTimer();
    state.evidence = { caseId: id, index: i, view: 'speed', playing: false, t: evDefaultT(c, c.evidence[i]) };
    renderEvidence();
  }
  function closeEvidence() {
    // The case panel underneath is never re-rendered by the drawer, so the
    // user returns to the same case at the exact scroll position.
    stopEvTimer();
    state.evidence = null;
    renderEvidence();
  }

  /* One shared timestamp (ev.t, 0..1) drives the video progress, the map
     cursor and the telemetry playhead. For simulated clips a timer advances
     it; for real <video> elements the element's own media events drive it.
     DOM is patched in place — no re-render per tick. */
  function stopEvTimer() { if (evTimer) { clearInterval(evTimer); evTimer = null; } }
  function startEvTimer() {
    if (evMediaEls.length) return; // a real <video> owns playback — never the simulated timer
    stopEvTimer();
    evTimer = setInterval(function () {
      var ev = state.evidence;
      if (!ev || !ev.playing) { stopEvTimer(); return; }
      var c = findCase(ev.caseId); if (!c) { stopEvTimer(); return; }
      ev.t = Math.min(1, ev.t + 0.3 / evDurationSec(c.evidence[ev.index]));
      if (ev.t >= 1) { ev.playing = false; stopEvTimer(); renderEvidence(); return; }
      syncEvidencePlayhead();
    }, 300);
  }
  /* Real <video> lifecycle. The drawer is rebuilt as a whole on each render,
     so listeners are detached (and playback paused) before every rebuild and
     on close — reopening can never stack duplicate handlers. The first video
     in the drawer is the primary element that drives the shared playhead. */
  var evMediaEls = []; // [{ el, handlers: [[event, fn], …] }]
  function detachEvidenceMedia() {
    if (evMediaEls.length && state && state.evidence) state.evidence.playing = false; // videos are paused below
    evMediaEls.forEach(function (m) {
      m.handlers.forEach(function (h) { m.el.removeEventListener(h[0], h[1]); });
      try { if (!m.el.paused) m.el.pause(); } catch (x) {}
    });
    evMediaEls = [];
  }
  function evPrimaryVideo() { return evMediaEls.length ? evMediaEls[0].el : null; }
  function attachEvidenceMedia() {
    var wrap = qs('#dt-evwrap'); if (!wrap) return;
    var vids = wrap.querySelectorAll('video.dt-ed-video');
    Array.prototype.forEach.call(vids, function (el, i) {
      var primary = i === 0;
      var rec = { el: el, handlers: [] };
      function on(name, fn) { el.addEventListener(name, fn); rec.handlers.push([name, fn]); }
      function syncFromEl() {
        if (!primary || !state.evidence || !isFinite(el.duration) || el.duration <= 0) return;
        state.evidence.t = Math.min(1, el.currentTime / el.duration);
        syncEvidencePlayhead();
      }
      on('loadedmetadata', function () {
        if (!primary || !state.evidence || !isFinite(el.duration) || el.duration <= 0) return;
        var ev2 = state.evidence;
        // a seek requested before metadata loaded wins (exact seconds beat the
        // fraction, whose authored-duration basis may differ from the real one)
        if (ev2.pendingSeekSec != null) {
          el.currentTime = Math.min(ev2.pendingSeekSec, el.duration);
          ev2.pendingSeekSec = null;
          ev2.t = Math.min(1, el.currentTime / el.duration);
        } else {
          // restore the shared playhead position on (re)load — never autoplays
          var target = ev2.t * el.duration;
          if (Math.abs(el.currentTime - target) > 0.05) el.currentTime = target;
        }
        syncEvidencePlayhead();
      });
      on('timeupdate', syncFromEl);
      on('seeked', syncFromEl);
      on('play', function () { if (primary && state.evidence) state.evidence.playing = true; });
      on('pause', function () { if (primary && state.evidence) state.evidence.playing = false; });
      on('ended', function () {
        if (!primary || !state.evidence) return;
        state.evidence.playing = false;
        state.evidence.t = 1;
        syncEvidencePlayhead();
      });
      evMediaEls.push(rec);
    });
  }
  // Current clip duration: the browser-reported duration once a real video's
  // metadata is loaded, else the authored duration.
  function evCurrentDur(c, ev) {
    var v = evPrimaryVideo();
    if (v && isFinite(v.duration) && v.duration > 0) return v.duration;
    return evDurationSec(c.evidence[ev.index]);
  }
  // Shared seek: keeps the real video (when present), the drawer playhead and
  // the frame-strip selection on the exact same (sub-second) timestamp.
  function seekEvidenceTo(seconds) {
    var ev = state.evidence; if (!ev) return;
    var c = findCase(ev.caseId); if (!c) return;
    var dur = evCurrentDur(c, ev);
    ev.t = dur > 0 ? Math.min(1, Math.max(0, seconds / dur)) : 0;
    var v = evPrimaryVideo();
    if (v) {
      if (v.readyState >= 1 && isFinite(v.duration) && v.duration > 0) {
        v.currentTime = Math.min(seconds, v.duration);
      } else {
        // metadata not loaded yet — remember the exact seconds so the
        // loadedmetadata handler can land on the precise timestamp
        ev.pendingSeekSec = seconds;
      }
    }
    syncEvidencePlayhead();
  }
  function routePoint(pts, t) {
    var lens = [], total = 0, i, dx, dy;
    for (i = 1; i < pts.length; i++) {
      dx = pts[i][0] - pts[i - 1][0]; dy = pts[i][1] - pts[i - 1][1];
      lens.push(Math.sqrt(dx * dx + dy * dy)); total += lens[i - 1];
    }
    if (!total) return pts[0];
    var target = t * total;
    for (i = 0; i < lens.length; i++) {
      if (target <= lens[i] || i === lens.length - 1) {
        var f = lens[i] ? Math.min(1, target / lens[i]) : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
      }
      target -= lens[i];
    }
    return pts[pts.length - 1];
  }
  function syncEvidencePlayhead() {
    var ev = state.evidence; if (!ev) return;
    var wrap = qs('#dt-evwrap'); if (!wrap) return;
    var c = findCase(ev.caseId); if (!c) return;
    var pctStr = (ev.t * 100).toFixed(1) + '%';
    Array.prototype.forEach.call(wrap.querySelectorAll('.dt-ed-progress span, .dt-ed-cam-bar span'), function (el) { el.style.width = pctStr; });
    var ph = wrap.querySelector('.dt-ed-playhead'); if (ph) ph.style.left = pctStr;
    var durNow = evCurrentDur(c, ev);
    var now = fmtClock(ev.t * durNow);
    Array.prototype.forEach.call(wrap.querySelectorAll('.dt-ed-timenow'), function (el) { el.textContent = now; });
    var cursor = wrap.querySelector('#dt-ed-mapcursor');
    if (cursor && ev._route) {
      var p = routePoint(ev._route, ev.t);
      cursor.setAttribute('cx', p[0].toFixed(1)); cursor.setAttribute('cy', p[1].toFixed(1));
    }
    // frame-strip selection follows the playhead
    var frames = evFrames(c, c.evidence[ev.index]);
    if (frames.length) {
      var sel = evSelectedFrame(frames, ev.t * durNow);
      Array.prototype.forEach.call(wrap.querySelectorAll('.dt-ed-frame'), function (el) {
        if (+el.getAttribute('data-frame') === sel) el.classList.add('is-selected');
        else el.classList.remove('is-selected');
      });
    }
  }
  function renderEvidence() {
    detachEvidenceMedia(); // the drawer DOM is rebuilt below — never leak media listeners
    var ex = qs('#dt-evwrap');
    var prevScroll = 0, prevKey = renderEvidence._key;
    if (ex) { var b = ex.querySelector('.dt-ed-body'); prevScroll = b ? b.scrollTop : 0; ex.remove(); }
    if (!state.evidence) { renderEvidence._key = null; return; }
    var ev = state.evidence;
    var key = ev.caseId + ':' + ev.index;
    var wrap = document.createElement('div'); wrap.id = 'dt-evwrap';
    wrap.innerHTML = evidenceDrawerHtml(ev);
    root.appendChild(wrap);
    renderEvidence._key = key;
    if (prevKey === key && prevScroll) { var nb = wrap.querySelector('.dt-ed-body'); if (nb) nb.scrollTop = prevScroll; }
    attachEvidenceMedia();
  }
  function edKvRows(rows) {
    return rows.map(function (r) {
      return '<div class="dt-ed-kv"><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></div>';
    }).join('');
  }
  /* ── Step 4: type-aware drawer rendering ──────────────────────────────
     renderEvidenceDrawer(caseRecord, evidenceItem, ev) picks the layout from
     the case's investigation mode. No case IDs are hardcoded and no case
     data is mutated during render. */
  function edHeader(c, clip, ev, label, badge) {
    var n = c.evidence.length;
    return '<div class="dt-ed-head"><div>' +
      '<div class="dt-ed-toprow"><span class="dt-micro">Evidence drawer · ' + esc(label) + '</span>' +
      (badge ? '<span class="dt-ed-sync"><span class="dt-dot"></span>' + esc(badge) + '</span>' : '') + '</div>' +
      '<div class="dt-ed-title"><span class="dt-ed-place">' + esc(clip.place || clip.label || '') + '</span>' +
      '<span class="dt-ed-time">' + esc(clip.time) + '</span></div></div>' +
      '<div class="dt-ed-tools">' +
        '<button class="dt-iconbtn" data-act="ev-prev" ' + (ev.index <= 0 ? 'disabled' : '') + '>' + ic('chevron-left', 14) + '</button>' +
        '<span class="dt-ed-count">Evidence ' + (ev.index + 1) + ' / ' + n + '</span>' +
        '<button class="dt-iconbtn" data-act="ev-next" ' + (ev.index >= n - 1 ? 'disabled' : '') + '>' + ic('chevron-right', 14) + '</button>' +
        '<span class="dt-divider-v"></span>' +
        '<button class="dt-iconbtn" data-act="ev-close" title="Close">' + ic('x', 16) + '</button>' +
      '</div></div>';
  }
  function edPlayer(c, clip, ev, opts) {
    opts = opts || {};
    var meta = evMeta(c);
    var overlay = opts.overlay !== false && meta.overlay && meta.overlay[0] !== '—'
      ? '<span class="dt-ed-speed"><strong>' + esc(meta.overlay[0]) + '</strong><span>' + esc(meta.overlay[1]) + '</span></span>' : '';
    var tag = opts.tag ? '<span class="dt-ed-camtag">' + esc(opts.tag) + '</span>' : '';
    if (evHasRealVideo(clip)) {
      // Real footage: the native element owns play / pause / seek / duration /
      // current time. No autoplay; the simulated controls are not rendered.
      var player = '<div class="dt-ed-player is-realvideo">' +
        '<video class="dt-ed-video" controls preload="metadata" playsinline' +
        (clip.poster ? ' poster="' + esc(clip.poster) + '"' : '') +
        ' src="' + esc(clip.src) + '"></video>' +
        overlay + tag + '</div>';
      // Only clips that author a caption get the caption bar — uncaptioned
      // real videos render exactly as before.
      if (!clip.caption) return player;
      return '<figure class="dt-ed-imagewrap">' + player +
        '<figcaption class="dt-ed-imagecap">' + edMediaCaption(clip) + '</figcaption></figure>';
    }
    var bg = opts.dark ? '' : ' style="background-image:url(' + assetUrl('images/dashcam-frame.png') + ')"';
    var inner = opts.dark
      ? '<span class="dt-ed-darkinner">' + ic('user', 26) + '<span>' + esc(opts.tag || 'Camera') + ' camera</span></span>' : '';
    var dur = evDurationSec(clip);
    return '<div class="dt-ed-player"' + bg + '>' + inner + overlay + tag +
      '<div class="dt-ed-controls"><div class="dt-ed-progress"><span style="width:' + (ev.t * 100).toFixed(1) + '%"></span></div>' +
      '<div class="dt-ed-ctlrow">' +
        '<button class="dt-ed-iconbtn" data-act="ev-play" title="' + (ev.playing ? 'Pause' : 'Play') + '">' + ic(ev.playing ? 'pause' : 'play', 16) + '</button>' +
        '<span><span class="dt-ed-timenow">' + fmtClock(ev.t * dur) + '</span> / ' + esc(evDurationLabel(clip) || '—') + '</span><span class="spacer"></span>' +
        '<button class="dt-ed-iconbtn" data-act="ev-volume" title="Audio">' + ic('volume', 16) + '</button>' +
        '<button class="dt-ed-iconbtn" data-act="ev-download" title="Export clip">' + ic('download', 16) + '</button>' +
      '</div></div></div>';
  }
  // Caption line shared by image and captioned-video evidence:
  // label · caption + provenance (registered pill or free-text source).
  function edMediaCaption(clip) {
    var label = clip.label ? '<strong>' + esc(clip.label) + '</strong>' : '';
    var caption = clip.caption ? esc(clip.caption) : '';
    var prov = '';
    if (clip.provenance) {
      prov = WHY_SOURCES[clip.provenance]
        ? whySrcPill(clip.provenance)
        : '<span class="dt-ed-imagesrc">' + esc(clip.provenance) + '</span>';
    }
    return label + (label && caption ? ' · ' : '') + caption + (prov ? ' ' + prov : '');
  }
  // Image evidence renders inside the drawer at its natural aspect ratio —
  // never cropped, never modified.
  function edImageFigure(clip) {
    var cap = edMediaCaption(clip);
    return '<figure class="dt-ed-imagewrap">' +
      '<img class="dt-ed-image" src="' + esc(clip.src) + '" alt="' + esc(clip.label || 'Evidence image') + '">' +
      (cap ? '<figcaption class="dt-ed-imagecap">' + cap + '</figcaption>' : '') +
      '</figure>';
  }
  // Compact strip of frame evidence beneath the player. Clicking a frame
  // seeks the shared playhead (and any real video) to that exact timestamp.
  function edFrameStrip(c, clip, ev) {
    var frames = evFrames(c, clip);
    if (!frames.length) return '';
    var sel = evSelectedFrame(frames, ev.t * evCurrentDur(c, ev));
    var items = frames.map(function (f, i) {
      var rel = f.timeSeconds == null ? '' : '+' + (Math.round(f.timeSeconds * 10) / 10).toFixed(1) + ' s';
      return '<button class="dt-ed-frame' + (i === sel ? ' is-selected' : '') + (f.crashSequence ? ' is-crash' : '') +
        '" data-act="ev-frame:' + i + '" data-frame="' + i + '"' +
        (f.description ? ' title="' + esc(f.description) + '"' : '') + '>' +
        '<span class="dt-ed-frame-thumb" style="background-image:url(' + esc(f.src) + ')"></span>' +
        '<span class="dt-ed-frame-id">' + esc(f.id || 'F' + (i + 1)) + (rel ? ' · ' + rel : '') + '</span>' +
        (f.label ? '<span class="dt-ed-frame-label">' + esc(f.label) + '</span>' : '') +
        '</button>';
    }).join('');
    return '<div class="dt-ed-frames" aria-label="Frame evidence">' + items + '</div>';
  }
  function edTelemetry(c, ev, opts) {
    opts = opts || {};
    var meta = evMeta(c), t = meta.telemetry;
    if (!t || !t.speed || !t.speed.length) return '';
    var clip = c.evidence[ev.index];
    var views = [['speed', 'Speed']];
    if (t.g && t.g.length) views.push(['g', 'G-force']);
    if (opts.allowMapView) views.push(['map', 'Map']);
    var view = ev.view;
    if (!views.some(function (v) { return v[0] === view; })) view = 'speed';
    var chips = views.length > 1 ? '<span class="dt-ed-chips">' + views.map(function (v) {
      return '<button class="' + (view === v[0] ? 'on' : '') + '" data-act="ev-view:' + v[0] + '">' + v[1] + '</button>';
    }).join('') + '</span>' : '';
    var viewHtml;
    if (view === 'map') {
      viewHtml = '<div class="dt-ed-map">' + ic('map-pin', 20) + '<span>' + esc(clip.place) + '</span>' +
        '<span style="font-size:11px;color:var(--gray-500)">Event location · telemetry pinned to this clip</span></div>';
    } else {
      var vals = view === 'g' ? t.g : t.speed;
      var max = Math.max.apply(null, vals) || 1;
      var bars = vals.map(function (v, i) {
        return '<span class="dt-ed-bar' + (i === t.eventIndex ? ' event' : '') + '" style="height:' + Math.max(8, Math.round(v / max * 100)) + '%" title="' + esc(String(v)) + (view === 'g' ? ' g' : (opts.speedUnit || ' mph')) + '"></span>';
      }).join('');
      viewHtml = '<div class="dt-ed-timeline" data-act="ev-scrub" title="Click to scrub"><div class="dt-ed-bars">' + bars +
        '<span class="dt-ed-playhead" style="left:' + (ev.t * 100).toFixed(1) + '%"></span></div></div>';
    }
    var legend = (opts.markers && opts.markers.length && view !== 'map')
      ? '<div class="dt-ed-markers">' + opts.markers.map(function (mk) {
          return '<span class="mk"><i style="background:' + mk.color + '"></i>' + esc(mk.label) + '</span>';
        }).join('') + '</div>' : '';
    var durLabel = evDurationLabel(clip);
    var stats = (t.stats || []).concat(durLabel ? [[durLabel, 'Clip length']] : []).map(function (s) {
      return '<div class="dt-ed-stat"><strong>' + esc(s[0]) + '</strong><span>' + esc(s[1]) + '</span></div>';
    }).join('');
    return '<div class="dt-ed-telemetry">' +
      '<div class="dt-ed-tel-head"><div class="dt-ed-tel-title">' + ic('play', 14) +
      '<span>' + (view === 'g' ? 'G-force' : (opts.speedLabel || 'Speed (mph)')) + ' · ' + esc(t.windowLabel || 'around the event') +
      '<span class="dt-ed-tel-sub"><span class="dt-ed-timenow">' + fmtClock(ev.t * evDurationSec(clip)) + '</span>' + (durLabel ? ' / ' + esc(durLabel) : '') + ' · plays with video</span></span></div>' +
      chips + '</div>' + viewHtml + legend + '<div class="dt-ed-stats">' + stats + '</div></div>';
  }

  /* Collision layout */
  function collisionMarkers(c) {
    var t = evMeta(c).telemetry;
    if (!t || !t.speed || t.eventIndex == null) return [];
    // Second offsets require the case's own sampling interval; without it the
    // markers carry no time claims (no assumed 60-second window).
    var n = t.speed.length, evI = t.eventIndex, secPer = t.secondsPerSample != null ? t.secondsPerSample : null;
    function rel(i) {
      if (i === evI) return 'at event';
      if (secPer == null) return '';
      var s2 = Math.round((i - evI) * secPer);
      return (s2 > 0 ? '+' + s2 + ' s' : s2 + ' s');
    }
    function mk(label, i, color) { var r = rel(i); return { label: label + (r ? ' (' + r + ')' : ''), color: color }; }
    var ca = c.collisionAnalysis || {};
    var eventLabel = ca.majorCollisionDetected === true ? 'Major Collision' : 'Event';
    var mks = [mk(eventLabel, evI, '#F04438')];
    var bi = -1, bd = 0, i, d;
    for (i = 1; i <= evI; i++) { d = t.speed[i - 1] - t.speed[i]; if (d > bd) { bd = d; bi = i; } }
    if (bd >= 3) mks.push(mk('Braking', bi, '#F79009'));
    var si = -1;
    for (i = evI; i < n; i++) { if (t.speed[i] <= 0.5) { si = i; break; } }
    if (si >= 0) mks.push(mk('Stop', si, '#98A2B3'));
    if (si >= 0) {
      var ri = -1;
      for (i = si + 1; i < n; i++) { if (t.speed[i] > 0.5) { ri = i; break; } }
      if (ri >= 0) mks.push(mk('Resumed', ri, '#12B76A'));
    }
    return mks;
  }
  function edCollisionMap(c, ev) {
    var a = c.accident, ca = c.collisionAnalysis || {};
    var clip = c.evidence[ev.index];
    var place = (a && a.location) || clip.place;
    if (!place) {
      return '<div class="dt-ed-map">' + ic('map-pin', 20) + '<span>Location evidence unavailable.</span></div>';
    }
    // route ends at the impact unless the vehicle resumed driving; the
    // stopped/resumed wording is derived from this case's own telemetry
    var mks = collisionMarkers(c);
    var resumed = mks.some(function (m) { return m.label.indexOf('Resumed') === 0; });
    var stopped = mks.some(function (m) { return m.label.indexOf('Stop') === 0; });
    var route = [[36, 118], [196, 118], [196, 82], [418, 82]];
    if (resumed) route.push([560, 82]);
    ev._route = route;
    var startP = routePoint(route, ev.t);
    var nearby = ca.nearbyAssetDistanceM != null
      ? '<circle cx="452" cy="106" r="6" fill="#F79009" stroke="#101828" stroke-width="2"></circle>' +
        '<text x="464" y="110" font-size="10.5" fill="#FDB022">Nearby asset · ' + esc(String(ca.nearbyAssetDistanceM)) + ' m</text>'
      : '';
    var zone = ca.insideSensitiveZone === true
      ? '<rect x="330" y="16" width="292" height="132" rx="8" fill="#F04438" opacity="0.08"></rect>' +
        '<text x="344" y="36" font-size="10.5" font-weight="600" fill="#FDA29B">Sensitive zone' + (ca.zoneLabel ? ' · ' + esc(ca.zoneLabel) : '') + '</text>'
      : '';
    return '<div class="dt-ed-mapview">' +
      '<svg viewBox="0 0 640 164" width="100%" role="img" aria-label="Map — ' + esc(place) + '">' +
        '<rect width="640" height="164" fill="#1D2939"></rect>' +
        '<rect x="26" y="20" width="146" height="44" rx="6" fill="#344054"></rect>' +
        '<rect x="26" y="92" width="104" height="46" rx="6" fill="#344054"></rect>' +
        '<rect x="470" y="120" width="146" height="30" rx="6" fill="#344054"></rect>' +
        '<path d="M0 82 H640" stroke="#101828" stroke-width="18"></path>' +
        '<path d="M196 0 V164" stroke="#101828" stroke-width="14"></path>' +
        '<path d="M0 82 H640" stroke="#475467" stroke-width="1" stroke-dasharray="6 6"></path>' +
        zone +
        '<path d="M36 118 H196 V82 H418" stroke="#67A7DA" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>' +
        (resumed ? '<path d="M418 82 H560" stroke="#67A7DA" stroke-width="3" fill="none" stroke-dasharray="5 6" stroke-linecap="round"></path>' : '') +
        nearby +
        '<circle cx="418" cy="82" r="12" fill="#F04438" opacity="0.2"></circle>' +
        '<circle cx="418" cy="82" r="5" fill="#F04438" stroke="#fff" stroke-width="2"></circle>' +
        '<text x="404" y="62" font-size="10.5" font-weight="600" fill="#FDA29B">Impact</text>' +
        '<circle id="dt-ed-mapcursor" cx="' + startP[0].toFixed(1) + '" cy="' + startP[1].toFixed(1) + '" r="5" fill="#fff" stroke="#136AB6" stroke-width="2"></circle>' +
      '</svg>' +
      '<div class="dt-ed-mapcap">' + ic('map-pin', 12) + esc(place) +
        ' · route before the event (solid)' +
        (resumed ? ' and after (dashed)' : (stopped ? ' — vehicle stopped at the impact point' : '')) + '</div>' +
    '</div>';
  }
  function renderCollisionEvidence(c, clip, ev) {
    var kind = evKind(clip);
    var main = evIsVideoKind(kind)
      ? edPlayer(c, clip, ev, {})
      : evIsImage(clip)
        ? edImageFigure(clip)
        : '<div class="dt-ed-placeholder">' + ic('video', 24) + '<span>Video unavailable for this evidence item</span></div>';
    // Drawer media column is footage-only: player + frame strip. The stylized
    // map and the speed/g chart were removed from the drawer for all cases —
    // location and telematics render in the case panel instead.
    var media = '<div class="dt-ed-media">' + main + edFrameStrip(c, clip, ev) + '</div>';

    var a = c.accident, ca = c.collisionAnalysis, cas = c.collisionAnalysisSources || {};
    var pc = c.peerComparison, pcs = c.peerComparisonSources || {};
    var evald = evaluateCollisionCandidate(ca, cas); // reuse Step 2 output as-is
    var rows = [];
    function row(k, vHtml) { rows.push('<div class="dt-ed-kv"><span class="k">' + k + '</span><span class="v">' + vHtml + '</span></div>'); }
    row('Vehicle', esc(a && a.vehicle ? a.vehicle : c.subject.name));
    row('Driver', a && a.driver ? esc(a.driver.name + ' (' + a.driver.id + ')') : 'Driver unavailable');
    var when = (a && a.when) || clip.time; if (when) row('Date & time', esc(when));
    var loc = (a && a.location) || clip.place; if (loc) row('Location', esc(loc));
    if (pc && pc.assetClass) row('Asset class', esc(pc.assetClass) + ' ' + whySrcPill(pcs.assetClass || 'recorded'));
    if (ca.insideSensitiveZone !== undefined && ca.insideSensitiveZone !== null) {
      row('Zone', (ca.insideSensitiveZone ? 'Sensitive zone' + (ca.zoneLabel ? ' · ' + esc(ca.zoneLabel) : '') : 'Outside sensitive zones') + ' ' + whySrcPill(cas.insideSensitiveZone || 'recorded'));
    }
    if (ca.majorCollisionDetected !== undefined && ca.majorCollisionDetected !== null) {
      // Only a true Major Collision flag may claim that signal; otherwise the
      // case states its own event source (e.g. a harsh-braking camera event).
      var evtSrc = ca.majorCollisionDetected === true
        ? 'Geotab Major Collision signal'
        : (ca.eventSource || 'Camera event (no Major Collision signal)');
      row('Event source', esc(evtSrc) + ' ' + whySrcPill(cas.majorCollisionDetected || 'recorded'));
    }
    var spd = ca.scorePresentation || null;
    var lvlClass = evald.level === 'High investigation priority' ? 'lvl-high' : evald.level === 'Requires review' ? 'lvl-review' : 'lvl-fp';
    row(esc((spd && spd.scoreLabel) || 'Investigation priority'),
      '<span class="dt-ed-lvl ' + lvlClass + '">' + esc((spd && spd.interpretation) || evald.level) + ' · ' + evald.score + ' / 100</span> ' + whySrcPill('derived'));
    if (spd && spd.assessments) spd.assessments.forEach(function (a2) { row(esc(a2[0]), esc(a2[1])); });
    if (pc && pc.classification) row('Peer interpretation', esc(pc.classification) + ' ' + whySrcPill(pcs.classification || 'derived'));

    // AI interpretation — investigation summary, never a confirmed conclusion
    var bits = [];
    if (ca.majorCollisionDetected === true) bits.push('a Major Collision signal');
    if (ca.speedBeforeKph != null && ca.speedAfterKph != null && ca.speedBeforeKph - ca.speedAfterKph > 0) {
      bits.push('a ' + (ca.speedBeforeKph - ca.speedAfterKph) + ' km/h speed reduction');
    }
    if (ca.stopDurationSeconds != null) bits.push('a ' + ca.stopDurationSeconds + '-second stop');
    var s1 = bits.length ? 'Telemetry shows ' + bits[0] + (bits.length > 1 ? ' followed by ' + bits.slice(1).join(' and ') : '') + '. ' : '';
    var s2 = (pc && pc.assetClass && pc.percentiles) ? 'This event ranks unusually compared with similar ' + esc(pc.assetClass.toLowerCase()) + 's and should be reviewed. ' : '';
    var ai = s1 + s2 + 'These signals do not independently confirm that a collision occurred.';

    var side = '<aside class="dt-ed-side">' +
      '<div class="dt-ed-ai"><span class="dt-micro">' + ic('sparkle', 13) + 'AI interpretation</span>' +
      '<p class="dt-ed-ai-text">' + ai + '</p>' +
      '<span class="dt-ed-ai-note">Summary for investigation — not a confirmed conclusion.</span></div>' +
      '<div class="dt-ed-sec"><span class="dt-micro">Investigation context</span>' + rows.join('') + '</div>' +
      '</aside>';
    return media + side;
  }

  /* Fatigue layout */
  function renderFatigueEvidence(c, clip, ev) {
    var fa = c.fatigueAnalysis || {};
    var fs = c.fatigueAnalysisSources || {};
    var driverClip = null, roadClip = null;
    c.evidence.forEach(function (e2) {
      var k = evKind(e2);
      if (k === 'driverVideo' && !driverClip) driverClip = e2;
      if (k === 'roadVideo' && !roadClip) roadClip = e2;
    });
    var primary = driverClip
      ? edPlayer(c, driverClip, ev, { tag: 'Driver-facing', dark: true, overlay: false })
      : '<div class="dt-ed-placeholder">' + ic('user', 24) + '<span>Driver-facing stream unavailable</span></div>';
    var secondary = roadClip
      ? edPlayer(c, roadClip, ev, { tag: 'Road-facing', overlay: false })
      : '<div class="dt-ed-placeholder">' + ic('video', 20) + '<span>Road-facing stream unavailable</span></div>';
    var markers = [{ label: 'Fatigue event', color: '#F04438' }];
    if (fa.eventDurationSeconds != null) markers.push({ label: 'Behaviour duration ' + fa.eventDurationSeconds + ' s', color: '#F79009' });
    var media = '<div class="dt-ed-media">' + primary +
      '<div class="dt-ed-fcams">' + secondary + '</div>' + edFrameStrip(c, clip, ev) + '</div>';

    // interpretation: visual confirmation only when the data and stream support it
    var interp = (driverClip && fa.visuallyConfirmed === true && fa.detectedBehaviour)
      ? 'Driver-facing video shows ' + esc(String(fa.detectedBehaviour).toLowerCase()) + ' during vehicle operation. The event has been raised for supervisor review.'
      : 'A fatigue-related camera event was detected and requires supervisor review.';
    var stateDefs = [
      ['detectedBehaviour', 'Detected behaviour', function (v) { return String(v); }],
      ['eventDurationSeconds', 'Event duration', function (v) { return v + ' s'; }],
      ['driverResponse', 'Driver response', function (v) { return String(v); }],
      ['inCabAlertIssued', 'In-cab alert issued', function (v) { return v ? 'Yes' : 'No'; }],
      ['alertAcknowledged', 'Alert acknowledged', function (v) { return v ? 'Yes' : 'No'; }],
      ['vehicleSpeedKph', 'Vehicle speed', function (v) { return v + ' km/h'; }],
      ['tripDurationMinutes', 'Trip duration', function (v) { return Math.floor(v / 60) + ' h ' + (v % 60) + ' m'; }],
      ['timeIntoShiftHours', 'Time into shift', function (v) { return v + ' h'; }],
      ['priorFatigueEvents30d', 'Prior fatigue events · 30d', function (v) { return String(v); }]
    ];
    var stateRows = stateDefs.filter(function (d2) { return fa[d2[0]] !== undefined && fa[d2[0]] !== null; })
      .map(function (d2) {
        return '<div class="dt-ed-kv"><span class="k">' + d2[1] + '</span><span class="v">' + esc(d2[2](fa[d2[0]])) + ' ' + whySrcPill(fs[d2[0]] || 'recorded') + '</span></div>';
      }).join('');
    var meta = evMeta(c);
    var hist = meta.safetyHistory && meta.safetyHistory.length
      ? edKvRows(meta.safetyHistory)
      : '<div class="dt-ed-kv"><span class="k">Safety history</span><span class="v">No safety history available</span></div>';
    var side = '<aside class="dt-ed-side">' +
      '<div class="dt-ed-ai"><span class="dt-micro">' + ic('sparkle', 13) + 'AI interpretation</span>' +
      '<p class="dt-ed-ai-text">' + interp + '</p>' +
      '<span class="dt-ed-ai-note">Summary for investigation — not a confirmed conclusion.</span></div>' +
      (stateRows ? '<div class="dt-ed-sec"><span class="dt-micro">Driver state</span>' + stateRows + '</div>' : '') +
      '<div class="dt-ed-sec"><span class="dt-micro">Safety history</span>' + hist + '</div>' +
      '</aside>';
    return media + side;
  }

  /* Generic layout (pre-existing evidence keeps working unchanged) */
  function renderGenericEvidence(c, clip, ev) {
    var meta = evMeta(c);
    var cams = (meta.cameras || []).length ? '<div class="dt-ed-cams">' + meta.cameras.map(function (cam) {
      return '<div class="dt-ed-cam"><div class="dt-ed-cam-head"><span>' + esc(cam) + '</span>' +
        '<span class="dt-ed-cam-sync"><span class="dt-dot"></span>Sync</span></div>' +
        '<div class="dt-ed-cam-icon">' + ic('video', 26) + '</div><div class="dt-ed-cam-bar"><span style="width:' + (ev.t * 100).toFixed(1) + '%"></span></div></div>';
    }).join('') + '</div>' : '';
    var main = evIsImage(clip) ? edImageFigure(clip) : edPlayer(c, clip, ev, {});
    var media = '<div class="dt-ed-media">' + main + edFrameStrip(c, clip, ev) + cams + '</div>';
    var side = '<aside class="dt-ed-side">' +
      '<div class="dt-ed-ai"><span class="dt-micro">' + ic('sparkle', 13) + 'Clarity reads this as</span><ul>' +
        (meta.ai || []).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' +
      (meta.driverState && meta.driverState.length ? '<div class="dt-ed-sec"><span class="dt-micro">Driver state — in-cab AI</span>' + edKvRows(meta.driverState) + '</div>' : '') +
      (meta.tripData && meta.tripData.length ? '<div class="dt-ed-sec"><span class="dt-micro">Trip data</span>' + edKvRows(meta.tripData) + '</div>' : '') +
      (meta.safetyHistory && meta.safetyHistory.length ? '<div class="dt-ed-sec"><span class="dt-micro">Driver safety history</span>' + edKvRows(meta.safetyHistory) + '</div>' : '') +
      '</aside>';
    return media + side;
  }

  function renderEvidenceDrawer(c, clip, ev) {
    var mode = evInvestigationMode(c);
    ev._route = null;
    var head, body;
    if (mode === 'collision') {
      // A case whose evidence is not camera footage states its own badge
      // (evidenceMeta.drawerBadge) instead of the camera-count default.
      var camBadge = evMeta(c).drawerBadge || ((1 + (evMeta(c).cameras || []).length) + ' cameras · synced playback');
      head = edHeader(c, clip, ev, 'collision evidence', camBadge);
      body = renderCollisionEvidence(c, clip, ev);
    } else if (mode === 'fatigue') {
      var camN = c.evidence.filter(function (e2) { return evIsVideoKind(evKind(e2)); }).length;
      head = edHeader(c, clip, ev, 'fatigue event', camN + (camN === 1 ? ' camera' : ' cameras') + ' · synced playback');
      body = renderFatigueEvidence(c, clip, ev);
    } else {
      head = edHeader(c, clip, ev, 'dashcam clip', (1 + (evMeta(c).cameras || []).length) + ' cameras · synced playback');
      body = renderGenericEvidence(c, clip, ev);
    }
    return '<div class="dt-ed">' + head + '<div class="dt-ed-body dt-scroll">' + body + '</div></div>';
  }
  function evidenceDrawerHtml(ev) {
    var c = findCase(ev.caseId);
    return renderEvidenceDrawer(c, c.evidence[ev.index], ev);
  }

  /* ── secondary views ──────────────────────────────────────────────────── */
  function placeholderHtml(view) {
    if (view === 'management') return managementHtml();
    var t = ['Coming soon', 'sparkle', ''];
    return '<div class="dt-container"><div class="dt-placeholder">' + ic(t[1], 44) +
      '<div class="dt-placeholder-title">' + esc(t[0]) + '</div><div style="max-width:420px;margin:0 auto">' + esc(t[2]) + '</div>' +
      '<button class="dt-btn dt-btn-secondary" style="margin-top:20px" data-act="nav:cases">' + ic('arrow-right', 16) + 'Back to Cases</button></div></div>';
  }

  /* Management: team, case routing and demo controls. Everything shown is
     read from the session state / configured data — assignment counts are
     derived live from the queue, never authored. */
  function managementHtml() {
    var rows = state.users.map(function (u) {
      var open = state.cases.filter(function (c) {
        if (c.dismissed || c.resolved || invIsClosed(c)) return false;
        var name = c.assignee === 'me' ? state.users[0].name : c.assignee;
        return name === u.name;
      }).length;
      return '<div class="dt-mgmt-row"><span class="dt-initials">' + esc(u.initials) + '</span>' +
        '<span class="dt-mgmt-name">' + esc(u.name) + '</span>' +
        '<span class="dt-mgmt-role">Fleet manager</span>' +
        '<span class="dt-mgmt-count">' + open + ' open case' + (open === 1 ? '' : 's') + '</span></div>';
    }).join('');
    var pipe = D.accidentStatuses.map(function (s) {
      return '<span class="dt-pipe-step">' + esc(s) + '</span>';
    }).join('<span class="dt-pipe-sep">' + ic('chevron-right', 12) + '</span>');
    return '<div class="dt-container dt-mgmt">' +
      '<h1 class="dt-h1">Management</h1>' +
      '<div class="dt-mgmt-sub">Team, case routing and demo controls for the fleet-manager group.</div>' +
      '<div class="dt-mgmt-card"><div class="dt-mgmt-card-title">' + ic('users', 15) + '<span>Team</span></div>' +
        '<div class="dt-mgmt-cap">Assignable case owners. Open-case counts reflect the current queue.</div>' + rows + '</div>' +
      '<div class="dt-mgmt-card"><div class="dt-mgmt-card-title">' + ic('layers', 15) + '<span>Accident case pipeline</span></div>' +
        '<div class="dt-mgmt-cap">Stages every accident case moves through. A production deployment manages these in company settings.</div>' +
        '<div class="dt-pipe">' + pipe + '</div></div>' +
      '<div class="dt-demo-card">' +
        '<div class="dt-demo-head">' + ic('sliders', 15) + '<span>Demo &amp; prototype controls</span>' +
        '<span class="dt-demo-tag">Demo only</span></div>' +
        '<p>Resets this prototype to its original seeded state — case statuses, accident pipeline stages, assignees, outcomes, escalations, activity entries, audit records, evidence shares, rule-tuning requests, FNOL and driver-contact progress, and the Today queue. Session data only — nothing is written to dnata systems.</p>' +
        '<button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="demo-reset-open">' + ic('refresh', 14) + 'Reset demo data</button>' +
      '</div></div>';
  }

  /* Demo-state reset: rebuilds the session state from the seeded fixtures via
     the existing initState() persistence mechanism. Never touches data.js or
     any live system. */
  function resetModalHtml() {
    return '<div class="dt-modal-head"><span class="dt-modal-title"><span style="color:var(--primary-600);display:flex">' + ic('refresh', 18) + '</span>Reset demo data</span>' +
      '<button class="dt-iconbtn" data-act="modal-close">' + ic('x', 16) + '</button></div>' +
      '<div class="dt-modal-body"><p style="margin:0 0 10px;font-size:14px;line-height:21px;color:var(--gray-700)">This restores every case to its original seeded state and discards all session changes — statuses, pipeline stages, assignees, outcomes, escalations, activity, audit records, evidence shares, rule-tuning requests, FNOL and driver-contact progress.</p>' +
      '<div class="dt-inv-warn">' + ic('alert-triangle', 14) + 'Demo only — this affects the prototype session, not any live dnata data.</div></div>' +
      '<div class="dt-modal-foot"><button class="dt-btn dt-btn-sm dt-btn-secondary" data-act="modal-close">Cancel</button>' +
      '<button class="dt-btn dt-btn-sm dt-btn-danger" data-act="demo-reset-confirm">' + ic('refresh', 14) + 'Reset demo data</button></div>';
  }
  function performReset() {
    if (callTimer) { clearInterval(callTimer); callTimer = null; }
    stopEvTimer();
    state = initState();
    closePop();
    renderMain();
    renderPanel();
    renderEvidence();
    renderModal();
    loadLiveContext();
    toast('Demo reset complete — the prototype is back to its original seeded state.');
  }

  /* ── popovers ─────────────────────────────────────────────────────────── */
  function closePop() { if (layer) layer.innerHTML = ''; }
  function openPop(triggerEl, html, opts) {
    opts = opts || {};
    closePop();
    var rootRect = root.getBoundingClientRect();
    var r = triggerEl.getBoundingClientRect();
    var catcher = document.createElement('div');
    catcher.style.cssText = 'position:absolute;inset:0;z-index:55;';
    catcher.setAttribute('data-act', 'pop-close');
    layer.appendChild(catcher);
    var pop = document.createElement('div');
    pop.className = 'dt-pop' + (opts.wide ? ' dt-pop-wide' : '');
    pop.innerHTML = html;
    pop.style.visibility = 'hidden';
    layer.appendChild(pop);
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var top = r.bottom - rootRect.top + 6;
    var left;
    if (opts.align === 'right') left = r.right - rootRect.left - pw;
    else left = r.left - rootRect.left;
    left = Math.max(8, Math.min(left, rootRect.width - pw - 8));
    if (top + ph > rootRect.height - 8) top = Math.max(8, r.top - rootRect.top - ph - 6);
    pop.style.left = left + 'px'; pop.style.top = top + 'px'; pop.style.visibility = 'visible';
  }
  function menuItem(act, icon, label, cls) { return '<button class="dt-menu-item ' + (cls || '') + '" data-act="' + act + '">' + (icon ? ic(icon, 16) : '') + label + '</button>'; }

  function openMoreMenu(el, id, inPanel) {
    var c = findCase(id);
    var html = menuItem('save:' + id, 'star', c.saved ? 'Saved' : 'Save case') +
      menuItem('export:' + id, 'arrow-right', 'Export summary');
    if (!isCritical(c)) html += menuItem('defer:' + id, 'clock', 'Defer for later') + menuItem('dismiss:' + id, 'x', 'Dismiss', 'danger');
    openPop(el, html, { align: 'right' });
  }
  function openStatusMenu(el, id) {
    var c = findCase(id);
    var html = D.statuses.map(function (s) { return menuItem('set-status:' + id + ':' + s.replace(/ /g, '_'), null, statusHtml(s), c.status === s ? 'is-selected' : ''); }).join('');
    openPop(el, html, { align: 'right' });
  }
  function openSevMenu(el, id) {
    var c = findCase(id);
    var html = ['High', 'Medium', 'Low'].map(function (s) { return menuItem('set-sev:' + id + ':' + s, null, sevHtml(s), c.severity === s ? 'is-selected' : ''); }).join('');
    openPop(el, html);
  }
  function openAssigneeMenu(el, id) {
    var c = findCase(id);
    var cur = c.assignee === 'me' ? 'me' : c.assignee;
    var html = state.users.map(function (u) {
      var key = u.me ? 'me' : u.name;
      return '<button class="dt-menu-item ' + (cur === key ? 'is-selected' : '') + '" data-act="set-assignee:' + id + ':' + encodeURIComponent(key) + '"><span class="dt-initials">' + esc(u.initials) + '</span>' + esc(u.name) + '</button>';
    }).join('');
    openPop(el, html);
  }
  function openStreakPop(el) {
    var s = D.streak;
    if (!s) return;
    var cols = s.history.map(function (h) {
      var cls = h.d === 'Today' ? 'today' : (h.cleared ? 'on' : '');
      return '<span class="dt-streakcol"><span class="dt-streakcell ' + cls + '" title="' + h.n + ' closed"></span><span class="dt-streak-daylabel">' + esc(h.d[0]) + '</span></span>';
    }).join('');
    var html = '<div class="dt-pop-title">' + s.days + '-day streak <span class="dt-micro" style="color:var(--gray-400)">last 14 days</span></div>' +
      '<div class="dt-streakgrid">' + cols + '</div>' +
      '<div class="dt-streakstats"><div><div class="dt-streakstat-num">' + s.best + '</div><div class="dt-streakstat-label">Best streak</div></div>' +
      '<div><div class="dt-streakstat-num">' + s.clearedPct + '%</div><div class="dt-streakstat-label">Days cleared</div></div>' +
      '<div><div class="dt-streakstat-num">23</div><div class="dt-streakstat-label">Closed this week</div></div></div>';
    openPop(el, html, { wide: true, align: 'right' });
  }
  function openFilters(el) {
    var f = state.filters;
    function facet(label, key, vals) {
      return '<div class="dt-facet"><div class="dt-facet-label">' + label + '</div>' +
        vals.map(function (v) {
          var checked = f[key].indexOf(v) >= 0 ? 'checked' : '';
          return '<label class="dt-check"><input type="checkbox" ' + checked + ' data-act="filter:' + key + ':' + encodeURIComponent(v) + '">' + esc(v) + '</label>';
        }).join('') + '</div>';
    }
    var html = '<div class="dt-pop-title">Filters</div>' +
      facet('Task type', 'taskType', D.categoryOrder) +
      facet('Severity', 'severity', ['High', 'Medium', 'Low']) +
      facet('Status', 'status', D.statuses) +
      facet('Assignee', 'assignee', state.users.map(function (u) { return u.name; })) +
      '<div class="dt-pop-foot"><button class="dt-linkbtn" data-act="filter-clear">Clear all</button>' +
      '<button class="dt-btn dt-btn-primary" style="height:34px" data-act="pop-close">Done</button></div>';
    openPop(el, html, { wide: true, align: 'right' });
  }

  /* ── toast ────────────────────────────────────────────────────────────── */
  var toastSeq = 0;
  function toast(msg, undoFn) {
    var id = 'toast-' + (++toastSeq);
    var box = qs('#dt-toasts');
    var el = document.createElement('div');
    el.className = 'dt-toast'; el.id = id;
    el.innerHTML = ic('check-circle', 18) + '<span style="flex:1">' + esc(msg) + '</span>' +
      (undoFn ? '<button class="dt-linkbtn" style="color:#9DD0FF" data-act="undo:' + id + '">Undo</button>' : '');
    box.appendChild(el);
    if (undoFn) undoRegistry[id] = undoFn;
    setTimeout(function () { if (el.parentNode) { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); } delete undoRegistry[id]; }, undoFn ? 6000 : 3200);
  }
  var undoRegistry = {};

  /* ── event binding / dispatch ─────────────────────────────────────────── */
  function bind() {
    // idempotent: repeated mounts must never register duplicate listeners
    if (root._dtBound) return;
    root._dtBound = true;
    root.addEventListener('click', onClick);
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t && t.id === 'dt-search') { state.search = t.value; refreshQueueOnly(); return; }
      if (t && t.dataset && t.dataset.field) {
        var f = t.dataset.field.split(':');
        if (f[0] === 'acc') {
          var c = findCase(t.dataset.case);
          if (c && c.accident) c.accident.details[f[1]] = t.value;
        } else if ((f[0] === 'fnol' || f[0] === 'nc' || f[0] === 'ia') && state.modal && state.modal.draft) {
          state.modal.draft[f[1]] = t.value;
          if (f[0] === 'fnol' && state.modal.confirm) delete state.modal.confirm[f[1]];
          var fld = t.closest('.dt-field');
          if (fld && t.value) fld.classList.remove('warn');
        } else if (f[0] === 'fnolr' && state.modal && state.modal.recip) {
          // FNOL recipient / insured-company fields (editable emails etc.)
          var R = state.modal.recip;
          if (f[1] === 'ins') R.insurerEmail.addr = t.value;
          else if (f[1] === 'hook') R.webhook.url = t.value;
          else if (f[1] === 'insured') {
            R.insured[f[2]] = t.value;
            if (f[2] === 'company') state.modal.draft.insured = t.value;
            var ifld = t.closest('.dt-field');
            if (ifld && t.value) ifld.classList.remove('warn');
          } else if (R[f[1]] && R[f[1]][parseInt(f[2], 10)]) {
            R[f[1]][parseInt(f[2], 10)][f[3]] = t.value;
          }
        }
      }
    });
    root.addEventListener('change', function (e) {
      // supporting-document uploads (front-end only — files stay in this session)
      if (e.target.dataset && e.target.dataset.doccat != null && e.target.files) {
        var fm = state.modal;
        if (fm && fm.type === 'fnol') {
          var cat = FNOL_DOC_CATS[parseInt(e.target.dataset.doccat, 10)];
          for (var fi = 0; fi < e.target.files.length; fi++) {
            fm.docs.push({ cat: cat, name: e.target.files[fi].name, size: e.target.files[fi].size });
          }
          renderModal();
        }
        return;
      }
      // selects (e.g. New Case assignee, investigation-action fields) report through 'change'
      if (e.target.dataset && e.target.dataset.field && /^(nc|ia):/.test(e.target.dataset.field) && state.modal && state.modal.draft) {
        state.modal.draft[e.target.dataset.field.split(':')[1]] = e.target.value;
        var wf = e.target.closest('.dt-field');
        if (wf && e.target.value) wf.classList.remove('warn');
        return;
      }
      var t = e.target.closest && e.target.closest('[data-act]');
      if (t) {
        var a = t.getAttribute('data-act');
        if (a.indexOf('filter:') === 0 || a.indexOf('fnol-evd') === 0 || a.indexOf('fnol-recip:') === 0 || a.indexOf('ia-evd') === 0) dispatch(a, t);
      }
    });
    document.addEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      if (state.modal) closeModal();
      else if (state.evidence) closeEvidence();
      else if (layer.innerHTML) closePop();
      else if (state.openId) { state.openId = null; renderPanel(); }
    }
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act');
    // checkbox-style acts are handled on 'change', not click
    if (act.indexOf('filter:') === 0 || act.indexOf('fnol-evd') === 0 || act.indexOf('fnol-recip:') === 0 || act.indexOf('ia-evd') === 0) return;
    // if clicking an inner action inside a card, don't also trigger card open
    if (act.indexOf('card:') !== 0) e.stopPropagation();
    dispatch(act, t, e);
  }
  function refreshQueueOnly() {
    // re-render just the cases container without losing search focus
    var m = qs('#dt-main');
    if (state.view !== 'cases') return;
    var focused = document.activeElement && document.activeElement.id === 'dt-search';
    var sel = focused ? document.activeElement.selectionStart : null;
    m.innerHTML = casesHtml();
    if (focused) { var i = qs('#dt-search'); if (i) { i.focus(); if (sel != null) try { i.setSelectionRange(sel, sel); } catch (x) {} } }
  }

  function dispatch(act, t, e) {
    var parts = act.split(':');
    var cmd = parts[0];
    switch (cmd) {
      case 'nav': state.view = parts[1]; state.openId = null; closePop(); if (state.modal) closeModal(); if (state.evidence) closeEvidence(); renderMain(); return;
      case 'ask': toast('Ask Clarity — chat coming to the add-in.'); return;
      case 'digest-prev': state.digestIndex = (state.digestIndex - 1 + D.digests.length) % D.digests.length; refreshQueueOnly(); return;
      case 'digest-next': state.digestIndex = (state.digestIndex + 1) % D.digests.length; refreshQueueOnly(); return;
      case 'streak': openStreakPop(t); return;
      case 'tab': state.category = parts.slice(1).join(':'); refreshQueueOnly(); return;
      case 'addview': toast('Custom views — coming soon.'); return;
      case 'filters': openFilters(t); return;
      case 'filter': {
        var farr = state.filters[parts[1]]; if (!farr) return;
        var fval = decodeURIComponent(parts[2]);
        var fix = farr.indexOf(fval);
        if (fix >= 0) farr.splice(fix, 1); else farr.push(fval);
        refreshQueueOnly();
        return;
      }
      case 'filter-clear':
        state.filters = { taskType: [], severity: [], status: [], assignee: [] };
        closePop(); refreshQueueOnly(); toast('Filters cleared.');
        return;
      case 'newcase': openNewCaseModal(); return;
      case 'nc-set': {
        var nm = state.modal; if (!nm || nm.type !== 'newcase') return;
        nm.draft[parts[1]] = decodeURIComponent(parts[2]);
        renderModal();
        return;
      }
      case 'nc-create': createCase(); return;
      case 'deferred-toggle': state.deferredOpen = !state.deferredOpen; refreshQueueOnly(); return;
      case 'closed-toggle': state.closedOpen = !state.closedOpen; refreshQueueOnly(); return;
      case 'reopen': {
        var rc = findCase(parts[1]);
        if (!rc || !invIsClosed(rc)) return;
        var prevOutcome = rc.outcome || null;
        rc.outcome = null;
        if (rc.accident && rc.accident.status === 'Closed') rc.accident.status = 'Under review';
        if (rc.investigationStatus === 'Closed') rc.investigationStatus = 'Under review';
        recordAction(rc, 'reopened', {
          previousValue: 'Closed',
          newValue: rc.accident ? rc.accident.status : (rc.investigationStatus || rc.status),
          metadata: prevOutcome ? { clearedOutcome: prevOutcome } : {},
          summary: meUser().name + ' reopened the case — returned to the Today queue.'
        });
        rerender();
        toast('Case reopened — returned to Today.');
        return;
      }
      case 'pin': { var c = findCase(parts[1]); c.pinned = !c.pinned; refreshQueueOnly(); return; }
      case 'card': state.openId = parts[1]; logView(parts[1]); closePop(); renderPanel(); return;
      case 'more': openMoreMenu(t, parts[1]); return;
      case 'primary': {
        var pcase = findCase(parts[1]);
        if (pcase && pcase.accident) {
          // Accident cases: the primary action starts the response flow, it never auto-resolves.
          state.openId = pcase.id; closePop(); renderPanel();
          if (!pcase.accident.welfareCall) openCallModal(pcase.id);
          else if (!pcase.fnol) openFnolModal(pcase.id);
          return;
        }
        doPrimary(parts[1]); return;
      }

      /* accident response workflow */
      case 'acc-status': {
        var ac = findCase(parts[1]);
        var s = D.accidentStatuses[parseInt(parts[2], 10)];
        if (!ac || !s || ac.accident.status === s) return;
        ac.accident.status = s;
        ac.extra.unshift({ text: 'Accident status set to ' + s, meta: 'Just now · ' + meUser().name, kind: 'note' });
        renderPanel(); toast('Accident status: ' + s + '.');
        return;
      }
      case 'call-open': openCallModal(parts[1]); return;
      case 'call-connect': {
        var mm = state.modal; if (!mm || mm.type !== 'call') return;
        mm.method = parts[1]; mm.step = 2; mm.sec = 0;
        startCallTimer(); renderModal();
        return;
      }
      case 'call-esc': {
        var me = state.modal; if (!me || me.type !== 'call') return;
        if (me.attempts.length >= ESC_CHAIN.length) return;
        var next = ESC_CHAIN[me.attempts.length];
        me.attempts.push({ label: next, ok: next === 'Supervisor notified' });
        renderModal();
        toast(next === 'Supervisor notified' ? 'Supervisor notified — driver unreachable.' : 'Trying ' + next.toLowerCase() + '…');
        return;
      }
      case 'call-ans': {
        var ma = state.modal; if (!ma || ma.type !== 'call') return;
        ma.answers[parts[1]] = decodeURIComponent(parts[2]);
        renderModal();
        return;
      }
      case 'call-end': endCall(); return;
      case 'call-transcript': {
        var tc = findCase(parts[1]);
        tc.accident.trOpen = !tc.accident.trOpen;
        renderPanel();
        return;
      }
      case 'fnol-open': openFnolModal(parts[1]); return;
      case 'fnol-evd': {
        var mv = state.modal; if (!mv || mv.type !== 'fnol') return;
        var ei = parseInt(parts[1], 10);
        mv.evd[ei].on = !mv.evd[ei].on;
        return;
      }
      case 'fnol-recip': {
        var md = state.modal; if (!md || md.type !== 'fnol') return;
        var Rm = md.recip;
        if (parts[1] === 'ins') Rm.insurerEmail.on = !Rm.insurerEmail.on;
        else if (parts[1] === 'hook') Rm.webhook.on = !Rm.webhook.on;
        else {
          var rrow = Rm[parts[1]] && Rm[parts[1]][parseInt(parts[2], 10)];
          if (rrow) rrow.on = !rrow.on;
        }
        return;
      }
      case 'fnol-recip-add': {
        var mra = state.modal; if (!mra || mra.type !== 'fnol') return;
        // default-off like every non-insurer recipient — inclusion is an explicit opt-in
        mra.recip.optional.push({ label: '', addr: '', on: false });
        renderModal();
        return;
      }
      case 'fnol-recip-rm': {
        var mrr = state.modal; if (!mrr || mrr.type !== 'fnol') return;
        mrr.recip.optional.splice(parseInt(parts[1], 10), 1);
        renderModal();
        return;
      }
      case 'fnol-doc-rm': {
        var mdr = state.modal; if (!mdr || mdr.type !== 'fnol') return;
        mdr.docs.splice(parseInt(parts[1], 10), 1);
        renderModal();
        return;
      }
      case 'fnol-send': sendFnolReport(); return;
      case 'fnol-review': { if (state.modal) { state.modal.step = 2; renderModal(); } return; }
      case 'fnol-back': { if (state.modal) { state.modal.step = 1; renderModal(); } return; }
      case 'fnol-submit': submitFnol(); return;
      case 'fnol-download': downloadFnol(parts[1]); return;
      case 'fnol-view': {
        var fr = qs('#dt-fnolrec');
        if (fr) fr.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      case 'securelink': toast('Secure link copied — expires in 7 days. Access is logged to the case.'); return;

      /* investigation actions (Step 5) */
      case 'inv-investigate': {
        var ivc = findCase(parts[1]);
        if (!ivc || !invCanInvestigate(ivc)) return;
        var prevSt = invStatusLabel(ivc);
        if (ivc.accident) ivc.accident.status = 'Under review';
        else { ivc.status = 'In review'; ivc.investigationStatus = 'Under review'; }
        recordAction(ivc, 'investigate', {
          previousValue: prevSt, newValue: 'Under review',
          metadata: { statusModel: ivc.accident ? 'accident_pipeline' : 'case_status' },
          summary: meUser().name + ' moved the case from ' + prevSt + ' to Under review.'
        });
        rerender();
        toast('Case moved to Under review.');
        return;
      }
      case 'ia-open': openIaModal(parts[1], parts[2]); return;
      case 'demo-reset-open': state.modal = { type: 'reset', step: 1 }; renderModal(); return;
      case 'demo-reset-confirm': performReset(); return;
      case 'ia-evd': {
        var iam = state.modal; if (!iam || iam.type !== 'ia' || !iam.evd) return;
        var iei = parseInt(parts[1], 10);
        if (iam.evd[iei]) iam.evd[iei].on = !iam.evd[iei].on;
        return;
      }
      case 'ia-confirm': {
        var im = state.modal; if (!im || im.type !== 'ia') return;
        var icse = findCase(im.caseId); if (!icse) return;
        var dv = im.draft;
        if (im.iaType === 'fp') {
          if (!dv.reason) { im.warn = true; renderModal(); toast('Select a reason first.'); return; }
          var prevFp = invStatusLabel(icse);
          icse.outcome = 'false_positive';
          if (icse.accident) icse.accident.status = 'Closed'; else icse.investigationStatus = 'Closed';
          recordAction(icse, 'false_positive_closed', {
            previousValue: prevFp, newValue: 'Closed',
            reason: dv.reason, notes: dv.notes || null,
            metadata: { outcome: 'false_positive', evidencePreserved: true },
            summary: meUser().name + ' closed the case as a false positive — ' + dv.reason + '. Original event and evidence preserved.'
          });
          closeModal(); rerender();
          toast('Closed as false positive — the original event and evidence are preserved.');
        } else if (im.iaType === 'sens') {
          if (!dv.reason || !dv.reason.trim()) { im.warn = true; renderModal(); toast('A reason is required.'); return; }
          recordAction(icse, 'rule_tuning_request', {
            previousValue: null, newValue: dv.adjustment, reason: dv.reason.trim(),
            metadata: {
              assetClass: (icse.peerComparison && icse.peerComparison.assetClass) || null,
              eventSource: (icse.collisionAnalysis && icse.collisionAnalysis.majorCollisionDetected != null) ? 'Geotab Major Collision signal' : 'Camera detection event',
              liveRuleChanged: false
            },
            summary: meUser().name + ' logged a rule-tuning request — ' + dv.adjustment + '. The live Geotab rule is not modified.'
          });
          closeModal(); rerender();
          toast('Rule-tuning request recorded — the live Geotab rule is not modified.');
        } else if (im.iaType === 'esc') {
          if (!dv.to || !dv.reason || !dv.reason.trim()) { im.warn = true; renderModal(); toast('Destination and reason are required.'); return; }
          icse.escalation = { to: dv.to, reason: dv.reason.trim(), at: 'Just now', by: meUser().name };
          recordAction(icse, 'escalated', {
            previousValue: null, newValue: dv.to, reason: dv.reason.trim(), notes: dv.notes || null,
            metadata: { destination: dv.to, caseRemainsOpen: true },
            summary: meUser().name + ' escalated the case to ' + dv.to + ' — ' + dv.reason.trim()
          });
          closeModal(); rerender();
          toast('Escalated to ' + dv.to + ' — the case remains open.');
        } else if (im.iaType === 'reassign') {
          if (!dv.assignee || !dv.reason || !dv.reason.trim()) { im.warn = true; renderModal(); toast('Assignee and reason are required.'); return; }
          var prevAs = icse.assignee === 'me' ? meUser().name : icse.assignee;
          icse.assignee = dv.assignee === meUser().name ? 'me' : dv.assignee;
          recordAction(icse, 'reassigned', {
            previousValue: prevAs, newValue: dv.assignee, reason: dv.reason.trim(),
            metadata: { statusPreserved: invStatusLabel(icse) },
            summary: meUser().name + ' reassigned the case from ' + prevAs + ' to ' + dv.assignee + ' — ' + dv.reason.trim()
          });
          closeModal(); rerender();
          toast('Reassigned to ' + dv.assignee + '.');
        } else if (im.iaType === 'share') {
          var sel = (im.evd || []).filter(function (x) { return x.on; }).map(function (x) { return x.label; });
          if (!dv.recipient) { im.warn = true; renderModal(); toast('Select a recipient.'); return; }
          if (!sel.length) { toast('Select at least one evidence item.'); return; }
          recordAction(icse, 'evidence_shared', {
            previousValue: null, newValue: dv.recipient, notes: dv.message || null,
            metadata: { evidence: sel, linkExpiration: dv.expiry, delivery: 'Secure link created (prototype demonstration)' },
            summary: meUser().name + ' shared ' + sel.length + ' evidence item' + (sel.length > 1 ? 's' : '') + ' with ' + dv.recipient + ' — controlled link, expires in ' + dv.expiry
          });
          closeModal(); rerender();
          toast('Secure evidence link created for prototype demonstration.');
        }
        return;
      }
      case 'why-calc': {
        var wc = findCase(parts[1]);
        if (wc) { wc.whyCalcOpen = !wc.whyCalcOpen; renderPanel(); }
        return;
      }
      case 'modal-close': closeModal(); return;

      case 'panel-close': state.openId = null; renderPanel(); return;
      case 'panel-prev': movePanel(-1); return;
      case 'panel-next': movePanel(1); return;
      case 'panel-more': openMoreMenu(t, state.openId, true); return;
      case 'helpful': setFeedback(parts[1], 'up'); return;
      case 'nothelpful': setFeedback(parts[1], 'down'); return;
      case 'status-edit': openStatusMenu(t, parts[1]); return;
      case 'set-status': setStatus(parts[1], parts[2].replace(/_/g, ' ')); return;
      case 'resolve': setStatus(parts[1], 'Resolved'); return;
      case 'sev-edit': openSevMenu(t, parts[1]); return;
      case 'set-sev': setSeverity(parts[1], parts[2]); return;
      case 'assignee-edit': openAssigneeMenu(t, parts[1]); return;
      case 'set-assignee': setAssignee(parts[1], decodeURIComponent(parts[2])); return;
      case 'clip': openEvidence(parts[1], parseInt(parts[2], 10)); return;
      case 'playclips': openEvidence(parts[1], 0); return;

      /* evidence drawer */
      case 'ev-close': closeEvidence(); return;
      case 'ev-prev': case 'ev-next': {
        var ed = state.evidence; if (!ed) return;
        var ec = findCase(ed.caseId); if (!ec) return;
        var eni = ed.index + (cmd === 'ev-next' ? 1 : -1);
        if (eni < 0 || eni >= ec.evidence.length) return;
        stopEvTimer();
        ed.index = eni; ed.playing = false; ed.t = evDefaultT(ec, ec.evidence[eni]); ed.pendingSeekSec = null;
        renderEvidence();
        return;
      }
      case 'ev-view': { if (state.evidence) { state.evidence.view = parts[1]; renderEvidence(); } return; }
      case 'ev-play': {
        var ep2 = state.evidence; if (!ep2) return;
        var rv = evPrimaryVideo();
        if (rv) { // native element owns playback for real footage
          if (rv.paused) { var pp = rv.play(); if (pp && pp.catch) pp.catch(function () {}); }
          else rv.pause();
          return;
        }
        ep2.playing = !ep2.playing;
        if (ep2.playing) { if (ep2.t >= 1) ep2.t = 0; startEvTimer(); } else stopEvTimer();
        renderEvidence();
        return;
      }
      case 'ev-scrub': {
        var esb = state.evidence; if (!esb || !e) return;
        var sr = t.getBoundingClientRect();
        if (!sr.width) return;
        esb.t = Math.min(1, Math.max(0, (e.clientX - sr.left) / sr.width));
        var sv = evPrimaryVideo();
        if (sv && sv.readyState >= 1 && isFinite(sv.duration) && sv.duration > 0) sv.currentTime = esb.t * sv.duration;
        syncEvidencePlayhead();
        return;
      }
      case 'ev-frame': {
        var efr = state.evidence; if (!efr) return;
        var efc = findCase(efr.caseId); if (!efc) return;
        var flist = evFrames(efc, efc.evidence[efr.index]);
        var fobj = flist[parseInt(parts[1], 10)];
        if (!fobj || fobj.timeSeconds == null) return;
        seekEvidenceTo(fobj.timeSeconds);
        return;
      }
      case 'ev-volume': toast('Audio on — cab mic synced to playback.'); return;
      case 'ev-download': toast('Clip export started — shared as a secure link, access logged to the case.'); return;
      case 'prompt': toast('Asked Clarity — answer coming to the chat.'); return;
      case 'entity': toast('Opening driver profile…'); return;
      case 'reco-primary': { var cc = findCase(parts[1]); toast(cc.recommended.primary + ' — done.'); setStatus(parts[1], 'Resolved'); return; }
      case 'other': { var c2 = findCase(parts[1]); var o = (c2._recoOthers || c2.recommended.others)[parseInt(parts[2], 10)]; toast(((o && o.title) || 'Action') + ' — done.'); return; }
      case 'defer': deferCase(parts[1]); return;
      case 'dismiss': dismissCase(parts[1]); return;
      case 'moveback': undefer(parts[1]); return;
      case 'activity-tab': state.activityTab = parts[1]; renderPanel(); return;
      case 'add-note': addNote(parts[1]); return;
      case 'save': { var c3 = findCase(parts[1]); c3.saved = !c3.saved; closePop(); toast(c3.saved ? 'Case saved.' : 'Removed from saved.'); return; }
      case 'export': closePop(); exportSummary(parts[1]); return;

      case 'pop-close': closePop(); return;
      case 'undo': { var fn = undoRegistry[parts.slice(1).join(':')]; if (fn) fn(); closePop(); return; }
      case 'noop': return;
    }
  }

  /* ── mutations ────────────────────────────────────────────────────────── */
  function rerender() { if (state.view === 'cases') refreshQueueOnly(); if (state.openId) renderPanel(); }
  function logView(id) { /* view logging kept in seeded activity for demo */ }
  function doPrimary(id) {
    var c = findCase(id);
    toast(c.primaryAction + ' — done.');
    setStatus(id, 'Resolved', true);
  }
  function setFeedback(id, v) { var c = findCase(id); c.feedback = c.feedback === v ? null : v; renderPanel(); }
  function setStatus(id, status, keepOpen) {
    var c = findCase(id); c.status = status; closePop();
    if (status === 'Resolved') {
      c.resolved = true; c.deferred = false;
      c.extra.unshift({ text: 'Marked resolved', meta: 'Just now · ' + meUser().name, kind: 'note' });
      if (!keepOpen) state.openId = null;
      toast('Case resolved — moved to history.', function () { c.resolved = false; c.status = 'In review'; rerender(); toast('Restored to the queue.'); });
    } else { toast('Status set to ' + status + '.'); }
    rerender();
  }
  function setSeverity(id, sev) { var c = findCase(id); c.severity = sev; closePop(); rerender(); toast('Severity set to ' + sev + '.'); }
  function setAssignee(id, key) {
    var c = findCase(id);
    c.assignee = key === 'me' ? 'me' : key;
    closePop(); rerender();
    toast('Reassigned to ' + (key === 'me' ? meUser().name : key) + '.');
  }
  function deferCase(id) {
    var c = findCase(id); if (isCritical(c)) return;
    c.deferred = true; c.status = 'Deferred'; closePop(); state.openId = null; rerender();
    toast('Deferred for later.', function () { c.deferred = false; c.status = 'Open'; rerender(); toast('Moved back to the queue.'); });
  }
  function undefer(id) { var c = findCase(id); c.deferred = false; c.status = 'Open'; rerender(); toast('Moved back to the queue.'); }
  function dismissCase(id) {
    var c = findCase(id); if (isCritical(c)) return;
    c.dismissed = true; c.status = 'Dismissed'; closePop(); state.openId = null; rerender();
    toast('Case dismissed.', function () { c.dismissed = false; c.status = 'Open'; rerender(); toast('Case restored.'); });
  }
  function addNote(id) {
    var ta = qs('#dt-note-' + id); if (!ta) return;
    var v = ta.value.trim(); if (!v) return;
    var c = findCase(id);
    c.notes.unshift({ text: v, meta: 'Just now · ' + meUser().name, kind: 'note' });
    renderPanel();
    toast('Note added.');
  }
  function movePanel(dir) {
    var info = openIndexInfo();
    if (info.idx < 0) return; // e.g. opened from the Deferred list — not in the visible queue
    var ni = info.idx + dir;
    if (ni < 0 || ni >= info.list.length) return;
    state.openId = info.list[ni].id; renderPanel();
  }
  function exportSummary(id) {
    var c = findCase(id);
    var text = 'CASE #' + c.code + ' — ' + c.title + '\n' +
      'Category: ' + c.category + ' | Severity: ' + c.severity + ' | Status: ' + c.status + '\n\n' +
      'WHAT HAPPENED\n' + c.whatHappened.entity + c.whatHappened.text + '\n\n' +
      (c.context.length ? 'OPERATIONAL CONTEXT\n- ' + c.context.join('\n- ') + '\n\n' : '') +
      'RECOMMENDED ACTION\n' + c.recommended.text + '\n';
    try {
      var blob = new Blob([text], { type: 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = c.code + '-summary.txt';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Summary exported.');
    } catch (e) { toast('Summary ready.'); }
  }

  /* ── Geotab live context ──────────────────────────────────────────────── */
  function loadLiveContext() {
    if (!api || typeof api.getSession !== 'function') return; // standalone / preview
    try {
      api.getSession(function (session) {
        state.live.connected = true;
        var login = session && session.userName ? session.userName : null;
        renderLiveBadge();
        if (login) {
          api.call('Get', { typeName: 'User', search: { name: login } }, function (users) {
            if (users && users[0]) {
              var u = users[0];
              var full = ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || login;
              var me = meUser();
              me.name = full + ' (me)';
              me.initials = (initialsOf(full) || login.slice(0, 2)).toUpperCase();
              if (state.view === 'cases') refreshQueueOnly();
              if (state.openId) renderPanel();
            }
          }, function () {});
        }
        api.call('Get', { typeName: 'Device', resultsLimit: 5000 }, function (devs) {
          state.live.deviceCount = devs ? devs.length : null; renderLiveBadge();
        }, function () {});
      }, function () {});
    } catch (e) { /* stay in demo mode */ }
  }
  function renderLiveBadge() {
    var b = root.querySelector('.dt-live');
    if (b) {
      var h = liveBadgeHtml();
      if (h) b.outerHTML = h; else b.remove();
    } else if (state.view === 'cases') {
      // no badge in the DOM yet (e.g. it appears once the Geotab session connects)
      refreshQueueOnly();
    }
  }

  return { mount: mount, unmount: unmount, evaluateCollisionCandidate: evaluateCollisionCandidate };
})();
