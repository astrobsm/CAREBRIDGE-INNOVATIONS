-- ============================================================================
-- Nutrition stage 3: the weekly meal-plan optimiser.
--
--   nutrition_plans.optimiser   JSONB  the optimiser run a draft plan came from:
--                                      planner/engine/dataset versions, the
--                                      request (targets, restrictions), the
--                                      solver inputs, constraints, relaxations
--                                      and timings (NutritionPlan.optimiser)
--   nutrition_foods.igbo_name   TEXT   Igbo name, only where certain (igboName)
--   nutrition_recipes.igbo_name TEXT
--
-- No new table, so no new policy and no hospital-scoping class: the columns
-- inherit their table's existing row level security.
--
-- Additive and idempotent: safe to run and to re-run.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.nutrition_plans') IS NOT NULL THEN
    ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS optimiser JSONB;
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'nutrition_plans';
  END IF;
  IF to_regclass('public.nutrition_foods') IS NOT NULL THEN
    ALTER TABLE public.nutrition_foods ADD COLUMN IF NOT EXISTS igbo_name TEXT;
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'nutrition_foods';
  END IF;
  IF to_regclass('public.nutrition_recipes') IS NOT NULL THEN
    ALTER TABLE public.nutrition_recipes ADD COLUMN IF NOT EXISTS igbo_name TEXT;
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'nutrition_recipes';
  END IF;
END $$;
