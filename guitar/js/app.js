/* Gitar Günlüğü — 53 günlük rock gitar planı takipçisi (metronom + set zamanlayıcı). */
(() => {
  "use strict";
  const G = window.GUITAR;
  const STORE_KEY = "fc-guitar-v1";
  const TOTAL = G.days.length;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const todayOverride = new URLSearchParams(location.search).get("bugun");
  const today = () => (todayOverride ? parseISO(todayOverride) : parseISO(iso(new Date())));
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmt = (d, o = { day: "numeric", month: "long" }) => d.toLocaleDateString("tr-TR", o);

  // ---------- Durum ----------
  const defaultState = () => ({ v: 1, updatedAt: 0, settings: { theme: "dark" }, days: {}, practice: {}, songs: {}, customSongs: [], metroBpm: 80 });
  let state, started = false;
  function loadState() {
    try { state = Object.assign(defaultState(), JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch { state = defaultState(); }
  }
  loadState();
  let saveT;
  const persist = () => { if (started) localStorage.setItem(STORE_KEY, JSON.stringify(state)); };
  const save = () => { state.updatedAt = Date.now(); clearTimeout(saveT); saveT = setTimeout(persist, 150); if (window.FCPrivate) FCPrivate.markDirty(); };
  addEventListener("beforeunload", persist);

  // ---------- Plan yapısı ----------
  function parseItem(id, text) {
    if (!text || text.trim() === "—") return null;
    const sm = text.match(/(\d+)×(\d+)\s*dk/), bm = text.match(/(\d+)\s*BPM/);
    const parts = text.split(" · ");
    return { id, text, name: parts[0], sets: sm ? +sm[1] : 0, mins: sm ? +sm[2] : 0, bpm: bm ? +bm[1] : 0 };
  }
  const items = (d) => [
    { id: "warm", text: "Isınma · 1×3 dk", name: "Isınma (parmak, bilek, ön kol)", sets: 1, mins: 3, bpm: 0 },
    parseItem("ex1", d.ex1), parseItem("ex2", d.ex2), parseItem("riff", d.riff)
  ].filter(Boolean);
  const weekOf = (n) => (n >= 50 ? 8 : Math.ceil(n / 7));
  const weekDays = (w) => G.days.filter((d) => weekOf(d.n) === w);
  const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];
  const weekLabel = (w) => (w === 8 ? "Final" : "Hafta " + w);
  const weekTitle = (w) => {
    const f = weekDays(w).find((d) => !/TEKRAR/.test(d.focus)).focus;
    return f.split(" · ").slice(1).join(" · ").replace(/:.*$/, "");
  };
  const focusTitle = (d) => d.focus.split(" · ").slice(1).join(" · ");
  const isRepeat = (d) => /TEKRAR/.test(d.focus);

  const ds = (n) => state.days[n] || {};
  const dsw = (n) => (state.days[n] = state.days[n] || {});
  function status(n) {
    const its = items(G.days[n - 1]), done = ds(n).done || {};
    const c = its.filter((i) => done[i.id]).length;
    return { total: its.length, done: c, ratio: c / its.length, complete: c === its.length };
  }
  const currentDay = () => (G.days.find((d) => !status(d.n).complete) || G.days[TOTAL - 1]).n;

  const GUIDE_KEYS = [
    [/geçiş testi/i, "1 dakika geçiş testi"], [/16'lık/i, "Alternatif pena 16'lık"], [/alternatif pena/i, "Alternatif pena"],
    [/kromatik ters|1-3-2-4|parmak bağımsızlığı/i, "Kromatik ters / 1-3-2-4"], [/kromatik/i, "Kromatik 1-2-3-4"],
    [/tel atlama/i, "Tel atlama"], [/slide|kaydırma/i, "Slide (kaydırma)"], [/palm mute/i, "Palm mute"], [/power chord/i, "Power chord"],
    [/ritim kalıbı/i, "Ritim kalıbı A-A-Y-Y-A-Y"], [/downpicking/i, "Downpicking"], [/ska/i, "Ska ritmi"],
    [/hammer|pull-off|legato/i, "Hammer-on / Pull-off (legato)"], [/susturma/i, "Tel susturma"], [/pentatonik/i, "Minör pentatonik 1. kalıp"],
    [/gallop/i, "Gallop"], [/bend/i, "Bend"], [/vibrato/i, "Vibrato"], [/doğaçlama/i, "Doğaçlama"], [/ısınma/i, "Isınma (her gün 3 dk, süreye dahil)"],
    [/akor(?!t)|D ve G/i, "Açık akorlar"]
  ];
  const guideFor = (name) => { const k = GUIDE_KEYS.find(([re]) => re.test(name)); return k ? G.exercises.find((e) => e.name === k[1]) : null; };
  const allSongs = () => G.songs.concat(state.customSongs || []);
  const songFor = (text) => allSongs().find((s) => text.toLocaleLowerCase("tr").includes(s.title.toLocaleLowerCase("tr")));
  const SONG_ST = ["—", "Öğreniyorum", "Çalabiliyorum", "Ustalaştım"];
  const lvlClass = (l) => ({ "Kolay": "k", "Kolay–Orta": "ko", "Orta": "o", "Orta–Zor": "oz" }[l] || "ko");
  const ytUrl = (s) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(`${s.title} ${s.artist || ""} guitar lesson`);
  const tabUrl = (s) => "https://www.songsterr.com/?pattern=" + encodeURIComponent(`${s.title} ${s.artist || ""}`);

  // BPM kayıtları: { isim: [{n, bpm}] }
  function bpmLogs() {
    const out = {};
    for (const d of G.days) {
      const b = ds(d.n).bpm || {};
      for (const it of items(d)) if (b[it.id]) {
        const key = (songFor(it.text) || {}).title || (guideFor(it.name) || {}).name || it.name;
        (out[key] = out[key] || []).push({ n: d.n, bpm: b[it.id] });
      }
    }
    return out;
  }
  function totals() {
    let doneDays = 0, minutes = 0, planned = 0;
    for (const d of G.days) { if (status(d.n).complete) doneDays++; planned += d.min; }
    for (const v of Object.values(state.practice)) minutes += v;
    return { doneDays, minutes: Math.round(minutes), planned };
  }
  function streak() {
    let d = today(); if (!state.practice[iso(d)]) d = addDays(d, -1);
    let n = 0; while (state.practice[iso(d)] > 0) { n++; d = addDays(d, -1); }
    return n;
  }
  function addMinutes(n, m) {
    const s = dsw(n); s.minutes = Math.round(((s.minutes || 0) + m) * 10) / 10;
    const k = iso(today()); state.practice[k] = Math.round(((state.practice[k] || 0) + m) * 10) / 10;
  }

  // ---------- UI yardımcıları ----------
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); }
  function confetti() {
    const cs = ["#8b7bff", "#4cc9f0", "#ff6b9a", "#45d483", "#f5b942"];
    for (let i = 0; i < 60; i++) { const c = document.createElement("i"); c.className = "confetti"; c.style.left = Math.random() * 100 + "vw"; c.style.background = cs[i % 5]; c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s"; document.body.appendChild(c); setTimeout(() => c.remove(), 3600); }
  }
  const bar = (r, color) => `<div class="bar"><i style="width:${Math.round((r || 0) * 100)}%;${color ? "background:" + color : ""}"></i></div>`;
  function applyTheme() { document.documentElement.setAttribute("data-theme", state.settings.theme || "dark"); }

  // ---------- Ses: metronom + uyarı ----------
  let actx = null;
  const ac = () => { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); return actx; };
  function tone(t, freq, dur = 0.04, vol = 0.35) {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.01);
  }
  const chime = (n = 2) => { const c = ac(); for (let i = 0; i < n; i++) tone(c.currentTime + i * 0.22, 880, 0.18, 0.25); };
  const Metro = {
    on: false, beat: 0, next: 0, iv: null, beats: 4,
    get bpm() { return state.metroBpm || 80; },
    set bpm(v) { state.metroBpm = Math.max(30, Math.min(260, Math.round(v))); save(); },
    start() {
      const c = ac(); this.on = true; this.beat = 0; this.next = c.currentTime + 0.08;
      clearInterval(this.iv); this.iv = setInterval(() => this.sched(), 25); drawMetro();
    },
    stop() { this.on = false; clearInterval(this.iv); drawMetro(); },
    toggle() { this.on ? this.stop() : this.start(); },
    sched() {
      const c = ac();
      while (this.next < c.currentTime + 0.12) {
        const accent = this.beat % this.beats === 0, b = this.beat % this.beats, t = this.next;
        tone(t, accent ? 1600 : 1050);
        setTimeout(() => { const dots = $$(".beats i"); dots.forEach((d, i) => d.classList.toggle("on", i === b)); }, Math.max(0, (t - c.currentTime) * 1000));
        this.next += 60 / this.bpm; this.beat++;
      }
    }
  };
  let taps = [];
  function tapTempo() {
    const now = performance.now(); taps = taps.filter((t) => now - t < 2500); taps.push(now);
    if (taps.length >= 2) { const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); Metro.bpm = 60000 / iv; drawMetro(); }
  }

  // ---------- Set zamanlayıcı ----------
  const REST = 25;
  let ST = null; // {n, item, set, phase, left, running, last}
  function stStart(n, itemId) {
    const it = items(G.days[n - 1]).find((i) => i.id === itemId);
    if (!it || !it.sets) return;
    ST = { n, item: it, set: 1, phase: "work", left: it.mins * 60, running: true, last: performance.now(), worked: 0 };
    if (it.bpm) { Metro.bpm = it.bpm; Metro.start(); }
    chime(1); drawSet(); toast(`${it.name}: ${it.sets} set × ${it.mins} dk başladı`);
  }
  function stTick() {
    if (!ST || !ST.running) return;
    const now = performance.now(), dt = (now - ST.last) / 1000; ST.last = now;
    ST.left -= dt; if (ST.phase === "work") ST.worked += dt;
    if (ST.left <= 0) {
      if (ST.phase === "work") {
        if (ST.set >= ST.item.sets) return stFinish(true);
        ST.phase = "rest"; ST.left = REST; Metro.stop(); chime(2);
      } else {
        ST.set++; ST.phase = "work"; ST.left = ST.item.mins * 60; chime(1);
        if (ST.item.bpm) Metro.start();
      }
    }
    drawSet();
  }
  function stFinish(completed) {
    const s = ST; ST = null; Metro.stop();
    const mins = Math.round(s.worked / 6) / 10;
    if (mins >= 0.5) addMinutes(s.n, mins);
    if (completed) {
      chime(3);
      const before = status(s.n).complete;
      dsw(s.n).done = Object.assign(ds(s.n).done || {}, { [s.item.id]: true });
      afterToggle(s.n, before);
      toast(`✓ ${s.item.name} tamam · ${mins} dk eklendi`);
    } else if (mins >= 0.5) toast(`${mins} dk kaydedildi`);
    save(); render();
  }
  setInterval(stTick, 250);

  // ---------- Görünümler ----------
  const views = {};

  views.gun = (param) => {
    const n = Math.max(1, Math.min(TOTAL, +param || currentDay()));
    const d = G.days[n - 1], st = status(n), s = ds(n), w = weekOf(n);
    const done = s.done || {}, bpm = s.bpm || {};
    const cur = currentDay();
    const strip = `<div class="week-strip">${weekDays(w).map((x) => {
      const t = status(x.n);
      return `<a href="#gun/${x.n}" class="${x.n === n ? "sel" : ""} ${x.n === cur ? "today" : ""}" data-tip="Gün ${x.n} · ${esc(focusTitle(x))}\n${t.done}/${t.total}">
        <span class="b">Gün</span><span class="d">${x.n}</span><span class="b">${isRepeat(x) ? "Tekrar" : x.n >= 50 ? "Final" : esc(weekTitle(w).split(/[ &]/)[0])}</span>
        <div class="mini"><i style="width:${Math.round(t.ratio * 100)}%"></i></div></a>`;
    }).join("")}${w === 8 ? "<span></span><span></span><span></span>" : ""}</div>`;

    const taskHTML = items(d).map((it) => {
      const g = guideFor(it.name), song = it.id === "riff" ? songFor(it.text) : null;
      const sub = it.text.split(" · ").slice(1).join(" · ");
      return `<li class="task ${done[it.id] ? "done" : ""}">
        <span class="check" data-action="toggle" data-n="${n}" data-id="${it.id}" role="checkbox" aria-checked="${!!done[it.id]}" tabindex="0"></span>
        <span class="task-body">
          <span class="task-text" data-action="toggle" data-n="${n}" data-id="${it.id}">${esc(it.name)}</span>
          ${sub ? `<span class="task-sub">${esc(sub)}</span>` : ""}
          <span class="task-tools">
            ${it.sets ? `<button class="btn small" data-action="set-start" data-n="${n}" data-id="${it.id}" ${ST ? "disabled" : ""}>▶ ${it.sets}×${it.mins} dk başlat</button>` : ""}
            ${it.bpm ? `<button class="btn small" data-action="metro-set" data-bpm="${it.bpm}" title="Metronomu ${it.bpm} BPM'e ayarla">🎵 ${it.bpm} BPM</button>` : ""}
            ${g ? `<button class="btn small" data-action="guide" data-g="${esc(g.name)}" aria-expanded="false">? Nasıl</button>` : ""}
            ${song ? `<span class="chip song">${esc(song.artist || "")}${song.level ? " · " + esc(song.level) : ""}</span><a class="btn small" href="${ytUrl(song)}" target="_blank" rel="noopener">▶ YouTube</a><a class="btn small" href="${tabUrl(song)}" target="_blank" rel="noopener">Tab</a>` : ""}
            ${it.bpm || song ? `<label class="bpm-log">temiz tempo <input type="number" min="20" max="300" step="5" value="${bpm[it.id] || ""}" placeholder="BPM" data-change="bpm" data-n="${n}" data-id="${it.id}"></label>` : ""}
          </span>
          <div class="guide" data-guide-for="${esc(g ? g.name : "")}" hidden></div>
        </span></li>`;
    }).join("");

    const callouts = [];
    if (n === 7 || n === 28) callouts.push(`🎙 <b>Kayıt günü:</b> kendini telefonla kaydet${n === 28 ? " ve Gün 7 kaydıyla karşılaştır" : " ve sakla"}. Notlarına kaydın nerede olduğunu yaz.`);
    if (n === 21) callouts.push(`⏱ <b>1 dakika geçiş testi:</b> skorunu aşağıdaki nota yaz, haftadan haftaya artışı gör.`);
    if (n === 35) callouts.push(`🚀 <b>Thunderstruck:</b> ulaştığın en yüksek temiz BPM'i "temiz tempo" kutusuna gir.`);
    if (n === 53) callouts.push(`🏁 <b>Son gün!</b> Favori 3 parçanı kaydet, Gün 7 kaydını dinle ve sonraki hedef şarkını <a href="#riffler">Riffler</a>'e ekle.`);
    if (isRepeat(d) && n !== 7 && n !== 28) callouts.push(`↻ <b>Tekrar günü:</b> haftanın riff'lerini sakin tempoda çal, yeni bir şey ekleme.`);

    const minutes = s.minutes || 0;
    return `
      <div class="hero">
        <div><div class="sub">${weekLabel(w)} · ${esc(weekTitle(w))}${n === cur ? " · sıradaki gün" : ""}</div><h1>Gün ${n} <span class="muted" style="font-weight:400;font-size:1rem">/ ${TOTAL}</span></h1></div>
        <div class="day-nav no-print">
          <a class="btn small" href="#gun/${Math.max(1, n - 1)}" title="Önceki gün (←)">←</a>
          <select data-change="goto-day" aria-label="Gün seç" style="width:auto">${G.days.map((x) => `<option value="${x.n}" ${x.n === n ? "selected" : ""}>Gün ${x.n}${status(x.n).complete ? " ✓" : ""}</option>`).join("")}</select>
          <a class="btn small" href="#gun/${Math.min(TOTAL, n + 1)}" title="Sonraki gün (→)">→</a>
          ${n !== cur ? `<a class="btn small" href="#bugun">Sıradaki gün</a>` : ""}
        </div>
      </div>
      ${strip}
      <div class="layout-today">
        <div class="stack">
          <div class="card">
            <div class="block-head"><span class="block-badge" style="background:${isRepeat(d) ? "#b97400" : n >= 50 ? "#e34948" : "#6250d6"}">${isRepeat(d) ? "Tekrar" : n >= 50 ? "Final" : "Çalışma"}</span><span class="tag">${weekLabel(w)}</span><span class="tag">${d.min} dk</span>${s.completedAt ? `<span class="tag good">✓ ${fmt(parseISO(s.completedAt))}</span>` : ""}</div>
            <div class="topic">${esc(focusTitle(d))}</div>
            ${callouts.map((c) => `<div class="callout warn">${c}</div>`).join("")}
            <ul class="tasks">${taskHTML}</ul>
            ${st.complete ? `<div class="done-banner">🤘 Gün ${n} tamam! ${n < TOTAL ? `<a href="#gun/${n + 1}" style="margin-left:auto">Gün ${n + 1} →</a>` : ""}</div>` : ""}
          </div>
          <div class="card">
            <div class="card-title"><h3>📝 Notlarım</h3><span class="saved-hint" id="note-saved">Kaydedildi</span></div>
            <textarea rows="6" data-input="note" data-n="${n}" placeholder="Neresi zordu? Hangi tempoda temiz çıktı? Geçiş testi skorun? Kaydın nerede?">${esc(s.note || "")}</textarea>
            <div style="margin-top:10px"><div class="muted" style="font-size:.82rem;margin-bottom:4px">Bugün nasıl hissettirdi?</div>
              <div class="energy">${["😫", "😕", "😐", "🙂", "🤘"].map((e, i) => `<button type="button" class="${s.feel === i + 1 ? "on" : ""}" data-action="feel" data-n="${n}" data-v="${i + 1}">${e}</button>`).join("")}</div>
            </div>
          </div>
        </div>
        <div class="stack">
          ${metroCard()}
          ${setCard()}
          <div class="card">
            <div class="card-title"><h3>⏱ Süre</h3><span class="tag ${minutes >= d.min ? "good" : ""}">${minutes} / ${d.min} dk</span></div>
            ${bar(Math.min(1, minutes / d.min), "#7b68ee")}
            <div class="hours-input"><label class="muted" style="font-size:.85rem" for="mins">Elle gir:</label>
              <input id="mins" type="number" min="0" max="300" step="1" value="${minutes || ""}" placeholder="0" data-change="minutes" data-n="${n}"><span class="muted">dk</span></div>
            <div class="muted" style="font-size:.78rem;margin-top:8px;text-align:center">Set zamanlayıcısı süreyi otomatik ekler. Gün bitince boşsa plan süresi yazılır.</div>
          </div>
        </div>
      </div>`;
  };

  function metroCard() {
    return `<div class="card metro" id="metro-card">
      <div class="card-title"><h3>🎵 Metronom</h3><span class="muted" style="font-size:.78rem"><span class="kbd">Boşluk</span> başlat/durdur</span></div>
      <div class="bpm" id="metro-bpm">${Metro.bpm}<small>BPM</small></div>
      <div class="beats">${[0, 1, 2, 3].map((i) => `<i class="${i === 0 ? "accent" : ""}"></i>`).join("")}</div>
      <input type="range" min="30" max="220" step="1" value="${Metro.bpm}" data-input="metro-range" aria-label="Tempo">
      <div class="row-btns">
        <button class="btn small" data-action="metro-add" data-v="-5">−5</button>
        <button class="btn ${Metro.on ? "" : "primary"}" data-action="metro-toggle" id="metro-btn">${Metro.on ? "⏸ Durdur" : "▶ Başlat"}</button>
        <button class="btn small" data-action="metro-add" data-v="5">+5</button>
        <button class="btn small" data-action="tap">Tap</button>
      </div>
    </div>`;
  }
  function drawMetro() {
    const b = $("#metro-bpm"); if (b) b.innerHTML = `${Metro.bpm}<small>BPM</small>`;
    const r = $('[data-input="metro-range"]'); if (r && document.activeElement !== r) r.value = Metro.bpm;
    const btn = $("#metro-btn"); if (btn) { btn.textContent = Metro.on ? "⏸ Durdur" : "▶ Başlat"; btn.classList.toggle("primary", !Metro.on); }
    if (!Metro.on) $$(".beats i").forEach((d) => d.classList.remove("on"));
  }
  function setCard() {
    return `<div class="card settimer" id="set-card">${setInner()}</div>`;
  }
  function setInner() {
    if (!ST) return `<div class="card-title"><h3>🔁 Set zamanlayıcı</h3></div>
      <div class="muted" style="font-size:.88rem">Bir egzersizin yanındaki <b>▶ başlat</b>'a bas: setler, aralardaki ${REST} sn dinlenme ve metronom otomatik yönetilir. Son set bitince egzersiz işaretlenir.</div>`;
    const m = Math.max(0, Math.ceil(ST.left)), mm = String(Math.floor(m / 60)).padStart(2, "0"), ss = String(m % 60).padStart(2, "0");
    return `<div class="card-title"><h3>🔁 ${esc(ST.item.name)}</h3><span class="tag">Gün ${ST.n}</span></div>
      <div style="text-align:center"><span class="phase ${ST.phase}">${ST.phase === "work" ? `Set ${ST.set} / ${ST.item.sets} · çal` : "Dinlen · eli gevşet"}</span></div>
      <div class="clock">${mm}:${ss}</div>
      <div class="set-dots">${Array.from({ length: ST.item.sets }, (_, i) => `<i class="${i + 1 < ST.set || (i + 1 === ST.set && ST.phase === "rest") ? "done" : i + 1 === ST.set ? "cur" : ""}"></i>`).join("")}</div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn" data-action="set-pause">${ST.running ? "⏸ Duraklat" : "▶ Devam"}</button>
        <button class="btn" data-action="set-skip">⏭ Atla</button>
        <button class="btn small danger" data-action="set-stop">Bitir</button>
      </div>`;
  }
  function drawSet() { const c = $("#set-card"); if (c) c.innerHTML = setInner(); }

  // ===== Plan =====
  views.plan = () => {
    const cur = currentDay(), t = totals();
    const rows = WEEKS.map((w) => {
      const days = weekDays(w); const c = days.filter((d) => status(d.n).complete).length;
      const mins = days.reduce((a, d) => a + (ds(d.n).minutes || 0), 0), plan = days.reduce((a, d) => a + d.min, 0);
      return `<div class="week-row">
        <div class="wt"><b>${weekLabel(w)}</b><small>${esc(weekTitle(w))}</small></div>
        <div class="day-chips">${days.map((d) => { const s = status(d.n); return `<a href="#gun/${d.n}" class="day-chip ${s.complete ? "done" : s.done ? "part" : ""} ${d.n === cur ? "cur" : ""} ${isRepeat(d) ? "rep" : ""}" data-tip="Gün ${d.n} · ${esc(focusTitle(d))}\n${s.done}/${s.total} · ${ds(d.n).minutes || 0} dk">${d.n}</a>`; }).join("")}</div>
        <div><small class="muted">${c}/${days.length} gün · ${Math.round(mins)}/${plan} dk</small>${bar(c / days.length, "#7b68ee")}</div>
      </div>`;
    }).join("");
    return `<div class="hero"><div><div class="sub">${t.doneDays}/${TOTAL} gün tamam · ${t.minutes} dk çalışıldı</div><h1>Plan</h1></div><a class="btn primary" href="#gun/${cur}">Sıradaki gün: ${cur} →</a></div>
      <div class="card">${rows}
        <div class="legend" style="margin:14px 0 0"><span><span class="sw" style="background:var(--surface-2);border:1px solid var(--border)"></span>Başlanmadı</span><span><span class="sw" style="background:#2b2a66"></span>Yarım</span><span><span class="sw" style="background:#7b68ee"></span>Tamam</span><span><span class="sw" style="outline:2px solid #ff6b9a"></span>Sıradaki</span><span>↻ Tekrar günü</span></div>
      </div>
      <div class="card"><h3>Nasıl çalışır?</h3><p class="muted" style="margin:0">Plan takvime değil gün sırasına bağlı: bir günü kaçırırsan sıradaki gün seni bekler, sıkıştırma. <b>3×3 dk</b> = 3 set, her set 3 dakika, setler arası 20–30 sn dinlenme. BPM yazan yerde metronom kullan; temiz çalamıyorsan 5 BPM düşür. Isınma (3 dk) süreye dahil.</p></div>`;
  };

  // ===== Riffler =====
  views.riffler = () => {
    const logs = bpmLogs();
    const cards = allSongs().map((s, i) => {
      const st = (state.songs[s.title] || {}).status || 0, note = (state.songs[s.title] || {}).note || "";
      const best = logs[s.title] ? Math.max(...logs[s.title].map((x) => x.bpm)) : 0;
      return `<div class="card song-card song-status-${st}">
        <div class="head"><div><h3>${esc(s.title)}</h3><div class="muted" style="font-size:.88rem">${esc(s.artist || "")}</div></div>
          <select data-change="song-status" data-song="${esc(s.title)}">${SONG_ST.map((x, j) => `<option value="${j}" ${st === j ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="task-tools" style="margin:8px 0">${s.level ? `<span class="lvl ${lvlClass(s.level)}">${esc(s.level)}</span>` : ""}${s.days ? `<span class="chip">Gün ${esc(s.days)}</span>` : ""}${s.tech ? `<span class="chip">${esc(s.tech)}</span>` : ""}${best ? `<span class="chip bpm">en iyi ${best} BPM</span>` : ""}${s.custom ? `<span class="chip song">hedef</span>` : ""}</div>
        ${s.note ? `<div class="muted" style="font-size:.85rem;margin-bottom:8px">💡 ${esc(s.note)}</div>` : ""}
        <input type="text" data-input="song-note" data-song="${esc(s.title)}" value="${esc(note)}" placeholder="Notun (hangi ders, hangi bölüm zor…)" style="font-size:.85rem">
        <div class="btn-row" style="margin-top:8px"><a class="btn small" href="${ytUrl(s)}" target="_blank" rel="noopener">▶ YouTube dersi</a><a class="btn small" href="${tabUrl(s)}" target="_blank" rel="noopener">Songsterr tab</a>${s.custom ? `<button class="btn small danger" data-action="del-song" data-song="${esc(s.title)}">Sil</button>` : ""}</div>
      </div>`;
    }).join("");
    const counts = [1, 2, 3].map((j) => allSongs().filter((s) => (state.songs[s.title] || {}).status === j).length);
    return `<div class="hero"><div><div class="sub">${counts[0]} öğreniyorum · ${counts[1]} çalabiliyorum · ${counts[2]} ustalaştım</div><h1>Riffler</h1></div></div>
      <form class="card add-task" data-form="add-song" style="margin-bottom:16px"><input type="text" name="title" placeholder="Yeni hedef şarkı" required><input type="text" name="artist" placeholder="Sanatçı" style="max-width:220px"><button class="btn primary" type="submit">Ekle</button></form>
      <div class="grid grid-2">${cards}</div>`;
  };

  // ===== Egzersizler =====
  views.egzersizler = () => {
    const logs = bpmLogs();
    const usage = {}; G.days.forEach((d) => items(d).forEach((it) => { const g = guideFor(it.name); if (g) (usage[g.name] = usage[g.name] || []).push(d.n); }));
    return `<div class="hero"><div><div class="sub">Excel'deki egzersiz rehberi · günlerdeki "? Nasıl" düğmeleri buraya bağlı</div><h1>Egzersizler</h1></div></div>
      <div class="grid grid-2">${G.exercises.map((e) => {
        const u = [...new Set(usage[e.name] || [])], l = logs[e.name], best = l ? Math.max(...l.map((x) => x.bpm)) : 0;
        return `<div class="card"><h3>${esc(e.name)}</h3><p>${esc(e.how)}</p>${e.tip ? `<div class="callout warn" style="font-size:.88rem">⚠ ${esc(e.tip)}</div>` : ""}
          <div class="task-tools">${u.length ? `<span class="chip">${u.length} gün</span>${u.slice(0, 8).map((n) => `<a class="chip" href="#gun/${n}">G${n}</a>`).join("")}${u.length > 8 ? `<span class="chip">…</span>` : ""}` : ""}${best ? `<span class="chip bpm">en iyi ${best} BPM</span>` : ""}</div></div>`;
      }).join("")}</div>`;
  };

  // ===== İstatistik =====
  views.istatistik = () => {
    const t = totals(), logs = bpmLogs();
    const learned = allSongs().filter((s) => ((state.songs[s.title] || {}).status || 0) >= 2).length;
    const thunder = logs["Thunderstruck"] ? Math.max(...logs["Thunderstruck"].map((x) => x.bpm)) : 0;
    const names = Object.keys(logs).sort((a, b) => logs[b].length - logs[a].length);
    const sel = views.istatistik.sel && logs[views.istatistik.sel] ? views.istatistik.sel : names[0];
    const days = Object.keys(state.practice).filter((k) => state.practice[k] > 0).length;
    return `<div class="hero"><div><div class="sub">Gitar yolculuğunun özeti</div><h1>İstatistik</h1></div></div>
      <div class="kpis">
        <div class="card kpi"><div class="l">Tamamlanan gün</div><div class="v">${t.doneDays}/${TOTAL}</div><div class="s">%${Math.round((t.doneDays / TOTAL) * 100)}</div></div>
        <div class="card kpi"><div class="l">Toplam çalışma</div><div class="v">${t.minutes} dk</div><div class="s">plan: ${t.planned} dk</div></div>
        <div class="card kpi"><div class="l">Seri</div><div class="v">${streak()} 🔥</div><div class="s">art arda çalışılan gün</div></div>
        <div class="card kpi"><div class="l">Çalışılan gün</div><div class="v">${days}</div><div class="s">takvimde</div></div>
        <div class="card kpi"><div class="l">Şarkılar</div><div class="v">${learned}</div><div class="s">çalabiliyorum+</div></div>
        <div class="card kpi"><div class="l">Thunderstruck</div><div class="v">${thunder || "–"}</div><div class="s">en iyi temiz BPM · orijinal 130+</div></div>
      </div>
      <div class="card"><div class="card-title"><h3>Haftalık dakika</h3></div>
        <div class="legend"><span><span class="sw" style="background:#7b68ee"></span>Çalışılan</span><span><span class="line" style="background:var(--text)"></span>Plan</span></div>
        <div class="chart">${weekChart()}</div></div>
      <div class="card"><div class="card-title"><h3>Tempo gelişimi</h3>
        ${names.length ? `<select data-change="bpm-sel" style="width:auto">${names.map((n) => `<option ${n === sel ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>` : ""}</div>
        <div class="chart">${bpmChart(sel ? logs[sel] : [])}</div>
        <div class="muted" style="font-size:.8rem">Günlerdeki "temiz tempo" kutularına girdiğin BPM'ler.</div></div>`;
  };
  function weekChart() {
    const W = 760, H = 220, pl = 36, pr = 10, pt = 12, pb = 26;
    const data = WEEKS.map((w) => ({ w, m: weekDays(w).reduce((a, d) => a + (ds(d.n).minutes || 0), 0), p: weekDays(w).reduce((a, d) => a + d.min, 0) }));
    const maxY = Math.max(250, ...data.map((d) => d.m)) * 1.08, iw = W - pl - pr, ih = H - pt - pb, bw = iw / data.length;
    const y = (v) => pt + ih - (v / maxY) * ih; let g = "";
    for (let v = 0; v <= maxY; v += 50) g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    data.forEach((d, i) => {
      const x = pl + i * bw, w = bw - 18, cx = x + 9, h = y(0) - y(d.m);
      if (d.m > 0) g += `<path d="M${cx},${y(0)} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${w - 8} q4,0 4,4 v${Math.max(0, h - 4)} z" fill="#7b68ee"/>`;
      g += `<line x1="${cx - 2}" x2="${cx + w + 2}" y1="${y(d.p)}" y2="${y(d.p)}" stroke="var(--text)" stroke-width="2"/>`;
      g += `<text class="axis" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${d.w === 8 ? "Final" : "H" + d.w}</text>`;
      g += `<rect class="hit" x="${x}" y="${pt}" width="${bw}" height="${ih}" data-tip="${weekLabel(d.w)} · ${esc(weekTitle(d.w))}\n${Math.round(d.m)} / ${d.p} dk"/>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Haftalık dakika grafiği">${g}</svg>`;
  }
  function bpmChart(pts) {
    const W = 760, H = 220, pl = 36, pr = 14, pt = 12, pb = 26;
    if (!pts || !pts.length) return `<svg viewBox="0 0 ${W} 80"><text x="${W / 2}" y="44" text-anchor="middle" fill="var(--muted)" font-size="13">Henüz tempo kaydı yok — bir egzersizin yanındaki "temiz tempo" kutusuna BPM gir.</text></svg>`;
    const lo = Math.max(0, Math.min(...pts.map((p) => p.bpm)) - 15), hi = Math.max(...pts.map((p) => p.bpm)) + 15;
    const iw = W - pl - pr, ih = H - pt - pb, x = (n) => pl + ((n - 1) / (TOTAL - 1)) * iw, y = (v) => pt + ih - ((v - lo) / (hi - lo)) * ih;
    let g = "";
    const step = hi - lo > 80 ? 20 : 10;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    [1, 7, 14, 21, 28, 35, 42, 49, 53].forEach((n) => (g += `<text class="axis" x="${x(n)}" y="${H - 8}" text-anchor="middle">${n}</text>`));
    const sorted = [...pts].sort((a, b) => a.n - b.n);
    g += `<path d="${sorted.map((p, i) => `${i ? "L" : "M"}${x(p.n)},${y(p.bpm)}`).join(" ")}" fill="none" stroke="#4cc9f0" stroke-width="2"/>`;
    sorted.forEach((p) => { g += `<circle cx="${x(p.n)}" cy="${y(p.bpm)}" r="4.5" fill="#4cc9f0" stroke="var(--surface)" stroke-width="2"/><circle class="hit" cx="${x(p.n)}" cy="${y(p.bpm)}" r="12" data-tip="Gün ${p.n}: ${p.bpm} BPM"/>`; });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tempo gelişimi">${g}</svg>`;
  }

  // ===== Notlar =====
  views.notlar = () => {
    const list = G.days.filter((d) => (ds(d.n).note || "").trim()).reverse();
    const feel = ["", "😫", "😕", "😐", "🙂", "🤘"];
    return `<div class="hero"><div><div class="sub">Günlere yazdığın notlar</div><h1>Notlar</h1></div></div>
      <div class="card">${list.map((d) => `<div class="entry"><div class="entry-head"><a href="#gun/${d.n}">Gün ${d.n} · ${esc(focusTitle(d))}</a>${ds(d.n).completedAt ? `<span class="tag">${fmt(parseISO(ds(d.n).completedAt))}</span>` : ""}${ds(d.n).feel ? `<span>${feel[ds(d.n).feel]}</span>` : ""}</div><div class="entry-text">${esc(ds(d.n).note)}</div></div>`).join("") || `<div class="empty-state">Henüz not yok. Her günün "Notlarım" alanına yazdıkların burada toplanır.</div>`}</div>`;
  };

  // ---------- Ayarlar ----------
  function renderSettings() {
    $("#settings").innerHTML = `
      <div class="dhead"><h2 style="margin:0">Ayarlar</h2><button class="icon-btn" data-action="close-settings" aria-label="Kapat">✕</button></div>
      <div class="dbody">
        <section><h3>Tema</h3><div class="seg">${[["dark", "Uzay (koyu)"], ["light", "Açık"]].map(([k, v]) => `<button class="${state.settings.theme === k ? "on" : ""}" data-action="theme" data-t="${k}">${v}</button>`).join("")}</div></section>
        <section><h3>Yedek</h3><div class="btn-row"><button class="btn" data-action="export">⬇ Yedek al (JSON)</button><label class="btn">⬆ Yedekten yükle<input type="file" accept=".json,application/json" data-change="import" hidden></label></div></section>
        <section id="sync-section">${window.FCPrivate ? FCPrivate.settingsHTML() : ""}</section>
        <section><h3>Sıfırla</h3><button class="btn danger" data-action="reset">Tüm gitar verisini sil</button></section>
      </div>`;
  }

  // ---------- Olaylar ----------
  function afterToggle(n, before) {
    const st = status(n), s = dsw(n);
    if (st.complete && !before) {
      // "Bugün" görünümündeysek bitirdiğimiz günde kal (yoksa sıradaki güne atlardı)
      if (route().name === "gun" && !route().param) history.replaceState(null, "", "#gun/" + n);
      s.completedAt = iso(today());
      if (!s.minutes) addMinutes(n, G.days[n - 1].min);
      confetti(); toast(n === TOTAL ? "🏁 53 günü bitirdin! Efsane." : `🤘 Gün ${n} tamam!`);
    } else if (!st.complete) delete s.completedAt;
  }
  const actions = {
    toggle(el) {
      const n = +el.dataset.n, id = el.dataset.id, s = dsw(n), before = status(n).complete;
      s.done = s.done || {}; s.done[id] = !s.done[id]; if (!s.done[id]) delete s.done[id];
      afterToggle(n, before); save(); render();
    },
    feel(el) { const s = dsw(+el.dataset.n), v = +el.dataset.v; s.feel = s.feel === v ? undefined : v; save(); render(); },
    guide(el) {
      const box = el.closest(".task-body").querySelector(".guide"), g = G.exercises.find((e) => e.name === el.dataset.g);
      if (!box.hidden) { box.hidden = true; el.setAttribute("aria-expanded", "false"); return; }
      box.innerHTML = `<b>${esc(g.name)}</b>${esc(g.how)}${g.tip ? `<div class="tip">⚠ ${esc(g.tip)}</div>` : ""}`; box.hidden = false; el.setAttribute("aria-expanded", "true");
    },
    "metro-toggle"() { Metro.toggle(); },
    "metro-add"(el) { Metro.bpm = Metro.bpm + +el.dataset.v; drawMetro(); },
    "metro-set"(el) { Metro.bpm = +el.dataset.bpm; drawMetro(); if (!Metro.on) Metro.start(); toast(`Metronom ${Metro.bpm} BPM`); },
    tap() { tapTempo(); },
    "set-start"(el) { stStart(+el.dataset.n, el.dataset.id); render(); },
    "set-pause"() { if (!ST) return; ST.running = !ST.running; ST.last = performance.now(); if (!ST.running) Metro.stop(); else if (ST.phase === "work" && ST.item.bpm) Metro.start(); drawSet(); },
    "set-skip"() { if (ST) { ST.left = 0; ST.last = performance.now(); stTick(); } },
    "set-stop"() { if (ST) stFinish(false); },
    "del-song"(el) { if (!confirm("Bu şarkı silinsin mi?")) return; state.customSongs = state.customSongs.filter((s) => s.title !== el.dataset.song); save(); render(); },
    "open-settings"() { renderSettings(); $("#settings").showModal(); },
    "close-settings"() { $("#settings").close(); },
    theme(el) { state.settings.theme = el.dataset.t; applyTheme(); save(); renderSettings(); },
    export() {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
      a.download = `gitar-gunlugu-${iso(today())}.json`; a.click();
    },
    reset() {
      if (!confirm("Tüm gitar ilerlemen ve notların silinecek. Emin misin?") || !confirm("Geri alınamaz. Silinsin mi?")) return;
      state = defaultState(); save(); persist(); $("#settings").close(); render();
    }
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]"); if (!el || !started) return;
    if (el.tagName === "LABEL") e.preventDefault();
    actions[el.dataset.action] && actions[el.dataset.action](el, e);
  });
  const hint = () => { const h = $("#note-saved"); if (h) { h.classList.add("show"); clearTimeout(hint.t); hint.t = setTimeout(() => h.classList.remove("show"), 1200); } };
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-input]"); if (!el || !started) return;
    const k = el.dataset.input;
    if (k === "note") { dsw(+el.dataset.n).note = el.value; save(); hint(); }
    else if (k === "metro-range") { Metro.bpm = +el.value; drawMetro(); }
    else if (k === "song-note") { const s = (state.songs[el.dataset.song] = state.songs[el.dataset.song] || {}); s.note = el.value; save(); }
  });
  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-change]"); if (!el || !started) return;
    const k = el.dataset.change;
    if (k === "goto-day") location.hash = "#gun/" + el.value;
    else if (k === "bpm") { const s = dsw(+el.dataset.n); s.bpm = s.bpm || {}; const v = parseInt(el.value, 10); if (v > 0) s.bpm[el.dataset.id] = v; else delete s.bpm[el.dataset.id]; save(); toast(v > 0 ? `${v} BPM kaydedildi` : "Tempo silindi"); }
    else if (k === "minutes") { const n = +el.dataset.n, s = dsw(n), v = Math.max(0, parseFloat(el.value) || 0), diff = v - (s.minutes || 0); s.minutes = v; const t = iso(today()); state.practice[t] = Math.max(0, (state.practice[t] || 0) + diff); save(); render(); }
    else if (k === "song-status") { const s = (state.songs[el.dataset.song] = state.songs[el.dataset.song] || {}); s.status = +el.value; save(); render(); if (+el.value === 3) confetti(); }
    else if (k === "bpm-sel") { views.istatistik.sel = el.value; render(); }
    else if (k === "import") {
      const f = el.files[0]; if (!f) return;
      f.text().then((t) => { const d = JSON.parse(t); if (!d || !d.days) throw 0; if (!confirm("Mevcut gitar verisi yedektekiyle değiştirilsin mi?")) return; state = Object.assign(defaultState(), d); save(); persist(); renderSettings(); render(); toast("Yedek yüklendi ✓"); }).catch(() => toast("Geçerli bir yedek değil"));
    }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest('[data-form="add-song"]'); if (!f) return; e.preventDefault();
    const title = f.title.value.trim(); if (!title) return;
    if (allSongs().some((s) => s.title.toLowerCase() === title.toLowerCase())) return toast("Bu şarkı zaten listede");
    state.customSongs.push({ title, artist: f.artist.value.trim(), custom: true }); save(); render(); toast("Hedef şarkı eklendi 🎯");
  });
  document.addEventListener("keydown", (e) => {
    if (!started || e.target.matches("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === " " && !e.target.closest(".check")) { e.preventDefault(); Metro.toggle(); return; }
    if ((e.key === " " || e.key === "Enter") && e.target.closest(".check")) { e.preventDefault(); e.target.click(); return; }
    const r = route();
    if (r.name === "gun" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      const n = +r.param || currentDay(); location.hash = "#gun/" + Math.max(1, Math.min(TOTAL, n + (e.key === "ArrowLeft" ? -1 : 1)));
    }
  });
  const tip = $("#tooltip");
  document.addEventListener("mouseover", (e) => { const el = e.target.closest("[data-tip]"); if (!el) { tip.hidden = true; return; } tip.textContent = el.getAttribute("data-tip"); tip.hidden = false; });
  document.addEventListener("mousemove", (e) => { if (tip.hidden) return; let x = e.clientX + 14, y = e.clientY + 14; if (x + tip.offsetWidth > innerWidth - 8) x = e.clientX - tip.offsetWidth - 14; if (y + tip.offsetHeight > innerHeight - 8) y = e.clientY - tip.offsetHeight - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; });

  // ---------- Yönlendirme ----------
  function route() {
    const [name, param] = (location.hash || "#bugun").slice(1).split("/");
    if (name === "bugun" || !views[name]) return { name: "gun", nav: "bugun", param: null };
    return { name, nav: name === "gun" ? (+param === currentDay() ? "bugun" : "") : name, param };
  }
  let last = "";
  function render() {
    if (!started) return;
    const r = route();
    $("#main").innerHTML = views[r.name](r.param);
    $$(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === r.nav));
    const t = totals();
    $("#progress-strip").innerHTML = `<i style="width:${(t.doneDays / TOTAL) * 100}%"></i>`;
    $("#brand-sub").textContent = `Gün ${currentDay()}/${TOTAL} · ${t.minutes} dk`;
    if (location.hash !== last) { last = location.hash; scrollTo(0, 0); }
  }
  addEventListener("hashchange", render);

  // ---------- Herkese açık özet (not içermez) ----------
  function summary() {
    const t = totals(), cur = currentDay(), d = G.days[cur - 1], w = weekOf(cur);
    const song = items(d).map((i) => i.id === "riff" && songFor(i.text)).find(Boolean) || null;
    return {
      updated: new Date().toISOString(), percent: Math.round((t.doneDays / TOTAL) * 1000) / 10,
      daysDone: t.doneDays, totalDays: TOTAL, currentDay: cur, status: t.doneDays === TOTAL ? "done" : t.doneDays ? "running" : "before",
      week: w, weekLabel: w === 8 ? "Final" : "Week " + w, minutes: t.minutes, streak: streak(),
      currentSong: song ? `${song.title}${song.artist ? " — " + song.artist : ""}` : null,
      songsLearned: allSongs().filter((s) => ((state.songs[s.title] || {}).status || 0) >= 2).length, songsTotal: allSongs().length,
      weeks: WEEKS.map((x) => ({ label: x === 8 ? "F" : String(x), done: weekDays(x).filter((dd) => status(dd.n).complete).length, total: weekDays(x).length }))
    };
  }
  window.PrivateApp = {
    storeKey: STORE_KEY, getState: () => state, summary, toast,
    replaceState(obj) { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); loadState(); if (started) { applyTheme(); render(); } },
    refreshSettings() { const el = $("#sync-section"); if (el && window.FCPrivate) el.innerHTML = FCPrivate.settingsHTML(); }
  };
  function start() { if (started) return; started = true; loadState(); applyTheme(); render(); }
  applyTheme();
  if (window.FCPrivate) FCPrivate.gate(start); else start();
})();
