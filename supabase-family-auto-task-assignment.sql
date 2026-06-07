-- ============================================================================
-- Family App — AUTOMATIC weekly task assignments
-- ============================================================================
-- Run AFTER supabase-family-default-task-templates.sql.
--
-- Rules implemented (parent can still edit / delete / reassign any row from
-- the FamilyTasks.tsx UI — these are normal rows in family.task_assignments):
--
--   1. ACADEMIC templates (Evening — *) → assigned to EVERY active child every week.
--   2. HEALTH    templates (Personal Hygiene, …) → assigned to EVERY active child every week.
--   3. Morning Prayer (spiritual, daily) → assigned to EVERY active child every week.
--   4. NIGHT PRAYERS (Special — Night Prayers) → rotated weekly across the
--      "rotation pool" (= all children except the youngest, ordered by DOB ASC).
--   5. All other "Special — *" responsibilities (cooking, locks, dispenser,
--      cars, dust bin, Chimdalu-care, …) → evenly + orderly rotated weekly
--      across the rotation pool, offset by template index so each child gets
--      a different special task each week.
--
-- Idempotent: re-running for the same week never creates duplicate
-- assignments — dedup key is (task_id, child_id, week_start..week_start+7).
--
-- Triggers:
--   • AFTER INSERT on family.children → auto-assign for the child's parent
--     for the current week + the next 3 weeks (so a new child immediately
--     sees a populated chart).
--
-- Scheduling weekly runs:
--   • If pg_cron is enabled in your Supabase project, a weekly Monday 00:05
--     UTC job is registered automatically. If pg_cron is unavailable the
--     script still succeeds — call SELECT family.auto_assign_all_parents_week(NULL)
--     manually (or from your app) once a week.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper: compute the Monday that owns a given date (ISO week start)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.iso_week_start(p_date DATE)
RETURNS DATE
LANGUAGE sql IMMUTABLE
AS $$
  SELECT (p_date - ((EXTRACT(ISODOW FROM p_date)::int - 1)))::date;
$$;

