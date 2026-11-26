(() => {
const $ = s => document.querySelector(s), KEY = 'hm-tracker-v1';
const S = DATA.sessions, ORIG = JSON.parse(JSON.stringify(S));
const norm = o => Object.assign({ done: {}, mode: 'adj', edits: {}, log: {}, skip: {}, move: {}, lastBak: 0, lt: [], zn: {}, undo: null }, o);
let st = norm({});
try { st = norm(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
const applyEdits = () => {
  S.forEach((x, i) => Object.assign(x, ORIG[i]));
  Object.keys(st.edits || {}).forEach(d => { const x = S.find(y => y.d === d); if (x) Object.assign(x, st.edits[d]); });
};
applyEdits();
const dl = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
const show = () => { if (!$('#dlg').open) $('#dlg').showModal(); };

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dt = s => new Date(s + 'T00:00:00');
const today = () => iso(new Date());
const fmt = s => dt(s).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
const km = s => st.mode === 'adj' ? s.ka : s.ko;
const txt = s => st.mode === 'adj' ? s.pa : s.po;
const nk = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const isRam = w => w >= 11 && w <= 15;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ed = s => st.move[s.d] || s.d;
const pend = s => !st.done[s.d] && !st.skip[s.d];
const sorted = () => S.slice().sort((a, b) => ed(a) < ed(b) ? -1 : ed(a) > ed(b) ? 1 : 0);
const pc = sec => { const r = Math.round(sec); return Math.floor(r / 60) + ':' + pad(r % 60); };
const ak = s => { const l = st.log[s.d]; return l && l.km ? l.km : km(s); };
const target = s => (/Run 2/.test(s.t) || /Long run/.test(s.t)) && !/race pace/.test(txt(s)) ? [475, 535] : null;

function logInfo(s) {
  const l = st.log[s.d]; if (!l) return '';
  const p = [];
  if (l.km) p.push(nk(l.km) + ' km');
  if (l.min) p.push(Math.round(l.min) + ' mnt');
  if (l.km && l.min) {
    const sec = l.min * 60 / l.km, tg = target(s);
    p.push(pc(sec) + '/km' + (tg ? (sec < tg[0] ? ' (lebih cepat dari target)' : sec > tg[1] ? ' (lebih lambat dari target)' : ' (sesuai target)') : ''));
  }
  if (l.hr) p.push('HR ' + l.hr);
  if (l.rpe) p.push('RPE ' + l.rpe);
  if (l.sleep) p.push(l.sleep + ' jam tidur');
  if (l.fast) p.push('puasa');
  if (l.note) p.push('“' + esc(l.note) + '”');
  return p.join(' · ');
}

const act = s => { const d = s.d; return st.done[d]
  ? `<button class="btn" data-lg="${d}">Edit catatan</button><button class="btn sm" data-un="${d}">Batalkan selesai</button>`
  : `<button class="btn" data-lg="${d}">✓ Selesai & catat</button><button class="btn sm" data-sk="${d}">Skip</button><button class="btn sm" data-mv="${d}">Pindah tanggal</button>`
    + (st.skip[d] || st.move[d] ? `<button class="btn sm" data-un="${d}">Kembalikan</button>` : ''); };

function row(s) {
  const k = km(s), d = st.done[s.d], sk = st.skip[s.d], mv = st.move[s.d], li = d ? logInfo(s) : '';
  return `<div class="row ${d ? 'done' : sk ? 'skip' : ''}" data-s="${s.d}">
    <div class="chk">${d ? '✓' : sk ? '–' : mv ? '⇄' : ''}</div>
    <div class="t"><b>${esc(s.t)}${k ? ' · ' + nk(k) + ' km' : ''}</b>
    <small>${fmt(ed(s))}${mv ? ' (dipindah)' : ''}${sk ? ' · dilewati' : ''} · ${esc(txt(s))}</small>${li ? `<small class="lg">${li}</small>` : ''}</div>
    <button class="ed" data-e="${s.d}" aria-label="Edit sesi">✎</button></div>`;
}

function stats() {
  const n = S.filter(s => st.done[s.d]).length, sk = S.filter(s => st.skip[s.d]).length, tot = S.length - sk;
  return { n, sk, tot, pct: tot ? Math.round(n / tot * 100) : 100 };
}

const cw = () => (sorted().find(s => pend(s) && ed(s) >= today()) || S[S.length - 1]).w;
const weekAct = w => S.filter(s => s.w === w && st.done[s.d]).reduce((a, s) => a + ak(s), 0);

const weekCard = () => {
  const w = cw(), ss = S.filter(s => s.w === w), p = ss.reduce((a, s) => a + km(s), 0), a = weekAct(w);
  const left = ss.filter(pend).length, d = ss.filter(s => st.done[s.d]).length;
  return `<h2>Minggu ${w} · ${ss[0].ph}</h2><div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><b>${nk(a)} / ${nk(p)} km</b><span style="color:var(--mu)">${d} selesai · ${left} tersisa</span></div><div class="bar"><i style="width:${p ? Math.min(100, Math.round(a / p * 100)) : 0}%"></i></div></div>`;
};

const warns = () => {
  const w = cw(), m = [], a = weekAct(w), b = weekAct(w - 1);
  if (b > 0 && a > b * 1.1 && a - b >= 2) m.push(`Km minggu ini (${nk(a)}) sudah ${Math.round((a / b - 1) * 100)}% di atas minggu lalu (${nk(b)}). Kenaikan di atas ±10% per minggu menambah risiko cedera.`);
  const lr = S.filter(s => /Run 3/.test(s.t) && st.done[s.d] && st.log[s.d] && st.log[s.d].km);
  if (lr.length > 1) {
    const z = lr[lr.length - 1], x = st.log[z.d].km, y = st.log[lr[lr.length - 2].d].km;
    if (z.w >= w - 1 && x - y > 3) m.push(`Long run terakhir (${nk(x)} km) naik ${nk(x - y)} km dari sebelumnya. Pertimbangkan jangan menambah lagi minggu depan.`);
  }
  const rec = S.filter(s => st.done[s.d] && st.log[s.d] && st.log[s.d].note).slice(-3);
  if (rec.some(s => /nyeri|sakit|cedera|pincang|ngilu/i.test(st.log[s.d].note))) m.push('Ada catatan nyeri di sesi terakhir. Sesuai panduan: nyeri tajam, skip sesi; konsultasikan bila berlanjut.');
  const rr = S.filter(s => st.done[s.d] && st.log[s.d] && st.log[s.d].rpe).slice(-2);
  if (rr.length === 2 && rr.every(s => st.log[s.d].rpe >= 8)) m.push('RPE ≥ 8 di dua sesi berturut-turut. Pertimbangkan sesi berikutnya lebih santai atau tambah istirahat.');
  const sl = S.filter(s => st.done[s.d] && st.log[s.d] && st.log[s.d].sleep).slice(-2);
  if (sl.length === 2 && sl.every(s => st.log[s.d].sleep < 6)) m.push('Tidur kurang dari 6 jam di dua sesi terakhir. Jangan paksa sesi berat.');
  return m.map(t => `<div class="warn">⚠️ ${t}</div>`).join('');
};

const banner = () => {
  if (!Object.keys(st.log).length && !Object.keys(st.done).length) return '';
  const age = (Date.now() - (st.lastBak || 0)) / 864e5;
  return age > 7 ? `<div class="warn">💾 ${st.lastBak ? 'Backup terakhir ' + Math.floor(age) + ' hari lalu.' : 'Belum pernah backup.'} Data hanya tersimpan di browser ini.<button class="btn sm" data-bak>Backup / bagikan sekarang</button></div>` : '';
};

function bak() {
  st.lastBak = Date.now(); save();
  dl('hm-backup-' + today() + '.json', JSON.stringify(st), 'application/json'); render();
}
function shareBak() {
  const json = JSON.stringify(Object.assign({}, st, { lastBak: Date.now() })), name = 'hm-backup-' + today() + '.json';
  const fail = () => { alert('Menu bagikan tidak tersedia; file diunduh.'); bak(); };
  let f; try { f = new File([json], name, { type: 'application/json' }); } catch (e) { return fail(); }
  if (!(navigator.share && navigator.canShare && navigator.canShare({ files: [f] }))) return fail();
  navigator.share({ files: [f], title: 'HM Tracker backup' })
    .then(() => { st.lastBak = Date.now(); save(); render(); })
    .catch(err => { if (!err || err.name !== 'AbortError') fail(); });
}

function csv() {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [['tanggal', 'tanggal_plan', 'minggu', 'fase', 'sesi', 'status', 'km_plan', 'km_aktual', 'durasi_mnt', 'pace_per_km', 'hr_rata2', 'rpe', 'tidur_jam', 'puasa', 'catatan']];
  sorted().forEach(s => {
    const l = st.log[s.d] || {}, sec = l.km && l.min ? l.min * 60 / l.km : 0;
    rows.push([ed(s), s.d, s.w, s.ph, s.t, st.done[s.d] ? 'selesai' : st.skip[s.d] ? 'dilewati' : st.move[s.d] ? 'dipindah' : 'belum', km(s), st.done[s.d] ? ak(s) : '', l.min || '', sec ? pc(sec) : '', l.hr || '', l.rpe || '', l.sleep || '', l.fast ? 'ya' : (st.done[s.d] ? 'tidak' : ''), l.note || '']);
  });
  dl('hm-riwayat.csv', '\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n'), 'text/csv');
}

function openIcs() {
  $('#dlg').innerHTML = `<h3>Ekspor ke kalender</h3><p style="color:var(--mu);font-size:14px;margin-bottom:10px">Memuat sesi yang belum selesai dan tidak dilewati, sesuai tanggal terbaru, dengan pengingat 30 menit sebelumnya. Ekspor ulang bila jadwal berubah (impor ulang bisa menggandakan event; hapus yang lama dulu).</p>
    <div class="g2"><label>Jam biasa<input id="i1" type="time" value="06:00"></label><label>Jam saat Ramadan<input id="i2" type="time" value="20:00"></label></div>
    <div class="acts"><button class="btn" data-ics>Unduh .ics</button><button class="btn sm" data-cl>Batal</button></div>`;
  show();
}
function ics() {
  const t1 = $('#i1').value || '06:00', t2 = $('#i2').value || '20:00', stamp = new Date().toISOString().replace(/[-:]|\.\d+/g, '');
  const e = s => s.replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n');
  const f = x => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HM Tracker//ID', 'CALSCALE:GREGORIAN'];
  sorted().filter(pend).forEach(s => {
    const d = ed(s), ram = d >= DATA.ramadan && d < DATA.lebaran, [h, m] = (ram ? t2 : t1).split(':').map(Number);
    const a = dt(d); a.setHours(h, m); const b = new Date(a.getTime() + Math.max(45, Math.round(km(s) * 8.5)) * 6e4);
    L.push('BEGIN:VEVENT', `UID:hm-${s.d}@hm-tracker`, `DTSTAMP:${stamp}`, `DTSTART:${f(a)}`, `DTEND:${f(b)}`,
      'SUMMARY:' + e((km(s) ? '🏃 ' : '🏋️ ') + s.t + (km(s) ? ' · ' + nk(km(s)) + ' km' : '')), 'DESCRIPTION:' + e(txt(s)),
      'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Latihan', 'END:VALARM', 'END:VEVENT');
  });
  L.push('END:VCALENDAR'); dl('hm-plan.ics', L.join('\r\n'), 'text/calendar'); $('#dlg').close();
}

function proj() {
  const c = S.filter(s => st.done[s.d] && st.log[s.d] && st.log[s.d].km >= 8 && st.log[s.d].min > 0);
  if (!c.length) return '<p style="color:var(--mu)">Catat sesi ≥ 8 km (jarak dan durasi) untuk melihat proyeksi.</p>';
  const q = c.filter(s => /race pace|Z4/.test(txt(s))), s = (q.length ? q : c).slice(-1)[0], l = st.log[s.d];
  const T = l.min * 60 * Math.pow(21.1 / l.km, 1.06), h = sec => { const r = Math.round(sec); return Math.floor(r / 3600) + ':' + pad(Math.floor(r % 3600 / 60)) + ':' + pad(r % 60); };
  const v = T <= 9360 ? 'sesuai atau lebih baik dari target 2:30–2:36' : T <= 9600 ? 'mendekati rentang cadangan 2:36–2:40' : 'di atas target; masih ada waktu, pantau tren';
  return `<b style="font-size:28px;color:var(--ac)">${h(T)}</b><p style="margin:4px 0 8px">${v}</p>
    <small style="color:var(--mu)">Dihitung (rumus Riegel) dari ${esc(s.t)}, ${fmt(ed(s))}, ${nk(l.km)} km. Perkiraan kasar: pemanasan, sesi easy, dan Ramadan membuat angkanya cenderung lebih lambat dari kemampuan sebenarnya. Lihat tren, bukan satu angka.</small>`;
}

const isRamD = d => d >= DATA.ramadan && d < DATA.lebaran;
const ps = s => { const [m, x] = s.split(':').map(Number); return m * 60 + x; };

function fastCmp() {
  const g = f => {
    const r = S.filter(s => st.done[s.d] && target(s) && st.log[s.d] && st.log[s.d].km && st.log[s.d].min && !!st.log[s.d].fast === f);
    if (!r.length) return null;
    const K = r.reduce((a, s) => a + st.log[s.d].km, 0), M = r.reduce((a, s) => a + st.log[s.d].min, 0);
    const av = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : '–';
    return { n: r.length, pace: pc(M * 60 / K), hr: av(r.map(s => st.log[s.d].hr).filter(Boolean)), rpe: av(r.map(s => st.log[s.d].rpe).filter(Boolean)) };
  };
  const a = g(true), b = g(false);
  if (!a || !b) return '<p style="color:var(--mu)">Belum ada pembanding. Hanya easy run dan long run yang dibandingkan. Centang "Sedang puasa" di catatan sesi.</p>';
  const r = (n, x) => `<tr><td>${n}</td><td>${x.n}</td><td>${x.pace}/km</td><td>${x.hr}</td><td>${x.rpe}</td></tr>`;
  return `<table><tr><th></th><th>Sesi</th><th>Pace</th><th>HR</th><th>RPE</th></tr>${r('Puasa', a)}${r('Tidak puasa', b)}</table>`;
}

function ltCard() {
  const A = st.lt;
  let h = '<h2>Tes LT</h2><div class="card">';
  if (!A.length) h += '<p style="color:var(--mu);margin-bottom:12px">Plan menunda re-test LT sampai setelah Lebaran. Catat hasilnya di sini untuk dibandingkan dengan tes sebelumnya.</p>';
  A.forEach((t, i) => {
    const pv = A[i - 1], dh = pv ? t.hr - pv.hr : 0, df = pv ? ps(t.pace) - ps(pv.pace) : 0;
    h += `<div class="row" style="cursor:default"><div class="t"><b>HR ${t.hr} · ${t.pace}/km</b><small>${fmt(t.d)}${pv ? ` · vs tes sebelumnya: HR ${dh > 0 ? '+' : ''}${dh} bpm, pace ${df === 0 ? 'sama' : Math.abs(df) + ' dtk/km ' + (df < 0 ? 'lebih cepat' : 'lebih lambat')}` : ''}${t.note ? ' · ' + esc(t.note) : ''}</small></div><button class="ed" data-ltd="${i}" aria-label="Hapus">✕</button></div>`;
  });
  return h + `<div class="acts" style="margin-top:10px"><button class="btn sm" data-lt>+ Catat hasil tes</button><button class="btn sm" data-zn>Perbarui zona Z4</button></div>
    <p style="color:var(--mu);font-size:12px;margin-top:8px">Zona tidak berubah otomatis; Anda yang memutuskan nilai barunya.</p></div>`;
}
function openLt() {
  $('#dlg').innerHTML = `<h3>Hasil tes LT</h3><label>Tanggal<input id="t0" type="date" value="${today()}"></label>
    <div class="g2"><label>HR LT (bpm)<input id="t1" type="number" inputmode="numeric"></label><label>Pace LT (m:ss/km)<input id="t2" placeholder="6:55" inputmode="numeric"></label></div>
    <label>Catatan<textarea id="t3" rows="2"></textarea></label>
    <div class="acts"><button class="btn" data-lts>Simpan</button><button class="btn sm" data-cl>Batal</button></div>`; show();
}
function saveLt() {
  const d = $('#t0').value, hr = parseInt($('#t1').value), pace = $('#t2').value.trim();
  if (!d || !hr || !/^\d{1,2}:\d{2}$/.test(pace)) return alert('Isi tanggal, HR, dan pace (format m:ss, mis. 6:55).');
  st.lt.push({ d, hr, pace, note: $('#t3').value.trim() }); st.lt.sort((a, b) => a.d < b.d ? -1 : 1); done();
}
function openZn() {
  const z = st.zn[3] || DATA.zones[3], L = st.lt[st.lt.length - 1];
  $('#dlg').innerHTML = `<h3>Zona Z4 Tempo/Threshold</h3><p style="color:var(--mu);font-size:14px;margin-bottom:10px">${L ? `Tes terakhir: HR ${L.hr}, pace ${L.pace}/km.` : 'Belum ada hasil tes.'} Isi nilai baru sesuai keputusan Anda. Zona lain diubah lewat data.js.</p>
    <div class="g2"><label>HR<input id="z1" value="${esc(z[1])}"></label><label>Pace<input id="z2" value="${esc(z[2])}"></label></div>
    <div class="acts"><button class="btn" data-zns>Simpan</button><button class="btn sm" data-znr>Kembalikan</button><button class="btn sm" data-cl>Batal</button></div>`; show();
}

function weekText(w) {
  const ss = S.filter(s => s.w === w), d = ss.filter(s => st.done[s.d]), sk = ss.filter(s => st.skip[s.d]);
  const p = ss.reduce((a, s) => a + km(s), 0), lr = ss.find(s => /Run 3|RACE/.test(s.t));
  const runs = d.filter(s => st.log[s.d] && st.log[s.d].km && st.log[s.d].min);
  const tk = runs.reduce((x, s) => x + st.log[s.d].km, 0), tm = runs.reduce((x, s) => x + st.log[s.d].min, 0);
  const rp = d.map(s => st.log[s.d] && st.log[s.d].rpe).filter(Boolean), nt = d.map(s => st.log[s.d] && st.log[s.d].note).filter(Boolean);
  const L = [`🏃 Minggu ${w} · ${ss[0].ph}`, `Km: ${nk(weekAct(w))} dari ${nk(p)} (plan)`, `Sesi: ${d.length}/${ss.length} selesai${sk.length ? ', ' + sk.length + ' skip' : ''}`];
  if (lr && st.done[lr.d]) L.push(`Long run: ${nk(ak(lr))} km`);
  if (tk && tm) L.push(`Pace rata-rata: ${pc(tm * 60 / tk)}/km`);
  if (rp.length) L.push(`RPE rata-rata: ${nk(rp.reduce((x, y) => x + y, 0) / rp.length)}`);
  if (nt.length) L.push('Catatan: ' + nt.join('; '));
  const left = Math.round((dt(DATA.race) - dt(today())) / 864e5);
  if (left > 0) L.push(`${left} hari lagi ke race`);
  return L.join('\n');
}
const copyTxt = t => (navigator.clipboard ? navigator.clipboard.writeText(t).then(() => alert('Ringkasan disalin.')) : Promise.reject()).catch(() => prompt('Salin teks ini:', t));
function shareWk() {
  const t = weekText(+$('#wsel').value);
  if (navigator.share) navigator.share({ text: t }).catch(err => { if (!err || err.name !== 'AbortError') copyTxt(t); }); else copyTxt(t);
}
const wkCard = weeks => {
  const dw = weeks.filter(w => S.some(s => s.w === w && st.done[s.d])).pop() || cw();
  return `<h2>Ringkasan mingguan</h2><div class="card"><label>Minggu<select id="wsel">${weeks.map(w => `<option value="${w}" ${w === dw ? 'selected' : ''}>Minggu ${w}</option>`).join('')}</select></label>
    <pre id="wpre">${esc(weekText(dw))}</pre><div class="acts"><button class="btn" data-wk>📤 Bagikan / salin</button></div></div>`;
};

const addD = (d, k) => { const x = dt(d); x.setDate(x.getDate() + k); return iso(x); };
function shiftCalc(from, n) {
  const aff = S.filter(s => pend(s) && s.t !== 'RACE DAY' && ed(s) >= from), aset = new Set(aff.map(s => s.d));
  const occ = new Set(S.filter(s => !aset.has(s.d)).map(ed));
  return aff.map(s => { const nd = addD(ed(s), n); return { s, nd, over: nd >= DATA.race, leb: nd === DATA.lebaran, clash: occ.has(nd) && nd < DATA.race }; });
}
function shiftPv() {
  const from = $('#g1').value, n = parseInt($('#g2').value) || 0;
  if (!from || n < 1) return '<span style="color:var(--mu)">Isi tanggal mulai dan jumlah hari (minimal 1).</span>';
  const R = shiftCalc(from, n);
  if (!R.length) return '<span style="color:var(--mu)">Tidak ada sesi yang belum selesai mulai tanggal itu.</span>';
  const list = (a, lab) => a.length ? `<p class="warn">⚠️ ${lab}: ${a.map(r => esc(r.s.t) + ' (' + fmt(r.nd) + ')').join(', ')}</p>` : '';
  const f = R[0], l = R[R.length - 1];
  return `<p style="color:var(--mu);margin-bottom:8px">${R.length} sesi bergeser ${n} hari. Pertama: ${fmt(ed(f.s))} → ${fmt(f.nd)}. Terakhir: ${fmt(ed(l.s))} → ${fmt(l.nd)}. Race day tetap ${fmt(DATA.race)}.</p>`
    + list(R.filter(r => r.over), 'jatuh pada atau setelah hari race') + list(R.filter(r => r.leb), 'jatuh pada Idulfitri') + list(R.filter(r => r.clash), 'sudah ada sesi lain di hari yang sama');
}
function openSh() {
  $('#dlg').innerHTML = `<h3>Geser plan</h3><p style="color:var(--mu);font-size:14px;margin-bottom:10px">Memindahkan semua sesi yang belum selesai dan belum dilewati ke beberapa hari berikutnya. Race day tidak ikut bergeser.</p>
    <div class="g2"><label>Mulai dari tanggal<input id="g1" type="date" value="${today()}"></label><label>Geser (hari)<input id="g2" type="number" min="1" max="60" inputmode="numeric" value="1"></label></div>
    <label class="ck"><input id="g3" type="checkbox"> Lewati sesi yang jatuh pada atau setelah hari race</label>
    <div id="gpv" style="font-size:13px;margin:10px 0"></div>
    <div class="acts"><button class="btn" data-shs>Geser</button><button class="btn sm" data-cl>Batal</button></div>`;
  $('#gpv').innerHTML = shiftPv(); show();
}
function applyShift() {
  const from = $('#g1').value, n = parseInt($('#g2').value) || 0;
  if (!from || n < 1) return alert('Isi tanggal mulai dan jumlah hari (minimal 1).');
  const R = shiftCalc(from, n); if (!R.length) return alert('Tidak ada sesi untuk digeser.');
  st.undo = R.map(r => ({ d: r.s.d, m: st.move[r.s.d] || null, k: !!st.skip[r.s.d] }));
  R.forEach(r => { if (r.over && $('#g3').checked) st.skip[r.s.d] = 1; else if (r.nd === r.s.d) delete st.move[r.s.d]; else st.move[r.s.d] = r.nd; });
  done();
}

function effCard() {
  const weeks = [...new Set(S.map(s => s.w))], P = [];
  weeks.forEach(w => {
    const r = S.filter(s => s.w === w && st.done[s.d] && target(s) && st.log[s.d] && st.log[s.d].km >= 3 && st.log[s.d].min > 0 && st.log[s.d].hr >= 100 && st.log[s.d].hr <= 200);
    if (!r.length) return;
    const ef = r.reduce((a, s) => { const l = st.log[s.d]; return a + (l.km * 1000 / l.min) / l.hr; }, 0) / r.length;
    P.push({ w, p: 60000 / (ef * 160) });
  });
  if (P.length < 2) return '<p style="color:var(--mu)">Catat easy run atau long run (≥ 3 km) lengkap dengan durasi dan HR rata-rata. Grafik muncul setelah ada data dari 2 minggu berbeda.</p>';
  const W = 340, H = 170, pl = 34, b = 22, t = 10, lo = Math.min(...P.map(q => q.p)) - 10, hi = Math.max(...P.map(q => q.p)) + 10;
  const y = v => t + (v - lo) / (hi - lo) * (H - b - t), cx = w => pl + (W - pl) * (weeks.indexOf(w) + .5) / weeks.length;
  let g = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${pl - 4}" y="${y(v) + 3}" class="gt" text-anchor="end">${pc(v)}</text>`).join('');
  g += weeks.map(w => `<text x="${cx(w)}" y="${H - 6}" class="gt" text-anchor="middle">${w}</text>`).join('');
  g += `<polyline class="la" points="${P.map(q => cx(q.w) + ',' + y(q.p)).join(' ')}"/>` + P.map(q => `<circle class="dot${isRam(q.w) ? ' rm' : ''}" cx="${cx(q.w)}" cy="${y(q.p)}" r="3.5"/>`).join('');
  let sum = '';
  if (P.length >= 3) {
    const k = Math.min(2, Math.floor(P.length / 2)), av = a => a.reduce((x, q) => x + q.p, 0) / a.length, a = av(P.slice(0, k)), c = av(P.slice(-k)), d = Math.round(a - c);
    sum = `<p style="margin:8px 0">Awal ${pc(a)}/km → terbaru ${pc(c)}/km: ${d === 0 ? 'tidak berubah' : Math.abs(d) + ' dtk/km ' + (d > 0 ? 'lebih cepat' : 'lebih lambat')} pada HR yang sama.</p>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img">${g}</svg>${sum}
    <div class="lgd"><span style="color:var(--ac)">● Biasa</span><span style="color:var(--wr)">● Minggu Ramadan</span></div>
    <small style="color:var(--mu);display:block;margin-top:6px">Garis naik = lebih cepat pada HR yang sama. Pace setara dihitung dari rata-rata easy run dan long run minggu itu dengan model sederhana (kecepatan sebanding HR, acuan 160 bpm), jadi pakai untuk melihat tren. Puasa, panas, dan kurang tidur ikut menggeser HR.</small>`;
}

function renderToday() {
  const t = today(), x = stats(), A = sorted();
  let cur = A.find(s => ed(s) === t) || A.find(s => pend(s) && ed(s) > t) || A.find(pend);
  const next = cur ? A.filter(s => pend(s) && s.d !== cur.d && ed(s) >= ed(cur)).slice(0, 4) : [];
  let html = `<div class="stats">
    <div class="stat"><b>${x.n}/${x.tot}</b><span>sesi selesai</span></div>
    <div class="stat"><b>${nk(S.filter(s => st.done[s.d]).reduce((a, s) => a + ak(s), 0))}</b><span>km lari aktual</span></div>
    <div class="stat"><b>${x.pct}%</b><span>progres${x.sk ? ' · ' + x.sk + ' skip' : ''}</span></div></div>
    <div class="bar" style="margin-bottom:16px"><i style="width:${x.pct}%"></i></div>${banner()}${weekCard()}${warns()}`;
  if (!cur) html += `<div class="card big"><h3>🎉 Semua sesi selesai!</h3><p>Selamat, plan sudah tuntas.</p></div>`;
  else {
    const k = km(cur), changed = st.mode === 'adj' && cur.chg && cur.po !== cur.pa, e = ed(cur);
    const lab = st.done[cur.d] ? 'Sesi hari ini · selesai' : st.skip[cur.d] ? 'Sesi hari ini · dilewati' : e === t ? 'Sesi hari ini' : e < t ? 'Belum selesai' : t < S[0].d ? 'Sesi pertama' : 'Sesi berikutnya';
    html += `<h2>${lab}</h2><div class="card big">
      <span class="tag">${cur.ph}</span><span class="tag">Minggu ${cur.w}</span>${isRam(cur.w) ? '<span class="tag ram">Ramadan</span>' : ''}
      <h3>${esc(cur.t)}</h3><p>${fmt(e)}${st.move[cur.d] ? ' (dipindah dari ' + fmt(cur.d) + ')' : ''}</p>
      ${k ? `<div class="km">${nk(k)} km</div>` : ''}
      <p style="margin-top:6px;color:var(--tx)">${esc(txt(cur))}</p>
      ${changed ? `<div class="old">Awal: ${esc(cur.po)}</div>` : ''}
      <div class="acts">${act(cur)}</div></div>`;
  }
  if (next.length) html += `<h2>Berikutnya</h2><div class="card">${next.map(row).join('')}</div>`;
  $('#today').innerHTML = html;
}

let pv = 'list', cm = null;
const monthsR = () => { const a = [], e = dt(DATA.race); for (let d = new Date(dt(DATA.start).getFullYear(), dt(DATA.start).getMonth(), 1); d <= e; d.setMonth(d.getMonth() + 1)) a.push(iso(d).slice(0, 7)); return a; };
const pvBar = () => `<div class="toggle"><button data-pv="list" class="${pv === 'list' ? 'on' : ''}">Daftar</button><button data-pv="cal" class="${pv === 'cal' ? 'on' : ''}">Kalender</button></div><div class="acts" style="margin-bottom:12px"><button class="btn sm" data-sh>↔ Geser plan</button>${st.undo ? '<button class="btn sm" data-shu>↩ Urungkan geser</button>' : ''}</div>`;

function calHtml() {
  const M = monthsR(), t = today();
  if (!cm || !M.includes(cm)) cm = M.includes(t.slice(0, 7)) ? t.slice(0, 7) : (t < M[0] + '-01' ? M[0] : M[M.length - 1]);
  const [Y, Mo] = cm.split('-').map(Number), first = new Date(Y, Mo - 1, 1), off = (first.getDay() + 6) % 7, n = new Date(Y, Mo, 0).getDate(), i = M.indexOf(cm);
  const by = {}; S.forEach(s => (by[ed(s)] = by[ed(s)] || []).push(s));
  const ab = s => /Strength A/.test(s.t) ? 'S·A' : /Strength B/.test(s.t) ? 'S·B' : /Run 1/.test(s.t) ? 'Q' : /Run 2/.test(s.t) ? 'E' : /Long/.test(s.t) ? 'LR' : /Shake/.test(s.t) ? 'SO' : '🏁';
  let c = '';
  for (let k = 0; k < off; k++) c += '<div class="cd off"></div>';
  for (let d = 1; d <= n; d++) {
    const ds = `${Y}-${pad(Mo)}-${pad(d)}`, ss = by[ds] || [];
    c += `<div class="cd${ds === t ? ' td' : ''}${isRamD(ds) ? ' rm' : ''}"><i>${d}</i>${ss.map(s => {
      const k = st.done[s.d] ? 'ok' : st.skip[s.d] ? 'sk' : ds < t ? 'ov' : st.move[s.d] ? 'mv' : 'pd';
      return `<span class="cx ${k}" data-s="${s.d}">${ab(s)}${km(s) ? ' ' + nk(km(s)) : ''}</span>`;
    }).join('')}</div>`;
  }
  const ms = S.filter(s => ed(s).slice(0, 7) === cm), md = ms.filter(s => st.done[s.d]);
  const name = first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  return `<div class="toggle"><button data-m="adj" class="${st.mode === 'adj' ? 'on' : ''}">Disesuaikan (Ramadan)</button><button data-m="ori" class="${st.mode === 'ori' ? 'on' : ''}">Plan awal</button></div>
    <div class="calh"><button class="btn sm" data-cm="-1" ${i <= 0 ? 'disabled' : ''}>‹</button><b>${name}</b><button class="btn sm" data-cm="1" ${i >= M.length - 1 ? 'disabled' : ''}>›</button></div>
    <div class="cal">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(x => `<div class="cw">${x}</div>`).join('')}${c}</div>
    <p class="cs">${md.length}/${ms.length} sesi selesai · ${ms.filter(s => st.skip[s.d]).length} skip · ${nk(md.reduce((a, s) => a + ak(s), 0))} km aktual</p>
    <div class="cleg"><span class="cx ok">Selesai</span><span class="cx pd">Belum</span><span class="cx ov">Tertunda</span><span class="cx sk">Skip</span><span class="cx mv">Dipindah</span></div>
    <p class="cs">S·A/S·B strength · Q quality · E easy · LR long run · SO shakeout. Latar kuning = Ramadan. Ketuk sesi untuk membuka.</p>`;
}

function renderPlan() {
  const t = today(), weeks = [...new Set(S.map(s => s.w))];
  const curW = (sorted().find(s => pend(s) && ed(s) >= t) || S[S.length - 1]).w;
  let html = `<div class="toggle"><button data-m="adj" class="${st.mode === 'adj' ? 'on' : ''}">Disesuaikan (Ramadan)</button><button data-m="ori" class="${st.mode === 'ori' ? 'on' : ''}">Plan awal</button></div>`;
  weeks.forEach(w => {
    const ss = S.filter(s => s.w === w), d = ss.filter(s => st.done[s.d]).length, sk = ss.filter(s => st.skip[s.d]).length, k = ss.reduce((a, s) => a + km(s), 0);
    html += `<details class="${w === curW ? 'now' : ''}" ${w === curW ? 'open' : ''}>
      <summary><div><b>Minggu ${w} · ${ss[0].ph}</b><small>${fmt(ss[0].d)}${isRam(w) ? ' · 🌙 Ramadan' : ''}</small></div>
      <div class="r">${nk(k)} km<br>${d}/${ss.length} sesi${sk ? ' · ' + sk + ' skip' : ''} ${d + sk === ss.length ? '✅' : ''}</div></summary>
      <div class="in">${ss.map(row).join('')}</div></details>`;
  });
  $('#plan').innerHTML = pvBar() + (pv === 'cal' ? calHtml() : html);
}

function chart(L, A, B, line, ref) {
  const W = 340, H = 170, p = 26, b = 22, mx = Math.max(...A, ...B.filter(v => v != null), ref || 0, 1) * 1.1, bw = (W - p) / L.length;
  const y = v => H - b - (H - b - 8) * v / mx, cx = i => p + bw * i + bw / 2;
  let g = '';
  [0, .5, 1].forEach(f => { const v = mx / 1.1 * f; g += `<line x1="${p}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${p - 4}" y="${y(v) + 3}" class="gt" text-anchor="end">${Math.round(v)}</text>`; });
  L.forEach((l, i) => {
    g += `<text x="${cx(i)}" y="${H - 6}" class="gt" text-anchor="middle">${l}</text>`;
    if (!line) [[A[i], .12, 'bp'], [B[i], .5, 'ba']].forEach(([v, o, c]) => g += `<rect x="${p + bw * (i + o)}" y="${y(v)}" width="${bw * .36}" height="${H - b - y(v)}" class="${c}"/>`);
  });
  if (line) {
    g += `<polyline class="lp" points="${A.map((v, i) => cx(i) + ',' + y(v)).join(' ')}"/>`;
    const pts = B.map((v, i) => v == null ? null : cx(i) + ',' + y(v)).filter(Boolean);
    g += `<polyline class="la" points="${pts.join(' ')}"/>` + pts.map(q => `<circle class="dot" cx="${q.split(',')[0]}" cy="${q.split(',')[1]}" r="3"/>`).join('');
  }
  if (ref) g += `<line x1="${p}" x2="${W}" y1="${y(ref)}" y2="${y(ref)}" class="rf"/><text x="${W}" y="${y(ref) - 3}" class="gt" text-anchor="end">${nk(ref)} km</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img">${g}</svg>`;
}

function renderProg() {
  const weeks = [...new Set(S.map(s => s.w))], lg = (a, b) => `<div class="lgd"><span>┄ ${a}</span><span style="color:var(--ac)">● ${b}</span></div>`;
  const wp = weeks.map(w => S.filter(s => s.w === w).reduce((a, s) => a + km(s), 0));
  const wa = weeks.map(w => S.filter(s => s.w === w && st.done[s.d]).reduce((a, s) => a + ak(s), 0));
  const lr = weeks.map(w => S.find(s => s.w === w && /Run 3|RACE/.test(s.t)));
  const lp = lr.map(s => s ? km(s) : 0), la = lr.map(s => s && st.done[s.d] ? ak(s) : null);
  const last = la.filter(v => v != null).pop(), totA = wa.reduce((a, b) => a + b, 0);
  $('#prog').innerHTML = `<div class="stats"><div class="stat"><b>${nk(totA)}</b><span>km aktual total</span></div>
    <div class="stat"><b>${last != null ? nk(last) : '–'}</b><span>long run terakhir</span></div>
    <div class="stat"><b>${nk(Math.max(0, ...la.map(v => v || 0)))}</b><span>long run terjauh</span></div></div>
    <h2>Km mingguan: plan vs aktual</h2><div class="card">${chart(weeks, wp, wa, false)}
    <div class="lgd"><span style="opacity:.6">■ Plan</span><span style="color:var(--ac)">■ Aktual</span></div></div>
    <h2>Tren long run menuju 21 km</h2><div class="card">${chart(weeks, lp, la, true, 21.1)}${lg('Plan', 'Aktual')}</div><h2>Proyeksi waktu race</h2><div class="card">${proj()}</div><h2>Puasa vs tidak puasa</h2><div class="card">${fastCmp()}</div><h2>Efisiensi aerobik</h2><div class="card">${effCard()}</div>${ltCard()}${wkCard(weeks)}`;
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
    ${DATA.zones.map((z0, i) => { const z = st.zn[i] || z0; return `<tr><td><b>${esc(z[0])}</b><br><small style="color:var(--mu)">${esc(z[3])}</small></td><td>${esc(z[1])}</td><td>${esc(z[2])}</td></tr>`; }).join('')}</table></div>
    <h2>Panduan Ramadan & umum</h2><div class="card"><dl class="g">
    ${DATA.guide.map(g => `<dt>${esc(g[0])}</dt><dd>${esc(g[1])}</dd>`).join('')}</dl></div>
    <h2>Data</h2><div class="card"><p style="color:var(--mu);font-size:14px;margin-bottom:12px">Progres, catatan, skip, dan editan tersimpan di browser ini. Unduh <b>data.js</b> untuk mengganti file plan, atau unduh backup untuk menyimpan progres.</p>
    <div class="acts"><button class="btn sm" id="dl-data">⬇ Unduh data.js</button><button class="btn sm" data-bak>⬇ Backup</button><button class="btn sm" data-share>📤 Bagikan</button><button class="btn sm" data-csv>⬇ CSV riwayat</button><button class="btn sm" data-ical>📅 Kalender (.ics)</button>
    <button class="btn sm" id="imp">⬆ Pulihkan backup</button><button class="btn sm" id="rst-ed">Reset editan</button><button class="btn sm" id="reset">Reset progres</button></div>
    <input type="file" id="file" accept=".json" hidden></div>`;
}

function openEdit(d) {
  const x = S.find(y => y.d === d), a = st.mode === 'adj';
  $('#dlg').innerHTML = `<h3>Edit · ${fmt(d)}</h3>
    <label>Nama sesi<input id="e1" value="${esc(x.t)}"></label>
    <label>Detail (${a ? 'plan disesuaikan' : 'plan awal'})<textarea id="e2" rows="5">${esc(txt(x))}</textarea></label>
    <label>Jarak (km)<input id="e3" type="number" step="0.1" min="0" value="${km(x)}"></label>
    <div class="acts"><button class="btn" data-sv="${d}">Simpan</button>
    <button class="btn sm" data-rs="${d}">Kembalikan</button><button class="btn sm" data-cl>Batal</button></div>`;
  show();
}
function openSes(d) {
  const x = S.find(y => y.d === d), li = st.done[d] ? logInfo(x) : '';
  $('#dlg').innerHTML = `<h3>${esc(x.t)}</h3><p style="color:var(--mu);font-size:14px;margin-bottom:12px">${fmt(ed(x))}${km(x) ? ' · ' + nk(km(x)) + ' km' : ''}<br>${esc(txt(x))}${li ? '<br><b style="color:var(--ac)">' + li + '</b>' : ''}</p>
    <div class="acts">${act(x)}<button class="btn sm" data-cl>Tutup</button></div>`;
  show();
}
function openLog(d) {
  const x = S.find(y => y.d === d), l = st.log[d] || {}, run = km(x) > 0;
  $('#dlg').innerHTML = `<h3>Catat · ${esc(x.t)}</h3>
    ${run ? `<div class="g2"><label>Jarak (km)<input id="l1" type="number" step="0.01" min="0" inputmode="decimal" value="${l.km || km(x)}"></label>
    <label>Durasi (menit)<input id="l2" type="number" step="0.1" min="0" inputmode="decimal" value="${l.min || ''}"></label></div>
    <label>HR rata-rata<input id="l3" type="number" min="0" inputmode="numeric" value="${l.hr || ''}"></label>`
    : `<label>Durasi (menit)<input id="l2" type="number" min="0" inputmode="numeric" value="${l.min || ''}"></label>`}
    <div class="g2"><label>RPE (1–10)<input id="l5" type="number" min="1" max="10" inputmode="numeric" value="${l.rpe || ''}"></label><label>Tidur (jam)<input id="l6" type="number" step="0.5" min="0" inputmode="decimal" value="${l.sleep || ''}"></label></div><label class="ck"><input id="l7" type="checkbox" ${(l.fast !== undefined ? l.fast : isRamD(ed(x))) ? 'checked' : ''}> Sedang puasa</label>
    <label>Catatan<textarea id="l4" rows="3" placeholder="mis. lutut agak nyeri">${esc(l.note || '')}</textarea></label>
    <div class="acts"><button class="btn" data-ls="${d}">Simpan & tandai selesai</button><button class="btn sm" data-cl>Batal</button></div>`;
  show();
}
function openMv(d) {
  const x = S.find(y => y.d === d);
  $('#dlg').innerHTML = `<h3>Pindah tanggal</h3><label>${esc(x.t)} (semula ${fmt(d)})<input id="m1" type="date" value="${ed(x)}"></label>
    <div class="acts"><button class="btn" data-mvs="${d}">Pindahkan</button><button class="btn sm" data-cl>Batal</button></div>`;
  show();
}

function renderHead() {
  const diff = Math.round((dt(DATA.race) - dt(today())) / 864e5);
  $('#days').textContent = diff > 0 ? diff : diff === 0 ? '🏁' : '✓';
  $('.count span').textContent = diff > 0 ? 'hari lagi' : diff === 0 ? 'race day!' : 'selesai';
  $('#sub').textContent = 'Race ' + dt(DATA.race).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · target 2:30–2:36';
}
function render() { renderHead(); renderToday(); renderPlan(); renderProg(); renderInfo(); }
const done = () => { $('#dlg').close(); save(); render(); };

document.addEventListener('click', e => {
  const g = a => e.target.closest('[' + a + ']'); let x;
  if (x = g('data-e')) return openEdit(x.dataset.e);
  if (x = g('data-lg')) return openLog(x.dataset.lg);
  if (x = g('data-ls')) {
    const d = x.dataset.ls, v = id => $(id) ? $(id).value : '';
    st.log[d] = { km: parseFloat(v('#l1')) || 0, min: parseFloat(v('#l2')) || 0, hr: parseInt(v('#l3')) || 0, note: v('#l4').trim(), rpe: parseInt(v('#l5')) || 0, sleep: parseFloat(v('#l6')) || 0, fast: !!($('#l7') && $('#l7').checked) };
    st.done[d] = 1; delete st.skip[d]; return done();
  }
  if (x = g('data-sk')) { st.skip[x.dataset.sk] = 1; delete st.done[x.dataset.sk]; return done(); }
  if (x = g('data-un')) { const d = x.dataset.un; delete st.done[d]; delete st.skip[d]; delete st.move[d]; return done(); }
  if (x = g('data-mv')) return openMv(x.dataset.mv);
  if (x = g('data-mvs')) { const d = x.dataset.mvs, v = $('#m1').value; if (v && v !== d) st.move[d] = v; else delete st.move[d]; return done(); }
  if (x = g('data-sv')) {
    const d = x.dataset.sv, y = S.find(z => z.d === d), a = st.mode === 'adj';
    y.t = $('#e1').value.trim() || y.t; y[a ? 'pa' : 'po'] = $('#e2').value.trim(); y[a ? 'ka' : 'ko'] = parseFloat($('#e3').value) || 0;
    st.edits[d] = { t: y.t, pa: y.pa, ka: y.ka, po: y.po, ko: y.ko }; return done();
  }
  if (x = g('data-rs')) { delete st.edits[x.dataset.rs]; applyEdits(); return done(); }
  if (g('data-cl')) return $('#dlg').close();
  if (x = g('data-s')) return openSes(x.dataset.s);
  if (e.target.id === 'dl-data') return dl('data.js', 'const DATA = ' + JSON.stringify(DATA, null, 1) + ';\n', 'text/javascript');
  if (g('data-bak')) return bak();
  if (g('data-share')) return shareBak();
  if (g('data-lt')) return openLt();
  if (g('data-lts')) return saveLt();
  if (x = g('data-ltd')) { if (confirm('Hapus hasil tes ini?')) { st.lt.splice(+x.dataset.ltd, 1); done(); } return; }
  if (g('data-zn')) return openZn();
  if (g('data-zns')) { st.zn[3] = [DATA.zones[3][0], $('#z1').value.trim(), $('#z2').value.trim(), DATA.zones[3][3]]; return done(); }
  if (g('data-znr')) { delete st.zn[3]; return done(); }
  if (g('data-wk')) return shareWk();
  if (g('data-sh')) return openSh();
  if (g('data-shs')) return applyShift();
  if (g('data-shu')) {
    if (st.undo && confirm('Urungkan geser terakhir? Sesi yang tergeser kembali ke status sebelumnya.')) {
      st.undo.forEach(u => { if (u.m) st.move[u.d] = u.m; else delete st.move[u.d]; if (u.k) st.skip[u.d] = 1; else delete st.skip[u.d]; });
      st.undo = null; done();
    }
    return;
  }
  if (x = g('data-pv')) { pv = x.dataset.pv; return render(); }
  if (x = g('data-cm')) { const M = monthsR(), j = M.indexOf(cm) + +x.dataset.cm; if (M[j]) cm = M[j]; return render(); }
  if (g('data-csv')) return csv();
  if (g('data-ical')) return openIcs();
  if (g('data-ics')) return ics();
  if (e.target.id === 'imp') return $('#file').click();
  if (e.target.id === 'rst-ed' && confirm('Kembalikan semua sesi ke data awal?')) { st.edits = {}; applyEdits(); save(); return render(); }
  if (x = g('data-m')) { st.mode = x.dataset.m; save(); return render(); }
  const n = e.target.closest('nav button');
  if (n) { document.querySelectorAll('nav button, .view').forEach(z => z.classList.remove('on', 'active')); n.classList.add('on'); $('#' + n.dataset.v).classList.add('active'); scrollTo(0, 0); }
  if (e.target.id === 'reset' && confirm('Hapus semua progres, catatan, skip, dan pindah tanggal?')) { st.done = {}; st.log = {}; st.skip = {}; st.move = {}; save(); render(); }
});

document.addEventListener('input', e => { if (e.target.id === 'g1' || e.target.id === 'g2') $('#gpv').innerHTML = shiftPv(); });

document.addEventListener('change', e => {
  if (e.target.id === 'wsel') { $('#wpre').textContent = weekText(+e.target.value); return; }
  if (e.target.id !== 'file' || !e.target.files[0]) return;
  const r = new FileReader();
  r.onload = () => { try { st = norm(JSON.parse(r.result)); applyEdits(); save(); render(); alert('Backup dipulihkan.'); } catch (x) { alert('File backup tidak valid.'); } };
  r.readAsText(e.target.files[0]);
});

const sysDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
const syncTheme = () => {
  const dark = (document.documentElement.dataset.theme || (sysDark() ? 'dark' : 'light')) === 'dark';
  $('#theme').textContent = dark ? '☀️' : '🌙';
  $('#theme').setAttribute('aria-label', dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
  document.querySelector('meta[name=theme-color]').content = dark ? '#0f1214' : '#16a34a';
};
$('#theme').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && sysDark()) ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('hm-theme', t); } catch (e) {}
  syncTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
syncTheme();
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();