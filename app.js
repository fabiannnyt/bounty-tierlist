(() => {
"use strict";

const SB_URL = "https://ekioqxtazurafzyrnbxb.supabase.co";
const SB_KEY = "sb_publishable_pEw21Cdi-Vd499oxX1488w_pguQ4W_I";
const TIERS = [
  ["S", "Goated"], ["A", "Sterk"], ["B", "Prima"], ["C", "Gemiddeld"], ["D", "Zwak"], ["F", "Free kill"]
];
const PLAYERS = window.PLAYERS || [];
const BY_LOGIN = Object.fromEntries(PLAYERS.map(p => [p.login, p]));
const TW_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.3 3 3 6.4v13.1h4.5V22h2.5l2.5-2.5h3.6L21 14.6V3H4.3Zm15.1 10.8-2.7 2.7h-4.5l-2.4 2.4v-2.4H6V4.7h13.4v9.1Zm-2.7-5.6v4.7h-1.6V8.2h1.6Zm-4.5 0v4.7h-1.6V8.2h1.6Z"/></svg>';

const $ = s => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/* ---------- storage (veilig) ---------- */
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

/* ---------- Supabase RPC ---------- */
async function rpc(fn, args = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SB_KEY },
    body: JSON.stringify(args)
  });
  const txt = await r.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error((data && data.message) || `Fout ${r.status}`);
  return data;
}

let me = null;            // {login, display}
let tiers = emptyTiers(); // {S:[logins]...}
let saveTimer = null;
let selected = null;      // login (tik-modus)

function emptyTiers() { return Object.fromEntries(TIERS.map(([t]) => [t, []])); }

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600);
}

/* ---------- Login ---------- */
function showLogin() {
  $("#app").hidden = true; $("#login").hidden = false;
  const faces = $("#faces");
  if (!faces.childElementCount) {
    const list = [...PLAYERS, ...PLAYERS, ...PLAYERS];
    for (const p of list) { const i = el("img"); i.src = `img/${p.login}.webp`; i.alt = ""; i.loading = "lazy"; faces.append(i); }
  }
  setTimeout(() => $("#name").focus(), 50);
}

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("#name").value.trim().replace(/^@/, "");
  const err = $("#login-err"); err.textContent = "";
  if (!name) return;
  const btn = $("#login-btn"); btn.disabled = true; btn.textContent = "Even checken…";
  try {
    const rows = await rpc("tier_login", { p_name: name });
    if (!rows || !rows.length) { err.textContent = `"${name}" staat niet in de Bounty SMP-spelerslijst.`; return; }
    me = rows[0]; store.set("bt_me", me);
    startApp();
  } catch (ex) {
    err.textContent = "Kon niet verbinden. Probeer het zo nog eens.";
  } finally { btn.disabled = false; btn.textContent = "Inloggen"; }
});

$("#logout").addEventListener("click", () => {
  flushSave(); me = null; store.del("bt_me"); $("#name").value = ""; showLogin();
});

/* ---------- App start ---------- */
async function startApp() {
  $("#login").hidden = true; $("#app").hidden = false;
  $("#me-img").src = `img/${me.login}.webp`;
  $("#me-name").textContent = me.display;
  showTab("mine");
  setStatus("busy", "Laden…");
  tiers = emptyTiers(); renderMine();
  try {
    const res = await rpc("tier_get", { p_login: me.login });
    tiers = normalize(res && res.tiers);
    renderMine();
    setStatus("ok", res ? `Opgeslagen ${fmtTime(res.updated_at)}` : "Nog niet opgeslagen");
  } catch { setStatus("bad", "Laden mislukt"); }
  refreshCount();
}

function normalize(t) {
  const out = emptyTiers(), seen = new Set();
  if (t && typeof t === "object") for (const [k] of TIERS) for (const l of (t[k] || [])) if (BY_LOGIN[l] && !seen.has(l)) { out[k].push(l); seen.add(l); }
  return out;
}
function placed() { return new Set(Object.values(tiers).flat()); }
function poolList() { const p = placed(); return PLAYERS.filter(x => !p.has(x.login)).map(x => x.login); }

function fmtTime(iso) {
  const d = new Date(iso), now = new Date();
  const t = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === now.toDateString() ? `om ${t}` : `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} ${t}`;
}
function setStatus(kind, text) {
  const s = $("#status"); s.className = "status" + (kind === "busy" ? " busy" : kind === "bad" ? " bad" : "");
  s.querySelector("span").textContent = text;
}

