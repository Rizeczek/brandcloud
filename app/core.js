/* BrandCloud app core – i18n, session store, permission engine, router, shell rendering helpers.
   Loaded after /data/bc-data.js, /ds/icons.js, /ds/components.js; before the modules and boot.js.
   Contract for modules: app/README.md */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = BCUI.esc;
const ic = (n, s = 20) => `<bc-icon name="${n}" size="${s}"></bc-icon>`;
const APP = window.BC_APP || {};

/* =====================================================================
   PREFS (participant settings – survive "Reset prototype")
   ===================================================================== */
const LANGS = Object.keys(BC.i18n);
const PREFS_KEY = 'bc-prefs';
const prefs = (() => { try { return JSON.parse(sessionStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; } })();
const qs = new URLSearchParams(location.search);
if (LANGS.includes(qs.get('lang'))) prefs.lang = qs.get('lang');
if (!LANGS.includes(prefs.lang)) prefs.lang = 'cs';
const savePrefs = () => { try { sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} };
savePrefs();

/* =====================================================================
   I18N – t('key', {n, name}) for UI strings (i18n/<lang>.json), L({cs,en}) for content
   A string may be a plural object {one, few, many, other} (Intl.PluralRules).
   ===================================================================== */
let lang = prefs.lang;
function t(key, vars = {}) {
  let s = BC.i18n[lang][key];
  if (s == null) { console.warn('i18n: missing', key); return key; }
  if (typeof s === 'object') s = s[new Intl.PluralRules(lang).select(vars.n ?? 0)] ?? s.other;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
const L = o => o == null ? '' : typeof o === 'string' ? o : (o[lang] || o.cs || o.en || '');
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString(lang === 'cs' ? 'cs-CZ' : 'en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : '';
const fmtSize = b => b >= 1e6 ? (b / 1e6).toFixed(1).replace('.', lang === 'cs' ? ',' : '.') + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' kB';
const nowIso = () => new Date().toISOString().slice(0, 16);
const uid = p => p + '-' + Math.random().toString(36).slice(2, 8);
const both = s => ({cs: s, en: s});            // text typed by a tester goes to both languages
const setL = (o, v) => ({...(o || {}), [lang]: v});
function setLang(l) { if (!LANGS.includes(l)) return; lang = prefs.lang = l; savePrefs(); document.documentElement.lang = l; BCUI.labels.close = t('close'); render(); window.dispatchEvent(new CustomEvent('bc-lang')); }

/* =====================================================================
   STORE – the whole prototype state, kept in sessionStorage for this tester session.
   Reload keeps changes; "Reset prototype" (top bar) returns to the mock data. A new build with
   different mock data resets automatically (version = hash of the data).
   ===================================================================== */
const STATE_KEY = 'bc-state';
const DATA_VER = (s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); })(JSON.stringify([BC.content, BC.workspace, BC.brand]));
const initial = () => ({ver: DATA_VER, workspace: structuredClone(BC.workspace), content: structuredClone(BC.content), brand: structuredClone(BC.brand), design: {accent: 'blue', banner: 'a-banner'}, ui: {}});
let S = (() => { try { const s = JSON.parse(sessionStorage.getItem(STATE_KEY)); if (s && s.ver === DATA_VER) return s; } catch (e) {} return initial(); })();
const Store = {
  get state() { return S; },
  save() { try { sessionStorage.setItem(STATE_KEY, JSON.stringify(S)); } catch (e) { console.warn('state not saved', e); } },
  /** mutate state, persist, re-render. Returns fn's result. */
  update(fn, {silent = false} = {}) { const r = fn(S); Store.save(); if (!silent) render(); return r; },
  snapshot() { return JSON.stringify(S); },
  restore(snap) { S = JSON.parse(snap); Store.save(); render(); },
  reset() { S = initial(); Store.save(); delete prefs.me; savePrefs(); location.hash = '#/'; render(); }
};
Store.save();

/* =====================================================================
   LOOKUPS
   ===================================================================== */
const C = () => S.content, W = () => S.workspace;
const item = id => C().items.find(i => i.id === id);
const page = id => C().pages[id];
const asset = id => C().assets.find(a => a.id === id);
const user = id => W().users.find(u => u.id === id);
const team = id => W().teams.find(x => x.id === id);
const role = id => W().roles.find(r => r.id === id);
const me = () => user(prefs.me) || user(W().me) || W().users[0];
const children = pid => C().items.filter(i => (i.parent || null) === (pid || null));
const ancestors = id => { const out = []; let x = item(id); while (x && x.parent) { x = item(x.parent); if (x) out.unshift(x); } return out; };
const descendants = id => children(id).flatMap(c => [c, ...descendants(c.id)]);
const userName = id => (user(id) || {name: t('unknownUser')}).name;
const typeIcon = it => it.type === 'folder' ? 'bc-folder' : it.type === 'page' ? 'bc-smartpage' : 'link';
const assetsOfPage = pid => { const p = page(pid); if (!p) return []; const ids = []; for (const s of p.sections) for (const b of s.blocks) { if (b.type === 'asset') ids.push(...b.assets); if (b.type === 'image' && b.asset) ids.push(b.asset); } return [...new Set(ids)]; };
function setMe(id) { if (!user(id)) return; prefs.me = id; savePrefs(); render(); window.dispatchEvent(new CustomEvent('bc-me')); }

/* =====================================================================
   PERMISSIONS – implements spec/permissions.json (docs/permissions.md). Keep both in sync.
   ===================================================================== */
const P = BC.permissions;
const LEVELS = P.levels.map(l => l.id);                         // hide, view, download, edit, lock
const rank = id => Math.max(0, LEVELS.indexOf(id));
const levelLabel = id => L(P.levels[rank(id)].label);
/** Ceiling a team may be given on an item (rules clamp + subteam): min(team's level on the parent folder, parent team's level on the item). */
function teamCeiling(teamId, it) {
  const tm = team(teamId), top = LEVELS.length - 1;
  return Math.min(it.parent ? teamRank(teamId, item(it.parent)) : top, tm && tm.parent ? teamRank(tm.parent, it) : top);
}
/** Level the team gets on the item without its own setting (rule inherit): the parent folder's level; at the top level
    nothing (Hide) – except a subteam, which starts from its parent team's level. */
function teamInherited(teamId, it) {
  const tm = team(teamId);
  return !it.parent && !(tm && tm.parent) ? 0 : teamCeiling(teamId, it);
}
/** Effective level of ONE team on an item: own setting clamped by the ceiling, otherwise inherited. */
function teamRank(teamId, it) {
  if (!it || !team(teamId)) return 0;
  const own = it.grants && it.grants[teamId] != null ? rank(it.grants[teamId]) : null;
  return own == null ? teamInherited(teamId, it) : Math.min(own, teamCeiling(teamId, it));
}
function userRank(u, it) {
  if (!u || !it) return 0;
  const r = role(u.role);
  if (r && r.fullAccess) return LEVELS.length - 1;
  return Math.max(0, ...u.teams.map(tid => teamRank(tid, it)));
}
const levelOf = (itemId, u = me()) => LEVELS[userRank(u, item(itemId))];
const visible = (it, u = me()) => userRank(u, it) >= 1;
/** can('edit', itemId) – content action; reason via why() */
function can(action, itemId, u = me()) {
  const a = P.actions[action], it = item(itemId);
  if (!a || !it) return false;
  let need = rank(a.min);
  if (a.lockable && it.locked) need = Math.max(need, rank('lock'));
  return userRank(u, it) >= need;
}
function why(action, itemId, u = me()) {
  const a = P.actions[action], it = item(itemId);
  if (!a || !it) return '';
  if (a.lockable && it.locked && userRank(u, it) < rank('lock')) return t('whyLocked');
  return t('whyLevel', {level: levelLabel(a.min)});
}
const cap = (c, u = me()) => { const r = role(u.role); return !!r && (r.fullAccess || r.caps.includes(c)); };
const canCreateIn = (parentId, u = me()) => parentId ? can('create', parentId, u) : cap('createRoot', u);

/* =====================================================================
   ACTIVITY
   ===================================================================== */
const log = (act, itemId, extra = {}) => C().activity.unshift({at: nowIso(), by: me().id, act, item: itemId, ...extra});

/* =====================================================================
   ROUTER – #/<path>. Modules register routes; render() draws the matched one.
   route(pattern, fn): pattern like 'f/:id'; fn(params) returns
     {area, title, crumbs:[{label, href}], panel?:html, view:html, actionbar?:html, mode?:'edit', after?:fn}
   ===================================================================== */
const ROUTES = [];
const ACT = {};          // ACT[name] = (el, event) => {}  ← data-act="name" (click delegate in boot.js)
const ON_INPUT = {};     // ON_INPUT[name] = (el, event) => {}  ← data-input="name"
const INIT = [];
function route(pattern, fn) {
  const keys = [], re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  ROUTES.push({pattern, re, keys, fn});
}
const curPath = () => decodeURIComponent(location.hash.replace(/^#\/?/, '').split('?')[0]);
const go = p => { const h = '#/' + p.replace(/^\/+/, ''); if (location.hash === h) render(); else location.hash = h; };
function match(path) {
  for (const r of ROUTES) { const m = path.match(r.re); if (m) return {r, params: Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]))}; }
  return null;
}

