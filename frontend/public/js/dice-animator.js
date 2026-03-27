/**
 * dice-animator.js — La Biblioteca
 * Animated dice roll sequence renderer.
 *
 * Exports one function:
 *   animateDiceRoll(container, rollResult, context) → Promise<void>
 *
 * Animation timeline:
 *   0.0 – 0.3s  Container appears with intro text
 *   0.3 – 1.8s  d6 cube spins + d10 spinners scroll
 *   1.8 – 2.3s  Dice settle on final values
 *   2.3 – 3.0s  Math breakdown fades in
 *   3.0 – 3.5s  Challenge comparison appears
 *   3.5 – 4.5s  Outcome banner slides down
 *   4.5 – 5.0s  Effect text fades in
 *
 * For epilogue_final context: overcome score replaces d6, same d10 spinners.
 * Clicking during animation jumps immediately to final state.
 */

// ============================================================
// Public API
// ============================================================

/**
 * @param {HTMLElement} container
 * @param {object} rollResult - shape from API:
 *   { action_die, challenge_die_1, challenge_die_2, modifier, action_score,
 *     outcome, attribute_type }
 * @param {string} context - 'chapter' | 'epilogue_action' | 'epilogue_final'
 * @param {object} [extraData] - { overcome_score } needed for epilogue_final
 * @returns {Promise<void>}
 */
export async function animateDiceRoll(container, rollResult, context, extraData = {}) {
  return new Promise((resolve) => {
    container.innerHTML = '';
    container.classList.add('dice-animator');

    let skipped = false;

    // --- Build all DOM elements in their initial (hidden) state ---
    const root = buildAnimatorDOM(rollResult, context, extraData);
    container.appendChild(root);

    // --- Collect references to all animatable elements ---
    const refs = collectRefs(root);

    // --- Skip handler: clicking resolves immediately ---
    const skipHandler = () => {
      if (skipped) return;
      skipped = true;
      jumpToFinal(refs, rollResult, context, extraData);
      container.removeEventListener('click', skipHandler);
      resolve();
    };
    container.addEventListener('click', skipHandler);

    // --- Run the animation sequence ---
    runSequence(refs, rollResult, context, extraData)
      .then(() => {
        container.removeEventListener('click', skipHandler);
        resolve();
      })
      .catch(() => {
        // Sequence interrupted (e.g. skip) — resolve was already called
      });
  });
}

// ============================================================
// DOM Builder
// ============================================================

function buildAnimatorDOM(roll, context, extraData) {
  const root = document.createDocumentFragment();

  // --- Intro text ---
  const intro = makeEl('div', 'dice-rolling-intro loading-dots', 'Lanzando dados');
  root.appendChild(intro);

  // --- Dice stage ---
  const stage = makeEl('div', 'dice-stage');

  if (context === 'epilogue_final') {
    // Overcome score (no d6 roll) vs two d10s
    stage.appendChild(buildOvercomeScoreGroup(extraData.overcome_score ?? 0));
  } else {
    // d6 cube group
    stage.appendChild(buildD6Group(roll.action_die ?? 1));
  }

  // VS divider
  const vs = makeEl('div', 'dice-vs-divider', 'vs');
  stage.appendChild(vs);

  // Two d10 spinners group
  stage.appendChild(buildChallengeGroup(roll.challenge_die_1, roll.challenge_die_2));

  root.appendChild(stage);

  // --- Math breakdown (chapter / epilogue action only) ---
  if (context !== 'epilogue_final') {
    const math = buildMathBreakdown(roll);
    root.appendChild(math);
  } else {
    const overcomeDisplay = buildOvercomeDisplay(extraData.overcome_score ?? 0);
    root.appendChild(overcomeDisplay);
  }

  // --- Challenge comparison ---
  const comparison = buildComparison(roll, context, extraData);
  root.appendChild(comparison);

  // --- Outcome banner ---
  const banner = buildOutcomeBanner(roll.outcome);
  root.appendChild(banner);

  // --- Effect text ---
  const effect = buildEffectText(roll.outcome, context);
  root.appendChild(effect);

  const wrapper = makeEl('div', 'dice-animator-inner');
  // Fragment → real node
  wrapper.appendChild(root);
  return wrapper;
}

