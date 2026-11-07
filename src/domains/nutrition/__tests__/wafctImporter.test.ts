/**
 * WAFCT 2019 importer (scripts/lib/wafctParse.mjs) on a small fixture laid
 * out like the workbook: English header, French header, tagname row, group
 * rows, food rows with [bracketed] values, "tr", "[tr]" and blanks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let P: any;
const load = async () => (P ??= await import(/* @vite-ignore */ String('../../../../scripts/lib/wafctParse.mjs')));

const TAGS = ['', '', '', '', '', 'EDIBLE1', 'EDIBLE2', 'SOP', 'ENERC ', 'ENERC ', 'WATER', 'PROTCNT ', 'FAT', 'CHOAVLDF', 'FIBTG', 'CA', 'FE',
  'MG', 'P', 'K', 'NA', 'ZN', 'VITA_RAE ', 'FOLDFE', 'VITC '];
const HEADER = ['Code', 'Food name in English', 'Food name in French', 'Scientific name', 'BiblioID/Source', 'Edible 1', 'Edible 2', 'Sum',
  'Energy\n(kJ)', 'Energy\n(kcal)', 'Water', 'Protein', 'Fat', 'Carb', 'Fibre', 'Ca', 'Fe', 'Mg', 'P', 'K', 'Na', 'Zn', 'VitA RAE', 'Folate DFE', 'Vit C'];
const FR = HEADER.map(() => 'fr');

const fixture = () => [
  HEADER, FR, TAGS,
  ['Starchy roots, tubers and their products/Racines amylacées', null, null],
  //  code      name                                   fr    sci                 biblio  E1     E2    SOP   kJ    kcal  water  prot   fat     carb  fibre  Ca  Fe     Mg  P   K    Na    Zn    VitA    Fol    VitC
  ['02_039', 'Cassava, grated, toasted (white gari)', 'fr', 'Manihot esculenta', 'NG1', '1.00', '1.00', '99', 1490, 351, '8.9', '1.2', '0.5', 82.9, '[1.8]', 42, '1.6', 23, 104, 309, '2', 0.67, 'tr', '[49]', '2'],
  ['02_099', 'Test food with blanks', 'fr', null, null, null, '1.00', null, '100', '24', '93', '[tr]', '', null, ' ', '', '-', 5, 6, 7, '', null, '[0]', null, '[tr]'],
  ['Fish and its products/Poisson', null],
  ['09_057', 'Shrimp (crayfish), whole, dried', 'fr', null, null, '0.95', '1.00', '99', 1347, 322, '15', '63.1', '3.5', 0, 0, '1000', '[5.0]', 200, 800, 900, '1298', '3', '[10]', '20', '0'],
  ['bad', 'Row with a malformed code', 'fr'],
];

