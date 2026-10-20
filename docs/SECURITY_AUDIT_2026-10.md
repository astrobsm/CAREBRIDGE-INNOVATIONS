# Security audit — October 2026

Scope: what the RLS lockdown of 2026-10-19
(`supabase/manual/20261019100000_rls_lockdown.sql`) does not cover. That means
Storage, database functions, views, Realtime, the family app, the push edge
function, the Vercel functions, the service worker, data left on a shared
device, and secrets. Branch `feat/security-audit`, from main `6c39460`.

A second change, per-hospital scoping of the access policies, is happening
separately. This audit does not touch the lockdown files, the users and auth
helpers, or the rollout scripts.

Severity: **critical** means an outsider holding only the public anon key
(it ships in the web bundle) can read or change sensitive data. **high** means
an outsider can abuse it, or any staff account can get a secret. **medium**
needs an account or a special position. **low** is defence in depth.

## Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| F1 | critical | Family app: every `family.*` table is open to the anon key for read **and** write, including children's PIN hashes, health records and wallets | **proposed** (not safe to change without a family auth design) |
| F2 | high | `app_secrets`, which holds the VAPID private key, is readable and writable by every staff account since the lockdown | fixed in this branch (SQL) |
| F3 | high | Push edge function has no caller check: the anon key can push any text and link to every device, read through the service role | fixed in this branch (needs redeploy) |
| F4 | high | Push-subscription lookup functions are `SECURITY DEFINER` and executable by PUBLIC, so the anon key can list every device's push endpoint and keys | fixed in this branch (SQL) |
| F5 | medium | Public views run with owner rights. Any signed-in account, including an unapproved self-registration, reads them past RLS | fixed in this branch (SQL) |
| F6 | medium | Notification clicks open whatever URL the push payload names (open redirect, phishing) | fixed in this branch |
| F7 | medium | Hospital-number helpers are GRANTed to anon. `ensure_patient_hospital_number_unique()` is `SECURITY DEFINER`, so anon can make it scan `patients` and build an index | fixed in this branch (SQL) |
| F8 | medium | A shared device keeps every patient record in IndexedDB after sign-out (offline-first by design) | proposed |
| F9 | medium | Push internals (`push_notification_log` with notification bodies, the queue, `notification_logs`) are readable by every member | fixed in this branch (SQL) |
| F10 | low | Storage: the app uses no Supabase Storage. Any bucket left in the project is unknown to the code | fixed in this branch (SQL makes buckets private, drops anon policies) |
| F11 | low | No basic security headers (nosniff, frame options, referrer), and API responses are not marked `no-store` | fixed in this branch |
| F12 | low | Push notification text (treatment titles) shows on the lock screen | proposed |
| F13 | low | AI proxies accept any `model` the caller names (cost, not data) | proposed |
| F14 | low | Members can DELETE `scribe_plan_actions` (the implementation audit trail). The guard covers INSERT and UPDATE only | proposed |
| F15 | low | `public_clinic_bookings` accepts unlimited anonymous inserts (spam, not disclosure) | proposed |
| F16 | info | Realtime `postgres_changes` honours RLS. After the lockdown, public tables stream to members only | no action |
| F17 | info | Secrets: no keys in the repo or its history. The bundle gets only the URL, the anon key and the VAPID public key | no action |
| F18 | info | Vercel functions: the bearer token is verified and the user must be active, same-origin CORS, size limits, no PHI logged | no action |
| D1 | **critical (data loss)** | `AuthContext` deleted the device database on any open error, destroying unsynced clinical work | **fixed in this branch** |

---

### F1 — Family app open to the anon key (critical, proposed)

