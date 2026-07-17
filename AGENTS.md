# AGENTS.md

## Project overview

This is a **multi-page static HTML/CSS/JS personal website** with zero build dependencies. There is no package manager, no bundler, no framework, and no backend.

### Site structure

| Page | File | Description |
|------|------|-------------|
| Homepage | `index.html` | 3D brain + Quantification Console, pillars, method compare, featured work, field notes |
| About | `about.html` | Journey scrubber + philosophy toggle + research thread chips |
| CV | `cv.html` | Sticky TOC, pub lens filter, skills→evidence, case-study links |
| Contact | `contact.html` | Intent chips, copy-to-clipboard, timezone strip |
| Work case studies | `work/*.html` | LEON / MRI-less / TCBC interactive case studies |
| Tutorials | `posts/tutorials.html` | Topic roadmap + ghost stubs |
| Reflections | `posts/reflections.html` | Year spine + theme filter + preview |
| Article template | `posts/articles/_template.html` | Template for new articles |

### Serving locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/` in a browser. Any static HTTP server works (`npx serve`, VS Code Live Server, etc.).

### Key facts

- **No lint, test, or build steps** — there are no `package.json`, `requirements.txt`, or similar dependency manifests.
- External assets (Google Fonts, Font Awesome 6.5.1) are loaded via CDN; the site renders with fallback fonts if offline.
- The `CNAME` file configures GitHub Pages for the custom domain `neoleon.in`.
- Active CSS: `assets/css/styles.css`; JS: `assets/js/main.js` plus modules (`research-data.js`, `instruments.js`, `brain-atlas.js`, `quant-console.js`, `pillars.js`, page scripts).
- Homepage may load Three.js from CDN for the procedural 3D brain; falls back to 2D canvas / reduced-motion.
- Shared navbar (with Posts dropdown) and footer are duplicated in each HTML file (no templating).
- Posts system uses pure HTML — no Markdown, no SSG.
- Files in `posts/` use `../` relative paths; files in `posts/articles/` and `work/` use `../` or `../../` as needed.
