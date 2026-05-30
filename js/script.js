/* =============================================================
   Scott's Apps — render & interactions
   ============================================================= */

const GRID = document.getElementById('grid');
const THEME_TOGGLE = document.getElementById('theme-toggle');
const ROOT = document.documentElement;

const ICON_SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;

const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

const ICON_COLLAPSE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>`;

const ICON_OPEN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>`;

// Lightbox chrome
const ICON_ZOOM = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>`;
const ICON_LB_CLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const ICON_CHEVRON_L = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`;
const ICON_CHEVRON_R = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`;

/* -------------------------- Theme -------------------------- */

function applyTheme(theme) {
  ROOT.setAttribute('data-theme', theme);
  THEME_TOGGLE.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
  THEME_TOGGLE.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  localStorage.setItem('theme', theme);
}

function initTheme() {
  // The theme is applied before first paint by the inline bootstrap in
  // index.html (so there's no flash). Mirror that resolved value into the
  // toggle icon, aria-label, and storage.
  const current = ROOT.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current);
}

THEME_TOGGLE.addEventListener('click', () => {
  const next = ROOT.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

/* -------------------------- Data --------------------------- */

function loadWebsites() {
  if (!Array.isArray(window.WEBSITES)) {
    throw new Error('websites.js is missing or does not define window.WEBSITES as an array.');
  }
  return window.WEBSITES;
}

// Candidate extensions, tried in order. First one that loads wins.
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'bmp'];

function imageExists(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// Probes `<base>.<ext>` for each known extension; resolves to the first URL
// that loads, or null if none do.
async function findImage(base) {
  for (const ext of IMAGE_EXTS) {
    const url = `${base}.${ext}`;
    if (await imageExists(url)) return url;
  }
  return null;
}

async function detectScreenshots(slug, max = 12) {
  const found = [];
  for (let i = 1; i <= max; i++) {
    const url = await findImage(`images/${slug}/${i}`);
    if (!url) break;
    found.push(url);
  }
  return found;
}

async function getScreenshots(site) {
  if (typeof site.screenshots === 'number' && site.screenshots > 0) {
    const urls = await Promise.all(
      Array.from({ length: site.screenshots }, (_, i) =>
        findImage(`images/${site.id}/${i + 1}`)
      )
    );
    return urls.filter(Boolean);
  }
  return await detectScreenshots(site.id);
}

/* ------------------------ Rendering ------------------------ */

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPanel(site, screenshots, iconUrl, index) {
  const panel = document.createElement('article');
  panel.className = 'panel';
  panel.dataset.slug = site.id;
  panel.style.animationDelay = `${Math.min(index * 60, 400)}ms`;
  panel.setAttribute('tabindex', '0');
  panel.setAttribute('role', 'button');
  panel.setAttribute('aria-expanded', 'false');
  panel.setAttribute('aria-label', `${site.name}. Click to expand.`);

  const iconInner = iconUrl
    ? `<img class="panel__icon" src="${iconUrl}" alt="">`
    : `<div class="panel__icon panel__icon--fallback">${escapeHtml(site.name.charAt(0).toUpperCase())}</div>`;

  const screenshotsHtml = screenshots.length
    ? `<div class="screenshots-block">
         <p class="screenshots__label">Preview</p>
         <div class="screenshots" role="region" aria-label="Screenshots">
           ${screenshots.map((s, i) => `<button class="screenshot" type="button" data-index="${i}" aria-label="View ${escapeHtml(site.name)} screenshot ${i + 1} full screen"><img class="screenshot__img" src="${s}" alt="${escapeHtml(site.name)} screenshot ${i + 1}" loading="lazy" draggable="false"><span class="screenshot__zoom" aria-hidden="true">${ICON_ZOOM}</span></button>`).join('')}
         </div>
       </div>`
    : '';

  // A second copy of the short description, shown only in the mobile expanded
  // layout below the header (above the preview). The header copy is hidden when
  // expanded on mobile; on desktop this copy stays hidden. See components.css.
  const expandedDescriptionHtml = site.shortDescription
    ? `<p class="panel__description panel__description--expanded">${escapeHtml(site.shortDescription)}</p>`
    : '';

  // Open button rendered inside the title block. Hidden by default; the mobile
  // expanded layout reveals it under the title (where the short description sat)
  // and hides the bottom .panel__actions copy instead.
  const headerOpenHtml = `<a class="panel__open panel__open--header" href="${escapeHtml(site.link)}" target="_blank" rel="noopener noreferrer">Open ${ICON_OPEN}</a>`;

  // fullDescription is pre-escaped, safe HTML written by editor.pyw: all text
  // is HTML-escaped there and only <strong>/<em>/<u>/<s> tags are emitted, so it
  // is injected as-is (not re-escaped) to render formatting. Exact whitespace
  // (spaces/tabs/newlines) is preserved by `white-space: pre-wrap` in the CSS.
  const fullDescriptionHtml = site.fullDescription
    ? `<p class="panel__full-description">${site.fullDescription}</p>`
    : '';

  panel.innerHTML = `
    <button class="panel__close" aria-label="Collapse panel" type="button">${ICON_COLLAPSE}</button>
    <div class="panel__header">
      <div class="panel__icon-wrap">${iconInner}</div>
      <div class="panel__title-block">
        <h2 class="panel__name">${escapeHtml(site.name)}</h2>
        <p class="panel__description">${escapeHtml(site.shortDescription || '')}</p>
        ${headerOpenHtml}
      </div>
    </div>
    <div class="panel__expanded-content">
      <div class="panel__expanded-inner">
        ${expandedDescriptionHtml}
        ${screenshotsHtml}
        ${fullDescriptionHtml}
        <div class="panel__actions">
          <a class="panel__open" href="${escapeHtml(site.link)}" target="_blank" rel="noopener noreferrer">
            Open
            ${ICON_OPEN}
          </a>
        </div>
      </div>
    </div>
  `;

  // Click logic
  panel.addEventListener('click', (e) => {
    // Open button → let link fire, do not toggle
    if (e.target.closest('.panel__open')) return;

    // Screenshot → open the full-screen viewer at that image
    const shot = e.target.closest('.screenshot');
    if (shot) {
      openLightbox(screenshots, Number(shot.dataset.index) || 0, shot);
      return;
    }

    // Close button → collapse
    if (e.target.closest('.panel__close')) {
      collapsePanel(panel);
      return;
    }

    // Click within an already-expanded panel → ignore
    if (panel.classList.contains('panel--expanded')) return;

    expandPanel(panel);
  });

  // Keyboard: Enter / Space
  panel.addEventListener('keydown', (e) => {
    if (panel.classList.contains('panel--expanded')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expandPanel(panel);
    }
  });

  return panel;
}

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Resting gap between an expanded panel's top edge and the top of the viewport.
const TOP_GAP = 12;
// Mirror of --t-expand / --ease-out (css/variables.css). The scroll choreography
// below runs with this exact duration and curve so the page travel stays locked
// to the panel's height transition — they read as one motion. Keep in sync.
const EXPAND_MS = 500;
const EXPAND_EASE = cubicBezier(0.22, 1, 0.36, 1);

// Evaluate a CSS cubic-bezier(x1,y1,x2,y2) as eased-y = f(progress-x), inverting
// x(t) with a few Newton-Raphson steps. Lets the JS scroll ride the very curve
// the CSS height transition uses. (Hoisted, so the const above can call it.)
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const xAt = (t) => ((ax * t + bx) * t + cx) * t;
  const yAt = (t) => ((ay * t + by) * t + cy) * t;
  const dxAt = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = xAt(t) - x;
      if (Math.abs(dx) < 1e-4) break;
      const slope = dxAt(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= dx / slope;
    }
    return yAt(t);
  };
}

// Monotonic token: a newer scroll animation cancels an older one mid-flight
// (e.g. collapsing one panel as another expands).
let scrollToken = 0;

// Animate window scroll across EXPAND_MS on EXPAND_EASE. getTarget() is re-read
// every frame and clamped to the LIVE max scroll, so while the document is still
// growing (expand) or shrinking (collapse) the reachable range moves with it and
// the browser never has to clamp — and therefore snap — the scroll itself. This
// is what removes the spacer hack and the post-collapse jolt.
function animateScroll(getTarget) {
  const token = ++scrollToken;
  const startY = window.scrollY;
  const t0 = performance.now();
  let lastHeight = -1;
  let stableFrames = 0;
  function frame(now) {
    if (token !== scrollToken) return; // superseded
    const elapsed = now - t0;
    const eased = EXPAND_EASE(Math.min(1, elapsed / EXPAND_MS));
    const height = document.documentElement.scrollHeight;
    const maxScroll = Math.max(0, height - window.innerHeight);
    const target = Math.max(0, Math.min(getTarget(), maxScroll));
    // behavior:'instant' is essential: html{scroll-behavior:smooth} (base.css)
    // would otherwise make every per-frame scrollTo kick off the browser's own
    // smooth scroll, stacking its easing on top of this tween — the page would
    // glide into place AFTER the panel finished moving. We are the animation.
    window.scrollTo({ top: Math.min(startY + (target - startY) * eased, maxScroll), left: 0, behavior: 'instant' });

    if (elapsed < EXPAND_MS) {
      requestAnimationFrame(frame);
      return;
    }
    // The eased motion is done, but the CSS height transition can settle a frame
    // or two later. Stopping now would leave a bottom-clamped rest a few px off
    // (the last frame clamped against a still-too-tall page). Keep re-clamping to
    // the live max until the page height holds steady so it locks exactly into
    // place, with a short safety cap on the tail.
    stableFrames = height === lastHeight ? stableFrames + 1 : 0;
    lastHeight = height;
    if (stableFrames < 2 && elapsed < EXPAND_MS + 250) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Document-space Y of a panel's top edge — stable through the panel's own height
// change, since nothing above it moves.
function panelTopY(panel) {
  return panel.getBoundingClientRect().top + window.scrollY;
}

function expandPanel(panel) {
  document.querySelectorAll('.panel--expanded').forEach((p) => {
    if (p !== panel) collapsePanel(p);
  });
  panel.classList.add('panel--expanded');
  panel.setAttribute('aria-expanded', 'true');
  alignExpanded(panel);
}

// Where an expanded panel comes to rest. On mobile every panel — top, middle, or
// bottom of the list — lands identically: its top edge eased up to TOP_GAP below
// the viewport top, so the reveal always plays from one consistent, fully visible
// position regardless of where the tile started. On desktop the panel only nudges
// into view if an edge is clipped.
function alignExpanded(panel) {
  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  if (!isMobile) {
    requestAnimationFrame(() => {
      const rect = panel.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        panel.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: 'nearest' });
      }
    });
    return;
  }
  if (REDUCE_MOTION) {
    window.scrollTo({ top: Math.max(0, panelTopY(panel) - TOP_GAP), left: 0, behavior: 'instant' });
    return;
  }
  // panelTopY is re-read each frame so the landing survives any reflow; the
  // live-max clamp lets the still-growing page catch up to the target.
  animateScroll(() => panelTopY(panel) - TOP_GAP);
}

// Collapse choreography. The tile eases to roughly one-third down the viewport —
// a comfortable, natural resting position that works uniformly regardless of
// where the panel sat in the list: top tiles clamp to 0, middle tiles settle at
// ~1/3 from the top, bottom tiles clamp to max-scroll. animateScroll's per-frame
// live-max clamp prevents any snap as the page shortens during the shrink.
function collapsePanel(panel) {
  panel.setAttribute('aria-expanded', 'false');

  // Return focus to the card when collapsing from a control that's about to be
  // hidden (close button / links), so keyboard focus isn't dropped to <body>.
  if (document.activeElement && panel.contains(document.activeElement) && document.activeElement !== panel) {
    panel.focus({ preventScroll: true });
  }

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  if (!isMobile || REDUCE_MOTION) {
    panel.classList.remove('panel--expanded');
    return;
  }

  const panelDoc = panelTopY(panel);
  const restY = panelDoc - window.innerHeight / 3;

  panel.classList.remove('panel--expanded');
  animateScroll(() => restY);
}

/* ------------------------- Globals ------------------------- */

// Esc closes expanded panel (the lightbox owns the keyboard while it's open)
document.addEventListener('keydown', (e) => {
  if (lightboxIsOpen()) return;
  if (e.key === 'Escape') {
    document.querySelectorAll('.panel--expanded').forEach(collapsePanel);
  }
});

// Click outside any panel closes (ignored while the lightbox sits above it)
document.addEventListener('click', (e) => {
  if (lightboxIsOpen()) return;
  if (!e.target.closest('.panel')) {
    document.querySelectorAll('.panel--expanded').forEach(collapsePanel);
  }
});

/* ------------------------ Lightbox ------------------------- */
// Full-screen screenshot viewer: swipe / scroll between shots, pinch + double-
// tap (and wheel on desktop) to zoom, drag to pan. Built once, reused. No
// libraries and no network — works straight from file://.

const PAGE = document.querySelector('.page');
const LB_MAX_SCALE = 4;

const LB = {
  el: null, track: null, counter: null, dots: null, built: false,
  urls: [], index: 0, trigger: null,
  scale: 1, tx: 0, ty: 0,
  pointers: new Map(), gesture: 'none', moved: false, pinched: false,
  pinchDist: 1, pinchScale: 1,
  panStartX: 0, panStartY: 0, panBaseTx: 0, panBaseTy: 0,
  downTime: 0, downX: 0, downY: 0,
  lastTapTime: 0, lastTapX: 0, lastTapY: 0,
  cleanupTimer: 0,
};

function lbClamp(v, min, max) { return v < min ? min : v > max ? max : v; }
function lbPad(n) { return n < 10 ? '0' + n : String(n); }
function lightboxIsOpen() { return LB.built && !!LB.el && LB.el.classList.contains('lightbox--open'); }
function lbDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function lbCurrentImg() {
  const slide = LB.track && LB.track.children[LB.index];
  return slide ? slide.querySelector('img') : null;
}

function buildLightbox() {
  if (LB.built) return;
  const el = document.createElement('div');
  el.className = 'lightbox';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Screenshot viewer');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="lightbox__backdrop"></div>
    <div class="lightbox__bar">
      <span class="lightbox__counter" aria-live="polite"></span>
      <button class="lightbox__btn lightbox__close" type="button" aria-label="Close viewer">${ICON_LB_CLOSE}</button>
    </div>
    <div class="lightbox__stage">
      <button class="lightbox__btn lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous screenshot">${ICON_CHEVRON_L}</button>
      <div class="lightbox__track"></div>
      <button class="lightbox__btn lightbox__nav lightbox__nav--next" type="button" aria-label="Next screenshot">${ICON_CHEVRON_R}</button>
    </div>
    <div class="lightbox__dots"></div>`;
  document.body.appendChild(el);

  LB.el = el;
  LB.track = el.querySelector('.lightbox__track');
  LB.counter = el.querySelector('.lightbox__counter');
  LB.dots = el.querySelector('.lightbox__dots');

  el.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
  el.querySelector('.lightbox__nav--prev').addEventListener('click', () => goTo(LB.index - 1, true));
  el.querySelector('.lightbox__nav--next').addEventListener('click', () => goTo(LB.index + 1, true));

  // Click the matte (slide gutter) or backdrop to close — but never the image,
  // and never right after a drag/zoom gesture.
  el.addEventListener('click', (e) => {
    if (LB.scale > 1.01 || LB.moved) return;
    if (e.target.classList.contains('lightbox__slide') ||
        e.target.classList.contains('lightbox__backdrop')) {
      closeLightbox();
    }
  });

  let scrollRaf = 0;
  LB.track.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; onLbScroll(); });
  }, { passive: true });

  LB.track.addEventListener('pointerdown', onLbPointerDown);
  LB.track.addEventListener('pointermove', onLbPointerMove);
  LB.track.addEventListener('pointerup', onLbPointerUp);
  LB.track.addEventListener('pointercancel', onLbPointerUp);
  LB.track.addEventListener('wheel', onLbWheel, { passive: false });

  LB.built = true;
}

