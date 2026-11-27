/* Module home – Home and folder browsing, selection + top action bar, create / rename / move / duplicate / tags / share / lock / delete.
   Item operations (renameItem, moveItems, …) are global: the smartpage module uses them too. */
'use strict';
const HOME = {sel: new Set(), q: '', menuFor: null};
const homeView = () => S.ui.homeView || 'grid';
const homeSort = () => S.ui.homeSort || 'name';
const visibleChildren = pid => children(pid).filter(i => visible(i));
function sortItems(list) {
  const by = homeSort();
  return [...list].sort((a, b) => (a.type === 'folder' ? 0 : 1) - (b.type === 'folder' ? 0 : 1) ||
    (by === 'updated' ? (b.updated || '').localeCompare(a.updated || '') : L(a.name).localeCompare(L(b.name), lang)));
}
const countLabel = it => { const n = visibleChildren(it.id).length; return n ? t('nItems', {n}) : t('emptyFolder'); };

/* ---------------- panel: folder tree */
function treeHTML(pid, depth, open, cur) {
  return sortItems(visibleChildren(pid).filter(i => i.type !== 'link')).map(it => {
    const kids = it.type === 'folder' && visibleChildren(it.id).some(k => k.type !== 'link');
    const isOpen = open.has(it.id);
    return `<div class="tree__row${it.id === cur ? ' is-active' : ''}" style="--d:${depth}">` +
      (kids ? `<button class="tree__tw${isOpen ? ' is-open' : ''}" data-act="treeToggle" data-id="${it.id}" aria-label="${esc(isOpen ? t('collapse') : t('expand'))}" aria-expanded="${isOpen}">${ic('chevron-right', 14)}</button>` : '<span class="tree__tw"></span>') +
      `<a href="#/${href(it)}"${it.id === cur ? ' aria-current="page"' : ''}>${ic(typeIcon(it), 18)}<span>${esc(L(it.name))}</span>${it.locked ? ic('lock', 14) : ''}</a></div>` +
      (kids && isOpen ? treeHTML(it.id, depth + 1, open, cur) : '');
  }).join('');
}
function homePanel(curId) {
  const open = new Set([...(S.ui.treeOpen || []), ...(curId ? ancestors(curId).map(a => a.id) : [])]);
  return `<div class="pnav"><a href="#/"${curId ? '' : ' class="is-active" aria-current="page"'}>${ic('house', 18)}<span>${esc(t('navHome'))}</span></a></div><div class="pnav__sep"></div>` +
    `<div class="panel__h">${esc(t('folders'))}</div><div class="tree">${treeHTML(null, 0, open, curId)}</div>`;
}

