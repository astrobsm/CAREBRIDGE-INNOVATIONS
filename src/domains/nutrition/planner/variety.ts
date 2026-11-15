/**
 * The variety rules, checked on a finished plan (independently of how the
 * menu was built):
 *   - no main dish more than twice in the plan's week;
 *   - lunch and dinner on the same day built on different protein sources
 *     (unless the planner recorded, in trace.relaxations, that no allowed
 *     menu could keep them apart), and more than one source
 *     across the week when more than one is allowed;
 *   - at least one vegetable every day;
 *   - at least one fruit every day unless the restrictions allow none.
 */

import { MAX_MAIN_DISH_PER_WEEK } from './menu';
import type { WeeklyMealPlan } from './types';

export interface VarietyReport { ok: boolean; problems: string[]; mainDishCounts: Record<string, number>; proteinSources: string[] }

export function checkVariety(plan: WeeklyMealPlan, opts: { fruitAllowed?: boolean; proteinSourcesAllowed?: number } = {}): VarietyReport {
  const problems: string[] = [];
  const counts: Record<string, number> = {};
  const sources = new Set<string>();
  for (const d of plan.days) {
    for (const m of d.meals) if (m.mainDish) counts[m.mainDish] = (counts[m.mainDish] ?? 0) + 1;
    const lunch = d.meals.find(m => m.slot === 'lunch')?.proteinSource ?? null;
    const dinner = d.meals.find(m => m.slot === 'dinner')?.proteinSource ?? null;
    if (lunch) sources.add(lunch);
    if (dinner) sources.add(dinner);
    // A repeat the planner recorded as a forced relaxation (no menu could avoid it) is reported there, not here.
    const relaxed = plan.trace.relaxations.some(r => r.day === d.day && r.what.startsWith('protein rotation relaxed'));
    if (lunch && dinner && lunch === dinner && !relaxed && (opts.proteinSourcesAllowed ?? 2) > 1) problems.push(`${d.label}: lunch and dinner both built on ${lunch}`);
    const items = d.meals.flatMap(m => m.items);
    if (!items.some(i => i.role === 'vegetable')) problems.push(`${d.label}: no vegetable`);
    if ((opts.fruitAllowed ?? true) && !items.some(i => i.role === 'fruit')) problems.push(`${d.label}: no fruit`);
  }
  for (const [k, n] of Object.entries(counts)) if (n > MAX_MAIN_DISH_PER_WEEK) problems.push(`main dish ${k} served ${n} times (limit ${MAX_MAIN_DISH_PER_WEEK})`);
  if (plan.days.length >= 3 && (opts.proteinSourcesAllowed ?? 2) > 1 && sources.size < 2) problems.push(`only one protein source across the plan (${[...sources].join(', ')})`);
  return { ok: problems.length === 0, problems, mainDishCounts: counts, proteinSources: [...sources] };
}
