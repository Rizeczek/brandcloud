/* Module trash – deleted folders / smartpages / links: restore or delete permanently. Needs the "trash" capability. */
'use strict';
route('trash', () => {
  if (!cap('trash')) return denied(t('noAccess'), t('whyCapability'));
  const list = C().trash.filter(x => cap('trash') && (role(me().role)?.fullAccess || x.by === me().id || x.items.some(i => userRank(me(), i) >= rank('edit'))));
  const row = x => { const it = x.items[0], from = it.parent && item(it.parent) ? L(item(it.parent).name) : t('navHome');
    return `<tr><td><span class="row__name">${ic(typeIcon(it), 18)}<span>${esc(L(it.name))}</span></span>${x.items.length > 1 ? ` <span class="t3">${esc(t('plusN', {n: x.items.length - 1}))}</span>` : ''}</td><td class="t3">${esc(from)}</td><td class="t3">${esc(fmtDateTime(x.at))} · ${esc(userName(x.by))}</td>` +
      `<td class="w0">${actBtn({label: t('restore'), icon: 'undo-2', act: 'restoreTrash', id: x.id, s: true})}${actBtn({icon: 'trash-2', act: 'purgeTrash', id: x.id, variant: 'danger-ghost', s: true, extra: `aria-label="${esc(t('deleteForever'))}"`})}</td></tr>`; };
  return {area: 'trash', title: t('navTrash'), crumbs: [{label: t('navTrash'), href: 'trash'}],
    view: `<div class="phead"><div class="phead__t"><h1>${esc(t('navTrash'))}</h1><div class="phead__meta">${esc(t('trashIntro'))}</div></div><div class="phead__acts">${actBtn({label: t('emptyTrash'), icon: 'trash-2', act: 'emptyTrash', variant: 'danger-ghost', ok: list.length > 0, reason: t('trashEmpty')})}</div></div>` +
      (list.length ? `<div class="bc-card tablewrap"><table class="bc-table"><thead><tr><th>${esc(t('name'))}</th><th>${esc(t('originalLocation'))}</th><th>${esc(t('deleted'))}</th><th class="w0"></th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>` : emptyState('trash-2', t('trashEmpty'), ''))};
});
function restoreTrash(id) {
  const x = C().trash.find(e => e.id === id); if (!x) return;
  const root = x.items[0];
  if (root.parent && !item(root.parent)) root.parent = null;      // original folder is gone → restore to Home
  C().items.push(...x.items); Object.assign(C().pages, x.pages);
  C().trash = C().trash.filter(e => e.id !== id);
  log('restore', root.id);
  return root;
}
Object.assign(ACT, {
  restoreTrash: el => { let r; Store.update(() => { r = restoreTrash(el.dataset.id); }); BCUI.toast(t('restored', {name: L(r.name)})); },
  purgeTrash: async el => { if (await confirm1({title: t('deleteForever'), text: t('deleteForeverText'), ok: t('deleteForever')})) Store.update(() => { C().trash = C().trash.filter(e => e.id !== el.dataset.id); }); },
  emptyTrash: async () => { if (await confirm1({title: t('emptyTrash'), text: t('deleteForeverText'), ok: t('emptyTrash')})) Store.update(() => { C().trash = []; }); }
});
