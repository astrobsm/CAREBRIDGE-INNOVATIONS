-- ============================================================================
-- Family App — Bedroom pinning, chore rotation, parent APPROVAL workflow
-- ============================================================================
-- Run AFTER:
--   1) supabase-family-default-task-templates.sql  (adds bedroom templates)
--   2) supabase-family-auto-task-assignment.sql    (initial assigner + cron)
--
-- This file does 3 things:
--   A) Extends family.task_assignments with approval columns + RPCs so that
--      wallet rewards / penalties only happen when the PARENT explicitly
--      approves (✓) or rejects (✗) a completed task.
--   B) Replaces family.auto_assign_week so that:
--        • Universal: academic + health + Morning Prayer → every child.
--        • Pinned by NAME (every week):
--             Girls' Room  → Ezinne
--             Mummy's Room → Chidiogu / Chidiogo
--             Daddy's Room → Chiagozie
--        • Night Prayers      → 1 child / week, rotated through the pool.
--        • All other Special — *   → rotated, offset per template.
--        • All other CHORE (category='chore')  → rotated, offset per template.
--       Pool = every active child except the youngest. (=> 3 kids: Ezinne,
--       Chiagozie, Chidiogu — Chimdalu is excluded.)
--   C) Re-runs the backfill for this week + next 3 weeks.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A.1) Approval columns
-- ---------------------------------------------------------------------------
ALTER TABLE family.task_assignments
  ADD COLUMN IF NOT EXISTS approval_status     VARCHAR(20) DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS approved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by         UUID REFERENCES family.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reward_paid         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS penalty_applied     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reward_tx_id        UUID,
  ADD COLUMN IF NOT EXISTS penalty_tx_id       UUID;

