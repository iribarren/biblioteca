/**
 * api.js — La Biblioteca
 * API client module. All fetch calls to the Symfony backend.
 * All functions return parsed JSON or throw an ApiError.
 */

const BASE_URL = 'http://localhost:8080';

// ============================================================
// Error class
// ============================================================

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ============================================================
// Core fetch helper
// ============================================================

async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch (networkError) {
    throw new ApiError(
      'No se pudo conectar con el servidor. Comprueba que el backend esté en marcha.',
      0,
      null
    );
  }

  let responseBody;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
  } else {
    responseBody = await response.text();
  }

  if (!response.ok) {
    const message =
      (responseBody && responseBody.message) ||
      (responseBody && responseBody.error) ||
      `Error del servidor (${response.status})`;
    throw new ApiError(message, response.status, responseBody);
  }

  return responseBody;
}

const get  = (path)        => request('GET',  path);
const post = (path, body)  => request('POST', path, body);

// ============================================================
// Oracle endpoints
// ============================================================

/**
 * Returns all oracle tables.
 * @returns {{ genre: Array, epoch: Array, color: Array, binding: Array, smell: Array, interior: Array }}
 */
export function fetchOracleTables() {
  return get('/api/oracle/tables');
}

/**
 * Returns a random genre + epoch setting.
 * @returns {{ genre: {value, hint}, epoch: {value, hint} }}
 */
export function fetchRandomSetting() {
  return get('/api/oracle/random-setting');
}

// ============================================================
// Game lifecycle
// ============================================================

/**
 * Lists all game sessions (most recent first).
 * @returns {Array<{ id, character_name, genre, epoch, current_phase, phase_label, created_at, updated_at }>}
 */
export function fetchGames() {
  return get('/api/games');
}

/**
 * Creates a new game. Returns full game state.
 */
export function createGame() {
  return post('/api/game', {});
}

/**
 * Loads an existing game by ID.
 * @param {string} gameId
 */
export function fetchGame(gameId) {
  return get(`/api/game/${gameId}`);
}

/**
 * Submits prologue data (character + setting + journal entry).
 * @param {string} gameId
 * @param {{ character_name: string, character_description: string, genre: string, epoch: string }} data
 */
export function submitPrologue(gameId, data) {
  return post(`/api/game/${gameId}/prologue`, data);
}

// ============================================================
// Chapter endpoints
// ============================================================

/**
 * Generates a book for the current chapter.
 * @param {string} gameId
 * @returns {{ id, phase, color, color_hint, binding, binding_hint, smell, smell_hint, interior }}
 */
export function generateChapterBook(gameId) {
  return post(`/api/game/${gameId}/chapter/book`, {});
}

/**
 * Rolls dice for the current chapter.
 * @param {string} gameId
 * @param {'body'|'mind'|'social'} attribute
 * @returns {{ roll_result: {...}, game: {...} }}
 */
export function rollChapter(gameId, attribute) {
  return post(`/api/game/${gameId}/chapter/roll`, { attribute });
}

// ============================================================
// Epilogue endpoints
// ============================================================

/**
 * Generates the epilogue book.
 * @param {string} gameId
 * @returns book object
 */
export function generateEpilogueBook(gameId) {
  return post(`/api/game/${gameId}/epilogue/book`, {});
}

/**
 * Performs one epilogue action roll.
 * @param {string} gameId
 * @param {'body'|'mind'|'social'} attribute
 * @param {string|null} supportAttribute
 * @returns {{ roll_result: {...}, game: {...} }}
 */
export function rollEpilogueAction(gameId, attribute, supportAttribute = null) {
  return post(`/api/game/${gameId}/epilogue/action`, {
    attribute,
    support_attribute: supportAttribute,
  });
}

/**
 * Performs the epilogue final roll.
 * @param {string} gameId
 * @returns {{ roll_result: {...}, game: {...} }}
 */
export function rollEpilogueFinal(gameId) {
  return post(`/api/game/${gameId}/epilogue/final`, {});
}

// ============================================================
// Journal endpoints
// ============================================================

/**
 * Saves a journal entry for the current phase.
 * @param {string} gameId
 * @param {string} content
 * @param {number|null} bookId
 */
export function saveJournalEntry(gameId, content, bookId = null) {
  return post(`/api/game/${gameId}/journal`, { content, book_id: bookId });
}

/**
 * Loads all journal entries for a game.
 * @param {string} gameId
 * @returns {Array}
 */
export function fetchJournalEntries(gameId) {
  return get(`/api/game/${gameId}/journal`);
}