// ============================================================
// Individual element builders
// ============================================================

function buildD6Group(finalValue) {
  const group = makeEl('div', 'dice-group');
  const label = makeEl('div', 'dice-group-label', 'd6 — Acción');
  const wrapper = makeEl('div', 'd6-wrapper');
  const cube = makeEl('div', 'd6-cube');

  // Build all 6 faces
  const faceClasses = ['d6-face-front','d6-face-back','d6-face-right','d6-face-left','d6-face-top','d6-face-bottom'];
  const faceValues  = [finalValue, 7 - finalValue, 2, 5, 3, 4]; // front=final, back=opposite

  faceClasses.forEach((cls, i) => {
    const face = makeEl('div', `d6-face ${cls}`, String(clampD6(faceValues[i])));
    cube.appendChild(face);
  });

  wrapper.appendChild(cube);
  group.appendChild(label);
  group.appendChild(wrapper);
  return group;
}

function buildOvercomeScoreGroup(score) {
  const group = makeEl('div', 'dice-group');
  const label = makeEl('div', 'dice-group-label', 'Puntuación');
  const display = makeEl('div', 'overcome-score-display visible');
  const num = makeEl('span', 'overcome-score-number', String(score));
  display.appendChild(num);
  group.appendChild(label);
  group.appendChild(display);
  return group;
}

function buildChallengeGroup(die1, die2) {
  const group = makeEl('div', 'dice-group');
  const label = makeEl('div', 'dice-group-label', 'd10 — Desafío');
  const pair  = makeEl('div', 'dice-challenge-pair');
  pair.appendChild(buildD10Spinner(die1, 'd10-spinner-1'));
  pair.appendChild(buildD10Spinner(die2, 'd10-spinner-2'));
  group.appendChild(label);
  group.appendChild(pair);
  return group;
}

function buildD10Spinner(finalValue, id) {
  const wrap = makeEl('div', 'd10-spinner-wrap');
  wrap.id = id;
  const highlight = makeEl('div', 'd10-highlight-bar');
  const reel = makeEl('div', 'd10-reel');
  reel.id = id + '-reel';

  // Build reel: 4 numbers above + final + 4 numbers below (window = 3 slots, center is visible)
  const nums = buildReelNumbers(finalValue, 9);
  nums.forEach(n => {
    const num = makeEl('div', 'd10-reel-num', String(n));
    reel.appendChild(num);
  });

  wrap.appendChild(highlight);
  wrap.appendChild(reel);
  return wrap;
}

function buildMathBreakdown(roll) {
  const div = makeEl('div', 'dice-math-breakdown');
  div.dataset.role = 'math-breakdown';

  const d6Term = makeMathTerm(String(roll.action_die ?? '?'), 'd6');
  div.appendChild(d6Term);

  if (roll.modifier && roll.modifier !== 0) {
    const op = makeEl('span', 'math-operator', roll.modifier > 0 ? '+' : '−');
    const modTerm = makeMathTerm(String(Math.abs(roll.modifier)), 'Mod.');
    div.appendChild(op);
    div.appendChild(modTerm);
  }

  const eqOp = makeEl('span', 'math-operator', '=');
  div.appendChild(eqOp);

  const result = makeEl('div', 'math-result');
  const resVal = makeEl('div', 'math-result-value', String(roll.action_score ?? '?'));
  const resLabel = makeEl('div', 'math-result-label', 'Acción');
  result.appendChild(resVal);
  result.appendChild(resLabel);
  div.appendChild(result);

  return div;
}

function buildOvercomeDisplay(score) {
  const div = makeEl('div', 'overcome-score-display');
  div.dataset.role = 'overcome-display';
  const label = makeEl('div', 'overcome-score-label', 'Puntuación de Superación');
  const num   = makeEl('div', 'overcome-score-number', String(score));
  div.appendChild(label);
  div.appendChild(num);
  return div;
}