/* ---------------- cards / rows */
function cardMeta(it) {
  if (it.type === 'folder') return esc(countLabel(it));
  if (it.type === 'link') return esc(it.url.replace(/^https?:\/\//, ''));
  return `${statusBadge(it)}<span>${esc(fmtDate(it.updated))}</span>`;
}
function itemCard(it) {
  const sel = HOME.sel.has(it.id);
  const cover = it.cover && asset(it.cover) ? thumb(it.cover) : `<span class="card__ph">${ic(typeIcon(it), 40)}</span>`;
  const open = it.type === 'link' ? `data-act="openLink" data-id="${it.id}" href="#"` : `href="#/${href(it)}"`;
  return `<article class="card card--${it.type}${sel ? ' is-sel' : ''}">` +
    `<a class="card__hit" ${open} aria-label="${esc(L(it.name))}"></a>` +
    `<div class="card__cover">${cover}</div>` +
    `<label class="card__sel" title="${esc(t('select'))}"><input type="checkbox" class="bc-check" data-change="toggleSel" data-id="${it.id}"${sel ? ' checked' : ''} aria-label="${esc(t('select'))}: ${esc(L(it.name))}"></label>` +
    `<button class="bc-btn bc-btn--secondary bc-btn--icon bc-btn--s card__more" data-act="itemMenu" data-id="${it.id}" aria-label="${esc(t('moreActions'))}">${ic('ellipsis', 18)}</button>` +
    `<div class="card__body"><span class="card__name">${ic(typeIcon(it), 18)}<span>${esc(L(it.name))}</span>${it.locked ? `<span title="${esc(t('locked'))}">${ic('lock', 14)}</span>` : ''}</span>` +
    `<span class="card__meta">${cardMeta(it)}</span></div></article>`;
}
function itemRow(it) {
  const sel = HOME.sel.has(it.id);
  return `<tr class="${sel ? 'is-sel' : ''}"><td class="w0"><input type="checkbox" class="bc-check" data-change="toggleSel" data-id="${it.id}"${sel ? ' checked' : ''} aria-label="${esc(t('select'))}: ${esc(L(it.name))}"></td>` +
    `<td><a class="row__name" ${it.type === 'link' ? `data-act="openLink" data-id="${it.id}" href="#"` : `href="#/${href(it)}"`}>${ic(typeIcon(it), 18)}<span>${esc(L(it.name))}</span>${it.locked ? ic('lock', 14) : ''}</a></td>` +
    `<td class="t3">${esc(t('type_' + it.type))}</td><td>${it.type === 'page' ? statusBadge(it) : it.type === 'folder' ? `<span class="t3">${esc(countLabel(it))}</span>` : ''}</td>` +
    `<td class="t3">${esc(fmtDate(it.updated))} · ${esc(userName(it.by))}</td><td class="t3">${esc(levelLabel(levelOf(it.id)))}</td>` +
    `<td class="w0"><button class="bc-btn bc-btn--ghost bc-btn--icon bc-btn--s" data-act="itemMenu" data-id="${it.id}" aria-label="${esc(t('moreActions'))}">${ic('ellipsis', 18)}</button></td></tr>`;
}

/* ---------------- selection action bar (appears under the banner) */
function selectionBar() {
  const ids = [...HOME.sel].filter(id => item(id));
  if (!ids.length) return '';
  const all = a => ids.every(id => can(a, id));
  const firstWhy = a => { const id = ids.find(x => !can(a, x)); return id ? why(a, id) : ''; };
  return `<span class="actionbar__n">${esc(t('nSelected', {n: ids.length}))}</span>` +
    actBtn({label: t('share'), icon: 'share-2', act: 'selShare', ok: all('share'), reason: firstWhy('share'), s: true}) +
    actBtn({label: t('move'), icon: 'folder-input', act: 'selMove', ok: all('move'), reason: firstWhy('move'), s: true}) +
    actBtn({label: t('duplicate'), icon: 'copy', act: 'selDuplicate', ok: all('duplicate'), reason: firstWhy('duplicate'), s: true}) +
    actBtn({label: t('editTags'), icon: 'tag', act: 'selTags', ok: all('edit'), reason: firstWhy('edit'), s: true}) +
    actBtn({label: t('delete'), icon: 'trash-2', act: 'selDelete', ok: all('delete'), reason: firstWhy('delete'), s: true, variant: 'danger-ghost'}) +
    '<span class="actionbar__sp"></span>' + actBtn({label: t('clearSelection'), icon: 'x', act: 'selClear', variant: 'ghost', s: true});
}

/* ---------------- the view */
function browse(folderId) {
  const f = folderId ? item(folderId) : null;
  if (folderId && !f) return notFound();
  if (f && !visible(f)) return denied(t('noAccess'), t('noAccessText'));
  // drop selections that are not in this folder any more
  const here = new Set(visibleChildren(folderId).map(i => i.id));
  for (const id of HOME.sel) if (!here.has(id)) HOME.sel.delete(id);
  const q = HOME.q.trim().toLowerCase();
  const list = sortItems(visibleChildren(folderId)).filter(i => !q || L(i.name).toLowerCase().includes(q) || (i.tags || []).some(tg => tg.toLowerCase().includes(q)));
  const okCreate = canCreateIn(folderId);
  const title = f ? L(f.name) : L(S.brand.workspace);
  const grid = homeView() === 'grid';
  const allSel = list.length && list.every(i => HOME.sel.has(i.id));
  const body = !list.length ? (q ? emptyState('search', t('noResults'), t('noResultsText')) :
      emptyState('bc-folder', t('emptyFolder'), okCreate ? t('emptyFolderText') : '', okCreate ? actBtn({label: t('new'), icon: 'plus', act: 'newMenu', id: folderId || '', variant: 'primary'}) : '')) :
    grid ? `<div class="cards">${list.map(itemCard).join('')}</div>` :
      `<div class="bc-card tablewrap"><table class="bc-table"><thead><tr><th class="w0"><input type="checkbox" class="bc-check" data-change="selAll" data-id="${folderId || ''}"${allSel ? ' checked' : ''} aria-label="${esc(t('selectAll'))}"></th><th>${esc(t('name'))}</th><th>${esc(t('type'))}</th><th>${esc(t('state'))}</th><th>${esc(t('updated'))}</th><th>${esc(t('yourAccess'))}</th><th class="w0"></th></tr></thead><tbody>${list.map(itemRow).join('')}</tbody></table></div>`;
  return {
    area: 'home', title, crumbs: f ? itemCrumbs(f) : crumbsHome(), panel: homePanel(folderId), actionbar: selectionBar(),
    view: `<div class="phead"><div class="phead__t"><h1>${f ? ic('bc-folder', 28) : ''}${esc(title)}${f ? lockBadge(f) : ''}</h1>` +
      `<div class="phead__meta">${f ? `<span>${esc(countLabel(f))}</span><span>·</span><span>${esc(t('yourAccess'))}: ${esc(levelLabel(levelOf(f.id)))}</span>` : `<span>${esc(t('homeIntro'))}</span>`}</div></div>` +
      `<div class="phead__acts">${f ? actBtn({icon: 'ellipsis', act: 'itemMenu', id: f.id, variant: 'secondary', extra: `aria-label="${esc(t('moreActions'))}"`}) : ''}` +
      actBtn({label: t('new'), icon: 'plus', act: 'newMenu', id: folderId || '', variant: 'primary', ok: okCreate, reason: folderId ? why('create', folderId) : t('whyCapability')}) + '</div></div>' +
      `<div class="toolbar"><label class="bc-search"><bc-icon name="search" size="18"></bc-icon><input class="bc-input" type="search" placeholder="${esc(t('searchHere'))}" value="${esc(HOME.q)}" data-input="homeSearch" aria-label="${esc(t('searchHere'))}"></label>` +
      `<span class="toolbar__sp"></span>${grid && list.length ? actBtn({label: allSel ? t('clearSelection') : t('selectAll'), icon: allSel ? 'square' : 'square-check', act: 'selAllBtn', id: folderId || '', variant: 'ghost', s: true}) : ''}` +
      `<div class="seg" role="group" aria-label="${esc(t('sort'))}"><button data-act="homeSort" data-v="name" aria-pressed="${homeSort() === 'name'}">${esc(t('sortName'))}</button><button data-act="homeSort" data-v="updated" aria-pressed="${homeSort() === 'updated'}">${esc(t('sortUpdated'))}</button></div>` +
      `<div class="seg" role="group" aria-label="${esc(t('view'))}"><button data-act="homeView" data-v="grid" aria-pressed="${grid}" aria-label="${esc(t('viewGrid'))}">${ic('layout-grid', 16)}</button><button data-act="homeView" data-v="list" aria-pressed="${!grid}" aria-label="${esc(t('viewList'))}">${ic('list', 16)}</button></div></div>` + body,
    after: () => { const s = $('[data-input=homeSearch]'); if (s && HOME.focusSearch) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); HOME.focusSearch = false; } }
  };
}
route('', () => browse(null));
route('home', () => browse(null));
route('f/:id', p => browse(p.id));

