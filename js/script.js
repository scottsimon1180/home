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

/* -------------------------- Theme -------------------------- */

function applyTheme(theme) {
  ROOT.setAttribute('data-theme', theme);
  THEME_TOGGLE.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
  localStorage.setItem('theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
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
    ? `<div class="screenshots" role="region" aria-label="Screenshots">
         ${screenshots.map((s, i) => `<img class="screenshot" src="${s}" alt="${escapeHtml(site.name)} screenshot ${i + 1}" loading="lazy">`).join('')}
       </div>`
    : '';

  const fullDescriptionHtml = site.fullDescription
    ? `<p class="panel__full-description">${escapeHtml(site.fullDescription)}</p>`
    : '';

  panel.innerHTML = `
    <button class="panel__close" aria-label="Collapse panel" type="button">${ICON_COLLAPSE}</button>
    <div class="panel__header">
      <div class="panel__icon-wrap">${iconInner}</div>
      <div class="panel__title-block">
        <h2 class="panel__name">${escapeHtml(site.name)}</h2>
        <p class="panel__description">${escapeHtml(site.shortDescription || '')}</p>
      </div>
    </div>
    <div class="panel__expanded-content">
      <div class="panel__expanded-inner">
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

// The panel's final expanded height. We measure on a throwaway clone so the real
// element's transition baseline is never disturbed — toggling .panel--expanded on
// the live node corrupts the reveal and freezes it at 0fr. .panel--measure strips
// transitions so the clone reports its final size immediately; matching the live
// width keeps text wrapping (and therefore height) identical.
function measureExpandedHeight(panel) {
  const clone = panel.cloneNode(true);
  clone.classList.add('panel--expanded', 'panel--measure');
  clone.style.cssText +=
    `;position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;width:${panel.offsetWidth}px`;
  panel.parentNode.appendChild(clone);
  const height = clone.offsetHeight;
  clone.remove();
  return height;
}

function expandPanel(panel) {
  document.querySelectorAll('.panel--expanded').forEach((p) => {
    if (p !== panel) collapsePanel(p);
  });
  // Start the reveal FIRST: measuring before this (even on a clone) corrupts the
  // grid-template-rows transition baseline and freezes the reveal at 0fr. Measuring
  // afterward is safe — it only reads geometry, it doesn't restart the transition.
  panel.classList.add('panel--expanded');
  panel.setAttribute('aria-expanded', 'true');
  const finalHeight = measureExpandedHeight(panel);
  alignExpanded(panel, finalHeight);
}

// Collapsing is intentionally not scrolled: the panel's top edge is held in place
// by the content above it, so the reveal simply shrinks from the bottom upward.
function collapsePanel(panel) {
  panel.classList.remove('panel--expanded');
  panel.setAttribute('aria-expanded', 'false');
}

// On mobile, open the panel centered in the viewport. Its top edge is stable in
// document space (the panel grows downward), so we scroll to the final centered
// position and let the height animation and the scroll resolve together. If the
// expanded panel is taller than the viewport, centering would hide the header and
// the collapse button, so we pin its top just under the edge instead.
function alignExpanded(panel, finalHeight) {
  const behavior = REDUCE_MOTION ? 'auto' : 'smooth';
  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  requestAnimationFrame(() => {
    const rect = panel.getBoundingClientRect();
    const panelTop = rect.top + window.scrollY;
    if (!isMobile) {
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        panel.scrollIntoView({ behavior, block: 'nearest' });
      }
      return;
    }
    const vh = window.innerHeight;
    const fits = finalHeight <= vh - 24;
    const top = Math.max(0, fits ? panelTop - (vh - finalHeight) / 2 : panelTop - 12);
    scrollToWithRoom(top, finalHeight, behavior);
  });
}

// The panel is still mid-grow when we scroll, so the document can be too short to
// reach the target — the browser would clamp the scroll and under-shoot. Reserve
// the final height at the end of the page for the duration of the scroll so the
// target is reachable, then release it once the panel occupies real space.
function scrollToWithRoom(top, reserve, behavior) {
  const spacer = document.createElement('div');
  spacer.style.cssText = `height:${reserve}px;flex:none;pointer-events:none`;
  spacer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(spacer);
  window.scrollTo({ top, behavior });
  if (behavior === 'auto') {
    spacer.remove();
  } else {
    setTimeout(() => spacer.remove(), 700);
  }
}

/* ------------------------- Globals ------------------------- */

// Esc closes expanded panel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.panel--expanded').forEach(collapsePanel);
  }
});

// Click outside any panel closes
document.addEventListener('click', (e) => {
  if (!e.target.closest('.panel')) {
    document.querySelectorAll('.panel--expanded').forEach(collapsePanel);
  }
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
