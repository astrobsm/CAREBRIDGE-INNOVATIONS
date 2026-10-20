# Authentication rollout (Supabase Auth)

Sign-in moves from "any email that exists on the device, no password checked" to
Supabase Auth, and the database stops being open to anyone holding the public
anon key. This is the exact order to roll it out in. **Do the steps in order** —
each one is safe only because the ones before it are done.

## The guided way: `node scripts/rollout.mjs`

Run it in a terminal from the repository root. It walks every step below as a
menu — "run every remaining step in order", or one step at a time — and offers
the options for each (automatic, by hand with the SQL copied to your clipboard
and the Supabase SQL editor opened, or skip). It remembers what is done per
Supabase project (in the git-ignored `supabase/.combined/rollout-state.json`;
never any secret), and it refuses to merge before the users are migrated, or to
lock the database before sign-in is verified, unless you type `MERGE` / `LOCK`.
Keys, passwords and tokens are typed with echo off and kept in memory only.

Choose **"Just give me the SQL scripts"** in its menu for the files alone:
`supabase/.combined/all-migrations.sql` (all migrations, one transaction),
`supabase/.combined/verify.sql`, and the lockdown and rollback in `supabase/manual/`.

## Re-running migrations after the lockdown

Older migrations (`20260127224153_fix_users_rls.sql` and others) create
"Allow all access" policies. **Replaying them after step 8 re-opens those
tables.** That happens when the combined script is pasted again, or when
`supabase db push` runs against an empty migration history. So:

* `node scripts/db-sql.mjs --with-lockdown` builds the combined script with the
  lockdown re-applied inside the same transaction; the rollout script does this
  automatically once the lockdown is recorded as done.
* `npm run db:check` now fails any migration from `20261019090000` on that
  creates a policy open to everyone (`USING (true)`, `TO anon`/`public`) unless
  the line above it says `-- public-access: <why>`.
* The lockdown records `app_private.rls_lockdown_state.in_force`; the rollback
  sets it false. The migrations workflow does **not** yet re-apply the lockdown
  after a push — if you want that, add a step that runs the lockdown file with
  `psql` when `in_force` is true. After any CI replay, re-run step 8.
* Once hospital scoping is on (step 10), use
  `node scripts/db-sql.mjs --with-lockdown --with-scoping`: migrations, then the
  lockdown, then the scoping, in one transaction. The rollout script picks the
  flags from what it has recorded as done.
* Every combined script now starts with a guard that reads the database's own
  state and **refuses to run, changing nothing**, if the lockdown is in force
  and the script would not re-apply it (or scoping is on and cannot be
  re-applied). A stale or plain `npm run db:sql` file can no longer re-open data.
* The lockdown file itself re-applies hospital scoping at its end, in the same
  transaction, while `app_private.access_policy_state.hospital_scoped` is true.
  Re-running the lockdown alone therefore never widens access to every hospital.
* `npm run db:check` also fails a migration that creates a table not classified
  in `supabase/manual/20261020100000_hospital_scoping.sql` (see step 10).

## What changes

| Before | After |
| --- | --- |
| Sign-in looked the email up on the device and did not check a password. | `supabase.auth.signInWithPassword`. The app account is the `public.users` row linked to the Supabase account (`users.auth_user_id`). |
| Hard-coded admin logins (`SEEDED_ADMINS`) and a seeded super admin with a password in the source. | Removed. Every account is a Supabase Auth account. |
| Plaintext passwords on `users` rows, synced to every device and to `public.users.password`, shown in User Management. | No password is written anywhere. A trigger drops any that still arrive; the migration script clears the old ones. |
| The session was a user id in `localStorage`. | The Supabase session (restored with `getSession`/`onAuthStateChange`). |
| Cloud sync started before anyone signed in. | Sync and realtime start only with a real session and stop at sign-out. |
| Anyone could self-register with any clinical role and get in at once. | Self-registration creates an **inactive** account; an administrator approves it. Nobody can register as `super_admin`/`hospital_admin`. |
| User Management wrote accounts straight into the table. | Creating accounts, temporary passwords and (de)activation go through `/api/admin-users` (service role, server only). |
| AI endpoints only checked the browser origin. | They also require a valid Supabase access token for an active user. |
| RLS "Allow all access": the anon key in the bundle could read and write every table. | (Last step, by hand) only signed-in active users can; the public booking page may only insert a booking. |

