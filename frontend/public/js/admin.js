/**
 * admin.js — La Biblioteca: Panel de Administración
 * ES module. No external dependencies.
 *
 * Handles:
 *  - Client-side password gate (sessionStorage)
 *  - Fetching and rendering oracle categories + options
 *  - CRUD operations: add option, inline edit, toggle active, soft delete
 *  - Toast notifications
 *  - Delete confirmation modal
 */

'use strict';

// ============================================================
// CONFIGURATION
// ============================================================

const BASE_URL = 'http://localhost:8080';

// Admin password (client-side gate — MVP only)
const ADMIN_PASSWORD = 'biblioteca2026';
const SESSION_KEY    = 'admin_auth';

// Spanish display labels for category names
const CATEGORY_LABELS = {
  color:   'Color',
  binding: 'Encuadernación',
  smell:   'Olor',
  interior: 'Interior',
  genre:   'Género',
  epoch:   'Época',
};

// ============================================================
// HTTP HELPERS
// ============================================================

/**
 * Generic fetch wrapper. Returns parsed JSON or throws an Error
 * with a descriptive message.
 *
 * @param {string} path - relative path under BASE_URL
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function apiFetch(path, options = {}) {
  const defaults = {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...defaults,
    ...options,
    headers: { ...defaults.headers, ...(options.headers ?? {}) },
  });

  if (!response.ok) {
    let message = `Error ${response.status}: ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.error)   message = body.error;
      if (body.message) message = body.message;
    } catch (_) { /* ignore JSON parse failure */ }
    throw new Error(message);
  }

  // 204 No Content — nothing to parse
  if (response.status === 204) return null;

  return response.json();
}

/** GET /api/admin/oracle */
function fetchCategories() {
  return apiFetch('/api/admin/oracle');
}

/**
 * POST /api/admin/oracle/{categoryName}
 * @param {string} categoryName
 * @param {{ value: string, hint: string }} body
 */
