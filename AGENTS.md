# AGENTS.md

## Cursor Cloud specific instructions

This is a **static HTML/CSS/JS portfolio website** with zero build dependencies. There is no package manager, no bundler, no framework, and no backend.

### Serving locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/` in a browser. Any static HTTP server works (`npx serve`, VS Code Live Server, etc.).

### Key facts

- **No lint, test, or build steps** — there are no `package.json`, `requirements.txt`, or similar dependency manifests.
- External assets (Google Fonts, Font Awesome) are loaded via CDN; the site renders with fallback fonts if offline.
- The `CNAME` file configures GitHub Pages for the custom domain `neoleon.in`.
- `.gitignore` lists `.venv/` but there is no Python project in the repo; it is a leftover.