/* =====================================================================
   NAVIGATION (rail + mobile bottom bar)
   ===================================================================== */
const NAV = [
  {id: 'home', icon: 'house', href: '', label: 'navHome'},
  {id: 'datacloud', icon: 'cloud', href: 'datacloud', label: 'navDataCloud', cap: 'dataCloud'},
  {id: 'eshop', icon: 'shopping-cart', href: 'eshop', label: 'navEshop', cap: 'eshop'},
  {id: 'stats', icon: 'chart-column', href: 'stats', label: 'navStats', cap: 'statistics'},
  {id: 'trash', icon: 'trash-2', href: 'trash', label: 'navTrash', cap: 'trash'}
];
const SETTINGS_CAPS = ['manageUsers', 'manageTeams', 'manageRoles', 'manageDesign'];
const navAllowed = n => !n.cap || cap(n.cap);
const pendingForMe = () => cap('approve') ? C().items.filter(i => i.type === 'page' && i.status === 'pending' && visible(i)) : [];

/* =====================================================================
   SHARED RENDER HELPERS
   ===================================================================== */
const crumbsHome = () => [{label: t('navHome'), href: ''}];
const itemCrumbs = it => [...crumbsHome(), ...ancestors(it.id).map(a => ({label: L(a.name), href: (a.type === 'folder' ? 'f/' : 'p/') + a.id})), {label: L(it.name), href: (it.type === 'folder' ? 'f/' : 'p/') + it.id}];
const href = it => it.type === 'folder' ? 'f/' + it.id : it.type === 'page' ? 'p/' + it.id : '';
const statusBadge = it => it.type !== 'page' || !it.status ? '' : `<span class="bc-badge bc-badge--${{approved: 'success', pending: 'warning', rejected: 'error', draft: ''}[it.status]}">${t('status_' + it.status)}</span>`;
const lockBadge = it => it.locked ? `<span class="bc-badge" title="${esc(t('lockedHint'))}">${ic('lock', 14)}${t('locked')}</span>` : '';
const thumb = (assetId, cls = '') => { const a = asset(assetId); return a ? `<img class="${cls}" src="${esc(a.file)}" alt="" loading="lazy">` : ''; };
const denied = (title, text) => ({area: '', title, crumbs: crumbsHome(), view: `<div class="bc-empty">${ic('eye-off', 32)}<strong>${esc(title)}</strong><span>${esc(text)}</span></div>`});
const notFound = () => denied(t('notFound'), t('notFoundText'));
function emptyState(icon, title, text, action = '') { return `<div class="bc-empty">${ic(icon, 32)}<strong>${esc(title)}</strong>${text ? `<span>${esc(text)}</span>` : ''}${action}</div>`; }
/** A button that is visibly unavailable with the reason as tooltip (never hidden: testers should see what exists). */
const actBtn = ({label, icon, act, id = '', variant = 'secondary', ok = true, reason = '', s = false, extra = ''}) =>
  `<button class="bc-btn bc-btn--${variant}${s ? ' bc-btn--s' : ''}" data-act="${act}" data-id="${esc(id)}"${ok ? '' : ` disabled title="${esc(reason)}"`} ${extra}>${icon ? ic(icon, 18) : ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;

/* =====================================================================
   RENDER
   ===================================================================== */
let lastPath = null;
const H = {ready: false, scheduled: false};
/** draw synchronously (when the next step needs the new DOM, e.g. focusing an inserted block) */
function renderNow() { H.scheduled = false; draw(); }
function render() {
  if (!H.ready) return;
  if (H.scheduled) return;
  H.scheduled = true;
  requestAnimationFrame(() => { if (H.scheduled) { H.scheduled = false; draw(); } });
}
function draw() {
  const path = curPath(), m = match(path);
  const out = m ? (m.r.fn(m.params) || notFound()) : notFound();
  document.documentElement.dataset.accent = S.design.accent;
  document.title = `${out.title ? out.title + ' · ' : ''}${L(S.brand.workspace)} · BrandCloud`;
  $('#app').dataset.mode = out.mode || '';
  $('#app').dataset.area = out.area || '';
  drawRail(out.area);
  const panel = $('#panel');
  panel.hidden = !out.panel;
  panel.innerHTML = out.panel || '';
  $('#app').classList.toggle('has-panel', !!out.panel);
  drawBanner();
  $('#crumbs').innerHTML = crumbsHTML(out.crumbs || [], !!out.panel, out.crumbTools || '');
  const bar = $('#actionbar');
  bar.hidden = !out.actionbar; bar.innerHTML = out.actionbar || '';
  const view = $('#view');
  const keepScroll = lastPath === path;
  const y = $('.main').scrollTop;
  view.innerHTML = out.view;
  $('.main').scrollTop = keepScroll ? y : 0;
  lastPath = path;
  if (out.after) out.after();
}
function crumbsHTML(cr, hasPanel, tools) {
  const n = cr.length;
  const parts = cr.map((c, i) => i === n - 1 ? `<span aria-current="page">${esc(c.label)}</span>` : `<a href="#/${esc(c.href)}">${esc(c.label)}</a>`);
  // middle steps collapse to … when the path is deep
  const shown = n > 5 ? [parts[0], `<button class="crumbs__more" data-act="crumbsMore" title="${esc(cr.slice(1, n - 2).map(c => c.label).join(' / '))}">…</button>`, ...parts.slice(n - 2)] : parts;
  return `${hasPanel ? `<button class="bc-btn bc-btn--ghost bc-btn--icon bc-btn--s crumbs__panel" data-act="openPanel" aria-label="${esc(t('openPanel'))}">${ic('panel-left', 18)}</button>` : ''}` +
    `<nav class="crumbs__path" aria-label="${esc(t('breadcrumb'))}">${shown.join(`<span class="crumbs__sep" aria-hidden="true">${ic('chevron-right', 14)}</span>`)}</nav><div class="crumbs__tools">${tools}</div>`;
}
function drawBanner() {
  // the client banner: identical on every screen – same image, size and position
  const a = asset(S.design.banner);
  const b = $('#banner');
  const key = (a ? a.file : '') + '|' + L(S.brand.workspace);
  if (b.dataset.key === key) return;
  b.dataset.key = key;
  b.innerHTML = a ? `<img src="${esc(a.file)}" alt="">` : '';
}
function drawRail(area) {
  const u = me(), pend = pendingForMe().length;
  const item = n => `<a class="rail__item${area === n.id ? ' is-active' : ''}" href="#/${n.href}" aria-label="${esc(t(n.label))}" ${area === n.id ? 'aria-current="page"' : ''}>${ic(n.icon, 22)}<span class="rail__tip">${esc(t(n.label))}</span></a>`;
  const navs = NAV.filter(navAllowed);
  const settings = SETTINGS_CAPS.some(c => cap(c));
  $('#rail').innerHTML = `<a class="rail__ws" href="#/" title="${esc(L(S.brand.workspace))}">${thumb('a-mark')}</a>` +
    navs.map(item).join('') + '<span class="rail__sp"></span>' +
    `<button class="rail__item" data-act="openNotifications" aria-label="${esc(t('notifications'))}">${ic('bell', 22)}${pend ? '<span class="bc-dot rail__dot"></span>' : ''}<span class="rail__tip">${esc(t('notifications'))}</span></button>` +
    (settings ? item({id: 'settings', icon: 'settings', href: 'settings', label: 'navSettings'}) : '') +
    `<button class="rail__me" data-act="openUserMenu" aria-label="${esc(u.name)}"><bc-avatar name="${esc(u.name)}"></bc-avatar></button>`;
  $('#bottombar').innerHTML = [...navs.slice(0, 3), ...(settings ? [{id: 'settings', icon: 'settings', href: 'settings', label: 'navSettings'}] : [])]
    .map(n => `<a class="bb__item${area === n.id ? ' is-active' : ''}" href="#/${n.href}">${ic(n.icon, 22)}<span>${esc(t(n.label))}</span></a>`).join('') +
    `<button class="bb__item" data-act="openUserMenu">${ic('ellipsis', 22)}<span>${esc(t('more'))}</span></button>`;
}

/* =====================================================================
   COMMON DIALOGS
   ===================================================================== */
const field = (label, input, hint = '') => `<label class="bc-field"><span>${esc(label)}</span>${input}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
async function prompt1({title, label, value = '', ok}) {
  let v = null;
  const r = await BCUI.modal({title, size: 's', body: `<form>${field(label, `<input class="bc-input" name="v" value="${esc(value)}" required autofocus>`)}</form>`,
    actions: [{label: t('cancel'), value: 'cancel'}, {label: ok || t('save'), value: 'ok', variant: 'primary'}],
    beforeClose: (val, box) => { if (val !== 'ok') return true; v = box.querySelector('[name=v]').value.trim(); return !!v; }});
  return r === 'ok' ? v : null;
}
async function confirm1({title, text, ok, danger = true}) {
  return await BCUI.modal({title, size: 's', body: `<p class="t2">${esc(text)}</p>`, actions: [{label: t('cancel'), value: 'cancel'}, {label: ok, value: 'ok', variant: danger ? 'danger' : 'primary'}]}) === 'ok';
}
/** Undo for destructive actions: snapshot before, toast with "Undo". */
async function withUndo(msg, fn) {
  const snap = Store.snapshot();
  Store.update(fn);
  if (await BCUI.toast(msg, {action: t('undo')}) === 'action') Store.restore(snap);
}
