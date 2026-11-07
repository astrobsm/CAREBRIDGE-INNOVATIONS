/**
 * Pure parsing for the FAO/INFOODS West African Food Composition Table 2019
 * (WAFCT 2019) Excel workbook. No file access here: scripts/import-wafct.mjs
 * reads the workbook into plain row arrays and hands them over, so the rules
 * below can be tested on a small fixture.
 *
 * WAFCT conventions handled (User Guide, section "Conventions"):
 *   - a value in [square brackets] is of lower quality: estimated, imputed,
 *     calculated, or (for fat, fibre, folate, vitamin E, beta-carotene
 *     equivalents) the alternative definition named in the column header.
 *     The number is kept and flagged 'bracketed'.
 *   - "tr" is trace: present, but below the limit of quantification. Stored
 *     as 0 and flagged 'trace' (or 'bracketed_trace' for "[tr]").
 *   - a blank cell is missing: null, never 0.
 *
 * Column positions are found by INFOODS tagname (row 3 of each data sheet),
 * not by number, so a re-issued workbook with re-ordered columns still parses.
 */

export const WAFCT_TABLE = 'WAFCT 2019';
export const WAFCT_VERSION = '2019';
export const WAFCT_URL = 'https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx';
export const WAFCT_SHEETS = {
  nutrients: '05 NV_sum_57 (per 100g EP)',
  yieldFactors: '07 Yield factors, sing_ing',
  retentionFactors: '08 Retention factors',
  mixedDishes: '09 Mixed dishes',
};

/**
 * The nutrients kept, by output field → INFOODS tagname (trimmed). Units are
 * the workbook's: g, mg, mcg per 100 g edible portion.
 */
export const NUTRIENT_TAGS = {
  energyKcal: 'ENERC_KCAL', // the sheet has two "ENERC" columns: kJ then kcal (see resolveColumns)
  energyKj: 'ENERC_KJ',
  water: 'WATER',
  protein: 'PROTCNT',
  fat: 'FAT',
  carbohydrate: 'CHOAVLDF',
  fibre: 'FIBTG',
  sodium: 'NA',
  potassium: 'K',
  calcium: 'CA',
  iron: 'FE',
  zinc: 'ZN',
  phosphorus: 'P',
  magnesium: 'MG',
  vitaminARae: 'VITA_RAE',
  vitaminC: 'VITC',
  folateDfe: 'FOLDFE',
};

export const NUTRIENT_UNITS = {
  energyKcal: 'kcal', energyKj: 'kJ', water: 'g', protein: 'g', fat: 'g', carbohydrate: 'g', fibre: 'g',
  sodium: 'mg', potassium: 'mg', calcium: 'mg', iron: 'mg', zinc: 'mg', phosphorus: 'mg', magnesium: 'mg',
  vitaminARae: 'mcg', vitaminC: 'mg', folateDfe: 'mcg',
};

/** What a bracket means for components whose header names an alternative definition. */
export const BRACKET_ALTERNATIVES = {
  fat: 'fat, derived by analysis using continuous extraction',
  fibre: 'fibre, crude (not total dietary fibre)',
};

/** Text of a cell value as exceljs gives it (string, number, rich text, formula). */
export function cellText(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if ('result' in v) return cellText(v.result);
    if ('text' in v) return String(v.text);
  }
  return String(v);
}

/**
 * One WAFCT value cell → { value, flag }.
 * flag: null | 'bracketed' | 'trace' | 'bracketed_trace'.
 * Unparseable text is reported (not guessed) through `problem`.
 */
export function parseValue(raw) {
  const text = cellText(raw);
  if (text === null) return { value: null, flag: null };
  const s = text.trim();
  if (s === '' || s === '-' || s === '—') return { value: null, flag: null };
  const bracketed = /^\[.*\]$/.test(s);
  const inner = bracketed ? s.slice(1, -1).trim() : s;
  if (/^tr$/i.test(inner)) return { value: 0, flag: bracketed ? 'bracketed_trace' : 'trace' };
  if (/^-?\d+(\.\d+)?$/.test(inner)) return { value: Number(inner), flag: bracketed ? 'bracketed' : null };
  return { value: null, flag: null, problem: `unrecognised value "${s}"` };
}

const normTag = (t) => String(t ?? '').replace(/\s+/g, '').toUpperCase();

/**
 * Map output fields to column indexes from the tagname row (0-based arrays).
 * The two ENERC columns are told apart by their English header unit.
 */
export function resolveColumns(headerRow, tagRow) {
  const cols = {};
  const missing = [];
  for (const [field, tag] of Object.entries(NUTRIENT_TAGS)) {
    let idx = -1;
    if (tag === 'ENERC_KJ' || tag === 'ENERC_KCAL') {
      const unit = tag === 'ENERC_KJ' ? '(kj)' : '(kcal)';
      idx = tagRow.findIndex((t, i) => normTag(t) === 'ENERC' && String(cellText(headerRow[i]) ?? '').toLowerCase().includes(unit));
    } else {
      idx = tagRow.findIndex((t) => normTag(t) === tag);
    }
    if (idx === -1) missing.push(field); else cols[field] = idx;
  }
  const edible1 = tagRow.findIndex((t) => normTag(t) === 'EDIBLE1');
  const edible2 = tagRow.findIndex((t) => normTag(t) === 'EDIBLE2');
  return { cols, edible1, edible2, missing };
}