describe('WAFCT importer: value conventions', () => {
  it('parses numbers, [brackets], tr, [tr] and blanks; blank is null, never 0', async () => {
    const { parseValue } = await load();
    expect(parseValue('8.9')).toEqual({ value: 8.9, flag: null });
    expect(parseValue(351)).toEqual({ value: 351, flag: null });
    expect(parseValue('[1.8]')).toEqual({ value: 1.8, flag: 'bracketed' });
    expect(parseValue('tr')).toEqual({ value: 0, flag: 'trace' });
    expect(parseValue('[tr]')).toEqual({ value: 0, flag: 'bracketed_trace' });
    for (const blank of [null, undefined, '', ' ', '-']) expect(parseValue(blank)).toEqual({ value: null, flag: null });
    expect(parseValue('<0.1').value).toBeNull();
    expect(parseValue('<0.1').problem).toMatch(/unrecognised/);
    expect(parseValue({ richText: [{ text: '[' }, { text: '2.5]' }] })).toEqual({ value: 2.5, flag: 'bracketed' });
  });

  it('finds columns by tagname, telling the two ENERC columns apart by unit', async () => {
    const { resolveColumns } = await load();
    const { cols, missing, edible1 } = resolveColumns(HEADER, TAGS);
    expect(missing).toEqual([]);
    expect(cols.energyKj).toBe(8);
    expect(cols.energyKcal).toBe(9);
    expect(cols.vitaminARae).toBe(22);
    expect(edible1).toBe(5);
  });

  it('parses the fixture: groups, flags, nulls, source and problems', async () => {
    const { parseNutrientRows, coverage } = await load();
    const { foods, problems } = parseNutrientRows(fixture(), { retrievedAt: '2026-11-07' });
    expect(foods.map((f: { code: string }) => f.code)).toEqual(['02_039', '02_099', '09_057']);
    const [gari, blanks, crayfish] = foods;
    expect(gari.foodGroup).toBe('Starchy roots, tubers and their products');
    expect(crayfish.foodGroup).toBe('Fish and its products');
    expect(gari.per100g.energyKcal).toBe(351);
    expect(gari.per100g.energyKj).toBe(1490);
    expect(gari.per100g.fibre).toBe(1.8);
    expect(gari.flags).toEqual({ fibre: 'bracketed', vitaminARae: 'trace', folateDfe: 'bracketed' });
    expect(gari.per100g.vitaminARae).toBe(0);
    expect(gari.ediblePortionFactor).toBe(1);
    expect(gari.source).toEqual({ table: 'WAFCT 2019', code: '02_039', version: '2019', url: expect.stringMatching(/^https:\/\/www\.fao\.org\//), retrievedAt: '2026-11-07' });

    expect(blanks.per100g.protein).toBe(0);
    expect(blanks.flags.protein).toBe('bracketed_trace');
    for (const k of ['fat', 'carbohydrate', 'fibre', 'calcium', 'iron', 'sodium', 'zinc', 'folateDfe']) expect(blanks.per100g[k], k).toBeNull();
    expect(blanks.per100g.vitaminC).toBe(0);
    expect(blanks.ediblePortionFactor).toBeNull();
    expect(crayfish.per100g.iron).toBe(5);
    expect(problems).toEqual([expect.stringMatching(/unexpected code "bad"/)]);

    const cov = coverage(foods);
    expect(cov.fat).toEqual({ present: 2, null: 1, bracketed: 0, trace: 0 });
    expect(cov.protein.trace).toBe(1);
  });

  it('parses yield and retention factor sheets', async () => {
    const { parseYieldRows, parseRetentionRows } = await load();
    const y = parseYieldRows([
      ['Code', 'Food name', 'fr', 'Yield factor', 'Source'],
      ['Cereals/Céréales', null],
      ['01_135', 'Rice, white, boiled', 'fr', 2.98, 'Bognár, 2002'],
      ['01_999', 'No factor', 'fr', null, null],
    ]);
    expect([...y.entries()]).toEqual([['01_135', { factor: 2.98, source: 'Bognár, 2002' }]]);
    const r = parseRetentionRows([
      ['Food', 'Process', 'fr', 'fr', 'Calcium', 'Iron', 'Vitamin A', 'Folate', 'Vitamin C'],
      ['fr'],
      [null, null, null, null, 'CA', 'FE', 'VITA, VITA_RAE, RETOL', 'FOL, FOLAC', 'VITC'],
      ['Vegetables/Légumes', null],
      ['Root, tuber and bulb vegetables', 'Sautéed, stir-fried', 'fr', 'fr', 1, 0.9, 0.95, 0.7, 0.6],
    ]);
    expect(r).toEqual([{ id: 'root_tuber_and_bulb_vegetables|sauteed_stir_fried', foodType: 'Root, tuber and bulb vegetables', process: 'Sautéed, stir-fried',
      factors: { calcium: 1, iron: 0.9, vitaminARae: 0.95, folateDfe: 0.7, vitaminC: 0.6 } }]);
  });
});

describe('WAFCT generated dataset', () => {
  const ds = JSON.parse(readFileSync(join(process.cwd(), 'src/domains/nutrition/data/foods/wafct2019.generated.json'), 'utf8'));
  const prov = JSON.parse(readFileSync(join(process.cwd(), 'data/source/wafct2019.provenance.json'), 'utf8'));

  it('is the recorded download, with provenance and licence', () => {
    expect(ds.meta.sha256).toBe(prov.sha256);
    expect(ds.meta.url).toBe(prov.url);
    expect(ds.meta.retrievedAt).toBe(prov.retrievedAt);
    expect(ds.meta.licence).toMatch(/non-commercial/);
    expect(ds.meta.importProblems).toEqual([]);
  });

  it('has every food per 100 g with a WAFCT source, and keeps missing values null', () => {
    expect(ds.foods.length).toBe(ds.meta.foodCount);
    expect(ds.foods.length).toBeGreaterThan(1000);
    for (const f of ds.foods) {
      expect(f.source.table).toBe('WAFCT 2019');
      expect(f.source.code).toBe(f.code);
      expect(typeof f.per100g.energyKcal).toBe('number');
    }
    const nulls = ds.foods.filter((f: { per100g: Record<string, unknown> }) => f.per100g.vitaminARae === null).length;
    expect(nulls).toBe(ds.meta.coverage.vitaminARae.null);
    expect(nulls).toBeGreaterThan(0);
  });
});