function addOption(categoryName, body) {
  return apiFetch(`/api/admin/oracle/${encodeURIComponent(categoryName)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT /api/admin/oracle/options/{id}
 * @param {number} id
 * @param {{ value?: string, hint?: string, is_active?: boolean }} body
 */
function updateOption(id, body) {
  return apiFetch(`/api/admin/oracle/options/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE /api/admin/oracle/options/{id}
 * Soft delete — backend sets is_active = false.
 * @param {number} id
 */
function deleteOption(id) {
  return apiFetch(`/api/admin/oracle/options/${id}`, { method: 'DELETE' });
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/**
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 * @param {number} [duration=3500]
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', info: '✦' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <em class="toast-icon" aria-hidden="true">${icons[type] ?? '✦'}</em>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add('toast-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  const timer = setTimeout(dismiss, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}

// ============================================================
// DELETE CONFIRMATION MODAL
// ============================================================

let pendingDeleteResolve = null;

/**
 * Shows the delete confirmation modal and returns a Promise
 * that resolves to true (confirmed) or false (cancelled).
 * @param {string} optionValue
 * @returns {Promise<boolean>}
 */
function confirmDelete(optionValue) {
  return new Promise(resolve => {
    pendingDeleteResolve = resolve;

    const modal   = document.getElementById('modal-delete');
    const msgEl   = document.getElementById('modal-delete-body');

    msgEl.textContent =
      `La opción "${optionValue}" será desactivada y ya no aparecerá en el oráculo. ¿Deseas continuar?`;

    modal.hidden = false;
    document.getElementById('btn-confirm-delete').focus();
  });
}

function closeDeleteModal(result) {
  document.getElementById('modal-delete').hidden = true;
  if (pendingDeleteResolve) {
    pendingDeleteResolve(result);
    pendingDeleteResolve = null;
  }
}

// ============================================================
// UTILITIES
// ============================================================

/** Escape HTML special characters to prevent XSS. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// RENDERING — CATEGORY CARDS
// ============================================================

/**
 * Build and return a <details> element for one category.
 * @param {{ id: number, name: string, options: Array }} category
 * @returns {HTMLElement}
 */
function buildCategoryCard(category) {
  const label     = CATEGORY_LABELS[category.name] ?? category.name;
  const activeCount = category.options.filter(o => o.is_active).length;

  const details = document.createElement('details');
  details.className = 'category-card';
  details.open = true; // all open by default
  details.dataset.categoryName = category.name;

  // --- Summary (clickable header) ---
  const summary = document.createElement('summary');
  summary.className = 'category-summary';
  summary.innerHTML = `
    <span class="category-name">${escapeHtml(label)}</span>
    <span class="category-badge">${activeCount} activa${activeCount !== 1 ? 's' : ''}</span>
    <span class="category-chevron" aria-hidden="true">▼</span>
  `;
  details.appendChild(summary);

  // --- Body ---
  const body = document.createElement('div');
  body.className = 'category-body';

  // Table wrapper
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'options-table-wrapper';
  tableWrapper.appendChild(buildOptionsTable(category));
  body.appendChild(tableWrapper);

  // Add option form
  body.appendChild(buildAddOptionForm(category.name));

  details.appendChild(body);
  return details;
}

/**
 * Build the options table for a category.
 * @param {{ name: string, options: Array }} category
 * @returns {HTMLTableElement}
 */
function buildOptionsTable(category) {
  const table = document.createElement('table');
  table.className = 'options-table';
  table.setAttribute('aria-label', `Opciones de ${CATEGORY_LABELS[category.name] ?? category.name}`);

  table.innerHTML = `
    <thead>
      <tr>
        <th class="col-value">Valor</th>
        <th class="col-hint">Pista</th>
        <th class="col-active">Activa</th>
        <th class="col-actions">Acciones</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  tbody.id = `tbody-${category.name}`;

  if (category.options.length === 0) {
    tbody.appendChild(buildEmptyRow());
  } else {
    // Sort: active first, then by display_order
    const sorted = [...category.options].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
    sorted.forEach(opt => tbody.appendChild(buildOptionRow(opt)));
  }

  table.appendChild(tbody);
  return table;
}

/** Build the "no options yet" empty row. */
function buildEmptyRow() {
  const tr = document.createElement('tr');
  tr.className = 'empty-row';
  tr.innerHTML = `<td class="table-empty" colspan="4">Sin opciones. Añade la primera abajo.</td>`;
  return tr;
}

/**
 * Build one <tr> for an option.
 * @param {{ id, value, hint, is_active, display_order }} option
 * @returns {HTMLTableRowElement}
 */
function buildOptionRow(option) {
  const tr = document.createElement('tr');
  tr.dataset.optionId = option.id;
  if (!option.is_active) tr.classList.add('row-inactive');

  // Unique IDs for toggle label association
  const toggleId = `toggle-${option.id}`;

  tr.innerHTML = `
    <td class="col-value">
      <input
        class="field-editable field-value"
        type="text"
        value="${escapeHtml(option.value)}"
        aria-label="Valor de la opción"
        data-original="${escapeHtml(option.value)}"
      >
    </td>
    <td class="col-hint">
      <input
        class="field-editable field-hint"
        type="text"
        value="${escapeHtml(option.hint ?? '')}"
        aria-label="Pista de la opción"
        data-original="${escapeHtml(option.hint ?? '')}"
        placeholder="—"
      >
    </td>
    <td class="col-active">
      <div class="toggle-wrap">
        <input
          class="toggle-input"
          type="checkbox"
          id="${toggleId}"
          aria-label="Activar/desactivar opción"
          ${option.is_active ? 'checked' : ''}
        >
        <label class="toggle-label" for="${toggleId}">
          <span class="toggle-track"></span>
          <span class="toggle-thumb"></span>
        </label>
      </div>
    </td>
    <td class="col-actions">
      <button
        class="btn-admin btn-admin-icon btn-delete"
        aria-label="Eliminar opción"
        title="Eliminar opción"
      >✕</button>
    </td>
  `;

  return tr;
}

/**
 * Build the "add option" form for a category.
 * @param {string} categoryName
 * @returns {HTMLElement}
 */
function buildAddOptionForm(categoryName) {
  const section = document.createElement('div');
  section.className = 'add-option-section';

  const formId = `form-add-${categoryName}`;

  section.innerHTML = `
    <p class="add-option-title">Añadir opción</p>
    <form class="add-option-form" id="${formId}" novalidate>
      <div class="form-field">
        <label class="form-label" for="${formId}-value">Valor <span aria-hidden="true">*</span></label>
        <input
          class="form-input"
          type="text"
          id="${formId}-value"
          name="value"
          placeholder="Ej: Cuero envejecido"
          required
          autocomplete="off"
        >
      </div>
      <div class="form-field">
        <label class="form-label" for="${formId}-hint">Pista</label>
        <input
          class="form-input"
          type="text"
          id="${formId}-hint"
          name="hint"
          placeholder="Descripción breve (opcional)"
          autocomplete="off"
        >
      </div>
      <div class="form-field">
        <label class="form-label" style="visibility:hidden" aria-hidden="true">.</label>
        <button type="submit" class="btn-admin btn-admin-primary">
          + Añadir
        </button>
      </div>
    </form>
  `;

  return section;
}

// ============================================================
// RENDERING — TOP-LEVEL
// ============================================================

/**
 * Render all categories into #categories-container.
 * @param {Array} categories
 */
function renderCategories(categories) {
  const container = document.getElementById('categories-container');
  container.innerHTML = '';

  if (categories.length === 0) {
    container.innerHTML = `
      <p style="color:var(--text-muted);font-style:italic;text-align:center;padding:3rem 0;">
        No se encontraron categorías.
      </p>
    `;
    return;
  }

  categories.forEach(cat => container.appendChild(buildCategoryCard(cat)));
}

/**
 * Update the badge on a category card with the current active count.
 * @param {string} categoryName
 */
function refreshCategoryBadge(categoryName) {
  const details = document.querySelector(`[data-category-name="${categoryName}"]`);
  if (!details) return;

  const rows = details.querySelectorAll('tbody tr:not(.empty-row)');
  let active = 0;
  rows.forEach(row => {
    const toggle = row.querySelector('.toggle-input');
    if (toggle && toggle.checked) active++;
  });

  const badge = details.querySelector('.category-badge');
  if (badge) badge.textContent = `${active} activa${active !== 1 ? 's' : ''}`;
}

// ============================================================
// EVENT DELEGATION — INLINE EDIT
// ============================================================

/**
 * Save an inline-edit field when the user leaves it or presses Enter/Escape.
 * Compares against data-original to avoid unnecessary API calls.
 * @param {HTMLInputElement} input
 * @param {'value'|'hint'} field
 */
async function handleFieldSave(input, field) {
  const row      = input.closest('tr');
  const optionId = Number(row.dataset.optionId);
  const newVal   = input.value.trim();
  const original = input.dataset.original;

  // No change — restore display value in case of accidental space
  if (newVal === original) {
    input.value = original;
    return;
  }

  if (field === 'value' && newVal === '') {
    showToast('El valor no puede estar vacío.', 'error');
    input.value = original;
    return;
  }

  input.disabled = true;
  try {
    await updateOption(optionId, { [field]: newVal });
    input.dataset.original = newVal;
    input.value = newVal;
    showToast('Opción actualizada.', 'success');
  } catch (err) {
    showToast(`Error al guardar: ${err.message}`, 'error');
    input.value = original;
  } finally {
    input.disabled = false;
  }
}

// ============================================================
// EVENT DELEGATION — CATEGORIES CONTAINER
// ============================================================

/**
 * Attach all event listeners to #categories-container via event delegation.
 * This single listener handles: inline edit, toggle active, delete.
 */
function attachCategoryListeners() {
  const container = document.getElementById('categories-container');

  // ---- Inline edit: blur ----
  container.addEventListener('focusout', async e => {
    const input = e.target;
    if (!input.matches('.field-editable')) return;

    const field = input.classList.contains('field-value') ? 'value' : 'hint';
    await handleFieldSave(input, field);
  });

  // ---- Inline edit: Enter / Escape ----
  container.addEventListener('keydown', e => {
    if (!e.target.matches('.field-editable')) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur(); // triggers focusout -> handleFieldSave
    }

    if (e.key === 'Escape') {
      e.target.value = e.target.dataset.original;
      e.target.blur();
    }
  });

  // ---- Toggle active ----
  container.addEventListener('change', async e => {
    if (!e.target.matches('.toggle-input')) return;

    const toggle   = e.target;
    const row      = toggle.closest('tr');
    const optionId = Number(row.dataset.optionId);
    const isActive = toggle.checked;

    toggle.disabled = true;
    try {
      await updateOption(optionId, { is_active: isActive });
      row.classList.toggle('row-inactive', !isActive);

      const categoryName = row.closest('[data-category-name]')?.dataset.categoryName;
      if (categoryName) refreshCategoryBadge(categoryName);

      showToast(isActive ? 'Opción activada.' : 'Opción desactivada.', 'success');
    } catch (err) {
      // Revert toggle on error
      toggle.checked = !isActive;
      showToast(`Error al actualizar: ${err.message}`, 'error');
    } finally {
      toggle.disabled = false;
    }
  });

  // ---- Delete ----
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;

    const row      = btn.closest('tr');
    const optionId = Number(row.dataset.optionId);
    const valueInput = row.querySelector('.field-value');
    const valueLabel = valueInput ? valueInput.value : `ID ${optionId}`;

    const confirmed = await confirmDelete(valueLabel);
    if (!confirmed) return;

    btn.disabled = true;
    try {
      await deleteOption(optionId);

      const tbody        = row.closest('tbody');
      const categoryName = row.closest('[data-category-name]')?.dataset.categoryName;

      row.remove();

      // Show empty row if no options remain
      const remaining = tbody.querySelectorAll('tr:not(.empty-row)');
      if (remaining.length === 0) {
        tbody.appendChild(buildEmptyRow());
      }

      if (categoryName) refreshCategoryBadge(categoryName);
      showToast('Opción eliminada.', 'success');
    } catch (err) {
      btn.disabled = false;
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  });
}

// ============================================================
// EVENT DELEGATION — ADD OPTION FORMS
// ============================================================

function attachAddFormListeners() {
  const container = document.getElementById('categories-container');

  container.addEventListener('submit', async e => {
    if (!e.target.matches('.add-option-form')) return;
    e.preventDefault();

    const form         = e.target;
    const categoryName = form.id.replace('form-add-', '');
    const valueInput   = form.querySelector('[name="value"]');
    const hintInput    = form.querySelector('[name="hint"]');
    const submitBtn    = form.querySelector('[type="submit"]');

    const value = valueInput.value.trim();
    const hint  = hintInput.value.trim();

    if (!value) {
      showToast('El campo "Valor" es obligatorio.', 'error');
      valueInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const newOption = await addOption(categoryName, { value, hint });

      // Clear form
      valueInput.value = '';
      hintInput.value  = '';

      // Add new row to the table
      const tbody = document.getElementById(`tbody-${categoryName}`);
      if (tbody) {
        // Remove empty-row if present
        const emptyRow = tbody.querySelector('.empty-row');
        if (emptyRow) emptyRow.remove();

        tbody.appendChild(buildOptionRow(newOption));
        refreshCategoryBadge(categoryName);
      }

      showToast('Opción añadida correctamente.', 'success');
      valueInput.focus();
    } catch (err) {
      showToast(`Error al añadir: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '+ Añadir';
    }
  });
}