function buildComparison(roll, context, extraData) {
  const div = makeEl('div', 'dice-comparison');
  div.dataset.role = 'comparison';

  const actionScore = context === 'epilogue_final'
    ? (extraData.overcome_score ?? 0)
    : (roll.action_score ?? 0);

  // Action score box
  const actionBox = makeEl('div', 'comparison-action-score');
  const actionVal = makeEl('div', 'comparison-score-value', String(actionScore));
  const actionLabel = makeEl('div', 'comparison-score-label',
    context === 'epilogue_final' ? 'Superación' : 'Acción');
  actionBox.appendChild(actionVal);
  actionBox.appendChild(actionLabel);
  div.appendChild(actionBox);

  // vs
  div.appendChild(makeEl('div', 'comparison-vs', 'vs'));

  // Die 1
  const c1 = roll.challenge_die_1 ?? 0;
  const c1Beats = c1 >= actionScore;
  const die1 = makeEl('div', 'comparison-die');
  const die1val = makeEl('div', `comparison-die-value ${c1Beats ? 'beats' : 'loses'}`, String(c1));
  const die1label = makeEl('div', 'comparison-die-label', 'd10');
  die1.appendChild(die1val);
  die1.appendChild(die1label);
  div.appendChild(die1);

  // Die 2
  const c2 = roll.challenge_die_2 ?? 0;
  const c2Beats = c2 >= actionScore;
  const die2 = makeEl('div', 'comparison-die');
  const die2val = makeEl('div', `comparison-die-value ${c2Beats ? 'beats' : 'loses'}`, String(c2));
  const die2label = makeEl('div', 'comparison-die-label', 'd10');
  die2.appendChild(die2val);
  die2.appendChild(die2label);
  div.appendChild(die2);

  return div;
}

function buildOutcomeBanner(outcome) {
  const labels = { hit: 'Éxito Total', weak_hit: 'Éxito Parcial', miss: 'Fracaso' };
  const label = labels[outcome] || outcome;
  const banner = makeEl('div', `outcome-banner ${outcome}`, label);
  banner.dataset.role = 'outcome-banner';
  return banner;
}

function buildEffectText(outcome, context) {
  const text = getEffectText(outcome, context);
  const div = makeEl('div', `outcome-effect-text ${outcome}`, text);
  div.dataset.role = 'effect-text';
  return div;
}

// ============================================================
// Animation sequence
// ============================================================

function collectRefs(root) {
  return {
    root,
    intro:      root.querySelector('.dice-rolling-intro'),
    cube:       root.querySelector('.d6-cube'),
    d10Wrap1:   root.querySelector('#d10-spinner-1'),
    d10Wrap2:   root.querySelector('#d10-spinner-2'),
    reel1:      root.querySelector('#d10-spinner-1-reel'),
    reel2:      root.querySelector('#d10-spinner-2-reel'),
    math:       root.querySelector('[data-role="math-breakdown"]'),
    overcomeDisplay: root.querySelector('[data-role="overcome-display"]'),
    comparison: root.querySelector('[data-role="comparison"]'),
    banner:     root.querySelector('[data-role="outcome-banner"]'),
    effectText: root.querySelector('[data-role="effect-text"]'),
  };
}

