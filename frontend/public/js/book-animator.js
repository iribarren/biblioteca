/**
 * book-animator.js — La Biblioteca
 *
 * Exports animateBookReveal(container, book) → Promise<void>
 *
 * Drives a 5-stage 3D book reveal animation entirely through CSS class
 * toggling. The returned Promise resolves when the animation completes
 * OR when the user clicks to skip.
 *
 * Stages and timings:
 *   Stage 1: bookshelf appears              (0 – 1000 ms)
 *   Stage 2: book extracted to center       (1000 – 2000 ms)
 *   Stage 3: cover faces viewer             (2000 – 3500 ms)
 *   Stage 4: book opens, interior text      (3500 – 5000 ms)
 *   Stage 5: property cards float in        (5000 – 6000 ms)
 *   Complete: animation finishes            (6000 ms)
 */

// ============================================================
// Color map (Spanish book color names → hex)
// ============================================================
const BOOK_COLOR_MAP = {
  rojo:       '#c0392b',
  azul:       '#2980b9',
  verde:      '#27ae60',
  amarillo:   '#c9a20c',
  naranja:    '#d4680a',
  morado:     '#8e44ad',
  violeta:    '#8e44ad',
  negro:      '#1a1a1a',
  blanco:     '#c8c0b0',
  gris:       '#7f8c8d',
  marrón:     '#6d4c41',
  marron:     '#6d4c41',
  dorado:     '#b8860b',
  plateado:   '#8ea3a6',
  carmesí:    '#dc143c',
  carmesi:    '#dc143c',
  esmeralda:  '#1e6b40',
  índigo:     '#4b0082',
  indigo:     '#4b0082',
  turquesa:   '#0e7a6e',
};

// ============================================================
// Binding → CSS texture class
// ============================================================
const BINDING_TEXTURE_MAP = {
  'cuero':        'texture-cuero',
  'madera':       'texture-madera',
  'terciopelo':   'texture-terciopelo',
  'piel humana':  'texture-piel-humana',
  'piel':         'texture-piel-humana',
  'hueso':        'texture-hueso',
  'cartulina':    'texture-cartulina',
};

// ============================================================
// Decoration data for shelf filler books
// ============================================================
const FILLER_BOOKS = [
  { color: '#5a3e2b', width: 22, height: 190 },
  { color: '#2e4a6e', width: 18, height: 220 },
  { color: '#3a6b3c', width: 25, height: 175 },
  { color: '#7a3030', width: 20, height: 210 },
  { color: '#4a4a6e', width: 16, height: 195 },
  { color: '#6b5a2a', width: 22, height: 230 },
  { color: '#3d3d3d', width: 19, height: 180 },
];

// Featured book position in the filler array (index 3 = 4th book)
const FEATURED_SLOT = 3;

// Stage timing in milliseconds
const TIMINGS = {
  stage1Start:    0,
  stage2Start:    1000,
  stage3Start:    2000,
  stage4Start:    3500,
  stage5Start:    5000,
  complete:       6200,
};

// ============================================================
// Helpers
// ============================================================

function resolveBookColor(colorName) {
  if (!colorName) return '#6d4c41';
  const key = colorName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents for lookup fallback
    .replace(/[^a-z ]/g, '');

  // Direct match first
  for (const [k, v] of Object.entries(BOOK_COLOR_MAP)) {
    const normKey = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (key.includes(normKey) || normKey.includes(key)) return v;
  }
  return '#6d4c41';
}

function resolveBindingTexture(bindingName) {
  if (!bindingName) return 'texture-cuero';
  const key = bindingName.toLowerCase().trim();
  for (const [k, v] of Object.entries(BINDING_TEXTURE_MAP)) {
    if (key.includes(k)) return v;
  }
  return 'texture-cuero';
}

/** Lighten or darken a hex color by a factor (-1 to +1) */
function shiftColor(hex, factor) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8)  & 0xff;
  let b =  n        & 0xff;
  if (factor > 0) {
    r = Math.min(255, r + Math.round((255 - r) * factor));
    g = Math.min(255, g + Math.round((255 - g) * factor));
    b = Math.min(255, b + Math.round((255 - b) * factor));
  } else {
    r = Math.max(0, r + Math.round(r * factor));
    g = Math.max(0, g + Math.round(g * factor));
    b = Math.max(0, b + Math.round(b * factor));
  }
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// DOM Builders
// ============================================================

function buildShelfScene(bookColor) {
  const scene = document.createElement('div');
  scene.className = 'book-shelf-scene';

  const plank = document.createElement('div');
  plank.className = 'shelf-plank';

  FILLER_BOOKS.forEach((filler, i) => {
    const spine = document.createElement('div');
    spine.className = 'shelf-book' + (i === FEATURED_SLOT ? ' featured' : '');
    spine.style.cssText = `
      width: ${filler.width}px;
      height: ${filler.height}px;
      background: linear-gradient(175deg, ${shiftColor(i === FEATURED_SLOT ? bookColor : filler.color, 0.2)} 0%,
                  ${i === FEATURED_SLOT ? bookColor : filler.color} 50%,
                  ${shiftColor(i === FEATURED_SLOT ? bookColor : filler.color, -0.3)} 100%);
    `;
    plank.appendChild(spine);
  });

  scene.appendChild(plank);
  return scene;
}

