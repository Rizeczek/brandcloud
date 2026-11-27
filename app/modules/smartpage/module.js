/* Module smartpage – preview (#/p/<id>) and click-to-add editor (#/p/<id>/edit).
   Sections are mandatory white cards; blocks live inside them. Right Actions pane = global Smartpage operations only;
   block-level operations use the floating block toolbar. Assets added here appear in Data Cloud automatically. */
'use strict';
const BLOCKS = [
  {type: 'h1', icon: 'heading-1'}, {type: 'h2', icon: 'heading-2'}, {type: 'h3', icon: 'heading-3'}, {type: 'p', icon: 'pilcrow'},
  {type: 'asset', icon: 'file'}, {type: 'image', icon: 'image'}, {type: 'colors', icon: 'palette'}, {type: 'font', icon: 'type'}, {type: 'divider', icon: 'minus'}
];
const SP = {saveT: 0};
const brandColor = id => S.brand.colors.find(c => c.id === id);
const brandFont = id => S.brand.fonts.find(f => f.id === id);
const kindIcon = a => ({pdf: 'file-text', font: 'type', video: 'file-video', zip: 'file-archive'}[a.kind] || 'file-image');

/* ---------------- blocks */
function fileTile(a, pid, edit, bid) {
  if (!a) return '';
  const dl = can('download', pid);
  return `<div class="ftile"><button class="ftile__thumb" data-act="previewAsset" data-id="${a.id}" data-page="${pid}" aria-label="${esc(t('preview'))}: ${esc(a.name)}">${a.file ? `<img src="${esc(a.file)}" alt="" loading="lazy">` : ic(kindIcon(a), 32)}<span class="ftile__ext">${esc(a.ext.toUpperCase())}</span></button>` +
    `<div class="ftile__b"><span class="ftile__n" title="${esc(a.name)}">${esc(a.name)}</span><span class="ftile__m">${esc(fmtSize(a.size))}</span></div>` +
    (edit ? `<button class="bc-btn bc-btn--ghost bc-btn--icon bc-btn--s" data-act="removeAsset" data-id="${a.id}" data-blk="${bid}" aria-label="${esc(t('remove'))}">${ic('x', 16)}</button>` :
      `<a class="bc-btn bc-btn--ghost bc-btn--icon bc-btn--s"${dl ? ` href="${esc(a.file)}" download="${esc(a.name)}" data-act="download" data-id="${a.id}"` : ` aria-disabled="true" title="${esc(why('download', pid))}"`} aria-label="${esc(t('download'))}">${ic('download', 16)}</a>`) + '</div>';
}
function blockHTML(b, pid, edit) {
  const ce = (tag, cls, ph) => `<${tag} class="${cls}"${edit ? ` contenteditable="true" data-input="blockText" data-blk="${b.id}" data-ph="${esc(ph)}"` : ''}>${esc(L(b.text))}</${tag}>`;
  switch (b.type) {
    case 'h1': return ce('h2', 'sp-h1', t('blk_h1'));
    case 'h2': return ce('h3', 'sp-h2', t('blk_h2'));
    case 'h3': return ce('h4', 'sp-h3', t('blk_h3'));
    case 'p': return ce('p', 'sp-p', t('blkPlaceholderP'));
    case 'divider': return '<hr class="sp-hr">';
    case 'colors': return `<div class="swatches">${(b.colors || []).map(brandColor).filter(Boolean).map(c => `<button class="swatch" data-act="copyColor" data-v="${esc(c.hex)}" title="${esc(t('copyHex'))}"><span class="swatch__c" style="background:${esc(c.hex)}"></span><span class="swatch__b"><strong>${esc(L(c.name))}</strong><code>${esc(c.hex)}</code><small>RGB ${esc(c.rgb)} · CMYK ${esc(c.cmyk)}${c.pantone && c.pantone !== '–' ? ' · ' + esc(c.pantone) : ''}</small></span></button>`).join('')}</div>`;
    case 'font': { const f = brandFont(b.font) || S.brand.fonts[0]; return `<div class="fontblk"><div class="fontblk__s" style="font-family:'${esc(f.family)}',serif">Aa</div><div><strong>${esc(f.family)}</strong><small>${esc(L(f.role))} · ${f.weights.join(', ')}</small><p style="font-family:'${esc(f.family)}',serif">${esc(L(f.sample))}</p></div>${edit ? actBtn({label: t('changeFont'), icon: 'type', act: 'pickFont', id: b.id, s: true}) : ''}</div>`; }
    case 'image': { const a = asset(b.asset); return `<figure class="sp-img">${a ? `<button data-act="previewAsset" data-id="${a.id}" data-page="${pid}" aria-label="${esc(t('preview'))}: ${esc(a.name)}"><img src="${esc(a.file)}" alt=""></button>` : `<div class="sp-img__ph">${ic('image', 32)}</div>`}${edit ? `<div class="sp-img__edit">${actBtn({label: a ? t('replaceImage') : t('chooseImage'), icon: 'image', act: 'pickImage', id: b.id, s: true})}</div>` : ''}</figure>`; }
    case 'asset': return `<div class="ftiles">${(b.assets || []).map(id => fileTile(asset(id), pid, edit, b.id)).join('')}${edit ? `<button class="ftile ftile--add" data-act="addAssets" data-id="${b.id}">${ic('plus', 24)}<span>${esc(t('addFiles'))}</span></button>` : ''}${!edit && !(b.assets || []).length ? `<p class="t3">${esc(t('noFiles'))}</p>` : ''}</div>`;
  }
  return '';
}
const insertRow = (sid, idx) => `<div class="sp-ins"><button class="sp-ins__b" data-act="insertBlock" data-sec="${sid}" data-i="${idx}" aria-label="${esc(t('addBlock'))}">${ic('plus', 16)}<span>${esc(t('addBlock'))}</span></button></div>`;
function sectionHTML(s, si, n, pid, edit) {
  const blocks = s.blocks.map((b, i) => (edit ? insertRow(s.id, i) : '') +
    `<div class="sp-blk sp-blk--${b.type}" data-blk="${b.id}">${blockHTML(b, pid, edit)}` +
    (edit ? `<div class="sp-blk__bar" role="toolbar" aria-label="${esc(t('blockActions'))}">` +
      `<button class="bc-btn bc-btn--ghost bc-btn--icon bc-btn--s" data-act="blockUp" data-id="${b.id}" aria-label="${esc(t('moveUp'))}"${i === 0 ? ' disabled' : ''}>${ic('arrow-up', 16)}</button>` +
      `<button class="bc-btn bc-btn--ghost bc-btn--icon bc-btn--s" data-act="blockDown" data-id="${b.id}" aria-label="${esc(t('moveDown'))}"${i === s.blocks.length - 1 ? ' disabled' : ''}>${ic('arrow-down', 16)}</button>` +
      `<button class="bc-btn bc-btn--ghost bc-btn--icon bc-btn--s" data-act="blockDelete" data-id="${b.id}" aria-label="${esc(t('deleteBlock'))}">${ic('trash-2', 16)}</button></div>` : '') + '</div>').join('') + (edit ? insertRow(s.id, s.blocks.length) : '');
  const title = edit ? `<h3 class="sp-sec__t" contenteditable="true" data-input="sectionTitle" data-sec="${s.id}" data-ph="${esc(t('sectionTitlePh'))}">${esc(L(s.title))}</h3>` : s.title && L(s.title) ? `<h3 class="sp-sec__t">${esc(L(s.title))}</h3>` : '';
  return `<section class="sp-sec" id="${s.id}">${edit ? `<div class="sp-sec__bar">${actBtn({icon: 'arrow-up', act: 'sectionUp', id: s.id, variant: 'ghost', s: true, ok: si > 0, extra: `aria-label="${esc(t('moveUp'))}"`})}${actBtn({icon: 'arrow-down', act: 'sectionDown', id: s.id, variant: 'ghost', s: true, ok: si < n - 1, extra: `aria-label="${esc(t('moveDown'))}"`})}${actBtn({icon: 'trash-2', act: 'sectionDelete', id: s.id, variant: 'ghost', s: true, ok: n > 1, reason: t('lastSection'), extra: `aria-label="${esc(t('deleteSection'))}"`})}</div>` : ''}${title}${blocks || (edit ? '' : `<p class="t3">${esc(t('emptySection'))}</p>`)}</section>`;
}

