/* freechains — shared renderers for project cards and post items */
window.Listing = {
  visiblePosts(posts) {
    return (posts || []).filter((p) => !p.draft).sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  postItem(p) {
    const esc = FC.esc;
    return `<a class="post-item" href="${FC.url("blog/post.html?slug=" + encodeURIComponent(p.slug))}">
      <time datetime="${esc(p.date)}">${FC.fmtDate(p.date)}</time>
      <div><h3>${esc(p.title)}</h3>${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
      <div class="meta" style="display:flex;gap:6px;flex-wrap:wrap">${(p.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div></div></a>`;
  },
  projectCard(p, progress, guitar) {
    const esc = FC.esc;
    return `<a class="card" href="${FC.url("projects/project.html?slug=" + encodeURIComponent(p.slug))}">
      ${p.cover ? `<div class="cover" style="background-image:url('${esc(FC.url(p.cover))}')"></div>` : ""}
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <span class="status ${esc(p.status || "idea")}">${esc(FC.statusLabel[p.status] || p.status || "")}</span>
        ${p.type === "higgs" || p.type === "guitar" ? `<span class="lock-badge">🔒 private diary</span>` : ""}
      </div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.summary || "")}</p>
      ${p.type === "higgs" ? `<div style="margin-top:4px">${FC.progressWidget(progress, true)}</div>` : ""}
      ${p.type === "guitar" ? `<div style="margin-top:4px">${FC.guitarWidget(guitar, true)}</div>` : ""}
      <div class="meta">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    </a>`;
  }
};