/* ---------- Render ---------- */
function card(login, opts = {}) {
  const p = BY_LOGIN[login];
  const c = el("div", "card"); c.dataset.login = login;
  c.title = p.twitch ? `twitch.tv/${p.name}  ·  MC: ${p.mc}` : `Minecraft: ${p.mc} (geen Twitch)`;
  if (me && login === me.login) c.classList.add("me-card");
  const img = el("img"); img.src = `img/${login}.webp?v=2`; img.alt = ""; img.draggable = false; img.loading = "lazy"; img.width = 64; img.height = 64;
  const badge = p.twitch ? el("span", "tw") : el("span", "mc", "MC");
  if (p.twitch) badge.innerHTML = TW_ICON;
  c.append(img, el("span", "nm", p.name), badge);
  if (opts.editable) { c.tabIndex = 0; c.setAttribute("role", "button"); c.setAttribute("aria-label", p.name); }
  return c;
}

function buildBoard(t, editable) {
  const board = el("div", "board" + (editable ? " editable" : " readonly"));
  for (const [k, sub] of TIERS) {
    const row = el("div", "row"); row.style.setProperty("--c", `var(--${k})`);
    const lab = el(editable ? "button" : "div", "label"); lab.textContent = k; lab.append(el("small", null, sub));
    if (editable) { lab.type = "button"; lab.dataset.tier = k; lab.setAttribute("aria-label", `Plaats in ${k}-tier`); }
    const zone = el("div", "zone"); zone.dataset.tier = k;
    for (const l of t[k]) zone.append(card(l, { editable }));
    if (!t[k].length) zone.append(el("span", "empty", editable ? "Sleep hier spelers naartoe" : "—"));
    row.append(lab, zone); board.append(row);
  }
  return board;
}

function renderMine() {
  const b = buildBoard(tiers, true); b.id = "board";
  $("#board").replaceWith(b);
  const pool = $("#pool"); pool.replaceChildren();
  for (const l of poolList()) pool.append(card(l, { editable: true }));
  applySearch(); updateCounts(); markSelected();
}

function updateCounts() {
  const n = placed().size;
  $("#pool-count").textContent = PLAYERS.length - n;
  $("#progress").textContent = `${n} / ${PLAYERS.length} ingedeeld`;
  for (const z of document.querySelectorAll("#board .zone")) {
    const has = z.querySelector(".card"); const em = z.querySelector(".empty");
    if (has && em) em.remove();
    if (!has && !em) z.append(el("span", "empty", "Sleep hier spelers naartoe"));
  }
}

function applySearch() {
  const q = $("#q").value.trim().toLowerCase();
  for (const c of document.querySelectorAll("#pool .card")) {
    const p = BY_LOGIN[c.dataset.login];
    c.classList.toggle("hidden-by-search", !!q && !(p.name + " " + p.mc).toLowerCase().includes(q));
  }
}
$("#q").addEventListener("input", applySearch);

/* Lees de volgorde terug uit de DOM na slepen */
function readDom() {
  const t = emptyTiers();
  for (const z of document.querySelectorAll("#board .zone")) t[z.dataset.tier] = [...z.querySelectorAll(".card")].map(c => c.dataset.login);
  tiers = t;
}

/* ---------- Opslaan ---------- */
function queueSave() {
  setStatus("busy", "Opslaan…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 600);
}
async function doSave() {
  saveTimer = null;
  if (!me) return;
  try {
    const ts = await rpc("tier_save", { p_login: me.login, p_tiers: tiers });
    setStatus("ok", `Opgeslagen ${fmtTime(ts)}`);
    refreshCount();
  } catch { setStatus("bad", "Opslaan mislukt, probeer opnieuw"); }
}
function flushSave() { if (saveTimer) { clearTimeout(saveTimer); doSave(); } }
window.addEventListener("beforeunload", flushSave);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });

/* Reset met dubbele klik ter bevestiging */
$("#reset").addEventListener("click", () => {
  const b = $("#reset");
  if (!b.classList.contains("armed")) {
    b.classList.add("armed"); b.textContent = "Zeker weten? Klik nogmaals";
    clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove("armed"); b.textContent = "Alles terugzetten"; }, 3000);
    return;
  }
  b.classList.remove("armed"); b.textContent = "Alles terugzetten";
  tiers = emptyTiers(); renderMine(); queueSave();
});

