/* freechains — owner panel. Every change is a commit to the repo through the GitHub API. */
(async () => {
  "use strict";
  const esc = FC.esc, $ = (s, r = document) => r.querySelector(s);
  const main = $("#main");
  await FC.json("content/site.json").then((s) => { if (s) FC.site = s; });

  let tab = "posts";
  let data = { posts: null, projects: null, site: null };
  let editing = null;          // post being edited
  const previews = {};          // uploaded image path -> data URL (until Pages rebuilds)
  let busy = false;

  const LIVE_NOTE = `<div class="notice">Changes are committed to <b>${esc(GH.config().owner)}/${esc(GH.config().repo)}</b> (${esc(GH.config().branch)}). GitHub Pages usually shows them within 1–2 minutes.</div>`;

  // ---------- connection ----------
  function connectView(err) {
    const c = GH.config();
    return `
      <h1 class="page-title">Owner panel</h1>
      <p class="page-sub">Only someone with a GitHub token that can write to this site's repository can change anything here.</p>
      ${err ? `<div class="notice err">${esc(err)}</div>` : ""}
      <div class="panel" style="max-width:720px">
        <h3>Connect this device</h3>
        <ol class="muted" style="padding-left:20px;font-size:.92rem">
          <li>GitHub → <b>Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</b>.</li>
          <li>Repository access: <b>Only select repositories</b> → this site's repo.</li>
          <li>Permissions → Repository → <b>Contents: Read and write</b>. Nothing else is needed.</li>
          <li>Paste it below. It's stored only in this browser — never in the repo.</li>
        </ol>
        <form id="connect">
          <div class="row">
            <label class="field"><span>Owner</span><input type="text" name="owner" value="${esc(c.owner)}" required></label>
            <label class="field"><span>Repository</span><input type="text" name="repo" value="${esc(c.repo)}" required></label>
            <label class="field"><span>Branch</span><input type="text" name="branch" value="${esc(c.branch)}" required></label>
          </div>
          <label class="field"><span>Token</span><input type="password" name="token" placeholder="github_pat_…" autocomplete="off" required></label>
          <button class="btn primary" type="submit">Connect</button>
        </form>
      </div>`;
  }

  async function connect(form) {
    const c = { owner: form.owner.value.trim(), repo: form.repo.value.trim(), branch: form.branch.value.trim() || "main", token: form.token.value.trim() };
    GH.save(c);
    main.innerHTML = `<div class="muted">Checking token…</div>`;
    try { await GH.verify(); FC.toast("Connected ✓"); await load(); }
    catch (e) { GH.save({ ...c, token: "" }); main.innerHTML = connectView(e.message); }
  }

  async function load() {
    main.innerHTML = `<div class="muted">Loading content from GitHub…</div>`;
    try {
      [data.posts, data.projects, data.site] = await Promise.all([
        GH.readJSON("content/posts.json", []), GH.readJSON("content/projects.json", []), GH.readJSON("content/site.json", {})
      ]);
      render();
    } catch (e) { main.innerHTML = connectView("Could not read the repository: " + e.message); }
  }

  async function commit(files, msg) {
    if (busy) return false;
    busy = true; document.body.style.cursor = "progress";
    try { await GH.commit(files, msg); FC.toast("Saved — live in ~1 minute ✓"); return true; }
    catch (e) { alert("Save failed: " + e.message); return false; }
    finally { busy = false; document.body.style.cursor = ""; }
  }

  // ---------- views ----------
  function render() {
    const c = GH.config();
    main.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
        <div><h1 class="page-title" style="margin:0">Owner panel</h1><div class="muted mono" style="font-size:.8rem">${esc(c.owner)}/${esc(c.repo)} · ${esc(c.branch)}</div></div>
        <div style="display:flex;gap:8px"><a class="btn small" href="../higgs/">🔒 Higgs Diary</a><button class="btn small" data-a="disconnect">Disconnect device</button></div>
      </div>
      <div class="tabs" style="margin-top:24px">
        ${[["posts", "Blog posts"], ["projects", "Projects"], ["profile", "Profile"], ["help", "Help"]].map(([k, v]) => `<button class="${tab === k ? "on" : ""}" data-tab="${k}">${v}</button>`).join("")}
      </div>
      <div id="view"></div>`;
    const v = $("#view");
    if (tab === "posts") v.innerHTML = editing ? postEditor() : postsList();
    else if (tab === "projects") v.innerHTML = projectsView();
    else if (tab === "profile") v.innerHTML = profileView();
    else v.innerHTML = helpView();
    if (tab === "posts" && editing) updatePreview();
  }

  function postsList() {
    const posts = [...data.posts].sort((a, b) => (a.date < b.date ? 1 : -1));
    return `${LIVE_NOTE}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h2 style="margin:0">Posts (${posts.length})</h2><button class="btn primary" data-a="new-post">✎ New post</button></div>
      <div class="panel">${posts.map((p) => `
        <div class="list-item">
          <div><b>${esc(p.title)}</b> ${p.draft ? `<span class="tag">draft</span>` : ""}<div class="muted mono" style="font-size:.78rem">${esc(p.date)} · /${esc(p.slug)}</div></div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            ${p.draft ? "" : `<a class="btn small" href="../blog/post.html?slug=${encodeURIComponent(p.slug)}" target="_blank">View</a>`}
            <button class="btn small" data-a="edit-post" data-slug="${esc(p.slug)}">Edit</button>
            <button class="btn small danger" data-a="del-post" data-slug="${esc(p.slug)}">Delete</button>
          </div>
        </div>`).join("") || `<div class="empty">No posts yet — write the first one!</div>`}</div>`;
  }

  function postEditor() {
    const p = editing;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <h2 style="margin:0">${p._new ? "New post" : "Edit post"}</h2>
        <div style="display:flex;gap:8px"><button class="btn" data-a="cancel-post">Cancel</button><button class="btn primary" data-a="save-post">${p.draft ? "Save draft" : "Publish"}</button></div>
      </div>
      <div class="panel">
        <div class="row">
          <label class="field" style="grid-column:span 2"><span>Title</span><input type="text" data-f="title" value="${esc(p.title)}" placeholder="What did you learn?"></label>
          <label class="field"><span>Date</span><input type="date" data-f="date" value="${esc(p.date)}"></label>
        </div>
        <div class="row">
          <label class="field"><span>Slug (URL)</span><input type="text" data-f="slug" value="${esc(p.slug)}" ${p._new ? "" : "readonly"} placeholder="auto from title"></label>
          <label class="field"><span>Tags (comma separated)</span><input type="text" data-f="tags" value="${esc((p.tags || []).join(", "))}" placeholder="linear-algebra, python"></label>
          <label class="field"><span>Cover image path (optional)</span><input type="text" data-f="cover" value="${esc(p.cover || "")}" placeholder="assets/uploads/…"></label>
        </div>
        <label class="field"><span>Summary</span><input type="text" data-f="summary" value="${esc(p.summary || "")}" placeholder="One sentence shown in lists"></label>
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-f="draft" ${p.draft ? "checked" : ""}> Draft (hidden from the blog)</label>
          <label class="btn small" style="cursor:pointer">🖼 Upload image<input type="file" accept="image/*" data-a="upload" hidden></label>
          <span class="muted" style="font-size:.8rem">Markdown · math with <span class="kbd">$…$</span> and <span class="kbd">$$…$$</span></span>
        </div>
        <div class="editor">
          <textarea data-f="body" placeholder="# Write in Markdown…">${esc(p.body || "")}</textarea>
          <div class="preview prose" id="preview"></div>
        </div>
      </div>`;
  }
  function updatePreview() {
    const el = $("#preview"); if (!el) return;
    FC.renderMarkdown(el, editing.body || "*Preview appears here.*");
    el.querySelectorAll("img").forEach((img) => {
      const key = Object.keys(previews).find((k) => img.getAttribute("src").endsWith(k));
      if (key) img.src = previews[key];
    });
  }

  async function openPost(slug) {
    const meta = data.posts.find((p) => p.slug === slug);
    const body = await GH.read(`content/posts/${slug}.md`);
    editing = { ...meta, body: body || "" };
    render();
  }

  async function savePost() {
    const p = editing;
    p.title = (p.title || "").trim();
    if (!p.title) return alert("Title is required.");
    if (p._new) {
      p.slug = FC.slugify(p.slug || p.title);
      let s = p.slug, i = 2; while (data.posts.some((x) => x.slug === s)) s = `${p.slug}-${i++}`; p.slug = s;
    }
    const meta = { slug: p.slug, title: p.title, date: p.date || new Date().toISOString().slice(0, 10), summary: (p.summary || "").trim(), tags: p.tags || [], draft: !!p.draft };
    if (p.cover) meta.cover = p.cover.trim();
    const posts = data.posts.filter((x) => x.slug !== p.slug).concat(meta).sort((a, b) => (a.date < b.date ? 1 : -1));
    const ok = await commit([
      { path: "content/posts.json", content: JSON.stringify(posts, null, 2) + "\n" },
      { path: `content/posts/${p.slug}.md`, content: (p.body || "").replace(/\s+$/, "") + "\n" }
    ], `${p._new ? "Add" : "Update"} post: ${p.title}`);
    if (ok) { data.posts = posts; editing = null; render(); }
  }

  async function deletePost(slug) {
    const p = data.posts.find((x) => x.slug === slug);
    if (!confirm(`Delete "${p.title}"? This cannot be undone from here (but it stays in git history).`)) return;
    const posts = data.posts.filter((x) => x.slug !== slug);
    if (await commit([{ path: "content/posts.json", content: JSON.stringify(posts, null, 2) + "\n" }, { path: `content/posts/${slug}.md`, delete: true }], `Delete post: ${p.title}`)) { data.posts = posts; render(); }
  }

  async function uploadImage(input) {
    const f = input.files[0]; if (!f) return;
    if (f.size > 4 * 1024 * 1024) return alert("Image is larger than 4 MB — please resize it first.");
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
    const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `assets/uploads/${new Date().toISOString().slice(0, 10)}-${FC.slugify(f.name.replace(/\.[^.]+$/, ""))}.${ext}`;
    if (!(await commit([{ path, base64: dataUrl.split(",")[1] }], `Upload image ${path}`))) return;
    previews[path] = dataUrl;
    const ta = $('[data-f="body"]');
    const snippet = `\n![${f.name.replace(/\.[^.]+$/, "")}](${path})\n`;
    const pos = ta.selectionStart ?? ta.value.length;
    ta.value = ta.value.slice(0, pos) + snippet + ta.value.slice(pos);
    editing.body = ta.value; updatePreview();
    input.value = "";
  }

  // ---------- projects ----------
  function projectsView() {
    const ps = data.projects;
    return `${LIVE_NOTE}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap"><h2 style="margin:0">Projects (${ps.length})</h2>
        <div style="display:flex;gap:8px"><button class="btn" data-a="add-project">＋ Add project</button><button class="btn primary" data-a="save-projects">Save all</button></div></div>
      ${ps.map((p, i) => `
        <details class="panel" style="margin-bottom:12px" ${p._open ? "open" : ""} data-i="${i}">
          <summary style="cursor:pointer;display:flex;gap:10px;align-items:center;justify-content:space-between;list-style:none">
            <span><span class="status ${esc(p.status)}">${esc(FC.statusLabel[p.status] || p.status)}</span> <b style="margin-left:6px">${esc(p.title || "Untitled")}</b> ${p.featured ? "⭐" : ""} ${p.type === "higgs" || p.type === "guitar" ? "🔒" : ""}</span>
            <span style="display:flex;gap:4px">
              <button class="btn small" data-a="move" data-i="${i}" data-d="-1" ${i === 0 ? "disabled" : ""} title="Move up">↑</button>
              <button class="btn small" data-a="move" data-i="${i}" data-d="1" ${i === ps.length - 1 ? "disabled" : ""} title="Move down">↓</button>
              <button class="btn small danger" data-a="del-project" data-i="${i}">Delete</button>
            </span>
          </summary>
          <div style="margin-top:16px">
            <div class="row">
              <label class="field" style="grid-column:span 2"><span>Title</span><input type="text" data-p="title" data-i="${i}" value="${esc(p.title)}"></label>
              <label class="field"><span>Status</span><select data-p="status" data-i="${i}">${Object.entries(FC.statusLabel).map(([k, v]) => `<option value="${k}" ${p.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
            </div>
            <label class="field"><span>Summary</span><input type="text" data-p="summary" data-i="${i}" value="${esc(p.summary || "")}"></label>
            <div class="row">
              <label class="field"><span>Tags (comma separated)</span><input type="text" data-p="tags" data-i="${i}" value="${esc((p.tags || []).join(", "))}"></label>
              <label class="field"><span>Cover image path</span><input type="text" data-p="cover" data-i="${i}" value="${esc(p.cover || "")}" placeholder="assets/uploads/…"></label>
              <label class="field"><span>Slug</span><input type="text" data-p="slug" data-i="${i}" value="${esc(p.slug)}"></label>
            </div>
            <label class="field"><span>Links — one per line: <span class="mono">Label | https://…</span></span><textarea data-p="links" data-i="${i}" style="min-height:70px">${esc((p.links || []).map((l) => `${l.label} | ${l.url}`).join("\n"))}</textarea></label>
            <label class="field"><span>Details (Markdown, math allowed)</span><textarea data-p="body" data-i="${i}" style="min-height:160px;font-family:var(--mono);font-size:.86rem">${esc(p.body || "")}</textarea></label>
            <div style="display:flex;gap:18px;flex-wrap:wrap">
              <label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-p="featured" data-i="${i}" ${p.featured ? "checked" : ""}> Featured on home page</label>
              <label style="display:flex;gap:8px;align-items:center">Live progress: <select data-p="type" data-i="${i}" style="width:auto">${[["", "none"], ["higgs", "Higgs Diary"], ["guitar", "Guitar diary"]].map(([k, v]) => `<option value="${k}" ${(p.type || "") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
            </div>
          </div>
        </details>`).join("") || `<div class="empty">No projects yet.</div>`}`;
  }
  async function saveProjects() {
    const seen = new Set();
    for (const p of data.projects) {
      p.slug = FC.slugify(p.slug || p.title);
      while (seen.has(p.slug)) p.slug += "-2";
      seen.add(p.slug);
    }
    const clean = data.projects.map(({ _open, ...p }) => p);
    if (await commit([{ path: "content/projects.json", content: JSON.stringify(clean, null, 2) + "\n" }], "Update projects")) render();
  }

  // ---------- profile ----------
  function profileView() {
    const s = data.site; const l = s.links || {};
    return `${LIVE_NOTE}
      <div class="panel" style="max-width:820px">
        <label class="field"><span>Tagline (shown under the big title)</span><input type="text" data-s="tagline" value="${esc(s.tagline || "")}"></label>
        <label class="field"><span>About (Markdown)</span><textarea data-s="about" style="min-height:200px">${esc(s.about || "")}</textarea></label>
        <h3>Links <span class="muted" style="font-size:.8rem;font-weight:400">— leave empty to hide. These are public.</span></h3>
        <div class="row">${["github", "email", "linkedin", "x", "instagram", "orcid"].map((k) => `<label class="field"><span>${k}</span><input type="text" data-link="${k}" value="${esc(l[k] || "")}"></label>`).join("")}</div>
        <button class="btn primary" data-a="save-profile">Save profile</button>
      </div>`;
  }

  function helpView() {
    return `<div class="panel prose" style="max-width:820px">
      <h3 style="margin-top:0">How this works</h3>
      <ul>
        <li>The site is static (GitHub Pages). Posts live in <code>content/posts/*.md</code>, the list in <code>content/posts.json</code>, projects in <code>content/projects.json</code>.</li>
        <li>Every <b>Save</b> here is a git commit made with your token. You can also edit those files directly on github.com.</li>
        <li>The <b>Higgs Diary</b> is locked with a passphrase. Its data is encrypted in your browser (AES-256) before it's synced to <code>data/diary.enc.json</code>. Only the progress summary in <code>data/progress.json</code> is public.</li>
        <li>On a new device: connect here with your token, then open the diary and enter your passphrase.</li>
        <li>Lost the passphrase? The encrypted copy can't be recovered — keep a JSON backup from the diary's settings now and then.</li>
      </ul>
      <h3>Markdown cheatsheet</h3>
      <pre><code># Heading      **bold**   *italic*   \`code\`
- list item    [link](https://…)   ![image](assets/uploads/x.png)
> quote        $E = mc^2$          $$\\int_0^\\infty e^{-x}\\,dx = 1$$
\`\`\`python
print("hello, Higgs")
\`\`\`</code></pre></div>`;
  }

  // ---------- events ----------
  main.addEventListener("submit", (e) => { if (e.target.id === "connect") { e.preventDefault(); connect(e.target); } });
  main.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; render(); return; }
    const a = e.target.closest("[data-a]"); if (!a || a.type === "file") return;
    const act = a.dataset.a;
    if (act === "move" || act === "del-project") e.preventDefault();
    if (act === "disconnect") { if (confirm("Remove the GitHub token from this browser?")) { GH.forget(); main.innerHTML = connectView(); } }
    else if (act === "new-post") { editing = { _new: true, title: "", slug: "", date: new Date().toISOString().slice(0, 10), tags: [], summary: "", draft: false, body: "" }; render(); }
    else if (act === "edit-post") openPost(a.dataset.slug);
    else if (act === "cancel-post") { if (confirm("Discard changes?")) { editing = null; render(); } }
    else if (act === "save-post") savePost();
    else if (act === "del-post") deletePost(a.dataset.slug);
    else if (act === "add-project") { data.projects.forEach((p) => (p._open = false)); data.projects.unshift({ slug: "", title: "New project", summary: "", status: "idea", tags: [], links: [], body: "", featured: false, _open: true }); render(); }
    else if (act === "del-project") { const i = +a.dataset.i; if (confirm(`Delete "${data.projects[i].title}"? (Click "Save all" afterwards.)`)) { data.projects.splice(i, 1); render(); } }
    else if (act === "move") { const i = +a.dataset.i, j = i + +a.dataset.d; [data.projects[i], data.projects[j]] = [data.projects[j], data.projects[i]]; render(); }
    else if (act === "save-projects") saveProjects();
    else if (act === "save-profile") { if (await commit([{ path: "content/site.json", content: JSON.stringify(data.site, null, 2) + "\n" }], "Update profile")) render(); }
  });
  main.addEventListener("toggle", (e) => { const d = e.target.closest("details[data-i]"); if (d) data.projects[+d.dataset.i]._open = d.open; }, true);
  let pt;
  main.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.f && editing) {
      const f = el.dataset.f;
      editing[f] = el.type === "checkbox" ? el.checked : f === "tags" ? el.value.split(",").map((s) => s.trim()).filter(Boolean) : el.value;
      if (f === "title" && editing._new) { const s = $('[data-f="slug"]'); if (s && !s.dataset.touched) s.value = FC.slugify(el.value); editing.slug = s.value; }
      if (f === "slug") el.dataset.touched = 1;
      if (f === "draft") { const b = $('[data-a="save-post"]'); if (b) b.textContent = el.checked ? "Save draft" : "Publish"; }
      if (f === "body") { clearTimeout(pt); pt = setTimeout(updatePreview, 250); }
    } else if (el.dataset.p) {
      const p = data.projects[+el.dataset.i], f = el.dataset.p;
      if (f === "tags") p.tags = el.value.split(",").map((s) => s.trim()).filter(Boolean);
      else if (f === "links") p.links = el.value.split("\n").map((l) => l.split("|").map((s) => s.trim())).filter(([a, b]) => a || b).map(([label, url]) => (url ? { label, url } : { label: label, url: label }));
      else if (f === "featured") p.featured = el.checked;
      else if (f === "type") p.type = el.value;
      else p[f] = el.value;
    } else if (el.dataset.s) data.site[el.dataset.s] = el.value;
    else if (el.dataset.link) { data.site.links = data.site.links || {}; data.site.links[el.dataset.link] = el.value.trim(); }
  });
  main.addEventListener("change", (e) => {
    if (e.target.matches('[data-a="upload"]')) uploadImage(e.target);
    else if (e.target.dataset.p === "status") data.projects[+e.target.dataset.i].status = e.target.value;
    else if (e.target.dataset.p === "type") data.projects[+e.target.dataset.i].type = e.target.value;
  });
  addEventListener("beforeunload", (e) => { if (editing) { e.preventDefault(); e.returnValue = ""; } });

  if (GH.hasToken()) load(); else main.innerHTML = connectView();
})();
