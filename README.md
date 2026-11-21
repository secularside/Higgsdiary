# freechains

Personal site — space-themed, dark, English. Static (GitHub Pages), no build step.

| Path | What |
|---|---|
| `/` | Home: hero, public Higgs progress, featured projects, latest posts, about |
| `/projects/` | Projects (filter by status) · `/projects/project.html?slug=…` details |
| `/blog/` | Blog with search & tags · `/blog/post.html?slug=…` posts with Markdown + LaTeX math |
| `/admin/` | Owner panel: write/edit posts, upload images, edit projects & profile |
| `/higgs/` | **Higgs Günlüğü** — private, passphrase-locked study diary |

## Content

- `content/site.json` — tagline, about text, public links
- `content/projects.json` — projects (`"type": "higgs"` shows live diary progress)
- `content/posts.json` + `content/posts/<slug>.md` — blog
- `assets/uploads/` — images uploaded from the admin panel

Edit them from `/admin/` (every save is a commit) or directly on github.com.

## Privacy model

- **Writing** to the site needs a GitHub fine-grained token with *Contents: Read and write* on this repo only. It is stored in your browser's localStorage, never in the repo.
- **Higgs diary** data is encrypted in the browser with AES-256-GCM (key derived from your passphrase with PBKDF2-SHA256, 250k iterations) and synced to `data/diary.enc.json`. Only `data/progress.json` (percent, hours, week, streak — no notes) is public.
- The diary's *program* (the weekly plan) is part of the public source code; your notes, answers, questions and checkmarks are not.
- Sync is last-write-wins per device. If you lose the passphrase, the encrypted copy can't be recovered — export a JSON backup from the diary settings now and then.

## Publishing

1. Merge this branch into `main`.
2. Repo → **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
3. Open `https://<user>.github.io/<repo>/admin/`, connect with your token, then open `/higgs/` and create the diary passphrase. Import your old backup from the diary's Settings → *Yedekten yükle*.

Third-party: [marked](https://github.com/markedjs/marked) (MIT), [KaTeX](https://katex.org) (MIT), vendored in `assets/vendor/`.
