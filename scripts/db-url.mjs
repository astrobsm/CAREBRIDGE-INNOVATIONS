#!/usr/bin/env node
/**
 * Print the connection string, for pasting into the GitHub secret by hand.
 *
 *   npm run db:url
 *
 * This is the escape hatch for when `npm run db:setup` cannot be used — no gh
 * CLI, or no admin rights on the repository. It is the one place in these
 * scripts that deliberately puts a password on screen, so it says so first and
 * waits for confirmation.
 */

import { promptHidden, buildUrl, confirm, safeLog } from './lib/dbConnection.mjs';

async function main() {
  safeLog('Connection string for the SUPABASE_DB_URL secret\n' + '─'.repeat(50));
  safeLog('\nThis prints your database password in plain text on this screen.');
  safeLog('It will stay in your terminal scrollback until you clear it.\n');

  const ok = await confirm('Continue?');
  if (!ok) {
    safeLog('\nCancelled. `npm run db:setup` stores the secret without displaying it.');
    return;
  }

  const password = await promptHidden('\nDatabase password: ');
  if (!password) {
    safeLog('\nNo password entered.');
    return;
  }

  // Printed without redaction — the whole purpose of this script.
  console.log('\nAdd this as a repository secret named SUPABASE_DB_URL:');
  console.log('  GitHub → Settings → Secrets and variables → Actions → New repository secret\n');
  console.log(buildUrl(password));
  console.log('\nThen clear your terminal.');
}

main().catch((err) => {
  console.error('\nFailed:', err?.message ?? String(err));
  process.exit(1);
});
