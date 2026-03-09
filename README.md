# My Site — Monorepo

Monorepo for mysite.com and related projects.

## Structure

```
apps/
  home/     # mysite.com/ — landing page
  move/     # mysite.com/move — Move on Sui interactive course
```

## Development

```bash
# Install dependencies (from root)
npm install

# Run all apps (home + move in parallel)
npm run dev

# Run a single app
npm run dev:home    # Homepage at http://localhost:5173
npm run dev:move    # Move course at http://localhost:5174 (or next port)
```

## Build

```bash
npm run build
```

Outputs:
- `apps/home/dist/` → deploy to `public_html/`
- `apps/move/dist/` → deploy to `public_html/move/`

## Deployment (DreamHost shared hosting)

1. Build: `npm run build`
2. Upload `apps/home/dist/*` to `public_html/`
3. Upload `apps/move/dist/*` to `public_html/move/`
4. Add `.htaccess` in `move/` for SPA routing (see apps/move for details)
