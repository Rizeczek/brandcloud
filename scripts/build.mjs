// BrandCloud prototypes – build
// Sources → dist/ (uploaded to Wedos by .github/workflows/deploy.yml)
//
//   ds/tokens/*            → dist/ds/tokens.css        (scripts/tokens.mjs: Figma export → CSS, accents, contrast check)
//   ds/icons.json + Lucide → dist/ds/icons.js          (only the listed icons, validated against the lucide-static package)
//   ds/*.css|js            → dist/ds/
//   data/ i18n/ spec/      → dist/data/bc-data.js      (window.BC: mock data, UI strings, permission model, accents)
//   app/                   → composed Full app; prototypes/<slug>/ → dist/p/<slug>/ (full → dist/full/), top bar injected
//   catalog/               → dist/catalog/             (component catalogue)
//   signpost/ static/ server/ → dist/
//
// Run: node scripts/build.mjs   (needs `npm ci` once for lucide-static)
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildTokens} from './tokens.mjs';
import {permissionsDoc} from './permissions-doc.mjs';

export const SITE = 'brandcloud.fraymz.digital';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const r = (...p) => path.join(ROOT, ...p);
const read = p => fs.readFileSync(r(p), 'utf8');
const json = p => JSON.parse(read(p));
const write = (p, s) => { fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, s); };
const copyDir = (from, to, skip = () => false) => {
  if (!fs.existsSync(from)) return;
  for (const e of fs.readdirSync(from, {withFileTypes: true})) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (skip(e.name, a)) continue;
    if (e.isDirectory()) copyDir(a, b, skip); else { fs.mkdirSync(to, {recursive: true}); fs.copyFileSync(a, b); }
  }
};
const fail = m => { console.error('build: ' + m); process.exit(1); };

fs.rmSync(DIST, {recursive: true, force: true});
fs.mkdirSync(DIST, {recursive: true});

/* ------------------------------------------------------------------ tokens */
const tok = buildTokens();
tok.warnings.forEach(w => console.warn('tokens warn  ' + w));
if (tok.errors.length) fail('token errors:\n  ' + tok.errors.join('\n  '));
write(path.join(DIST, 'ds/tokens.css'), tok.css);

/* ------------------------------------------------------------------- icons */
// ds/icons.json: {"lucide": [names…]}; custom icons: ds/icons/<name>.svg (24×24, stroke or fill = currentColor)
const ICONS = json('ds/icons.json');
const LUCIDE = r('node_modules/lucide-static/icons');
if (!fs.existsSync(LUCIDE)) fail('lucide-static missing – run `npm ci`');
const inner = svg => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '').trim();
const icons = {};
for (const n of ICONS.lucide) {
  const f = path.join(LUCIDE, n + '.svg');
  if (!fs.existsSync(f)) fail(`icon "${n}" is not in lucide-static (check https://lucide.dev/icons/)`);
  icons[n] = {d: inner(fs.readFileSync(f, 'utf8'))};
}
for (const f of fs.existsSync(r('ds/icons')) ? fs.readdirSync(r('ds/icons')).filter(f => f.endsWith('.svg')) : []) {
  const svg = read('ds/icons/' + f);
  icons['bc-' + f.replace(/\.svg$/, '')] = {d: inner(svg), fill: /data-fill="1"/.test(svg)};
}
write(path.join(DIST, 'ds/icons.js'), `/* BrandCloud icons – GENERATED (Lucide ${json('node_modules/lucide-static/package.json').version} subset + ds/icons/*.svg). */\nwindow.BCIcons=${JSON.stringify(icons)};\n`);
copyDir(r('ds'), path.join(DIST, 'ds'), name => ['tokens', 'icons', 'icons.json'].includes(name));

