/**
 * Small maintenance helper: mark task-board items complete by id.
 *
 *   node scripts/check-tasks.mjs 0.1 0.2 1.3
 *   node scripts/check-tasks.mjs --uncheck 5.2
 *   node scripts/check-tasks.mjs --status
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../task.md', import.meta.url);
const args = process.argv.slice(2);

let text = readFileSync(FILE, 'utf8');

const statusOnly = args.includes('--status');
const uncheck = args.includes('--uncheck');
const ids = args.filter((a) => !a.startsWith('--'));

if (!statusOnly) {
  const from = uncheck ? '[x]' : '[ ]';
  const to = uncheck ? '[ ]' : '[x]';
  const missed = [];

  for (const id of ids) {
    const needle = `- ${from} ${id} `;
    if (!text.includes(needle)) {
      missed.push(id);
      continue;
    }
    text = text.split(needle).join(`- ${to} ${id} `);
  }

  writeFileSync(FILE, text);
  if (missed.length) console.warn(`not found (or already set): ${missed.join(', ')}`);
}

const total = (text.match(/- \[[ x]\] /g) ?? []).length;
const checked = (text.match(/- \[x\] /g) ?? []).length;
console.log(`${checked}/${total} tasks complete (${Math.round((checked / total) * 100)}%)`);
