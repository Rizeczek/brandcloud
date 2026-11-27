// Mock data for the prototype. Brand = PLACEHOLDER until the fictional test brand is supplied.
// Writes data/brand.json, data/workspace.json, data/content.json and data/assets/*.svg. Deterministic. Run: npm run data
//
// The brand is invented on purpose: testers must not recognise a real company, and it must not be BrandCloud itself.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const D = p => path.join(ROOT, 'data', p);
fs.mkdirSync(D('assets'), {recursive: true});
for (const f of fs.readdirSync(D('assets'))) fs.unlinkSync(D('assets/' + f));
const save = (f, o) => fs.writeFileSync(D(f), JSON.stringify(o, null, 1) + '\n');
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const T = (cs, en) => ({cs, en});

/* ------------------------------------------------------------------ brand */
// PLACEHOLDER brand – the real fictional test brand (name, logo, colours, assets) will be supplied by the design team.
// Everything brand-specific lives in data/brand.json + data/assets/; replace them and re-run this script.
const brand = {
  _doc: 'PLACEHOLDER. The fictional test brand is not chosen yet – name, colours, fonts and assets will be supplied and replace this file and data/assets/.',
  placeholder: true,
  name: 'Brand', workspace: T('Brand portál', 'Brand portal'), domain: 'brand.example',
  tagline: T('Zástupný slogan značky', 'Placeholder brand tagline'),
  colors: [
    {id: 'c1', name: T('Hlavní barva', 'Primary colour'), hex: '#3F4A5A', rgb: '63 74 90', cmyk: '30 18 0 65', pantone: '–'},
    {id: 'c2', name: T('Doplňková 1', 'Secondary 1'), hex: '#8A94A6', rgb: '138 148 166', cmyk: '17 11 0 35', pantone: '–'},
    {id: 'c3', name: T('Doplňková 2', 'Secondary 2'), hex: '#C5CBD6', rgb: '197 203 214', cmyk: '8 5 0 16', pantone: '–'},
    {id: 'c4', name: T('Pozadí', 'Background'), hex: '#EEF0F4', rgb: '238 240 244', cmyk: '2 2 0 4', pantone: '–'},
    {id: 'c5', name: T('Text', 'Text'), hex: '#1E2026', rgb: '30 32 38', cmyk: '21 16 0 85', pantone: '–'}
  ],
  fonts: [
    {id: 'display', family: 'Georgia', role: T('Nadpisy', 'Headlines'), weights: [400, 700], sample: T('Zástupný nadpis značky', 'Placeholder brand headline')},
    {id: 'text', family: 'Mona Sans', role: T('Texty', 'Body text'), weights: [400, 600], sample: T('Příliš žluťoučký kůň úpěl ďábelské ódy.', 'The quick brown fox jumps over the lazy dog.')}
  ],
  banner: '/data/assets/banner.svg', logo: '/data/assets/logo-primary.svg', mark: '/data/assets/logo-mark.svg'
};
save('brand.json', brand);