ALTER TABLE family.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_approval_chk;
ALTER TABLE family.task_assignments
  ADD CONSTRAINT task_assignments_approval_chk
  CHECK (approval_status IN ('not_required','pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS idx_fam_ta_approval
  ON family.task_assignments(approval_status)
  WHERE approval_status = 'pending';

-- ---------------------------------------------------------------------------
-- A.2) Auto-flip approval_status -> 'pending' when child marks 'completed'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.tg_task_assignment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND COALESCE(NEW.approval_status,'not_required') NOT IN ('approved','rejected') THEN
    NEW.approval_status := 'pending';
    NEW.completed_at    := COALESCE(NEW.completed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fam_ta_completion ON family.task_assignments;
CREATE TRIGGER trg_fam_ta_completion
  BEFORE UPDATE ON family.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION family.tg_task_assignment_completion();

-- ---------------------------------------------------------------------------
-- A.3) Approve: credit wallet with task.reward_amount (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.approve_task_assignment(
  p_assignment_id UUID,
  p_approver_id   UUID,
  p_note          TEXT DEFAULT NULL
)
RETURNS family.task_assignments
LANGUAGE plpgsql
AS $$
DECLARE
  v_assn   family.task_assignments;
  v_task   family.tasks;
  v_wallet family.wallets;
  v_reward NUMERIC;
  v_new_bal NUMERIC;
  v_tx_id  UUID;
BEGIN
  SELECT * INTO v_assn FROM family.task_assignments WHERE id = p_assignment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment % not found', p_assignment_id;
  END IF;
  IF v_assn.approval_status = 'approved' THEN
    RETURN v_assn;  -- idempotent
  END IF;

  SELECT * INTO v_task FROM family.tasks WHERE id = v_assn.task_id;
  v_reward := COALESCE(v_task.reward_amount, 0);

  -- Credit wallet only once and only if reward > 0
  IF v_reward > 0 AND NOT COALESCE(v_assn.reward_paid, FALSE) THEN
    SELECT * INTO v_wallet FROM family.wallets WHERE child_id = v_assn.child_id FOR UPDATE;
    IF FOUND THEN
      v_new_bal := COALESCE(v_wallet.balance,0) + v_reward;
      UPDATE family.wallets SET balance = v_new_bal, updated_at = NOW() WHERE id = v_wallet.id;
      INSERT INTO family.transactions
        (child_id, wallet_id, type, amount, balance_after, description)
      VALUES
        (v_assn.child_id, v_wallet.id, 'bonus', v_reward, v_new_bal,
         'Task approved: ' || v_task.title)
      RETURNING id INTO v_tx_id;
    END IF;
  END IF;

  UPDATE family.task_assignments
     SET approval_status     = 'approved',
         approved_at         = NOW(),
         approved_by         = p_approver_id,
         parent_review_notes = COALESCE(p_note, parent_review_notes),
         reward_paid         = (v_reward > 0) OR reward_paid,
         reward_tx_id        = COALESCE(v_tx_id, reward_tx_id),
         status              = 'completed',
         updated_at          = NOW()
   WHERE id = p_assignment_id
   RETURNING * INTO v_assn;

  RETURN v_assn;
END;
$$;

GRANT EXECUTE ON FUNCTION family.approve_task_assignment(UUID, UUID, TEXT)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- A.4) Reject: debit wallet by task.penalty_amount (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION family.reject_task_assignment(
  p_assignment_id UUID,
  p_approver_id   UUID,
  p_note          TEXT DEFAULT NULL
)
RETURNS family.task_assignments
LANGUAGE plpgsql
AS $$
DECLARE
  v_assn    family.task_assignments;
  v_task    family.tasks;
  v_wallet  family.wallets;
  v_penalty NUMERIC;
  v_new_bal NUMERIC;
  v_tx_id   UUID;
BEGIN
  SELECT * INTO v_assn FROM family.task_assignments WHERE id = p_assignment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment % not found', p_assignment_id;
  END IF;
  IF v_assn.approval_status = 'rejected' THEN
    RETURN v_assn;  -- idempotent
  END IF;

  SELECT * INTO v_task FROM family.tasks WHERE id = v_assn.task_id;
  v_penalty := COALESCE(v_task.penalty_amount, 0);

  IF v_penalty > 0 AND NOT COALESCE(v_assn.penalty_applied, FALSE) THEN
    SELECT * INTO v_wallet FROM family.wallets WHERE child_id = v_assn.child_id FOR UPDATE;
    IF FOUND THEN
      v_new_bal := COALESCE(v_wallet.balance,0) - v_penalty;
      UPDATE family.wallets SET balance = v_new_bal, updated_at = NOW() WHERE id = v_wallet.id;
      INSERT INTO family.transactions
        (child_id, wallet_id, type, amount, balance_after, description)
      VALUES
        (v_assn.child_id, v_wallet.id, 'penalty', v_penalty, v_new_bal,
         'Task rejected: ' || v_task.title)
      RETURNING id INTO v_tx_id;
    END IF;
  END IF;

  UPDATE family.task_assignments
     SET approval_status     = 'rejected',
         approved_at         = NOW(),
         approved_by         = p_approver_id,
         parent_review_notes = COALESCE(p_note, parent_review_notes),
         penalty_applied     = (v_penalty > 0) OR penalty_applied,
         penalty_tx_id       = COALESCE(v_tx_id, penalty_tx_id),
         status              = 'failed',
         updated_at          = NOW()
   WHERE id = p_assignment_id
   RETURNING * INTO v_assn;

  RETURN v_assn;
END;
$$;

GRANT EXECUTE ON FUNCTION family.reject_task_assignment(UUID, UUID, TEXT)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- B) REPLACE auto_assign_week with bedroom-pinning + chore-rotation
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
  v_pool       UUID[];
  v_pool_size  INT;
  v_all_kids   UUID[];
  v_inserted   INT := 0;
  v_added      INT;
  v_task       RECORD;
  v_ix         INT;
  v_child_id   UUID;
  v_pinned     UUID;
BEGIN
  v_week_end := v_week_start + 7;
  v_week_no  := EXTRACT(WEEK FROM v_week_start)::int;

  SELECT COALESCE(array_agg(id ORDER BY date_of_birth ASC NULLS LAST), '{}'::uuid[])
    INTO v_all_kids
  FROM family.children
  WHERE parent_id = p_parent_id AND is_active = TRUE;

  IF array_length(v_all_kids, 1) IS NULL THEN
    RETURN 0;
  END IF;

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

  --------------------------------------------------------------------------
  -- A) Universal templates: academic + health + Morning Prayer
  --------------------------------------------------------------------------
  FOR v_task IN
    SELECT id, parent_id
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
             (v_week_end - INTERVAL '1 day')::timestamptz
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

  --------------------------------------------------------------------------
  -- B) Pinned bedroom clean-ups (match child by first_name prefix)
  --------------------------------------------------------------------------
  FOR v_task IN
    SELECT id, parent_id, title
    FROM family.tasks
    WHERE parent_id = p_parent_id
      AND is_template = TRUE
      AND is_active   = TRUE
      AND title IN (
        'House Chore — Girls'' Room Clean-Up',
        'House Chore — Mummy''s Room Clean-Up',
        'House Chore — Daddy''s Room Clean-Up'
      )
  LOOP
    v_pinned := NULL;
    IF v_task.title = 'House Chore — Girls'' Room Clean-Up' THEN
      SELECT id INTO v_pinned FROM family.children
       WHERE parent_id = p_parent_id AND is_active = TRUE
         AND UPPER(first_name) LIKE 'EZINNE%'
       LIMIT 1;
    ELSIF v_task.title = 'House Chore — Mummy''s Room Clean-Up' THEN
      SELECT id INTO v_pinned FROM family.children
       WHERE parent_id = p_parent_id AND is_active = TRUE
         AND (UPPER(first_name) LIKE 'CHIDIOG%')
       LIMIT 1;
    ELSIF v_task.title = 'House Chore — Daddy''s Room Clean-Up' THEN
      SELECT id INTO v_pinned FROM family.children
       WHERE parent_id = p_parent_id AND is_active = TRUE
         AND UPPER(first_name) LIKE 'CHIAGOZIE%'
       LIMIT 1;
    END IF;

    IF v_pinned IS NULL THEN
      CONTINUE;  -- no matching child for this household
    END IF;

    INSERT INTO family.task_assignments (task_id, child_id, assigned_by, status, due_date)
    SELECT v_task.id, v_pinned, v_task.parent_id, 'pending',
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

  --------------------------------------------------------------------------
  -- C) Night Prayers — 1 child / week, rotated through the pool.
  --------------------------------------------------------------------------
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

  --------------------------------------------------------------------------
  -- D) Other Special — * (responsibility) → rotated evenly, offset per task.
  --------------------------------------------------------------------------
  v_ix := 0;
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
    v_child_id := v_pool[ ((v_week_no + v_ix) % v_pool_size) + 1 ];
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
    v_ix := v_ix + 1;
  END LOOP;

  --------------------------------------------------------------------------
  -- E) ALL OTHER chores (category='chore') → rotated evenly across the pool,
  --    offset per task so the load is distributed within one week.
  --    Excludes the pinned bedroom titles (already assigned in section B).
  --------------------------------------------------------------------------
  v_ix := 0;
  FOR v_task IN
    SELECT id, parent_id, title
    FROM family.tasks
    WHERE parent_id = p_parent_id
      AND is_template = TRUE
      AND is_active   = TRUE
      AND category    = 'chore'
      AND title NOT IN (
        'House Chore — Girls'' Room Clean-Up',
        'House Chore — Mummy''s Room Clean-Up',
        'House Chore — Daddy''s Room Clean-Up'
      )
    ORDER BY title
  LOOP
    v_child_id := v_pool[ ((v_week_no + v_ix) % v_pool_size) + 1 ];
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
    v_ix := v_ix + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION family.auto_assign_week(UUID, DATE)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- C) Backfill: re-seed any new bedroom templates, then re-assign 4 weeks
-- ---------------------------------------------------------------------------
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN SELECT id FROM family.users LOOP
    PERFORM family.seed_default_task_templates(u.id);
  END LOOP;
END $$;

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
-- Verification: counts of pending-approval assignments per child this week
-- ---------------------------------------------------------------------------
SELECT
  u.email,
  c.first_name,
  COUNT(*) FILTER (
    WHERE ta.due_date >= family.iso_week_start(CURRENT_DATE)::timestamptz
      AND ta.due_date <  (family.iso_week_start(CURRENT_DATE) + 7)::timestamptz
  ) AS this_week,
  COUNT(*) FILTER (WHERE ta.approval_status = 'pending')  AS awaiting_approval,
  COUNT(*) FILTER (WHERE ta.approval_status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE ta.approval_status = 'rejected') AS rejected
FROM family.users u
JOIN family.children c ON c.parent_id = u.id AND c.is_active = TRUE
LEFT JOIN family.task_assignments ta ON ta.child_id = c.id
GROUP BY u.email, c.first_name, c.date_of_birth
ORDER BY u.email, c.date_of_birth;
