/* freechains — GitHub API (owner-only writes) + encrypted vault helpers.
 * The token lives only in this browser's localStorage. It is never written to the repo. */
(() => {
  "use strict";
  const CFG_KEY = "fc-github";

  function guessRepo() {
    const h = location.hostname, parts = location.pathname.split("/").filter(Boolean);
    if (h.endsWith(".github.io")) {
      const owner = h.split(".")[0];
      const userSite = !parts.length || parts[0] === "admin" || parts[0] === "higgs" || parts[0] === "blog" || parts[0] === "projects" || /\.html$/.test(parts[0]);
      return { owner, repo: userSite ? `${owner}.github.io` : parts[0] };
    }
    return null;
  }

  const GH = (window.GH = {
    config() {
      let c = {};
      try { c = JSON.parse(localStorage.getItem(CFG_KEY) || "{}"); } catch {}
      const g = guessRepo() || {};
      const site = (window.FC && FC.site && FC.site.repo) || {};
      return { owner: c.owner || g.owner || site.owner || "", repo: c.repo || g.repo || site.repo || "", branch: c.branch || site.branch || "main", token: c.token || "" };
    },
    save(c) { localStorage.setItem(CFG_KEY, JSON.stringify(c)); },
    forget() { localStorage.removeItem(CFG_KEY); },
    hasToken() { return !!GH.config().token; },

    async api(path, opts = {}) {
      const c = GH.config();
      if (!c.token) throw new Error("No GitHub token on this device.");
      const r = await fetch("https://api.github.com" + path.replace("{repo}", `repos/${c.owner}/${c.repo}`), {
        ...opts,
        headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + c.token, "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}) }
      });
      if (r.status === 404 && opts.allow404) return null;
      if (!r.ok) {
        let msg = r.status + " " + r.statusText;
        try { const j = await r.json(); if (j.message) msg = j.message + ` (${r.status})`; } catch {}
        throw new Error(msg);
      }
      return r.status === 204 ? null : r.json();
    },

    async verify() {
      const c = GH.config();
      const repo = await GH.api("/{repo}");
      if (!repo.permissions || !repo.permissions.push) throw new Error("This token can read the repo but cannot write to it.");
      const br = await GH.api(`/{repo}/branches/${encodeURIComponent(c.branch)}`, { allow404: true });
      if (!br) throw new Error(`Branch "${c.branch}" not found. Default branch is "${repo.default_branch}".`);
      return repo;
    },

    /** Read a file fresh from the repo (bypasses the GitHub Pages cache). Returns string or null. */
    async read(path) {
      const c = GH.config();
      const j = await GH.api(`/{repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(c.branch)}`, { allow404: true });
      if (!j) return null;
      const bin = atob(j.content.replace(/\n/g, ""));
      return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
    },
    async readJSON(path, fallback) { const t = await GH.read(path); return t == null ? fallback : JSON.parse(t); },

    /** Commit several files at once. files: [{path, content}|{path, base64}|{path, delete:true}] */
    async commit(files, message) {
      const c = GH.config();
      const ref = await GH.api(`/{repo}/git/ref/heads/${encodeURIComponent(c.branch)}`);
      const head = await GH.api(`/{repo}/git/commits/${ref.object.sha}`);
      const tree = [];
      for (const f of files) {
        if (f.delete) { tree.push({ path: f.path, mode: "100644", type: "blob", sha: null }); continue; }
        const blob = await GH.api("/{repo}/git/blobs", { method: "POST", body: JSON.stringify(f.base64 != null ? { content: f.base64, encoding: "base64" } : { content: f.content, encoding: "utf-8" }) });
        tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
      }
      const t = await GH.api("/{repo}/git/trees", { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
      const cm = await GH.api("/{repo}/git/commits", { method: "POST", body: JSON.stringify({ message, tree: t.sha, parents: [ref.object.sha] }) });
      await GH.api(`/{repo}/git/refs/heads/${encodeURIComponent(c.branch)}`, { method: "PATCH", body: JSON.stringify({ sha: cm.sha }) });
      return cm;
    }
  });

  // ---------- Vault: AES-GCM with a PBKDF2-derived key ----------
  const b64 = (buf) => {
    const u = new Uint8Array(buf); let s = "";
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function key(pass, salt, iter) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  window.Vault = {
    async encrypt(obj, pass, meta = {}) {
      const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 250000;
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(pass, salt, iter), new TextEncoder().encode(JSON.stringify(obj)));
      return { v: 1, alg: "AES-GCM-256/PBKDF2-SHA256", iter, salt: b64(salt), iv: b64(iv), data: b64(ct), ...meta };
    },
    async decrypt(env, pass) {
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, await key(pass, unb64(env.salt), env.iter), unb64(env.data));
      return JSON.parse(new TextDecoder().decode(pt));
    }
  };
})();