function openLightbox(urls, index, trigger) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  buildLightbox();
  if (LB.cleanupTimer) { clearTimeout(LB.cleanupTimer); LB.cleanupTimer = 0; }

  LB.urls = urls;
  LB.trigger = trigger || null;
  LB.index = lbClamp(index | 0, 0, urls.length - 1);

  LB.track.innerHTML = urls.map((u, i) =>
    `<div class="lightbox__slide"><img class="lightbox__img" src="${u}" alt="Screenshot ${i + 1}" draggable="false"></div>`
  ).join('');
  LB.dots.innerHTML = urls.map((_, i) =>
    `<button class="lightbox__dot" type="button" aria-label="Go to screenshot ${i + 1}"></button>`
  ).join('');
  LB.dots.querySelectorAll('.lightbox__dot').forEach((d, i) =>
    d.addEventListener('click', () => goTo(i, true))
  );
  LB.el.classList.toggle('lightbox--single', urls.length <= 1);

  resetZoom(false);
  lockBackground(true);
  LB.el.classList.add('lightbox--open');
  LB.el.setAttribute('aria-hidden', 'false');

  // Land on the tapped image before the entrance paints. 'instant' overrides
  // the track's scroll-behavior:smooth so we don't glide in from the first shot.
  requestAnimationFrame(() => {
    LB.track.scrollTo({ left: LB.index * LB.track.clientWidth, behavior: 'instant' });
    updateLbChrome();
  });

  document.addEventListener('keydown', onLbKeydown, true);
  const close = LB.el.querySelector('.lightbox__close');
  if (close) close.focus({ preventScroll: true });
}

