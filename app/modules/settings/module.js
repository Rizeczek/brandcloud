/* Module settings – Users, Teams (with subteams + permission matrix), Roles (testers create their own), Design (accent, banner).
   Everything changed here lives in the session store and is enforced by can() everywhere. */
'use strict';
const SETTINGS_NAV = [
  {id: 'users', icon: 'users', label: 'setUsers', cap: 'manageUsers'},
  {id: 'teams', icon: 'layers', label: 'setTeams', cap: 'manageTeams'},
  {id: 'roles', icon: 'shield', label: 'setRoles', cap: 'manageRoles'},
  {id: 'design', icon: 'palette', label: 'setDesign', cap: 'manageDesign'}
];
// read-only access for users who may see settings but not change that part
const setCan = c => cap(c);
function settingsPanel(cur) {
  return `<div class="panel__title">${esc(t('navSettings'))}</div><div class="panel__h">${esc(t('setUsersTeams'))}</div><div class="pnav">` +
    SETTINGS_NAV.map((n, i) => (i === 2 ? `</div><div class="pnav__sep"></div><div class="pnav">` : '') + `<a href="#/settings/${n.id}"${cur === n.id ? ' class="is-active" aria-current="page"' : ''}>${ic(n.icon, 18)}<span>${esc(t(n.label))}</span>${setCan(n.cap) ? '' : ic('eye', 14)}</a>`).join('') + '</div>' +
    `<div class="pnav__sep"></div><p class="pane__hint" style="padding:0 8px">${esc(t('settingsSessionHint'))}</p>`;
}
const settingsPage = (cur, title, view, crumbs = []) => ({area: 'settings', title, panel: settingsPanel(cur), crumbs: [{label: t('navSettings'), href: 'settings'}, {label: t(SETTINGS_NAV.find(n => n.id === cur).label), href: 'settings/' + cur}, ...crumbs], view});
const ro = c => setCan(c) ? '' : `<div class="ro">${ic('eye', 16)}<span>${esc(t('readOnlySettings'))}</span></div>`;
const roleUsers = rid => W().users.filter(u => u.role === rid);
const teamMembers = tid => W().users.filter(u => u.teams.includes(tid));
const subteams = tid => W().teams.filter(x => x.parent === tid);
function teamOrder(pid = null, d = 0) { return W().teams.filter(x => (x.parent || null) === pid).sort((a, b) => L(a.name).localeCompare(L(b.name), lang)).flatMap(x => [{tm: x, d}, ...teamOrder(x.id, d + 1)]); }
const ownerCount = () => W().users.filter(u => role(u.role)?.system).length;

route('settings', () => { const f = SETTINGS_NAV.find(n => setCan(n.cap)) || SETTINGS_NAV[0]; setTimeout(() => go('settings/' + f.id), 0); return {area: 'settings', view: ''}; });

