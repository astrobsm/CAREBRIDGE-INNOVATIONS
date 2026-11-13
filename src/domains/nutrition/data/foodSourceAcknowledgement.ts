/**
 * The source line shown or printed wherever food composition values derived
 * from WAFCT 2019 appear (food lists, meal plans, meal-plan PDFs).
 *
 * FAO permits non-commercial use of WAFCT 2019 with acknowledgement; this
 * use is non-commercial (docs/NUTRITION_ENGINE.md, "Licence and
 * acknowledgement"). Keep the wording in this one constant.
 *
 * No imports: the PDF generators use it without pulling the food data in.
 */
export const FOOD_COMPOSITION_ACKNOWLEDGEMENT =
  'Food composition: FAO/INFOODS West African Food Composition Table (2019). Values pending local dietitian verification.';
