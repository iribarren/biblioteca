/**
 * state.js — La Biblioteca
 * Game state management. In-memory store + localStorage persistence.
 * Provides getters, setters, and reactive update callbacks.
 */

// ============================================================
// Storage keys
// ============================================================

const STORAGE_KEY_GAME_ID    = 'biblioteca_game_id';
const STORAGE_KEY_GAME_STATE = 'biblioteca_game_state';

// ============================================================
// Internal state store
// ============================================================

let _state = {
  gameId:        null,
  game:          null,   // Full game state object from API
  oracleTables:  null,   // Cached oracle tables
  currentBook:   null,   // Book generated for current chapter/epilogue
  rollResult:    null,   // Latest roll result
  // Epilogue tracking (client-side, derived from game state)
  epilogueActionCount: 0,
};

// Change listeners
const _listeners = new Set();

// ============================================================
// Subscriber system
// ============================================================

/**
 * Register a callback to be called whenever state changes.
 * Returns an unsubscribe function.
 * @param {Function} callback
 * @returns {Function}
 */
export function subscribe(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function _notify() {
  for (const cb of _listeners) {
    try { cb(_state); } catch (e) { console.error('State listener error:', e); }
  }
}

// ============================================================
// Persistence helpers
// ============================================================

function _persistGameId(id) {
  if (id) {
    localStorage.setItem(STORAGE_KEY_GAME_ID, id);
  } else {
    localStorage.removeItem(STORAGE_KEY_GAME_ID);
    localStorage.removeItem(STORAGE_KEY_GAME_STATE);
  }
}

function _persistGameState(gameState) {
  if (gameState) {
    try {
      localStorage.setItem(STORAGE_KEY_GAME_STATE, JSON.stringify(gameState));
    } catch {
      // Storage quota exceeded — silently ignore
    }
  }
}

// ============================================================
// Getters
// ============================================================

export function getGameId() {
  return _state.gameId;
}

export function getGame() {
  return _state.game;
}

export function getCurrentPhase() {
  return _state.game?.current_phase ?? null;
}

export function getAttributes() {
  return _state.game?.attributes ?? [];
}

export function getOracleTables() {
  return _state.oracleTables;
}

export function getCurrentBook() {
  return _state.currentBook;
}

export function getLastRollResult() {
  return _state.rollResult;
}

export function getOvercomeScore() {
  return _state.game?.overcome_score ?? 0;
}

export function isSupportUsed() {
  return _state.game?.support_used ?? false;
}

/**
 * Returns which attribute types have already been used in chapters (body/mind/social).
 * Looks at roll_results from chapter phases only.
 * @returns {Set<string>}
 */
export function getUsedChapterAttributes() {
  const used = new Set();
  const results = _state.game?.roll_results ?? [];
  for (const r of results) {
    const phase = r.phase ?? '';
    if (phase.startsWith('chapter_')) {
      used.add(r.attribute_type);
    }
  }
  return used;
}

/**
 * Returns which attribute types have been used in epilogue actions.
 * @returns {Set<string>}
 */
export function getUsedEpilogueAttributes() {
  const used = new Set();
  const results = _state.game?.roll_results ?? [];
  for (const r of results) {
    const phase = r.phase ?? '';
    if (phase.startsWith('epilogue_action')) {
      used.add(r.attribute_type);
    }
  }
  return used;
}

/**
 * Returns the attribute object by type ('body', 'mind', 'social').
 * @param {string} type
 * @returns {object|null}
 */
export function getAttributeByType(type) {
  return _state.game?.attributes?.find(a => a.type === type) ?? null;
}

/**
 * Returns the total computed value for an attribute (base + background + support).
 * @param {string} type
 * @returns {number}
 */
export function getAttributeTotal(type) {
  const attr = getAttributeByType(type);
  if (!attr) return 0;
  return (attr.base_value ?? 0) + (attr.background ?? 0) + (attr.support ?? 0);
}

/**
 * Returns the current chapter number (1, 2, or 3) based on phase.
 * @returns {number|null}
 */
export function getCurrentChapterNumber() {
  const phase = getCurrentPhase();
  if (!phase) return null;
  const match = phase.match(/^chapter_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Returns the current epilogue action number (1, 2, or 3) based on phase.
 * @returns {number|null}
 */
export function getCurrentEpilogueActionNumber() {
  const phase = getCurrentPhase();
  if (!phase) return null;
  const match = phase.match(/^epilogue_action_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Returns true if there is a saved game in localStorage.
 * @returns {boolean}
 */
export function hasSavedGame() {
  return !!localStorage.getItem(STORAGE_KEY_GAME_ID);
}

/**
 * Returns the saved game ID from localStorage, or null.
 * @returns {string|null}
 */
export function getSavedGameId() {
  return localStorage.getItem(STORAGE_KEY_GAME_ID);
}

// ============================================================
// Setters / Mutators
// ============================================================

/**
 * Sets the full game state from an API response.
 * Persists to localStorage and notifies listeners.
 * @param {object} gameState
 */
export function setGame(gameState) {
  _state.game   = gameState;
  _state.gameId = gameState?.id ?? null;
  _persistGameId(_state.gameId);
  _persistGameState(gameState);
  _notify();
}

/**
 * Updates game state and optionally the current roll result.
 * Used after roll API responses that return both.
 * @param {object} game
 * @param {object|null} rollResult
 */
export function setGameWithRoll(game, rollResult = null) {
  _state.game       = game;
  _state.gameId     = game?.id ?? null;
  _state.rollResult = rollResult;
  _persistGameId(_state.gameId);
  _persistGameState(game);
  _notify();
}

/**
 * Caches the oracle tables.
 * @param {object} tables
 */
export function setOracleTables(tables) {
  _state.oracleTables = tables;
  _notify();
}

/**
 * Sets the currently-revealed book.
 * @param {object|null} book
 */
export function setCurrentBook(book) {
  _state.currentBook = book;
  _notify();
}

/**
 * Clears the current book (between phases).
 */
export function clearCurrentBook() {
  _state.currentBook = null;
  _notify();
}

/**
 * Clears the last roll result.
 */
export function clearRollResult() {
  _state.rollResult = null;
  _notify();
}

/**
 * Fully resets state (new game).
 */
export function resetState() {
  _state = {
    gameId:              null,
    game:                null,
    oracleTables:        _state.oracleTables, // keep cached tables
    currentBook:         null,
    rollResult:          null,
    epilogueActionCount: 0,
  };
  _persistGameId(null);
  _notify();
}

// ============================================================
// Hydration (on page load)
// ============================================================

/**
 * Loads persisted game ID from localStorage into state.
 * Does NOT fetch from API — caller must do that.
 */
export function hydrateFromStorage() {
  const savedId    = localStorage.getItem(STORAGE_KEY_GAME_ID);
  const savedState = localStorage.getItem(STORAGE_KEY_GAME_STATE);

  if (savedId) {
    _state.gameId = savedId;
  }

  if (savedState) {
    try {
      _state.game = JSON.parse(savedState);
    } catch {
      _state.game = null;
    }
  }
}