/* ----------------------------------------------------------------- assets */
// Neutral grey placeholders with a label and the real target size, so layouts are tested with true aspect ratios.
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>\n`;
const ph = (w, h, label, tone = 0) => {
  const bg = ['#E7EAF0', '#DCE0E8', '#CFD5DF', '#3F4A5A'][tone], fg = tone === 3 ? '#EEF0F4' : '#5B6577', s = Math.min(w, h);
  return `<rect width="${w}" height="${h}" fill="${bg}"/><path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="${fg}" stroke-opacity=".12" stroke-width="${Math.max(2, s / 200)}"/>` +
    `<rect x="${w / 2 - s * .14}" y="${h / 2 - s * .2}" width="${s * .28}" height="${s * .2}" rx="${s * .02}" fill="none" stroke="${fg}" stroke-width="${Math.max(2, s / 120)}"/>` +
    `<circle cx="${w / 2 - s * .06}" cy="${h / 2 - s * .13}" r="${s * .025}" fill="${fg}"/><path d="M${w / 2 - s * .12} ${h / 2 - s * .02}l${s * .08}-${s * .07}l${s * .05} ${s * .04}l${s * .04}-${s * .03}l${s * .07} ${s * .06}" fill="none" stroke="${fg}" stroke-width="${Math.max(2, s / 120)}"/>` +
    `<text x="${w / 2}" y="${h / 2 + s * .12}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="${Math.max(12, s * .055)}" fill="${fg}">${label}</text>` +
    `<text x="${w / 2}" y="${h / 2 + s * .19}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${Math.max(10, s * .035)}" fill="${fg}" opacity=".7">${w} × ${h}</text>`;
};
const assets = [];
let day = 0;
const addAsset = (id, file, w, h, label, meta, tone = 0) => {
  fs.writeFileSync(D('assets/' + file), svg(w, h, ph(w, h, label, tone)));
  assets.push({id, file: '/data/assets/' + file, w, h, kind: meta.kind || 'image', name: meta.name, ext: meta.ext || 'svg',
    size: meta.size || Math.round(180 + rnd() * 2400) * 1000, tags: meta.tags || [], created: `2026-${String(9 + Math.floor(day / 28)).padStart(2, '0')}-${String(1 + day++ % 28).padStart(2, '0')}`,
    by: meta.by || 'u-tomas', desc: meta.desc || T('', '')});
};
addAsset('a-banner', 'banner.svg', 1600, 320, 'Banner', {name: 'banner.svg', tags: ['banner']}, 3);
addAsset('a-logo', 'logo-primary.svg', 800, 320, 'Logo', {name: 'logo-primary.svg', tags: ['logo'], by: 'u-petra'});
addAsset('a-logo-mono', 'logo-mono.svg', 800, 320, 'Logo mono', {name: 'logo-mono.svg', tags: ['logo'], by: 'u-petra'}, 1);
addAsset('a-logo-neg', 'logo-negative.svg', 800, 320, 'Logo negativ', {name: 'logo-negative.svg', tags: ['logo'], by: 'u-petra'}, 3);
addAsset('a-mark', 'logo-mark.svg', 320, 320, 'Značka', {name: 'logo-mark.svg', tags: ['logo'], by: 'u-petra'}, 2);
for (let i = 1; i <= 6; i++) addAsset(`a-tea-${i}`, `product-a-${i}.svg`, 800, 800, `Produkt A${i}`, {name: `produkt-a-${i}.svg`, tags: ['produkt'], by: i % 2 ? 'u-tomas' : 'u-klara'}, i % 3);
for (let i = 1; i <= 4; i++) addAsset(`a-brew-${i}`, `product-b-${i}.svg`, 800, 800, `Produkt B${i}`, {name: `produkt-b-${i}.svg`, tags: ['produkt']}, (i + 1) % 3);
for (let i = 1; i <= 3; i++) addAsset(`a-acc-${i}`, `product-c-${i}.svg`, 800, 800, `Produkt C${i}`, {name: `produkt-c-${i}.svg`, tags: ['produkt']}, i % 3);
for (let i = 1; i <= 6; i++) addAsset(`a-life-${i}`, `photo-${i}.svg`, 1200, 800, `Foto ${i}`, {name: `foto-${String(i).padStart(2, '0')}.svg`, tags: ['foto'], by: 'u-eva'}, i % 3);
['Key visual', 'Billboard', 'Instagram'].forEach((n, i) => addAsset(`a-summer-${i + 1}`, `campaign-a-${i + 1}.svg`, [1200, 1200, 1080][i], [800, 400, 1080][i], n, {name: `kampan-a-${i + 1}.svg`, tags: ['kampaň'], by: 'u-eva'}, i % 3));
['Visual 1', 'Visual 2'].forEach((n, i) => addAsset(`a-xmas-${i + 1}`, `campaign-b-${i + 1}.svg`, 1200, 800, n, {name: `kampan-b-${i + 1}.svg`, tags: ['kampaň']}, (i + 2) % 3));
[[1080, 1080, 'Post 1:1'], [1080, 1920, 'Story 9:16'], [1080, 1350, 'Post 4:5'], [1584, 396, 'LinkedIn']].forEach(([w, h, n], i) =>
  addAsset(`a-social-${i + 1}`, `social-${i + 1}.svg`, w, h, n, {name: `sablona-${i + 1}.svg`, tags: ['šablona'], by: 'u-klara'}, i % 3));
