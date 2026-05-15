const fs = require('fs');
const path = require('path');
const { normalizeRowFromTable } = require('../lib/operationalDataSource');

/** Max length accepted for explicit operational id from the chat API host. */
const FOCUS_ITEM_ID_MAX_LEN = 2048;

let _kbCache = null;
let _datasetsCache = null;

/**
 * @returns {string}
 */
function getDataDirectory() {
  const raw = String(process.env.DEMO_DATA_DIR || '').trim();
  if (raw) return path.resolve(raw);
  return path.join(__dirname, '..', 'data');
}

/**
 * @returns {Array<{ document_name?: string, content?: string, embedding?: number[] }>}
 */
function loadKnowledgeChunks() {
  if (_kbCache) return _kbCache;
  const fp = path.join(getDataDirectory(), 'demo-knowledge-base.json');
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  _kbCache = Array.isArray(raw) ? raw : raw.chunks || [];
  return _kbCache;
}

/**
 * @returns {Record<string, Record<string, unknown>[]>}
 */
function loadOperationalDatasets() {
  if (_datasetsCache) return _datasetsCache;
  const fp = path.join(getDataDirectory(), 'demo-datasets.json');
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (Array.isArray(raw)) {
    _datasetsCache = { items: raw };
    return _datasetsCache;
  }
  if (raw && typeof raw === 'object' && raw.rows && Array.isArray(raw.rows)) {
    _datasetsCache = { items: raw.rows };
    return _datasetsCache;
  }
  _datasetsCache = /** @type {Record<string, Record<string, unknown>[]>} */ (raw || {});
  return _datasetsCache;
}

/**
 * @param {string} q
 */
