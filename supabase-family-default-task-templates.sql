-- ============================================================================
-- Family App — Default task TEMPLATE catalog seed
-- ============================================================================
-- Run AFTER:
--   1) supabase-family-app-migration.sql        (creates family.tasks)
--   2) supabase-family-tasks-library-migration.sql (adds is_template, scheduled_time,
--                                                   duration_minutes, frequency, days_of_week)
--
-- What this does
-- --------------
-- Seeds the household task LIBRARY (family.tasks where is_template=TRUE) with
-- a standard set of chores / responsibilities / spiritual / health / academic
-- tasks the parent can immediately select + assign to a child from FamilyTasks.tsx.
--
-- Because family.tasks.parent_id is FK to family.users, every parent owns
-- their own copy of the catalog. This script:
--   • inserts the catalog for every existing parent (idempotent — re-runs skip
--     templates whose (parent_id,title,is_template) already exists)
--   • installs an AFTER INSERT trigger on family.users so every new parent
--     gets the catalog automatically.
--
-- Day-of-week convention (matches FamilyTasks.tsx DAY_LABELS):
--   0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Seeder function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.seed_default_task_templates(p_parent_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_catalog  RECORD;
BEGIN
  -- (title, description, category, priority, reward_amount,
  --  scheduled_time, duration_minutes, frequency, days_of_week)
  FOR v_catalog IN
    SELECT * FROM (VALUES
      -- ─── Morning routine ────────────────────────────────────────────────
      ('Room Clean-Up',
       'Make the bed, tidy belongings, arrange shoes, open curtains, air the room.',
       'chore','medium', 20::numeric, '06:30'::time, 15, 'daily', NULL::int[]),

      ('Morning Prayer',
       'Begin the day with personal devotion and prayer.',
       'spiritual','high', 0::numeric, '06:00'::time, 10, 'daily', NULL::int[]),

      ('Personal Hygiene',
       'Brush teeth, take a shower, change into clean clothes, grooming (hair, nails, neat appearance).',
       'health','high', 20::numeric, '06:15'::time, 25, 'daily', NULL::int[]),

      -- ─── House chores ──────────────────────────────────────────────────
      ('House Chore — Sitting Room Clean-Up',
       'Cobwebbing, sweeping, damp dusting, seat dusting and arrangement, place all remotes in the right place.',
       'chore','medium', 50::numeric, '07:00'::time, 30, 'daily', NULL::int[]),

      ('House Chore — Inside Corridor Clean-Up',
       'Cobwebbing, sweeping, return all items to their place, damp dusting, mop the floor, brush off the rug/carpets.',
       'chore','medium', 50::numeric, '07:00'::time, 30, 'daily', NULL::int[]),

      ('House Chore — Wash the Toilets',
       'Daddy and mummy toilets: brush the toilet walls, toilet seats and the floor; arrange the toiletries; hang all towels.',
       'chore','high', 80::numeric, '07:30'::time, 40, 'custom', ARRAY[1,4]::int[]),

      ('House Chore — Kitchen Clean-Up',
       'Sweeping, damp dusting, floor cleaning, cobwebbing, arrange all shelves and plates.',
       'chore','medium', 60::numeric, '08:00'::time, 30, 'daily', NULL::int[]),

      ('House Chore — Dish Washing',
       'Separate dishes into spoons & forks, cups, flat plates, soup plates; wash and return to the kitchen; place in the rightful places.',
       'chore','medium', 40::numeric, '08:30'::time, 25, 'daily', NULL::int[]),

      ('House Chore — Compound Clean-Up',
       'Sweeping, packing of all dirt, arrange all items, clear all unwanted items.',
       'chore','medium', 50::numeric, '07:00'::time, 30, 'custom', ARRAY[0,3,6]::int[]),

      ('House Chore — Dust Bin Emptying',
       'Empty the dustbin at the designated location, wash the dustbin, return it to its normal location.',
       'chore','low', 20::numeric, '17:30'::time, 10, 'daily', NULL::int[]),

      ('House Chore — Laundry',
       'Select dirty clothes, separate by colour and level of dirt, wash and rinse, spread on the line, pick up the dry clothes, iron and return to the wardrobes. Includes school uniforms.',
       'chore','high', 100::numeric, '09:00'::time, 90, 'custom', ARRAY[5,6]::int[]),

      -- ─── Bedroom clean-ups (pinned to a specific child by name) ────────
      ('House Chore — Girls'' Room Clean-Up',
       'Every morning: make the bed, tidy belongings, sweep, damp dust, open curtains, air the room. PERMANENTLY assigned to Ezinne.',
       'chore','high', 30::numeric, '06:30'::time, 20, 'daily', NULL::int[]),

      ('House Chore — Mummy''s Room Clean-Up',
       'Every morning: make the bed, tidy belongings, sweep, damp dust, open curtains, air the room. PERMANENTLY assigned to Chidiogu.',
       'chore','high', 30::numeric, '06:30'::time, 20, 'daily', NULL::int[]),

      ('House Chore — Daddy''s Room Clean-Up',
       'Every morning: make the bed, tidy belongings, sweep, damp dust, open curtains, air the room. PERMANENTLY assigned to Chiagozie.',
       'chore','high', 30::numeric, '06:30'::time, 20, 'daily', NULL::int[]),

      -- ─── Weekday evening (Sun→Thu) school-prep activities ──────────────
      ('Evening — Assignment Completion',
       'Complete all homework / assignments before bed.',
       'academic','high', 30::numeric, '18:00'::time, 60, 'custom', ARRAY[0,1,2,3,4]::int[]),

      ('Evening — School Uniform Check',
       'Confirm uniform is clean, ironed, complete (shirt, trousers/skirt, tie, belt, socks) and laid out for tomorrow.',
       'academic','medium', 10::numeric, '20:00'::time, 10, 'custom', ARRAY[0,1,2,3,4]::int[]),

      ('Evening — Footwear Check',
       'Polish/clean school shoes; confirm they are ready for the morning.',
       'academic','medium', 10::numeric, '20:00'::time, 10, 'custom', ARRAY[0,1,2,3,4]::int[]),

      ('Evening — Books in the Bag',
       'Pack tomorrow''s books, notebooks, pens and required materials into the school bag.',
       'academic','high', 10::numeric, '20:15'::time, 10, 'custom', ARRAY[0,1,2,3,4]::int[]),

      ('Evening — Projects Done',
       'Confirm any school project / craft / research due tomorrow is finished and packed.',
       'academic','high', 20::numeric, '20:30'::time, 20, 'custom', ARRAY[0,1,2,3,4]::int[]),

      -- ─── Special / rotating tasks ──────────────────────────────────────
      ('Special — Fill the Dispenser Water',
       'Refill the water dispenser and ensure clean drinking water is available.',
       'responsibility','medium', 20::numeric, '18:00'::time, 10, 'daily', NULL::int[]),

      ('Special — Lock the Gate',
       'Lock the main gate at the agreed time.',
       'responsibility','high', 10::numeric, '21:00'::time, 5, 'daily', NULL::int[]),

      ('Special — Lock the House Doors',
       'Check and lock all external house doors before bed.',
       'responsibility','high', 10::numeric, '21:30'::time, 5, 'daily', NULL::int[]),

      ('Special — Cook Breakfast',
       'Prepare breakfast for the family.',
       'responsibility','high', 80::numeric, '06:30'::time, 45, 'custom', ARRAY[5,6]::int[]),

      ('Special — Cook Dinner',
       'Prepare dinner for the family.',
       'responsibility','high', 100::numeric, '18:00'::time, 60, 'custom', ARRAY[5,6]::int[]),

      ('Special — Night Prayers',
       'Lead or participate in family night prayers before bed.',
       'spiritual','high', 0::numeric, '21:00'::time, 15, 'daily', NULL::int[]),

      ('Special — Wash the Cars',
       'Wash and clean the family cars (inside and outside).',
       'responsibility','medium', 150::numeric, '08:00'::time, 60, 'custom', ARRAY[6]::int[]),

      -- ─── Care of the youngest (Chimdalu) — rotating responsibilities ───
      ('Special — Care of Chimdalu''s Uniforms & Footwear',
       'Check Chimdalu''s school uniforms (clean, ironed, complete) and footwear (polished, ready). Lay out for the morning.',
       'responsibility','high', 30::numeric, '20:00'::time, 15, 'custom', ARRAY[0,1,2,3,4]::int[]),

      ('Special — Care of Chimdalu''s School Bag & Assignments',
       'Confirm Chimdalu''s homework is complete; pack books, notebooks, pens and project materials into the school bag.',
       'responsibility','high', 30::numeric, '20:15'::time, 20, 'custom', ARRAY[0,1,2,3,4]::int[]),

      ('Special — Care of Chimdalu''s Lunch Box & Water Bottle',
       'Wash and refill Chimdalu''s lunch box and water bottle for the next school day.',
       'responsibility','high', 20::numeric, '20:30'::time, 10, 'custom', ARRAY[0,1,2,3,4]::int[])
    ) AS c(title, description, category, priority, reward_amount,
           scheduled_time, duration_minutes, frequency, days_of_week)
  LOOP
    INSERT INTO family.tasks (
      parent_id, title, description, category, priority,
      reward_amount, penalty_amount,
      is_recurring, recurrence_pattern,
      is_template, is_active,
      scheduled_time, duration_minutes, frequency, days_of_week
    )
    SELECT
      p_parent_id, v_catalog.title, v_catalog.description, v_catalog.category, v_catalog.priority,
      v_catalog.reward_amount, 0::numeric,
      TRUE, v_catalog.frequency,
      TRUE, TRUE,
      v_catalog.scheduled_time, v_catalog.duration_minutes, v_catalog.frequency, v_catalog.days_of_week
    WHERE NOT EXISTS (
      SELECT 1 FROM family.tasks t
      WHERE t.parent_id = p_parent_id
        AND t.is_template = TRUE
        AND t.title = v_catalog.title
    );
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION family.seed_default_task_templates(UUID)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Backfill: seed catalog for every existing parent
-- ---------------------------------------------------------------------------
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN SELECT id FROM family.users LOOP
    PERFORM family.seed_default_task_templates(u.id);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Auto-seed for newly-created parents
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.tg_seed_tasks_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM family.seed_default_task_templates(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_family_users_seed_tasks ON family.users;
CREATE TRIGGER trg_family_users_seed_tasks
  AFTER INSERT ON family.users
  FOR EACH ROW
  EXECUTE FUNCTION family.tg_seed_tasks_for_new_user();

-- ---------------------------------------------------------------------------
-- 4) Verification
-- ---------------------------------------------------------------------------
SELECT
  u.email,
  COUNT(*) FILTER (WHERE t.is_template) AS template_count
FROM family.users u
LEFT JOIN family.tasks t ON t.parent_id = u.id AND t.is_template = TRUE
GROUP BY u.email
ORDER BY u.email;
