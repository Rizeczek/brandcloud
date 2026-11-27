/* Module datacloud – read-only registry of every file used on Smartpages (derived from asset/image blocks).
   No upload here: files enter Data Cloud by being added to a Smartpage. Valid actions: edit (sidesheet), delete, batch delete.
   Selection operations live in the floating action bar. */
'use strict';
const DC = {sel: new Set(), q: '', kind: 'all', tag: ''};
/** asset → pages (that the acting user may view) where it is used */
function dataCloudIndex(u = me()) {
  const map = new Map();
  for (const it of C().items) {
    if (it.type !== 'page' || !visible(it, u)) continue;
    for (const aid of assetsOfPage(it.id)) { if (!asset(aid)) continue; if (!map.has(aid)) map.set(aid, []); map.get(aid).push(it.id); }
  }
  return map;
}
const dataCloudCanDownload = aid => (dataCloudIndex().get(aid) || []).some(pid => can('download', pid));
const dcCanDelete = aid => (dataCloudIndex().get(aid) || []).every(pid => can('edit', pid));
const KINDS = ['all', 'image', 'pdf', 'font'];

function dcView() {
  if (!cap('dataCloud')) return denied(t('noAccess'), t('whyCapability'));
  const idx = dataCloudIndex();
  let list = [...idx.keys()].map(asset);
  const counts = Object.fromEntries(KINDS.map(k => [k, k === 'all' ? list.length : list.filter(a => a.kind === k).length]));
  const tags = [...new Set(list.flatMap(a => a.tags || []))].sort();
  const q = DC.q.trim().toLowerCase();
  list = list.filter(a => (DC.kind === 'all' || a.kind === DC.kind) && (!DC.tag || (a.tags || []).includes(DC.tag)) && (!q || a.name.toLowerCase().includes(q) || (a.tags || []).some(x => x.includes(q))));
  for (const id of DC.sel) if (!idx.has(id)) DC.sel.delete(id);
  const grid = (S.ui.dcView || 'grid') === 'grid';
  const usedIn = a => { const ps = idx.get(a.id) || []; return ps.length === 1 ? L(item(ps[0]).name) : t('usedOnN', {n: ps.length}); };
  const tile = a => `<article class="dcc${DC.sel.has(a.id) ? ' is-sel' : ''}"><button class="dcc__t" data-act="dcOpen" data-id="${a.id}" aria-label="${esc(t('editFile'))}: ${esc(a.name)}">${a.file ? `<img src="${esc(a.file)}" alt="" loading="lazy">` : ic(kindIcon(a), 32)}<span class="ftile__ext">${esc(a.ext.toUpperCase())}</span></button>` +
    `<label class="card__sel dcc__sel"><input type="checkbox" class="bc-check" data-change="dcSel" data-id="${a.id}"${DC.sel.has(a.id) ? ' checked' : ''} aria-label="${esc(t('select'))}: ${esc(a.name)}"></label>` +
    `<div class="dcc__b"><span class="ftile__n" title="${esc(a.name)}">${esc(a.name)}</span><span class="ftile__m">${esc(fmtSize(a.size))} · ${esc(usedIn(a))}</span></div></article>`;
  const row = a => `<tr class="${DC.sel.has(a.id) ? 'is-sel' : ''}"><td class="w0"><input type="checkbox" class="bc-check" data-change="dcSel" data-id="${a.id}"${DC.sel.has(a.id) ? ' checked' : ''} aria-label="${esc(t('select'))}: ${esc(a.name)}"></td>` +
    `<td><button class="row__name dc-row__n" data-act="dcOpen" data-id="${a.id}"><span class="dc-row__t">${a.file ? `<img src="${esc(a.file)}" alt="">` : ic(kindIcon(a), 18)}</span><span>${esc(a.name)}</span></button></td><td class="t3">${esc(a.ext.toUpperCase())}</td><td class="num t3">${esc(fmtSize(a.size))}</td><td class="t3">${esc(usedIn(a))}</td><td class="t3">${esc(fmtDate(a.created))}</td></tr>`;
  const n = DC.sel.size, sel = [...DC.sel];
  const float = n ? `<div class="bc-float" role="toolbar" aria-label="${esc(t('selectionActions'))}"><span class="bc-float__n">${esc(t('nSelected', {n}))}</span>` +
    actBtn({label: t('download'), icon: 'download', act: 'dcDownloadSel', variant: 'ghost', s: true, ok: sel.every(dataCloudCanDownload), reason: t('whyLevel', {level: levelLabel('download')})}) +
    actBtn({label: t('delete'), icon: 'trash-2', act: 'dcDeleteSel', variant: 'ghost', s: true, ok: sel.every(dcCanDelete), reason: t('dcWhyDelete')}) +
    actBtn({icon: 'x', act: 'dcClear', variant: 'ghost', s: true, extra: `aria-label="${esc(t('clearSelection'))}"`}) + '</div>' : '';
  return {
    area: 'datacloud', title: t('navDataCloud'), crumbs: [{label: t('navDataCloud'), href: 'datacloud'}],
    panel: `<div class="panel__title">${esc(t('navDataCloud'))}</div><div class="panel__h">${esc(t('fileType'))}</div><div class="pnav">${KINDS.map(k => `<a href="#/datacloud" data-act="dcKind" data-v="${k}"${DC.kind === k ? ' class="is-active"' : ''}>${ic({all: 'layers', image: 'file-image', pdf: 'file-text', font: 'type'}[k], 18)}<span>${esc(t('kind_' + k))}</span><span class="count">${counts[k]}</span></a>`).join('')}</div>` +
      (tags.length ? `<div class="pnav__sep"></div><div class="panel__h">${esc(t('tags'))}</div><div class="chips" style="padding:0 8px">${tags.map(tg => `<button class="chip" data-act="dcTag" data-v="${esc(tg)}" aria-pressed="${DC.tag === tg}">${esc(tg)}</button>`).join('')}</div>` : ''),
    view: `<div class="phead"><div class="phead__t"><h1>${esc(t('navDataCloud'))}</h1><div class="phead__meta"><span>${esc(t('dcIntro'))}</span></div></div></div>` +
      `<div class="toolbar"><label class="bc-search"><bc-icon name="search" size="18"></bc-icon><input class="bc-input" type="search" placeholder="${esc(t('searchFiles'))}" value="${esc(DC.q)}" data-input="dcSearch" aria-label="${esc(t('searchFiles'))}"></label>` +
      `<span class="t3">${esc(t('nFiles', {n: list.length}))}</span><span class="toolbar__sp"></span>` +
      (list.length ? actBtn({label: list.every(a => DC.sel.has(a.id)) ? t('clearSelection') : t('selectAll'), icon: 'square-check', act: 'dcSelAll', variant: 'ghost', s: true}) : '') +
      `<div class="seg" role="group" aria-label="${esc(t('view'))}"><button data-act="dcViewMode" data-v="grid" aria-pressed="${grid}" aria-label="${esc(t('viewGrid'))}">${ic('layout-grid', 16)}</button><button data-act="dcViewMode" data-v="list" aria-pressed="${!grid}" aria-label="${esc(t('viewList'))}">${ic('list', 16)}</button></div></div>` +
      (!list.length ? emptyState('cloud', t('noResults'), t('dcEmpty')) : grid ? `<div class="dcgrid">${list.map(tile).join('')}</div>` :
        `<div class="bc-card tablewrap"><table class="bc-table"><thead><tr><th class="w0"></th><th>${esc(t('name'))}</th><th>${esc(t('type'))}</th><th class="num">${esc(t('size'))}</th><th>${esc(t('usedOn'))}</th><th>${esc(t('added'))}</th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>`) + float,
    after: () => { const s = $('[data-input=dcSearch]'); if (s && DC.focus) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); DC.focus = false; } }
  };
}
route('datacloud', dcView);