function tokenSet(q) {
  return new Set(
    String(q || '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
  );
}

/**
 * @param {string} query
 * @param {string} blob
 */
function lexicalScore(query, blob) {
  const q = tokenSet(query);
  const t = tokenSet(blob);
  if (q.size === 0) return 0;
  let hit = 0;
  for (const w of q) if (t.has(w)) hit += 1;
  return hit / Math.sqrt(q.size * Math.max(1, t.size));
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function normalizeFocusItemId(raw) {
  const s = String(raw ?? '').trim();
  if (!s || s.length > FOCUS_ITEM_ID_MAX_LEN) return '';
  return s;
}

/**
 * @param {Map<string | number | unknown, unknown>} merged
 * @param {string} focusId normalized
 */
function mergedHasFocusId(merged, focusId) {
  if (!focusId || !merged.size) return false;
  return merged.has(focusId);
}

/**
 * Optional second table for demos (ignored if missing): same shape as rows.
 *
 * @param {string} table
 * @param {string} idColumn
 */
function getRowsForTable(table, idColumn) {
  const ds = loadOperationalDatasets();
  const rows = ds[table];
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.filter((row) => row && typeof row === 'object' && idColumn in row);
}

/**
 * @param {string} focusId
 * @param {string} table
 * @param {string} idColumn
 */
function fetchItemRowFromDemo(focusId, table, idColumn) {
  for (const row of getRowsForTable(table, idColumn)) {
    const rid = row[idColumn];
    if (rid != null && String(rid).trim() === focusId)
      return normalizeRowFromTable(/** @type {Record<string, unknown>} */ (row), idColumn);
  }
  return null;
}

/**
 * @param {{ content: unknown, document_name: unknown }} row
 */
function formatKnowledgeChunk(row) {
  const raw =
    row.document_name != null && String(row.document_name).trim() !== ''
      ? String(row.document_name).trim()
      : '(unnamed document)';
  const headerName = raw.replace(/\r?\n/g, ' ').trim();
  return `[Document: ${headerName}]\n${String(row.content ?? '')}`;
}

/**
 * @param {string} userQuery
 * @param {{ embedText: (text: string) => Promise<number[]> }} llm
 * @param {number} [limit]
 */
async function searchKnowledgeBase(userQuery, llm, limit = 5) {
  const chunks = loadKnowledgeChunks();
  const usable = chunks.filter((c) => c && typeof c === 'object' && String(c.content || '').trim() !== '');
  if (usable.length === 0) return '';

  const anyEmbed = usable.some((c) => Array.isArray(c.embedding) && c.embedding.length > 0);
  let queryEmbedding = null;
  if (anyEmbed && llm?.embedText) {
    try {
      queryEmbedding = await llm.embedText(userQuery);
    } catch (e) {
      console.warn('Knowledge embedding skipped; using lexical match only:', e?.message || e);
    }
  }

  /** @type {{ chunk: typeof usable[number], score: number }[]} */
  const scored = usable.map((chunk) => {
    const textBlob = `${String(chunk.document_name || '')}\n${String(chunk.content || '')}`;
    let score = lexicalScore(userQuery, textBlob);
    if (queryEmbedding && Array.isArray(chunk.embedding) && chunk.embedding.length === queryEmbedding.length) {
      score = Math.max(score, cosineSimilarity(queryEmbedding, chunk.embedding));
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const pick = scored
    .filter((x) => x.score > 0 || usable.length <= limit)
    .slice(0, limit)
    .map((x) => x.chunk);
  const finalPick = pick.length ? pick : scored.slice(0, limit).map((x) => x.chunk);

  return finalPick.map(formatKnowledgeChunk).join('\n\n---\n\n');
}

/**
 * @param {string} userQuery
 * @param {{ embedText: (text: string) => Promise<number[]> }} llm
 * @param {number} [limit]
 * @param {unknown} [focusItemId]
 * @param {{ table?: string, idColumn?: string, qualifiedLabel?: string }} [dataSource]
 * @returns {Promise<{ context: string, citeByItemId: Record<string, string> }>}
 */
async function searchDataItemsContext(userQuery, llm, limit = 5, focusItemId, dataSource = {}) {
  const table = dataSource.table || 'items';
  const idColumn = dataSource.idColumn || 'item_id';
  const qualifiedLabel = dataSource.qualifiedLabel || `${table}.${idColumn}`;

  const merged = new Map();

  /** @param {unknown[]} rows @param {string} tag */
  function addRows(rows, tag) {
    if (!Array.isArray(rows)) return;
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      const rec = /** @type {Record<string, unknown>} */ (r);
      if (rec.item_id == null) continue;
      const kid = String(rec.item_id);
      if (!kid || merged.has(kid)) continue;
      merged.set(kid, { ...rec, _match: tag });
    }
  }

  const focusId = normalizeFocusItemId(focusItemId);
  const demoRows = getRowsForTable(table, idColumn);
  const colSet =
    demoRows.length > 0 ? new Set(Object.keys(demoRows[0]).filter(Boolean)) : new Set();

  if (!colSet.has(idColumn)) {
    if (focusId) {
      return {
        context: `[No operational item records in context — ${qualifiedLabel} value "${focusId}" cannot be queried: demo dataset "${table}" is missing column "${idColumn}". Check demo-datasets.json and ITEM_DB_* settings.]`,
        citeByItemId: {},
      };
    }
    return { context: '', citeByItemId: {} };
  }

  const hasSemantic = demoRows.some(
    (r) => Array.isArray(/** @type {{ semantic_vector?: number[] }} */ (r).semantic_vector) &&
      /** @type {{ semantic_vector: number[] }} */ (r).semantic_vector.length > 0
  );

  let queryEmbedding = null;
  if (hasSemantic && llm?.embedText) {
    try {
      queryEmbedding = await llm.embedText(userQuery);
    } catch (e) {
      console.warn('Operational semantic retrieval skipped:', e?.message || e);
    }
  }

  if (focusId) {
    const row = fetchItemRowFromDemo(focusId, table, idColumn);
    if (row?.item_id) addRows([row], 'focused');
  }

  const severityMatch = userQuery.match(/\b(critical|high|medium|low|urgent)\b/i);
  if (severityMatch) {
    const sev = severityMatch[1].toLowerCase();
    const matches = demoRows
      .map((raw) =>
        normalizeRowFromTable(
          /** @type {Record<string, unknown>} */ (raw),
          idColumn
        )
      )
      .filter((norm) => String(norm.severity || '').trim().toLowerCase() === sev)
      .sort((a, b) =>
        Number(b.score) && Number(a.score)
          ? Number(b.score) - Number(a.score)
          : String(b.note).length - String(a.note).length
      )
      .slice(0, limit);
    addRows(matches, 'severity');
  }

  if (queryEmbedding) {
    /** @type {{ raw: Record<string, unknown>, sim: number }[]} */
    const semanticScores = [];
    for (const raw of demoRows) {
      const rv =
        raw && typeof raw === 'object' && 'semantic_vector' in raw
          ? /** @type {{ semantic_vector?: number[] }} */ (raw).semantic_vector
          : undefined;
      if (raw && Array.isArray(rv) && rv.length === queryEmbedding.length) {
        semanticScores.push({
          raw: /** @type {Record<string, unknown>} */ (raw),
          sim: cosineSimilarity(queryEmbedding, rv),
        });
      }
    }
    semanticScores.sort((a, b) => b.sim - a.sim);
    const topSemantic = semanticScores
      .filter((x) => x.sim >= 0.01)
      .slice(0, limit)
      .map((x) => normalizeRowFromTable(x.raw, idColumn));
    addRows(topSemantic, 'semantic');
  }

  const lexicalRows = [...demoRows]
    .map((raw) =>
      normalizeRowFromTable(
        /** @type {Record<string, unknown>} */ (raw),
        idColumn
      )
    )
    .map((norm) => {
      const blob = `${norm.item_name || ''}\n${norm.note || ''}\n${norm.severity || ''}\n${norm.status || ''}`;
      return { norm, score: lexicalScore(userQuery, blob) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.norm);

  addRows(lexicalRows, 'keyword');

  if (merged.size === 0) {
    if (focusId) {
      return {
        context: `[No operational item records in context — ${qualifiedLabel} "${focusId}" was not found, and retrieval found no rows.]`,
        citeByItemId: {},
      };
    }
    return { context: '', citeByItemId: {} };
  }

  let contextLead = '';
  if (focusId && !mergedHasFocusId(merged, focusId)) {
    contextLead = `[Requested ${qualifiedLabel} "${focusId}" was not found — unrelated matches follow.]\n\n---\n\n`;
  }

  const rowsList = [...merged.values()];
  const titleKeyCounts = new Map();
  for (const row of rowsList) {
    const t = String(row.item_name || '').trim();
    const key = t || '__untitled__';
    titleKeyCounts.set(key, (titleKeyCounts.get(key) || 0) + 1);
  }

  /** @type {Record<string, string>} */
  const citeByItemId = Object.create(null);
  for (const row of rowsList) {
    const id = String(row.item_id);
    const t = String(row.item_name || '').trim();
    const titleKey = t || '__untitled__';
    const dup = titleKeyCounts.get(titleKey) > 1;
    const shortId = id.length > 18 ? `${id.slice(0, 18)}…` : id;
    citeByItemId[id] = dup
      ? `${t || 'Untitled item'} (${id.slice(0, 8)})`
      : t || `Record (${shortId})`;
  }

  const lines = [];
  for (const row of rowsList) {
    const noteMax = row._match === 'focused' ? 16000 : 600;
    const notePreview = String(row.note || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, noteMax);
    const meta = [
      row.severity != null && row.severity !== '' ? `severity: ${row.severity}` : null,
      row.status != null && row.status !== '' ? `status: ${row.status}` : null,
      row.score != null ? `score: ${row.score}` : null,
    ]
      .filter(Boolean)
      .join(' | ');
    const cite = citeByItemId[String(row.item_id)];
    const focusBanner =
      row._match === 'focused'
        ? `Detail line: host page supplied this row by exact ${qualifiedLabel} (prioritize when answering).\n`
        : '';
    lines.push(
      `[Item ${row.item_id}] ${row.item_name || '(no title)'}${meta ? ` | ${meta}` : ''}\n` +
        `Use this citation (verbatim): [Source: ${cite}]\n` +
        (focusBanner ? `${focusBanner}\n` : '') +
        `${notePreview || '(no note)'}`
    );
  }

  return { context: contextLead + lines.join('\n\n---\n\n'), citeByItemId };
}

module.exports = {
  searchKnowledgeBase,
  searchDataItemsContext,
};
