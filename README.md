# BrandCloud prototypes

Clickable prototype of BrandCloud for usability testing – mock data, real interactions, real permission model.
Live (behind login): https://brandcloud.fraymz.digital

| URL | What |
|---|---|
| `/` | Signpost: Full prototype pinned, module pages, uploads (admin) |
| `/full/` | The whole app from Home |
| `/p/<slug>/` | The app opened on one module (shareable) or a Standalone redesign |
| `/u/<slug>/` | Prototype uploaded on the site (.html / .zip), server only |
| `/catalog/` | Component catalogue (all DS components, Figma links) |
| `/ds/*` | Design system files – the only public path |

Top bar (hide with `?bar=0`): **View as** any mock user (role + teams), **CS / EN**, **Reset prototype**. `?lang=en` starts in English.

## Develop

```
npm ci
npm run dev            # build + http://localhost:8080 (no login locally)
npm run tokens:check   # token references + WCAG contrast under every client accent
npm run docs           # docs/permissions.md from spec/permissions.json
npm run data           # regenerate mock data + placeholder assets
```

## Deploy
Push to `main` → GitHub Actions builds and FTP-uploads `dist/` to Wedos. Secrets (repo → Settings → Secrets and variables → Actions):
`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_TARGET_DIR`, `SV_ADMIN_PASSWORD`, `SV_VIEWER_PASSWORD` (users `admin` / `team`).

## Where things live
- `ds/` design system: tokens (`ds/tokens/figma.tokens.json` from Figma), `base.css`, `components.css`, `components.js`, icons
- `app/` the Full app (see `app/README.md`), `prototypes/` page entries, `catalog/` component catalogue
- `spec/permissions.json` permission model → `docs/permissions.md`
- `i18n/` UI strings (cs, en), `data/` mock data (brand = placeholder until the test brand is supplied)
- `server/` login gate + uploader (PHP), `static/` .htaccess, `scripts/` build tooling

Working rules for Claude Code: `CLAUDE.md`.