/* ---------------- users */
route('settings/users', () => {
  const ok = setCan('manageUsers');
  const rows = W().users.map(u => `<tr><td><span class="who"><bc-avatar name="${esc(u.name)}"></bc-avatar><span><strong>${esc(u.name)}</strong>${u.id === me().id ? ` <span class="bc-badge bc-badge--action">${esc(t('you'))}</span>` : ''}<small>${esc(u.email)}</small></span></span></td>` +
    `<td>${esc(L(role(u.role)?.name))}</td><td><span class="chips">${u.teams.map(x => `<span class="bc-tag">${esc(L(team(x)?.name))}</span>`).join('') || `<span class="t3">${esc(t('noTeam'))}</span>`}</span></td>` +
    `<td class="w0">${actBtn({label: t('actAsShort'), icon: 'user-round-cog', act: 'actAsUser', id: u.id, variant: 'ghost', s: true, ok: u.id !== me().id, reason: t('youAlready')})}${actBtn({icon: 'pencil', act: 'editUser', id: u.id, variant: 'ghost', s: true, ok, reason: t('whyCapability'), extra: `aria-label="${esc(t('edit'))}"`})}</td></tr>`).join('');
  return settingsPage('users', t('setUsers'),
    `<div class="phead"><div class="phead__t"><h1>${esc(t('setUsers'))}</h1><div class="phead__meta">${esc(t('nUsers', {n: W().users.length}))}</div></div><div class="phead__acts">${actBtn({label: t('inviteUser'), icon: 'user-plus', act: 'inviteUser', variant: 'primary', ok, reason: t('whyCapability')})}</div></div>${ro('manageUsers')}` +
    `<div class="bc-card tablewrap"><table class="bc-table"><thead><tr><th>${esc(t('name'))}</th><th>${esc(t('role'))}</th><th>${esc(t('setTeams'))}</th><th class="w0"></th></tr></thead><tbody>${rows}</tbody></table></div>`);
});
function userForm(u = {}) {
  return `<form class="form">${field(t('name'), `<input class="bc-input" name="name" value="${esc(u.name || '')}" required>`)}${field(t('email'), `<input class="bc-input" name="email" type="email" value="${esc(u.email || '')}" required>`)}` +
    field(t('role'), `<select class="bc-select" name="role">${W().roles.map(r => `<option value="${r.id}"${r.id === (u.role || 'r-viewer') ? ' selected' : ''}>${esc(L(r.name))}</option>`).join('')}</select>`) +
    `<fieldset class="fs"><legend class="bc-label">${esc(t('setTeams'))}</legend>${teamOrder().map(({tm, d}) => `<label class="bc-choice" style="padding-left:${d * 24}px"><input type="checkbox" class="bc-check" name="teams" value="${tm.id}"${(u.teams || []).includes(tm.id) ? ' checked' : ''}><span>${esc(L(tm.name))}${tm.parent ? `<small>${esc(t('subteamOf', {name: L(team(tm.parent).name)}))}</small>` : ''}</span></label>`).join('')}</fieldset></form>`;
}
const readUser = box => ({name: box.querySelector('[name=name]').value.trim(), email: box.querySelector('[name=email]').value.trim(), role: box.querySelector('[name=role]').value, teams: [...box.querySelectorAll('[name=teams]:checked')].map(x => x.value)});