/* ---------- Tik-modus (mobiel & toetsenbord) ---------- */
function markSelected() {
  document.querySelectorAll("#view-mine .card.sel").forEach(c => c.classList.remove("sel"));
  $("#view-mine").classList.toggle("selecting", !!selected);
  if (selected) { const c = document.querySelector(`#view-mine .card[data-login="${CSS.escape(selected)}"]`); if (c) c.classList.add("sel"); else selected = null; }
}
function moveTo(login, tier) {
  for (const k in tiers) tiers[k] = tiers[k].filter(l => l !== login);
  if (tier !== "pool") tiers[tier].push(login);
  selected = null; renderMine(); queueSave();
}
$("#view-mine").addEventListener("click", e => {
  if (justDragged) return;
  const c = e.target.closest(".card");
  const lab = e.target.closest(".label");
  const zone = e.target.closest(".zone");
  if (c) { selected = selected === c.dataset.login ? null : c.dataset.login; markSelected(); return; }
  if (selected && (lab || zone)) { moveTo(selected, (lab || zone).dataset.tier); return; }
});
$("#view-mine").addEventListener("keydown", e => {
  const c = e.target.closest(".card");
  if (!c) return;
  const k = e.key.toUpperCase();
  if (TIERS.some(([t]) => t === k)) { e.preventDefault(); moveTo(c.dataset.login, k); focusCard(c.dataset.login); }
  else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); moveTo(c.dataset.login, "pool"); focusCard(c.dataset.login); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); }
});
function focusCard(l) { const c = document.querySelector(`#view-mine .card[data-login="${CSS.escape(l)}"]`); if (c) c.focus(); }

/* ---------- Slepen (muis direct, touch na even vasthouden) ---------- */
let drag = null, justDragged = false;

$("#view-mine").addEventListener("pointerdown", e => {
  const c = e.target.closest(".card");
  if (!c || e.button > 0) return;
  const st = { card: c, x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType !== "mouse", started: false, timer: null };
  drag = st;
  if (!st.touch) e.preventDefault();   // geen tekstselectie / native drag
  if (st.touch) st.timer = setTimeout(() => { if (drag === st) beginDrag(st, st.x, st.y); }, 280);
});

window.addEventListener("pointermove", e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.started) {
    const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
    if (drag.touch) { if (moved > 10) cancelDrag(); return; }   // touch: scrollen
    if (moved < 5) return;
    beginDrag(drag, e.clientX, e.clientY);
  }
  moveDrag(e.clientX, e.clientY);
});
window.addEventListener("pointerup", e => { if (drag && e.pointerId === drag.id) endDrag(); });
window.addEventListener("pointercancel", e => { if (drag && e.pointerId === drag.id) { if (drag.started) endDrag(); else cancelDrag(); } });
document.addEventListener("contextmenu", e => { if (e.target.closest("#view-mine .card")) e.preventDefault(); });
// Blokkeer scrollen tijdens een touch-sleep
document.addEventListener("touchmove", e => { if (drag && drag.started) e.preventDefault(); }, { passive: false });

function cancelDrag() { if (drag) clearTimeout(drag.timer); drag = null; }

function beginDrag(st, x, y) {
  st.started = true;
  const r = st.card.getBoundingClientRect();
  st.dx = x - r.left; st.dy = y - r.top;
  const g = st.card.cloneNode(true); g.classList.add("drag-ghost"); g.classList.remove("sel");
  g.style.width = r.width + "px";
  document.body.append(g); st.ghost = g;
  st.card.classList.add("placeholder");
  document.body.classList.add("dragging");
  selected = null; markSelected();
  if (navigator.vibrate && st.touch) try { navigator.vibrate(15); } catch {}
  moveDrag(x, y);
}