addAsset('a-pdf-brandbook', 'doc-brandbook.svg', 600, 800, 'PDF', {name: 'brand-manual.pdf', kind: 'pdf', ext: 'pdf', size: 18400000, tags: ['manuál'], by: 'u-petra'}, 1);
addAsset('a-pdf-press', 'doc-press.svg', 600, 800, 'PDF', {name: 'tiskova-zprava.pdf', kind: 'pdf', ext: 'pdf', size: 820000, tags: ['PR'], by: 'u-lucie'}, 1);
addAsset('a-pdf-brief', 'doc-brief.svg', 600, 800, 'PDF', {name: 'brief-kampane.pdf', kind: 'pdf', ext: 'pdf', size: 1240000, tags: ['brief'], by: 'u-tomas'}, 1);
addAsset('a-font-fraunces', 'font.svg', 800, 400, 'Font', {name: 'font-nadpisy.zip', kind: 'font', ext: 'zip', size: 2600000, tags: ['font'], by: 'u-petra'}, 2);

/* -------------------------------------------------------------- workspace */
const ws = {
  _doc: 'Users, teams and roles of the fictional workspace. Teams carry content access (grants on items in content.json), roles carry global capabilities (spec/permissions.json).',
  roles: [
    {id: 'r-owner', name: T('Vlastník', 'Owner'), system: true, fullAccess: true, caps: []},
    {id: 'r-admin', name: T('Administrátor', 'Administrator'), fullAccess: true, caps: []},
    {id: 'r-editor', name: T('Editor', 'Editor'), caps: ['createRoot', 'dataCloud', 'trash', 'statistics', 'eshop']},
    {id: 'r-approver', name: T('Schvalovatel', 'Approver'), caps: ['approve', 'dataCloud', 'statistics', 'eshop']},
    {id: 'r-viewer', name: T('Čtenář', 'Viewer'), caps: ['dataCloud', 'eshop']},
    {id: 'r-guest', name: T('Host', 'Guest'), caps: []}
  ],
  teams: [
    {id: 't-marketing', name: T('Marketing', 'Marketing'), parent: null},
    {id: 't-social', name: T('Sociální sítě', 'Social media'), parent: 't-marketing'},
    {id: 't-sales', name: T('Obchod', 'Sales'), parent: null},
    {id: 't-management', name: T('Vedení', 'Management'), parent: null},
    {id: 't-agency', name: T('Agentura', 'Agency'), parent: null}
  ],
  users: [
    {id: 'u-petra', name: 'Petra Nováková', email: 'petra.novakova@brand.example', role: 'r-owner', teams: ['t-marketing', 't-management'], title: T('Brand manažerka', 'Brand manager')},
    {id: 'u-tomas', name: 'Tomáš Dvořák', email: 'tomas.dvorak@brand.example', role: 'r-editor', teams: ['t-marketing'], title: T('Marketingový specialista', 'Marketing specialist')},
    {id: 'u-klara', name: 'Klára Benešová', email: 'klara.benesova@brand.example', role: 'r-editor', teams: ['t-social'], title: T('Social media manažerka', 'Social media manager')},
    {id: 'u-lucie', name: 'Lucie Svobodová', email: 'lucie.svobodova@brand.example', role: 'r-approver', teams: ['t-marketing', 't-management'], title: T('Vedoucí značky', 'Head of brand')},
    {id: 'u-jan', name: 'Jan Král', email: 'jan.kral@brand.example', role: 'r-viewer', teams: ['t-sales'], title: T('Obchodní zástupce', 'Sales representative')},
    {id: 'u-eva', name: 'Eva Horáková', email: 'eva@agentura.example', role: 'r-guest', teams: ['t-agency'], title: T('Art directorka, agentura', 'Art director, agency')}
  ],
  me: 'u-petra'
};
save('workspace.json', ws);

