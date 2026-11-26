/* freechains — shared site helpers (header, footer, starfield, content loading, markdown) */
(() => {
  "use strict";
  const root = document.documentElement.dataset.root || "./";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const FC = (window.FC = {
    root, esc,
    url: (p) => root + p.replace(/^\//, ""),
    async json(path, fallback = null) {
      try {
        const r = await fetch(FC.url(path) + "?t=" + Date.now(), { cache: "no-store" });
        if (!r.ok) return fallback;
        return await r.json();
      } catch { return fallback; }
    },
    async text(path) {
      const r = await fetch(FC.url(path) + "?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      return r.text();
    },
    fmtDate(d, opts = { year: "numeric", month: "short", day: "numeric" }) {
      if (!d) return "";
      const [y, m, day] = String(d).slice(0, 10).split("-").map(Number);
      return new Date(y, m - 1, day).toLocaleDateString("en-US", opts);
    },
    readingTime(md) { return Math.max(1, Math.round((md || "").split(/\s+/).length / 220)); },
    slugify(s) {
      const tr = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" };
      return String(s).replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => tr[c]).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "post";
    },
    /** Render markdown (+ $math$) into an element. Relative image/link paths are resolved from the site root. */
    renderMarkdown(el, md) {
      // protect math from markdown processing
      const math = [];
      let src = String(md || "").replace(/\$\$([\s\S]+?)\$\$/g, (m) => { math.push(m); return `@@MATH${math.length - 1}@@`; })
        .replace(/(^|[^\\$])\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g, (m, pre, body) => { math.push("$" + body + "$"); return pre + `@@MATH${math.length - 1}@@`; });
      let html = window.marked ? window.marked.parse(src, { gfm: true, breaks: false }) : "<pre>" + esc(src) + "</pre>";
      html = html.replace(/@@MATH(\d+)@@/g, (_, i) => esc(math[+i]));
      el.innerHTML = html;
      el.querySelectorAll("script, iframe[src^='javascript'], object, embed").forEach((n) => n.remove());
      el.querySelectorAll("img[src], a[href]").forEach((n) => {
        const attr = n.tagName === "IMG" ? "src" : "href";
        const v = n.getAttribute(attr);
        if (/^javascript:/i.test(v)) n.removeAttribute(attr);
        else if (v && !/^([a-z]+:|\/|#|\.\.?\/)/i.test(v)) n.setAttribute(attr, FC.url(v));
        if (attr === "href" && /^https?:/i.test(v)) { n.target = "_blank"; n.rel = "noopener"; }
      });
      el.querySelectorAll("img").forEach((i) => (i.loading = "lazy"));
      if (window.renderMathInElement) {
        window.renderMathInElement(el, {
          delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
          throwOnError: false
        });
      }
    },
    toast(msg) {
      let t = document.querySelector(".toast");
      if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
      t.textContent = msg; t.classList.add("show");
      clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
    },
    statusLabel: { active: "In progress", planned: "Planned", completed: "Completed", paused: "Paused", idea: "Idea" },
    /** Public guitar progress widget (reads data/guitar-progress.json — no notes). */
    guitarWidget(p, compact) {
      if (!p || !p.totalDays) return `<div class="muted" style="font-size:.9rem">Progress will appear here after the first sync from the private guitar diary.</div>`;
      const pct = Math.round(p.percent);
      const label = p.status === "done" ? "All 53 days done 🤘" : p.status === "before" ? "Day 1 coming up" : `Day ${p.currentDay} of ${p.totalDays} · ${esc(p.weekLabel)}`;
      return `
        <div class="progress">
          <div class="big"><b>${p.daysDone}/${p.totalDays}</b><span class="muted">${esc(label)}</span></div>
          <div class="pbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
          <div class="phases" style="grid-template-columns:repeat(${(p.weeks || []).length || 8},1fr)">${(p.weeks || []).map((w) => `<div class="ph" title="Week ${esc(w.label)}: ${w.done}/${w.total} days"><div class="pbar"><i style="width:${(w.done / w.total) * 100}%;background:#8b7bff"></i></div>${w.label === "F" ? "Final" : "W" + esc(w.label)}</div>`).join("")}</div>
          ${compact ? "" : `
          <div class="stats">
            <div class="stat"><b>${p.minutes}</b><span>minutes played</span></div>
            <div class="stat"><b>${p.streak}</b><span>day streak</span></div>
            <div class="stat"><b>${p.songsLearned}/${p.songsTotal}</b><span>songs playable</span></div>
            <div class="stat"><b>${pct}%</b><span>of the plan</span></div>
          </div>
          ${p.currentSong ? `<div style="font-size:.9rem">🎸 Now learning: <b>${esc(p.currentSong)}</b></div>` : ""}`}
          <div class="muted" style="font-size:.75rem">Updated ${p.updated ? new Date(p.updated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"}</div>
        </div>`;
    },
    /** Public Higgs progress widget (reads data/progress.json, contains no private notes). */
    progressWidget(p, compact) {
      if (!p || !p.total) return `<div class="muted" style="font-size:.9rem">Progress will appear here after the first sync from the private diary.</div>`;
      const pct = p.percent < 10 ? Math.round(p.percent * 10) / 10 : Math.round(p.percent);
      const label = p.status === "before" ? `Starts ${FC.fmtDate(p.startDate)}` : p.status === "done" ? "Journey complete" : `Week ${p.week} of ${p.totalWeeks} · Phase ${p.phase.id}: ${esc(p.phase.name)}`;
      const spark = (p.weeks || []).map((w) => `<i class="${w.future ? "future" : ""}" style="height:${Math.max(4, Math.min(100, (w.hours / 20) * 100))}%" title="Week ${esc(w.label)}: ${w.hours} h"></i>`).join("");
      return `
        <div class="progress">
          <div class="big"><b>${pct}%</b><span class="muted">${esc(label)}</span></div>
          <div class="pbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
          <div class="phases">${(p.phases || []).map((ph) => `<div class="ph" title="${esc(ph.name)}: ${Math.round(ph.pct)}%"><div class="pbar"><i style="width:${ph.pct}%;background:${ph.color}"></i></div>${esc(ph.short)}</div>`).join("")}</div>
          ${compact ? "" : `
          <div class="stats">
            <div class="stat"><b>${p.hours}</b><span>hours studied</span></div>
            <div class="stat"><b>${p.streak}</b><span>day streak</span></div>
            <div class="stat"><b>${p.examsPassed}/${p.totalWeeks}</b><span>weekly checks passed</span></div>
            <div class="stat"><b>${p.phasesDone}/5</b><span>phases cleared</span></div>
          </div>
          <div><div class="muted" style="font-size:.75rem;margin-bottom:6px">Hours per week</div><div class="spark">${spark}</div></div>`}
          <div class="muted" style="font-size:.75rem">Updated ${p.updated ? new Date(p.updated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"}</div>
        </div>`;
    }
  });

  // ---------- header / footer ----------
  const active = document.documentElement.dataset.page || "";
  const logo = `<svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="lg" cx="35%" cy="35%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#b9b0ff"/><stop offset="1" stop-color="#6c5ce7"/></radialGradient></defs><ellipse cx="32" cy="32" rx="29" ry="11" fill="none" stroke="#4cc9f0" stroke-width="2.5" transform="rotate(-25 32 32)" opacity=".9"/><circle cx="32" cy="32" r="11" fill="url(#lg)"/><circle cx="57" cy="20" r="3.2" fill="#ff6b9a"/></svg>`;
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `<div class="inner">
    <a class="logo" href="${FC.url("index.html")}">${logo}<span>freechains<span class="dot">.</span></span></a>
    <nav class="site-nav" aria-label="Main">
      <a href="${FC.url("index.html")}" class="${active === "home" ? "active" : ""}">Home</a>
      <a href="${FC.url("projects/")}" class="${active === "projects" ? "active" : ""}">Projects</a>
      <a href="${FC.url("blog/")}" class="${active === "blog" ? "active" : ""}">Blog</a>
      <a href="${FC.url("higgs/")}" class="${active === "higgs" ? "active" : ""}" title="Private">Higgs Diary <span aria-hidden="true">🔒</span></a>
      <a href="${FC.url("guitar/")}" class="${active === "guitar" ? "active" : ""}" title="Private">Guitar <span aria-hidden="true">🔒</span></a>
    </nav></div>`;
  document.body.prepend(header);
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `<div class="inner"><span>© ${new Date().getFullYear()} freechains · made among the stars</span>
    <span id="footer-links"></span><a href="${FC.url("admin/")}" title="Owner panel">✦ admin</a></div>`;
  document.body.appendChild(footer);
  FC.json("content/site.json").then((s) => {
    if (!s) return;
    FC.site = s;
    const links = Object.entries(s.links || {}).filter(([, v]) => v).map(([k, v]) => `<a href="${esc(k === "email" ? "mailto:" + v : v)}" ${k === "email" ? "" : 'target="_blank" rel="noopener"'}>${esc(k)}</a>`).join(" · ");
    const fl = document.getElementById("footer-links"); if (fl) fl.innerHTML = links;
  });

  // ---------- starfield ----------
  const c = document.createElement("canvas");
  c.id = "stars"; c.setAttribute("aria-hidden", "true");
  document.body.prepend(c);
  const ctx = c.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let stars = [], W = 0, H = 0, shoot = null;
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((W * H) / 5200);
    stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.2, a: Math.random(), s: Math.random() * 0.015 + 0.003, d: Math.random() * 0.15 + 0.02, hue: Math.random() < 0.15 ? (Math.random() < 0.5 ? "190,220,255" : "255,210,230") : "255,255,255" }));
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      if (!reduce) { s.a += s.s; s.y += s.d; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
      const al = 0.35 + Math.abs(Math.sin(s.a)) * 0.65;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.hue},${al})`; ctx.fill();
    }
    if (!reduce) {
      if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * W * 0.7 + W * 0.2, y: Math.random() * H * 0.4, l: 0 };
      if (shoot) {
        shoot.l += 14;
        const g = ctx.createLinearGradient(shoot.x - shoot.l, shoot.y + shoot.l * 0.45, shoot.x, shoot.y);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(200,220,255,.85)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath();
        ctx.moveTo(shoot.x - shoot.l, shoot.y + shoot.l * 0.45); ctx.lineTo(shoot.x, shoot.y); ctx.stroke();
        shoot.x -= 9; shoot.y += 4;
        if (shoot.l > 260) shoot = null;
      }
      requestAnimationFrame(frame);
    }
  }
  addEventListener("resize", () => { resize(); if (reduce) frame(); });
  resize(); frame();
})();
