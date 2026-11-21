/* Higgs Günlüğü — etkileşimli çalışma programı takipçisi
 * Saf JavaScript, derleme gerektirmez. Tüm veri localStorage'da tutulur. */
(() => {
  "use strict";

  const P = window.PROGRAM;
  const STORE_KEY = "higgs-gunlugu-v1";
  const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  const DAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const BLOCK_COLORS = {
    "Teori": "#2a78d6", "Problem": "#d95926", "Python": "#13865d", "Proje + not": "#6250d6",
    "Sınama + not": "#6250d6", "Dinlenme": "#7a7873", "Sınav": "#b97400", "Vize": "#b97400"
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- Tarih yardımcıları ----------
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const diffDays = (a, b) => Math.round((parseISO(iso(a)) - parseISO(iso(b))) / 864e5);
  const fmt = (d, o = { day: "numeric", month: "long", year: "numeric" }) => d.toLocaleDateString("tr-TR", o);
  const fmtShort = (d) => fmt(d, { day: "numeric", month: "short" });
  const todayOverride = new URLSearchParams(location.search).get("bugun");
  const today = () => (todayOverride ? parseISO(todayOverride) : parseISO(iso(new Date())));
  const dowOf = (d) => (d.getDay() + 6) % 7; // 0 = Pazartesi

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const round1 = (x) => Math.round(x * 10) / 10;

  // ---------- Durum ----------
  const defaultState = () => ({
    v: 1,
    settings: { theme: "auto", startDate: P.startDate, extraWeeks: [] },
    tasks: {}, custom: {}, hours: {}, notes: {}, exams: {}, reflections: {},
    phaseChecks: {}, teacher: {}, questions: [],
    timer: { mode: "stopwatch", running: false, startedAt: 0, elapsed: 0, date: null, target: 0 }
  });
  let state;
  try {
    state = Object.assign(defaultState(), JSON.parse(localStorage.getItem(STORE_KEY) || "{}"));
    state.settings = Object.assign(defaultState().settings, state.settings);
    state.timer = Object.assign(defaultState().timer, state.timer);
  } catch { state = defaultState(); }

  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => localStorage.setItem(STORE_KEY, JSON.stringify(state)), 150); };
  window.addEventListener("beforeunload", () => localStorage.setItem(STORE_KEY, JSON.stringify(state)));

  // ---------- Program yapısı ----------
  // Slot = takvimdeki bir hafta. Program haftaları + araya eklenen vize/telafi haftaları.
  function buildSlots() {
    const extras = state.settings.extraWeeks || [];
    const out = [];
    for (const w of P.weeks) {
      extras.filter((x) => x.before === w.n).forEach((x) => out.push({ type: "extra", key: "x" + x.id, extra: x }));
      out.push({ type: "week", key: "w" + w.n, week: w, phase: P.phases[w.phase - 1] });
    }
    extras.filter((x) => x.before > P.weeks.length).forEach((x) => out.push({ type: "extra", key: "x" + x.id, extra: x }));
    const start = parseISO(state.settings.startDate);
    out.forEach((s, i) => { s.index = i; s.start = addDays(start, i * 7); s.end = addDays(s.start, 6); });
    // Ara haftaların fazı: kendinden sonraki program haftasınınki
    out.forEach((s, i) => { if (s.type === "extra") { const nxt = out.slice(i).find((x) => x.type === "week") || out.slice(0, i).reverse().find((x) => x.type === "week"); s.phase = nxt.phase; } });
    return out;
  }
  let SLOTS = buildSlots();
  const slotByKey = (k) => SLOTS.find((s) => s.key === k);
  const slotOfWeek = (n) => SLOTS.find((s) => s.type === "week" && s.week.n === n);

  function locate(date) {
    const start = parseISO(state.settings.startDate);
    const d = diffDays(date, start);
    if (d < 0) return { before: true, daysTo: -d };
    const idx = Math.floor(d / 7);
    if (idx >= SLOTS.length) return { after: true };
    return { slot: SLOTS[idx], dow: d % 7 };
  }
  const dateOf = (slot, dow) => addDays(slot.start, dow);
  const programStart = () => SLOTS[0].start;
  const programEnd = () => SLOTS[SLOTS.length - 1].end;

  function slotTitle(slot) {
    return slot.type === "week" ? `Hafta ${slot.week.n}` : (slot.extra.label || "Vize haftası");
  }

  // Bir günün planı ve görevleri
  function dayPlan(slot, dow) {
    if (slot.type === "extra") {
      const t = P.lightTemplate[dow];
      const tasks = [];
      if ([0, 1, 2, 3].includes(dow)) tasks.push({ id: "school", text: "Okul sınavlarına çalış (programın dışında)" }, { id: "light", text: "Programdan hafif tekrar (≈2 saat)", sub: "Önceki haftanın notlarına göz at" });
      if (dow === 5) tasks.push({ id: "refl", text: "Haftalık not (5 soru)" });
      return { block: dow === 6 ? "Dinlenme" : dow === 4 ? "Sınav" : "Vize", hours: [0, 1, 2, 3, 5].includes(dow) ? 2 : 0, what: dow === 6 ? "Bilerek boş." : "Vize haftası: 10 saate indirildi, program bir hafta kaydırıldı.", tasks };
    }
    const w = slot.week;
    const tpl = (w.light ? P.lightTemplate : P.template)[dow];
    const hasPy = w.python && w.python !== "—";
    let tasks = [];
    switch (dow) {
      case 0: tasks = [{ id: "read", text: "Okuma: " + w.reading }, { id: "notes", text: "Kendi cümlelerinle not çıkar", sub: "Aşağıdaki günlük alanına yazabilirsin" }]; break;
      case 1: tasks = [{ id: "prob", text: "Okuduğun bölümün problemlerini çöz", sub: w.reading }]; break;
      case 2: tasks = hasPy ? [{ id: "py", text: "Python: " + w.python }] : [{ id: "rev", text: "Tekrar: işaretlediğin sorular" }]; break;
      case 3: tasks = [{ id: "theory2", text: "Konunun devamını oku" }, { id: "review", text: "Anlamadığın yerleri tekrar et" }]; break;
      case 4: tasks = w.light ? [] : [{ id: "hard", text: "Zor problemler" }, { id: "stuck", text: "Takıldığın yerlere dön", sub: "30 dakika kuralı: çıkmazsa işaretle, devam et" }]; break;
      case 5:
        tasks = [];
        if (!w.light && hasPy) tasks.push({ id: "proj", text: "Haftalık uygulamayı bitir", sub: w.python });
        tasks.push({ id: "exam", text: "Sınama sorusu: " + w.question, sub: "Kaynağa bakmadan cevaplayabiliyorsan hafta tamam" });
        tasks.push({ id: "refl", text: "Haftalık not (5 soru)" });
        if (w.phaseEnd) tasks.push({ id: "phase", text: `Faz ${w.phase} sonu kontrolü`, sub: "Kontroller sekmesinde becerileri işaretle" });
        if (w.review) tasks.push({ id: "lookback", text: "Notlarına geri bak (değerlendirme haftası)", sub: "İstatistik → Haftalık not değerlendirmesi" });
        break;
      case 6: tasks = []; break;
    }
    return { block: tpl.block, hours: tpl.hours, what: tpl.what, tasks };
  }

  const taskKey = (slot, dow) => `${slot.key}d${dow}`;
  function dayStatus(date) {
    const loc = locate(date);
    if (!loc.slot) return null;
    const plan = dayPlan(loc.slot, loc.dow);
    const doneMap = state.tasks[taskKey(loc.slot, loc.dow)] || {};
    const custom = state.custom[iso(date)] || [];
    const total = plan.tasks.length + custom.length;
    const done = plan.tasks.filter((t) => doneMap[t.id]).length + custom.filter((t) => t.done).length;
    return { loc, plan, total, done, ratio: total ? done / total : null, hours: state.hours[iso(date)] || 0 };
  }
  function setTask(slot, dow, id, val) {
    const k = taskKey(slot, dow);
    state.tasks[k] = state.tasks[k] || {};
    if (val) state.tasks[k][id] = true; else delete state.tasks[k][id];
    save();
  }

  // ---------- Hesaplamalar ----------
  function allDays() {
    const out = [];
    SLOTS.forEach((s) => { for (let d = 0; d < 7; d++) out.push(dateOf(s, d)); });
    return out;
  }
  function slotProgress(slot) {
    let total = 0, done = 0, hours = 0, target = 0;
    for (let d = 0; d < 7; d++) {
      const st = dayStatus(dateOf(slot, d));
      total += st.total; done += st.done; hours += st.hours; target += st.plan.hours;
    }
    return { total, done, ratio: total ? done / total : 0, hours, target };
  }
  function overall() {
    let total = 0, done = 0, hours = 0, plannedToDate = 0;
    const t = today();
    allDays().forEach((d) => {
      const st = dayStatus(d);
      total += st.total; done += st.done; hours += st.hours;
      if (d <= t) plannedToDate += st.plan.hours;
    });
    Object.entries(state.hours).forEach(([k, v]) => { if (!locate(parseISO(k)).slot) hours += v; });
    return { total, done, ratio: total ? done / total : 0, hours, plannedToDate };
  }
  function streak() {
    let d = today();
    const st0 = dayStatus(d);
    if (!st0 || !(st0.ratio === 1 || st0.ratio === null)) d = addDays(d, -1);
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const st = dayStatus(d);
      if (!st) break;
      if (st.ratio === null) { d = addDays(d, -1); continue; }
      if (st.ratio < 1) break;
      n++; d = addDays(d, -1);
    }
    return n;
  }
  const openQuestions = () => state.questions.filter((q) => q.status !== "cozuldu");

  // ---------- Kullanıcı arayüzü yardımcıları ----------
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function confetti() {
    const colors = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#6250d6", "#e34948"];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      c.style.animationDelay = Math.random() * 0.3 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3800);
    }
  }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
      });
    } catch {}
  }
  const blockBadge = (b) => `<span class="block-badge" style="background:${BLOCK_COLORS[b] || "#7a7873"}">${esc(b)}</span>`;
  const phaseTag = (ph) => `<span class="tag"><span class="dot" style="background:${ph.color}"></span>Faz ${ph.id} · ${esc(ph.short)}</span>`;
  const bar = (r, color) => `<div class="bar"><i style="width:${Math.round((r || 0) * 100)}%;${color ? "background:" + color : ""}"></i></div>`;
  const pct = (r) => Math.round((r || 0) * 100) + "%";

  function applyTheme() {
    const t = state.settings.theme;
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }

  // ---------- Görünümler ----------
  const views = {};

  // ===== Bugün / Gün =====
  views.gun = (param) => {
    const date = param ? parseISO(param) : today();
    const loc = locate(date);
    const isToday = iso(date) === iso(today());
    const nav = `
      <div class="day-nav no-print">
        <a class="btn small" href="#gun/${iso(addDays(date, -1))}" title="Önceki gün (←)">←</a>
        <input type="date" value="${iso(date)}" data-change="goto-date" aria-label="Tarih seç">
        <a class="btn small" href="#gun/${iso(addDays(date, 1))}" title="Sonraki gün (→)">→</a>
        ${isToday ? "" : `<a class="btn small" href="#bugun">Bugün</a>`}
      </div>`;

    if (loc.before) {
      const w1 = SLOTS[0];
      return `
        <div class="hero"><div><div class="sub">${fmt(date, { weekday: "long" })}</div><h1>${fmt(date)}</h1></div>${nav}</div>
        <div class="card" style="text-align:center;padding:36px 20px">
          <div class="muted">Programın başlamasına</div>
          <div style="font-size:3.4rem;font-weight:800;line-height:1.1">${loc.daysTo} gün</div>
          <div class="muted">Başlangıç: ${fmt(programStart(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          <p style="margin-top:16px">İlk hafta: <b>${esc(w1.week.topic)}</b></p>
          <div class="btn-row" style="justify-content:center"><a class="btn primary" href="#gun/${iso(programStart())}">İlk günü gör →</a><a class="btn" href="#rehber">Kuralları oku</a></div>
        </div>
        ${notesCard(date)}`;
    }
    if (loc.after) {
      const o = overall();
      return `
        <div class="hero"><div><div class="sub">${fmt(date, { weekday: "long" })}</div><h1>${fmt(date)}</h1></div>${nav}</div>
        <div class="card" style="text-align:center;padding:36px 20px">
          <div style="font-size:3rem">🎉</div>
          <h2>Program tamamlandı</h2>
          <p>Toplam ${round1(o.hours)} saat çalıştın, görevlerin %${Math.round(o.ratio * 100)}'ini bitirdin.</p>
          <div class="btn-row" style="justify-content:center"><a class="btn primary" href="#istatistik">İstatistiklere bak</a><a class="btn" href="#gunluk">Günlüğünü oku</a></div>
        </div>
        ${notesCard(date)}`;
    }

    const { slot, dow } = loc;
    const st = dayStatus(date);
    const plan = st.plan;
    const doneMap = state.tasks[taskKey(slot, dow)] || {};
    const custom = state.custom[iso(date)] || [];
    const ph = slot.phase;
    const w = slot.week;

    const strip = `<div class="week-strip">${[0, 1, 2, 3, 4, 5, 6].map((d) => {
      const dd = dateOf(slot, d); const s = dayStatus(dd);
      const cls = [iso(dd) === iso(date) ? "sel" : "", iso(dd) === iso(today()) ? "today" : ""].join(" ");
      return `<a href="#gun/${iso(dd)}" class="${cls}" data-tip="${esc(DAYS[d] + " · " + s.plan.block + (s.ratio !== null ? "\n" + s.done + "/" + s.total + " görev" : ""))}">
        <span class="b">${DAYS_SHORT[d]}</span><span class="d">${dd.getDate()}</span><span class="b">${esc(s.plan.block)}</span>
        <div class="mini"><i style="width:${s.ratio === null ? 0 : Math.round(s.ratio * 100)}%"></i></div></a>`;
    }).join("")}</div>`;

    const teacherNow = P.teacherSteps.filter((t) => (t.date && locate(parseISO(t.date)).slot === slot) || (t.week && w && t.week === w.n));
    const teacherCallout = teacherNow.filter((t) => !(state.teacher[t.id] || {}).done).map((t) =>
      `<div class="callout warn">👩‍🏫 <b>Hoca adımı (${esc(t.when)}):</b> ${esc(t.text)} <a href="#kontroller">İşaretle →</a></div>`).join("");

    const taskItems = plan.tasks.map((t) => `
      <li class="task ${doneMap[t.id] ? "done" : ""}">
        <span class="check" data-action="toggle-task" data-slot="${slot.key}" data-dow="${dow}" data-id="${t.id}" role="checkbox" aria-checked="${!!doneMap[t.id]}" tabindex="0"></span>
        <span class="task-body"><span class="task-text" data-action="toggle-task" data-slot="${slot.key}" data-dow="${dow}" data-id="${t.id}">${esc(t.text)}</span>${t.sub ? `<span class="task-sub">${esc(t.sub)}</span>` : ""}</span>
      </li>`).join("") + custom.map((t) => `
      <li class="task ${t.done ? "done" : ""}">
        <span class="check" data-action="toggle-custom" data-date="${iso(date)}" data-id="${t.id}" role="checkbox" aria-checked="${t.done}" tabindex="0"></span>
        <span class="task-body"><span class="task-text" data-action="toggle-custom" data-date="${iso(date)}" data-id="${t.id}">${esc(t.text)}</span><span class="task-sub">Kendi eklediğin görev</span></span>
        <button class="x" data-action="del-custom" data-date="${iso(date)}" data-id="${t.id}" title="Sil" aria-label="Sil">✕</button>
      </li>`).join("");

    const main = `
      <div class="card">
        <div class="block-head">${blockBadge(plan.block)} ${phaseTag(ph)} <span class="tag">${esc(slotTitle(slot))}</span>${plan.hours ? `<span class="tag">${plan.hours} saat</span>` : ""}</div>
        <div class="topic">${w ? esc(w.topic) : esc(slot.extra.label || "Vize haftası")}</div>
        <div class="muted">${esc(plan.what)}</div>
        ${w ? `<dl class="meta-list"><dt>Okuma</dt><dd>${esc(w.reading)}</dd><dt>Python</dt><dd>${esc(w.python)}</dd><dt>Sınama</dt><dd>${esc(w.question)}</dd></dl>` : ""}
        ${teacherCallout}
        ${dow === 6 ? `<div class="callout">🌙 Pazar bilerek boş. Geride kaldıysan en fazla 2 saat telafi yap — iki haftalık işi sıkıştırma.</div>` : ""}
        <ul class="tasks">${taskItems || ""}</ul>
        ${st.total && st.done === st.total ? `<div class="done-banner">✓ Bugünün tüm görevleri tamam. Harika!</div>` : ""}
        <form class="add-task no-print" data-form="add-custom" data-date="${iso(date)}">
          <input type="text" name="t" placeholder="Görev ekle (ör. okul ödevi, ekstra okuma)…" autocomplete="off">
          <button class="btn" type="submit">Ekle</button>
        </form>
      </div>
      ${dow === 5 && w ? examCard(slot) + reflectionCard(slot) : ""}
      ${dow === 5 && slot.type === "extra" ? reflectionCard(slot) : ""}
      ${notesCard(date)}`;

    const side = `
      ${timerCard(date, st)}
      ${quickQuestionCard(date, slot)}
      ${weekSummaryCard(slot)}`;

    return `
      <div class="hero">
        <div><div class="sub">${isToday ? "Bugün · " : ""}${fmt(date, { weekday: "long" })} · ${esc(slotTitle(slot))}</div><h1>${fmt(date)}</h1></div>
        ${nav}
      </div>
      ${strip}
      <div class="layout-today"><div class="stack">${main}</div><div class="stack">${side}</div></div>`;
  };

  function notesCard(date) {
    const n = state.notes[iso(date)] || {};
    const energies = ["😫", "😕", "😐", "🙂", "🤩"];
    return `
      <div class="card">
        <div class="card-title"><h3>📝 Günün notu</h3><span class="saved-hint" id="note-saved">Kaydedildi</span></div>
        <textarea rows="7" data-input="note" data-date="${iso(date)}" placeholder="Bugün ne öğrendin? Neyi anlamadın? Kendi cümlelerinle özetle…">${esc(n.text || "")}</textarea>
        <div style="margin-top:10px">
          <div class="muted" style="font-size:.82rem;margin-bottom:4px">Enerji / odak</div>
          <div class="energy">${energies.map((e, i) => `<button type="button" class="${n.energy === i + 1 ? "on" : ""}" data-action="energy" data-date="${iso(date)}" data-v="${i + 1}" title="${i + 1}/5">${e}</button>`).join("")}</div>
        </div>
      </div>`;
  }

  function timerCard(date, st) {
    const tm = state.timer;
    const h = st ? st.hours : 0;
    const target = st ? st.plan.hours : 0;
    const r = target ? Math.min(1, h / target) : 0;
    const C = 2 * Math.PI * 62;
    const isToday = iso(date) === iso(today());
    return `
      <div class="card timer">
        <div class="card-title"><h3>⏱ Çalışma süresi</h3><span class="tag ${r >= 1 ? "good" : ""}">${round1(h)} / ${target || "–"} sa</span></div>
        <div class="ring">
          <svg viewBox="0 0 150 150" width="150" height="150" aria-hidden="true">
            <circle cx="75" cy="75" r="62" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
            <circle cx="75" cy="75" r="62" fill="none" stroke="${r >= 1 ? "var(--good)" : "var(--accent)"}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - r)}"/>
          </svg>
          <div class="center"><b>${round1(h)} sa</b><small>${target ? Math.round(r * 100) + "% hedef" : "dinlenme"}</small></div>
        </div>
        ${isToday ? `
        <div class="seg" role="group" aria-label="Zamanlayıcı modu">
          <button class="${tm.mode === "stopwatch" ? "on" : ""}" data-action="timer-mode" data-mode="stopwatch" ${tm.running ? "disabled" : ""}>Kronometre</button>
          <button class="${tm.mode === "focus" ? "on" : ""}" data-action="timer-mode" data-mode="focus" ${tm.running ? "disabled" : ""}>Odak 50'</button>
          <button class="${tm.mode === "rule30" ? "on" : ""}" data-action="timer-mode" data-mode="rule30" ${tm.running ? "disabled" : ""}>30 dk kuralı</button>
        </div>
        <div class="clock" id="clock">00:00:00</div>
        <div class="muted" style="font-size:.8rem;margin-bottom:8px" id="clock-hint">${tm.mode === "rule30" ? "Takıldığın soruya 30 dakika ver. Süre bitince işaretle ve devam et." : tm.mode === "focus" ? "50 dakika odak; bitince süre otomatik kaydedilir." : "Başlat, çalış, bitince kaydet."}</div>
        <div class="btn-row" style="justify-content:center">
          ${tm.running ? `<button class="btn" data-action="timer-pause">⏸ Duraklat</button>` : `<button class="btn primary" data-action="timer-start">▶ ${tm.elapsed ? "Devam" : "Başlat"}</button>`}
          <button class="btn" data-action="timer-stop" ${tm.elapsed || tm.running ? "" : "disabled"}>⏹ Bitir ve kaydet</button>
          ${tm.elapsed || tm.running ? `<button class="btn small danger" data-action="timer-reset" title="Kaydetmeden sıfırla">Sıfırla</button>` : ""}
        </div>` : ""}
        <div class="hours-input">
          <label for="hrs" class="muted" style="font-size:.85rem">Elle gir:</label>
          <input id="hrs" type="number" min="0" max="16" step="0.25" value="${h || ""}" placeholder="0" data-change="hours" data-date="${iso(date)}">
          <span class="muted">saat</span>
        </div>
      </div>`;
  }

  function quickQuestionCard(date, slot) {
    const open = openQuestions().length;
    return `
      <div class="card">
        <div class="card-title"><h3>🚩 Takıldığım soru</h3><a href="#sorular" class="tag ${open ? "bad" : ""}">${open} açık</a></div>
        <form data-form="add-question" data-date="${iso(date)}" data-slot="${slot ? slot.key : ""}">
          <textarea name="q" rows="3" placeholder="30 dakikada çıkmayan soruyu yaz, devam et. Cumartesi dön ya da hocaya sor." style="min-height:70px"></textarea>
          <div class="btn-row" style="margin-top:8px">
            <button class="btn primary small" type="submit" name="s" value="acik">İşaretle</button>
            <button class="btn small" type="submit" name="s" value="hoca">Hocaya sorulacak</button>
          </div>
        </form>
      </div>`;
  }

  function weekSummaryCard(slot) {
    const p = slotProgress(slot);
    return `
      <div class="card">
        <div class="card-title"><h3>📅 ${esc(slotTitle(slot))}</h3><a href="#hafta/${slot.key}" class="btn small">Haftaya git</a></div>
        <div class="muted" style="font-size:.85rem">${fmtShort(slot.start)} – ${fmtShort(slot.end)}</div>
        <div style="display:flex;justify-content:space-between;font-size:.85rem;margin:10px 0 4px"><span>Görevler</span><b>${p.done}/${p.total}</b></div>
        ${bar(p.ratio, "var(--good)")}
        <div style="display:flex;justify-content:space-between;font-size:.85rem;margin:10px 0 4px"><span>Saat</span><b>${round1(p.hours)}/${p.target}</b></div>
        ${bar(p.target ? Math.min(1, p.hours / p.target) : 0)}
      </div>`;
  }

  function examCard(slot) {
    const w = slot.week; const e = state.exams[w.n] || {};
    return `
      <div class="card">
        <div class="card-title"><h3>🎯 Sınama sorusu · Hafta ${w.n}</h3>${e.passed ? `<span class="tag good">✓ Geçti</span>` : `<span class="tag">Bekliyor</span>`}</div>
        <p><b>${esc(w.question)}</b></p>
        <textarea rows="5" data-input="exam" data-n="${w.n}" placeholder="Kaynağa bakmadan, kendi cümlelerinle cevapla…">${esc(e.answer || "")}</textarea>
        <label class="check-row ${e.passed ? "done" : ""}" data-action="exam-pass" data-n="${w.n}" style="margin-top:6px">
          <span class="check"></span><span>Kaynağa bakmadan cevaplayabildim — bu hafta tamam</span>
        </label>
      </div>`;
  }

  function reflectionCard(slot) {
    const key = slot.type === "week" ? String(slot.week.n) : slot.key;
    const r = state.reflections[key] || {};
    const qs = P.reflectionQuestions.map((q, i) => {
      let ctrl = "";
      if (q.type === "scale") ctrl = `<div class="scale"><small>${esc(q.min)}</small>${[1, 2, 3, 4, 5].map((v) => `<button type="button" class="${r[q.id] === v ? "on" : ""}" data-action="refl" data-k="${key}" data-q="${q.id}" data-v="${v}">${v}</button>`).join("")}<small>${esc(q.max)}</small></div>`;
      else if (q.type === "choice") ctrl = `<div class="choice">${q.options.map((o) => `<button type="button" class="${r[q.id] === o ? "on" : ""}" data-action="refl" data-k="${key}" data-q="${q.id}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
      else ctrl = `<input type="text" data-input="refl-text" data-k="${key}" data-q="${q.id}" value="${esc(r[q.id] || "")}" placeholder="Bir cümle…">`;
      return `<div class="q"><div class="q-text">${i + 1}. ${esc(q.text)}</div>${ctrl}</div>`;
    }).join("");
    const complete = P.reflectionQuestions.every((q) => r[q.id] !== undefined && r[q.id] !== "");
    return `
      <div class="card">
        <div class="card-title"><h3>🗒 Haftalık not · ${esc(slotTitle(slot))}</h3>${complete ? `<span class="tag good">✓ Tamam</span>` : `<span class="tag">Cumartesi</span>`}</div>
        ${qs}
      </div>`;
  }

  // ===== Program =====
  views.program = () => {
    const cur = locate(today()).slot;
    const html = P.phases.map((ph) => {
      const slots = SLOTS.filter((s) => s.phase === ph);
      let t = 0, d = 0; slots.forEach((s) => { const p = slotProgress(s); t += p.total; d += p.done; });
      const ps = slots[0], pe = slots[slots.length - 1];
      return `
        <section class="phase">
          <div class="phase-head">
            <h2><span style="color:${ph.color}">●</span> Faz ${ph.id} · ${esc(ph.name)}</h2>
            <span class="tag">Hafta ${ph.weeks[0]}–${ph.weeks[1]} · ${fmtShort(ps.start)} – ${fmtShort(pe.end)}</span>
            ${bar(t ? d / t : 0, ph.color)} <b style="font-size:.85rem">${pct(t ? d / t : 0)}</b>
          </div>
          <div class="phase-desc">${esc(ph.desc)}</div>
          ${slots.map((s) => weekCard(s, s === cur)).join("")}
        </section>`;
    }).join("");
    return `
      <div class="hero"><div><div class="sub">${SLOTS.length} hafta · ${fmt(programStart())} – ${fmt(programEnd())}</div><h1>Program</h1></div>
        <div class="btn-row no-print">${cur ? `<a class="btn primary" href="#hafta/${cur.key}">Bu haftaya git</a>` : ""}<button class="btn" data-action="open-settings">Vize haftası ekle</button><button class="btn" onclick="window.print()">Yazdır</button></div>
      </div>
      ${roadmap()}
      ${html}`;
  };

  function roadmap() {
    const total = SLOTS.length;
    const cur = locate(today());
    const curPos = cur.slot ? (cur.slot.index + (cur.dow + 0.5) / 7) / total : cur.before ? 0 : 1;
    const segs = P.phases.map((ph) => {
      const ss = SLOTS.filter((s) => s.phase === ph);
      const left = ss[0].index / total, width = ss.length / total;
      let t = 0, d = 0; ss.forEach((s) => { const p = slotProgress(s); t += p.total; d += p.done; });
      return `<div data-tip="${esc(`Faz ${ph.id} · ${ph.name}\n${pct(t ? d / t : 0)} tamam`)}" style="position:absolute;left:${left * 100}%;width:calc(${width * 100}% - 3px);top:0;bottom:0;background:${ph.color}22;border-radius:8px;overflow:hidden">
          <div style="height:100%;width:${(t ? d / t : 0) * 100}%;background:${ph.color}"></div>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;color:var(--text);text-shadow:0 0 4px var(--surface)">${esc(ph.short)}</span></div>`;
    }).join("");
    return `
      <div class="card" style="margin-bottom:22px">
        <div class="card-title"><h3>Yol haritası</h3><span class="muted" style="font-size:.82rem">Her faz bir öncekinin üzerine kurulu. Kontrol sorularını geçmeden sonrakine atlama.</span></div>
        <div style="position:relative;height:34px">${segs}
          <div style="position:absolute;left:${curPos * 100}%;top:-6px;bottom:-6px;width:2px;background:var(--bad)" data-tip="Bugün"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--muted);margin-top:6px"><span>${fmt(programStart())}</span><span>${fmt(programEnd())}</span></div>
      </div>`;
  }

  function weekCard(s, current) {
    const p = slotProgress(s);
    const passed = s.type === "week" && (state.exams[s.week.n] || {}).passed;
    return `
      <a href="#hafta/${s.key}" class="card week-card ${current ? "current" : ""} ${s.type === "extra" ? "extra" : ""}">
        <div class="week-num">${s.type === "week" ? `<small class="muted">Hafta</small><b>${s.week.n}</b>` : `<b>⏸</b><small class="muted">ara</small>`}</div>
        <div>
          <div class="title">${esc(s.type === "week" ? s.week.topic : (s.extra.label || "Vize haftası") + " (10 saat, program kaydırıldı)")}</div>
          <div class="dates">${fmtShort(s.start)} – ${fmtShort(s.end)}${s.type === "week" ? " · " + esc(s.week.reading) : ""}</div>
        </div>
        <div class="right">
          <div style="display:flex;gap:6px">${current ? `<span class="tag accent">Bu hafta</span>` : ""}${s.week && s.week.light ? `<span class="tag warn">10 sa</span>` : ""}${passed ? `<span class="tag good">✓ Sınama</span>` : ""}</div>
          ${bar(p.ratio, s.phase.color)}
          <small class="muted">${p.done}/${p.total} görev · ${round1(p.hours)} sa</small>
        </div>
      </a>`;
  }

  // ===== Hafta detayı =====
  views.hafta = (key) => {
    const slot = slotByKey(key) || SLOTS[0];
    const i = slot.index;
    const prev = SLOTS[i - 1], next = SLOTS[i + 1];
    const w = slot.week;
    const p = slotProgress(slot);
    const days = [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const dd = dateOf(slot, d); const s = dayStatus(dd); const hasNote = (state.notes[iso(dd)] || {}).text;
      return `<a href="#gun/${iso(dd)}" class="day-card ${s.ratio === null ? "rest" : ""}" ${iso(dd) === iso(today()) ? 'style="border-color:var(--bad)"' : ""}>
        <div class="dn">${DAYS[d]} <span class="muted" style="font-weight:400">${fmtShort(dd)}</span></div>
        <div class="bk">${esc(s.plan.block)}${s.plan.hours ? " · " + s.plan.hours + " sa" : ""}</div>
        ${s.ratio !== null ? bar(s.ratio, "var(--good)") + `<small class="muted">${s.done}/${s.total} · ${round1(s.hours)} sa</small>` : `<small class="muted">Dinlenme${s.hours ? " · " + round1(s.hours) + " sa telafi" : ""}</small>`}
        ${hasNote ? `<div class="note-dot">📝 not var</div>` : ""}
      </a>`;
    }).join("");
    const teacher = P.teacherSteps.filter((t) => (t.week && w && t.week === w.n) || (t.date && locate(parseISO(t.date)).slot === slot));
    return `
      <div class="hero">
        <div><div class="sub">${fmt(slot.start)} – ${fmt(slot.end)}</div><h1>${esc(slotTitle(slot))}</h1></div>
        <div class="btn-row no-print">
          ${prev ? `<a class="btn small" href="#hafta/${prev.key}">← ${esc(slotTitle(prev))}</a>` : ""}
          ${next ? `<a class="btn small" href="#hafta/${next.key}">${esc(slotTitle(next))} →</a>` : ""}
        </div>
      </div>
      <div class="card">
        <div class="block-head">${phaseTag(slot.phase)}${w && w.light ? `<span class="tag warn">Final haftası · 10 saat</span>` : ""}${slot.type === "extra" ? `<span class="tag warn">Ara hafta · 10 saat</span>` : ""}<span class="tag">${p.done}/${p.total} görev</span><span class="tag">${round1(p.hours)}/${p.target} saat</span></div>
        <div class="topic">${esc(w ? w.topic : slot.extra.label || "Vize haftası")}</div>
        ${w ? `<dl class="meta-list"><dt>Okuma ve problem</dt><dd>${esc(w.reading)}</dd><dt>Python / proje</dt><dd>${esc(w.python)}</dd><dt>Sınama sorusu</dt><dd>${esc(w.question)}</dd></dl>`
            : `<p class="muted">Vize haftası: haftayı 10 saate indir, program bir hafta kaydırıldı. Okul sınavlarına odaklan, programdan sadece hafif tekrar yap.</p>
               <button class="btn small danger" data-action="del-extra" data-id="${slot.extra.id}">Bu ara haftayı kaldır</button>`}
        ${teacher.map((t) => `<div class="callout warn">👩‍🏫 <b>${esc(t.when)}:</b> ${esc(t.text)}</div>`).join("")}
        ${w && w.review ? `<div class="callout">🔍 Bu hafta değerlendirme haftası: haftalık notlarına geri bak. <a href="#istatistik">Değerlendirmeyi aç →</a></div>` : ""}
        <div style="margin-top:12px">${bar(p.ratio, slot.phase.color)}</div>
      </div>
      <h2 style="margin:22px 0 10px">Günler</h2>
      <div class="days-grid">${days}</div>
      <div class="grid grid-2" style="margin-top:16px">
        ${w ? examCard(slot) : ""}
        ${reflectionCard(slot)}
      </div>`;
  };

  // ===== Takvim =====
  views.takvim = () => {
    const s = programStart(), e = programEnd(), t = today();
    const months = [];
    let m = new Date(s.getFullYear(), s.getMonth(), 1);
    while (m <= e) { months.push(new Date(m)); m = new Date(m.getFullYear(), m.getMonth() + 1, 1); }
    const html = months.map((m0) => {
      const first = dowOf(m0);
      const nDays = new Date(m0.getFullYear(), m0.getMonth() + 1, 0).getDate();
      let cells = DAYS_SHORT.map((d) => `<span class="h">${d[0]}</span>`).join("");
      for (let i = 0; i < first; i++) cells += `<span class="c empty"></span>`;
      for (let d = 1; d <= nDays; d++) {
        const dt = new Date(m0.getFullYear(), m0.getMonth(), d);
        const st = dayStatus(dt);
        const note = (state.notes[iso(dt)] || {}).text;
        if (!st) { cells += `<a class="out" href="#gun/${iso(dt)}">${d}</a>`; continue; }
        let cls = "";
        if (st.ratio === null) cls = "rest";
        else if (st.ratio >= 1) cls = "l4";
        else if (st.ratio > 0.66) cls = "l3";
        else if (st.ratio > 0.33) cls = "l2";
        else if (st.ratio > 0) cls = "l1";
        if (iso(dt) === iso(t)) cls += " today";
        if (note) cls += " hasnote";
        const tip = `${fmt(dt, { weekday: "long", day: "numeric", month: "long" })}\n${slotTitle(st.loc.slot)} · ${st.plan.block}` +
          (st.ratio !== null ? `\n${st.done}/${st.total} görev (${pct(st.ratio)})` : "\nDinlenme") + (st.hours ? `\n${round1(st.hours)} saat` : "") + (note ? "\n📝 not var" : "");
        cells += `<a class="${cls}" href="#gun/${iso(dt)}" data-tip="${esc(tip)}">${d}</a>`;
      }
      return `<div class="month"><h3>${fmt(m0, { month: "long", year: "numeric" })}</h3><div class="cal">${cells}</div></div>`;
    }).join("");
    return `
      <div class="hero"><div><div class="sub">Her kare bir gün · tıkla, o güne git</div><h1>Takvim</h1></div></div>
      <div class="card">
        <div class="legend">
          <span><span class="sw" style="background:var(--heat-0)"></span>Başlanmadı</span>
          <span><span class="sw" style="background:var(--heat-1)"></span>≤ %33</span>
          <span><span class="sw" style="background:var(--heat-2)"></span>≤ %66</span>
          <span><span class="sw" style="background:var(--heat-3)"></span>&lt; %100</span>
          <span><span class="sw" style="background:var(--heat-4)"></span>Tamam</span>
          <span><span class="sw" style="background:repeating-linear-gradient(45deg,var(--heat-0),var(--heat-0) 3px,transparent 3px,transparent 6px);border:1px solid var(--border)"></span>Dinlenme</span>
          <span><span class="sw" style="outline:2px solid var(--bad);background:transparent"></span>Bugün</span>
          <span>• not var</span>
        </div>
        <div class="months">${html}</div>
      </div>`;
  };

  // ===== İstatistik =====
  views.istatistik = () => {
    const o = overall();
    const stk = streak();
    const passed = Object.values(state.exams).filter((e) => e.passed).length;
    const notesN = Object.values(state.notes).filter((n) => n.text && n.text.trim()).length;
    const cur = locate(today());
    const elapsedWeeks = cur.slot ? cur.slot.index + 1 : cur.after ? SLOTS.length : 0;
    const kpis = `
      <div class="kpis">
        <div class="card kpi"><div class="l">Genel ilerleme</div><div class="v">${pct(o.ratio)}</div><div class="s">${o.done}/${o.total} görev</div></div>
        <div class="card kpi"><div class="l">Toplam çalışma</div><div class="v">${round1(o.hours)} sa</div><div class="s">bugüne kadar plan: ${o.plannedToDate} sa</div></div>
        <div class="card kpi"><div class="l">Seri</div><div class="v">${stk} 🔥</div><div class="s">art arda tamamlanan gün</div></div>
        <div class="card kpi"><div class="l">Geçilen sınama</div><div class="v">${passed}/23</div><div class="s">kaynağa bakmadan</div></div>
        <div class="card kpi"><div class="l">Açık soru</div><div class="v">${openQuestions().length}</div><div class="s">${state.questions.length} soru işaretlendi</div></div>
        <div class="card kpi"><div class="l">Hafta</div><div class="v">${elapsedWeeks}/${SLOTS.length}</div><div class="s">${notesN} günlük notu</div></div>
      </div>`;

    const phaseRows = P.phases.map((ph) => {
      const ss = SLOTS.filter((s) => s.phase === ph); let t = 0, d = 0, h = 0;
      ss.forEach((s) => { const p = slotProgress(s); t += p.total; d += p.done; h += p.hours; });
      const checks = ph.checks.filter((_, i) => state.phaseChecks[`${ph.id}-${i}`]).length;
      return `<div class="phase-row"><span><span style="color:${ph.color}">●</span> ${esc(ph.short)}</span>${bar(t ? d / t : 0, ph.color)}<span class="pct">${pct(t ? d / t : 0)}</span></div>
              <div class="muted" style="font-size:.76rem;margin:-4px 0 6px 18px">${round1(h)} saat · kontroller ${checks}/${ph.checks.length}</div>`;
    }).join("");

    return `
      <div class="hero"><div><div class="sub">İlerlemen, saatlerin ve haftalık notların</div><h1>İstatistik</h1></div></div>
      ${kpis}
      <div class="grid grid-2">
        <div class="card"><div class="card-title"><h3>Fazlara göre ilerleme</h3></div>${phaseRows}</div>
        ${reviewCard()}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title"><h3>Haftalık çalışma saati</h3></div>
        <div class="legend"><span><span class="sw" style="background:var(--s1)"></span>Çalışılan saat</span><span><span class="line" style="background:var(--text)"></span>Hedef (20 / 10 sa)</span></div>
        <div class="chart">${hoursChart()}</div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title"><h3>Haftalık not: zaman ve kodlama hissi</h3></div>
        <div class="legend"><span><span class="line" style="background:var(--s1)"></span>1. Zaman nasıl geçti? (1 çok yavaş – 5 akıp gitti)</span><span><span class="line" style="background:var(--s2)"></span>4. Kodlama ne hissettirdi? (1 nefret – 5 keyif)</span></div>
        <div class="chart">${reflectionChart()}</div>
        ${reflectionTable()}
      </div>`;
  };

  function hoursChart() {
    const W = 760, H = 220, pl = 32, pr = 10, pt = 12, pb = 26;
    const data = SLOTS.map((s) => { const p = slotProgress(s); return { s, h: p.hours, t: p.target }; });
    const maxY = Math.max(20, ...data.map((d) => d.h)) * 1.1;
    const iw = W - pl - pr, ih = H - pt - pb, bw = iw / data.length;
    const y = (v) => pt + ih - (v / maxY) * ih;
    let g = "";
    for (let v = 0; v <= maxY; v += 5) g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    data.forEach((d, i) => {
      const x = pl + i * bw, w = Math.max(4, bw - 6), cx = x + (bw - w) / 2;
      const h = Math.max(0, y(0) - y(d.h));
      if (d.h > 0) g += `<path d="M${cx},${y(0)} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${w - 8} q4,0 4,4 v${Math.max(0, h - 4)} z" fill="var(--s1)"/>`;
      g += `<line x1="${cx - 2}" x2="${cx + w + 2}" y1="${y(d.t)}" y2="${y(d.t)}" stroke="var(--text)" stroke-width="2"/>`;
      const lbl = d.s.type === "week" ? d.s.week.n : "V";
      g += `<text class="axis" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${lbl}</text>`;
      g += `<rect class="hit" x="${x}" y="${pt}" width="${bw}" height="${ih}" data-tip="${esc(`${slotTitle(d.s)} (${fmtShort(d.s.start)})\n${round1(d.h)} / ${d.t} saat`)}"/>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Haftalık çalışma saati grafiği">${g}</svg>`;
  }

  function reflectionChart() {
    const W = 760, H = 230, pl = 32, pr = 16, pt = 14, pb = 26;
    const weeks = P.weeks.map((w) => w.n);
    const iw = W - pl - pr, ih = H - pt - pb;
    const x = (n) => pl + ((n - 1) / (weeks.length - 1)) * iw;
    const y = (v) => pt + ih - ((v - 1) / 4) * ih;
    let g = "";
    for (let v = 1; v <= 5; v++) g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    weeks.forEach((n) => { if (n % 2 === 1 || n === 23) g += `<text class="axis" x="${x(n)}" y="${H - 8}" text-anchor="middle">${n}</text>`; });
    [6, 13, 20].forEach((n) => { g += `<line x1="${x(n)}" x2="${x(n)}" y1="${pt}" y2="${pt + ih}" stroke="var(--muted)" stroke-dasharray="3 4" opacity=".6"/>`; });
    const series = [["q1", "var(--s1)"], ["q4", "var(--s2)"]];
    let any = false;
    series.forEach(([q, color]) => {
      let d = "", prev = false;
      weeks.forEach((n) => {
        const v = (state.reflections[n] || {})[q];
        if (typeof v === "number") { d += `${prev ? "L" : "M"}${x(n)},${y(v)} `; prev = true; any = true; } else prev = false;
      });
      g += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
      weeks.forEach((n) => {
        const v = (state.reflections[n] || {})[q];
        if (typeof v === "number") g += `<circle cx="${x(n)}" cy="${y(v)}" r="4.5" fill="${color}" stroke="var(--surface)" stroke-width="2"/>`;
      });
    });
    weeks.forEach((n) => {
      const r = state.reflections[n] || {};
      const tip = `Hafta ${n}\nZaman: ${r.q1 ?? "–"} · Kodlama: ${r.q4 ?? "–"}\nDevam isteği: ${r.q2 ?? "–"} · Fazladan: ${r.q3 ?? "–"}${r.q5 ? "\n“" + r.q5 + "”" : ""}`;
      g += `<rect class="hit" x="${x(n) - iw / 44}" y="${pt}" width="${iw / 22}" height="${ih}" data-tip="${esc(tip)}"/>`;
    });
    if (!any) g += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="var(--muted)" font-size="13">Henüz haftalık not yok — her cumartesi 5 soruyu doldur.</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Haftalık not grafiği">${g}</svg>`;
  }

  function reflectionTable() {
    const rows = P.weeks.filter((w) => state.reflections[w.n]).map((w) => {
      const r = state.reflections[w.n];
      return `<tr><td>${w.n}</td><td>${r.q1 ?? "–"}</td><td>${esc(r.q2 ?? "–")}</td><td>${esc(r.q3 ?? "–")}</td><td>${r.q4 ?? "–"}</td><td>${esc(r.q5 || "")}</td></tr>`;
    }).join("");
    if (!rows) return "";
    return `<details><summary>Tablo görünümü</summary><table class="data" style="margin-top:8px"><thead><tr><th>Hafta</th><th>Zaman</th><th>Devam</th><th>Fazladan</th><th>Kodlama</th><th>En ilginç şey</th></tr></thead><tbody>${rows}</tbody></table></details>`;
  }

  function reviewCard() {
    const t = today();
    const cur = locate(t);
    const curN = cur.slot && cur.slot.type === "week" ? cur.slot.week.n : 0;
    const upto = cur.after ? 23 : curN;
    const rs = P.weeks.filter((w) => w.n <= Math.max(upto, 23) && state.reflections[w.n]).map((w) => state.reflections[w.n]);
    const q1 = rs.filter((r) => typeof r.q1 === "number").map((r) => r.q1);
    const q4 = rs.filter((r) => typeof r.q4 === "number").map((r) => r.q4);
    const q2 = rs.map((r) => r.q2).filter(Boolean);
    const q3 = rs.map((r) => r.q3).filter(Boolean);
    const avg = (a) => (a.length ? round1(a.reduce((x, y) => x + y, 0) / a.length) : "–");
    const evet = q2.filter((x) => x === "Evet").length;
    let verdict = `<div class="callout">6., 13. ve 20. haftalarda notlarına geri bak. 1. soruda 3 ve üzeri, 2. soruda çoğunlukla "Evet" görüyorsan sorun tempoda değil, hedefteydi.</div>`;
    if (q1.length >= 3) {
      const good = avg(q1) >= 3 && evet / q2.length > 0.5;
      verdict = good
        ? `<div class="callout good">Zaman ortalaman ${avg(q1)} ve devam isteğin çoğunlukla "Evet". Hedef sana uyuyor — zorlandığın yerler tempoyla ilgili, konuyla değil.</div>`
        : `<div class="callout warn">Zaman ortalaman ${avg(q1)}, "Evet" oranı ${Math.round((evet / Math.max(1, q2.length)) * 100)}%. Tempoyu mu, konuyu mu sorgulamalısın? Hangi haftalarda düştüğüne bak; hocayla konuşmak için iyi bir veri.</div>`;
    }
    // Faza göre kodlama hissi
    const byPhase = P.phases.map((ph) => {
      const v = P.weeks.filter((w) => w.phase === ph.id).map((w) => (state.reflections[w.n] || {}).q4).filter((x) => typeof x === "number");
      return `<tr><td><span style="color:${ph.color}">●</span> ${esc(ph.short)}</td><td>${avg(v)}</td></tr>`;
    }).join("");
    return `
      <div class="card">
        <div class="card-title"><h3>🔍 Haftalık not değerlendirmesi</h3><span class="tag">${rs.length} hafta</span></div>
        <div class="grid grid-3" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px;text-align:center">
          <div><div class="muted" style="font-size:.75rem">Zaman ort.</div><b style="font-size:1.3rem">${avg(q1)}</b></div>
          <div><div class="muted" style="font-size:.75rem">Devam "Evet"</div><b style="font-size:1.3rem">${evet}/${q2.length}</b></div>
          <div><div class="muted" style="font-size:.75rem">Fazladan</div><b style="font-size:1.3rem">${q3.filter((x) => x === "Evet").length}/${q3.length}</b></div>
          <div><div class="muted" style="font-size:.75rem">Kodlama ort.</div><b style="font-size:1.3rem">${avg(q4)}</b></div>
        </div>
        ${verdict}
        <table class="data"><thead><tr><th>Faz</th><th>Kodlama hissi ort.</th></tr></thead><tbody>${byPhase}</tbody></table>
        <div class="muted" style="font-size:.78rem;margin-top:6px">4. soru, kodlamaya karşı tutumunun konuya göre değişip değişmediğini gösterir.</div>
      </div>`;
  }

  // ===== Günlük (tüm notlar) =====
  views.gunluk = (_, query = views.gunluk.q || "") => {
    const entries = Object.entries(state.notes).filter(([, n]) => n.text && n.text.trim()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    const ql = query.toLocaleLowerCase("tr");
    const filtered = ql ? entries.filter(([, n]) => n.text.toLocaleLowerCase("tr").includes(ql)) : entries;
    const hl = (txt) => { const e = esc(txt); if (!ql) return e; const re = new RegExp(esc(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); return e.replace(re, (m) => `<mark>${m}</mark>`); };
    const energies = ["", "😫", "😕", "😐", "🙂", "🤩"];
    const list = filtered.map(([d, n]) => {
      const dt = parseISO(d); const loc = locate(dt);
      return `<div class="entry"><div class="entry-head"><a href="#gun/${d}">${fmt(dt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</a>
        ${loc.slot ? `<span class="tag">${esc(slotTitle(loc.slot))}</span>${blockBadge(dayPlan(loc.slot, loc.dow).block)}` : ""}${n.energy ? `<span title="Enerji">${energies[n.energy]}</span>` : ""}</div>
        <div class="entry-text">${hl(n.text)}</div></div>`;
    }).join("");
    return `
      <div class="hero"><div><div class="sub">Tüm günlük notların, en yeniden eskiye</div><h1>Günlük</h1></div>
        <div class="btn-row no-print"><a class="btn primary" href="#bugun">Bugüne not yaz</a><button class="btn" data-action="export-md">Markdown indir</button></div></div>
      <div class="card">
        <input type="search" id="diary-search" placeholder="Notlarda ara… (ör. özdeğer, Poisson)" value="${esc(query)}" data-input="diary-search">
        <div style="margin-top:6px" class="muted">${filtered.length} not</div>
        <div id="diary-list">${list || `<div class="empty-state">${query ? "Eşleşen not yok." : "Henüz not yok. Her günün sayfasında “Günün notu” alanına yazdıkların burada toplanır."}</div>`}</div>
      </div>`;
  };

  // ===== Sorular =====
  views.sorular = () => {
    const f = views.sorular.f || "aktif";
    const st = { acik: "Açık", hoca: "Hocaya sor", cozuldu: "Çözüldü" };
    const qs = state.questions.filter((q) => f === "hepsi" || (f === "aktif" ? q.status !== "cozuldu" : q.status === f)).sort((a, b) => (a.date < b.date ? 1 : -1));
    const counts = { aktif: openQuestions().length, hoca: state.questions.filter((q) => q.status === "hoca").length, cozuldu: state.questions.filter((q) => q.status === "cozuldu").length, hepsi: state.questions.length };
    const items = qs.map((q) => `
      <div class="q-item">
        <div>
          <div class="qt">${esc(q.text)}</div>
          <div class="qm">${fmt(parseISO(q.date), { day: "numeric", month: "long" })}${q.slot && slotByKey(q.slot) ? " · " + esc(slotTitle(slotByKey(q.slot))) : ""}</div>
          <textarea data-input="q-answer" data-id="${q.id}" placeholder="Çözüm / hocanın cevabı…">${esc(q.answer || "")}</textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <select data-change="q-status" data-id="${q.id}">${Object.entries(st).map(([k, v]) => `<option value="${k}" ${q.status === k ? "selected" : ""}>${v}</option>`).join("")}</select>
          <span class="tag ${q.status === "cozuldu" ? "good" : q.status === "hoca" ? "warn" : "bad"}">${st[q.status]}</span>
          <button class="btn small danger" data-action="del-question" data-id="${q.id}">Sil</button>
        </div>
      </div>`).join("");
    return `
      <div class="hero"><div><div class="sub">30 dakika kuralı: çıkmayan soruyu işaretle, devam et, cumartesi dön</div><h1>Sorular</h1></div></div>
      <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(260px,1fr);align-items:start">
        <div class="card">
          <div class="filters">${[["aktif", "Aktif"], ["hoca", "Hocaya sorulacaklar"], ["cozuldu", "Çözüldü"], ["hepsi", "Hepsi"]].map(([k, v]) => `<button class="btn small ${f === k ? "primary" : ""}" data-action="q-filter" data-f="${k}">${v} (${counts[k]})</button>`).join("")}</div>
          ${items || `<div class="empty-state">Bu listede soru yok.</div>`}
        </div>
        ${quickQuestionCard(today(), locate(today()).slot)}
      </div>`;
  };

  // ===== Kontroller =====
  views.kontroller = () => {
    const phases = P.phases.map((ph) => {
      const done = ph.checks.filter((_, i) => state.phaseChecks[`${ph.id}-${i}`]).length;
      const endSlot = SLOTS.filter((s) => s.phase === ph).slice(-1)[0];
      return `
        <div class="card">
          <div class="card-title"><h3><span style="color:${ph.color}">●</span> Faz ${ph.id} · ${esc(ph.name)}</h3><span class="tag ${done === ph.checks.length ? "good" : ""}">${done}/${ph.checks.length}</span></div>
          <div class="muted" style="font-size:.8rem;margin-bottom:6px">Kontrol: ${fmt(endSlot.end, { day: "numeric", month: "long" })} (Hafta ${ph.weeks[1]} sonu)</div>
          ${ph.checks.map((c, i) => { const k = `${ph.id}-${i}`; return `<div class="check-row ${state.phaseChecks[k] ? "done" : ""}" data-action="phase-check" data-k="${k}"><span class="check"></span><span>${esc(c)}</span></div>`; }).join("")}
          ${done === ph.checks.length ? `<div class="callout good">Hepsini yapabiliyorsun — bir sonraki faza geç!</div>` : done >= Math.ceil(ph.checks.length / 2) ? `<div class="callout">Çoğunu yapabiliyorsan sonraki faza geç. Yapamadıkların için 2–3 günlük tekrar ekle.</div>` : ""}
        </div>`;
    }).join("");
    const teacher = P.teacherSteps.map((t) => {
      const s = state.teacher[t.id] || {};
      const when = t.date ? parseISO(t.date) : slotOfWeek(t.week) ? slotOfWeek(t.week).start : null;
      return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="check-row ${s.done ? "done" : ""}" data-action="teacher" data-id="${t.id}" style="padding:0"><span class="check"></span>
          <span><b>${esc(t.when)}</b> <span class="muted" style="font-size:.8rem">${when ? "· " + fmt(when, { day: "numeric", month: "long" }) : ""}</span><br>${esc(t.text)}</span></div>
        <input type="text" style="margin-top:6px;font-size:.85rem" data-input="teacher-note" data-id="${t.id}" value="${esc(s.note || "")}" placeholder="Not (ne konuştunuz, ne önerdi?)">
      </div>`;
    }).join("");
    return `
      <div class="hero"><div><div class="sub">Her fazın sonunda bu becerileri kaynağa bakmadan göstermeye çalış</div><h1>Kontroller</h1></div></div>
      <div class="grid grid-2">${phases}
        <div class="card"><div class="card-title"><h3>👩‍🏫 Fizik hocasıyla adımlar</h3><span class="tag">${P.teacherSteps.filter((t) => (state.teacher[t.id] || {}).done).length}/${P.teacherSteps.length}</span></div>${teacher}</div>
      </div>`;
  };

  // ===== Araçlar =====
  views.araclar = () => `
    <div class="hero"><div><div class="sub">Programdaki hesapları elle yaptıktan sonra burada kontrol et</div><h1>Fizik araçları</h1></div></div>
    <div class="grid grid-2">
      <div class="card tool" data-tool="mass">
        <div class="card-title"><h3>Değişmez kütle (Hafta 12)</h3><button class="btn small" data-action="preset-z">Z → μμ örneği</button></div>
        <div class="formula">M² = (E₁+E₂)² − |p⃗₁+p⃗₂|²  ·  px = pT cosφ, py = pT sinφ, pz = pT sinhη</div>
        ${[1, 2].map((i) => `<div class="muted" style="font-size:.8rem;margin:6px 0 2px">Parçacık ${i}</div><div class="inputs">
          <label>pT [GeV]<input type="number" step="any" data-tool-in="pt${i}" value="${i === 1 ? 42.3 : 40.8}"></label>
          <label>η<input type="number" step="any" data-tool-in="eta${i}" value="${i === 1 ? 0.62 : -0.27}"></label>
          <label>φ [rad]<input type="number" step="any" data-tool-in="phi${i}" value="${i === 1 ? 0.4 : -2.85}"></label>
          <label>m [GeV]<input type="number" step="any" data-tool-in="m${i}" value="0.10566"></label></div>`).join("")}
        <div class="result" data-out="mass"></div>
      </div>

      <div class="card tool" data-tool="pqbr">
        <div class="card-title"><h3>Manyetik alanda momentum (Hafta 10)</h3></div>
        <div class="formula">p [GeV/c] ≈ 0.3 · z · B [T] · r [m]</div>
        <div class="inputs">
          <label>B [T]<input type="number" step="any" data-tool-in="B" value="3.8"></label>
          <label>r [m]<input type="number" step="any" data-tool-in="r" value="1"></label>
          <label>Yük z<input type="number" step="1" data-tool-in="z" value="1"></label>
        </div>
        <div class="result" data-out="pqbr"></div>
        <div class="muted" style="font-size:.78rem;margin-top:6px">CMS'in solenoidi 3.8 T. Eğrilik yarıçapı büyüdükçe momentum artar.</div>
      </div>

      <div class="card tool" data-tool="rel">
        <div class="card-title"><h3>Özel görelilik (Hafta 11)</h3></div>
        <div class="formula">γ = 1/√(1−β²) · p = γmβ · E² = p² + m²</div>
        <div class="inputs">
          <label>m [GeV]<input type="number" step="any" data-tool-in="m" value="0.10566"></label>
          <label>β = v/c<input type="number" step="any" min="0" max="0.999999999" data-tool-in="beta" value="0.99"></label>
        </div>
        <div class="result" data-out="rel"></div>
      </div>

      <div class="card tool" data-tool="events">
        <div class="card-title"><h3>Kaç olay? (Hafta 19)</h3><button class="btn small" data-action="preset-higgs">H → 4ℓ örneği</button></div>
        <div class="formula">N = σ · L · BR · ε  (1 fb⁻¹ = 1000 pb⁻¹)</div>
        <div class="inputs">
          <label>σ [pb]<input type="number" step="any" data-tool-in="sigma" value="55"></label>
          <label>L [fb⁻¹]<input type="number" step="any" data-tool-in="lumi" value="139"></label>
          <label>BR<input type="number" step="any" data-tool-in="br" value="1"></label>
          <label>ε (verim)<input type="number" step="any" data-tool-in="eff" value="1"></label>
        </div>
        <div class="result" data-out="events"></div>
      </div>

      <div class="card tool" data-tool="signif">
        <div class="card-title"><h3>Anlamlılık ve 5σ (Hafta 22)</h3></div>
        <div class="formula">Z ≈ s/√b  ·  Asimov: Z = √(2[(s+b)ln(1+s/b) − s])</div>
        <div class="inputs">
          <label>Sinyal s<input type="number" step="any" data-tool-in="s" value="20"></label>
          <label>Arka plan b<input type="number" step="any" data-tool-in="b" value="10"></label>
        </div>
        <div class="result" data-out="signif"></div>
        <div class="muted" style="font-size:.78rem;margin-top:6px">5σ ↔ tek yönlü p ≈ 2.87×10⁻⁷: arka plan tek başına bu kadar büyük bir dalgalanmayı ~3.5 milyonda bir üretir.</div>
      </div>

      <div class="card tool" data-tool="decay">
        <div class="card-title"><h3>Radyoaktif bozunma (Hafta 17)</h3></div>
        <div class="formula">N(t) = N₀ e^(−t/τ) · T½ = τ ln 2</div>
        <div class="inputs">
          <label>N₀<input type="number" step="any" data-tool-in="n0" value="10000"></label>
          <label>T½<input type="number" step="any" data-tool-in="th" value="5.27"></label>
          <label>t (aynı birim)<input type="number" step="any" data-tool-in="t" value="10"></label>
        </div>
        <div class="result" data-out="decay"></div>
      </div>

      <div class="card tool" data-tool="poisson">
        <div class="card-title"><h3>Sayım ve Poisson (Hafta 6)</h3></div>
        <div class="formula">P(n; ν) = νⁿ e^(−ν) / n!  ·  σ = √N</div>
        <div class="inputs">
          <label>Beklenen ν<input type="number" step="any" data-tool-in="nu" value="4"></label>
          <label>Gözlenen n<input type="number" step="1" min="0" data-tool-in="n" value="7"></label>
        </div>
        <div class="result" data-out="poisson"></div>
        <div class="chart" data-out="poisson-chart" style="margin-top:8px"></div>
      </div>
    </div>`;

  const num = (card, k) => parseFloat($(`[data-tool-in="${k}"]`, card)?.value);
  const SUP = { "-": "⁻", "+": "", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sci = (x, d = 3) => {
    if (!isFinite(x)) return "–";
    if (Math.abs(x) >= 1e6 || (Math.abs(x) < 1e-3 && x !== 0)) {
      const [m, e] = x.toExponential(d - 1).split("e");
      return `${m}×10${[...e].map((c) => SUP[c]).join("")}`;
    }
    const v = +x.toPrecision(d + 1);
    return Math.abs(v) >= 1e4 ? v.toLocaleString("en-US").replace(/,/g, " ") : String(v);
  };
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const logFact = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
  const poissonP = (n, nu) => Math.exp(n * Math.log(nu) - nu - logFact(n));

  function computeTools() {
    $$("[data-tool]").forEach((card) => {
      const t = card.dataset.tool;
      const out = $(`[data-out="${t}"]`, card);
      if (t === "mass") {
        const v = [1, 2].map((i) => {
          const pt = num(card, "pt" + i), eta = num(card, "eta" + i), phi = num(card, "phi" + i), m = num(card, "m" + i);
          const px = pt * Math.cos(phi), py = pt * Math.sin(phi), pz = pt * Math.sinh(eta);
          return { px, py, pz, E: Math.sqrt(px * px + py * py + pz * pz + m * m) };
        });
        const E = v[0].E + v[1].E, px = v[0].px + v[1].px, py = v[0].py + v[1].py, pz = v[0].pz + v[1].pz;
        const M = Math.sqrt(Math.max(0, E * E - px * px - py * py - pz * pz));
        out.innerHTML = `M = ${M.toFixed(2)} GeV<small>${Math.abs(M - 91.19) < 5 ? "Z bozonu bölgesi (91.19 GeV) 🎯" : Math.abs(M - 125) < 5 ? "Higgs bölgesi (~125 GeV) 🎯" : "E₁ = " + v[0].E.toFixed(2) + " GeV, E₂ = " + v[1].E.toFixed(2) + " GeV"}</small>`;
      } else if (t === "pqbr") {
        const p = 0.299792458 * num(card, "z") * num(card, "B") * num(card, "r");
        out.innerHTML = `p = ${p.toFixed(3)} GeV/c<small>r = p / (0.3 z B) → aynı alanda 10 kat momentum, 10 kat yarıçap</small>`;
      } else if (t === "rel") {
        const m = num(card, "m"), b = num(card, "beta");
        if (!(b >= 0 && b < 1)) { out.innerHTML = `β 0 ile 1 arasında olmalı`; return; }
        const g = 1 / Math.sqrt(1 - b * b), p = g * m * b, E = g * m, pc = m * b;
        out.innerHTML = `γ = ${sci(g, 4)} · p = ${sci(p, 4)} GeV<small>E = ${sci(E, 4)} GeV · klasik p = mv = ${sci(pc, 4)} GeV → göreli/klasik = ${sci(g, 3)}</small>`;
      } else if (t === "events") {
        const N = num(card, "sigma") * 1000 * num(card, "lumi") * num(card, "br") * num(card, "eff");
        out.innerHTML = `N ≈ ${sci(N, 4)} olay<small>${N > 0 ? "Poisson hatası √N ≈ " + sci(Math.sqrt(N), 3) : ""}</small>`;
      } else if (t === "signif") {
        const s = num(card, "s"), b = num(card, "b");
        const z1 = s / Math.sqrt(b), za = Math.sqrt(2 * ((s + b) * Math.log(1 + s / b) - s));
        const p = 0.5 * erfc(za / Math.SQRT2);
        out.innerHTML = `Z ≈ ${za.toFixed(2)}σ <small>s/√b = ${z1.toFixed(2)}σ · p = ${sci(p, 3)} · ${za >= 5 ? "✅ Keşif eşiği (5σ) aşıldı" : za >= 3 ? "⚠️ Kanıt (3σ) var, keşif değil" : "Henüz anlamlı değil"}</small>`;
      } else if (t === "decay") {
        const n0 = num(card, "n0"), th = num(card, "th"), tt = num(card, "t");
        const tau = th / Math.LN2, N = n0 * Math.exp(-tt / tau);
        out.innerHTML = `N(t) = ${sci(N, 4)}<small>τ = ${sci(tau, 4)} · kalan oran ${(N / n0 * 100).toFixed(1)}% · aktivite N/τ = ${sci(N / tau, 3)} / birim zaman</small>`;
      } else if (t === "poisson") {
        const nu = num(card, "nu"), n = Math.max(0, Math.round(num(card, "n")));
        if (!(nu > 0)) { out.textContent = "ν > 0 olmalı"; return; }
        let tail = 0; for (let k = n; k < n + 400; k++) tail += poissonP(k, nu);
        out.innerHTML = `P(n=${n}) = ${sci(poissonP(n, nu), 3)}<small>P(N ≥ ${n}) = ${sci(Math.min(1, tail), 3)} · σ = √ν = ${Math.sqrt(nu).toFixed(2)}</small>`;
        const kmax = Math.max(10, Math.ceil(nu + 4 * Math.sqrt(nu)), n + 2);
        const W = 420, H = 130, pl = 6, pb = 18, bw = (W - pl * 2) / (kmax + 1);
        const ps = Array.from({ length: kmax + 1 }, (_, k) => poissonP(k, nu)); const mx = Math.max(...ps);
        let g = "";
        ps.forEach((p, k) => {
          const h = (p / mx) * (H - pb - 6), x = pl + k * bw + 1;
          g += `<rect x="${x}" y="${H - pb - h}" width="${Math.max(2, bw - 2)}" height="${h}" rx="2" fill="${k === n ? "var(--s2)" : "var(--s1)"}"/>`;
          g += `<rect class="hit" x="${pl + k * bw}" y="0" width="${bw}" height="${H}" data-tip="n = ${k}\nP = ${sci(p, 3)}"/>`;
          if (kmax <= 20 || k % 2 === 0) g += `<text class="axis" x="${x + bw / 2 - 1}" y="${H - 4}" text-anchor="middle">${k}</text>`;
        });
        $(`[data-out="poisson-chart"]`, card).innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Poisson dağılımı">${g}</svg>`;
      }
    });
  }

  // ===== Rehber =====
  views.rehber = () => `
    <div class="hero"><div><div class="sub">Sürüm 2 · 23 hafta · haftada 20 saat · Başlangıç: Kalkülüs I ve Fizik I tamam, lineer cebir yarım</div><h1>Rehber</h1></div></div>
    <div class="grid grid-2">
      <div class="card"><h3>Kurallar</h3>${P.rules.map(([a, b]) => `<p><b>${esc(a)}</b> ${esc(b)}</p>`).join("")}</div>
      <div class="card"><h3>Haftalık şablon (20 saat)</h3>
        <table class="data"><thead><tr><th>Gün</th><th>Süre</th><th>Blok</th><th>Ne yapılır</th></tr></thead><tbody>
        ${P.template.map((t) => `<tr><td>${DAYS[t.dow]}</td><td>${t.dow === 5 ? "4 + 1 sa" : t.hours ? t.hours + " sa" : "—"}</td><td>${blockBadge(t.block)}</td><td>${esc(t.what)}</td></tr>`).join("")}
        </tbody></table>
        <h3 style="margin-top:16px">Haftalık not (her cumartesi, 5 soru)</h3>
        <ol style="padding-left:20px;margin:0">${P.reflectionQuestions.map((q) => `<li>${esc(q.text)} <span class="muted">— ${q.type === "scale" ? `1 (${q.min}) – 5 (${q.max})` : q.type === "choice" ? q.options.join(" / ") : "bir cümle"}</span></li>`).join("")}</ol>
      </div>
      <div class="card"><h3>Kaynaklar</h3>
        <table class="data"><tbody>${P.sources.map(([k, v, u]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}${u ? ` <a href="${esc(u)}" target="_blank" rel="noopener">↗</a>` : ""}</td></tr>`).join("")}</tbody></table>
      </div>
      <div class="card"><h3>Bilerek dışarıda bırakılanlar</h3>
        <p class="muted">Bunları bu programda bilmen gerekmiyor. Hiçbiri 23 hafta içinde seni tıkamaz; hepsinin zamanı ileride geliyor.</p>
        <table class="data"><tbody>${P.excluded.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join("")}</tbody></table>
      </div>
      <div class="card"><h3>Kısayollar</h3>
        <p><span class="kbd">←</span> <span class="kbd">→</span> önceki / sonraki gün · <span class="kbd">T</span> bugün · <span class="kbd">P</span> program · <span class="kbd">N</span> günün notuna odaklan</p>
        <p class="muted">Gün sayfasında bir görevin metnine ya da kutusuna tıklayarak işaretleyebilirsin. Tüm görevler bitince küçük bir kutlama var 🎉</p>
      </div>
    </div>`;

  // ---------- Ayarlar ----------
  function renderSettings() {
    const s = state.settings;
    const extras = s.extraWeeks.map((x) => `<li>${esc(x.label)} — Hafta ${x.before > 23 ? "23'ten sonra" : x.before + "'den önce"} <button class="btn small danger" data-action="del-extra" data-id="${x.id}">Kaldır</button></li>`).join("");
    $("#settings").innerHTML = `
      <div class="dhead"><h2 style="margin:0">Ayarlar</h2><button class="icon-btn" data-action="close-settings" aria-label="Kapat">✕</button></div>
      <div class="dbody">
        <section>
          <h3>Tema</h3>
          <div class="seg">${[["auto", "Sistem"], ["light", "Açık"], ["dark", "Koyu"]].map(([k, v]) => `<button class="${s.theme === k ? "on" : ""}" data-action="set-theme" data-t="${k}">${v}</button>`).join("")}</div>
        </section>
        <section>
          <h3>Başlangıç tarihi</h3>
          <p class="muted" style="font-size:.85rem">Varsayılan: 23 Kasım 2026 (Pazartesi). Pazartesi olmalı.</p>
          <input type="date" value="${s.startDate}" data-change="start-date" style="width:auto">
        </section>
        <section>
          <h3>Vize / ara hafta ekle</h3>
          <p class="muted" style="font-size:.85rem">Kural: Bahar vizelerinde o haftayı 10 saate indir ve programı bir hafta kaydır. Eklediğin ara hafta, seçtiğin haftadan önce girer; sonraki tüm haftalar bir hafta kayar. İşaretlediğin görevler haftaya bağlı olduğu için kaybolmaz.</p>
          <form data-form="add-extra" class="btn-row">
            <input type="text" name="label" value="Vize haftası" style="flex:1;min-width:140px">
            <select name="before" style="width:auto">${P.weeks.map((w) => `<option value="${w.n}" ${w.n === 14 ? "selected" : ""}>Hafta ${w.n}'den önce</option>`).join("")}<option value="24">En sona</option></select>
            <button class="btn primary" type="submit">Ekle</button>
          </form>
          ${extras ? `<ul style="padding-left:18px">${extras}</ul>` : ""}
          <p class="muted" style="font-size:.85rem">Program bitişi: <b>${fmt(programEnd())}</b></p>
        </section>
        <section>
          <h3>Yedek</h3>
          <p class="muted" style="font-size:.85rem">Veriler bu tarayıcıda saklanır. Başka cihaza geçmek ya da güvende tutmak için yedek al.</p>
          <div class="btn-row">
            <button class="btn" data-action="export-json">⬇ Yedek al (JSON)</button>
            <label class="btn">⬆ Yedekten yükle<input type="file" accept="application/json,.json" data-change="import-json" hidden></label>
            <button class="btn" data-action="export-md">Notları Markdown indir</button>
          </div>
        </section>
        <section>
          <h3>Sıfırla</h3>
          <button class="btn danger" data-action="reset-all">Tüm veriyi sil</button>
        </section>
      </div>`;
  }

  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportMarkdown() {
    let md = `# Higgs Günlüğü\n\n`;
    SLOTS.forEach((s) => {
      const parts = [];
      for (let d = 0; d < 7; d++) {
        const dt = dateOf(s, d); const n = state.notes[iso(dt)];
        if (n && n.text && n.text.trim()) parts.push(`### ${fmt(dt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}\n\n${n.text.trim()}\n`);
      }
      const e = s.type === "week" ? state.exams[s.week.n] : null;
      const r = state.reflections[s.type === "week" ? s.week.n : s.key];
      if (!parts.length && !(e && e.answer) && !r) return;
      md += `## ${slotTitle(s)}${s.week ? " — " + s.week.topic : ""}\n\n`;
      if (e && e.answer) md += `**Sınama:** ${s.week.question}\n\n> ${e.answer.trim().replace(/\n/g, "\n> ")}\n\n${e.passed ? "✓ Geçti\n\n" : ""}`;
      if (r) md += `**Haftalık not:** zaman ${r.q1 ?? "–"}/5 · devam isteği ${r.q2 ?? "–"} · fazladan ${r.q3 ?? "–"} · kodlama ${r.q4 ?? "–"}/5${r.q5 ? ` · en ilginç: ${r.q5}` : ""}\n\n`;
      md += parts.join("\n") + "\n";
    });
    if (state.questions.length) {
      md += `## Sorular\n\n` + state.questions.map((q) => `- [${q.status === "cozuldu" ? "x" : " "}] ${q.text.replace(/\n/g, " ")}${q.answer ? ` — ${q.answer.replace(/\n/g, " ")}` : ""}`).join("\n") + "\n";
    }
    download("higgs-gunlugu.md", md, "text/markdown");
  }

  // ---------- Zamanlayıcı ----------
  const timerElapsed = () => state.timer.elapsed + (state.timer.running ? Date.now() - state.timer.startedAt : 0);
  const modeTarget = (m) => (m === "focus" ? 50 * 60e3 : m === "rule30" ? 30 * 60e3 : 0);
  function tick() {
    const el = $("#clock");
    const tm = state.timer;
    const e = timerElapsed();
    const target = modeTarget(tm.mode);
    const show = target ? Math.max(0, target - e) : e;
    const s = Math.floor(show / 1000);
    const txt = `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    if (el) {
      el.textContent = txt;
      el.classList.toggle("warn", !!target && show < 5 * 60e3 && tm.running);
    }
    document.title = tm.running ? `${txt} · Higgs Günlüğü` : "Higgs Günlüğü · Çalışma Programı";
    if (tm.running && target && e >= target) {
      tm.running = false; tm.elapsed = target;
      beep();
      try { if (Notification.permission === "granted") new Notification(tm.mode === "rule30" ? "30 dakika doldu" : "Odak seansı bitti", { body: tm.mode === "rule30" ? "Çıkmadıysa soruyu işaretle ve devam et." : "Süre kaydedildi. Kısa bir mola ver." }); } catch {}
      const mode = tm.mode;
      stopTimer(true);
      if (mode === "rule30") { toast("30 dakika doldu — çıkmadıysa soruyu işaretle ve devam et"); setTimeout(() => $('[data-form="add-question"] textarea')?.focus(), 100); }
      else toast("Odak seansı bitti, 50 dk kaydedildi ✓");
    }
  }
  function stopTimer(silent) {
    const tm = state.timer;
    const e = timerElapsed();
    const date = tm.date || iso(today());
    if (e >= 60e3) {
      const hrs = round1(e / 3600e3 * 100) / 100;
      state.hours[date] = Math.round(((state.hours[date] || 0) + e / 3600e3) * 100) / 100;
      if (!silent) toast(`${Math.round(e / 60e3)} dakika kaydedildi ✓`);
      void hrs;
    } else if (!silent) toast("1 dakikadan kısa, kaydedilmedi");
    Object.assign(tm, { running: false, startedAt: 0, elapsed: 0, date: null });
    save(); render();
  }
  setInterval(tick, 1000);

  // ---------- Olaylar ----------
  function rerenderKeep() { const y = scrollY; render(); scrollTo(0, y); }
  function maybeCelebrate(date, before) {
    const st = dayStatus(date);
    if (st && st.total && st.done === st.total && before < 1) { confetti(); toast("Günün tüm görevleri tamam 🎉"); }
  }
  const slotFromAttr = (k) => slotByKey(k);

  const actions = {
    "toggle-task": (el) => {
      const slot = slotFromAttr(el.dataset.slot), dow = +el.dataset.dow, id = el.dataset.id;
      const date = dateOf(slot, dow); const before = dayStatus(date).ratio;
      const cur = !!(state.tasks[taskKey(slot, dow)] || {})[id];
      setTask(slot, dow, id, !cur);
      rerenderKeep(); maybeCelebrate(date, before);
    },
    "toggle-custom": (el) => {
      const d = el.dataset.date; const date = parseISO(d); const before = dayStatus(date)?.ratio ?? 0;
      const t = (state.custom[d] || []).find((x) => x.id === el.dataset.id); if (t) t.done = !t.done;
      save(); rerenderKeep(); maybeCelebrate(date, before);
    },
    "del-custom": (el) => { const d = el.dataset.date; state.custom[d] = (state.custom[d] || []).filter((x) => x.id !== el.dataset.id); save(); rerenderKeep(); },
    energy: (el) => { const d = el.dataset.date; state.notes[d] = state.notes[d] || {}; const v = +el.dataset.v; state.notes[d].energy = state.notes[d].energy === v ? undefined : v; save(); rerenderKeep(); },
    "exam-pass": (el) => {
      const n = +el.dataset.n; state.exams[n] = state.exams[n] || {}; state.exams[n].passed = !state.exams[n].passed;
      const s = slotOfWeek(n); setTask(s, 5, "exam", state.exams[n].passed);
      if (state.exams[n].passed) toast(`Hafta ${n} sınaması geçildi ✓`);
      rerenderKeep();
    },
    refl: (el) => {
      const k = el.dataset.k, q = el.dataset.q; let v = el.dataset.v; if (/^\d$/.test(v)) v = +v;
      state.reflections[k] = state.reflections[k] || {};
      state.reflections[k][q] = state.reflections[k][q] === v ? undefined : v;
      syncReflTask(k); save(); rerenderKeep();
    },
    "phase-check": (el) => {
      const k = el.dataset.k; state.phaseChecks[k] = !state.phaseChecks[k];
      const ph = P.phases[+k.split("-")[0] - 1];
      const all = ph.checks.every((_, i) => state.phaseChecks[`${ph.id}-${i}`]);
      const endWeek = P.weeks.filter((w) => w.phase === ph.id && w.phaseEnd).slice(-1)[0];
      if (endWeek) setTask(slotOfWeek(endWeek.n), 5, "phase", all);
      if (all) { confetti(); toast(`Faz ${ph.id} kontrolü tamam!`); }
      save(); rerenderKeep();
    },
    teacher: (el) => { const id = el.dataset.id; state.teacher[id] = state.teacher[id] || {}; state.teacher[id].done = !state.teacher[id].done; save(); rerenderKeep(); },
    "q-filter": (el) => { views.sorular.f = el.dataset.f; rerenderKeep(); },
    "del-question": (el) => { if (!confirm("Bu soru silinsin mi?")) return; state.questions = state.questions.filter((q) => q.id !== el.dataset.id); save(); rerenderKeep(); },
    "timer-mode": (el) => { if (state.timer.running) return; state.timer.mode = el.dataset.mode; state.timer.elapsed = 0; save(); rerenderKeep(); },
    "timer-start": () => {
      const tm = state.timer; tm.running = true; tm.startedAt = Date.now(); tm.date = tm.date || iso(today());
      try { if ("Notification" in window && Notification.permission === "default" && tm.mode !== "stopwatch") Notification.requestPermission(); } catch {}
      save(); rerenderKeep(); tick();
    },
    "timer-pause": () => { const tm = state.timer; tm.elapsed = timerElapsed(); tm.running = false; save(); rerenderKeep(); tick(); },
    "timer-stop": () => stopTimer(false),
    "timer-reset": () => { if (!confirm("Süre kaydedilmeden sıfırlansın mı?")) return; Object.assign(state.timer, { running: false, elapsed: 0, startedAt: 0, date: null }); save(); rerenderKeep(); tick(); },
    "toggle-theme": () => {
      const cur = state.settings.theme === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : state.settings.theme;
      state.settings.theme = cur === "dark" ? "light" : "dark"; applyTheme(); save();
    },
    "set-theme": (el) => { state.settings.theme = el.dataset.t; applyTheme(); save(); renderSettings(); },
    "open-settings": () => { renderSettings(); $("#settings").showModal(); },
    "close-settings": () => $("#settings").close(),
    "del-extra": (el) => {
      if (!confirm("Bu ara hafta kaldırılsın mı? Sonraki haftalar bir hafta geri kayar.")) return;
      state.settings.extraWeeks = state.settings.extraWeeks.filter((x) => x.id !== el.dataset.id);
      SLOTS = buildSlots(); save(); if ($("#settings").open) renderSettings(); render();
    },
    "export-json": () => download(`higgs-gunlugu-yedek-${iso(today())}.json`, JSON.stringify(state, null, 2), "application/json"),
    "export-md": exportMarkdown,
    "reset-all": () => {
      if (!confirm("Tüm ilerleme, notlar ve sorular silinecek. Emin misin?")) return;
      if (!confirm("Geri alınamaz. Önce yedek almak isteyebilirsin. Silinsin mi?")) return;
      state = defaultState(); SLOTS = buildSlots(); save(); applyTheme(); $("#settings").close(); render(); toast("Veriler silindi");
    },
    "preset-z": () => {
      const c = $('[data-tool="mass"]');
      const set = (k, v) => ($(`[data-tool-in="${k}"]`, c).value = v);
      set("pt1", 42.3); set("eta1", 0.62); set("phi1", 0.4); set("m1", 0.10566);
      set("pt2", 40.8); set("eta2", -0.27); set("phi2", -2.85); set("m2", 0.10566);
      computeTools();
    },
    "preset-higgs": () => {
      const c = $('[data-tool="events"]');
      const set = (k, v) => ($(`[data-tool-in="${k}"]`, c).value = v);
      set("sigma", 55.1); set("lumi", 139); set("br", 0.000125); set("eff", 0.4);
      computeTools();
    }
  };

  function syncReflTask(k) {
    const r = state.reflections[k] || {};
    const complete = P.reflectionQuestions.every((q) => r[q.id] !== undefined && r[q.id] !== "");
    const slot = /^\d+$/.test(k) ? slotOfWeek(+k) : slotByKey(k);
    if (slot) setTask(slot, 5, "refl", complete);
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    if (el.tagName === "LABEL") e.preventDefault();
    const fn = actions[el.dataset.action];
    if (fn) fn(el, e);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      const el = e.target.closest?.(".check[data-action]");
      if (el) { e.preventDefault(); el.click(); return; }
    }
    if (e.target.matches("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
    const r = route();
    if (r.name === "gun" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      const d = r.param ? parseISO(r.param) : today();
      location.hash = "#gun/" + iso(addDays(d, e.key === "ArrowLeft" ? -1 : 1));
    } else if (e.key === "t" || e.key === "T") location.hash = "#bugun";
    else if (e.key === "p" || e.key === "P") location.hash = "#program";
    else if ((e.key === "n" || e.key === "N") && $('[data-input="note"]')) { e.preventDefault(); $('[data-input="note"]').focus(); }
  });

  const hintSaved = () => { const h = $("#note-saved"); if (h) { h.classList.add("show"); clearTimeout(hintSaved.t); hintSaved.t = setTimeout(() => h.classList.remove("show"), 1200); } };
  const inputs = {
    note: (el) => { const d = el.dataset.date; state.notes[d] = state.notes[d] || {}; state.notes[d].text = el.value; state.notes[d].updated = Date.now(); save(); hintSaved(); },
    exam: (el) => { const n = +el.dataset.n; state.exams[n] = state.exams[n] || {}; state.exams[n].answer = el.value; save(); },
    "refl-text": (el) => {
      const k = el.dataset.k; state.reflections[k] = state.reflections[k] || {};
      state.reflections[k][el.dataset.q] = el.value || undefined;
      const before = JSON.stringify(state.tasks); syncReflTask(k); save();
      if (before !== JSON.stringify(state.tasks)) { clearTimeout(inputs.t); inputs.t = setTimeout(() => { const pos = el.selectionStart; rerenderKeep(); const ne = $(`[data-input="refl-text"][data-k="${k}"]`); if (ne) { ne.focus(); ne.setSelectionRange(pos, pos); } }, 700); }
    },
    "q-answer": (el) => { const q = state.questions.find((x) => x.id === el.dataset.id); if (q) { q.answer = el.value; save(); } },
    "teacher-note": (el) => { const id = el.dataset.id; state.teacher[id] = state.teacher[id] || {}; state.teacher[id].note = el.value; save(); },
    "diary-search": (el) => {
      views.gunluk.q = el.value;
      const tmp = document.createElement("div"); tmp.innerHTML = views.gunluk(null, el.value);
      $("#diary-list").replaceWith($("#diary-list", tmp));
      el.parentElement.querySelector(".muted").textContent = $(".muted", tmp.querySelector(".card")).textContent;
    }
  };
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-input]");
    if (el && inputs[el.dataset.input]) inputs[el.dataset.input](el);
    if (e.target.closest("[data-tool-in]")) computeTools();
  });

  const changes = {
    "goto-date": (el) => { if (el.value) location.hash = "#gun/" + el.value; },
    hours: (el) => { const v = parseFloat(el.value); const d = el.dataset.date; if (isNaN(v) || v <= 0) delete state.hours[d]; else state.hours[d] = Math.min(24, v); save(); rerenderKeep(); },
    "q-status": (el) => { const q = state.questions.find((x) => x.id === el.dataset.id); if (q) { q.status = el.value; save(); rerenderKeep(); } },
    "start-date": (el) => {
      if (!el.value) return;
      const d = parseISO(el.value);
      if (dowOf(d) !== 0) { toast("Başlangıç Pazartesi olmalı"); el.value = state.settings.startDate; return; }
      state.settings.startDate = el.value; SLOTS = buildSlots(); save(); renderSettings(); render();
    },
    "import-json": (el) => {
      const f = el.files[0]; if (!f) return;
      f.text().then((txt) => {
        const data = JSON.parse(txt);
        if (!data || typeof data !== "object" || !data.settings) throw new Error("bad");
        if (!confirm("Mevcut veriler yedektekilerle değiştirilecek. Devam?")) return;
        state = Object.assign(defaultState(), data); state.settings = Object.assign(defaultState().settings, data.settings);
        state.timer = defaultState().timer;
        SLOTS = buildSlots(); save(); applyTheme(); renderSettings(); render(); toast("Yedek yüklendi ✓");
      }).catch(() => toast("Dosya okunamadı — geçerli bir yedek mi?"));
    }
  };
  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-change]");
    if (el && changes[el.dataset.change]) changes[el.dataset.change](el);
  });

  document.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-form]"); if (!f) return;
    e.preventDefault();
    const kind = f.dataset.form;
    if (kind === "add-custom") {
      const v = f.t.value.trim(); if (!v) return;
      const d = f.dataset.date; (state.custom[d] = state.custom[d] || []).push({ id: uid(), text: v, done: false });
      save(); rerenderKeep(); $('[data-form="add-custom"] input')?.focus();
    } else if (kind === "add-question") {
      const v = f.q.value.trim(); if (!v) { f.q.focus(); return; }
      const status = e.submitter?.value || "acik";
      state.questions.push({ id: uid(), text: v, date: f.dataset.date, slot: f.dataset.slot, status, answer: "" });
      save(); rerenderKeep(); toast(status === "hoca" ? "Hocaya sorulacaklar listesine eklendi" : "Soru işaretlendi — devam et 💪");
    } else if (kind === "add-extra") {
      const before = +f.before.value; const label = f.label.value.trim() || "Vize haftası";
      state.settings.extraWeeks.push({ id: uid(), before, label });
      SLOTS = buildSlots(); save(); renderSettings(); render(); toast("Ara hafta eklendi, program kaydırıldı");
    }
  });

  // Tooltip
  const tipEl = $("#tooltip");
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el) { tipEl.hidden = true; return; }
    tipEl.textContent = el.getAttribute("data-tip"); tipEl.hidden = false;
  });
  document.addEventListener("mousemove", (e) => {
    if (tipEl.hidden) return;
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14;
    if (y + h > innerHeight - 8) y = e.clientY - h - 14;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
  });
  document.addEventListener("mouseleave", () => (tipEl.hidden = true));

  // ---------- Yönlendirme ----------
  function route() {
    const h = (location.hash || "#bugun").slice(1);
    const [name, param] = h.split("/");
    if (name === "bugun" || !views[name]) return { name: "gun", nav: "bugun", param: null };
    return { name, nav: name === "gun" ? (param === iso(today()) ? "bugun" : "") : name === "hafta" ? "program" : name, param };
  }
  let lastRoute = "";
  function render() {
    const r = route();
    $("#main").innerHTML = views[r.name](r.param);
    $$(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === r.nav));
    const o = overall();
    $("#progress-strip").innerHTML = `<i style="width:${o.ratio * 100}%"></i>`;
    $("#progress-strip").title = `Genel ilerleme ${pct(o.ratio)}`;
    const oq = openQuestions().length; $("#q-count").textContent = oq || "";
    const loc = locate(today());
    $("#brand-sub").textContent = loc.slot ? `${slotTitle(loc.slot)} · Faz ${loc.slot.phase.id} · %${Math.round(o.ratio * 100)}` : loc.before ? `Başlangıca ${loc.daysTo} gün` : "Program tamamlandı";
    if (r.name === "araclar") computeTools();
    tick();
    const key = location.hash;
    if (key !== lastRoute) { lastRoute = key; scrollTo(0, 0); }
  }
  window.addEventListener("hashchange", render);
  applyTheme();
  render();
})();
