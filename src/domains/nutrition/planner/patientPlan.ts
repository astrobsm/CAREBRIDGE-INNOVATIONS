/**
 * The plain-English plan for the patient and family: what to eat at each
 * meal in household measures, with Igbo names where known. A data structure
 * only; the PDF is stage 6.
 */

import { FOOD_COMPOSITION_ACKNOWLEDGEMENT } from '../data/foodSourceAcknowledgement';
import type { PlanItem, WeeklyMealPlan } from './types';

export interface PatientPlanLine {
  /** e.g. "1½ × 1 wrap of Eba". */
  text: string;
  name: string;
  igboName: string;
  amount: string;
  householdMeasure: string;
  preparation?: string;
}

export interface PatientPlanMeal { label: string; time: string; lines: PatientPlanLine[] }

export interface PatientPlanDay { label: string; meals: PatientPlanMeal[]; water: string | null }

export interface PatientPlan {
  status: 'draft';
  notice: string;
  title: string;
  intro: string[];
  days: PatientPlanDay[];
  tips: string[];
  source: string;
}

const line = (i: PlanItem, igbo: boolean): PatientPlanLine => {
  const name = igbo && i.igboName ? `${i.name} (${i.igboName})` : i.name;
  return {
    text: `${i.amount.label} — ${name}`,
    name: i.name, igboName: igbo ? i.igboName : '',
    amount: i.amount.label, householdMeasure: i.householdMeasure,
    ...(i.preparationNote ? { preparation: i.preparationNote } : {}),
  };
};

export function toPatientPlan(plan: WeeklyMealPlan, opts: { igboLabels?: boolean } = {}): PatientPlan {
  const igbo = opts.igboLabels ?? true;
  const tips: string[] = [];
  const g = plan.goal;
  if (g.direction === 'loss') tips.push('Fill half the plate with vegetables. Keep to one wrap of swallow per meal and do not add extra oil.');
  if (g.direction === 'gain') tips.push('Eat little and often: do not skip the snacks. Add a spoon of palm oil or groundnut paste where the plan says so.');
  if (g.refeeding) tips.push('Feeding is being increased slowly on purpose. Do not eat more than the plan says on the first days; the team will check your blood tests.');
  if (plan.restrictions.diabetes) tips.push('Avoid sugar, sweet drinks (zobo, kunu, soft drinks) and sweet snacks. Spread starchy foods across the day.');
  if (plan.restrictions.ckd) tips.push('Keep to the portions shown: they are set for your kidneys (potassium, phosphate and protein).');
  if (plan.restrictions.sodiumMgMax) tips.push('Do not add salt or stock cubes at the table.');
  if (plan.restrictions.texture && plan.restrictions.texture !== 'regular') tips.push(`All food should be ${plan.restrictions.texture}; follow the preparation notes.`);
  if (plan.supplementsUsed) tips.push('Take the supplement drink(s) as written; they are part of the plan, not an extra.');
  return {
    status: 'draft',
    notice: plan.notice,
    title: 'Your meal plan',
    intro: [
      `About ${plan.weekly.averages.kcal} kcal and ${Math.round(plan.weekly.averages.proteinG)} g of protein a day.`,
      'This plan must be checked by your doctor or dietitian before you use it.',
    ],
    days: plan.days.map(d => ({
      label: d.label,
      meals: d.meals.filter(m => m.items.length).map(m => ({ label: m.label, time: m.time, lines: m.items.map(i => line(i, igbo)) })),
      water: d.drinkingWaterMl > 0 ? `Drink about ${d.drinkingWaterMl} mL of water across the day (about ${Math.round(d.drinkingWaterMl / 250)} cups).` : null,
    })),
    tips,
    source: FOOD_COMPOSITION_ACKNOWLEDGEMENT,
  };
}