/* ---------------- item operations (global) */
function itemMenuItems(id) {
  const it = item(id), o = (label, icon, value, action) => ({label, icon, value, disabled: action ? !can(action, id) : false, why: action && !can(action, id) ? why(action, id) : ''});
  return [
    it.type === 'link' ? o(t('openLink'), 'external-link', 'open') : o(t('open'), it.type === 'folder' ? 'bc-folder' : 'bc-smartpage', 'open', 'open'),
    ...(it.type === 'page' ? [o(t('edit'), 'pencil', 'edit', 'edit')] : []),
    '-', o(t('rename'), 'pencil', 'rename', 'rename'), o(t('move'), 'folder-input', 'move', 'move'), o(t('duplicate'), 'copy', 'duplicate', 'duplicate'),
    o(t('editTags'), 'tag', 'tags', 'edit'), o(t('share'), 'share-2', 'share', 'share'),
    o(it.locked ? t('unlock') : t('lock'), it.locked ? 'lock-open' : 'lock', 'lock', 'lock'),
    '-', {...o(t('delete'), 'trash-2', 'delete', 'delete'), danger: true}
  ];
}
async function itemMenu(anchor, id) {
  const v = await BCUI.menu(anchor, itemMenuItems(id));
  const it = item(id);
  if (!v || !it) return;
  ({open: () => it.type === 'link' ? openLink(it) : go(href(it)), edit: () => go('p/' + id + '/edit'), rename: () => renameItem(id), move: () => moveItems([id]),
    duplicate: () => duplicateItems([id]), tags: () => tagItems([id]), share: () => shareItems([id]), lock: () => toggleLock(id), delete: () => deleteItems([id])})[v]();
}
function openLink(it) { BCUI.toast(t('linkOpensExternally', {url: it.url})); }
async function renameItem(id) {
  const it = item(id);
  const v = await prompt1({title: t('rename'), label: t('name'), value: L(it.name)});
  if (v) Store.update(() => { it.name = setL(it.name, v); it.updated = nowIso(); it.by = me().id; log('edit', id); });
}
async function toggleLock(id) {
  const it = item(id);
  Store.update(() => { it.locked = !it.locked; log(it.locked ? 'lock' : 'unlock', id); });
  BCUI.toast(it.locked ? t('lockedToast') : t('unlockedToast'));
}
function folderPicker(exclude, cur) {
  const banned = new Set(exclude.flatMap(id => [id, ...descendants(id).map(d => d.id)]));
  const opt = (id, label, depth, ok, icon) => `<label class="bc-choice picker__row" style="--d:${depth}"><input class="bc-radio" type="radio" name="to" value="${id}"${ok ? '' : ' disabled'}${id === cur ? ' checked' : ''}>${ic(icon, 18)}<span>${esc(label)}${!ok ? `<small>${esc(id === '' && !cap('createRoot') ? t('whyCapability') : banned.has(id) ? t('cannotMoveInside') : t('whyLevel', {level: levelLabel('edit')}))}</small>` : ''}</span></label>`;
  const walk = (pid, d) => sortItems(visibleChildren(pid).filter(i => i.type === 'folder')).map(f => opt(f.id, L(f.name), d, !banned.has(f.id) && can('create', f.id), 'bc-folder') + walk(f.id, d + 1)).join('');
  return `<div class="choice-list picker">${opt('', t('navHome'), 0, cap('createRoot'), 'house')}${walk(null, 1)}</div>`;
}
async function moveItems(ids) {
  let to = null;
  const cur = item(ids[0]).parent || '';
  const r = await BCUI.modal({title: ids.length > 1 ? t('moveN', {n: ids.length}) : t('moveItem', {name: L(item(ids[0]).name)}), body: folderPicker(ids, cur),
    actions: [{label: t('cancel'), value: 'cancel'}, {label: t('move'), value: 'ok', variant: 'primary'}],
    beforeClose: (v, box) => { if (v !== 'ok') return true; const c = box.querySelector('[name=to]:checked'); to = c ? c.value : null; return to !== null; }});
  if (r !== 'ok' || to === null || to === cur) return;
  const dest = to ? L(item(to).name) : t('navHome');
  await withUndo(t('movedTo', {n: ids.length, dest}), () => ids.forEach(id => { const it = item(id); it.parent = to || null; it.updated = nowIso(); log('move', id); }));
  HOME.sel.clear();
}
function cloneTree(id, parent, suffix) {
  const src = item(id), nid = uid(src.type[0]);
  const copy = {...structuredClone(src), id: nid, parent, updated: nowIso(), by: me().id, locked: false};
  if (suffix) copy.name = Object.fromEntries(Object.entries(src.name).map(([k, v]) => [k, `${v} (${BC.i18n[k].copySuffix})`]));
  if (src.type === 'page') { copy.status = 'draft'; C().pages[nid] = structuredClone(page(id)); }
  C().items.push(copy);
  children(id).forEach(ch => cloneTree(ch.id, nid, false));
  return nid;
}
async function duplicateItems(ids) {
  const parent = item(ids[0]).parent || null;
  if (!canCreateIn(parent)) { BCUI.toast(parent ? why('create', parent) : t('whyCapability')); return; }
  await withUndo(t('duplicated', {n: ids.length}), () => ids.forEach(id => { cloneTree(id, item(id).parent || null, true); log('create', id); }));
}
async function deleteItems(ids) {
  const n = ids.reduce((s, id) => s + 1 + descendants(id).length, 0);
  if (!await confirm1({title: ids.length > 1 ? t('deleteN', {n: ids.length}) : t('deleteItem', {name: L(item(ids[0]).name)}), text: n > ids.length ? t('deleteWithContent', {n: n - ids.length}) : t('deleteToTrash'), ok: t('moveToTrash')})) return;
  await withUndo(t('movedToTrash', {n: ids.length}), () => ids.forEach(id => trashItem(id)));
  HOME.sel.clear();
}
function trashItem(id) {
  const it = item(id); if (!it) return;
  const all = [it, ...descendants(id)];
  C().trash.unshift({id: uid('tr'), at: nowIso(), by: me().id, root: id, items: all, pages: Object.fromEntries(all.filter(x => x.type === 'page').map(x => [x.id, page(x.id)]))});
  const gone = new Set(all.map(x => x.id));
  C().items = C().items.filter(x => !gone.has(x.id));
  all.forEach(x => delete C().pages[x.id]);
  log('delete', id, {name: it.name});
}
async function tagItems(ids) {
  const single = ids.length === 1, it = item(ids[0]);
  let tags = single ? [...(it.tags || [])] : [];
  const known = [...new Set(C().items.flatMap(i => i.tags || []))].sort();
  const draw = box => {
    box.querySelector('.tagbox__list').innerHTML = tags.map((tg, i) => `<span class="bc-tag">${esc(tg)}<button type="button" data-rm="${i}" aria-label="${esc(t('remove'))} ${esc(tg)}">${ic('x', 12)}</button></span>`).join('') || `<span class="t3">${esc(t('noTags'))}</span>`;
    box.querySelector('.tagbox__sugg').innerHTML = known.filter(k => !tags.includes(k)).slice(0, 12).map(k => `<button type="button" class="chip" data-add="${esc(k)}">${ic('plus', 14)}${esc(k)}</button>`).join('');
  };
  const r = await BCUI.modal({title: single ? t('tagsOf', {name: L(it.name)}) : t('addTagsN', {n: ids.length}),
    body: `<div class="form"><div class="tagbox__list chips"></div>${field(t('addTag'), `<input class="bc-input" name="tag" placeholder="${esc(t('addTagHint'))}">`)}<div><div class="bc-label">${esc(t('usedTags'))}</div><div class="tagbox__sugg chips" style="margin-top:8px"></div></div></div>`,
    actions: [{label: t('cancel'), value: 'cancel'}, {label: t('save'), value: 'ok', variant: 'primary'}],
    onOpen: box => {
      draw(box);
      const inp = box.querySelector('[name=tag]');
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); e.stopPropagation(); const v = inp.value.trim().toLowerCase(); if (!tags.includes(v)) tags.push(v); inp.value = ''; draw(box); } });
      box.addEventListener('click', e => { const rm = e.target.closest('[data-rm]'), add = e.target.closest('[data-add]'); if (rm) tags.splice(+rm.dataset.rm, 1); if (add) tags.push(add.dataset.add); if (rm || add) draw(box); });
    },
    beforeClose: (v, box) => { const inp = box.querySelector('[name=tag]'); if (v === 'ok' && inp.value.trim()) { const x = inp.value.trim().toLowerCase(); if (!tags.includes(x)) tags.push(x); } return true; }});
  if (r !== 'ok') return;
  Store.update(() => ids.forEach(id => { const x = item(id); x.tags = single ? tags : [...new Set([...(x.tags || []), ...tags])]; }));
  BCUI.toast(t('tagsSaved'));
}
async function shareItems(ids) {
  const slug = S.brand.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '');
  const code = Math.random().toString(36).slice(2, 10);
  const url = `https://brandcloud.pro/${slug}/s/${code}`;
  const dl = ids.every(id => can('download', id));
  const r = await BCUI.modal({title: ids.length > 1 ? t('shareN', {n: ids.length}) : t('shareItem', {name: L(item(ids[0]).name)}), desc: t('shareHint'),
    body: `<div class="form">${field(t('shareLink'), `<div class="sharelink"><input class="bc-input" readonly value="${esc(url)}"><button type="button" class="bc-btn bc-btn--secondary" data-copy>${ic('copy', 18)}${esc(t('copy'))}</button></div>`)}` +
      `<label class="bc-choice"><input type="checkbox" class="bc-toggle" name="dl"${dl ? ' checked' : ' disabled'}><span>${esc(t('allowDownload'))}${dl ? '' : `<small>${esc(t('whyLevel', {level: levelLabel('download')}))}</small>`}</span></label>` +
      field(t('expires'), `<select class="bc-select" name="exp"><option value="7">${esc(t('days', {n: 7}))}</option><option value="30" selected>${esc(t('days', {n: 30}))}</option><option value="0">${esc(t('never'))}</option></select>`) + '</div>',
    actions: [{label: t('cancel'), value: 'cancel'}, {label: t('createLink'), value: 'ok', variant: 'primary'}],
    onOpen: box => box.querySelector('[data-copy]').addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(url); BCUI.toast(t('linkCopied')); })});
  if (r !== 'ok') return;
  Store.update(() => { (C().shares = C().shares || []).push({url, items: ids, at: nowIso(), by: me().id}); ids.forEach(id => log('share', id)); });
  navigator.clipboard && navigator.clipboard.writeText(url).catch(() => {});
  BCUI.toast(t('linkCreated'));
}
async function newItem(parentId, type) {
  if (!canCreateIn(parentId)) return;
  let name = '', url = '';
  const r = await BCUI.modal({title: t('new_' + type), size: 's',
    body: `<form class="form">${field(t('name'), `<input class="bc-input" name="n" required autofocus>`)}${type === 'link' ? field(t('url'), `<input class="bc-input" name="u" type="url" placeholder="https://" required>`) : ''}</form>`,
    actions: [{label: t('cancel'), value: 'cancel'}, {label: t('create'), value: 'ok', variant: 'primary'}],
    beforeClose: (v, box) => { if (v !== 'ok') return true; name = box.querySelector('[name=n]').value.trim(); url = type === 'link' ? box.querySelector('[name=u]').value.trim() : ''; return !!name && (type !== 'link' || /^https?:\/\/.+/.test(url)); }});
  if (r !== 'ok') return;
  const id = uid(type[0]);
  Store.update(() => {
    const it = {id, type, parent: parentId || null, name: both(name), tags: [], grants: {}, updated: nowIso(), by: me().id};
    if (type === 'page') { it.status = 'draft'; C().pages[id] = {sections: [{id: uid('s'), title: null, blocks: [{id: uid('b'), type: 'h1', text: both(name)}]}]}; }
    if (type === 'link') it.url = url;
    // creating on Home without team grants would hide it from everyone but full-access roles: give the creator's teams Edit
    if (!parentId) me().teams.forEach(tid => { it.grants[tid] = 'edit'; });
    C().items.push(it); log('create', id);
  }, {silent: true});
  if (type === 'page') go('p/' + id + '/edit'); else if (type === 'folder') go('f/' + id); else render();
  BCUI.toast(t('created_' + type));
}