/* ---------------- actions pane (global Smartpage operations only) */
function actionsPane(it, edit) {
  const id = it.id, b = o => actBtn({...o, id, s: false, extra: 'data-pane="1"'});
  const status = `<div class="pane__status">${statusBadge(it)}${lockBadge(it)}</div>`;
  if (edit) return `<aside class="pane" aria-label="${esc(t('pageActions'))}">${status}` +
    b({label: t('done'), icon: 'check', act: 'editDone', variant: 'primary'}) + b({label: t('addSection'), icon: 'plus', act: 'addSection'}) +
    `<p class="pane__hint">${esc(t('editHint'))}</p></aside>`;
  const st = it.status;
  const approver = cap('approve'), canSubmit = can('submit', id);
  const review = st === 'pending' && approver;   // the approver's main task on a pending page is the decision
  return `<aside class="pane" aria-label="${esc(t('pageActions'))}">${status}` +
    (review ? b({label: t('approve'), icon: 'circle-check', act: 'approvePage', variant: 'primary'}) + b({label: t('reject'), icon: 'circle-x', act: 'rejectPage', variant: 'danger-ghost'}) + '<div class="pane__sep"></div>' : '') +
    b({label: t('edit'), icon: 'pencil', act: 'editPage', variant: review ? 'secondary' : 'primary', ok: can('edit', id), reason: why('edit', id)}) +
    (st === 'draft' || st === 'rejected' ? b({label: t('submit'), icon: 'send', act: 'submitPage', ok: canSubmit, reason: why('submit', id)}) : '') +
    (st === 'pending' && !approver ? `<p class="pane__hint">${esc(t('pendingHint'))}</p>` : '') +
    (st === 'rejected' && it.rejectNote ? `<p class="pane__note">${ic('message-square', 16)}<span><strong>${esc(userName(it.rejectedBy))}:</strong> ${esc(it.rejectNote)}</span></p>` : '') +
    '<div class="pane__sep"></div>' +
    b({label: t('share'), icon: 'share-2', act: 'pageShare', ok: can('share', id), reason: why('share', id), variant: 'ghost'}) +
    b({label: t('duplicate'), icon: 'copy', act: 'pageDuplicate', ok: can('duplicate', id) && canCreateIn(it.parent), reason: why('create', it.parent || id), variant: 'ghost'}) +
    b({label: t('move'), icon: 'folder-input', act: 'pageMove', ok: can('move', id), reason: why('move', id), variant: 'ghost'}) +
    b({label: it.locked ? t('unlock') : t('lock'), icon: it.locked ? 'lock-open' : 'lock', act: 'pageLock', ok: can('lock', id), reason: why('lock', id), variant: 'ghost'}) +
    b({label: t('delete'), icon: 'trash-2', act: 'pageDelete', ok: can('delete', id), reason: why('delete', id), variant: 'danger-ghost'}) +
    `<div class="pane__sep"></div><dl class="pane__meta"><dt>${esc(t('updated'))}</dt><dd>${esc(fmtDate(it.updated))} · ${esc(userName(it.by))}</dd><dt>${esc(t('yourAccess'))}</dt><dd>${esc(levelLabel(levelOf(id)))}</dd>${(it.tags || []).length ? `<dt>${esc(t('tags'))}</dt><dd class="chips">${it.tags.map(tg => `<span class="bc-tag">${esc(tg)}</span>`).join('')}</dd>` : ''}</dl></aside>`;
}

