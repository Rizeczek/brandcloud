// BrandCloud tokens: Figma Design Tokens export (ds/tokens/figma.tokens.json) → CSS custom properties.
//
//   node scripts/tokens.mjs           print the report (contrast, aliases)
//   node scripts/tokens.mjs --check   exit 1 on any error (used by CI and the build)
//
// Rules
//   - root primitives  → --root-<path>        (e.g. --root-neutral-mauve-13)
//   - semantic tokens  → --<path>             (e.g. --typo-neutral-strong, --surface-intent-action-strong); "semantic." is dropped
//   - every reference into the accent scale (accents.json "scale", cloud blue) → var(--accent-N), so a client accent
//     (<html data-accent="ruby">) re-colours the whole action layer; --on-accent is picked per accent for 4.5:1 on accent-9
//   - font styles      → --t-<group>-<name> + short aliases (--t-body, --t-h3 …); shadows → --shadow-<name>
//   - base.json        → --sp-*, --r-*, layout sizes
//   - contrast.json    → WCAG pairs checked under every accent
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'ds/tokens', f), 'utf8'));

const css = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hex = v => { let h = v.toLowerCase(); if (h.length === 9 && h.endsWith('ff')) h = h.slice(0, 7); return h; };

// Short names used across the app and the PHP pages → canonical tokens. Add here; never hard-code hex.
export const ALIAS = {
  'text-primary': 'typo-neutral-strong', 'text-secondary': 'typo-neutral-default', 'text-tertiary': 'typo-neutral-light',
  'text-placeholder': 'typo-neutral-subtle', 'text-disabled': 'typo-disabled-default', 'text-action': 'typo-intent-action',
  'text-action-strong': 'typo-intent-action-strong', 'text-danger': 'typo-intent-error', 'text-positive': 'typo-intent-success',
  'text-warning': 'typo-intent-warning', 'text-inverse-primary': 'typo-inverse-strong', 'text-inverse-secondary': 'typo-inverse-light',
  'icon-primary': 'icon-neutral-strong', 'icon-secondary': 'icon-neutral-default', 'icon-tertiary': 'icon-neutral-light',
  'icon-action': 'icon-intent-action', 'icon-danger': 'icon-intent-error', 'icon-inverse': 'icon-inverse-default',
  'surface-primary': 'surface-neutral-primary', 'surface-secondary': 'surface-neutral-secondary', 'surface-tertiary': 'surface-neutral-gray',
  'surface-action-solid': 'surface-intent-action-strong', 'surface-action-light': 'surface-intent-action-light', 'surface-action-subtle': 'surface-intent-action-subtle',
  'surface-danger-solid': 'surface-intent-error-strong', 'surface-intent-danger-light': 'surface-intent-error-light', 'surface-danger-subtle': 'surface-intent-error-subtle',
  'surface-intent-positive-light': 'surface-intent-success-light', 'surface-warning-light': 'surface-intent-warning-light',
  'surface-inverse': 'surface-inverse-primary',
  'border-strong': 'stroke-neutral-strong', 'border-medium': 'stroke-neutral-subtle', 'border-light': 'stroke-neutral-subtlest',
  'border-subtle': 'stroke-neutral-faint', 'border-action': 'stroke-intent-action-strong', 'border-danger': 'stroke-intent-error-strong',
  'bg-primary': 'background-neutral-primary', 'bg-secondary': 'background-neutral-secondary', 'hover-subtle': 'hover',
};

function flatten(node, p = [], out = []) {
  if (node && typeof node === 'object' && 'type' in node && 'value' in node) { out.push({path: p, type: node.type, value: node.value}); return out; }
  for (const [k, v] of Object.entries(node || {})) if (!k.startsWith('_') && v && typeof v === 'object') flatten(v, [...p, k], out);
  return out;
}

/* WCAG relative luminance / contrast, alpha composited on white */
const rgba = h => { h = h.replace('#', ''); const n = i => parseInt(h.slice(i, i + 2), 16); return [n(0), n(2), n(4), h.length >= 8 ? n(6) / 255 : 1]; };
const onWhite = ([r, g, b, a]) => [r, g, b].map(c => c * a + 255 * (1 - a));
const lum = h => onWhite(rgba(h)).map(c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [.2126, .7152, .0722][i], 0);
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