/* ---------------- teams */
route('settings/teams', () => {
  const ok = setCan('manageTeams');
  const rows = teamOrder().map(({tm, d}) => `<tr><td><a class="row__name" href="#/settings/teams/${tm.id}" style="padding-left:${d * 24}px">${ic(d ? 'chevron-right' : 'layers', 18)}<span>${esc(L(tm.name))}</span></a>${tm.parent ? ` <span class="t3">${esc(t('subteam'))}</span>` : ''}</td><td class="t3">${esc(t('nMembers', {n: teamMembers(tm.id).length}))}</td>` +
    `<td class="w0">${actBtn({label: t('newSubteam'), icon: 'plus', act: 'newTeam', id: tm.id, variant: 'ghost', s: true, ok, reason: t('whyCapability')})}</td></tr>`).join('');
  return settingsPage('teams', t('setTeams'),
    `<div class="phead"><div class="phead__t"><h1>${esc(t('setTeams'))}</h1><div class="phead__meta">${esc(t('teamsIntro'))}</div></div><div class="phead__acts">${actBtn({label: t('newTeam'), icon: 'plus', act: 'newTeam', variant: 'primary', ok, reason: t('whyCapability')})}</div></div>${ro('manageTeams')}` +
    `<div class="bc-card tablewrap"><table class="bc-table"><thead><tr><th>${esc(t('team'))}</th><th>${esc(t('members'))}</th><th class="w0"></th></tr></thead><tbody>${rows}</tbody></table></div>`);
});
function contentRows(tid, pid = null, depth = 0) {
  return sortItems(children(pid)).flatMap(it => {
    const explicit = it.grants && it.grants[tid] != null;
    const eff = teamRank(tid, it), ceil = teamCeiling(tid, it);
    const tm = team(tid);
    const note = explicit ? (rank(it.grants[tid]) > eff ? t('clampedTo', {level: levelLabel(LEVELS[eff])}) : '') :
      it.parent ? t('inheritedFrom', {name: L(item(it.parent).name)}) : tm.parent ? t('inheritedFromTeam', {name: L(team(tm.parent).name)}) : t('notSet');
    return [{id: it.id, label: L(it.name), icon: typeIcon(it), depth, value: LEVELS[eff], inherited: !explicit, max: ceil, note, disabled: !setCan('manageTeams')}, ...(it.type === 'folder' ? contentRows(tid, it.id, depth + 1) : [])];
  });
}
route('settings/teams/:id', p => {
  const tm = team(p.id); if (!tm) return notFound();
  const ok = setCan('manageTeams');
  const parent = tm.parent ? team(tm.parent) : null;
  const mem = teamMembers(tm.id);
  const cfg = {name: 'pm-' + tm.id, first: t('content'), levels: P.levels.map(l => ({id: l.id, label: L(l.label)})), rows: contentRows(tm.id)};
  return settingsPage('teams', L(tm.name),
    `<div class="phead"><div class="phead__t"><h1>${ic('layers', 28)}${esc(L(tm.name))}</h1><div class="phead__meta">${parent ? `<span>${esc(t('subteamOf', {name: L(parent.name)}))}</span><span>·</span>` : ''}<span>${esc(t('nMembers', {n: mem.length}))}</span></div></div>` +
    `<div class="phead__acts">${actBtn({label: t('rename'), icon: 'pencil', act: 'renameTeam', id: tm.id, ok, reason: t('whyCapability')})}${actBtn({label: t('newSubteam'), icon: 'plus', act: 'newTeam', id: tm.id, ok, reason: t('whyCapability')})}${actBtn({icon: 'trash-2', act: 'deleteTeam', id: tm.id, variant: 'danger-ghost', ok: ok && !subteams(tm.id).length, reason: subteams(tm.id).length ? t('teamHasSubteams') : t('whyCapability'), extra: `aria-label="${esc(t('delete'))}"`})}</div></div>${ro('manageTeams')}` +
    `<section class="bc-card setsec"><div class="setsec__h"><h2>${esc(t('members'))}</h2>${actBtn({label: t('addMembers'), icon: 'user-plus', act: 'addMembers', id: tm.id, s: true, ok, reason: t('whyCapability')})}</div>` +
    (mem.length ? `<div class="members">${mem.map(u => `<span class="member"><bc-avatar name="${esc(u.name)}" size="s"></bc-avatar><span>${esc(u.name)}<small>${esc(L(role(u.role)?.name))}</small></span>${ok ? `<button class="bc-btn bc-btn--ghost bc-btn--icon bc-btn--s" data-act="removeMember" data-id="${tm.id}" data-user="${u.id}" aria-label="${esc(t('remove'))} ${esc(u.name)}">${ic('x', 16)}</button>` : ''}</span>`).join('')}</div>` : `<p class="t3">${esc(t('noMembers'))}</p>`) + '</section>' +
    `<section class="bc-card setsec"><div class="setsec__h"><div><h2>${esc(t('contentAccess'))}</h2><p class="t3">${esc(parent ? t('matrixHintSub', {name: L(parent.name)}) : t('matrixHint'))}</p></div></div>` +
    `<bc-permission-matrix data-team="${tm.id}" data-config='${esc(JSON.stringify(cfg))}'></bc-permission-matrix></section>`,
    [{label: L(tm.name), href: 'settings/teams/' + tm.id}]);
});
document.addEventListener('matrix', e => {
  const tid = e.target.dataset.team, it = item(e.detail.row); if (!tid || !it || !cap('manageTeams')) return;
  const lv = e.detail.level;
  Store.update(() => {
    it.grants = it.grants || {};
    const inheritedRank = teamInherited(tid, it);
    // choosing what would be inherited anyway removes the explicit setting (keeps the tree clean)
    if (rank(lv) === inheritedRank) delete it.grants[tid]; else it.grants[tid] = lv;
  });
  BCUI.toast(t('accessChanged', {item: L(it.name), level: levelLabel(lv)}));
});