-- ---------------------------------------------------------------------------
-- 2) Core: assign one parent's catalogue for one week
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.auto_assign_week(
  p_parent_id  UUID,
  p_week_start DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_start DATE := COALESCE(p_week_start, family.iso_week_start(CURRENT_DATE));
  v_week_end   DATE;
  v_week_no    INT;
  v_pool       UUID[];   -- rotation pool (children sorted by DOB ASC, excluding youngest)
  v_pool_size  INT;
  v_all_kids   UUID[];   -- every active child for this parent
  v_inserted   INT := 0;
  v_added      INT;
  v_task       RECORD;
  v_special_ix INT := 0;
  v_child_id   UUID;
BEGIN
  v_week_end := v_week_start + 7;
  v_week_no  := EXTRACT(WEEK FROM v_week_start)::int;

  -- All active children for this parent, oldest first.
  SELECT COALESCE(array_agg(id ORDER BY date_of_birth ASC NULLS LAST), '{}'::uuid[])
    INTO v_all_kids
  FROM family.children
  WHERE parent_id = p_parent_id AND is_active = TRUE;

  IF array_length(v_all_kids, 1) IS NULL THEN
    RETURN 0;  -- no children, nothing to do
  END IF;

  -- Rotation pool = everyone EXCEPT the youngest. If there is only one child,
  -- the pool is that child (we still want them to get the special tasks).
  IF array_length(v_all_kids, 1) > 1 THEN
    SELECT COALESCE(array_agg(id ORDER BY rn), '{}'::uuid[])
      INTO v_pool
    FROM (
      SELECT id, row_number() OVER (ORDER BY date_of_birth ASC NULLS LAST) AS rn
      FROM family.children
      WHERE parent_id = p_parent_id AND is_active = TRUE
    ) ranked
    WHERE rn <= GREATEST(array_length(v_all_kids, 1) - 1, 1);
  ELSE
    v_pool := v_all_kids;
  END IF;
  v_pool_size := array_length(v_pool, 1);

  ----------------------------------------------------------------------------
  -- A) Universal templates (every child every week):
  --      academic + health + Morning Prayer
  ----------------------------------------------------------------------------
  FOR v_task IN
    SELECT id, parent_id, title, scheduled_time
    FROM family.tasks
    WHERE parent_id = p_parent_id
      AND is_template = TRUE
      AND is_active   = TRUE
      AND ( category = 'academic'
         OR category = 'health'
         OR title    = 'Morning Prayer' )
    ORDER BY category, title
  LOOP
    FOREACH v_child_id IN ARRAY v_all_kids LOOP
      INSERT INTO family.task_assignments (task_id, child_id, assigned_by, status, due_date)
      SELECT v_task.id, v_child_id, v_task.parent_id, 'pending',
             (v_week_end - INTERVAL '1 day')::timestamptz   -- due end-of-week
      WHERE NOT EXISTS (
        SELECT 1 FROM family.task_assignments ta
        WHERE ta.task_id = v_task.id
          AND ta.child_id = v_child_id
          AND ta.due_date >= v_week_start::timestamptz
          AND ta.due_date <  v_week_end::timestamptz
      );
      GET DIAGNOSTICS v_added = ROW_COUNT;
      v_inserted := v_inserted + v_added;
    END LOOP;
  END LOOP;

  ----------------------------------------------------------------------------
  -- B) Night Prayers → ONE child per week, rotated through the pool.
  ----------------------------------------------------------------------------
  FOR v_task IN
    SELECT id, parent_id
    FROM family.tasks
    WHERE parent_id = p_parent_id
      AND is_template = TRUE
      AND is_active   = TRUE
      AND title       = 'Special — Night Prayers'
  LOOP
    v_child_id := v_pool[ (v_week_no % v_pool_size) + 1 ];
    INSERT INTO family.task_assignments (task_id, child_id, assigned_by, status, due_date)
    SELECT v_task.id, v_child_id, v_task.parent_id, 'pending',
           (v_week_end - INTERVAL '1 day')::timestamptz
    WHERE NOT EXISTS (
      SELECT 1 FROM family.task_assignments ta
      WHERE ta.task_id  = v_task.id
        AND ta.due_date >= v_week_start::timestamptz
        AND ta.due_date <  v_week_end::timestamptz
    );
    GET DIAGNOSTICS v_added = ROW_COUNT;
    v_inserted := v_inserted + v_added;
  END LOOP;

  ----------------------------------------------------------------------------
  -- C) All other Special — * (responsibility) templates → rotate evenly.
  --    Each special template is offset by its position in the ordered list,
  --    so in any given week the kids get DIFFERENT special tasks (no double-up).
  ----------------------------------------------------------------------------
  v_special_ix := 0;
  FOR v_task IN
    SELECT id, parent_id, title
    FROM family.tasks
    WHERE parent_id = p_parent_id
      AND is_template = TRUE
      AND is_active   = TRUE
      AND title LIKE 'Special — %'
      AND title <> 'Special — Night Prayers'
    ORDER BY title
  LOOP
    v_child_id := v_pool[ ((v_week_no + v_special_ix) % v_pool_size) + 1 ];
    INSERT INTO family.task_assignments (task_id, child_id, assigned_by, status, due_date)
    SELECT v_task.id, v_child_id, v_task.parent_id, 'pending',
           (v_week_end - INTERVAL '1 day')::timestamptz
    WHERE NOT EXISTS (
      SELECT 1 FROM family.task_assignments ta
      WHERE ta.task_id  = v_task.id
        AND ta.due_date >= v_week_start::timestamptz
        AND ta.due_date <  v_week_end::timestamptz
    );
    GET DIAGNOSTICS v_added = ROW_COUNT;
    v_inserted := v_inserted + v_added;
    v_special_ix := v_special_ix + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION family.auto_assign_week(UUID, DATE)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Convenience: run the assigner for every parent for a given week
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.auto_assign_all_parents_week(
  p_week_start DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INT := 0;
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM family.users LOOP
    v_total := v_total + family.auto_assign_week(u.id, p_week_start);
  END LOOP;
  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION family.auto_assign_all_parents_week(DATE)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Backfill: this week + next 3 weeks, for every parent
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_start DATE := family.iso_week_start(CURRENT_DATE);
  i INT;
BEGIN
  FOR i IN 0..3 LOOP
    PERFORM family.auto_assign_all_parents_week(v_start + (i * 7));
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Trigger: any new child → populate current + next 3 weeks for its parent
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.tg_auto_assign_for_new_child()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_start DATE := family.iso_week_start(CURRENT_DATE);
  i INT;
BEGIN
  FOR i IN 0..3 LOOP
    PERFORM family.auto_assign_week(NEW.parent_id, v_start + (i * 7));
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_family_children_auto_assign ON family.children;
CREATE TRIGGER trg_family_children_auto_assign
  AFTER INSERT ON family.children
  FOR EACH ROW
  EXECUTE FUNCTION family.tg_auto_assign_for_new_child();

-- ---------------------------------------------------------------------------
-- 6) Optional weekly cron (best-effort: pg_cron may not be available)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove a previous schedule with the same name, then register a fresh one.
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'family_auto_assign_weekly') THEN
      PERFORM cron.unschedule('family_auto_assign_weekly');
    END IF;
    PERFORM cron.schedule(
      'family_auto_assign_weekly',
      '5 0 * * 1',   -- every Monday 00:05 UTC
      $cron$ SELECT family.auto_assign_all_parents_week(NULL); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available or insufficient privileges — skipping weekly schedule (%).', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 7) Verification
-- ---------------------------------------------------------------------------
SELECT
  u.email,
  c.first_name,
  COUNT(*) FILTER (WHERE ta.due_date >= family.iso_week_start(CURRENT_DATE)::timestamptz
                    AND ta.due_date <  (family.iso_week_start(CURRENT_DATE) + 7)::timestamptz)
    AS this_week_assignments
FROM family.users u
JOIN family.children c ON c.parent_id = u.id AND c.is_active = TRUE
LEFT JOIN family.task_assignments ta ON ta.child_id = c.id
GROUP BY u.email, c.first_name, c.date_of_birth
ORDER BY u.email, c.date_of_birth;