**Offline sign-in.** After every successful *online* sign-in the device stores a
PBKDF2-SHA256 hash (210,000 iterations, random salt) of the password in its own
IndexedDB database (`AstroHEALTHLocalAuth`), which is never synced. When Supabase
cannot be reached — and only then; a "wrong password" answer is final — sign-in
checks that hash. An offline session works on the device only; nothing syncs
until the person signs in online again (a banner offers this once the device is
back online). The stored hash expires after 30 days without an online sign-in
and is deleted when the server reports the account deactivated.

## The two database changes

* **(A)** `supabase/migrations/20261019090000_auth_accounts.sql` — additive and
  safe while old clients still run: adds `users.auth_user_id`, the helper
  functions the policies use (`app_user_id()`, `is_app_member()`,
  `is_app_admin()`, …), `claim_app_user()` (links a signed-in person to their
  row at first sign-in), `public_booked_slots()` (for the public booking page),
  and a trigger on `users` that stops new passwords being stored and stops
  non-administrators changing role / active / hospital / linked account. It
  restricts only requests made by a signed-in Supabase user, so old clients
  (anon key) are not affected.
* **(B)** `supabase/manual/20261019100000_rls_lockdown.sql` — the lockdown.
  **Not** in `supabase/migrations/`, so CI never applies it. Applied by hand,
  last. Rollback: `supabase/manual/20261019100000_rls_lockdown_rollback.sql`.

`.github/workflows/supabase-migrations.yml` applies everything in
`supabase/migrations/` to production on every push to `main`. That is why (A) is
applied from the branch first (step 3) and (B) lives elsewhere.

---

## Step 1 — Vercel environment

