// Regenerate the per-tool agent instruction files from AGENTS.md.
//
// Different AI tools read different filenames, so the same rules have to exist in several
// places. Keeping those as hand-written copies already failed once: .github/copilot-instructions.md
// drifted to the point of saying "Active plan: Plan 1" and "never commit .env" long after both
// had changed — so a teammate's AI would have been confidently told the opposite of reality.
//
// AGENTS.md is the single source. Edit it, then run:  npm run sync:agents
//
// CI checks this (npm run sync:agents:check), so a stale mirror fails the build rather than
// quietly misleading somebody.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'AGENTS.md';

const TARGETS = [
  { file: 'CLAUDE.md', tool: 'Claude Code' },
  { file: 'GEMINI.md', tool: 'Gemini' },
  { file: '.github/copilot-instructions.md', tool: 'GitHub Copilot' },
];

const banner = (tool) =>
  `<!-- GENERATED FILE — DO NOT EDIT. Source: AGENTS.md. Regenerate: npm run sync:agents -->\n\n` +
  `# SponsorSync — ${tool} Instructions\n\n` +
  `The canonical rule set is [\`AGENTS.md\`](./AGENTS.md). This file is a generated copy so\n` +
  `${tool} has the full set inline without a cross-file hop. **Edit \`AGENTS.md\`, not this file** —\n` +
  `changes here are overwritten.\n\n---\n\n`;

// Compare with line endings normalized. git is configured with autocrlf on Windows, so these
// files are CRLF on a Windows checkout and LF in Linux CI. Comparing raw bytes made the check
// pass in CI and fail locally — a check that depends on which machine runs it is worse than
// no check. Always WRITE LF and let git convert on checkout.
// Handles CRLF and lone CR, not just CRLF: a file that has been converted twice ends up with
// \r\r\n, and a normalizer that only knows \r\n leaves a stray \r behind and reports false drift.
const lf = (text) => text.replace(/\r\n?/g, '\n');

// Drop AGENTS.md's own title and its "this file is canonical" preamble; the banner replaces them.
const source = lf(readFileSync(join(root, SOURCE), 'utf8'));
const body = source.slice(source.indexOf('## Current state'));

const check = process.argv.includes('--check');
let stale = [];

for (const { file, tool } of TARGETS) {
  const expected = banner(tool) + body;
  const path = join(root, file);
  let actual = '';
  try {
    actual = lf(readFileSync(path, 'utf8'));
  } catch {
    /* missing counts as stale */
  }
  if (actual === expected) continue;
  if (check) {
    stale.push(file);
  } else {
    writeFileSync(path, expected);
    console.log(`regenerated ${file}`);
  }
}

if (check && stale.length) {
  console.error(
    `\nThese agent instruction files are out of date with AGENTS.md:\n` +
      stale.map((f) => `  - ${f}`).join('\n') +
      `\n\nRun:  npm run sync:agents\n`,
  );
  process.exit(1);
}
if (check) console.log('agent instruction files are in sync with AGENTS.md');
