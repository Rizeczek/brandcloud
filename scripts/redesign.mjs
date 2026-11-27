// Redesign workflow for app modules.
//
//   node scripts/redesign.mjs new <module> <slug> "<title>"   copy app/modules/<module> → prototypes/<slug> (Standalone, swap-ready)
//   node scripts/redesign.mjs merge <slug>                     approved: copy prototypes/<slug> → app/modules/<module>, remove the Standalone
//   node scripts/redesign.mjs list                             modules and open redesigns
//
// A redesign page = the whole app with that one module swapped, opened on its area; other areas open the Full prototype.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MODULES = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/modules.json'), 'utf8'));
const FILES = ['module.html', 'module.css', 'module.js'];
const [cmd, a, b, ...rest] = process.argv.slice(2);
const die = m => { console.error(m); process.exit(1); };
const now = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

if (cmd === 'new') {
  const mod = MODULES.find(m => m.id === a); if (!mod) die(`unknown module "${a}". Modules: ${MODULES.map(m => m.id).join(', ')}`);
  if (!b || !/^[a-z0-9-]+$/.test(b)) die('slug: lowercase letters, digits, dashes');
  const dir = path.join(ROOT, 'prototypes', b); if (fs.existsSync(dir)) die(`prototypes/${b} exists`);
  fs.mkdirSync(dir, {recursive: true});
  for (const f of FILES) fs.copyFileSync(path.join(ROOT, 'app/modules', a, f), path.join(dir, f));
  const title = rest.length ? rest.join(' ') : `${mod.title} – redesign`;
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({title, description: '', replaces: a, device: 'desktop', added: now(), figma: ''}, null, 1) + '\n');
  console.log(`prototypes/${b}/ – edit module.html / module.css / module.js. Shown as Standalone at /p/${b}/`);
} else if (cmd === 'merge') {
  const dir = path.join(ROOT, 'prototypes', a || ''); if (!a || !fs.existsSync(path.join(dir, 'meta.json'))) die('usage: merge <slug>');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  if (!meta.replaces) die(`${a} is not a module redesign (no "replaces" in meta.json)`);
  for (const f of FILES) fs.copyFileSync(path.join(dir, f), path.join(ROOT, 'app/modules', meta.replaces, f));
  fs.rmSync(dir, {recursive: true});
  console.log(`merged ${a} → app/modules/${meta.replaces}/ (Full and every In Main page now use it); prototypes/${a} removed`);
} else if (cmd === 'list') {
  for (const m of MODULES) console.log(`${m.id.padEnd(16)} ${m.title}`);
  for (const d of fs.readdirSync(path.join(ROOT, 'prototypes'))) {
    const p = path.join(ROOT, 'prototypes', d, 'meta.json');
    if (fs.existsSync(p)) { const m = JSON.parse(fs.readFileSync(p, 'utf8')); if (m.replaces) console.log(`  redesign: ${d} → ${m.replaces}`); }
  }
} else die('usage: new <module> <slug> "<title>" | merge <slug> | list');