function closeLightbox() {
  if (!lightboxIsOpen()) return;
  resetZoom(false);
  LB.el.classList.remove('lightbox--open', 'lightbox--zoomed');
  LB.el.setAttribute('aria-hidden', 'true');
  lockBackground(false);
  document.removeEventListener('keydown', onLbKeydown, true);

  const trigger = LB.trigger;
  LB.trigger = null;
  if (trigger && typeof trigger.focus === 'function') trigger.focus({ preventScroll: true });

  LB.cleanupTimer = window.setTimeout(() => {
    LB.cleanupTimer = 0;
    if (!LB.el.classList.contains('lightbox--open')) {
      LB.track.innerHTML = '';
      LB.dots.innerHTML = '';
    }
  }, 360);
}

// Lock the page behind the viewer: no background scroll, and inert so keyboard
// focus + screen readers stay inside the dialog. Pad for the lost scrollbar so
// the layout doesn't jump on desktop.
function lockBackground(on) {
  if (on) {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
    if (PAGE) PAGE.inert = true;
  } else {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (PAGE) PAGE.inert = false;
  }
}

function goTo(i, smooth) {
  const next = lbClamp(i, 0, LB.urls.length - 1);
  if (LB.scale > 1.01) resetZoom(true);
  LB.track.scrollTo({
    left: next * LB.track.clientWidth,
    behavior: (smooth && !REDUCE_MOTION) ? 'smooth' : 'auto',
  });
  LB.index = next;
  updateLbChrome();
}