/* -------------------------------------------------------------------- data */
// data/*.json → BC.<camelName>; i18n/<lang>.json → BC.i18n.<lang>; spec/permissions.json → BC.permissions
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const BC = {accents: tok.accents, i18n: {}, permissions: json('spec/permissions.json')};
for (const f of fs.readdirSync(r('data')).filter(f => f.endsWith('.json'))) BC[camel(f.replace(/\.json$/, ''))] = json('data/' + f);
for (const f of fs.readdirSync(r('i18n')).filter(f => f.endsWith('.json'))) BC.i18n[f.replace(/\.json$/, '')] = json('i18n/' + f);
// every UI string must exist in every language
const langs = Object.keys(BC.i18n), keys = l => Object.keys(BC.i18n[l]);
for (const l of langs) for (const k of keys(langs[0])) if (!(k in BC.i18n[l])) fail(`i18n/${l}.json is missing "${k}"`);
for (const l of langs) for (const k of keys(l)) if (!(k in BC.i18n[langs[0]])) fail(`i18n/${langs[0]}.json is missing "${k}" (present in ${l})`);
// docs/permissions.md is generated from spec/permissions.json and must be committed in sync
const doc = permissionsDoc(BC.permissions);
if (!fs.existsSync(r('docs/permissions.md')) || read('docs/permissions.md') !== doc) {
  if (process.env.CI) fail('docs/permissions.md is out of date – run `npm run docs` and commit');
  write(r('docs/permissions.md'), doc); console.log('docs/permissions.md regenerated');
}
copyDir(r('data/assets'), path.join(DIST, 'data/assets'));
write(path.join(DIST, 'data/bc-data.js'), `/* BrandCloud prototype data – GENERATED from data/, i18n/, spec/ */\nwindow.BC=${JSON.stringify(BC)};\n`);

/* --------------------------------------------------------------------- app */
const MODULES = json('app/modules.json');
const MOD = Object.fromEntries(MODULES.map(m => [m.id, m]));
copyDir(r('app'), path.join(DIST, 'app'), n => n === 'shell.html' || n === 'README.md');
const SHELL = read('app/shell.html');
const part = (html, name) => (html.split(`<!-- @${name} -->`)[1] || '').split('<!-- @')[0].trim();
/** swap: {moduleId: {dir, url}} replaces a module with a redesign (Standalone) */
function composeApp({focus = '', start = '', swap = {}} = {}) {
  const mods = MODULES.map(m => swap[m.id] ? {...m, dir: swap[m.id].dir, url: swap[m.id].url} : {...m, dir: r('app/modules', m.id), url: `/app/modules/${m.id}/`});
  const htmls = mods.map(m => fs.readFileSync(path.join(m.dir, 'module.html'), 'utf8'));
  return SHELL
    .replace('<!--@CSS-->', ['<link rel="stylesheet" href="/app/core.css">', ...mods.map(m => `<link rel="stylesheet" href="${m.url}module.css">`)].join('\n'))
    .replace('<!--@TEMPLATES-->', htmls.map(h => part(h, 'templates')).join('\n'))
    .replace('<!--@JS-->', [
      `<script>window.BC_APP=${JSON.stringify({focus})};${start ? `if(!location.hash)history.replaceState(null,'','${start}');` : ''}</script>`,
      '<script src="/data/bc-data.js"></script>', '<script src="/ds/icons.js"></script>', '<script src="/ds/components.js"></script>',
      '<script src="/app/core.js"></script>', ...mods.map(m => `<script src="${m.url}module.js"></script>`), '<script src="/app/boot.js"></script>'].join('\n'));
}

