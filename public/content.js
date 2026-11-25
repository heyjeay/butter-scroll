// butter-scroll: the krp_phone scroll feel (html/js/touch.js) for any website.
//  - wheel: each notch moves a target, the page eases toward it every frame (1 - e^(-dt / smoothness)),
//    notches that land mid-glide add to where it was heading
//  - rubber band: past either end the content stretches a little and springs back (iOS curve)
//  - drag to scroll (opt-in): hold the mouse and throw the page like a finger, momentum on release
// Plain JS on purpose: it runs inside other people's pages, so no framework and nothing global but one flag.
(function () {
  'use strict';
  const debug = false;
  const log = (...a) => { if (debug) console.log('[butter-scroll]', ...a); };

  // One engine per page. A newer copy (the extension was reloaded or updated, or the background worker
  // injected it into an already open tab) asks the old one to stand down instead of being turned away:
  // the old copy's chrome.* is dead after a reload, so it could no longer hear settings change.
  window.dispatchEvent(new CustomEvent('butter-scroll:takeover'));
  const life = new AbortController();
  const on = (target, type, fn, opts) =>
    target.addEventListener(type, fn, { ...(typeof opts === 'boolean' ? { capture: opts } : opts), signal: life.signal });
  window.__butterScroll = true;

  const DEFAULTS = {
    enabled: true,
    smoothness: 110,   // ms; bigger = softer glide (krp_phone: 110)
    stepScale: 1,      // multiplies how far one wheel notch goes
    bounce: true,      // rubber band at the ends
    dragScroll: false, // hold and drag the page like a phone
    trackpad: false,   // also smooth trackpads / free-spin wheels (they are usually smooth already)
    disabledSites: [],
  };
  const SPRING = '.45s cubic-bezier(.25,1,.5,1)';
  const LATCH_MS = 300;        // a notch this soon after the last stays on a scroller that is still on its way
  const DRAG_START = 7;        // px the mouse travels before a press becomes a drag
  // Pressed on one of these, the mouse is not a finger: real controls and things with their own drag.
  // Links, images and thumbnail videos are NOT here: like a phone, a tap still opens them and a drag scrolls
  // (Chrome's own link/image drag-and-drop is cancelled while a press is pending)
  const DRAG_SKIP = 'input, textarea, select, button, label, summary, video[controls], audio, canvas, iframe, embed, object, [contenteditable=""], [contenteditable="true"], [draggable="true"], [role="slider"], [role="scrollbar"], [role="button"]:not(a), [role="textbox"]';

  // the site being visited (an iframe follows the tab it sits in, so the popup's per-site switch covers it)
  const host = (() => {
    try {
      const anc = location.ancestorOrigins;
      return anc && anc.length ? new URL(anc[anc.length - 1]).hostname : location.hostname;
    } catch (err) { return location.hostname; }
  })();
  const allowSynthetic = debug || !!(document.documentElement && document.documentElement.hasAttribute('data-butter-test'));

  let cfg = { ...DEFAULTS };
  let active = false;
  function applySettings(stored) {
    cfg = { ...DEFAULTS, ...(stored || {}) };
    const was = active;
    active = !!cfg.enabled && !(cfg.disabledSites || []).includes(host);
    if (was && !active) stopEverything();
    if (!cfg.dragScroll) endPress();
    log('settings', host, active, cfg);
  }
  // pages that already run their own smooth scroll (Lenis, Locomotive, GSAP ScrollSmoother) keep it
  function pageScrollsItself() {
    const h = document.documentElement;
    return h.classList.contains('lenis') || h.classList.contains('has-scroll-smooth') ||
      h.classList.contains('has-scroll-init') || !!document.getElementById('smooth-wrapper');
  }

  // ---------------------------------------------------------------- scroll geometry
  const root = () => document.scrollingElement || document.documentElement;
  const posOf = (el, axis) => (axis === 'y' ? el.scrollTop : el.scrollLeft);
  const maxOf = (el, axis) => Math.max(0, axis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth);
  const dimOf = (el, axis) => (el === root() ? (axis === 'y' ? innerHeight : innerWidth) : (axis === 'y' ? el.clientHeight : el.clientWidth));
  // 'instant' so a page's `scroll-behavior: smooth` does not turn every frame into its own animation
  const TOP = { top: 0, behavior: 'instant' }, LEFT = { left: 0, behavior: 'instant' };
  function write(el, axis, v) {
    if (axis === 'y') { TOP.top = v; el.scrollTo(TOP); } else { LEFT.left = v; el.scrollTo(LEFT); }
  }

  function rootScrolls(axis) {
    const html = document.documentElement, body = document.body;
    const prop = axis === 'y' ? 'overflowY' : 'overflowX';
    const ho = getComputedStyle(html)[prop];
    const vo = ho !== 'visible' || !body ? ho : getComputedStyle(body)[prop]; // the viewport takes body's when html's is visible
    return vo !== 'hidden' && vo !== 'clip' && maxOf(root(), axis) > 1;
  }

  // where a wheel event over `path` should go: { el, chain } or null (leave it to the browser)
  // the innermost scroller that can still move that way wins; one at its end passes it outward like the browser does
  function findScroller(path, axis, dir) {
    const overflow = axis === 'y' ? 'overflowY' : 'overflowX';
    const html = document.documentElement, body = document.body;
    let stuck = null; // innermost scroller that could take it but is at its end
    // <body> is an ordinary scroller when <html> clips (html { overflow: hidden } body { overflow: auto })
    const bodyIsViewport = getComputedStyle(html)[overflow] === 'visible';
    for (const node of path) {
      if (!(node instanceof Element) || node === html || (node === body && bodyIsViewport)) continue;
      if (node.localName === 'select') return null;
      const cs = getComputedStyle(node);
      if (!/(auto|scroll|overlay)/.test(cs[overflow])) continue;
      if (maxOf(node, axis) <= 1) continue;
      if (cs.scrollSnapType && cs.scrollSnapType !== 'none') return null; // snapping fights a glide; the browser does it right
      if (canMove(node, axis, dir)) return { el: node };
      if (!stuck) stuck = node;
      const ob = axis === 'y' ? cs.overscrollBehaviorY : cs.overscrollBehaviorX;
      if (ob !== 'auto') return { el: node, noBounce: ob === 'none' };
    }
    if (body && document.contains(body) && rootScrolls(axis)) {
      const r = root();
      if (canMove(r, axis, dir) || !stuck) {
        const hcs = getComputedStyle(html);
        if (hcs.scrollSnapType !== 'none' || (bodyIsViewport && getComputedStyle(body).scrollSnapType !== 'none')) return null; // a snapping page
        const ob = hcs[axis === 'y' ? 'overscrollBehaviorY' : 'overscrollBehaviorX'];
        return { el: r, noBounce: ob === 'none' };
      }
    }
    return stuck ? { el: stuck } : null;
  }
  // can `el` still move toward dir (+1 = end)? a glide in flight counts from where it is heading
  function canMove(el, axis, dir) {
    const g = glides.get(el);
    const at = g && g.axis === axis ? g.target : posOf(el, axis);
    return dir > 0 ? at < maxOf(el, axis) - 1 : at > 0;
  }

  // ---------------------------------------------------------------- stretch / spring back
  // inner scrollers move with a transform (stacked in front of their own), the page itself moves its <body>
  // with a relative offset: a transform on <body> would drag every position:fixed header along with it
  const stretched = new Map(); // scroller -> { t, isRoot, axis, px, base, baseOff, saved, restoreTimer, bumpTimer }
  function setStretch(el, axis, px, transition) {
    let s = stretched.get(el);
    if (!s) {
      if (!px) return;
      const isRoot = el === root();
      const t = isRoot ? document.body : el;
      if (!t) return;
      const cs = getComputedStyle(t);
      if (isRoot && cs.position !== 'static' && cs.position !== 'relative') return;
      s = {
        t, isRoot, axis, px: 0, restoreTimer: 0, bumpTimer: 0,
        saved: { transform: t.style.transform, transition: t.style.transition, position: t.style.position, top: t.style.top, left: t.style.left },
        base: isRoot || cs.transform === 'none' ? '' : ' ' + cs.transform,
        baseOff: isRoot && cs.position === 'relative' ? parseFloat(axis === 'y' ? cs.top : cs.left) || 0 : 0,
      };
      if (isRoot && cs.position === 'static') t.style.position = 'relative';
      stretched.set(el, s);
    }
    clearTimeout(s.restoreTimer);
    s.px = px;
    const prop = s.isRoot ? (s.axis === 'y' ? 'top' : 'left') : 'transform';
    s.t.style.transition = transition ? `${prop} ${transition}` : 'none';
    if (s.isRoot) s.t.style[prop] = `${s.baseOff + px}px`;
    else s.t.style.transform = `${s.axis === 'y' ? 'translateY' : 'translateX'}(${px}px)${s.base}`;
  }
  function springBack(el) {
    const s = stretched.get(el);
    if (!s) return;
    clearTimeout(s.bumpTimer);
    setStretch(el, s.axis, 0, SPRING);
    s.restoreTimer = setTimeout(() => restore(el), 470);
  }
  function restore(el) {
    const s = stretched.get(el);
    if (!s) return;
    clearTimeout(s.restoreTimer);
    clearTimeout(s.bumpTimer);
    Object.assign(s.t.style, s.saved);
    stretched.delete(el);
  }
  // iOS's rubber band: the further past the end, the less it follows
  const rubber = (x, dim) => (1 - 1 / ((Math.abs(x) * 0.55) / dim + 1)) * dim * Math.sign(x);

  // ---------------------------------------------------------------- wheel glide
  const glides = new Map(); // scroller -> { el, axis, pos, target, set, last }
  let raf = 0;
  function tick(now) {
    raf = 0;
    const ease = Math.max(16, cfg.smoothness);
    for (const g of glides.values()) {
      if (!g.el.isConnected) { glides.delete(g.el); continue; }
      // the page shifted under the glide (scroll anchoring as a header collapses or posts load above,
      // a site nudging its own scroll): ride along instead of fighting it or giving up.
      // The user grabbing the scrollbar or pressing keys stops the glide on its own (pointerdown / keydown)
      const drift = posOf(g.el, g.axis) - g.set;
      if (Math.abs(drift) > 1) { g.pos += drift; g.target += drift; log('glide drift', drift); }
      const dt = g.last === null ? 16 : Math.max(0, Math.min(40, now - g.last));
      g.last = now;
      g.target = Math.max(0, Math.min(g.target, maxOf(g.el, g.axis))); // the content may have shrunk
      g.pos += (g.target - g.pos) * (1 - Math.exp(-dt / ease)); // pos is kept here: scrollTop rounds
      const done = Math.abs(g.target - g.pos) < 0.5;
      write(g.el, g.axis, done ? g.target : g.pos);
      g.set = posOf(g.el, g.axis);
      if (done) glides.delete(g.el);
    }
    if (glides.size) raf = requestAnimationFrame(tick);
  }
  function glideBy(el, axis, delta) {
    let g = glides.get(el);
    if (g && g.axis !== axis) { glides.delete(el); g = null; }
    if (!g) {
      const p = posOf(el, axis);
      g = { el, axis, pos: p, target: p, set: p, last: null };
      glides.set(el, g);
    }
    g.target = Math.max(0, Math.min(maxOf(el, axis), g.target + delta));
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function stopGlides() {
    glides.clear();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  // a real mouse wheel moves in notches of 120; trackpads and free-spin wheels send small uneven steps
  function looksLikeTrackpad(e) {
    if (e.deltaMode !== 0) return false;
    const wd = Math.abs(e.wheelDeltaY) || Math.abs(e.wheelDeltaX);
    return !!wd && wd % 120 !== 0;
  }

  let latch = null; // { ref: WeakRef(scroller), hit, axis, at }: weak, so a removed SPA view is not kept alive
  function onWheel(e) {
    if (!alive()) { teardown(); return; }
    if (!active || e.defaultPrevented || e.ctrlKey || e.metaKey) return; // ctrl+wheel is zoom
    if (!e.isTrusted && !allowSynthetic) return;
    if (!cfg.trackpad && looksLikeTrackpad(e)) return;
    if (pageScrollsItself()) return;

    let dx = e.deltaX, dy = e.deltaY;
    if (e.shiftKey && dy && !dx) { dx = dy; dy = 0; } // shift+wheel scrolls sideways
    const axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
    let delta = axis === 'y' ? dy : dx;
    if (!delta) return;
    const path = e.composedPath();
    const now = performance.now();

    // Stay on the scroller the last notch went to while it still has somewhere to go (so a box sliding
    // under the cursor mid-glide does not steal the scroll). Once its glide is already headed for the end,
    // look again so the rest chains outward like Chrome does: holding on trapped the wheel on any element
    // that could only scroll a few pixels (overflow-x: hidden quietly makes overflow-y auto).
    let hit = null;
    const dir = Math.sign(delta);
    const latched = latch && latch.axis === axis && now - latch.at < LATCH_MS && latch.ref.deref();
    if (latched && latched.isConnected && path.includes(latched) && canMove(latched, axis, dir)) {
      hit = { el: latched, noBounce: latch.noBounce };
    } else hit = findScroller(path, axis, dir);
    if (!hit) { latch = null; return; }
    latch = { ref: new WeakRef(hit.el), noBounce: hit.noBounce, axis, at: now };

    const el = hit.el;
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? dimOf(el, axis) * 0.875 : 1;
    delta *= unit * cfg.stepScale;
    e.preventDefault(); // the glide does the scrolling instead of the browser's jump
    stopFling();

    if (!canMove(el, axis, Math.sign(delta))) {
      if (glides.has(el)) return; // still gliding to the end: bump once it has arrived
      if (!cfg.bounce || hit.noBounce) return;
      const s0 = stretched.get(el);
      const atStart = delta < 0;
      const px = Math.max(-60, Math.min(60, ((s0 && s0.px) || 0) + (atStart ? 1 : -1) * Math.min(30, Math.abs(delta) * 0.18)));
      setStretch(el, axis, px);
      const s = stretched.get(el);
      if (s) { clearTimeout(s.bumpTimer); s.bumpTimer = setTimeout(() => springBack(el), 110); }
      return;
    }
    if (stretched.has(el)) springBack(el);
    glideBy(el, axis, delta);
  }
  on(window, 'wheel', onWheel, { passive: false }); // bubbling: a page that handles the wheel itself goes first

  // ---------------------------------------------------------------- drag to scroll + momentum (opt-in)
  let fling = null;
  function stopFling() { if (fling) { cancelAnimationFrame(fling.raf); fling = null; } }
  function startFling(el, axis, v) { // v: px per ms, positive = toward the end
    stopFling();
    let last = null;
    const f = { raf: 0 };
    fling = f;
    const step = (now) => {
      if (fling !== f) return;
      if (!el.isConnected) { fling = null; return; }
      const dt = last === null ? 16 : Math.max(0, Math.min(40, now - last)); // a frame's timestamp can be older than the release
      last = now;
      const max = maxOf(el, axis);
      const next = Math.max(0, Math.min(max, posOf(el, axis) + v * dt));
      write(el, axis, next);
      v *= Math.pow(0.9975, dt); // slows about like iOS
      const hitEnd = (v < 0 && next <= 0) || (v > 0 && next >= max - 1);
      if (hitEnd && Math.abs(v) > 0.25 && cfg.bounce) { // still moving at the end: bounce off it
        setStretch(el, axis, -Math.sign(v) * Math.min(dimOf(el, axis) * 0.06, Math.abs(v) * 34), '.14s ease-out');
        const s = stretched.get(el);
        if (s) { clearTimeout(s.bumpTimer); s.bumpTimer = setTimeout(() => springBack(el), 140); }
        fling = null;
        return;
      }
      if (hitEnd || Math.abs(v) < 0.02) { fling = null; return; }
      f.raf = requestAnimationFrame(step);
    };
    f.raf = requestAnimationFrame(step);
  }

  let press = null; // { id, x, y, axis, el, from, samples, dragging }
  let swallowClickUntil = 0;
  let dragStyle = null;
  function ensureDragStyle() {
    if (dragStyle && dragStyle.isConnected) return;
    dragStyle = document.createElement('style');
    dragStyle.textContent = 'html.butter-dragging, html.butter-dragging * { user-select: none !important; cursor: grabbing !important; }';
    (document.head || document.documentElement).appendChild(dragStyle);
  }
  function onScrollbar(t, e) {
    if (t === document.documentElement || t === document.scrollingElement) {
      return e.clientX >= document.documentElement.clientWidth || e.clientY >= document.documentElement.clientHeight;
    }
    if (!t.clientWidth || (t.scrollHeight <= t.clientHeight && t.scrollWidth <= t.clientWidth)) return false;
    const r = t.getBoundingClientRect();
    return e.clientX - r.left - t.clientLeft >= t.clientWidth || e.clientY - r.top - t.clientTop >= t.clientHeight;
  }
  function endPress() {
    if (!press) return;
    if (press.dragging) document.documentElement.classList.remove('butter-dragging');
    press = null;
  }

  on(window, 'pointerdown', (e) => {
    stopGlides(); // a click on a scrollbar (or anything) mid-glide: stop where it is
    stopFling();
    if (!active || !cfg.dragScroll || e.pointerType !== 'mouse' || e.button !== 0) return;
    const t = e.composedPath()[0];
    const path = e.composedPath();
    if (!(t instanceof Element) || pageScrollsItself()) return;
    if (path.some((n) => n instanceof Element && n.matches(DRAG_SKIP))) return; // the path crosses shadow roots, closest() does not
    if (onScrollbar(t, e)) return; // dragging a scrollbar thumb is the browser's job

    press = { id: e.pointerId, x: e.clientX, y: e.clientY, path, dragging: false, samples: [[performance.now(), e.clientX, e.clientY]] };
  }, true);

  on(window, 'pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    press.samples.push([performance.now(), e.clientX, e.clientY]);
    if (press.samples.length > 12) press.samples.shift();
    if (!press.dragging) {
      if (Math.abs(dx) < DRAG_START && Math.abs(dy) < DRAG_START) return;
      const axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
      const hit = findScroller(press.path, axis, axis === 'y' ? -Math.sign(dy) : -Math.sign(dx));
      if (!hit) { press = null; return; }
      press.dragging = true;
      press.axis = axis;
      press.el = hit.el;
      press.noBounce = hit.noBounce;
      press.from = posOf(hit.el, axis) + (axis === 'y' ? dy : dx); // carry on from here, no jump
      press.path = null;
      ensureDragStyle();
      document.documentElement.classList.add('butter-dragging');
      const sel = window.getSelection && window.getSelection();
      if (sel) sel.removeAllRanges();
      try { document.documentElement.setPointerCapture(press.id); } catch (err) { /* already gone */ }
      log('drag', axis);
    }
    const el = press.el, axis = press.axis;
    const max = maxOf(el, axis);
    const want = press.from - (axis === 'y' ? dy : dx);
    const clamped = Math.max(0, Math.min(max, want));
    write(el, axis, clamped);
    const past = want - clamped; // > 0 past the end, < 0 past the start
    if (cfg.bounce && !press.noBounce) setStretch(el, axis, past ? -rubber(past, dimOf(el, axis)) : 0);
  }, true);

  // px per ms over the moves of the last 120 ms, positive = the mouse moved right / down
  function velocity(p) {
    const now = performance.now();
    const sm = p.samples.filter((x) => now - x[0] < 120);
    const a = sm[0], b = sm[sm.length - 1];
    if (!a || b[0] - a[0] < 8) return 0; // held still before letting go: no fling
    return (p.axis === 'y' ? b[2] - a[2] : b[1] - a[1]) / (b[0] - a[0]);
  }
  function release(e) {
    if (!press || e.pointerId !== press.id) return;
    const p = press;
    endPress();
    if (!p.dragging) return;
    swallowClickUntil = Date.now() + 350; // the click that follows a drag is not a tap
    if (stretched.has(p.el)) { springBack(p.el); return; }
    const v = velocity(p);
    if (Math.abs(v) > 0.1) startFling(p.el, p.axis, -v);
  }
  on(window, 'pointerup', release, true);
  on(window, 'pointercancel', release, true);
  on(window, 'click', (e) => {
    if (Date.now() < swallowClickUntil) { swallowClickUntil = 0; e.stopPropagation(); e.preventDefault(); }
  }, true);
  // Chrome starts dragging a link or image after ~4 px, before a press becomes a scroll at 7 px: with drag
  // to scroll on, a press on a thumbnail is a finger, so that native drag is cancelled (draggable="true"
  // elements, the ones a site built drag-and-drop around, never start a press in the first place)
  on(window, 'dragstart', (e) => { if (press) e.preventDefault(); }, true);

  // keys and the scrollbar move the page themselves; a glide in flight would fight them
  const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
  on(window, 'keydown', (e) => { if (glides.size && SCROLL_KEYS.has(e.key)) stopGlides(); }, true);

  function stopEverything() {
    stopGlides();
    stopFling();
    endPress();
    for (const el of [...stretched.keys()]) restore(el);
    latch = null;
  }
  on(window, 'pagehide', stopEverything);
  on(window, 'blur', endPress); // the button can come up in another window: no stuck drag

  // last, so everything applySettings touches exists
  const store = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
  // after the extension is reloaded or removed, this copy's chrome.runtime goes dead: it then steps aside
  function alive() {
    try { return !store || !!chrome.runtime.id; } catch (err) { return false; }
  }
  function onStorage(changes, area) {
    if (area === 'sync' && alive()) store.get(DEFAULTS).then(applySettings, () => {});
  }
  function teardown() {
    log('teardown');
    stopEverything();
    active = false;
    life.abort(); // drops every listener added through on()
    try { if (store) chrome.storage.onChanged.removeListener(onStorage); } catch (err) { /* context gone */ }
  }
  on(window, 'butter-scroll:takeover', teardown);
  if (store) {
    store.get(DEFAULTS).then(applySettings, () => applySettings());
    chrome.storage.onChanged.addListener(onStorage);
  } else applySettings();
})();