async function runSequence(refs, roll, context, extraData) {
  // 0.3s: container already visible (CSS animation on .dice-rolling-intro)
  await delay(300);

  // Start dice animations
  if (refs.cube) {
    refs.cube.classList.add('rolling');
  }
  startD10Spin(refs.reel1, refs.d10Wrap1, roll.challenge_die_1 ?? 1, false);
  startD10Spin(refs.reel2, refs.d10Wrap2, roll.challenge_die_2 ?? 1, false);

  // 1.5s spinning
  await delay(1500);

  // Land d6
  if (refs.cube) {
    refs.cube.classList.remove('rolling');
    const [lx, ly] = getD6LandRotation(roll.action_die ?? 1);
    refs.cube.style.setProperty('--land-x', lx + 'deg');
    refs.cube.style.setProperty('--land-y', ly + 'deg');
    refs.cube.classList.add('landing');
    markActiveFace(refs.cube, roll.action_die ?? 1);
  }

  // Stop d10s gradually
  stopD10Spin(refs.reel1, refs.d10Wrap1, roll.challenge_die_1 ?? 1, roll.action_score ?? 0, context, extraData, true);
  stopD10Spin(refs.reel2, refs.d10Wrap2, roll.challenge_die_2 ?? 1, roll.action_score ?? 0, context, extraData, false);

  // Clear intro text and stop loading dots
  if (refs.intro) {
    refs.intro.textContent = '';
    refs.intro.classList.remove('loading-dots');
  }

  await delay(500);

  // 2.3 – 3.0s: math breakdown
  if (refs.math) {
    refs.math.classList.add('visible');
  }
  if (refs.overcomeDisplay) {
    refs.overcomeDisplay.classList.add('visible');
  }

  await delay(600);

  // 3.0 – 3.5s: comparison
  if (refs.comparison) {
    refs.comparison.classList.add('visible');
  }

  await delay(500);

  // 3.5 – 4.5s: outcome banner
  if (refs.banner) {
    refs.banner.classList.add('visible');
  }

  await delay(700);

  // 4.5 – 5.0s: effect text
  if (refs.effectText) {
    refs.effectText.classList.add('visible');
  }

  await delay(500);
}

// ============================================================
// Skip to final state
// ============================================================

function jumpToFinal(refs, roll, context, extraData) {
  // Stop all CSS animations
  if (refs.cube) {
    refs.cube.classList.remove('rolling', 'landing');
    refs.cube.style.animation = 'none';
    const [lx, ly] = getD6LandRotation(roll.action_die ?? 1);
    refs.cube.style.transform = `rotateX(${lx}deg) rotateY(${ly}deg)`;
    markActiveFace(refs.cube, roll.action_die ?? 1);
  }

  // Snap d10 reels to final position
  [
    { reel: refs.reel1, wrap: refs.d10Wrap1, value: roll.challenge_die_1 ?? 1 },
    { reel: refs.reel2, wrap: refs.d10Wrap2, value: roll.challenge_die_2 ?? 1 },
  ].forEach(({ reel, wrap, value }) => {
    if (!reel) return;
    reel.style.transition = 'none';
    const finalOffset = getReelFinalOffset(value);
    reel.style.top = finalOffset + 'px';

    // Color-code the wrapper
    if (wrap) applyD10Color(wrap, value, roll.action_score ?? 0, context, extraData);
  });

  // Show all elements immediately
  [refs.math, refs.overcomeDisplay, refs.comparison].forEach(el => {
    if (el) {
      el.style.transition = 'none';
      el.classList.add('visible');
    }
  });

  if (refs.banner) {
    refs.banner.style.transition = 'none';
    refs.banner.style.transform = 'translateY(0)';
    refs.banner.classList.add('visible');
  }

  if (refs.effectText) {
    refs.effectText.style.transition = 'none';
    refs.effectText.classList.add('visible');
  }

  if (refs.intro) {
    refs.intro.textContent = '';
    refs.intro.classList.remove('loading-dots');
  }
}

// ============================================================
// D6 helpers
// ============================================================

/**
 * Returns [rotateX, rotateY] so the given face shows as "front"
 * after the roll animation ends at ~720/540/270 total rotation.
 * We nudge the final rotation so the desired face is visible.
 *
 * CSS cube face ordering (used in buildD6Group):
 *   front=finalValue, back, right=2, left=5, top=3, bottom=4
 *
 * We want to end on the front face (rotateX=0, rotateY=0 relative to final spin).
 */
function getD6LandRotation(value) {
  // The keyframe ends at rotateX(720) rotateY(720).
  // Both are multiples of 360, so the front face (translateZ(40px)) faces the camera.
  // The front face always holds the finalValue (set in buildD6Group).
  return [720, 720];
}

