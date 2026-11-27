# BrandCloud app (Full prototype) – modules

The Full prototype is **composed** at build time:

```
app/shell.html                 rail, context panel, main (banner, breadcrumb, action bar, view), mobile bottom bar
app/core.css · core.js         shell layout; i18n (t, L), session Store, permission engine (can, why, cap), router, render, shared dialogs
app/modules/<id>/module.js     the module's routes and actions
app/modules/<id>/module.css    styles used only by this module
app/modules/<id>/module.html   optional <!-- @templates --> part inserted into the shell
app/boot.js                    click/input delegates, user menu, notifications, prototype API for the top bar, start (loaded last)
app/modules.json               module order + start route (used by "In Main" prototype pages)
```

| Module | Routes |
|---|---|
| `home` | `#/` · `#/f/<folder>` – browsing, selection bar, create / rename / move / duplicate / tags / share / lock / delete |
| `smartpage` | `#/p/<page>` preview + Actions pane · `#/p/<page>/edit` click-to-add editor · approval flow |
| `datacloud` | `#/datacloud` – derived file registry, edit sidesheet, delete / batch delete |
| `settings` | `#/settings/users` · `teams` · `teams/<id>` (permission matrix) · `roles` · `roles/<id>` · `design` |
| `trash` | `#/trash` |
| `placeholder` | `#/eshop` · `#/stats` – in the navigation, marked as not in the prototype yet |

## Module contract

- Register routes: `route('f/:id', p => ({area, title, crumbs, panel, view, actionbar, mode, after}))`. `view`/`panel` are HTML strings.
- Register actions: `Object.assign(ACT, {name: (el, event) => …})` → `data-act="name"`; inputs `ON_INPUT.name` → `data-input`;
  change events → `data-change="name"` (handled by `ACT`).
- Change data only through `Store.update(state => …)` (persists + re-renders). Destructive actions: `withUndo(message, fn)`.
- Permissions: `can(action, itemId)`, `why(action, itemId)`, `cap(capability)`, `levelOf(itemId)`. Show unavailable actions disabled
  with the reason: `actBtn({label, icon, act, id, ok: can(…), reason: why(…)})`.
- Strings: `t('key', vars)` (add to both `i18n/*.json`), content `L({cs, en})`, typed input `both(text)` / `setL(obj, text)`.
- Shared item operations (home module, global): `renameItem`, `moveItems`, `duplicateItems`, `deleteItems`, `tagItems`, `shareItems`,
  `toggleLock`, `newItem`; panel tree `homePanel(id)`; asset picker `pickAssets` (smartpage module).
- Tokens and DS components only (see /catalog/). Scripts share one global scope: top-level names must be unique across modules.

## Redesign → review → merge

```
npm run redesign -- new datacloud datacloud-v2 "Data Cloud – table first"   # copy of the module, Standalone, /p/datacloud-v2/
…edit prototypes/datacloud-v2/module.js|css, push, test with users…
npm run redesign -- merge datacloud-v2                                        # approved: becomes app/modules/datacloud
```