function moveDrag(x, y) {
  const st = drag; if (!st || !st.ghost) return;
  st.ghost.style.transform = `translate(${x - st.dx}px, ${y - st.dy}px)`;
  const under = document.elementFromPoint(x, y);
  let zone = under && under.closest("#view-mine .zone");
  if (!zone && under) { const lab = under.closest("#view-mine .label"); if (lab) zone = lab.nextElementSibling; }
  document.querySelectorAll("#view-mine .zone.over").forEach(z => z !== zone && z.classList.remove("over"));
  if (!zone) return;
  zone.classList.add("over");
  // bepaal invoegpositie
  const cards = [...zone.querySelectorAll(".card:not(.placeholder):not(.hidden-by-search)")];
  let before = null;
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    if (y < r.top) { before = c; break; }
    if (y <= r.bottom && x < r.left + r.width / 2) { before = c; break; }
  }
  if (before) { if (st.card.nextElementSibling !== before) zone.insertBefore(st.card, before); }
  else if (zone.lastElementChild !== st.card) zone.append(st.card);
  // auto-scroll bij randen
  const edge = 70;
  if (y < edge) window.scrollBy(0, -12); else if (y > innerHeight - edge) window.scrollBy(0, 12);
}

function endDrag() {
  const st = drag; drag = null;
  if (!st) return;
  clearTimeout(st.timer);
  if (!st.started) return;
  st.ghost.remove(); st.card.classList.remove("placeholder");
  document.body.classList.remove("dragging");
  document.querySelectorAll("#view-mine .zone.over").forEach(z => z.classList.remove("over"));
  justDragged = true; setTimeout(() => justDragged = false, 50);
  const before = JSON.stringify(tiers);
  readDom(); updateCounts();
  if (JSON.stringify(tiers) !== before) queueSave();
}

/* ---------- Tabs ---------- */
function showTab(which) {
  $("#tab-mine").setAttribute("aria-selected", which === "mine");
  $("#tab-others").setAttribute("aria-selected", which === "others");
  $("#view-mine").hidden = which !== "mine";
  $("#view-others").hidden = which !== "others";
  if (which === "others") { flushSave(); loadOthers(); }
}
$("#tab-mine").addEventListener("click", () => showTab("mine"));
$("#tab-others").addEventListener("click", () => showTab("others"));

let othersCache = [], viewing = null;
async function refreshCount() {
  try {
    othersCache = (await rpc("tier_overview") || []).filter(o => o.ranked > 0);
    const n = othersCache.length;
    $("#count-saved").textContent = `${n} van de ${PLAYERS.length} spelers hebben een lijst gemaakt`;
  } catch {}
}

async function loadOthers() {
  const ppl = $("#people"); const wrap = $("#other-board-wrap");
  ppl.replaceChildren(el("span", "status", "Laden…"));
  await refreshCount();
  ppl.replaceChildren();
  if (!othersCache.length) { wrap.replaceChildren(el("div", "none", "Nog niemand heeft een tierlist opgeslagen.")); return; }
  for (const o of othersCache) {
    const b = el("button", "person"); b.type = "button"; b.dataset.login = o.login;
    const i = el("img"); i.src = `img/${o.login}.webp`; i.alt = "";
    b.append(i, document.createTextNode(o.display + (me && o.login === me.login ? " (jij)" : "")), el("small", null, `${o.ranked}/${PLAYERS.length}`));
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => openOther(o.login));
    ppl.append(b);
  }
  const first = (viewing && othersCache.find(o => o.login === viewing)) ? viewing : (othersCache.find(o => !me || o.login !== me.login) || othersCache[0]).login;
  openOther(first);
}

async function openOther(login) {
  viewing = login;
  document.querySelectorAll(".person").forEach(b => b.setAttribute("aria-pressed", b.dataset.login === login));
  const o = othersCache.find(x => x.login === login);
  $("#other-title").textContent = `Tierlist van ${o ? o.display : login}`;
  const wrap = $("#other-board-wrap");
  try {
    const res = await rpc("tier_get", { p_login: login });
    if (viewing !== login) return;
    const t = normalize(res && res.tiers);
    $("#other-when").textContent = res ? `Bijgewerkt ${fmtTime(res.updated_at)}` : "";
    wrap.replaceChildren(buildBoard(t, false));
  } catch { wrap.replaceChildren(el("div", "none", "Kon deze lijst niet laden.")); }
}

/* ---------- Boot ---------- */
(async () => {
  const saved = store.get("bt_me");
  if (saved && saved.login) {
    try {
      const rows = await rpc("tier_login", { p_name: saved.login });
      if (rows && rows.length) { me = rows[0]; startApp(); return; }
    } catch { me = saved; startApp(); return; }
  }
  showLogin();
})();
})();
