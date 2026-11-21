/* Higgs Günlüğü — kilit, şifreli senkron ve herkese açık ilerleme özeti.
 * Günlük verisi tarayıcıda AES-256-GCM ile şifrelenir, repoya sadece şifreli hali gider (data/diary.enc.json).
 * Herkese açık olan tek şey data/progress.json'daki yüzde/saat özetidir. */
(() => {
  "use strict";
  const PASS_KEY = "fc-higgs-pass";
  const META_KEY = "fc-higgs-sync";
  const VAULT = "data/diary.enc.json";
  const PROGRESS = "data/progress.json";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const meta = () => { try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; } };
  const setMeta = (m) => localStorage.setItem(META_KEY, JSON.stringify({ ...meta(), ...m }));
  const pass = () => localStorage.getItem(PASS_KEY);
  const api = () => window.HiggsAPI;
  let pushT = null, syncing = false, status = "";

  // site.json → repo bilgisi (GitHub Pages dışında da çalışsın)
  const siteReady = fetch("../content/site.json?t=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((s) => {
    window.FC = window.FC || {}; if (s) window.FC.site = s;
  }).catch(() => {});

  async function fetchRemote() {
    await siteReady;
    try {
      if (window.GH && GH.hasToken()) { const t = await GH.read(VAULT); return t ? JSON.parse(t) : null; }
    } catch (e) { console.warn("GitHub read failed, falling back to Pages", e); }
    try {
      const r = await fetch("../" + VAULT + "?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return null;
      const j = await r.json();
      return j && j.data ? j : null;
    } catch { return null; }
  }

  function setStatus(s) { status = s; api() && api().refreshSettings(); }

  async function pull({ silent } = {}) {
    const p = pass(); if (!p) return;
    const env = await fetchRemote();
    if (!env) return;
    const local = api().getState();
    if ((env.updatedAt || 0) > (local.updatedAt || 0)) {
      try {
        const remote = await Vault.decrypt(env, p);
        api().replaceState(remote);
        setMeta({ lastPull: Date.now(), remoteUpdatedAt: env.updatedAt });
        api().toast("Diğer cihazdaki son hali yüklendi ☁");
      } catch {
        if (!silent) api().toast("Şifreli yedek açılamadı — parola değişmiş olabilir");
        setStatus("Uzak yedek bu parolayla açılamadı.");
      }
    }
  }

  async function push({ force } = {}) {
    const p = pass();
    if (!p || !window.GH || !GH.hasToken() || syncing) return false;
    syncing = true; setStatus("Senkronize ediliyor…");
    try {
      const local = api().getState();
      const env = await fetchRemote();
      if (!force && env && (env.updatedAt || 0) > (local.updatedAt || 0)) {
        syncing = false; await pull(); setStatus("Uzaktaki daha yeniydi, o yüklendi.");
        return false;
      }
      const enc = await Vault.encrypt(local, p, { updatedAt: local.updatedAt || Date.now() });
      const summary = api().summary();
      await GH.commit([
        { path: VAULT, content: JSON.stringify(enc) + "\n" },
        { path: PROGRESS, content: JSON.stringify(summary, null, 2) + "\n" }
      ], `Higgs diary sync · ${summary.percent}%`);
      setMeta({ lastPush: Date.now(), remoteUpdatedAt: enc.updatedAt, dirty: false });
      setStatus("");
      return true;
    } catch (e) {
      setStatus("Senkron hatası: " + e.message);
      return false;
    } finally { syncing = false; }
  }

  // ---------- Kilit ekranı ----------
  function lockScreen(start, env) {
    document.body.classList.add("locked");
    const main = document.getElementById("main");
    const create = !env;
    main.innerHTML = `
      <div class="card lock-card">
        <div style="font-size:2.6rem;text-align:center">🔒</div>
        <h1 style="text-align:center;margin:6px 0">Higgs Günlüğü</h1>
        <p class="muted" style="text-align:center">Bu alan özel. ${create ? "Henüz şifreli kasa yok — ilk kez bir parola belirle." : "Devam etmek için parolanı gir."}</p>
        <form id="unlock" autocomplete="off">
          <label class="field"><span>Parola</span><input type="password" name="p" required minlength="${create ? 8 : 1}" autofocus></label>
          ${create ? `<label class="field"><span>Parola (tekrar)</span><input type="password" name="p2" required></label>
          <p class="muted" style="font-size:.82rem">En az 8 karakter. Parola notlarını şifreler; unutursan şifreli yedek açılamaz. Bu cihazda hatırlanır, "Kilitle" diyene kadar tekrar sorulmaz.</p>` : ""}
          <div id="unlock-err" class="callout bad" hidden></div>
          <button class="btn primary" type="submit" style="width:100%;justify-content:center">${create ? "Kasayı oluştur" : "Kilidi aç"}</button>
        </form>
        <p class="muted" style="text-align:center;font-size:.8rem;margin-top:14px"><a href="../">← freechains</a> · <a href="../projects/project.html?slug=higgs-diary">Herkese açık ilerleme</a></p>
      </div>`;
    main.querySelector("#unlock").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, err = main.querySelector("#unlock-err");
      const show = (m) => { err.textContent = m; err.hidden = false; };
      const p = f.p.value;
      if (create) {
        if (p !== f.p2.value) return show("Parolalar aynı değil.");
        if (p.length < 8) return show("En az 8 karakter olmalı.");
        localStorage.setItem(PASS_KEY, p);
        unlocked(start);
        api().toast("Kasa oluşturuldu. Ayarlar'dan yedeğini yükleyebilirsin.");
        if (GH.hasToken()) push({ force: true });
        return;
      }
      f.querySelector("button").disabled = true;
      try {
        const remote = await Vault.decrypt(env, p);
        localStorage.setItem(PASS_KEY, p);
        const local = JSON.parse(localStorage.getItem(api().storeKey) || "{}");
        if ((env.updatedAt || 0) > (local.updatedAt || 0)) api().replaceState(remote);
        setMeta({ lastPull: Date.now(), remoteUpdatedAt: env.updatedAt });
        unlocked(start);
      } catch {
        f.querySelector("button").disabled = false;
        show("Parola yanlış.");
        f.p.select();
      }
    });
  }

  function unlocked(start) {
    document.body.classList.remove("locked");
    start();
    if (meta().dirty) schedule(3000);
  }

  function schedule(ms = 30000) {
    clearTimeout(pushT);
    if (!window.GH || !GH.hasToken() || !pass()) return;
    pushT = setTimeout(() => push(), ms);
  }

  // ---------- Dışa açık arayüz ----------
  window.FCPrivate = {
    async gate(start) {
      await siteReady;
      if (pass()) { unlocked(start); pull({ silent: true }); return; }
      document.body.classList.add("locked");
      document.getElementById("main").innerHTML = `<div class="empty-state">Kontrol ediliyor…</div>`;
      lockScreen(start, await fetchRemote());
    },
    markDirty() { setMeta({ dirty: true }); schedule(); },
    settingsHTML() {
      const m = meta(), tok = window.GH && GH.hasToken();
      const t = (x) => (x ? new Date(x).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—");
      return `
        <h3>🔐 Gizlilik ve senkron</h3>
        <p class="muted" style="font-size:.85rem">Notların bu tarayıcıda şifrelenip (AES-256) repoya <code>data/diary.enc.json</code> olarak gönderilir. Sitede herkese açık olan tek şey ilerleme özetidir (yüzde, saat, hafta) — not, soru ya da cevap içermez.</p>
        ${tok ? `<div class="callout good" style="font-size:.85rem">Bu cihaz bağlı. Değişiklikler 30 sn sonra otomatik senkronize edilir.</div>`
              : `<div class="callout warn" style="font-size:.85rem">Bu cihazda GitHub anahtarı yok: veriler sadece burada kalır ve ilerleme yayınlanmaz. <a href="../admin/">Admin panelinden bağla →</a></div>`}
        <div style="font-size:.85rem;margin:8px 0">Son gönderim: <b>${t(m.lastPush)}</b> · Son alım: <b>${t(m.lastPull)}</b>${m.dirty ? ` · <span style="color:var(--warn)">gönderilmemiş değişiklik var</span>` : ""}</div>
        ${status ? `<div class="callout" style="font-size:.85rem">${esc(status)}</div>` : ""}
        <div class="btn-row">
          <button class="btn primary" data-sync="now" ${tok ? "" : "disabled"}>☁ Şimdi senkronize et</button>
          <button class="btn" data-sync="pull">⬇ Uzaktan yükle</button>
          <button class="btn" data-sync="pass">Parolayı değiştir</button>
          <button class="btn" data-sync="lock">🔒 Kilitle</button>
          <button class="btn danger" data-sync="wipe">Kilitle ve bu cihazdan sil</button>
        </div>`;
    }
  };

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-sync]"); if (!b) return;
    const a = b.dataset.sync;
    if (a === "now") { const ok = await push(); api().toast(ok ? "Senkronize edildi ✓ İlerleme yayında." : status || "Senkron yapılamadı"); }
    else if (a === "pull") { await pull(); api().refreshSettings(); }
    else if (a === "pass") {
      const p1 = prompt("Yeni parola (en az 8 karakter):"); if (!p1) return;
      if (p1.length < 8) return alert("En az 8 karakter olmalı.");
      if (prompt("Yeni parola (tekrar):") !== p1) return alert("Parolalar aynı değil.");
      localStorage.setItem(PASS_KEY, p1);
      if (GH.hasToken()) { await push({ force: true }); api().toast("Parola değişti, kasa yeniden şifrelendi ✓"); }
      else api().toast("Parola değişti. Bağlı bir cihazdan senkronize etmeyi unutma.");
    } else if (a === "lock") {
      if (meta().dirty && GH.hasToken()) await push();
      localStorage.removeItem(PASS_KEY); location.reload();
    } else if (a === "wipe") {
      if (!confirm("Bu cihazdaki günlük verisi silinecek ve kilitlenecek. Şifreli yedek repoda kalır. Devam?")) return;
      if (meta().dirty && GH.hasToken()) { const ok = await push(); if (!ok && !confirm("Son değişiklikler gönderilemedi. Yine de silinsin mi?")) return; }
      localStorage.removeItem(PASS_KEY); localStorage.removeItem(api().storeKey); localStorage.removeItem(META_KEY);
      location.reload();
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && meta().dirty && pass()) push(); });
})();