function buildBook3D(book, bookColor, bookColorLight, bookColorDark, textureClass) {
  const wrapper = document.createElement('div');
  wrapper.className = 'book-3d-wrapper';

  const book3d = document.createElement('div');
  book3d.className = 'book-3d';

  // Set color variables on book element
  book3d.style.setProperty('--book-color', bookColor);
  book3d.style.setProperty('--book-color-light', bookColorLight);
  book3d.style.setProperty('--book-color-dark', bookColorDark);

  // --- BACK face ---
  const back = document.createElement('div');
  back.className = 'book-back';

  // --- SPINE (left edge) ---
  const spine = document.createElement('div');
  spine.className = 'book-spine';

  // --- PAGES (right edge) ---
  const pages = document.createElement('div');
  pages.className = 'book-pages';

  // --- INSIDE (visible when open) ---
  const inside = document.createElement('div');
  inside.className = 'book-inside';

  const interiorText = document.createElement('div');
  interiorText.className = 'book-interior-text';
  interiorText.textContent = book.interior || '';
  inside.appendChild(interiorText);

  // --- COVER PAGE (rotates open as hinge) ---
  const coverPage = document.createElement('div');
  coverPage.className = 'book-cover-page';

  // Front face of the cover page
  const cover = document.createElement('div');
  cover.className = `book-cover ${textureClass}`;
  cover.style.setProperty('--book-color', bookColor);
  cover.style.setProperty('--book-color-light', bookColorLight);
  cover.style.setProperty('--book-color-dark', bookColorDark);

  // Decorative frame
  const frame = document.createElement('div');
  frame.className = 'book-cover-frame';

  // Corner ornaments
  ['tl', 'tr', 'bl', 'br'].forEach(pos => {
    const orn = document.createElement('div');
    orn.className = `book-cover-ornament ${pos}`;
    orn.textContent = '✦';
    cover.appendChild(orn);
  });

  // Binding label centered on cover
  const bindingLabel = document.createElement('div');
  bindingLabel.className = 'book-cover-binding-label';
  bindingLabel.textContent = book.binding || '';

  cover.appendChild(frame);
  cover.appendChild(bindingLabel);

  // Inner face of the cover page (dark inner cover)
  const coverInner = document.createElement('div');
  coverInner.className = 'book-cover-inner';

  coverPage.appendChild(cover);
  coverPage.appendChild(coverInner);

  book3d.appendChild(back);
  book3d.appendChild(spine);
  book3d.appendChild(pages);
  book3d.appendChild(inside);
  book3d.appendChild(coverPage);

  wrapper.appendChild(book3d);
  return wrapper;
}

function buildPropertiesPanel(book, bookColor) {
  const panel = document.createElement('div');
  panel.className = 'book-properties-panel';

  const grid = document.createElement('div');
  grid.className = 'book-properties-grid';

  const props = [
    {
      icon: '◆',
      label: 'Color',
      value: book.color || '—',
      hint: book.color_hint,
      swatch: bookColor,
    },
    {
      icon: '⬡',
      label: 'Encuadernación',
      value: book.binding || '—',
      hint: book.binding_hint,
      swatch: null,
    },
    {
      icon: '✿',
      label: 'Olor',
      value: book.smell || '—',
      hint: book.smell_hint,
      swatch: null,
    },
    {
      icon: '✍',
      label: 'Interior',
      value: book.interior || '—',
      hint: null,
      swatch: null,
    },
  ];

  props.forEach(prop => {
    const card = document.createElement('div');
    card.className = 'book-prop-card';

    const icon = document.createElement('div');
    icon.className = 'book-prop-icon';
    icon.textContent = prop.icon;

    const label = document.createElement('div');
    label.className = 'book-prop-label';
    label.textContent = prop.label;

    const value = document.createElement('div');
    value.className = 'book-prop-value';
    if (prop.swatch) {
      const swatch = document.createElement('span');
      swatch.className = 'book-prop-swatch';
      swatch.style.backgroundColor = prop.swatch;
      value.appendChild(swatch);
    }
    value.appendChild(document.createTextNode(prop.value));

    card.appendChild(icon);
    card.appendChild(label);
    card.appendChild(value);

    if (prop.hint) {
      const hint = document.createElement('div');
      hint.className = 'book-prop-hint';
      hint.textContent = prop.hint;
      card.appendChild(hint);
    }

    grid.appendChild(card);
  });

  panel.appendChild(grid);
  return panel;
}

// ============================================================
// Main export
// ============================================================

/**
 * Animate the book reveal inside `container`.
 * Clears any previous animation. Returns a Promise that resolves
 * when the animation is complete (or skipped by click).
 *
 * @param {HTMLElement} container
 * @param {Object} book  — book object from the API
 * @returns {Promise<void>}
 */