function onLbScroll() {
  if (!LB.track.clientWidth) return;
  const i = lbClamp(Math.round(LB.track.scrollLeft / LB.track.clientWidth), 0, LB.urls.length - 1);
  if (i !== LB.index) {
    LB.index = i;
    resetZoom(false);
    updateLbChrome();
  }
}

function updateLbChrome() {
  const total = LB.urls.length;
  if (LB.counter) LB.counter.textContent = `${lbPad(LB.index + 1)} / ${lbPad(total)}`;
  if (LB.dots) {
    LB.dots.querySelectorAll('.lightbox__dot').forEach((d, i) =>
      d.classList.toggle('is-active', i === LB.index)
    );
  }
  const prev = LB.el.querySelector('.lightbox__nav--prev');
  const next = LB.el.querySelector('.lightbox__nav--next');
  if (prev) prev.disabled = LB.index <= 0;
  if (next) next.disabled = LB.index >= total - 1;
}

/* ---- zoom + pan ---- */

function lbSetAnim(on) {
  const img = lbCurrentImg();
  if (img) img.classList.toggle('is-animating', !!on);
}

function applyZoom() {
  const img = lbCurrentImg();
  if (img) img.style.transform = `translate3d(${LB.tx}px, ${LB.ty}px, 0) scale(${LB.scale})`;
}