function markActiveFace(cube, value) {
  const faces = cube.querySelectorAll('.d6-face');
  faces.forEach(f => f.classList.remove('active-face'));
  const front = cube.querySelector('.d6-face-front');
  if (front) {
    front.textContent = String(value);
    front.classList.add('active-face');
  }
}

function clampD6(v) {
  // Keep values in 1-6 range for dummy face values
  return ((((v - 1) % 6) + 6) % 6) + 1;
}

// ============================================================
// D10 slot machine helpers
// ============================================================

const REEL_SLOT_HEIGHT = 28; // matches .d10-reel-num height in CSS

/**
 * Build an array of numbers for the reel.
 * 'extra' slots before and after the final value for the spinning effect.
 */
function buildReelNumbers(finalValue, extra) {
  const nums = [];
  for (let i = extra; i >= 1; i--) {
    nums.push(randomD10(finalValue));
  }
  nums.push(finalValue); // index = extra (the "center" item)
  for (let i = 1; i <= extra; i++) {
    nums.push(randomD10(finalValue));
  }
  return nums;
}

function randomD10(exclude) {
  let v;
  do { v = Math.floor(Math.random() * 10) + 1; } while (v === exclude);
  return v;
}

/**
 * The reel starts at top=0, showing the first number.
 * We want the center item (index=extra=9) to be centered in the 80px window.
 * Window height: 80px, slot height: 28px.
 * Center of window: 40px. Center of desired slot: (extra * slotHeight) + 14px.
 * So: top = -(extra * 28) + (40 - 14) = -(extra * 28) + 26
 */
function getReelFinalOffset(value) {
  // We always put the final value at index 9 (extra=9)
  const extra = 9;
  return -(extra * REEL_SLOT_HEIGHT) + (40 - REEL_SLOT_HEIGHT / 2);
}

let _d10AnimFrames = {}; // track per-reel animation frames

function startD10Spin(reel, wrap, finalValue, _unused) {
  if (!reel) return;
  const id = reel.id;

  let offset = 0;
  let speed = 8; // pixels per frame

  function animate() {
    offset -= speed;
    // Wrap the reel: when past the last slot, reset
    const totalHeight = reel.children.length * REEL_SLOT_HEIGHT;
    if (Math.abs(offset) > totalHeight - 80) {
      offset += REEL_SLOT_HEIGHT * 5; // jump back up
    }
    reel.style.top = offset + 'px';
    _d10AnimFrames[id] = requestAnimationFrame(animate);
  }

  _d10AnimFrames[id] = requestAnimationFrame(animate);
}

function stopD10Spin(reel, wrap, finalValue, actionScore, context, extraData, delay300) {
  if (!reel) return;
  const id = reel.id;

  const stopAfter = delay300 ? 0 : 150;

  setTimeout(() => {
    // Cancel the running animation
    if (_d10AnimFrames[id]) {
      cancelAnimationFrame(_d10AnimFrames[id]);
      delete _d10AnimFrames[id];
    }

    // Animate smoothly to the final position
    const targetOffset = getReelFinalOffset(finalValue);
    reel.style.transition = 'top 0.45s cubic-bezier(0.34, 1.2, 0.64, 1)';
    reel.style.top = targetOffset + 'px';

    // Mark the center number as final
    const centerIndex = 9;
    const nums = reel.querySelectorAll('.d10-reel-num');
    if (nums[centerIndex]) {
      nums[centerIndex].textContent = String(finalValue);
      nums[centerIndex].classList.add('final-value');
    }

    // Color-code the wrapper after transition
    setTimeout(() => {
      if (wrap) applyD10Color(wrap, finalValue, actionScore, context, extraData);
    }, 450);
  }, stopAfter);
}

function applyD10Color(wrap, value, actionScore, context, extraData) {
  const score = context === 'epilogue_final'
    ? (extraData.overcome_score ?? 0)
    : actionScore;

  if (value >= score) {
    wrap.classList.add('beats-action');
  } else {
    wrap.classList.add('loses-to-action');
  }
}

// ============================================================
// Content helpers
// ============================================================