function pageView(id, edit) {
  const it = item(id), pg = page(id);
  if (!it || it.type !== 'page' || !pg) return notFound();
  if (!visible(it)) return denied(t('noAccess'), t('noAccessText'));
  if (edit && !can('edit', id)) { setTimeout(() => go('p/' + id), 0); return {area: 'home', view: ''}; }
  return {
    area: 'home', mode: edit ? 'edit' : '', title: L(it.name), crumbs: itemCrumbs(it), panel: homePanel(id),
    view: `<div class="sp${edit ? ' sp--edit' : ''}"><div class="sp__content">${pg.sections.map((s, i) => sectionHTML(s, i, pg.sections.length, id, edit)).join('')}` +
      (edit ? `<button class="sp-addsec" data-act="addSection" data-id="${id}">${ic('plus', 18)}<span>${esc(t('addSection'))}</span></button>` : '') + `</div>${actionsPane(it, edit)}</div>`
  };
}
route('p/:id', p => pageView(p.id, false));
route('p/:id/edit', p => pageView(p.id, true));

/* ---------------- editing helpers */
const curPage = () => { const m = curPath().match(/^p\/([^/]+)/); return m ? m[1] : null; };
function findBlock(bid) { const pg = page(curPage()); if (!pg) return {}; for (const s of pg.sections) { const i = s.blocks.findIndex(b => b.id === bid); if (i >= 0) return {s, i, b: s.blocks[i], pg}; } return {}; }
const touch = () => { const it = item(curPage()); if (it) { it.updated = nowIso(); it.by = me().id; } };
function editPage(fn) { Store.update(s => { fn(page(curPage())); touch(); }); }
async function pickAssets({multi, kind}) {
  let picked = [];
  const list = C().assets.filter(a => !kind || a.kind === kind);
  const r = await BCUI.modal({title: multi ? t('addFiles') : t('chooseImage'), size: 'l',
    body: `<div class="form"><div class="upl"><label class="bc-btn bc-btn--secondary">${ic('upload', 18)}<span>${esc(t('uploadFromComputer'))}</span><input type="file" hidden ${multi ? 'multiple' : ''} accept="${kind === 'image' ? 'image/*' : '*/*'}" data-upl></label><span class="t3">${esc(t('uploadHint'))}</span></div>` +
      `<label class="bc-search"><bc-icon name="search" size="18"></bc-icon><input class="bc-input" type="search" placeholder="${esc(t('searchFiles'))}" data-q></label>` +
      `<div class="pick">${list.map(a => `<label class="pick__i" data-name="${esc(a.name.toLowerCase())}"><input type="${multi ? 'checkbox' : 'radio'}" class="${multi ? 'bc-check' : 'bc-radio'}" name="a" value="${a.id}"><span class="pick__t">${a.file ? `<img src="${esc(a.file)}" alt="" loading="lazy">` : ic(kindIcon(a), 28)}</span><span class="pick__n">${esc(a.name)}</span></label>`).join('')}</div></div>`,
    actions: [{label: t('cancel'), value: 'cancel'}, {label: multi ? t('add') : t('choose'), value: 'ok', variant: 'primary'}],
    onOpen: (box, close) => {
      box.querySelector('[data-q]').addEventListener('input', e => { const q = e.target.value.toLowerCase(); box.querySelectorAll('.pick__i').forEach(l => { l.hidden = q && !l.dataset.name.includes(q); }); });
      box.querySelector('[data-upl]').addEventListener('change', async e => { picked = await Promise.all([...e.target.files].map(uploadFile)); close('uploaded'); });
    },
    beforeClose: (v, box) => { if (v === 'ok') picked = [...box.querySelectorAll('[name=a]:checked')].map(x => x.value); return true; }});
  return r === 'ok' || r === 'uploaded' ? picked : [];
}
/** Uploaded files: images are downscaled into a data URL (fits the session store); other files keep only name/size. */
function uploadFile(file) {
  return new Promise(res => {
    const id = uid('a'), ext = (file.name.split('.').pop() || '').toLowerCase();
    const base = {id, name: file.name, ext, size: file.size, tags: [], created: nowIso().slice(0, 10), by: me().id, desc: both(''), uploaded: true};
    const done = extra => { Store.update(s => s.content.assets.push({...base, ...extra}), {silent: true}); res(id); };
    if (!file.type.startsWith('image/')) return done({kind: ext === 'pdf' ? 'pdf' : ['ttf', 'otf', 'woff', 'woff2', 'zip'].includes(ext) ? 'font' : 'file', file: null, w: 0, h: 0});
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      done({kind: 'image', file: c.toDataURL('image/jpeg', .82), w: img.width, h: img.height});
    };
    img.onerror = () => done({kind: 'file', file: null, w: 0, h: 0});
    img.src = url;
  });
}
function newBlock(type) {
  const b = {id: uid('b'), type};
  if (['h1', 'h2', 'h3', 'p'].includes(type)) b.text = {cs: '', en: ''};
  if (type === 'asset') b.assets = [];
  if (type === 'colors') b.colors = S.brand.colors.map(c => c.id);
  if (type === 'font') b.font = S.brand.fonts[0].id;
  if (type === 'image') b.asset = null;
  return b;
}
function moveIn(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }

