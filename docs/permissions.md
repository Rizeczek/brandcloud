# Permission model (prototype)

> GENERATED from `spec/permissions.json` by `npm run docs` – edit the spec, not this file.

## Levels

| Rank | Level | Meaning |
|---|---|---|
| 0 | **Skrýt / Hide** | Not visible anywhere – not even in Data Cloud or search. |
| 1 | **Zobrazit / View** | Open, browse and comment. |
| 2 | **Zobrazit a stáhnout / View & download** | Also download files and share by link. |
| 3 | **Upravit / Edit** | Also create, edit, move and delete content. |
| 4 | **Upravit a zamknout / Edit & lock** | Also lock content – locked items can only be edited at this level. |

## Rules

1. **ceiling** – Levels are ceilings: Edit & lock ⊃ Edit ⊃ View & download ⊃ View ⊃ Hide. A higher level includes all lower ones.
2. **inherit** – An item without its own setting inherits the level of its parent folder. At the top level with no setting = Hide; a subteam inherits its parent team's level there instead.
3. **clamp** – A setting on a nested item cannot exceed the team's level on its parent folder. Higher options are disabled in the matrix; choosing the level that would be inherited anyway removes the own setting.
4. **subteam** – A subteam inherits its parent team's access and can only restrict it further: effective level = min(own setting, parent team's level).
5. **user** – A user in several teams gets the highest of their levels.
6. **full** – A role with full access (Owner, Administrator) has Edit & lock on all content, regardless of teams.
7. **lock** – A locked item can only be edited, moved or deleted by a user with Edit & lock.
8. **datacloud** – Data Cloud shows files from smartpages the user may view. Downloading needs View & download on the source smartpage.
9. **roles** – A role sets global capabilities (table below), teams set access to content. Every user has exactly one role.

## Content actions

| Action | Minimum level | Blocked when locked |
|---|---|---|
| `open` Open | View | – |
| `comment` Comment | View | – |
| `download` Download | View & download | – |
| `share` Share by link | View & download | – |
| `edit` Edit | Edit | yes (needs Edit & lock) |
| `create` Create inside | Edit | yes (needs Edit & lock) |
| `rename` Rename | Edit | yes (needs Edit & lock) |
| `move` Move | Edit | yes (needs Edit & lock) |
| `duplicate` Duplicate | View | – – Also needs Edit on the target folder. |
| `delete` Delete | Edit | yes (needs Edit & lock) |
| `submit` Submit for approval | Edit | – |
| `lock` Lock / unlock | Edit & lock | – |

## Global capabilities and default roles

| Capability | Owner | Administrator | Editor | Approver | Viewer | Guest |
|---|---|---|---|---|---|---|
| Create content on Home | ● | ● | ● |  |  |  |
| Approve smartpages | ● | ● |  | ● |  |  |
| Access Data Cloud | ● | ● | ● | ● | ● |  |
| Trash – restore and delete permanently | ● | ● | ● |  |  |  |
| Statistics | ● | ● | ● | ● |  |  |
| E-shop – order | ● | ● | ● | ● | ● |  |
| Manage users | ● | ● |  |  |  |  |
| Manage teams and their permissions | ● | ● |  |  |  |  |
| Manage roles | ● | ● |  |  |  |  |
| Edit design (banner, colour) | ● | ● |  |  |  |  |
| Full access to all content | ● | ● |  |  |  |  |

Testers can create roles in Settings → Roles; the prototype keeps them for the browser session only.
