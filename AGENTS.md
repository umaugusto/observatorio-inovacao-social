# Repository Guidelines

## Project Structure & Modules
- Root: `index.html` (landing) and simple static pages in `pages/`.
- Frontend: `js/` (ES6 class-based managers like `AuthManager.js`, `DataManager.js`, entry `main.js`), `css/` (global and components styles), `data/` (seed JSON).
- Serverless: `netlify/functions/` (Node 18). HTTP routes are available under `/.netlify/functions/*` and proxied from `/api/*` via `netlify.toml`.

## Build, Test, and Development
- Prereqs: Node 18+. Install dependencies: `npm install`.
- Local static server: `npm run dev` (serves site on `http://localhost:8080`).
- Netlify Dev (site + functions): `npm run netlify` (requires Netlify CLI; included as devDependency).
- Build: `npm run build` (no-op for this static site).

## Coding Style & Naming Conventions
- JavaScript: ES6+, classes for stateful modules; 4-space indentation, single quotes, semicolons, strict equality.
- Filenames: class modules `PascalCase` (e.g., `AuthManager.js`), entry/util files lowercase (e.g., `main.js`, `map.js`).
- Keep DOM access and side-effects inside managers; prefer small, focused methods.
- CSS: keep component styles in `css/components.css`; global tokens and layout in `css/main.css`.

## Testing Guidelines
- No test harness is configured yet. For new logic, add Jest unit tests (`*.test.js`) near the module or under `tests/` and wire a script `"test": "jest"` when introducing it.
- Prioritize testing data transforms (e.g., `DataManager` CRUD) and pure helpers; mock `localStorage` and network calls.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits, e.g., `feat(js): add case filters`, `fix(netlify): handle CORS`.
- PRs: include a clear description, linked issues, before/after screenshots for UI changes, and manual test steps (dev server and Netlify Dev).
- Keep PRs focused; avoid unrelated refactors. Ensure no secrets are committed.

## Security & Configuration Tips
- Secrets: move keys to environment variables. For Netlify, set `SUPABASE_URL`, `SUPABASE_KEY`, and any `AUTH0_*` in the dashboard; access via functions. Avoid hardcoding tokens in `js/`.
- CSP: if adding external scripts, update `netlify.toml` `Content-Security-Policy` to whitelist domains.