function getEffectText(outcome, context) {
  if (context === 'epilogue_final') {
    if (outcome === 'hit')      return 'Triunfo completo. +3 puntos de superación.';
    if (outcome === 'weak_hit') return 'Éxito parcial. +2 puntos de superación.';
    return 'Derrota. +1 punto de superación.';
  }
  if (context === 'epilogue_action') {
    if (outcome === 'hit')      return 'Éxito total. Ganas 2 puntos superados.';
    if (outcome === 'weak_hit') return 'Éxito parcial. Ganas 1 punto superado.';
    return 'Fracaso. No ganas puntos superados en esta acción.';
  }
  // chapter
  if (outcome === 'hit')      return 'Éxito total. Tu Trasfondo aumenta en 1.';
  if (outcome === 'weak_hit') return 'Éxito parcial. Tu Apoyo aumenta en 1.';
  return 'Fracaso. Tu Trasfondo disminuye en 1.';
}

// ============================================================
// Utilities
// ============================================================

function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function makeMathTerm(value, label) {
  const div = makeEl('div', 'math-term');
  const val = makeEl('div', 'math-term-value', value);
  const lbl = makeEl('div', 'math-term-label', label);
  div.appendChild(val);
  div.appendChild(lbl);
  return div;
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ============================================================
// Placeholder (static preview before rolling)
// ============================================================

/**
 * Builds a static placeholder showing the dice layout with neutral "—" values.
 * Displayed before the player rolls, so the container already has height.
 * @param {string} context - 'chapter' | 'epilogue_action' | 'epilogue_final'
 * @returns {HTMLElement}
 */
export function buildDicePlaceholder(context = 'chapter') {
  const wrapper = makeEl('div', 'dice-animator dice-placeholder');
  const inner   = makeEl('div', 'dice-animator-inner');

  // --- Dice stage ---
  const stage = makeEl('div', 'dice-stage');

  if (context === 'epilogue_final') {
    // Overcome score placeholder
    const group = makeEl('div', 'dice-group');
    const label = makeEl('div', 'dice-group-label', 'Puntuación');
    const display = makeEl('div', 'overcome-score-display visible');
    const num = makeEl('span', 'overcome-score-number', '—');
    display.appendChild(num);
    group.appendChild(label);
    group.appendChild(display);
    stage.appendChild(group);
  } else {
    // d6 placeholder — single face with "—"
    const group = makeEl('div', 'dice-group');
    const label = makeEl('div', 'dice-group-label', 'd6 — Acción');
    const box   = makeEl('div', 'd6-placeholder-box', '—');
    group.appendChild(label);
    group.appendChild(box);
    stage.appendChild(group);
  }

  // VS divider
  stage.appendChild(makeEl('div', 'dice-vs-divider', 'vs'));

  // d10 placeholders
  const challengeGroup = makeEl('div', 'dice-group');
  const challengeLabel = makeEl('div', 'dice-group-label', 'd10 — Desafío');
  const pair = makeEl('div', 'dice-challenge-pair');
  pair.appendChild(makePlaceholderD10());
  pair.appendChild(makePlaceholderD10());
  challengeGroup.appendChild(challengeLabel);
  challengeGroup.appendChild(pair);
  stage.appendChild(challengeGroup);

  inner.appendChild(stage);

  // --- Math breakdown ---
  if (context !== 'epilogue_final') {
    const math = makeEl('div', 'dice-math-breakdown');
    math.appendChild(makeMathTerm('—', 'd6'));
    math.appendChild(makeEl('span', 'math-operator', '+'));
    math.appendChild(makeMathTerm('—', 'Mod.'));
    math.appendChild(makeEl('span', 'math-operator', '='));
    const result = makeEl('div', 'math-result');
    result.appendChild(makeEl('div', 'math-result-value', '—'));
    result.appendChild(makeEl('div', 'math-result-label', 'Acción'));
    math.appendChild(result);
    inner.appendChild(math);
  }

  wrapper.appendChild(inner);
  return wrapper;
}

function makePlaceholderD10() {
  const wrap = makeEl('div', 'd10-placeholder-box', '—');
  return wrap;
}