/** "Cereals and their products/Céréales et produits dérivés" → English part. */
export function groupName(text) {
  return String(text).split('/')[0].trim();
}

const CODE_RE = /^\d{2}_\d{3}$/;

/**
 * Parse the nutrient sheet. `rows` are arrays of raw cell values (0-based),
 * row 0 = English header, row 1 = French header, row 2 = tagnames.
 */
export function parseNutrientRows(rows, { retrievedAt = null, url = WAFCT_URL } = {}) {
  const [header, , tags] = rows;
  const { cols, edible1, edible2, missing } = resolveColumns(header, tags);
  if (missing.length) throw new Error(`WAFCT nutrient sheet: columns not found for ${missing.join(', ')}`);
  const foods = [];
  const problems = [];
  let group = null;
  for (let r = 3; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const c0 = cellText(row[0])?.trim() ?? '';
    const name = cellText(row[1])?.trim() ?? '';
    if (!c0) continue;
    if (!name) { group = groupName(c0); continue; }
    if (!CODE_RE.test(c0)) { problems.push(`row ${r + 1}: unexpected code "${c0}"`); continue; }
    const per100g = {};
    const flags = {};
    for (const [field, idx] of Object.entries(cols)) {
      const p = parseValue(row[idx]);
      if (p.problem) problems.push(`row ${r + 1} ${c0} ${field}: ${p.problem}`);
      per100g[field] = p.value;
      if (p.flag) flags[field] = p.flag;
    }
    const e1 = edible1 >= 0 ? parseValue(row[edible1]).value : null;
    const e2 = edible2 >= 0 ? parseValue(row[edible2]).value : null;
    foods.push({
      code: c0,
      name,
      nameFr: cellText(row[2])?.trim() || null,
      scientificName: cellText(row[3])?.trim() || null,
      foodGroup: group,
      groupCode: c0.slice(0, 2),
      biblioId: cellText(row[4])?.trim() || null,
      ediblePortionFactor: e1,
      ediblePortionAsEaten: e2,
      per100g,
      flags,
      yieldFactor: null,
      yieldFactorSource: null,
      source: { table: WAFCT_TABLE, code: c0, version: WAFCT_VERSION, url, retrievedAt },
    });
  }
  return { foods, problems };
}

/**
 * Yield factors sheet (single-ingredient cooked foods): code → factor
 * (cooked weight / raw weight). Row 0 is the header.
 */
export function parseYieldRows(rows) {
  const out = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const code = cellText(row[0])?.trim() ?? '';
    if (!CODE_RE.test(code)) continue;
    const { value } = parseValue(row[3]);
    if (value !== null && value > 0) out.set(code, { factor: value, source: cellText(row[4])?.trim() || null });
  }
  return out;
}

/** Retention factor columns (row 2 tagnames) → output nutrient fields. */
const RETENTION_TAGS = {
  calcium: 'CA', iron: 'FE', magnesium: 'MG', phosphorus: 'P', potassium: 'K', sodium: 'NA', zinc: 'ZN',
  vitaminARae: 'VITA', vitaminC: 'VITC', folateDfe: 'FOL',
};

/**
 * Retention factors sheet → [{ id, foodType, process, factors }]. A factor
 * not given for a nutrient is left out (callers treat it as not applied, and
 * say so). Rows 0–1 are headers, row 2 tagnames; group rows have no process.
 */
export function parseRetentionRows(rows) {
  const tags = rows[2] ?? [];
  const idx = {};
  for (const [field, tag] of Object.entries(RETENTION_TAGS)) {
    const i = tags.findIndex((t) => normTag(t).split(',')[0] === tag);
    if (i >= 0) idx[field] = i;
  }
  const out = [];
  for (let r = 3; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const foodType = cellText(row[0])?.trim();
    const process = cellText(row[1])?.trim();
    if (!foodType || !process) continue;
    const factors = {};
    for (const [field, i] of Object.entries(idx)) {
      const { value } = parseValue(row[i]);
      if (value !== null) factors[field] = value;
    }
    if (!Object.keys(factors).length) continue;
    const id = `${foodType}|${process}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9|]+/g, '_').replace(/_+/g, '_').replace(/(^_|_$)/g, '');
    out.push({ id, foodType, process, factors });
  }
  return out;
}

/** Fields populated vs null across the dataset, for the import report. */
export function coverage(foods) {
  const fields = Object.keys(NUTRIENT_TAGS);
  const out = {};
  for (const f of fields) {
    let present = 0, bracketed = 0, trace = 0;
    for (const food of foods) {
      if (food.per100g[f] !== null) present++;
      const fl = food.flags[f];
      if (fl === 'bracketed' || fl === 'bracketed_trace') bracketed++;
      if (fl === 'trace' || fl === 'bracketed_trace') trace++;
    }
    out[f] = { present, null: foods.length - present, bracketed, trace };
  }
  return out;
}