/* ---------------- actions */
Object.assign(ACT, {
  itemMenu: el => itemMenu(el, el.dataset.id),
  openLink: el => openLink(item(el.dataset.id)),
  newMenu: async el => {
    const pid = el.dataset.id || null;
    const v = await BCUI.menu(el, [{label: t('type_folder'), icon: 'bc-folder', value: 'folder'}, {label: t('type_page'), icon: 'bc-smartpage', value: 'page'}, {label: t('type_link'), icon: 'link', value: 'link'}]);
    if (v) newItem(pid, v);
  },
  toggleSel: el => { const id = el.dataset.id; HOME.sel.has(id) ? HOME.sel.delete(id) : HOME.sel.add(id); render(); },
  selAll: el => { const ids = visibleChildren(el.dataset.id || null).map(i => i.id); const all = ids.every(id => HOME.sel.has(id)); ids.forEach(id => all ? HOME.sel.delete(id) : HOME.sel.add(id)); render(); },
  selAllBtn: el => ACT.selAll(el),
  selClear: () => { HOME.sel.clear(); render(); },
  selShare: () => shareItems([...HOME.sel]),
  selMove: () => moveItems([...HOME.sel]),
  selDuplicate: () => duplicateItems([...HOME.sel]),
  selTags: () => tagItems([...HOME.sel]),
  selDelete: () => deleteItems([...HOME.sel]),
  homeView: el => Store.update(s => { s.ui.homeView = el.dataset.v; }),
  homeSort: el => Store.update(s => { s.ui.homeSort = el.dataset.v; }),
  treeToggle: el => Store.update(s => { const o = new Set(s.ui.treeOpen || []); o.has(el.dataset.id) ? o.delete(el.dataset.id) : o.add(el.dataset.id); s.ui.treeOpen = [...o]; })
});
ON_INPUT.homeSearch = el => { HOME.q = el.value; HOME.focusSearch = true; render(); };
addEventListener('hashchange', () => { HOME.q = ''; });