/** Delete files: they are removed from every Smartpage block that uses them. */
async function dcDelete(ids) {
  const pages = new Set(ids.flatMap(id => dataCloudIndex().get(id) || []));
  if (!await confirm1({title: ids.length > 1 ? t('deleteFilesN', {n: ids.length}) : t('deleteFile', {name: asset(ids[0]).name}), text: t('deleteFileText', {n: pages.size}), ok: t('delete')})) return false;
  await withUndo(t('filesDeleted', {n: ids.length}), () => {
    const gone = new Set(ids);
    for (const pid of pages) for (const s of page(pid).sections) for (const b of s.blocks) {
      if (b.type === 'asset') b.assets = b.assets.filter(a => !gone.has(a));
      if (b.type === 'image' && gone.has(b.asset)) b.asset = null;
    }
    ids.forEach(id => DC.sel.delete(id));
  });
  return true;
}
async function dcOpen(id) {
  const a = asset(id), pages = dataCloudIndex().get(id) || [];
  const editable = pages.every(pid => can('edit', pid));
  let draft = null;
  const r = await BCUI.modal({side: true, title: a.name, desc: `${a.ext.toUpperCase()} · ${fmtSize(a.size)}${a.w ? ` · ${a.w} × ${a.h} px` : ''}`,
    body: `<div class="form"><div class="lightbox dc-prev">${a.file ? `<img src="${esc(a.file)}" alt="">` : `<div class="lightbox__ph">${ic(kindIcon(a), 48)}</div>`}</div>` +
      field(t('fileName'), `<input class="bc-input" name="name" value="${esc(a.name)}"${editable ? '' : ' disabled'}>`) +
      field(t('description'), `<textarea class="bc-textarea" name="desc"${editable ? '' : ' disabled'}>${esc(L(a.desc))}</textarea>`) +
      field(t('tags'), `<input class="bc-input" name="tags" value="${esc((a.tags || []).join(', '))}"${editable ? '' : ' disabled'}>`, t('tagsCommaHint')) +
      `<div><div class="bc-label">${esc(t('usedOn'))}</div><div class="pnav" style="margin-top:4px">${pages.map(pid => `<a href="#/p/${pid}">${ic('bc-smartpage', 18)}<span>${esc(L(item(pid).name))}</span></a>`).join('')}</div></div>` +
      (editable ? '' : `<p class="pane__hint">${esc(t('dcReadOnly'))}</p>`) + '</div>',
    actions: [{label: t('delete'), value: 'delete', variant: 'danger-ghost', icon: 'trash-2', disabled: !editable}, {label: t('download'), value: 'dl', icon: 'download', disabled: !dataCloudCanDownload(id)}, {label: t('save'), value: 'save', variant: 'primary', disabled: !editable}],
    onOpen: (box, close) => box.addEventListener('click', e => { if (e.target.closest('a[href]')) close(null); }),
    beforeClose: (v, box) => { if (v === 'save') draft = {name: box.querySelector('[name=name]').value.trim() || a.name, desc: box.querySelector('[name=desc]').value, tags: box.querySelector('[name=tags]').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)}; return true; }});
  if (r === 'save' && draft) { Store.update(() => { a.name = draft.name; a.desc = setL(a.desc, draft.desc); a.tags = draft.tags; }); BCUI.toast(t('changesSaved')); }
  if (r === 'delete') dcDelete([id]);
  if (r === 'dl') ACT.download({dataset: {id}});
}
Object.assign(ACT, {
  dcOpen: el => dcOpen(el.dataset.id),
  dcSel: el => { DC.sel.has(el.dataset.id) ? DC.sel.delete(el.dataset.id) : DC.sel.add(el.dataset.id); render(); },
  dcSelAll: () => { const ids = [...$$('[data-change=dcSel]')].map(x => x.dataset.id); const all = ids.every(id => DC.sel.has(id)); ids.forEach(id => all ? DC.sel.delete(id) : DC.sel.add(id)); render(); },
  dcClear: () => { DC.sel.clear(); render(); },
  dcDeleteSel: () => dcDelete([...DC.sel]),
  dcDownloadSel: () => BCUI.toast(t('zipStarted', {n: DC.sel.size})),
  dcKind: el => { DC.kind = el.dataset.v; render(); },
  dcTag: el => { DC.tag = DC.tag === el.dataset.v ? '' : el.dataset.v; render(); },
  dcViewMode: el => Store.update(s => { s.ui.dcView = el.dataset.v; })
});
ON_INPUT.dcSearch = el => { DC.q = el.value; DC.focus = true; render(); };