function clampPan() {
  const img = lbCurrentImg();
  if (!img) return;
  const maxX = Math.max(0, (img.clientWidth * LB.scale - img.clientWidth) / 2);
  const maxY = Math.max(0, (img.clientHeight * LB.scale - img.clientHeight) / 2);
  LB.tx = lbClamp(LB.tx, -maxX, maxX);
  LB.ty = lbClamp(LB.ty, -maxY, maxY);
}

// Zoom to `newScale` while keeping the content point under (px,py) fixed.
function zoomAbout(newScale, px, py) {
  const img = lbCurrentImg();
  if (!img) return;
  newScale = lbClamp(newScale, 1, LB_MAX_SCALE);
  const rect = img.getBoundingClientRect();
  const layoutCx = (rect.left + rect.width / 2) - LB.tx;
  const layoutCy = (rect.top + rect.height / 2) - LB.ty;
  const qx = px - layoutCx;
  const qy = py - layoutCy;
  const ratio = newScale / LB.scale;
  LB.tx = qx - (qx - LB.tx) * ratio;
  LB.ty = qy - (qy - LB.ty) * ratio;
  LB.scale = newScale;
  LB.el.classList.toggle('lightbox--zoomed', LB.scale > 1.01);
  clampPan();
  applyZoom();
}

