/**
 * Operational data presets for Data-tab demos (bundled JSON). Table / id-column names scope which key and field are used in demo-datasets.json.
 * Identifiers are restricted to JS-object-safe JSON keys / field names: [a-zA-Z_][a-zA-Z0-9_]*
 */

const MAX_IDENT_LEN = 63;

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function sanitizePgIdentifier(raw) {
  const s = String(raw ?? '').trim();
  if (!s || s.length > MAX_IDENT_LEN) return null;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) return null;
  return s;
}

const NAME_CANDIDATES = [
  'item_name',
  'issue_name',
  'device_name',
  'display_name',
  'managed_device_name',
  'computer_name',
  'name',
  'title',
  'hostname',
  'friendly_name',
];

const NOTE_CANDIDATES = [
  'note',
  'description',
  'details',
  'body',
  'summary',
  'notes',
  'additional_information',
];

const SEVERITY_CANDIDATES = ['severity', 'risk_level', 'risk_severity'];
const STATUS_CANDIDATES = ['status', 'enrollment_state', 'sync_status', 'compliance_state', 'state'];
const SCORE_CANDIDATES = ['score', 'risk_score', 'priority'];

/**
 * @param {unknown} body
 * @param {{ table: string, idColumn: string }} defaults
 * @returns {{ table: string, idColumn: string, qualifiedLabel: string }}
 */
function resolveOperationalTableConfig(body, defaults) {
  const rawTbl = body && typeof body === 'object' ? readBodyField(body, 'itemDbTbl', 'item_db_tbl') : '';
  const rawCol = body && typeof body === 'object' ? readBodyField(body, 'itemDbColId', 'item_db_col_id') : '';

  const table = sanitizePgIdentifier(rawTbl) || defaults.table || 'items';
  const idColumn = sanitizePgIdentifier(rawCol) || defaults.idColumn || 'item_id';

  return {
    table,
    idColumn,
    qualifiedLabel: `${table}.${idColumn}`,
  };
}

/**
 * @param {object} body
 * @param {string} camel
 * @param {string} snake
 */
function readBodyField(body, camel, snake) {
  if (Object.prototype.hasOwnProperty.call(body, camel)) {
    const v = /** @type {{ [k: string]: unknown }} */ (body)[camel];
    return v == null ? '' : String(v);
  }
  if (Object.prototype.hasOwnProperty.call(body, snake)) {
    const v = /** @type {{ [k: string]: unknown }} */ (body)[snake];
    return v == null ? '' : String(v);
  }
  return '';
}

/**
 * Map a row from bundled JSON into the shape expected by context formatting.
 *
 * @param {Record<string, unknown>} row
 * @param {string} idColumn
 * @returns {{ item_id: string, item_name: string, note: string, severity: string, status: string, score: number | null }}
 */
function normalizeRowFromTable(row, idColumn) {
  const item_id = row[idColumn] != null ? String(row[idColumn]) : '';
  let item_name = '';
  for (const k of NAME_CANDIDATES) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') {
      item_name = String(v).trim();
      break;
    }
  }

  let note = '';
  for (const k of NOTE_CANDIDATES) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') {
      note = String(v).trim();
      break;
    }
  }
  if (!note) {
    const skip = new Set([idColumn, ...NAME_CANDIDATES]);
    const lines = [];
    for (const [k, v] of Object.entries(row)) {
      if (skip.has(k)) continue;
      if (v == null || v === '') continue;
      if (typeof v === 'object') {
        try {
          lines.push(`${k}: ${JSON.stringify(v)}`);
        } catch {
          lines.push(`${k}: [object]`);
        }
      } else {
        lines.push(`${k}: ${String(v)}`);
      }
    }
    note = lines.join('\n');
  }

  let severity = '';
  for (const k of SEVERITY_CANDIDATES) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') {
      severity = String(v).trim();
      break;
    }
  }

  let status = '';
  for (const k of STATUS_CANDIDATES) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') {
      status = String(v).trim();
      break;
    }
  }

  let score = null;
  for (const k of SCORE_CANDIDATES) {
    const v = row[k];
    if (v == null) continue;
    const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
    if (Number.isFinite(n)) {
      score = n;
      break;
    }
  }

  return { item_id, item_name, note, severity, status, score };
}

module.exports = {
  sanitizePgIdentifier,
  resolveOperationalTableConfig,
  normalizeRowFromTable,
};