/* ---------------- roles */
route('settings/roles', () => {
  const ok = setCan('manageRoles');
  const rows = W().roles.map(r => `<tr><td><a class="row__name" href="#/settings/roles/${r.id}">${ic('shield', 18)}<span>${esc(L(r.name))}</span></a> ${r.system ? `<span class="bc-badge">${esc(t('systemRole'))}</span>` : ''}${r.fullAccess ? ` <span class="bc-badge bc-badge--action">${esc(t('fullAccess'))}</span>` : ''}</td>` +
    `<td class="t3">${esc(r.fullAccess ? t('allCapabilities') : t('nCapabilities', {n: r.caps.length}))}</td><td class="t3">${esc(t('nUsers', {n: roleUsers(r.id).length}))}</td></tr>`).join('');
  return settingsPage('roles', t('setRoles'),
    `<div class="phead"><div class="phead__t"><h1>${esc(t('setRoles'))}</h1><div class="phead__meta">${esc(t('rolesIntro'))}</div></div><div class="phead__acts">${actBtn({label: t('newRole'), icon: 'plus', act: 'newRole', variant: 'primary', ok, reason: t('whyCapability')})}</div></div>${ro('manageRoles')}` +
    `<div class="bc-card tablewrap"><table class="bc-table"><thead><tr><th>${esc(t('role'))}</th><th>${esc(t('capabilities'))}</th><th>${esc(t('setUsers'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`);
});
route('settings/roles/:id', p => {
  const r = role(p.id); if (!r) return notFound();
  const ok = setCan('manageRoles') && !r.system;
  const us = roleUsers(r.id);
  return settingsPage('roles', L(r.name),
    `<div class="phead"><div class="phead__t"><h1>${ic('shield', 28)}${esc(L(r.name))}</h1><div class="phead__meta">${r.system ? `<span>${esc(t('systemRoleHint'))}</span>` : `<span>${esc(t('nUsers', {n: us.length}))}</span>`}</div></div>` +
    `<div class="phead__acts">${actBtn({label: t('rename'), icon: 'pencil', act: 'renameRole', id: r.id, ok, reason: r.system ? t('systemRoleHint') : t('whyCapability')})}${actBtn({icon: 'trash-2', act: 'deleteRole', id: r.id, variant: 'danger-ghost', ok: ok && !us.length, reason: us.length ? t('roleInUse') : t('whyCapability'), extra: `aria-label="${esc(t('delete'))}"`})}</div></div>${ro('manageRoles')}` +
    `<section class="bc-card setsec"><label class="bc-choice capt"><input type="checkbox" class="bc-toggle" data-change="roleFull" data-id="${r.id}"${r.fullAccess ? ' checked' : ''}${ok ? '' : ' disabled'}><span><strong>${esc(t('fullAccess'))}</strong><small>${esc(t('fullAccessHint'))}</small></span></label></section>` +
    `<section class="bc-card setsec"><div class="setsec__h"><div><h2>${esc(t('capabilities'))}</h2><p class="t3">${esc(t('capabilitiesHint'))}</p></div></div><div class="caps">` +
    P.capabilities.map(c => `<label class="bc-choice capt"><input type="checkbox" class="bc-toggle" data-change="roleCap" data-id="${r.id}" data-cap="${c.id}"${r.fullAccess || r.caps.includes(c.id) ? ' checked' : ''}${ok && !r.fullAccess ? '' : ' disabled'}><span>${esc(L(c.label))}</span></label>`).join('') + '</div></section>' +
    `<section class="bc-card setsec"><div class="setsec__h"><h2>${esc(t('setUsers'))}</h2></div>${us.length ? `<div class="members">${us.map(u => `<span class="member"><bc-avatar name="${esc(u.name)}" size="s"></bc-avatar><span>${esc(u.name)}</span></span>`).join('')}</div>` : `<p class="t3">${esc(t('roleNoUsers'))}</p>`}</section>`,
    [{label: L(r.name), href: 'settings/roles/' + r.id}]);
});