Project → Settings → Environment Variables, for **Production** (and Preview if
you test there):

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | the project URL (same as `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |

**Never** name it `VITE_…`: Vite copies every `VITE_*` variable into the browser
bundle, and this key bypasses all RLS. It is read only by `api/admin-users.js`
(and, if present, by `api/_lib/requireUser.js`). Without it User Management
cannot create accounts, reset passwords or (de)activate.

The variables take effect on the next deployment (the merge in step 6).

## Step 2 — Supabase Auth settings

Supabase dashboard → Authentication:

1. **URL Configuration** → *Site URL*: the production app URL (e.g.
   `https://<your-app>.vercel.app`). Add it, plus `https://<your-app>/login`,
   to *Redirect URLs* (self-registration confirmation and `--invite` links land
   there).
2. **Providers → Email**: enabled; *Confirm email* **ON**. Confirmation is what
   stops someone registering with another person's address and claiming their
   unlinked account (`claim_app_user()` only links a confirmed email). Set the
   minimum password length to at least 8.
3. **Email (SMTP)**: Supabase's built-in email service is for testing only — it
   sends just a few emails per hour and may only deliver to your project
   team's addresses. Configure custom SMTP before relying on self-registration
   confirmations or `--invite`. Admin-created accounts and the migration's
   temporary passwords need no email.
4. *Allow new users to sign up* stays on (self-registration). New sign-ups are
   inactive until approved, whatever their role.

## Step 3 — Apply (A) from the branch, BEFORE merging

From a checkout of this branch:

```bash
npm run db:check      # every migration is safe to re-run
npm run db:migrate    # applies what the remote history does not have yet
```

(`npm run db:setup` first if this machine has no database credential.) This
records (A) in the migration history, so the CI run after the merge finds
nothing new to apply.

Check it (SQL editor):

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_user_id';
SELECT tgname FROM pg_trigger WHERE tgname = 'users_guard_account_fields';
SELECT proname FROM pg_proc WHERE proname IN ('is_app_member', 'claim_app_user', 'public_booked_slots');
```

Old clients keep working exactly as before.

## Step 4 — Move every user onto Supabase Auth

The script needs the service-role key in its environment (not in a file in the
repo):

```bash
# bash
export SUPABASE_URL=https://<ref>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service_role key>
# PowerShell
$env:SUPABASE_URL = 'https://<ref>.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service_role key>'
```

1. **Dry run** — prints the plan, changes nothing:

   ```bash
   npm run auth:migrate-users
   ```

   Read it. Every row without `auth_user_id` is linked to an existing Supabase
   user with that email, or gets a new one (email already confirmed). A row's
   existing plaintext password is kept when it is at least 8 characters, so
   people can sign in with what they know; otherwise a temporary password is
   generated. **Either way they must choose a new password at first sign-in**:
   every legacy password was readable with the public anon key. Inactive rows get
   a banned account (so they can be re-activated later). Rows sharing an email:
   only the active (most recently updated) one is migrated; the others are listed
   as `SKIP … duplicate` — resolve them by hand if needed.

2. **Apply**:

   ```bash
   npm run auth:migrate-users -- --apply --out /secure/place/outside/the/repo/astrohealth-passwords.csv
   ```

   The CSV path must be outside the repository and must not exist yet; it is
   created readable by you only. Passwords are never printed. Re-running is safe
   (linked rows are skipped), so a run with failures can simply be repeated.

   `--invite` instead emails an invitation link to every active account that
   needs one (needs working SMTP, step 2).

## Step 5 — Hand out the temporary passwords

The CSV says, per person, either "temporary password …" or "sign in with your
existing password, then choose a new one". Deliver it person to person (not in a
group chat), then **delete the CSV**.

## Step 6 — Merge

Merge the branch to `main`. Vercel deploys the new client (with the step 1
variables); CI runs `db push`, which finds (A) already applied.

Until step 8, devices still running the old cached build keep working (the anon
key still has access). The PWA picks up the new build on its next update check;
ask people to reload or accept the update prompt.

## Step 7 — Verify

* Sign in as a **super admin** and as a **hospital admin** (online). Each lands in
  the app and is sent to the agreement / new-password screen first.
* User Management: add a test user (a temporary password is shown once), sign in
  as them, change the password; reset it; deactivate it — sign-in is refused;
  activate it again.
* Self-register a test account: "awaiting approval"; sign-in says so; approve it
  in User Management (Activate / Approve); it can sign in.
* Offline: sign in online once, sign out, go offline (airplane mode), sign in —
  "signed in offline"; a wrong password is refused; back online, use the banner to
  sign in online and check the changes sync.
* An AI feature (clerking suggestions, OCR) works signed in.
* Signed out: `/book-appointment` books a slot; the family child login
  (`/family/me/login`) works.
* User Management → *last sign-in* shows the staff who have signed in on the new
  build. Wait until the people who matter have.

## Step 8 — Apply (B), by hand

First run the migration script once more (dry run, then `--apply` with a new
`--out` file if it lists anything): old clients can still add users until now,
and those rows have no sign-in account yet.

Then: Supabase SQL editor → paste `supabase/manual/20261019100000_rls_lockdown.sql` →
run. It refuses to run unless (A) is applied and at least one active
`super_admin` is linked to a Supabase account.

From now on the anon key can do one thing: insert a public clinic booking.
Devices still on the old build stop syncing (their requests are refused) — they
must update and sign in. The lockdown also clears any plaintext password still on
a `users` row.

Re-run the checks from step 7.

## Step 9 — Rotate what was in the source

These passwords were hard-coded and are in the git history for good:

* `admin@astrohealth.ng` / `admin`
* `emmanuelnnadi@unth.edu.ng` / `blackvelvet` (also the old Dr Reviews page
  password)
* `douglas@carebridge.edu.ng` / `BLACK@2velvet`

After step 4, **reset the password of each of these accounts** (User Management →
Reset Password, or Supabase → Authentication → Users) — the migration may have
kept one of these as the account's password if it was on the users row — and
change the same passwords anywhere else they were used. Treat every legacy
plaintext password as known: that is why everyone must choose a new one at first
sign-in.

## Step 10 — Limit staff to their own hospitals (by hand, after step 8)

After step 8 every active signed-in member reads and writes **every hospital's**
data. `supabase/manual/20261020100000_hospital_scoping.sql` narrows that to the
hospitals each person belongs to. In the rollout script: **"Limit staff to their
own hospitals"** (it copies the SQL, opens the SQL editor, and offers the
verification query and the rollback).

**Rehearse it first** on a staging copy (rollout script → "Another project"):
nothing in this repository can run Postgres, so the SQL is checked by tests that
read it, not by executing it. See *Rehearsal* below.

### Who belongs where

* `users.hospital_id` always counts.
* Extra hospitals: **User Management → ⋮ → Hospitals** (or **Visiting Staff**, to
  let in someone from another hospital by their sign-in email). A super admin
  grants any hospital; a hospital admin only their own. Grants are stored in
  `public.user_hospitals`, which no member can write — only `/api/admin-users`
  (service role) does, and it records who granted it. The buttons work once the
  SQL has run.
* Whoever creates a hospital (Hospital selector → add new) becomes a member of it,
  so they can register its first patient.
* `super_admin` sees everything.

### The rule

A member may read and write a patient — and every row that carries the
patient's `patient_id` — when any of these holds:

1. the patient's `registered_hospital_id` is one of their hospitals;
2. the patient has **no registered hospital** (`NULL`, blank or `global`: legacy
   rows, visible to every member as before);
3. the patient has a **visit at one of their hospitals**: a clinical encounter,
   admission, surgery, scar case, skin-graft episode or PAD assessment whose
   `hospital_id` is theirs (each encounter records where it happened);
4. an **active cross-hospital workflow** involves their hospital or them:
   a pending/accepted referral from or to their hospital (or to, by or accepted
   by them); an MDT meeting discussed at their hospital or organised by them (not
   cancelled); an open tumour-board case held at their hospital; an external
   review for their hospital; an appointment booked at their hospital or with
   them (not cancelled / no-show); an admission where they are the primary
   doctor or nurse; an active doctor/nurse/staff assignment to them; a video
   conference they host or joined.

Rows with only a `hospital_id` (payroll, clinic sessions, slots, ward rounds,
finance, hospital settings) follow that hospital (blank → every member). Child
rows with neither (admission notes, bed assignments, treatment progress,
substance-use consents) follow their parent row. Reference and shared data
(hospital list, chat, settings, audit and push bookkeeping, signalling) stay
members-only. `users`: members read themselves, everyone who shares a hospital
with them, administrators, and accounts not yet assigned a hospital; writes are
unchanged. `app_secrets` (VAPID keys) becomes service-role only — under the
lockdown alone every member could read it.

Every public table is classified **explicitly** in the script. If the database
has a table the list does not name, the script stops, names it, and changes
nothing: add it to the list and run again. Views are switched to
`security_invoker`, so they cannot bypass the rule.

### Running it

1. Run the script. It refuses to run unless the lockdown is in force and an
   active `super_admin` is linked. Its last result shows how many patients have no
   registered hospital (visible to everyone) and how many name a hospital id that
   is not in `hospitals` (super admins only).
2. Straight away, give visiting / multi-site staff their extra hospitals in User
   Management.

### Verification

Paste `supabase/manual/20261020100000_hospital_scoping_verify.sql` (read-only).
Problems are listed first: an unclassified table, a scoped table still carrying a
wider policy, a missing scoped policy, a view that bypasses row security, or
`user_hospitals` writable by members. Every other row reads `ok`; the `info` rows
count legacy patients, patients and staff per hospital (a hospital with patients
and **0 staff** means those patients are now visible only to super admins), and
active staff with no hospital (they see only legacy patients). A spot check as a
particular person:

```sql
-- Impersonate a signed-in user for one transaction (nothing is changed):
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<their auth.users id>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.app_user_hospital_ids();
SELECT count(*) AS patients_they_see FROM public.patients;
ROLLBACK;
```

### What staff will notice

* After their next sync, **patients of other hospitals disappear** from their
  device (patient search, lists, dashboards and counts cover only what they can
  see). Records still waiting to upload are never deleted: if any belong to
  patients they cannot see, the sync status says so and they stay until the
  person who recorded them signs in on that device and syncs.
* On a shared device, signing out first uploads what the person has pending; the
  next person's first sync removes the previous person's (already uploaded)
  out-of-scope records. Until that first sync — or while offline — they are still
  on the device.
* Staff pickers (MDT specialists, admitting doctor, appointment clinician, chat,
  ward-round team) list only colleagues who share a hospital with them, plus
  administrators. To pick someone from another hospital, grant them the hospital.
* Registering a patient at a hospital they do not belong to is refused with an
  explanation (choose one of their hospitals, or ask an admin to add them).
* A visit recorded at another hospital, an MDT discussed there, or a referral to
  it makes the patient visible to that hospital's staff.
* Super admins notice nothing. Duplicate-patient merge works as before for super
  admins (they see every row it re-points); a hospital admin merges only patients
  of their own hospital, whose rows they can all see.
* Sync is slower on large tables: every row is checked by the rule.

### Rehearsal (on a staging project, before production)

1. Restore a recent production backup into a separate Supabase project, apply the
   migrations and the lockdown there (rollout script → "Another project").
2. Run the scoping script; if it stops on an unclassified table or a missing
   column, fix the list and re-run (nothing was changed).
3. Run the verification query; impersonate a clinician who covers two hospitals,
   a hospital admin and a super admin with the snippet above and compare counts.
4. Re-run the lockdown file alone, then the output of
   `node scripts/db-sql.mjs --with-lockdown --with-scoping`: the verification
   query must stay clean (never wider).
5. Run the rollback, re-run the verification (scoping off), then re-apply.
6. Point a preview build at the staging project; sign in as two users on one
   browser, one after the other, and check the second sees only their hospitals
   after one sync; record something offline as the first, then switch, and check
   it is kept and reported, not deleted.

---

## Rollback

* **Hospital scoping (step 10)** — run
  `supabase/manual/20261020100000_hospital_scoping_rollback.sql`. It returns the
  database to the members-only lockdown exactly (every member sees every
  hospital), restores any policy and view setting the scoping replaced, and sets
  `hospital_scoped` false so the lockdown stops re-applying it. Grants in
  `user_hospitals` are kept (still writable only by the server), so re-applying
  the scoping restores them. Devices stop removing out-of-scope rows; rows they
  removed come back on the next sync. Roll this back **before** the lockdown —
  the lockdown rollback refuses while scoping is on.
* **Lockdown (B)** — run `supabase/manual/20261019100000_rls_lockdown_rollback.sql`
  in the SQL editor. It restores the exact policies (B) dropped, from the backup
  (B) made in `app_private`, and turns RLS back off where (B) turned it on. Old
  clients work again. Plaintext passwords cleared by (B) are not restored (nothing
  uses them).
* **Client** — Vercel → Deployments → promote the previous production deployment
  (or revert the merge). The old client runs fine with (A) applied, but with (B)
  applied it cannot sync: roll back (B) first.
* **(A)** — safe to leave in place. If it must go:

  ```sql
  DROP TRIGGER IF EXISTS users_guard_account_fields ON public.users;
  DROP FUNCTION IF EXISTS public.users_guard_account_fields();
  DROP FUNCTION IF EXISTS public.claim_app_user();
  DROP FUNCTION IF EXISTS public.public_booked_slots(TEXT, TEXT);
  -- keep users.auth_user_id unless you are abandoning Supabase Auth for good
  ```

  Remove the migration file in a follow-up commit too, or CI keeps it recorded.
* **Accounts** — Supabase Auth users created by the migration can stay; they do
  nothing without the new client.

## Known limits

* A deactivated person keeps an already-issued access token until it expires
  (Supabase default: 1 hour); refresh is refused at once.
* Changing a linked account's sign-in email is not supported in User Management
  (the field is read-only); change it in Supabase → Authentication → Users and on
  the users row together.
* The local-database *corruption* recovery on app start (AuthContext,
  `db.open()` failure → `Dexie.delete`) is unchanged and still deletes the local
  database, including unsynced work. Only the deletion on a sign-in error was
  removed.
