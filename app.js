(() => {
const $ = s => document.querySelector(s), KEY = 'hm-tracker-v1';
const S = DATA.sessions;
let st = { done: {}, mode: 'adj' };
try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dt = s => new Date(s + 'T00:00:00');
const today = () => iso(new Date());
const fmt = s => dt(s).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
const km = s => st.mode === 'adj' ? s.ka : s.ko;
const txt = s => st.mode === 'adj' ? s.pa : s.po;
const nk = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const isRam = w => w >= 11 && w <= 15;
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function toggle(d) { st.done[d] ? delete st.done[d] : st.done[d] = 1; save(); render(); }

function row(s, showDate) {
  const k = km(s), done = st.done[s.d];
  return `<div class="row ${done ? 'done' : ''}" data-d="${s.d}">
    <div class="chk">${done ? '✓' : ''}</div>
    <div class="t"><b>${esc(s.t)}${k ? ' · ' + nk(k) + ' km' : ''}</b>
    <small>${showDate ? fmt(s.d) + ' · ' : s.day + ', ' + dt(s.d).getDate() + ' · '}${esc(txt(s))}</small></div></div>`;
}

function stats() {
  const done = S.filter(s => st.done[s.d]);
  const kmDone = done.reduce((a, s) => a + km(s), 0), kmTot = S.reduce((a, s) => a + km(s), 0);
  return { n: done.length, kmDone, kmTot, pct: Math.round(done.length / S.length * 100) };
}

function renderToday() {
  const t = today(), x = stats();
  let cur = S.find(s => s.d === t);
  const isToday = !!cur;
  if (!cur) cur = S.find(s => s.d > t && !st.done[s.d]) || S.find(s => !st.done[s.d]);
  const next = S.filter(s => s.d > (cur ? cur.d : t) && !st.done[s.d]).slice(0, 4);
  let html = `<div class="stats">
    <div class="stat"><b>${x.n}/${S.length}</b><span>sesi selesai</span></div>
    <div class="stat"><b>${nk(x.kmDone)}</b><span>km lari selesai</span></div>
    <div class="stat"><b>${x.pct}%</b><span>progres</span></div></div>
    <div class="bar" style="margin-bottom:16px"><i style="width:${x.pct}%"></i></div>`;
  if (!cur) {
    html += `<div class="card big"><h3>🎉 Semua sesi selesai!</h3><p>Selamat, plan sudah tuntas.</p></div>`;
  } else {
    const k = km(cur), changed = st.mode === 'adj' && cur.chg && cur.po !== cur.pa;
    html += `<h2>${isToday ? 'Sesi hari ini' : t < S[0].d ? 'Sesi pertama' : 'Sesi berikutnya'}</h2>
    <div class="card big">
      <span class="tag">${cur.ph}</span><span class="tag">Minggu ${cur.w}</span>${isRam(cur.w) ? '<span class="tag ram">Ramadan</span>' : ''}
      <h3>${esc(cur.t)}</h3>
      <p>${fmt(cur.d)}</p>
      ${k ? `<div class="km">${nk(k)} km</div>` : ''}
      <p style="margin-top:6px;color:var(--tx)">${esc(txt(cur))}</p>
      ${changed ? `<div class="old">Awal: ${esc(cur.po)}</div>` : ''}
      <button class="btn ${st.done[cur.d] ? 'undo' : ''}" data-d="${cur.d}">${st.done[cur.d] ? 'Batalkan selesai' : '✓ Tandai selesai'}</button>
    </div>`;
  }
  if (next.length) html += `<h2>Berikutnya</h2><div class="card">${next.map(s => row(s, true)).join('')}</div>`;
  $('#today').innerHTML = html;
}

function renderPlan() {
  const t = today(), weeks = [...new Set(S.map(s => s.w))];
  const curW = (S.find(s => s.d >= t) || S[S.length - 1]).w;
  let html = `<div class="toggle"><button data-m="adj" class="${st.mode === 'adj' ? 'on' : ''}">Disesuaikan (Ramadan)</button><button data-m="ori" class="${st.mode === 'ori' ? 'on' : ''}">Plan awal</button></div>`;
  weeks.forEach(w => {
    const ss = S.filter(s => s.w === w), d = ss.filter(s => st.done[s.d]).length, k = ss.reduce((a, s) => a + km(s), 0);
    html += `<details class="${w === curW ? 'now' : ''}" ${w === curW ? 'open' : ''}>
      <summary><div><b>Minggu ${w} · ${ss[0].ph}</b><small>${fmt(ss[0].d)}${isRam(w) ? ' · 🌙 Ramadan' : ''}</small></div>
      <div class="r">${nk(k)} km<br>${d}/${ss.length} sesi ${d === ss.length ? '✅' : ''}</div></summary>
      <div class="in">${ss.map(s => row(s)).join('')}</div></details>`;
  });
  $('#plan').innerHTML = html;
}

function renderInfo() {
  const dd = s => dt(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  $('#info').innerHTML = `<h2>Tanggal penting</h2><div class="card"><table>
    <tr><td>Mulai latihan</td><td>${dd(DATA.start)}</td></tr>
    <tr><td>1 Ramadan (KHGT)</td><td>${dd(DATA.ramadan)}</td></tr>
    <tr><td>Idulfitri (KHGT)</td><td>${dd(DATA.lebaran)}</td></tr>
    <tr><td><b>Race day</b></td><td><b>${dd(DATA.race)}</b></td></tr></table></div>
    <h2>Zona latihan</h2><div class="card"><table>
    <tr><th>Zona</th><th>HR</th><th>Pace</th></tr>
    ${DATA.zones.map(z => `<tr><td><b>${esc(z[0])}</b><br><small style="color:var(--mu)">${esc(z[3])}</small></td><td>${esc(z[1])}</td><td>${esc(z[2])}</td></tr>`).join('')}</table></div>
    <h2>Panduan Ramadan & umum</h2><div class="card"><dl class="g">
    ${DATA.guide.map(g => `<dt>${esc(g[0])}</dt><dd>${esc(g[1])}</dd>`).join('')}</dl></div>
    <h2>Data</h2><div class="card"><p style="color:var(--mu);font-size:14px;margin-bottom:10px">Progres tersimpan di browser ini.</p>
    <button class="btn sm" id="reset">Reset semua progres</button></div>`;
}

function renderHead() {
  const diff = Math.round((dt(DATA.race) - dt(today())) / 864e5);
  $('#days').textContent = diff > 0 ? diff : diff === 0 ? '🏁' : '✓';
  $('.count span').textContent = diff > 0 ? 'hari lagi' : diff === 0 ? 'race day!' : 'selesai';
  $('#sub').textContent = 'Race ' + dt(DATA.race).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · target 2:30–2:36';
}

function render() { renderHead(); renderToday(); renderPlan(); renderInfo(); }

document.addEventListener('click', e => {
  const r = e.target.closest('[data-d]'); if (r) return toggle(r.dataset.d);
  const m = e.target.closest('[data-m]'); if (m) { st.mode = m.dataset.m; save(); return render(); }
  const n = e.target.closest('nav button');
  if (n) {
    document.querySelectorAll('nav button, .view').forEach(x => x.classList.remove('on', 'active'));
    n.classList.add('on'); $('#' + n.dataset.v).classList.add('active'); scrollTo(0, 0);
  }
  if (e.target.id === 'reset' && confirm('Hapus semua progres?')) { st.done = {}; save(); render(); }
});

render();
})();