**Evidence**
- `supabase-family-app-migration.sql:684-696` sets `CREATE POLICY "public_access" … FOR ALL USING (true) WITH CHECK (true)` on every `family.*` table, plus `GRANT ALL ON ALL TABLES IN SCHEMA family TO anon`.
- `src/services/childAuth.ts:44-55`: a child signs in by **reading** `family.children.pin_hash` with the anon key and comparing it in the browser. The PIN is never checked on the server.
- The PIN hash is an unsalted SHA-256 of 4–8 digits (`childAuth.ts:18`). All 10⁸ candidates take seconds to try, so anyone who can read the row can recover the PIN.
- `src/domains/family/hooks/useFamilyParent.ts:52-57`: the parent workspace is found by e-mail with the anon key.

**Impact.** The anon key is public, so anyone can:
- read every family's children, school records, `health_records`, vitals, wallets and transactions;
- change or delete them;
- overwrite `pin_hash` and take over a child login;
- do all of this live, through Realtime.

**Why not fixed here.** The child pages read and write data with no Supabase
session at all. Locking the schema down breaks child sign-in and every child
page until the family app has real authentication. That design decision is
bigger than this branch. Column-level revokes do not help either: the pages use
`select('*')`, which then fails.

**Proposed fix, in order:**
1. **Parents:** add `auth_user_id` to `family.users` (or join on `public.users.auth_user_id`). Replace `public_access` with policies scoped to the owning parent (`parent_id IN (SELECT id FROM family.users WHERE auth_user_id = auth.uid())`), `TO authenticated`. Revoke everything from anon.
2. **Children:** add a `SECURITY DEFINER` RPC `family.child_sign_in(username, pin)`. It should verify a salted, slow hash on the server (`crypt(pin, gen_salt('bf'))` with pgcrypto), rate-limit failures per username, and return a signed short-lived token or session id. Child pages then read through `SECURITY DEFINER` RPCs that check that token. Alternatively, give each child a Supabase Auth account (anonymous sign-in, linked to the child row) and use ordinary RLS.
3. Migrate existing PINs: on the next parent visit, ask them to set each child's PIN again. The old SHA-256 hashes must be treated as compromised.
4. Remove `family` tables from the anon Realtime path. Once the policies are scoped, this follows automatically.

Until then, consider whether the family app should stay deployed against the
production project at all.

### F2 — VAPID private key readable by every member (high, fixed)

**Evidence.** `supabase-push-notifications-migration.sql:271-289` protected
`app_secrets` with a `USING (false)` policy created without `TO`, which means
role PUBLIC. The lockdown drops every policy whose roles include PUBLIC and adds
`app_members_all` (`20261019100000_rls_lockdown.sql:95-118`). As a result every
active staff account can `select * from app_secrets`. The edge function reads
the key from that table (`supabase/functions/send-push-notification/index.ts`,
`.from('app_secrets')`). Before the lockdown it was safe; the lockdown opened it.

**Fix.** `supabase/manual/20261020110000_security_hardening.sql` §1 revokes
all client privileges and adds a RESTRICTIVE `app_server_only` policy (named
`app_*` so a re-applied lockdown keeps it). The service role bypasses RLS, so
the edge function is unaffected.

**User action.** After applying, **rotate the VAPID keys**: the old private key
must be treated as exposed (see the manual steps below).

### F3 — Push edge function had no caller check (high, fixed, needs redeploy)

**Evidence.** `supabase/functions/send-push-notification/index.ts` (before this
branch) went straight from `req.json()` to the service-role client. The
platform's `verify_jwt` accepts the **anon key**, because it is a valid JWT.
With the anon key, anyone could send a notification with any title, body and
click URL to one user, a list of users, or a whole hospital. Combined with F6,
that is a ready-made phishing channel to every clinician's phone.

**Fix.** The function now:
- verifies the bearer token with `auth.getUser(token)` and requires an active `public.users` row linked to it;
- confines non-super-admins to their own `hospital_id`;
- caps the title at 200, the body at 2000 and the recipients at 500;
- drops any `data.url` that is not a same-site path.

The app's `supabase.functions.invoke` already sends the signed-in user's access
token, so legitimate calls are unaffected.