function resetZoom(animate) {
  if (LB.track) {
    LB.track.querySelectorAll('.lightbox__img').forEach((img) => {
      img.classList.toggle('is-animating', !!animate);
      img.style.transform = '';
    });
  }
  LB.scale = 1; LB.tx = 0; LB.ty = 0;
  if (LB.el) LB.el.classList.remove('lightbox--zoomed');
}

function startPan(x, y) {
  LB.gesture = 'pan';
  LB.panStartX = x; LB.panStartY = y;
  LB.panBaseTx = LB.tx; LB.panBaseTy = LB.ty;
  lbSetAnim(false);
}

function onLbPointerDown(e) {
  if (!lbCurrentImg()) return;
  LB.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (LB.pointers.size === 2) {
    const pts = [...LB.pointers.values()];
    LB.gesture = 'pinch';
    LB.pinched = true;
    LB.pinchDist = lbDist(pts[0], pts[1]) || 1;
    LB.pinchScale = LB.scale;
    lbSetAnim(false);
    try { LB.track.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  } else if (LB.pointers.size === 1) {
    LB.moved = false;
    LB.pinched = false;
    LB.downTime = Date.now();
    LB.downX = e.clientX; LB.downY = e.clientY;
    if (LB.scale > 1.01) {
      startPan(e.clientX, e.clientY);
      try { LB.track.setPointerCapture(e.pointerId); } catch (err) {}
    } else {
      LB.gesture = 'none'; // let native scroll-snap drive the swipe
    }
  }
}

function onLbPointerMove(e) {
  if (!LB.pointers.has(e.pointerId)) return;
  LB.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (LB.gesture === 'pinch' && LB.pointers.size >= 2) {
    const pts = [...LB.pointers.values()];
    const d = lbDist(pts[0], pts[1]);
    LB.moved = true;
    zoomAbout(LB.pinchScale * (d / LB.pinchDist), (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
    e.preventDefault();
  } else if (LB.gesture === 'pan') {
    LB.tx = LB.panBaseTx + (e.clientX - LB.panStartX);
    LB.ty = LB.panBaseTy + (e.clientY - LB.panStartY);
    if (Math.hypot(e.clientX - LB.downX, e.clientY - LB.downY) > 6) LB.moved = true;
    clampPan();
    applyZoom();
    e.preventDefault();
  } else if (LB.gesture === 'none') {
    if (Math.hypot(e.clientX - LB.downX, e.clientY - LB.downY) > 10) LB.moved = true;
  }
}

function onLbPointerUp(e) {
  const wasMoved = LB.moved;
  const wasPinch = LB.pinched;
  const upX = e.clientX, upY = e.clientY;
  const quick = Date.now() - LB.downTime < 250;
  const hadPointers = LB.pointers.size;
  LB.pointers.delete(e.pointerId);
  try { LB.track.releasePointerCapture(e.pointerId); } catch (err) {}

  if (LB.gesture === 'pinch') {
    if (LB.pointers.size < 2) {
      lbSetAnim(true);
      if (LB.scale <= 1.02) resetZoom(true);
      if (LB.pointers.size === 1 && LB.scale > 1.01) {
        const p = [...LB.pointers.values()][0];
        startPan(p.x, p.y);
      } else if (LB.pointers.size === 0) {
        LB.gesture = 'none';
      }
    }
    return;
  }

  if (LB.gesture === 'pan' && LB.pointers.size === 0) {
    lbSetAnim(true);
    LB.gesture = 'none';
  }

  // Tap / double-tap: a single quick press that didn't move and wasn't a pinch.
  if (hadPointers === 1 && !wasMoved && !wasPinch && quick) {
    const now = Date.now();
    if (now - LB.lastTapTime < 300 && Math.hypot(upX - LB.lastTapX, upY - LB.lastTapY) < 30) {
      lbSetAnim(true);
      if (LB.scale > 1.01) resetZoom(true);
      else zoomAbout(2.5, upX, upY);
      LB.lastTapTime = 0;
    } else {
      LB.lastTapTime = now; LB.lastTapX = upX; LB.lastTapY = upY;
    }
  }
}

function onLbWheel(e) {
  if (!lbCurrentImg()) return;
  // Let a horizontal trackpad swipe page between shots while un-zoomed.
  if (LB.scale <= 1.01 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  e.preventDefault();
  lbSetAnim(false);
  const target = lbClamp(LB.scale * (e.deltaY < 0 ? 1.18 : 0.85), 1, LB_MAX_SCALE);
  if (target <= 1.001) resetZoom(true);
  else zoomAbout(target, e.clientX, e.clientY);
}

function onLbKeydown(e) {
  if (!lightboxIsOpen()) return;
  switch (e.key) {
    case 'Escape': e.preventDefault(); closeLightbox(); break;
    case 'ArrowLeft': e.preventDefault(); goTo(LB.index - 1, true); break;
    case 'ArrowRight': e.preventDefault(); goTo(LB.index + 1, true); break;
    case '+': case '=':
      e.preventDefault(); lbSetAnim(true);
      zoomAbout(LB.scale * 1.4, window.innerWidth / 2, window.innerHeight / 2);
      break;
    case '-': case '_': {
      e.preventDefault(); lbSetAnim(true);
      const t = LB.scale / 1.4;
      if (t <= 1.001) resetZoom(true);
      else zoomAbout(t, window.innerWidth / 2, window.innerHeight / 2);
      break;
    }
    case '0': e.preventDefault(); lbSetAnim(true); resetZoom(true); break;
  }
}

// Keep the active slide aligned and un-zoomed across viewport resize / rotation.
window.addEventListener('resize', () => {
  if (!lightboxIsOpen()) return;
  resetZoom(false);
  LB.track.scrollTo({ left: LB.index * LB.track.clientWidth, behavior: 'instant' });
});

/* --------------------------- Boot -------------------------- */

async function render() {
  let sites;
  try {
    sites = loadWebsites();
  } catch (err) {
    GRID.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1 / -1;">Could not load websites.js — ${escapeHtml(err.message)}</p>`;
    return;
  }

  if (!Array.isArray(sites) || sites.length === 0) {
    GRID.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1 / -1;">No apps yet. Add some to <code>websites.js</code>.</p>`;
    return;
  }

  const items = await Promise.all(
    sites.map(async (site) => {
      const [iconUrl, screenshots] = await Promise.all([
        findImage(`images/${site.id}/icon`),
        getScreenshots(site),
      ]);
      return { site, iconUrl, screenshots };
    })
  );

  const frag = document.createDocumentFragment();
  items.forEach(({ site, iconUrl, screenshots }, i) => {
    frag.appendChild(createPanel(site, screenshots, iconUrl, i));
  });
  GRID.appendChild(frag);
}

initTheme();
render();