/* ---------------- design (client customisation) */
route('settings/design', () => {
  const ok = setCan('manageDesign');
  const b = asset(S.design.banner);
  return settingsPage('design', t('setDesign'),
    `<div class="phead"><div class="phead__t"><h1>${esc(t('setDesign'))}</h1><div class="phead__meta">${esc(t('designIntro'))}</div></div></div>${ro('manageDesign')}` +
    `<section class="bc-card setsec"><div class="setsec__h"><div><h2>${esc(t('accentColour'))}</h2><p class="t3">${esc(t('accentHint'))}</p></div></div><div class="accents">` +
    Object.entries(BC.accents).map(([id, a]) => `<label class="accent"><input type="radio" class="bc-radio" name="accent" value="${id}" data-change="setAccent"${S.design.accent === id ? ' checked' : ''}${ok ? '' : ' disabled'}><span class="accent__sw" style="background:${esc(a.swatch)}"></span><span>${esc(L(a.label))}</span></label>`).join('') +
    `</div><div class="accent__demo"><button class="bc-btn bc-btn--primary">${ic('plus', 18)}${esc(t('new'))}</button><button class="bc-btn bc-btn--action">${esc(t('share'))}</button><span class="bc-badge bc-badge--action">${esc(t('status_pending'))}</span><a href="#/settings/design">${esc(t('sampleLink'))}</a></div></section>` +
    `<section class="bc-card setsec"><div class="setsec__h"><div><h2>${esc(t('banner'))}</h2><p class="t3">${esc(t('bannerHint'))}</p></div>${actBtn({label: t('changeBanner'), icon: 'image', act: 'changeBanner', s: true, ok, reason: t('whyCapability')})}</div>` +
    `<div class="bannerprev">${b ? `<img src="${esc(b.file)}" alt="">` : ''}</div></section>` +
    `<section class="bc-card setsec"><div class="setsec__h"><h2>${esc(t('workspaceName'))}</h2>${actBtn({label: t('rename'), icon: 'pencil', act: 'renameWorkspace', s: true, ok, reason: t('whyCapability')})}</div><p>${esc(L(S.brand.workspace))}</p></section>`);
});

