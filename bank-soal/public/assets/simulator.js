(function () {
  'use strict';
  var B = window.__BS__; if (!B) return;
  var TIPE = { pg_biasa: 'PG Biasa', sebab_akibat: 'Sebab-Akibat', kompleks_123: 'Kompleks 1-2-3' };
  var PETUNJUK = {
    sebab_akibat: ['Soal terdiri atas sebuah pernyataan dan sebuah alasan. Pilihlah:', ['A: pernyataan benar, alasan benar, dan keduanya menunjukkan hubungan sebab akibat.', 'B: pernyataan benar, alasan benar, tetapi keduanya tidak menunjukkan hubungan sebab akibat.', 'C: pernyataan benar dan alasan salah.', 'D: pernyataan salah dan alasan benar.']],
    kompleks_123: ['Perhatikan ketiga pernyataan bernomor (1), (2), dan (3). Pilihlah opsi yang memuat seluruh pernyataan yang benar.', []]
  };
  var TOTAL_SEC = 90 * 60;
  var $ = function (id) { return document.getElementById(id); };
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  var meta = {}; // n -> {n,modul,tipe,locked,...full}
  B.free.forEach(function (q) { meta[q.n] = q; });
  B.locked.forEach(function (q) { meta[q.n] = { n: q.n, modul: q.modul, tipe: q.tipe, locked: true }; });
  var nums = Object.keys(meta).map(Number).sort(function (a, b) { return a - b; });
  var st = { cur: nums[0], filter: 'all', mode: 'belajar', ans: {}, flag: {}, finished: false, left: TOTAL_SEC, timer: null, started: false, token: null };
  try { st.token = localStorage.getItem('bs_token'); } catch (e) {}

  function visible() { return nums.filter(function (n) { return st.filter === 'all' || meta[n].tipe === st.filter; }); }
  function accessible(n) { return !meta[n].locked; }

  // ---------- timer ----------
  function fmt(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [h, m, x].map(function (v) { return String(v).padStart(2, '0'); }).join(':'); }
  function startTimer() {
    if (st.started || st.finished) return; st.started = true;
    var end = Date.now() + st.left * 1000;
    st.timer = setInterval(function () {
      st.left = Math.max(0, Math.round((end - Date.now()) / 1000));
      $('timer').textContent = fmt(st.left); $('timer').classList.toggle('low', st.left <= 300);
      if (st.left <= 0) finish(true);
    }, 500);
  }

  // ---------- render ----------
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  function renderGrid() {
    var g = $('grid'); g.textContent = '';
    nums.forEach(function (n) {
      var b = el('button', 'gn'); b.type = 'button'; b.setAttribute('aria-label', 'Soal ' + n + (meta[n].locked ? ', terkunci' : ''));
      if (meta[n].locked) { b.classList.add('lock'); b.innerHTML = LOCK; }
      else { b.textContent = n; if (st.flag[n]) b.classList.add('flag'); else if (st.ans[n]) b.classList.add('done'); }
      if (n === st.cur) b.classList.add('cur');
      if (st.filter !== 'all' && meta[n].tipe !== st.filter) b.classList.add('dim');
      b.addEventListener('click', function () { go(n); });
      g.appendChild(b);
    });
    var done = nums.filter(function (n) { return st.ans[n]; }).length;
    $('barfill').style.width = (done / B.total * 100) + '%'; $('proglabel').textContent = done + '/' + B.total + ' Terjawab';
  }

  function render() {
    var q = meta[st.cur];
    $('qno').textContent = 'Soal ' + q.n + ' dari ' + B.total;
    $('qtag').textContent = 'Modul ' + q.modul + ' • ' + TIPE[q.tipe];
    var pet = $('petunjuk'), body = $('qbody'), opts = $('opts'), pemb = $('pemb');
    body.textContent = ''; opts.textContent = ''; pemb.hidden = true; pemb.textContent = '';
    var p = PETUNJUK[q.tipe];
    pet.hidden = !p; pet.textContent = '';
    if (p) { pet.appendChild(el('div', null, p[0])); if (p[1].length) { var ul = el('ul'); p[1].forEach(function (t) { ul.appendChild(el('li', null, t)); }); pet.appendChild(ul); } }

    if (q.locked) {
      var box = el('div', 'card'); box.innerHTML = '<h3>Soal ini terkunci</h3>';
      box.appendChild(el('p', 'muted', 'Soal nomor 11 ke atas dibuka dengan token akses. Soal nomor 1 sampai 10 tetap gratis.'));
      var b1 = el('button', 'btn primary', 'Buka Akses Penuh'); b1.type = 'button'; b1.addEventListener('click', openCheckout);
      var b2 = el('button', 'btn', 'Saya sudah punya token'); b2.type = 'button'; b2.style.marginLeft = '8px'; b2.addEventListener('click', openToken);
      box.appendChild(b1); box.appendChild(b2); body.appendChild(box);
    } else {
      var c = q.konten;
      if (q.tipe === 'pg_biasa') body.appendChild(el('p', null, c.pertanyaan));
      else if (q.tipe === 'sebab_akibat') { var a = el('p'); a.appendChild(el('strong', null, 'Pernyataan: ')); a.appendChild(document.createTextNode(c.pernyataan)); var s = el('p'); s.appendChild(el('strong', null, 'Sebab: ')); s.appendChild(document.createTextNode(c.alasan)); body.appendChild(a); body.appendChild(s); }
      else { body.appendChild(el('p', null, c.pengantar)); var ol = el('ol'); [c.item_1, c.item_2, c.item_3].forEach(function (t) { ol.appendChild(el('li', null, t)); }); body.appendChild(ol); }
      var reveal = st.finished || (st.mode === 'belajar' && st.ans[q.n]);
      ['A', 'B', 'C', 'D'].forEach(function (o) {
        var b = el('button', 'opt-btn'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', st.ans[q.n] === o ? 'true' : 'false');
        b.appendChild(el('b', null, o)); b.appendChild(el('span', null, q.opsi[o]));
        if (reveal) { if (o === q.kunci) b.classList.add('ok'); else if (st.ans[q.n] === o) b.classList.add('bad'); }
        b.disabled = st.finished;
        b.addEventListener('click', function () { answer(o); });
        opts.appendChild(b);
      });
      if (reveal) { pemb.hidden = false; pemb.appendChild(el('h4', null, 'Pembahasan Modul')); var kk = el('p'); kk.appendChild(el('strong', null, 'Kunci: ' + q.kunci + '. ')); kk.appendChild(document.createTextNode(q.opsi[q.kunci])); pemb.appendChild(kk); pemb.appendChild(el('p', 'muted', q.pembahasan)); }
    }
    var fl = $('flag'); fl.disabled = !!q.locked || st.finished; fl.setAttribute('aria-pressed', st.flag[q.n] ? 'true' : 'false');
    var v = visible(), i = v.indexOf(st.cur);
    $('prev').disabled = i <= 0; $('next').disabled = i === -1 || i >= v.length - 1;
    renderGrid();
  }

  function go(n) { if (!meta[n]) return; st.cur = n; if (st.filter !== 'all' && meta[n].tipe !== st.filter) setFilter('all', true); startTimer(); render(); }
  function step(d) { var v = visible(), i = v.indexOf(st.cur); var j = i === -1 ? 0 : i + d; if (j >= 0 && j < v.length) { st.cur = v[j]; startTimer(); render(); } }
  function answer(o) { if (st.finished || meta[st.cur].locked) return; startTimer(); st.ans[st.cur] = o; render(); }
  function setFilter(t, silent) {
    st.filter = t;
    document.querySelectorAll('.tabs [data-tipe]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tipe === t ? 'true' : 'false'); });
    if (!silent) { var v = visible(); if (v.length && v.indexOf(st.cur) === -1) st.cur = v[0]; render(); }
  }

  // ---------- modal ----------
  var modal = $('modal'), mc = $('mcontent');
  function openModal(node) { mc.textContent = ''; mc.appendChild(node); modal.hidden = false; var f = mc.querySelector('input,button'); if (f) f.focus(); }
  function closeModal() { modal.hidden = true; }
  $('mclose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  function api(path, opt) { return fetch(path, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, ok: r.ok, j: j }; }); }); }

  function openToken() {
    var w = el('div'); var h = el('h3', null, 'Masukkan Token Akses'); h.id = 'mtitle'; w.appendChild(h);
    w.appendChild(el('p', 'muted', 'Format token: CA-XXXX-XXXX. Token tersimpan di perangkat ini setelah berhasil diverifikasi.'));
    var l = el('label', null, 'Kode token'); l.setAttribute('for', 'tk'); var i = el('input'); i.id = 'tk'; i.placeholder = 'CA-XXXX-XXXX'; i.maxLength = 12; i.autocomplete = 'off';
    var m = el('p'); m.setAttribute('role', 'status'); var b = el('button', 'btn primary wide', 'Aktifkan'); b.type = 'button';
    b.addEventListener('click', function () {
      var code = i.value.trim().toUpperCase(); m.className = ''; m.textContent = 'Memeriksa token...';
      api('/bank-soal/api/token/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: code, slug: B.slug }) }).then(function (r) {
        if (!r.ok) { m.className = 'err'; m.textContent = r.j.error || 'Token tidak valid.'; return; }
        st.token = code; try { localStorage.setItem('bs_token', code); localStorage.setItem('bs_scope', JSON.stringify(r.j.scope)); } catch (e) {}
        m.className = 'okmsg'; m.textContent = 'Token aktif. Memuat soal...'; loadLocked().then(function (ok) { if (ok) closeModal(); else { m.className = 'err'; m.textContent = 'Token ini tidak berlaku untuk mata kuliah ini.'; } });
      }).catch(function () { m.className = 'err'; m.textContent = 'Server tidak dapat dihubungi.'; });
    });
    [l, i, b, m].forEach(function (x) { w.appendChild(x); }); openModal(w);
  }

  function openCheckout() {
    var w = el('div'); var h = el('h3', null, 'Buka Akses Penuh'); h.id = 'mtitle'; w.appendChild(h);
    var rp = function (n) { return 'Rp' + Number(n).toLocaleString('id-ID'); };
    w.appendChild(el('p', 'muted', 'Soal nomor 11 sampai ' + B.total + ' untuk ' + B.nama + ' dengan kunci dan pembahasan lengkap. Harga satuan ' + rp(B.harga) + '.'));
    var e1 = el('label', null, 'Email'); e1.setAttribute('for', 'ce'); var ie = el('input'); ie.id = 'ce'; ie.type = 'email'; ie.autocomplete = 'email';
    var e2 = el('label', null, 'Nomor WhatsApp (opsional)'); e2.setAttribute('for', 'cw'); var iw = el('input'); iw.id = 'cw'; iw.type = 'tel'; iw.autocomplete = 'tel';
    var m = el('div'); m.setAttribute('role', 'status');
    var b = el('button', 'btn primary wide', 'Lanjut ke Pembayaran'); b.type = 'button';
    b.addEventListener('click', function () {
      m.className = ''; m.textContent = 'Membuat pesanan...';
      api('/bank-soal/api/checkout/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ie.value.trim(), whatsapp: iw.value.trim(), scope_type: 'single_course', scope_value: B.slug }) }).then(function (r) {
        if (!r.ok) { m.className = 'err'; m.textContent = r.j.error || 'Gagal membuat pesanan.'; return; }
        m.className = ''; m.textContent = '';
        var p = r.j.payment || {}; m.appendChild(el('p', 'okmsg', 'Pesanan ' + r.j.order_id + ' dibuat. Total ' + rp(r.j.amount) + '.'));
        if (p.instructions) m.appendChild(el('p', null, p.instructions));
        if (p.pay_url) { var a = el('a', 'btn wide', 'Buka halaman pembayaran'); a.href = p.pay_url; a.target = '_blank'; a.rel = 'noopener'; m.appendChild(a); }
        m.appendChild(el('p', 'muted', 'Token dikirim setelah pembayaran terkonfirmasi. Masukkan token lewat tombol "Masukkan Token Akses".'));
      }).catch(function () { m.className = 'err'; m.textContent = 'Server tidak dapat dihubungi.'; });
    });
    var t = el('button', 'btn wide', 'Saya sudah punya token'); t.type = 'button'; t.addEventListener('click', openToken);
    [e1, ie, e2, iw, b, t, m].forEach(function (x) { w.appendChild(x); }); openModal(w);
  }

  function loadLocked() {
    if (!st.token) return Promise.resolve(false);
    return api('/bank-soal/api/course/' + encodeURIComponent(B.slug) + '/locked-questions', { headers: { Authorization: 'Bearer ' + st.token } }).then(function (r) {
      if (!r.ok) { if (r.status === 401 || r.status === 402) { try { localStorage.removeItem('bs_token'); } catch (e) {} st.token = null; } return false; }
      (r.j.questions || []).forEach(function (q) { if (meta[q.n]) { meta[q.n] = Object.assign({ n: q.n }, q, { locked: false }); } });
      render(); return true;
    }).catch(function () { return false; });
  }

  // ---------- hasil ----------
  function finish(auto) {
    if (st.finished && !auto) return;
    var w = el('div'); var h = el('h3', null, auto ? 'Waktu habis' : 'Hasil Simulasi'); h.id = 'mtitle'; w.appendChild(h);
    if (!st.finished) { st.finished = true; clearInterval(st.timer); }
    var acc = nums.filter(accessible), benar = 0, per = {};
    acc.forEach(function (n) { var q = meta[n]; per[q.modul] = per[q.modul] || { b: 0, t: 0 }; per[q.modul].t++; if (st.ans[n] === q.kunci) { benar++; per[q.modul].b++; } });
    var answered = acc.filter(function (n) { return st.ans[n]; }).length, pct = acc.length ? Math.round(benar / acc.length * 100) : 0;
    var res = el('div', 'res');
    [[pct, 'Skor'], [benar + '/' + acc.length, 'Benar'], [answered, 'Terjawab'], [acc.length - answered, 'Kosong']].forEach(function (x) { var c = el('div', 'card'); c.appendChild(el('b', null, String(x[0]))); c.appendChild(el('span', 'muted', x[1])); res.appendChild(c); });
    w.appendChild(res); w.appendChild(el('h4', null, 'Akurasi per Modul'));
    Object.keys(per).sort(function (a, b) { return a - b; }).forEach(function (k) {
      var p = per[k], v = Math.round(p.b / p.t * 100), r = el('div', 'mrow' + (v < 60 ? ' weak' : ''));
      r.appendChild(el('span', null, 'Modul ' + k)); var bar = el('div', 'mbar'); var i = el('i'); i.style.width = v + '%'; bar.appendChild(i); r.appendChild(bar); r.appendChild(el('span', null, v + '%')); w.appendChild(r);
    });
    var weak = Object.keys(per).filter(function (k) { return per[k].b / per[k].t < 0.6; });
    w.appendChild(el('p', 'muted', weak.length ? 'Modul yang masih perlu diperkuat: ' + weak.map(function (k) { return 'Modul ' + k; }).join(', ') + '.' : 'Seluruh modul yang dikerjakan sudah di atas 60%.'));
    if (acc.length < nums.length) { var cta = el('button', 'btn primary wide', 'Buka ' + (nums.length - acc.length) + ' Soal Lainnya'); cta.type = 'button'; cta.addEventListener('click', openCheckout); w.appendChild(cta); }
    var rv = el('button', 'btn wide', 'Tinjau Jawaban dan Pembahasan'); rv.type = 'button'; rv.addEventListener('click', function () { closeModal(); render(); }); w.appendChild(rv);
    openModal(w); render();
  }

  // ---------- event ----------
  $('prev').addEventListener('click', function () { step(-1); });
  $('next').addEventListener('click', function () { step(1); });
  $('flag').addEventListener('click', function () { if (meta[st.cur].locked || st.finished) return; st.flag[st.cur] = !st.flag[st.cur]; startTimer(); render(); });
  $('finish').addEventListener('click', function () { finish(false); });
  $('unlock').addEventListener('click', openToken);
  document.querySelectorAll('.tabs [data-tipe]').forEach(function (b) { b.addEventListener('click', function () { setFilter(b.dataset.tipe); }); });
  document.querySelectorAll('.modes [data-mode]').forEach(function (b) { b.addEventListener('click', function () { st.mode = b.dataset.mode; document.querySelectorAll('.modes [data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); render(); }); });
  document.addEventListener('keydown', function (e) {
    if (!modal.hidden) { if (e.key === 'Escape') closeModal(); return; }
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toUpperCase();
    if (['A', 'B', 'C', 'D'].indexOf(k) > -1) { answer(k); }
    else if (e.key === 'ArrowLeft') { step(-1); } else if (e.key === 'ArrowRight') { step(1); }
  });

  render();
  if (st.token) loadLocked();
})();