/* -------------------------------------------------------------- prototypes */
// meta.json kinds:
//   "app": "full"            → the Full prototype (all modules)                               – In Main
//   "module": "<id>"         → the app opened on that module's start route                    – In Main
//   "replaces": "<id>"       → redesign of a module (module.html/css/js in the folder)       – Standalone (swap-ready)
//   own index.html           → free-form page                                                – Standalone
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const protos = [];
for (const d of fs.readdirSync(r('prototypes'), {withFileTypes: true})) {
  if (!d.isDirectory()) continue;
  const dir = r('prototypes', d.name), meta = json(`prototypes/${d.name}/meta.json`);
  meta.slug = d.name;
  if (meta.hidden) continue;
  meta.url = meta.app === 'full' ? '/full/' : `/p/${d.name}/`;
  for (const k of ['module', 'replaces']) if (meta[k] && !MOD[meta[k]]) fail(`${d.name}: unknown module "${meta[k]}" (see app/modules.json)`);
  meta.state = meta.app || meta.module ? 'main' : 'standalone';
  protos.push({meta, dir});
}
const FIGMA = 'https://www.figma.com/design/';
const startOf = id => '#/' + (MOD[id].start || MOD[id].id);
const decorate = (html, meta) => {
  const bar = {title: meta.title, slug: meta.slug, state: meta.pinned ? '' : meta.state, figma: meta.figma && meta.figma.startsWith(FIGMA) ? meta.figma : '', app: !!(meta.app || meta.module || meta.replaces)};
  html = html.replace(new RegExp(`https?://${SITE.replace(/\./g, '\\.')}/(ds|data)/`, 'g'), '/$1/');   // absolute DS links → same-origin
  return html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)} · BrandCloud prototypes</title>`)
    .replace('</head>', `<meta name="robots" content="noindex, nofollow">\n<link rel="icon" href="/ds/logo-mark.svg" type="image/svg+xml">\n</head>`)
    .replace(/<body([^>]*)>/i, `<body$1>\n<script src="/ds/topbar.js" data-proto='${esc(JSON.stringify(bar))}'></script>`);
};
for (const {meta, dir} of protos) {
  const out = path.join(DIST, meta.url);
  let html;
  if (meta.app === 'full') html = composeApp();
  else if (meta.module) html = composeApp({focus: meta.module, start: startOf(meta.module)});
  else if (meta.replaces) {
    html = composeApp({focus: meta.replaces, start: startOf(meta.replaces), swap: {[meta.replaces]: {dir, url: meta.url}}});
    for (const f of ['module.css', 'module.js']) { fs.mkdirSync(out, {recursive: true}); fs.copyFileSync(path.join(dir, f), path.join(out, f)); }
  } else html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  copyDir(dir, out, n => ['index.html', 'meta.json', 'module.html', 'module.css', 'module.js'].includes(n));
  write(path.join(out, 'index.html'), decorate(html, meta));
}
if (fs.existsSync(r('catalog/index.html')))
  write(path.join(DIST, 'catalog/index.html'), decorate(read('catalog/index.html'), {title: 'Component catalogue', slug: 'catalog', state: '', pinned: true}));

/* ---------------------------------------------------------------- signpost */
const manifest = protos.map(({meta}) => ({slug: meta.slug, title: meta.title, description: meta.description || '', url: meta.url,
  added: meta.added, device: meta.device || 'desktop', state: meta.state, module: meta.module || meta.replaces || '', figma: meta.figma || '', pinned: !!meta.pinned}));
copyDir(r('signpost'), DIST);
write(path.join(DIST, 'manifest.json'), JSON.stringify({builtAt: new Date().toISOString(), prototypes: manifest}, null, 1));
copyDir(r('static'), DIST);
copyDir(r('server'), DIST);   // login gate + uploader (PHP). _sv/data/config.php is written by the deploy workflow.

/* ------------------------------------------------------------ cache busting */
// /ds/*, /app/*, /data/bc-data.js get ?v=<content hash> in every HTML page, so a deploy is never masked by browser/CDN cache.
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(DIST), ver = {};
for (const f of files) if (/\.(css|js|svg)$/.test(f) && !/\/_sv\//.test(f))
  ver['/' + path.relative(DIST, f)] = createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
for (const f of files.filter(f => f.endsWith('.html'))) {
  let h = fs.readFileSync(f, 'utf8');
  for (const [u, v] of Object.entries(ver)) h = h.split(`"${u}"`).join(`"${u}?v=${v}"`);
  fs.writeFileSync(f, h);
}

console.log(`built ${protos.length} prototypes, ${MODULES.length} modules, ${Object.keys(icons).length} icons, ${tok.counts.semantic} semantic tokens, ${Object.keys(tok.accents).length} accents → dist/`);
