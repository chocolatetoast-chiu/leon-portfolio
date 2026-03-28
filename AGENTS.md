# AGENTS.md

## Project overview

This is a **multi-page static HTML/CSS/JS personal website** with zero build dependencies. There is no package manager, no bundler, no framework, and no backend.

### Site structure

| Page | File | Description |
|------|------|-------------|
| Homepage | `index.html` | Landing page with hero, about preview, featured projects, posts preview |
| About | `about.html` | Semi-autobiographical timeline + research philosophy |
| CV | `cv.html` | Full academic CV (experience, education, skills, publications, projects, leadership) |
| Contact | `contact.html` | Contact information cards |
| Tutorials | `posts/tutorials.html` | Educational articles index |
| Reflections | `posts/reflections.html` | Personal reflections index |
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
- Single `styles.css` handles all pages; page-specific styles use dedicated CSS classes.
- Shared navbar (with Posts dropdown) and footer are duplicated in each HTML file (no templating).
- Posts system uses pure HTML — no Markdown, no SSG.
- Files in `posts/` use `../` relative paths; files in `posts/articles/` use `../../`.