export async function animateBookReveal(container, book) {
  // --- Resolve visual properties ---
  const bookColor      = resolveBookColor(book.color);
  const bookColorLight = shiftColor(bookColor, 0.25);
  const bookColorDark  = shiftColor(bookColor, -0.35);
  const textureClass   = resolveBindingTexture(book.binding);

  // --- Clear previous state ---
  container.innerHTML = '';

  // --- Mobile detection (simplified animation) ---
  const isMobile = window.innerWidth <= 600;

  // --- Build the root animator element ---
  const animator = document.createElement('div');
  animator.className = 'book-animator animating';
  if (isMobile) animator.classList.add('mobile-mode');

  // Apply book color CSS variables
  animator.style.setProperty('--book-color', bookColor);
  animator.style.setProperty('--book-color-light', bookColorLight);
  animator.style.setProperty('--book-color-dark', bookColorDark);
  animator.style.setProperty('--book-spine-color', bookColorDark);

  // Skip hint
  const skipHint = document.createElement('div');
  skipHint.className = 'book-skip-hint';
  skipHint.textContent = 'Clic para saltar';
  animator.appendChild(skipHint);

  // --- Build scene layers ---
  const shelfScene = buildShelfScene(bookColor);
  const bookWrapper = buildBook3D(book, bookColor, bookColorLight, bookColorDark, textureClass);

  // Travel scene wraps the 3D book (controls visibility per-stage)
  const travelScene = document.createElement('div');
  travelScene.className = 'book-travel-scene';
  travelScene.appendChild(bookWrapper);

  const propertiesPanel = buildPropertiesPanel(book, bookColor);

  animator.appendChild(shelfScene);
  animator.appendChild(travelScene);
  animator.appendChild(propertiesPanel);

  container.appendChild(animator);

  // ---- Promise setup with skip support ----
  return new Promise(resolve => {
    let skipped = false;
    let completionTimer = null;

    function skipToEnd() {
      if (skipped) return;
      skipped = true;
      if (completionTimer) clearTimeout(completionTimer);
      finishAnimation();
      resolve();
    }

    function finishAnimation() {
      // Apply all stages at once and mark complete
      animator.classList.remove(
        'animating', 'stage-1', 'stage-2', 'stage-3', 'stage-4'
      );
      animator.classList.add('stage-5', 'complete');

      // Force the cover open immediately (CSS transition will still play briefly)
      const coverPage = animator.querySelector('.book-cover-page');
      if (coverPage) coverPage.style.transition = 'none';

      // Force interior text visible
      const interiorText = animator.querySelector('.book-interior-text');
      if (interiorText) {
        interiorText.style.animation = 'none';
        interiorText.style.maxHeight = '200px';
        interiorText.style.opacity = '1';
      }

      // Force all prop cards visible
      animator.querySelectorAll('.book-prop-card').forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'none';
        card.style.transition = 'none';
      });

      animator.removeEventListener('click', skipToEnd);
    }

    // Wire skip click
    animator.addEventListener('click', skipToEnd);

    if (isMobile) {
      // Mobile: show final state immediately after a brief pause
      delay(300).then(() => {
        animator.classList.add('stage-5', 'complete');
        animator.classList.remove('animating');
        completionTimer = setTimeout(() => {
          if (!skipped) { skipped = true; resolve(); }
        }, 800);
      });
      return;
    }

    // ---- Full desktop animation sequence ----
    async function runSequence() {
      try {
        // Stage 1 — shelf appears
        animator.classList.add('stage-1');
        await delay(TIMINGS.stage2Start - TIMINGS.stage1Start);
        if (skipped) return;

        // Stage 2 — featured spine slides out, book travels to center
        const featuredSpine = animator.querySelector('.shelf-book.featured');
        if (featuredSpine) featuredSpine.classList.add('extracting');
        animator.classList.remove('stage-1');
        animator.classList.add('stage-2');
        await delay(TIMINGS.stage3Start - TIMINGS.stage2Start);
        if (skipped) return;

        // Stage 3 — cover faces viewer
        animator.classList.remove('stage-2');
        animator.classList.add('stage-3');
        await delay(TIMINGS.stage4Start - TIMINGS.stage3Start);
        if (skipped) return;

        // Stage 4 — book opens, interior text appears
        animator.classList.remove('stage-3');
        animator.classList.add('stage-4');
        await delay(TIMINGS.stage5Start - TIMINGS.stage4Start);
        if (skipped) return;

        // Stage 5 — properties float in
        animator.classList.remove('stage-4');
        animator.classList.add('stage-5');
        await delay(TIMINGS.complete - TIMINGS.stage5Start);
        if (skipped) return;

        // Complete
        animator.classList.remove('animating');
        animator.classList.add('complete');
        skipped = true;
        resolve();
      } catch (err) {
        // If something goes wrong, still resolve
        resolve();
      }
    }

    runSequence();
  });
}
