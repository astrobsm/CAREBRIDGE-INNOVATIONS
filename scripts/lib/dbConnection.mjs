/**
 * Resolving the Supabase connection string, without ever leaking it.
 *
 * The connection URI contains the database password. It must not reach the
 * terminal, the shell history, a log file, or a committed file — and, most
 * easily missed, it must not reach an *error message*: the Supabase CLI and
 * libpq both echo the URI they were given when a connection fails, so raw error
 * output is the likeliest place for a password to escape. Everything printed by
 * these scripts goes through `redact()` for that reason.
 *
 * The password is read with terminal echo disabled and held only in memory.
 */

import { createInterface } from 'node:readline';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

/** The project's pooler host, so only the password has to be supplied. */
export const PROJECT_REF = 'mgblgewvpzcaimqaeqcp';
export const POOLER_HOST = 'aws-1-eu-central-1.pooler.supabase.com';
export const POOLER_PORT = 5432;

export const buildUrl = (password) =>
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(password)}@${POOLER_HOST}:${POOLER_PORT}/postgres`;

/**
 * Strip anything password-shaped out of text before it is printed.
 *
 * Deliberately broad: it blanks the password field of any postgres URI, plus
 * any value of a variable that looks like a secret. Over-redacting a log line
 * costs nothing; under-redacting one puts a production database password into a
 * terminal scrollback or a CI log.
 */
export function redact(text) {
  if (!text) return '';
  return String(text)
    // postgres://user:password@host → postgres://user:***@host
    .replace(/(postgres(?:ql)?:\/\/[^:@\s]+:)[^@\s]+(@)/gi, '$1***$2')
    // KEY=value / KEY: value for secret-looking names
    .replace(/((?:password|passwd|pwd|db_url|database_url|token|secret)\s*[=:]\s*)\S+/gi, '$1***');
}

/** Print to stderr with redaction applied. */
export const safeError = (...parts) => console.error(redact(parts.join(' ')));
/** Print to stdout with redaction applied. */
export const safeLog = (...parts) => console.log(redact(parts.join(' ')));

/** Read a line with the terminal's echo turned off. */
export function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error(
        'No interactive terminal available. Set SUPABASE_DB_URL in the environment instead.',
      ));
      return;
    }

    process.stdout.write(question);
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    // Suppress the echo of everything typed after the prompt itself.
    let shown = false;
    rl._writeToOutput = (chunk) => {
      if (!shown) { process.stdout.write(question); shown = true; }
      // Swallow the keystrokes.
      void chunk;
    };

    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

/** Ask a yes/no question. Returns true only on an explicit yes. */
export function confirm(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) { resolve(false); return; }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

/** Pull a key out of a dotenv-style file without pulling in a dependency. */
function fromEnvFile(path, key) {
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`));
    if (m) return m[1].replace(/^["']|["']$/g, '').trim() || null;
  }
  return null;
}

/**
 * Find the connection URI, in order of least to most interactive.
 *
 * Environment first so CI and scripted runs never block on a prompt; the
 * interactive prompt is the last resort and only when a human is present.
 */
export async function resolveDbUrl({ allowPrompt = true } = {}) {
  const fromEnv = process.env.SUPABASE_DB_URL;
  if (fromEnv) return { url: fromEnv, source: 'SUPABASE_DB_URL environment variable' };

  for (const file of ['.env.local', '.env']) {
    const value = fromEnvFile(file, 'SUPABASE_DB_URL');
    if (value) return { url: value, source: file };
  }

  if (!allowPrompt) return null;

  safeLog('\nThe database password is needed to apply migrations.');
  safeLog('Find it at: Supabase dashboard → Project Settings → Database → Database password.');
  safeLog('It is read with echo off, kept in memory only, and never written to disk.\n');

  const password = await promptHidden('Database password: ');
  if (!password) throw new Error('No password entered.');

  return { url: buildUrl(password), source: 'entered at the prompt' };
}

/** A one-line description of a URI that is safe to print. */
export function describeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.username}@${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return '(unparseable connection string)';
  }
}

/**
 * Run the Supabase CLI, safely, on every platform.
 *
 * Getting this right took three attempts, so the reasoning is recorded here:
 *
 *   `shell: true` concatenates arguments into one string without escaping, so a
 *   path containing a space ("C:\Program Files\nodejs") is split at the space.
 *   It would also put the connection URI through a shell, where cmd.exe's
 *   percent-expansion can mangle the percent-escapes the CLI requires.
 *
 *   `shell: false` cannot launch npx on Windows at all: npx is a .cmd shim, and
 *   Node refuses to spawn .cmd without a shell (the CVE-2024-27980 fix), giving
 *   EINVAL.
 *
 *   The CLI ignores SUPABASE_DB_URL in the environment — it was worth checking,
 *   since that would have kept the secret off the command line entirely — so
 *   --db-url has to be passed as an argument.
 *
 * The way out is to skip the shim: spawn the real node executable and hand it
 * npx's own entry script. node is a genuine .exe at an absolute path, so it
 * spawns without a shell, and every argument is passed as its own array element
 * with no quoting anywhere near the password.
 */
function findNpxCli() {
  const candidates = [];

  // Set when running under `npm run`; npx-cli.js sits beside npm-cli.js.
  if (process.env.npm_execpath) {
    candidates.push(join(dirname(process.env.npm_execpath), 'npx-cli.js'));
  }
  // Alongside the node binary, which is where the bundled npm lives.
  const nodeDir = dirname(process.execPath);
  candidates.push(join(nodeDir, 'node_modules', 'npm', 'bin', 'npx-cli.js'));
  candidates.push(join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'));

  return candidates.find((p) => existsSync(p)) ?? null;
}

/**
 * Which Supabase CLI to run.
 *
 * `@latest` rather than a pinned version, matching what the workflow installs,
 * so a local run and a CI run cannot behave differently. The trade is that a
 * CLI release could change behaviour underneath us; pin here and in the
 * workflow together if that ever bites.
 */
export const SUPABASE_PKG = ['--yes', 'supabase@latest'];

/**
 * Spawn the Supabase CLI with the given arguments.
 *
 * `onOutput` receives already-redacted text. The raw output is never returned,
 * only its exit code and the redacted transcript.
 */
export function runSupabase(args, { onOutput } = {}) {
  return new Promise((resolve) => {
    const npxCli = findNpxCli();

    const [command, argv, useShell] = npxCli
      ? [process.execPath, [npxCli, ...SUPABASE_PKG, ...args], false]
      // Last resort. Only reached if npm's own scripts cannot be located, in
      // which case a shell is the only way to run the shim.
      : ['npx', [...SUPABASE_PKG, ...args], process.platform === 'win32'];

    const child = spawn(command, argv, { shell: useShell });

    let transcript = '';
    const capture = (chunk) => {
      const text = redact(chunk.toString());
      transcript += text;
      onOutput?.(text);
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);

    child.on('error', (err) => resolve({
      code: 1, transcript: redact(err.message), spawnFailed: true,
    }));
    child.on('close', (code) => resolve({ code: code ?? 1, transcript }));
  });
}
