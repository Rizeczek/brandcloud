# BrandCloud prototypes – working rules

Clickable, login-protected prototype of BrandCloud for usability testing: testers click through the app organically, with mock data,
so the design can be evaluated (how it works, how it scales). Desktop first; mobile = bottom bar + bottomsheets.

## Site and deploy
- `node scripts/build.mjs` → `dist/` → FTP to Wedos (brandcloud.fraymz.digital) on push to `main`. Never commit `dist/` or passwords.
- `npm ci` once (Lucide icons come from the `lucide-static` package). `npm run dev` = build + http://localhost:8080.
- Everything is behind the login (`server/_sv/gate.php` via `.htaccess`); only `/ds/*` is public. Passwords are GitHub secrets
  SV_ADMIN_PASSWORD / SV_VIEWER_PASSWORD; FTP_SERVER / FTP_USERNAME / FTP_PASSWORD / FTP_TARGET_DIR.
- Verify with `npm run dev` before pushing: 1440 × 900 desktop and 390 × 844 mobile, both languages, a few acting users.

## Design system (source: Figma)
- Tokens: `ds/tokens/figma.tokens.json` is the Figma Design Tokens plugin (lukasoppermann) export – the single source.
  `scripts/tokens.mjs` turns it into `/ds/tokens.css`; never edit generated CSS, never hard-code hex in the app.
- Updating tokens from Figma, either way:
  1. Plugin → "Send to server" → GitHub repository_dispatch `update-tokens` → `.github/workflows/tokens-from-figma.yml` checks, commits, deploys.
  2. Ask Claude: read the variables with the Figma integration (get_variable_defs on the variables / styles frame) and update the
     values in `figma.tokens.json` keeping its structure, then `npm run tokens:check`.
- `npm run tokens:check` fails on unknown references/aliases and on WCAG pairs in `ds/tokens/contrast.json` (checked under every
  client accent). Documented exceptions go to `waive` in `ds/tokens/accents.json` with a reason.
- Client accent: semantic tokens that point at the cloud blue scale become `var(--accent-N)`; `<html data-accent="ruby|emerald|amber">`
  re-colours the action layer. Text/icons on accent-9 use `--on-accent` (computed per accent). Light mode only (no dark tokens yet).
- Spacing/radii/layout sizes live in `ds/tokens/base.json` until the Figma Number collection is exported.
- Font: Mona Sans. Icons: Lucide, listed in `ds/icons.json` (build fails on a name Lucide doesn't have); BrandCloud's own icons in
  `ds/icons/*.svg` → `bc-folder` (filled, stacked sheet) and `bc-smartpage` (outline, dog-ear). Use `<bc-icon name>`.
- Components: primitives are DS classes on native elements (`.bc-btn--primary`, `.bc-input`, `.bc-check`, `.bc-badge`…), composite
  components are custom elements / helpers in `/ds/components.js` (`bc-icon`, `bc-avatar`, `bc-permission-matrix`, `BCUI.modal`
  (mobile = bottomsheet), `BCUI.modal({side:true})` sidesheet, `BCUI.menu`, `BCUI.toast`). Class names follow Figma component
  names. Every component is shown in `/catalog/` – add new ones there with their Figma node URL.

## App
- Full app = `app/shell.html` + `app/core.*` + modules `app/modules/<id>/` (contract: `app/README.md`). Routing is URL based
  (`#/f/<folder>`, `#/p/<page>`, `#/p/<page>/edit`, `#/datacloud`, `#/settings/...`, `#/trash`) – every state worth testing has a link.
- State: the whole prototype state lives in sessionStorage per tester session (reload keeps changes; top bar "Reset prototype"
  restores the mock data; a new build with different data resets automatically). Use `Store.update(fn)`; never mutate without it.
- Permissions: `spec/permissions.json` is the model; `app/core.js` (`can`, `why`, `cap`, `teamRank`) implements it;
  `docs/permissions.md` is generated (`npm run docs`, CI fails if stale). Never check roles by name in a module – use `can()`/`cap()`.
  Unavailable actions stay visible but disabled with the reason (`actBtn({ok, reason})`).
- Copy: every UI string in `i18n/cs.json` + `i18n/en.json` (build fails if a key is missing in one), `t('key', {n})` with Czech
  plurals. Content is bilingual `{cs, en}` → `L(obj)`. Czech copy is brief; no redundant toasts.
- Mock data: `scripts/gen-data.mjs` → `data/*.json` + `data/assets/`. The brand is a PLACEHOLDER until the fictional test brand
  (name, logo, colours, assets) is supplied – then replace `data/brand.json` + assets and the brand-specific copy in the script.
  Never use BrandCloud itself or a real company as the test brand.
- Prototype-site chrome (top bar, signpost, login) is not product UI: it may use its own fixed colours.

## Product rules (from the design decisions)
- Data Cloud is a read-only registry derived from Smartpage asset/image blocks: no upload there; edit (sidesheet), delete, batch delete only.
- Smartpages are made of mandatory sections (white cards, border in every mode; edit mode adds the canvas tint). Blocks are added
  by click (no drag and drop). Right Actions pane = global Smartpage operations only; item-level operations = floating bars.
- Home items are selectable; a selection shows the action bar under the banner.
- The client banner is identical on every screen (same image, size, position) – never vary or remove it.
- One breadcrumb that grows with depth. Rail 56 px + context panel on desktop.
- Permission levels are ceilings (Hide < View < View & download < Edit < Edit & lock); subteams only restrict.