// ============================================================
// PASSWORD GATE
// ============================================================

function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function authenticate() {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

function deauthenticate() {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Show the admin panel and hide the password gate. */
function showAdminPanel() {
  document.getElementById('password-gate').style.display = 'none';
  document.getElementById('admin-panel').hidden = false;
}

/** Show the password gate and hide the admin panel. */
function showPasswordGate() {
  document.getElementById('password-gate').style.display = '';
  document.getElementById('admin-panel').hidden = true;
}

function initPasswordGate() {
  const form      = document.getElementById('password-form');
  const input     = document.getElementById('gate-password');
  const errorEl   = document.getElementById('gate-error');

  form.addEventListener('submit', e => {
    e.preventDefault();
    errorEl.hidden = true;

    if (input.value === ADMIN_PASSWORD) {
      authenticate();
      showAdminPanel();
      input.value = '';
      loadCategories();
    } else {
      input.value = '';
      errorEl.hidden = false;
      input.focus();
    }
  });
}

// ============================================================
// LOAD CATEGORIES
// ============================================================

async function loadCategories() {
  const loadingEl  = document.getElementById('categories-loading');
  const errorEl    = document.getElementById('categories-error');
  const errorMsgEl = document.getElementById('categories-error-msg');
  const container  = document.getElementById('categories-container');

  loadingEl.hidden  = false;
  errorEl.hidden    = true;
  container.hidden  = true;

  try {
    const categories = await fetchCategories();
    renderCategories(categories);
    container.hidden = false;
  } catch (err) {
    errorMsgEl.textContent = `Error al cargar: ${err.message}`;
    errorEl.hidden = false;
  } finally {
    loadingEl.hidden = true;
  }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- Password gate form ---
  initPasswordGate();

  // --- Logout button ---
  document.getElementById('btn-logout').addEventListener('click', () => {
    deauthenticate();
    showPasswordGate();
  });

  // --- Delete modal buttons ---
  document.getElementById('btn-confirm-delete').addEventListener('click', () => closeDeleteModal(true));
  document.getElementById('btn-cancel-delete').addEventListener('click',  () => closeDeleteModal(false));

  // Close modal on overlay click
  document.getElementById('modal-delete').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDeleteModal(false);
  });

  // Close modal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal-delete');
      if (!modal.hidden) closeDeleteModal(false);
    }
  });

  // --- Retry button ---
  document.getElementById('btn-retry-load').addEventListener('click', loadCategories);

  // --- Category container event delegation (inline edit, toggle, delete) ---
  attachCategoryListeners();
  attachAddFormListeners();

  // --- Auto-enter if already authenticated in this session ---
  if (isAuthenticated()) {
    showAdminPanel();
    loadCategories();
  }
});