/* ---------------------------------------------------------------- content */
const items = [], pages = {};
let n = 0;
const ts = () => `2026-${String(9 + n % 3).padStart(2, '0')}-${String(2 + (n * 5) % 26).padStart(2, '0')}T${String(8 + n % 9).padStart(2, '0')}:${String((n * 13) % 60).padStart(2, '0')}`;
const item = (id, type, parent, name, extra = {}) => { n++; items.push({id, type, parent, name, tags: [], grants: {}, updated: ts(), by: extra.by || 'u-petra', ...extra}); return id; };
const sec = (title, ...blocks) => ({id: 's' + (++n), title, blocks: blocks.map(b => ({id: 'b' + (++n), ...b}))});
const h = (lvl, cs, en) => ({type: 'h' + lvl, text: T(cs, en)});
const p = (cs, en) => ({type: 'p', text: T(cs, en)});
const files = (...ids) => ({type: 'asset', assets: ids});
const image = id => ({type: 'image', asset: id});
const page = (id, parent, name, sections, extra = {}) => { item(id, 'page', parent, name, {status: 'approved', ...extra}); pages[id] = {sections}; return id; };
const G = (o) => o;

item('f-identity', 'folder', null, T('Logo a identita', 'Logo & identity'), {cover: 'a-logo', grants: G({'t-marketing': 'lock', 't-sales': 'download', 't-agency': 'download', 't-management': 'view'}), tags: ['identita']});
page('p-brandbook', 'f-identity', T('Brand manuál', 'Brand book'), [
  sec(null, h(1, 'Brand manuál', 'Brand book'), p('Zástupný text. Manuál popisuje, jak značka vypadá a mluví.', 'Placeholder text. The book describes how the brand looks and speaks.')),
  sec(T('Ke stažení', 'Downloads'), p('Kompletní manuál v PDF a logotypy ve všech variantách.', 'The complete book as a PDF and the logo in all variants.'), files('a-pdf-brandbook', 'a-logo', 'a-logo-neg')),
  sec(T('Hodnoty', 'Values'), h(2, 'Hodnoty značky', 'Brand values'), p('Zástupný text o hodnotách značky.', 'Placeholder text about the brand values.'), {type: 'divider'}, h(3, 'Čemu se vyhnout', 'What to avoid'), p('Zástupný text.', 'Placeholder text.'))
], {locked: true, cover: 'a-pdf-brandbook'});
page('p-logo', 'f-identity', T('Logo – pravidla použití', 'Logo – usage rules'), [
  sec(null, h(1, 'Logo', 'Logo'), p('Zástupný text. Neupravujte proporce ani barvy loga.', 'Placeholder text. Do not change the logo proportions or colours.')),
  sec(T('Varianty', 'Variants'), files('a-logo', 'a-logo-mono', 'a-logo-neg', 'a-mark')),
  sec(T('Ochranná zóna', 'Clear space'), p('Kolem loga ponechte volný prostor alespoň o velikosti značky.', 'Keep free space around the logo at least the size of the mark.'), image('a-logo'))
], {cover: 'a-logo'});
page('p-colors', 'f-identity', T('Barvy', 'Colours'), [
  sec(null, h(1, 'Barevná paleta', 'Colour palette'), p('Zástupný text k barevné paletě.', 'Placeholder text about the palette.'), {type: 'colors', colors: brand.colors.map(c => c.id)})
], {cover: 'a-banner'});
page('p-type', 'f-identity', T('Typografie', 'Typography'), [
  sec(null, h(1, 'Typografie', 'Typography'), p('Zástupný text k písmům značky.', 'Placeholder text about the brand fonts.'), {type: 'font', font: 'display'}, {type: 'font', font: 'text'}, files('a-font-fraunces'))
], {cover: 'a-font-fraunces'});