/* ---------------- approval flow */
async function setStatus(id, status, extra = {}) {
  const it = item(id);
  Store.update(() => { Object.assign(it, {status}, extra); log({pending: 'submit', approved: 'approve', rejected: 'reject'}[status], id); });
}

/* ---------------- actions */
Object.assign(ACT, {
  editPage: el => go('p/' + el.dataset.id + '/edit'),
  editDone: el => { go('p/' + el.dataset.id); BCUI.toast(t('changesSaved')); },
  submitPage: el => { setStatus(el.dataset.id, 'pending', {submittedBy: me().id, rejectNote: ''}); BCUI.toast(t('submittedToast')); },
  approvePage: el => { setStatus(el.dataset.id, 'approved', {approvedBy: me().id}); BCUI.toast(t('approvedToast')); },
  rejectPage: async el => {
    const note = await prompt1({title: t('reject'), label: t('rejectReason'), ok: t('reject')});
    if (note) { setStatus(el.dataset.id, 'rejected', {rejectNote: note, rejectedBy: me().id}); BCUI.toast(t('rejectedToast')); }
  },
  pageShare: el => shareItems([el.dataset.id]),
  pageDuplicate: el => duplicateItems([el.dataset.id]),
  pageMove: el => moveItems([el.dataset.id]),
  pageLock: el => toggleLock(el.dataset.id),
  pageDelete: async el => { const it = item(el.dataset.id), back = it.parent ? 'f/' + it.parent : ''; await deleteItems([it.id]); if (!item(it.id)) go(back); },
  previewAsset: el => previewAsset(el.dataset.id, el.dataset.page),
  download: (el, e) => { const a = asset(el.dataset.id); if (a && a.file) { const x = document.createElement('a'); x.href = a.file; x.download = a.name; x.click(); } log('download', curPage(), {asset: el.dataset.id}); Store.save(); BCUI.toast(t('downloadStarted', {name: a ? a.name : ''})); },
  copyColor: el => { navigator.clipboard && navigator.clipboard.writeText(el.dataset.v); BCUI.toast(t('copied', {v: el.dataset.v})); },
  insertBlock: async el => {
    const v = await BCUI.menu(el, BLOCKS.map(b => ({label: t('blk_' + b.type), icon: b.icon, value: b.type})));
    if (!v) return;
    const b = newBlock(v);
    Store.update(() => { page(curPage()).sections.find(s => s.id === el.dataset.sec).blocks.splice(+el.dataset.i, 0, b); touch(); }, {silent: true});
    renderNow();
    const x = $(`[data-blk="${b.id}"][contenteditable]`);
    if (x) x.focus(); else if (v === 'asset') ACT.addAssets({dataset: {id: b.id}}); else if (v === 'image') ACT.pickImage({dataset: {id: b.id}});
  },
  blockUp: el => { const {s, i} = findBlock(el.dataset.id); if (s) editPage(() => moveIn(s.blocks, i, -1)); },
  blockDown: el => { const {s, i} = findBlock(el.dataset.id); if (s) editPage(() => moveIn(s.blocks, i, 1)); },
  blockDelete: el => { const {s, i} = findBlock(el.dataset.id); if (!s) return; withUndo(t('blockDeleted'), () => { s.blocks.splice(i, 1); touch(); }); },
  addSection: () => { const sec = {id: uid('s'), title: {cs: '', en: ''}, blocks: [newBlock('p')]}; Store.update(() => { page(curPage()).sections.push(sec); touch(); }, {silent: true}); renderNow(); const x = $(`[data-sec="${sec.id}"][contenteditable]`); if (x) { x.scrollIntoView({block: 'center'}); x.focus(); } },
  sectionUp: el => editPage(pg => moveIn(pg.sections, pg.sections.findIndex(s => s.id === el.dataset.id), -1)),
  sectionDown: el => editPage(pg => moveIn(pg.sections, pg.sections.findIndex(s => s.id === el.dataset.id), 1)),
  sectionDelete: el => withUndo(t('sectionDeleted'), () => { const pg = page(curPage()); pg.sections = pg.sections.filter(s => s.id !== el.dataset.id); touch(); }),
  addAssets: async el => { const {b} = findBlock(el.dataset.id); if (!b) return; const ids = await pickAssets({multi: true}); if (ids.length) editPage(() => { b.assets = [...new Set([...b.assets, ...ids])]; }); },
  removeAsset: el => { const {b} = findBlock(el.dataset.blk); if (b) editPage(() => { b.assets = b.assets.filter(x => x !== el.dataset.id); }); },
  pickImage: async el => { const {b} = findBlock(el.dataset.id); if (!b) return; const [id] = await pickAssets({multi: false, kind: 'image'}); if (id) editPage(() => { b.asset = id; }); },
  pickFont: async el => { const {b} = findBlock(el.dataset.id); if (!b) return; const v = await BCUI.menu(el, S.brand.fonts.map(f => ({label: f.family + ' – ' + L(f.role), value: f.id, icon: 'type'}))); if (v) editPage(() => { b.font = v; }); }
});
// text editing: saved silently while typing (no re-render, the caret stays)
ON_INPUT.blockText = el => { const {b} = findBlock(el.dataset.blk); if (!b) return; b.text = setL(b.text, el.textContent); touch(); clearTimeout(SP.saveT); SP.saveT = setTimeout(() => Store.save(), 250); };
ON_INPUT.sectionTitle = el => { const pg = page(curPage()), s = pg && pg.sections.find(x => x.id === el.dataset.sec); if (!s) return; s.title = setL(s.title, el.textContent); touch(); clearTimeout(SP.saveT); SP.saveT = setTimeout(() => Store.save(), 250); };
document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && e.target.matches('[contenteditable].sp-h1,[contenteditable].sp-h2,[contenteditable].sp-h3,[contenteditable].sp-sec__t')) { e.preventDefault(); e.target.blur(); } });
document.addEventListener('paste', e => { if (e.target.closest && e.target.closest('[contenteditable]')) { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); } });

function previewAsset(id, pid) {
  const a = asset(id); if (!a) return;
  const dl = pid ? can('download', pid) : dataCloudCanDownload(id);
  BCUI.modal({title: a.name, size: 'l', body: `<div class="lightbox">${a.file ? `<img src="${esc(a.file)}" alt="">` : `<div class="lightbox__ph">${ic(kindIcon(a), 48)}</div>`}</div><dl class="meta2"><dt>${esc(t('type'))}</dt><dd>${esc(a.ext.toUpperCase())}</dd><dt>${esc(t('size'))}</dt><dd>${esc(fmtSize(a.size))}</dd>${a.w ? `<dt>${esc(t('dimensions'))}</dt><dd>${a.w} × ${a.h} px</dd>` : ''}<dt>${esc(t('uploadedBy'))}</dt><dd>${esc(userName(a.by))}</dd></dl>`,
    actions: [{label: t('close'), value: 'cancel'}, {label: t('download'), value: 'dl', variant: 'primary', icon: 'download', disabled: !dl}]})
    .then(v => { if (v === 'dl') ACT.download({dataset: {id}}); });
}
