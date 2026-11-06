/**
 * Active nutrition configuration. Every engine function takes an optional
 * config argument and defaults to this one, so a test or a future
 * locally-approved version can be passed explicitly.
 */

import { NUTRITION_CONFIG_V1 } from './nutritionConfig.v1';
import type { NutritionConfig, RegressionEquation } from './types';

export * from './types';
export { NUTRITION_CONFIG_V1 } from './nutritionConfig.v1';

export const ACTIVE_NUTRITION_CONFIG: NutritionConfig = NUTRITION_CONFIG_V1;

/** Every regression equation in a config, by id. */
export function equationById(config: NutritionConfig, id: string): RegressionEquation | undefined {
  return config.anthropometry.heightEquations.find(e => e.id === id)
    ?? config.anthropometry.weightEquations.find(e => e.id === id);
}

/**
 * Structural self-check, run by the tests: every sourceId resolves, every
 * default candidate exists, and every unconfigured slot carries a TODO.
 * Returns a list of problems (empty = consistent).
 */
export function auditConfig(config: NutritionConfig): string[] {
  const problems: string[] = [];
  const seenSource = (id: string, where: string) => {
    if (!config.sources[id]) problems.push(`${where}: unknown sourceId "${id}"`);
  };
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, `${path}[${i}]`)); return; }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'sourceId' && typeof v === 'string') seenSource(v, path);
      else if (k !== 'sources') walk(v, `${path}.${k}`);
    }
  };
  walk(config, 'config');

  const a = config.anthropometry;
  for (const table of [a.kneeHeightDefaults, a.ulnaDefaults, a.weightDefaults]) {
    for (const [pop, bySex] of Object.entries(table)) {
      for (const [sex, ids] of Object.entries(bySex)) {
        for (const id of ids) {
          const eq = equationById(config, id);
          if (!eq) problems.push(`defaults ${pop}/${sex}: unknown equation "${id}"`);
          else if (eq.sex !== sex) problems.push(`defaults ${pop}/${sex}: "${id}" is for ${eq.sex}`);
        }
      }
    }
  }
  for (const eq of [...a.heightEquations, ...a.weightEquations]) {
    if (eq.coefficients === null && !eq.todo) problems.push(`${eq.id}: null coefficients without a TODO`);
    if (eq.coefficients) {
      for (const term of Object.keys(eq.coefficients.terms)) {
        if (!eq.inputs.includes(term)) problems.push(`${eq.id}: term "${term}" not listed in inputs`);
      }
    }
  }
  return problems;
}
