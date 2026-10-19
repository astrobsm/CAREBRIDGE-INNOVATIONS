// ---------------------------------------------------------------------------
// The authentication rollout as data: the steps, their order, what each one
// needs done first, and the Supabase Auth settings it writes. Kept pure (no
// I/O) so the ordering rules are unit-tested — the one thing the rollout must
// never get wrong is merging before people can sign in, or locking the
// database before the new build is live.
// ---------------------------------------------------------------------------

export const STEPS = [
  { id: 'preflight', title: 'Check this branch is ready', needs: [] },
  { id: 'vercel', title: 'Give Vercel the server key', needs: [] },
  { id: 'auth-settings', title: 'Configure Supabase Auth (site URL, email confirmation, SMTP)', needs: [] },
  { id: 'migrations', title: 'Apply the database migrations', needs: ['preflight'] },
  { id: 'verify-db', title: 'Verify the database has every table', needs: ['migrations'] },
  { id: 'users', title: 'Move existing users onto Supabase Auth', needs: ['migrations'] },
  { id: 'rotate', title: 'Reset the three accounts whose passwords leaked', needs: ['users'] },
  { id: 'merge', title: 'Merge the pull request (deploys the new sign-in)', needs: ['vercel', 'auth-settings', 'migrations', 'users'] },
  { id: 'verify-signin', title: 'Check people can sign in on the live site', needs: ['merge'] },
  { id: 'lockdown', title: 'Lock the database to signed-in members', needs: ['merge', 'verify-signin'] },
];

/** Steps that may only be overridden by typing a confirmation word. */
export const GUARDED = { merge: 'MERGE', lockdown: 'LOCK' };

export const stepById = (id) => STEPS.find((s) => s.id === id);

/** Which prerequisites of `id` are not yet done. */
export function missingPrerequisites(id, done = {}) {
  const step = stepById(id);
  if (!step) throw new Error(`Unknown step "${id}"`);
  return step.needs.filter((n) => !done[n]);
}

/** The first step not yet done, in order — what "run everything" resumes at. */
export function nextStep(done = {}) {
  return STEPS.find((s) => !done[s.id]) ?? null;
}

export const PRODUCTION_REF = 'mgblgewvpzcaimqaeqcp';
export const DEFAULT_SITE_URL = 'https://astrohealth.vercel.app';

export const supabaseUrlFor = (ref) => `https://${ref}.supabase.co`;
export const sqlEditorUrlFor = (ref) => `https://supabase.com/dashboard/project/${ref}/sql/new`;

/** A project ref is 20 lower-case letters. Anything else is a typo. */
export const isProjectRef = (ref) => /^[a-z]{20}$/.test(String(ref || ''));

/** Normalise a site URL: https, no trailing slash. Returns null if unusable. */
export function normaliseSiteUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    if (u.protocol !== 'https:' && u.hostname !== 'localhost') return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * The PATCH body for the Management API's /config/auth.
 *
 * Email confirmation is always switched ON (mailer_autoconfirm false): it is
 * what stops someone signing up with a colleague's address and claiming that
 * colleague's account. The redirect allow-list keeps whatever is there and adds
 * the site, so existing preview or local URLs keep working.
 */
export function authSettingsPatch({ siteUrl, existingAllowList = '', smtp = null }) {
  const site = normaliseSiteUrl(siteUrl);
  if (!site) throw new Error(`Not a usable https site URL: ${siteUrl}`);

  const allow = new Set(String(existingAllowList || '').split(',').map((s) => s.trim()).filter(Boolean));
  allow.add(`${site}/**`);

  const patch = {
    site_url: site,
    uri_allow_list: [...allow].join(','),
    mailer_autoconfirm: false,
    external_email_enabled: true,
  };

  if (smtp) {
    const port = Number(smtp.port);
    if (!smtp.host || !Number.isInteger(port) || port <= 0 || !smtp.user || !smtp.pass || !smtp.adminEmail) {
      throw new Error('SMTP needs host, port, user, password and a sender address.');
    }
    Object.assign(patch, {
      smtp_host: smtp.host,
      smtp_port: String(port),
      smtp_user: smtp.user,
      smtp_pass: smtp.pass,
      smtp_admin_email: smtp.adminEmail,
      smtp_sender_name: smtp.senderName || 'AstroHEALTH',
    });
  }
  return patch;
}

function decodeJwtPayload(token) {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * What a pasted "service-role key" actually is, without revealing it.
 *
 * The API Keys page shows several keys that look alike, and a hidden prompt
 * gives no clue when a paste was cut short — both end as the same "Invalid API
 * key" from Supabase. This names the mistake instead.
 *
 * @returns {{ ok: boolean, key: string, kind?: 'legacy'|'secret', problem?: string }}
 */
export function describeServiceKey(raw, projectRef) {
  const key = String(raw ?? '').trim().replace(/^["']|["']$/g, '').trim();
  const bad = (problem) => ({ ok: false, key, problem });

  if (!key) return bad('Nothing was pasted.');
  if (/\s/.test(key)) return bad('The key contains a space or line break — copy it again with the Copy button.');
  if (key.startsWith('sbp_')) return bad('That is a personal access token (sbp_…), not the service-role key.');
  if (key.startsWith('sb_publishable_')) return bad('That is the publishable key, which is public. Copy the SECRET key instead.');
  if (key.startsWith('sb_secret_')) {
    return key.length >= 40 ? { ok: true, key, kind: 'secret' } : bad(`That secret key looks cut short (${key.length} characters).`);
  }
  if (key.startsWith('eyJ')) {
    if (key.split('.').length !== 3) return bad(`That key looks cut short (${key.length} characters; a full one is usually over 200).`);
    const payload = decodeJwtPayload(key);
    if (!payload) return bad(`That key looks cut short or damaged (${key.length} characters).`);
    if (payload.role === 'anon') return bad('That is the anon (public) key. Copy the service_role key instead.');
    if (payload.role !== 'service_role') return bad(`That key's role is "${payload.role}", not service_role.`);
    if (payload.ref && projectRef && payload.ref !== projectRef) {
      return bad(`That key belongs to a different Supabase project (${payload.ref}), not ${projectRef}.`);
    }
    return { ok: true, key, kind: 'legacy' };
  }
  return bad('That does not look like a Supabase key. It should start with "eyJ" (service_role) or "sb_secret_".');
}

/** The accounts whose passwords were hard-coded in the source (now in git history). */
export const LEAKED_ACCOUNTS = [
  'admin@astrohealth.ng',
  'emmanuelnnadi@unth.edu.ng',
  'douglas@carebridge.edu.ng',
];

/** A timestamped file name for a temporary-password CSV. */
export function passwordCsvName(prefix, now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `${prefix}-${stamp}.csv`;
}
