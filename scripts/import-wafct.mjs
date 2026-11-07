#!/usr/bin/env node
/**
 * Import the FAO/INFOODS West African Food Composition Table 2019 (WAFCT 2019)
 * into a versioned, generated dataset for the nutrition module.
 *
 *   node scripts/import-wafct.mjs [path/to/WAFCT_2019.xlsx]
 *
 * Default input: data/source/wafct2019/WAFCT_2019.xlsx (not committed; see
 * data/source/wafct2019.provenance.json for where it comes from and its
 * SHA-256). The file is only READ, as data, by exceljs: nothing in it is run.
 *
 * Output: src/domains/nutrition/data/foods/wafct2019.generated.json
 *   { meta, foods[], retentionFactors[] }
 * Per food, per 100 g edible portion: energy (kcal, kJ), water, protein, fat,
 * available carbohydrate, fibre, Na, K, Ca, Fe, Zn, P, Mg, vitamin A (RAE),
 * vitamin C, folate (DFE); flags for [bracketed] and trace values; edible
 * portion coefficients; the published yield factor for single-ingredient
 * cooked foods; and source { table, code, version, url, retrievedAt }.
 *
 * Why exceljs rather than SheetJS: the SheetJS build on the npm registry
 * (xlsx@0.18.5) is frozen with open advisories (prototype pollution, ReDoS)
 * and newer builds are only on the vendor's CDN; exceljs is maintained on npm
 * under MIT. It is a devDependency, used only by this script.
 *
 * Licence: FAO permits copying for private study, research, teaching and
 * NON-COMMERCIAL products with acknowledgement; commercial use needs an FAO
 * licence (copyright@fao.org). See the workbook's "01 Introduction" sheet.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ExcelJS from 'exceljs';
import {
  WAFCT_SHEETS, WAFCT_URL, WAFCT_TABLE, WAFCT_VERSION, NUTRIENT_UNITS, BRACKET_ALTERNATIVES,
  parseNutrientRows, parseYieldRows, parseRetentionRows, coverage,
} from './lib/wafctParse.mjs';

const INPUT = resolve(process.argv[2] ?? 'data/source/wafct2019/WAFCT_2019.xlsx');
const PROVENANCE = resolve('data/source/wafct2019.provenance.json');
const OUTPUT = resolve('src/domains/nutrition/data/foods/wafct2019.generated.json');
const CORE_OUTPUT = resolve('src/domains/nutrition/data/foods/wafct2019.core.generated.json');

if (!existsSync(INPUT)) {
  console.error(`WAFCT workbook not found at ${INPUT}.
Download it from ${WAFCT_URL}
into data/source/wafct2019/ (a folder of its own) and run this again.`);
  process.exit(1);
}

const bytes = readFileSync(INPUT);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const provenance = existsSync(PROVENANCE) ? JSON.parse(readFileSync(PROVENANCE, 'utf8')) : null;
if (provenance?.sha256 && provenance.sha256 !== sha256 && !process.argv.includes('--accept-new-hash')) {
  console.error(`SHA-256 of ${INPUT} is ${sha256},
but the recorded file is ${provenance.sha256}. If FAO re-issued the table, check the
changes, update ${PROVENANCE}, and re-run with --accept-new-hash.`);
  process.exit(1);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.load(bytes);

/** A worksheet as 0-based arrays of raw cell values. */
function sheetRows(name) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Sheet "${name}" not found. Sheets: ${wb.worksheets.map((w) => w.name).join(', ')}`);
  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row, r) => {
    const vals = [];
    for (let c = 1; c <= ws.columnCount; c++) vals.push(row.getCell(c).value);
    rows[r - 1] = vals;
  });
  return rows;
}

const retrievedAt = provenance?.retrievedAt ?? new Date().toISOString().slice(0, 10);
const { foods, problems } = parseNutrientRows(sheetRows(WAFCT_SHEETS.nutrients), { retrievedAt, url: WAFCT_URL });
const yields = parseYieldRows(sheetRows(WAFCT_SHEETS.yieldFactors));
const retentionFactors = parseRetentionRows(sheetRows(WAFCT_SHEETS.retentionFactors));

let withYield = 0;
for (const f of foods) {
  const y = yields.get(f.code);
  if (y) { f.yieldFactor = y.factor; f.yieldFactorSource = y.source; withYield++; }
}

// Compact: drop empty flag maps and nulls of optional descriptive fields.
const compact = foods.map((f) => {
  const o = { ...f };
  if (!Object.keys(o.flags).length) delete o.flags;
  if (!o.scientificName) delete o.scientificName;
  delete o.nameFr;
  return o;
});

const cov = coverage(foods);
const dataset = {
  meta: {
    table: WAFCT_TABLE,
    version: WAFCT_VERSION,
    datasetVersion: `wafct2019-${sha256.slice(0, 12)}`,
    url: WAFCT_URL,
    fileName: 'WAFCT_2019.xlsx',
    sha256,
    retrievedAt,
    sheet: WAFCT_SHEETS.nutrients,
    basis: 'per 100 g edible portion',
    units: NUTRIENT_UNITS,
    conventions: {
      bracketed: 'Value in [brackets] in WAFCT: estimated, imputed, calculated or of lower quality; kept and flagged.',
      trace: '"tr" in WAFCT: trace, below the limit of quantification; stored as 0 and flagged.',
      missing: 'Blank in WAFCT: null (unknown), never 0.',
      bracketAlternatives: BRACKET_ALTERNATIVES,
      ediblePortionFactor: 'EDIBLE1: edible portion coefficient from as purchased to as described.',
      yieldFactor: 'Cooked weight / raw weight, from sheet "07 Yield factors, sing_ing", for single-ingredient cooked foods only.',
      retentionFactors: 'Sheet "08 Retention factors" (mainly Bognár 2002 / USDA 2007): fraction of a nutrient retained by a food type and cooking process.',
    },
    citation: 'Vincent A, Grande F, Compaoré E, et al. 2020. FAO/INFOODS Food Composition Table for Western Africa (2019) User Guide & Condensed Food Composition Table. Rome, FAO.',
    licence: 'FAO: copying permitted for private study, research, teaching and non-commercial use with acknowledgement; commercial use requires an FAO licence (copyright@fao.org).',
    foodCount: foods.length,
    foodsWithYieldFactor: withYield,
    coverage: cov,
    importProblems: problems,
  },
  foods: compact,
  retentionFactors,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(dataset) + '\n');

// Core subset: the foods the seed recipes and legacy adapters name, bundled
// with the app so they work synchronously; the full table loads lazily.
const codesUsed = new Set();
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.ts$/.test(e.name)) for (const m of readFileSync(p, 'utf8').matchAll(/'(\d{2}_\d{3})'/g)) codesUsed.add(m[1]);
  }
};
walk(resolve('src/domains/nutrition/data'));
const core = compact.filter((f) => codesUsed.has(f.code)).map(({ biblioId, ...f }) => f);
const unknown = [...codesUsed].filter((c) => !foods.some((f) => f.code === c));
if (unknown.length) {
  console.error(`Codes used in src/domains/nutrition/data but not in WAFCT 2019: ${unknown.join(', ')}`);
  process.exit(1);
}
const { coverage: _c, importProblems: _p, ...coreMeta } = dataset.meta;
writeFileSync(CORE_OUTPUT, JSON.stringify({ meta: { ...coreMeta, subset: 'core', foodCount: core.length }, foods: core, retentionFactors }) + '\n');
console.log(`Wrote ${CORE_OUTPUT} (${core.length} foods used by recipes and adapters)`);

console.log(`WAFCT 2019: ${foods.length} foods, ${withYield} with yield factors, ${retentionFactors.length} retention rows.`);
console.log(`SHA-256 ${sha256}`);
for (const [k, v] of Object.entries(cov)) {
  console.log(`  ${k.padEnd(13)} present ${String(v.present).padStart(4)}  null ${String(v.null).padStart(4)}  [bracketed] ${String(v.bracketed).padStart(4)}  tr ${v.trace}`);
}
if (problems.length) {
  console.warn(`${problems.length} value(s) could not be parsed and were left null:`);
  for (const p of problems.slice(0, 30)) console.warn(`  ${p}`);
}
console.log(`Wrote ${OUTPUT}`);
