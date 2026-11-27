/* BrandCloud app boot – click/input delegates, shared chrome actions, prototype API for the top bar, start-up. Loaded last. */
'use strict';

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
  if (!el.closest('#app,#bottombar,.bc-modal,.bc-sidesheet,.bc-float')) return;
  const fn = ACT[el.dataset.act];
  if (!fn) { console.warn('no action', el.dataset.act); return; }
  e.preventDefault();
  fn(el, e);
});
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && ON_INPUT[el.dataset.input]) ON_INPUT[el.dataset.input](el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && ACT[el.dataset.change]) ACT[el.dataset.change](el, e); });
addEventListener('hashchange', () => { document.querySelectorAll('.bc-menu').forEach(m => m.remove()); render(); });

/* ---------------- shared chrome actions */
Object.assign(ACT, {
  go: el => go(el.dataset.href || ''),
  openPanel: () => BCUI.modal({title: t('openPanel'), body: `<div class="panel panel--sheet">${$('#panel').innerHTML}</div>`,
    onOpen: (box, close) => box.addEventListener('click', e => { if (e.target.closest('a[href]')) close(null); })}),
  crumbsMore: async el => {
    const path = curPath(), m = match(path); if (!m) return;
    const out = m.r.fn(m.params), cr = out.crumbs || [];
    const v = await BCUI.menu(el, cr.slice(1, -2).map(c => ({label: c.label, value: c.href, icon: 'bc-folder'})));
    if (v != null) go(v);
  },
  openUserMenu: async el => {
    const u = me();
    const v = await BCUI.menu(el, [
      {label: `${u.name} · ${L(role(u.role).name)}`, value: 'profile', icon: 'user', disabled: true},
      '-',
      {label: t('language') + ': ' + (lang === 'cs' ? 'Čeština' : 'English'), value: 'lang', icon: 'languages'},
      {label: t('actAs'), value: 'actAs', icon: 'user-round-cog'},
      '-',
      {label: t('logout'), value: 'logout', icon: 'log-out', why: t('notInPrototype'), disabled: true}
    ]);
    if (v === 'lang') setLang(lang === 'cs' ? 'en' : 'cs');
    if (v === 'actAs') actAsDialog();
  },
  openNotifications: async () => {
    const pend = pendingForMe();
    const acts = C().activity.filter(a => item(a.item) && visible(item(a.item))).slice(0, 12);
    const row = (icon, title, meta, h) => `<a class="ntf" href="#/${esc(h)}">${ic(icon, 18)}<span><strong>${esc(title)}</strong><small>${esc(meta)}</small></span></a>`;
    BCUI.modal({title: t('notifications'), side: true,
      body: (pend.length ? `<h3 class="ntf__h">${esc(t('waitingForApproval'))}</h3>` + pend.map(p => row('clock', L(p.name), t('submittedBy', {name: userName(p.submittedBy || p.by)}), href(p))).join('') : '') +
        `<h3 class="ntf__h">${esc(t('recentActivity'))}</h3>` + (acts.length ? acts.map(a => row({submit: 'send', approve: 'circle-check', reject: 'circle-x', create: 'plus', edit: 'pencil', delete: 'trash-2', restore: 'undo-2', move: 'folder-input'}[a.act] || 'history',
          L(item(a.item).name), `${t('act_' + a.act)} · ${userName(a.by)} · ${fmtDateTime(a.at)}`, href(item(a.item)) || '')).join('') : `<p class="t3">${esc(t('noActivity'))}</p>`),
      onOpen: (box, close) => box.addEventListener('click', e => { if (e.target.closest('a[href]')) close(null); })});
  }
});

async function actAsDialog() {
  const cur = me();
  let pick = cur.id;
  const r = await BCUI.modal({title: t('actAs'), desc: t('actAsHint'),
    body: `<div class="choice-list">${W().users.map(u => `<label class="bc-choice"><input class="bc-radio" type="radio" name="u" value="${u.id}"${u.id === cur.id ? ' checked' : ''}><bc-avatar name="${esc(u.name)}" size="s"></bc-avatar><span>${esc(u.name)}<small>${esc(L(role(u.role).name))} · ${esc(u.teams.map(x => L(team(x)?.name)).join(', ') || t('noTeam'))}</small></span></label>`).join('')}</div>`,
    actions: [{label: t('cancel'), value: 'cancel'}, {label: t('switch'), value: 'ok', variant: 'primary'}],
    beforeClose: (v, box) => { pick = (box.querySelector('[name=u]:checked') || {}).value; return true; }});
  if (r === 'ok' && pick && pick !== cur.id) { setMe(pick); BCUI.toast(t('nowActingAs', {name: me().name})); }
}

/* ---------------- prototype API for /ds/topbar.js (facilitator controls) */
window.BCProto = {
  langs: LANGS, get lang() { return lang; }, setLang,
  users: () => W().users.map(u => ({id: u.id, name: u.name, role: L(role(u.role)?.name)})), get me() { return me().id; }, setMe,
  reset: () => Store.reset(), t
};
window.dispatchEvent(new CustomEvent('bc-proto-ready'));

/* ---------------- start */
document.documentElement.lang = lang;
BCUI.labels.close = t('close');
INIT.forEach(f => f());
H.ready = true;
draw();