item('f-campaigns', 'folder', null, T('Kampaně', 'Campaigns'), {cover: 'a-summer-1', grants: G({'t-marketing': 'edit', 't-sales': 'view', 't-agency': 'download', 't-management': 'view'}), tags: ['kampaně']});
item('f-summer27', 'folder', 'f-campaigns', T('Kampaň A', 'Campaign A'), {cover: 'a-summer-1', by: 'u-tomas'});
page('p-summer-brief', 'f-summer27', T('Brief kampaně', 'Campaign brief'), [
  sec(null, h(1, 'Kampaň A', 'Campaign A'), p('Zástupný text briefu kampaně.', 'Placeholder campaign brief text.')),
  sec(T('Podklady', 'Materials'), files('a-pdf-brief', 'a-summer-1')),
  sec(T('Harmonogram', 'Timeline'), p('Spuštění 1. 6. 2027, venkovní reklama 6 týdnů.', 'Launch on 1 June 2027, outdoor for 6 weeks.'))
], {status: 'pending', by: 'u-tomas', submittedBy: 'u-tomas', cover: 'a-summer-1'});
page('p-summer-media', 'f-summer27', T('Podklady pro média', 'Media kit'), [
  sec(null, h(1, 'Media kit', 'Media kit'), p('Zástupný text.', 'Placeholder text.')),
  sec(T('Vizuály', 'Visuals'), files('a-summer-1', 'a-summer-2', 'a-summer-3')),
  sec(T('Tisková zpráva', 'Press release'), files('a-pdf-press'))
], {status: 'draft', by: 'u-eva', cover: 'a-summer-2'});
item('f-xmas26', 'folder', 'f-campaigns', T('Kampaň B', 'Campaign B'), {cover: 'a-xmas-1'});
page('p-xmas-gifts', 'f-xmas26', T('Podklady kampaně B', 'Campaign B materials'), [
  sec(null, h(1, 'Kampaň B', 'Campaign B'), p('Zástupný text.', 'Placeholder text.'), files('a-xmas-1', 'a-xmas-2'))
], {cover: 'a-xmas-1'});
item('f-spring27', 'folder', 'f-campaigns', T('Kampaň C', 'Campaign C'), {by: 'u-tomas'});

item('f-products', 'folder', null, T('Produkty', 'Products'), {cover: 'a-brew-1', grants: G({'t-marketing': 'edit', 't-social': 'view', 't-sales': 'download', 't-agency': 'download', 't-management': 'view'}), tags: ['produkty']});
page('p-tea', 'f-products', T('Produktová řada A', 'Product line A'), [
  sec(null, h(1, 'Produktová řada A', 'Product line A'), p('Zástupný text produktové řady.', 'Placeholder product line text.'), files('a-tea-1', 'a-tea-2', 'a-tea-3', 'a-tea-4', 'a-tea-5', 'a-tea-6'))
], {cover: 'a-tea-1'});
page('p-coldbrew', 'f-products', T('Produktová řada B', 'Product line B'), [
  sec(null, h(1, 'Produktová řada B', 'Product line B'), p('Zástupný text.', 'Placeholder text.'), image('a-brew-1')),
  sec(T('Varianty', 'Variants'), files('a-brew-1', 'a-brew-2', 'a-brew-3', 'a-brew-4'))
], {cover: 'a-brew-2'});
page('p-accessories', 'f-products', T('Produktová řada C', 'Product line C'), [
  sec(null, h(1, 'Produktová řada C', 'Product line C'), files('a-acc-1', 'a-acc-2', 'a-acc-3'))
], {cover: 'a-acc-1', status: 'draft', by: 'u-tomas'});