**User action.** Redeploy the function (see the steps below).

### F4 — Push-subscription lookups callable by anyone (high, fixed)

**Evidence.** These functions are `SECURITY DEFINER`, with no `REVOKE`, so
PUBLIC can execute them, and no pinned `search_path`:
- `get_user_subscriptions`, `get_hospital_subscriptions`, `get_subscriptions_by_role` in `supabase-push-notifications-migration.sql:159-225`;
- `get_*_push_subscriptions` in `supabase-push-subscriptions-migration.sql:133-208`.

`POST /rest/v1/rpc/get_hospital_subscriptions` with the anon key returns every
device's endpoint, `p256dh` and `auth`.

**Fix.** Hardening SQL §3 makes them service-role only (the edge function is
their only caller) and pins `search_path`. `cleanup_old_signaling_messages` is
also made service-role only.

### F5 — Views bypass RLS for any signed-in account (medium, fixed)

**Evidence.** The views are `active_patients`, `todays_surgeries` and
`pending_investigations` (`supabase-schema-v2.sql:1397-1424`) and
`active_burn_patients` (`supabase-burn-monitoring-migration.sql:222`). The
lockdown revoked them from anon only
(`20261019100000_rls_lockdown.sql:197-216`). Anyone can sign up (the app has
self-registration). A confirmed but **unapproved** account has role
`authenticated`, and views run as their owner, so it reads patient names and
surgery lists past RLS.

**Fix.** Hardening SQL §4 sets `security_invoker = true` on Postgres 15+, so
RLS applies to the reader. On older Postgres, and for materialized views, it
revokes client access. The app reads none of these views.

### F6 — Notification click opens any URL (medium, fixed)

**Evidence.** `public/sw.js` `openAppWindow(url)` passed `notificationData.url`
straight to `clients.openWindow`.

**Fix.** The URL is resolved against the app's origin, and anything off-site
opens `/` instead (`sameOriginPath` in `public/sw.js`).

### F7 — Hospital-number helpers GRANTed to anon (medium, fixed)

**Evidence.** `supabase/migrations/20261018120400_patient_hospital_number_unique.sql:210-214`.
`patient_hospital_number_duplicates()` and `find_patients_by_hospital_number()`
are SECURITY INVOKER, so RLS already hides rows from anon.
`ensure_patient_hospital_number_unique()` is SECURITY DEFINER: anon can make it
scan `patients` (a DoS) and learn the number of duplicate groups. The only
caller is the signed-in app (`patientDedupeService.ts:117,401`).

**Fix.** Hardening SQL §3 revokes PUBLIC and anon and keeps `authenticated`.
`patient_hospital_number_key` and `_scope` (pure string functions) are left
alone.

**Note.** If the migration history is ever replayed from empty (see
`.github/workflows/supabase-migrations.yml`), that migration re-grants anon.
Re-apply the hardening SQL after any full replay, as you would the lockdown.

### F8 — Patient data stays on a shared device after sign-out (medium, proposed)

**Evidence.** `logout()` in `src/contexts/AuthContext.tsx` clears the session
marker and the Supabase session, and releases push. It deliberately leaves
`AstroHEALTHDB`, the offline-first store, in place. Anyone with the unlocked
device and browser dev tools can read it.

**Proposed.**
- An explicit "Sign out and remove this device's data" option. It should be enabled only when nothing is pending sync; reuse `countUnsyncedRecords` from `src/database/recovery/dbOpenRecovery.ts`.
- An optional per-hospital setting to do this on every sign-out for ward devices.
- Use the existing `CLEAR_CACHE` message to the service worker at the same time.

### F9 — Push internals readable by members (medium, fixed)

**Evidence.** The lockdown gives members `push_notification_log`, which holds
notification titles and bodies for every recipient. The app never reads these
tables (no `.from('push_notification_log' | 'push_notification_queue' | 'notification_logs')`
in `src/`).