export function buildTokens() {
  const src = rd('figma.tokens.json'), base = rd('base.json'), acc = rd('accents.json'), pairs = rd('contrast.json').pairs;
  const all = flatten(src);
  const errors = [], warnings = [];
  const byRef = new Map(all.map(t => [t.path.join('.'), t]));
  const varName = p => p[0] === 'semantic' ? css(p.slice(1).join('-')) : css(p.join('-'));
  const accentPrefix = acc.scale + '.';
  for (const [id, a] of Object.entries(acc.accents)) for (let i = 1; i <= 12; i++) if (!byRef.has(`${a.scale}.${i}`)) errors.push(`accent ${id}: missing ${a.scale}.${i}`);

  const colours = all.filter(t => t.type === 'color');
  const ref = v => typeof v === 'string' && /^\{.+\}$/.test(v) ? v.slice(1, -1) : null;
  // CSS value of a colour token
  const cssVal = t => {
    const r = ref(t.value);
    if (!r) return hex(t.value);
    if (!byRef.has(r)) { errors.push(`${t.path.join('.')} → unknown reference {${r}}`); return 'transparent'; }
    if (r.startsWith(accentPrefix)) return `var(--accent-${r.slice(accentPrefix.length)})`;
    return `var(--${varName(r.split('.'))})`;
  };
  // resolved hex under an accent (for contrast)
  const resolve = (r, accentScale, seen = new Set()) => {
    if (seen.has(r)) { errors.push(`reference cycle at ${r}`); return '#000000'; }
    seen.add(r);
    if (r.startsWith(accentPrefix)) r = accentScale + '.' + r.slice(accentPrefix.length);
    const t = byRef.get(r); if (!t) return '#000000';
    const rr = ref(t.value); return rr ? resolve(rr, accentScale, seen) : hex(t.value);
  };

  const prim = colours.filter(t => t.path[0] === 'root'), sem = colours.filter(t => t.path[0] === 'semantic');
  const accentVars = (scale) => Array.from({length: 12}, (_, i) => `  --accent-${i + 1}:var(--${varName([...scale.split('.'), String(i + 1)])});`).join('\n');
  // white if it reaches 4.5:1 on accent-9, otherwise whichever of white / mauve 13 contrasts more
  const onAccentIsWhite = scale => { const s9 = resolve(`${scale}.9`, scale), w = contrast('#ffffff', s9); return w >= 4.5 || w >= contrast(resolve('root.neutral.mauve.13', scale), s9); };
  const onAccent = scale => onAccentIsWhite(scale) ? '#ffffff' : 'var(--root-neutral-mauve-13)';

  // contrast under every accent
  const semMap = Object.fromEntries(sem.map(t => [varName(t.path), t.path.join('.')]));
  const report = [];
  for (const [id, a] of Object.entries(acc.accents)) {
    const val = n => n === 'on-accent' ? (onAccentIsWhite(a.scale) ? '#ffffff' : resolve('root.neutral.mauve.13', a.scale)) : semMap[n] ? resolve(semMap[n], a.scale) : null;
    const waived = new Set((a.waive || []).map(w => w.fg + '|' + w.bg));
    for (const p of pairs) {
      const f = val(p.fg), b = val(p.bg);
      if (!f || !b) { errors.push(`contrast.json: unknown token ${!f ? p.fg : p.bg}`); continue; }
      const c = contrast(f, b), ok = c >= p.min;
      report.push({accent: id, ...p, ratio: +c.toFixed(2), ok});
      const w = waived.has(p.fg + '|' + p.bg);
      if (!ok) (p.level === 'error' && !w ? errors : warnings).push(`[${id}] ${p.fg} on ${p.bg}: ${c.toFixed(2)}:1 < ${p.min}${w ? ' (waived in accents.json)' : p.note ? ' (' + p.note + ')' : ''}`);
    }
  }
  const canon = new Set(sem.map(t => varName(t.path)));
  for (const [a, t] of Object.entries(ALIAS)) if (!canon.has(t)) errors.push(`alias --${a} → unknown token --${t}`);

  // typography
  const fonts = all.filter(t => t.type === 'custom-fontStyle');
  const fam = fonts[0]?.value.fontFamily || 'Mona Sans';
  const fontVar = t => `${t.value.fontWeight} ${t.value.fontSize}px/${t.value.lineHeight}px var(--ff)`;
  const FONT_ALIAS = {'body': 'font.body.regular', 'body-b': 'font.body.regular bold', 'body-s': 'font.body.small', 'body-s-b': 'font.body.small bold',
    'cap': 'font.body.small', 'cap-b': 'font.body.small bold', 'tiny': 'font.body.tiny', 'tiny-b': 'font.body.tiny bold', 'body-l': 'font.body.large', 'body-l-b': 'font.body.large bold',
    'h1': 'font.headline.h1', 'h2': 'font.headline.h2', 'h3': 'font.headline.h3', 'h4': 'font.headline.h4', 'h5': 'font.headline.h5', 'h6': 'font.body.regular bold',
    'sp-h1': 'font.smartpage.h1', 'sp-h2': 'font.smartpage.h2', 'sp-h3': 'font.smartpage.h3', 'sp-p': 'font.smartpage.paragraph', 'sp-p-b': 'font.smartpage.paragraph bold'};
  for (const [a, r] of Object.entries(FONT_ALIAS)) if (!byRef.has(r)) errors.push(`font alias --t-${a} → unknown style ${r}`);
  const shadows = all.filter(t => t.type === 'custom-shadow');
  const px = n => n ? n + 'px' : '0';

  const out = `/* BrandCloud tokens – GENERATED by scripts/tokens.mjs from ds/tokens/. Do not edit. Light mode only. */
/* Client accent: <html data-accent="${Object.keys(acc.accents).join('|')}"> (default ${acc.default}). */
:root{color-scheme:light;
  /* root primitives */
${prim.map(t => `  --${varName(t.path)}:${cssVal(t)};`).join('\n')}
  /* accent (client-themable) */
${accentVars(acc.accents[acc.default].scale)}
  --on-accent:${onAccent(acc.accents[acc.default].scale)};
  /* semantic */
${sem.map(t => `  --${varName(t.path)}:${cssVal(t)};`).join('\n')}
  /* aliases */
${Object.entries(ALIAS).map(([a, t]) => `  --${a}:var(--${t});`).join('\n')}
  /* typography */
  --ff:'${fam}',system-ui,-apple-system,'Segoe UI',sans-serif;
${fonts.map(t => `  --t-${css(t.path.slice(1).join('-'))}:${fontVar(t)};`).join('\n')}
${Object.entries(FONT_ALIAS).filter(([, r]) => byRef.has(r)).map(([a, r]) => `  --t-${a}:var(--t-${css(r.split('.').slice(1).join('-'))});`).join('\n')}
  /* shadows */
${shadows.map(t => { const v = t.value; return `  --shadow-${css(t.path.slice(2).join('-'))}:${px(v.offsetX)} ${px(v.offsetY)} ${px(v.radius)} ${px(v.spread)} ${hex(v.color)};`; }).join('\n')}
  --shadow-sm:var(--shadow-soft);--shadow-md:var(--shadow-medium);--shadow-lg:0 12px 32px -4px #0016661f,0 2px 6px #00166614;
  /* spacing / radius / layout (base.json) */
${Object.entries(base.space).map(([k, v]) => `  --sp-${k}:${px(v)};`).join('\n')}
${Object.entries(base.radius).map(([k, v]) => `  --r-${k}:${px(v)};`).join('\n')}
${Object.entries(base.layout).map(([k, v]) => `  --size-${k}:${px(v)};`).join('\n')}
  --focus-ring:0 0 0 2px var(--surface-primary),0 0 0 4px var(--accent-9);
  --ease:cubic-bezier(.2,.8,.2,1);
}
${Object.entries(acc.accents).filter(([id]) => id !== acc.default).map(([id, a]) => `[data-accent="${id}"]{\n${accentVars(a.scale)}\n  --on-accent:${onAccent(a.scale)};\n}`).join('\n')}
`;
  const accents = Object.fromEntries(Object.entries(acc.accents).map(([id, a]) => [id, {label: a.label, swatch: resolve(`${a.scale}.9`, a.scale)}]));
  return {css: out, errors, warnings, report, accents, counts: {primitives: prim.length, semantic: sem.length, fonts: fonts.length, aliases: Object.keys(ALIAS).length}};
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const r = buildTokens();
  for (const w of r.warnings) console.warn('warn  ' + w);
  for (const e of r.errors) console.error('error ' + e);
  console.log(`tokens: ${r.counts.primitives} primitives, ${r.counts.semantic} semantic, ${r.counts.fonts} type styles, ${r.counts.aliases} aliases, ${Object.keys(r.accents).length} accents – ${r.errors.length} errors, ${r.warnings.length} warnings`);
  if (process.argv.includes('--check') && r.errors.length) process.exit(1);
}