/* ---------------- actions */
Object.assign(ACT, {
  actAsUser: el => { setMe(el.dataset.id); BCUI.toast(t('nowActingAs', {name: me().name})); },
  inviteUser: async () => {
    let d = null;
    const r = await BCUI.modal({title: t('inviteUser'), body: userForm(), actions: [{label: t('cancel'), value: 'cancel'}, {label: t('invite'), value: 'ok', variant: 'primary'}],
      beforeClose: (v, box) => { if (v !== 'ok') return true; d = readUser(box); return !!d.name && /.+@.+/.test(d.email); }});
    if (r === 'ok') { Store.update(() => W().users.push({id: uid('u'), ...d, title: both('')})); BCUI.toast(t('userInvited', {name: d.name})); }
  },
  editUser: async el => {
    const u = user(el.dataset.id); let d = null;
    const lastOwner = role(u.role)?.system && ownerCount() === 1;
    const r = await BCUI.modal({side: true, title: u.name, desc: u.email, body: userForm(u) + (lastOwner ? `<p class="pane__hint">${esc(t('lastOwnerHint'))}</p>` : ''),
      actions: [{label: t('removeUser'), value: 'remove', variant: 'danger-ghost', disabled: u.id === me().id || lastOwner}, {label: t('cancel'), value: 'cancel'}, {label: t('save'), value: 'ok', variant: 'primary'}],
      onOpen: box => { if (lastOwner) box.querySelector('[name=role]').disabled = true; },
      beforeClose: (v, box) => { if (v !== 'ok') return true; d = readUser(box); if (lastOwner) d.role = u.role; return !!d.name; }});
    if (r === 'ok') { Store.update(() => Object.assign(u, d)); BCUI.toast(t('changesSaved')); }
    if (r === 'remove' && await confirm1({title: t('removeUser'), text: t('removeUserText', {name: u.name}), ok: t('remove')})) withUndo(t('userRemoved', {name: u.name}), () => { W().users = W().users.filter(x => x.id !== u.id); });
  },
  newTeam: async el => {
    const pid = el.dataset.id || null;
    const v = await prompt1({title: pid ? t('newSubteamOf', {name: L(team(pid).name)}) : t('newTeam'), label: t('name'), ok: t('create')});
    if (!v) return;
    const id = uid('t');
    Store.update(() => W().teams.push({id, name: both(v), parent: pid}), {silent: true});
    go('settings/teams/' + id); BCUI.toast(t('teamCreated', {name: v}));
  },
  renameTeam: async el => { const tm = team(el.dataset.id); const v = await prompt1({title: t('rename'), label: t('name'), value: L(tm.name)}); if (v) Store.update(() => { tm.name = setL(tm.name, v); }); },
  deleteTeam: async el => {
    const tm = team(el.dataset.id);
    if (!await confirm1({title: t('deleteTeam', {name: L(tm.name)}), text: t('deleteTeamText'), ok: t('delete')})) return;
    go('settings/teams');
    withUndo(t('teamDeleted', {name: L(tm.name)}), () => { W().teams = W().teams.filter(x => x.id !== tm.id); W().users.forEach(u => { u.teams = u.teams.filter(x => x !== tm.id); }); C().items.forEach(i => { if (i.grants) delete i.grants[tm.id]; }); });
  },
  addMembers: async el => {
    const tm = team(el.dataset.id); let ids = [];
    const others = W().users.filter(u => !u.teams.includes(tm.id));
    if (!others.length) { BCUI.toast(t('everyoneIsMember')); return; }
    const r = await BCUI.modal({title: t('addMembersTo', {name: L(tm.name)}), body: `<div class="choice-list">${others.map(u => `<label class="bc-choice"><input type="checkbox" class="bc-check" name="u" value="${u.id}"><bc-avatar name="${esc(u.name)}" size="s"></bc-avatar><span>${esc(u.name)}<small>${esc(L(role(u.role)?.name))}</small></span></label>`).join('')}</div>`,
      actions: [{label: t('cancel'), value: 'cancel'}, {label: t('add'), value: 'ok', variant: 'primary'}], beforeClose: (v, box) => { ids = [...box.querySelectorAll('[name=u]:checked')].map(x => x.value); return true; }});
    if (r === 'ok' && ids.length) Store.update(() => ids.forEach(id => user(id).teams.push(tm.id)));
  },
  removeMember: el => { const u = user(el.dataset.user); withUndo(t('memberRemoved', {name: u.name}), () => { u.teams = u.teams.filter(x => x !== el.dataset.id); }); },
  newRole: async () => {
    const v = await prompt1({title: t('newRole'), label: t('name'), ok: t('create')});
    if (!v) return;
    const id = uid('r');
    Store.update(() => W().roles.push({id, name: both(v), caps: []}), {silent: true});
    go('settings/roles/' + id); BCUI.toast(t('roleCreated', {name: v}));
  },
  renameRole: async el => { const r = role(el.dataset.id); const v = await prompt1({title: t('rename'), label: t('name'), value: L(r.name)}); if (v) Store.update(() => { r.name = setL(r.name, v); }); },
  deleteRole: async el => { const r = role(el.dataset.id); if (!await confirm1({title: t('deleteRole', {name: L(r.name)}), text: t('deleteRoleText'), ok: t('delete')})) return; go('settings/roles'); withUndo(t('roleDeleted', {name: L(r.name)}), () => { W().roles = W().roles.filter(x => x.id !== r.id); }); },
  roleFull: el => Store.update(() => { role(el.dataset.id).fullAccess = el.checked; }),
  roleCap: el => Store.update(() => { const r = role(el.dataset.id), c = el.dataset.cap; r.caps = el.checked ? [...new Set([...r.caps, c])] : r.caps.filter(x => x !== c); }),
  setAccent: el => { Store.update(s => { s.design.accent = el.value; }); BCUI.toast(t('accentChanged', {name: L(BC.accents[el.value].label)})); },
  changeBanner: async () => { const [id] = await pickAssets({multi: false, kind: 'image'}); if (id) { Store.update(s => { s.design.banner = id; }); BCUI.toast(t('bannerChanged')); } },
  renameWorkspace: async () => { const v = await prompt1({title: t('workspaceName'), label: t('name'), value: L(S.brand.workspace)}); if (v) Store.update(s => { s.brand.workspace = setL(s.brand.workspace, v); }); }
});