**Fix.** Hardening SQL §1, same treatment as `app_secrets`.

### F10 — Storage (low, fixed defensively)

**Evidence.** There is no `supabase.storage` call in `src/` or `api/`, and no
bucket or `storage.objects` SQL anywhere in the repo. Photos and documents are
stored inline in table rows (base64 or data URLs), so the lockdown's RLS
covers them.

**Fix.** Hardening SQL §5:
- makes any public bucket private;
- drops `storage.objects` policies open to anon, PUBLIC or `true`;
- adds a members-only policy in case files are ever stored.

Everything it changes is printed as a NOTICE and backed up.

### F11 — Headers (low, fixed)

`vercel.json` now sends `X-Content-Type-Options: nosniff`,
`X-Frame-Options: SAMEORIGIN` and
`Referrer-Policy: strict-origin-when-cross-origin`, and sends
`Cache-Control: no-store` on `/api/*`.

A Content-Security-Policy is **proposed**, not added. The app loads fonts and
CDNs and talks to Supabase, OpenAI and Google, so it needs a report-only trial
first.

### F12–F15 (low, proposed)

- **F12.** `treatmentSchedulerService.ts:296` puts the session title in the push title. Use a generic title ("Treatment reminder") and show details only after unlock or in the app.
- **F13.** `api/ai-chat.js:75,104` passes the caller's `model` through. Allow-list the models in use.
- **F14.** Add a RESTRICTIVE `FOR DELETE` policy on `scribe_plan_actions` (and other audit tables) for non-admins. First check that the sync engine never deletes them.
- **F15.** Add length CHECK constraints on `public_clinic_bookings` text columns, plus a per-IP rate limit (a Vercel function in front, or Supabase's network restrictions).

### F16–F18 (no action)

- **Realtime.** `cloudSyncService.ts:1583` and `VideoConferencePage.tsx` use `postgres_changes`, which is filtered by the subscriber's RLS. Broadcast and presence on those channels carry no data. The family channels are covered by F1.
- **Secrets.** I scanned the working tree and full git history for OpenAI, Anthropic and Google keys, JWTs and private keys, and found none. `ca-certificate.crt` is a public CA certificate. `VITE_*` variables are only the Supabase URL, the anon key, the VAPID public key, the app name and API URLs. `VITE_SUPABASE_SERVICE_ROLE_KEY` is referenced only by tests asserting it is absent.
- **Vercel functions.** `api/_lib/requireUser.js` verifies the token server-side and requires an active user. `api/_lib/sameOrigin.js` handles CORS (no wildcard). Prompts are capped at 200k characters, images at 15 MB, and tokens are clamped. Errors return provider status plus 300 characters of the provider's message, never the prompt. `admin-users` is `no-store` and never logs passwords.
- **Service worker.** It never caches Supabase responses (cross-origin, no route). `/api/ai-*` and `/api/admin-users` are network-only and never queued. The generic `/api/*` GET cache matches no existing endpoint.

---

## D1 — Device database deleted automatically (critical data loss, fixed)

**Evidence.** On `db.open()` failure, `src/contexts/AuthContext.tsx`
`initAndCheckAuth` (main) called `Dexie.delete('AstroHEALTHDB')` and reloaded
for `VersionError`, `UpgradeError`, `UnknownError` or "corrupted". A
`VersionError` means the device holds a **newer** schema than the running
build, usually an old cached app. That was the most common trigger, and it
erased unsynced work for a problem an update would have fixed.

**Fix.**
- **Newer schema.** The app explains the problem and offers **Update the app**, which unregisters the service worker and clears Cache Storage, never IndexedDB, then reloads. It also offers **Try again** and the export. Deletion is never offered.
- **Any other failure.** The recovery screen (`src/components/pwa/DatabaseRecoveryScreen.tsx`) offers, in order:
  1. Try again.
  2. Save a copy. This opens the raw IndexedDB at its on-disk version, so no upgrade runs, and reads every object store separately. A failed `getAll` falls back to a cursor, and Blobs are kept as base64. The result downloads as `astrohealth-device-backup-YYYYMMDD-HHMMSS.json`, with the share sheet as a fallback.
  3. A count of records changed since each table's last successful push, using the sync engine's `astro_last_push_*` watermarks. It says so when this cannot be determined.
  4. Delete, which is hidden behind a link and works only after the person types `DELETE LOCAL DATA`.
- The decisions are pure functions in `src/database/recovery/dbOpenRecovery.ts`, tested in `src/database/recovery/__tests__/dbOpenRecovery.test.ts`. The tests include a source check that `AuthContext` contains no delete call.

---

## What you must do by hand (in order)

Nothing here has been applied. Do these from the Supabase dashboard and your
own terminal, in this order.

1. **Check the prerequisites.** The RLS lockdown is in force: `select in_force from app_private.rls_lockdown_state;` returns `true`.
2. **Apply the hardening SQL.** In the SQL editor, run the whole of `supabase/manual/20261020110000_security_hardening.sql`.
   - Read the NOTICE and WARNING output: buckets made private, storage policies dropped, and any other `SECURITY DEFINER` function anon can still run.
   - The final result set lists what anon can still reach. Expect only the booking table and the auth helpers.
   - Undo with `…_rollback.sql`.
3. **Redeploy the push edge function.** Run `supabase functions deploy send-push-notification`, using the Supabase CLI logged in to the project. Then send a test notification from a signed-in account and confirm it arrives. Also confirm that a request with only the anon key gets `401`, for example `curl -X POST https://<ref>.supabase.co/functions/v1/send-push-notification -H "Authorization: Bearer <anon key>" -H "Content-Type: application/json" -d '{"userId":"x","payload":{"title":"t"}}'`.
4. **Rotate the VAPID keys (F2).**
   1. Generate a new pair: `npx web-push generate-vapid-keys`.
   2. In the SQL editor: `update app_secrets set value = '<new public>' where key = 'vapid_public_key'; update app_secrets set value = '<new private>' where key = 'vapid_private_key';`
   3. In Vercel → Project → Settings → Environment Variables, set `VITE_VAPID_PUBLIC_KEY` to the new public key and redeploy.

   Existing subscriptions were made with the old key and stop working. Sign-in does not re-subscribe them: `restorePushOnSignIn` skips a subscription whose key differs. Ask staff to turn notifications on again under Settings → Push Notifications. `subscribeToPush` replaces a subscription made with the old key.
5. **Check Auth settings.** Supabase → Authentication → Sign In / Providers:
   - Keep **Confirm email** ON. `claim_app_user()` relies on it.
   - Turn **Leaked password protection** ON.
   - Consider requiring MFA for `super_admin` and `hospital_admin` accounts.
6. **Check Storage.** Supabase → Storage: there should be no buckets. Delete any unexpected bucket after checking its contents, because the app does not use Storage.
7. **Family app (F1).** Decide whether it stays on the production project until it has authentication. If it stays, schedule the proposed fix. To close it immediately, at the cost of breaking the family app: `revoke all on all tables in schema family from anon;`
8. **Deploy this branch** (merge to main; Vercel builds) for the recovery screen, the service-worker URL check and the headers.

## Deliberately not fixed

- **F1, the family app.** Not contained: any lockdown breaks child sign-in and every child page until the family app has real authentication. See the proposal above.
- **Default privileges.** Supabase grants EXECUTE on new public functions to anon by default. Changing `ALTER DEFAULT PRIVILEGES` would silently break future anon-facing RPCs, such as the booking page, that forget an explicit GRANT. Instead, the hardening SQL reports any `SECURITY DEFINER` function anon can run.
- **F8, F12–F15.** Each changes product behaviour, so each needs a decision first.
- **The lockdown and the auth helpers** (another change owns them), and **per-hospital scoping**, which is in progress separately.
