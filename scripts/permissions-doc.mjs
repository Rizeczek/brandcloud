// docs/permissions.md ← spec/permissions.json (+ default roles from data/workspace.json). Run: npm run docs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export function permissionsDoc(spec, ws = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/workspace.json'), 'utf8'))) {
  const L = o => `${o.cs} / ${o.en}`;
  const lv = Object.fromEntries(spec.levels.map(l => [l.id, l]));
  const out = [
    '# Permission model (prototype)', '',
    '> GENERATED from `spec/permissions.json` by `npm run docs` – edit the spec, not this file.', '',
    '## Levels', '', '| Rank | Level | Meaning |', '|---|---|---|',
    ...spec.levels.map(l => `| ${l.rank} | **${L(l.label)}** | ${l.desc.en} |`), '',
    '## Rules', '', ...spec.rules.map((x, i) => `${i + 1}. **${x.id}** – ${x.text.en}`), '',
    '## Content actions', '', '| Action | Minimum level | Blocked when locked |', '|---|---|---|',
    ...Object.entries(spec.actions).map(([id, a]) => `| \`${id}\` ${a.label.en} | ${lv[a.min].label.en} | ${a.lockable ? 'yes (needs Edit & lock)' : '–'}${a.note ? ' – ' + a.note.en : ''} |`), '',
    '## Global capabilities and default roles', '',
    `| Capability | ${ws.roles.map(r => r.name.en).join(' | ')} |`, `|---|${ws.roles.map(() => '---').join('|')}|`,
    ...spec.capabilities.map(c => `| ${c.label.en} | ${ws.roles.map(r => r.fullAccess || r.caps.includes(c.id) ? '●' : '').join(' | ')} |`),
    `| Full access to all content | ${ws.roles.map(r => r.fullAccess ? '●' : '').join(' | ')} |`, '',
    'Testers can create roles in Settings → Roles; the prototype keeps them for the browser session only.', ''
  ];
  return out.join('\n');
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'spec/permissions.json'), 'utf8'));
  fs.writeFileSync(path.join(ROOT, 'docs/permissions.md'), permissionsDoc(spec));
  console.log('docs/permissions.md written');
}