item('f-social', 'folder', null, T('Sociální sítě', 'Social media'), {cover: 'a-social-1', grants: G({'t-marketing': 'edit', 't-agency': 'view'}), by: 'u-klara'});
page('p-social-templates', 'f-social', T('Šablony', 'Templates'), [
  sec(null, h(1, 'Šablony pro sociální sítě', 'Social media templates'), p('Zástupný text k šablonám.', 'Placeholder text about the templates.'), files('a-social-1', 'a-social-2', 'a-social-3', 'a-social-4'))
], {by: 'u-klara', cover: 'a-social-2'});
page('p-social-voice', 'f-social', T('Pravidla komunikace', 'Tone of voice'), [
  sec(null, h(1, 'Jak mluvíme', 'How we speak'), p('Zástupný text k tónu komunikace.', 'Placeholder tone-of-voice text.'), h(2, 'Příklady', 'Examples'), p('Zástupný příklad.', 'Placeholder example.'))
], {by: 'u-klara', cover: 'a-life-3'});

item('f-internal', 'folder', null, T('Interní', 'Internal'), {grants: G({'t-management': 'edit', 't-marketing': 'view'}), tags: ['interní']});
page('p-onboarding', 'f-internal', T('Onboarding', 'Onboarding'), [
  sec(null, h(1, 'Vítejte', 'Welcome'), p('Zástupný text onboardingu.', 'Placeholder onboarding text.'), image('a-life-1'))
], {cover: 'a-life-1'});

item('f-lifestyle', 'folder', null, T('Fotobanka', 'Photo library'), {cover: 'a-life-2', grants: G({'t-marketing': 'edit', 't-sales': 'download', 't-agency': 'edit', 't-management': 'view'}), by: 'u-eva'});
page('p-lifestyle', 'f-lifestyle', T('Lifestyle fotografie', 'Lifestyle photos'), [
  sec(null, h(1, 'Lifestyle', 'Lifestyle'), p('Zástupný text k fotobance.', 'Placeholder photo library text.'), files('a-life-1', 'a-life-2', 'a-life-3', 'a-life-4', 'a-life-5', 'a-life-6'))
], {by: 'u-eva', cover: 'a-life-4'});

page('p-start', null, T('Začněte zde', 'Start here'), [
  sec(null, h(1, 'Vítejte v brand portálu', 'Welcome to the brand portal'), p('Najdete tu vše, co potřebujete k práci se značkou: logo, barvy, fotky produktů i podklady kampaní.', 'Everything you need to work with the brand: logo, colours, product photos and campaign materials.'), image('a-life-2'))
], {grants: G({'t-marketing': 'edit', 't-sales': 'view', 't-agency': 'view', 't-management': 'view'}), cover: 'a-life-2'});
item('l-web', 'link', null, T('Web značky', 'Brand website'), {url: 'https://brand.example', grants: G({'t-marketing': 'view', 't-sales': 'view', 't-agency': 'view', 't-management': 'view'})});

const content = {
  _doc: 'Folders, smartpages and links (items), smartpage sections/blocks (pages), files (assets). Data Cloud is derived from asset/image blocks – never edited directly.',
  items, pages, assets,
  activity: [
    {at: '2026-11-25T14:12', by: 'u-tomas', act: 'submit', item: 'p-summer-brief'},
    {at: '2026-11-24T09:40', by: 'u-eva', act: 'create', item: 'p-summer-media'},
    {at: '2026-11-20T16:05', by: 'u-lucie', act: 'approve', item: 'p-coldbrew'},
    {at: '2026-11-18T11:30', by: 'u-klara', act: 'edit', item: 'p-social-templates'}
  ],
  trash: []
};
save('content.json', content);
console.log(`data: ${items.length} items, ${Object.keys(pages).length} smartpages, ${assets.length} assets, ${ws.users.length} users, ${ws.teams.length} teams, ${ws.roles.length} roles`);
