#!/usr/bin/env python3
"""Ubah index.html lama (data produk tertanam) menjadi template yang membaca store.json dari admin.
Pakai: python3 build_site.py orig-index.html site/index.template.html
Setiap penggantian dicek jumlah kemunculannya; gagal keras kalau tidak cocok."""
import re, sys

src = open(sys.argv[1], encoding='utf-8').read()
out = src

def rep(old, new, count=1):
    global out
    n = out.count(old)
    if n != count:
        sys.exit('GAGAL: %d kemunculan (harus %d): %s' % (n, count, old[:90]))
    out = out.replace(old, new)

def rx(pattern, new, flags=re.S, count=1, literal=False):
    global out
    out, n = re.subn(pattern, (lambda m: new) if literal else new, out, flags=flags)
    if n != count:
        sys.exit('GAGAL regex %d != %d: %s' % (n, count, pattern[:90]))

def slot(key, old_inner, fmt=True):
    """bungkus teks bawaan dengan span data-k; teks bawaan tetap jadi cadangan bila store.json gagal dimuat"""
    rep(old_inner, '<span data-k="%s">%s</span>' % (key, old_inner))

# 1. Banner draft -> bar informasi yang dikendalikan admin (tersembunyi bila kosong)
rx(r'<div class="relative z-50 bg-amber-50 border-b border-amber-200[^>]*>.*?</div>',
   '<div id="ann" class="hidden relative z-50 bg-zinc-950 text-white text-center text-xs sm:text-[13px] py-2 px-4"></div>')

# 2. Slot teks
slot('nav.tag', 'Prompt &amp; Remotion 2D') if False else None
rep('<span class="hidden lg:inline-block ml-2 px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-mono font-semibold text-zinc-600">Prompt &amp; Remotion 2D</span>',
    '<span data-k="nav.tag" class="hidden lg:inline-block ml-2 px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-mono font-semibold text-zinc-600">Prompt &amp; Remotion 2D</span>')
rep('<a href="#prompt-foto" class="hover:text-zinc-950 transition">Prompt Foto</a>', '<a href="#prompt-foto" data-k="nav.l1" class="hover:text-zinc-950 transition">Prompt Foto</a>')
rep('<a href="#storyboard-video" class="hover:text-zinc-950 transition">Storyboard &rarr; Video</a>', '<a href="#storyboard-video" data-k="nav.l2" class="hover:text-zinc-950 transition">Storyboard &rarr; Video</a>')
rep('<a href="#cara-kerja" class="hover:text-zinc-950 transition">Cara Kerja</a>', '<a href="#cara-kerja" data-k="nav.l3" class="hover:text-zinc-950 transition">Cara Kerja</a>')
rep('<a href="#bundling" class="hover:text-zinc-950 transition">Bundling</a>', '<a href="#bundling" data-k="nav.l4" class="hover:text-zinc-950 transition">Bundling</a>')

rep('<span class="px-2 py-0.5 rounded bg-zinc-950 text-white font-mono text-[10px] font-bold">MARKETPLACE AI</span>',
    '<span data-k="hero.badge" class="px-2 py-0.5 rounded bg-zinc-950 text-white font-mono text-[10px] font-bold">MARKETPLACE AI</span>')
rep('<span class="text-xs font-medium text-zinc-600 pr-1">Prompt Foto + Storyboard Video 2D</span>',
    '<span data-k="hero.tag" class="text-xs font-medium text-zinc-600 pr-1">Prompt Foto + Storyboard Video 2D</span>')

# judul hero (3 baris, [[kata]] = oranye)
rx(r'(<h1 style="font-size: clamp\(2\.35rem, 4\.6vw, 4\.15rem\);"[^>]*>).*?(</h1>)',
   r'\1<span data-k="hero.title" data-fmt="title"><span class="block">Katalog Prompt AI</span><span class="block">&amp; Storyboard <span class="text-[#FF4D1C]">2D</span></span><span class="block">siap pakai<span class="text-[#FF4D1C]">.</span></span></span>\2')

rx(r'(<p class="mt-4 text-\[#A3A3A3\] text-sm sm:text-base max-w-md mx-auto leading-relaxed">).*?(</p>)',
   r'\1<span data-k="hero.sub" data-fmt="rich">Lihat <strong>Foto Hasil</strong> &amp; pratinjau <strong>Storyboard &rarr; Video AI</strong>. Pesan lewat WhatsApp admin, lalu prompt siap salin &amp; kode Remotion 2D dikirim setelah pembayaran dikonfirmasi.</span>\2')

rep('<span>Lihat Prompt Foto</span>', '<span data-k="hero.cta1">Lihat Prompt Foto</span>')
# CTA 2 hero: yang berada tepat setelah ikon film
rx(r'(<i data-lucide="film" class="w-4 h-4 text-\[#FF4D1C\]"></i>\s*)<span>Storyboard &rarr; Video AI</span>',
   r'\1<span data-k="hero.cta2">Storyboard &rarr; Video AI</span>')
rep('Foto &rarr; 2D</span>', 'Foto &rarr; 2D</span>')  # cek ada
for key, txt in (('hero.c1', 'Foto &rarr; 2D'), ('hero.c2', 'Scene 01-02'), ('hero.c4', 'Video AI 60fps')):
    rx(r'(<span class="font-display font-extrabold text-\[10px\] text-(?:amber-300|white) caption-stroke")>' + re.escape(txt) + '</span>',
       r'\1 data-k="%s">%s</span>' % (key, txt))
rx(r'(<span class="font-display font-extrabold text-\[10px\] text-amber-300 caption-stroke")>Karakter 2D</span>',
   r'\1 data-k="hero.c3">Karakter 2D</span>', count=1)

# Seksi foto & storyboard
rx(r'(<h2 class="font-display text-2xl sm:text-3xl font-extrabold text-zinc-950">)\s*Katalog Prompt Foto AI Teruji\s*(</h2>)',
   r'\1<span data-k="photos.h2">Katalog Prompt Foto AI Teruji</span>\2')
rx(r'(<p class="text-xs sm:text-sm text-zinc-500 mt-1">)\s*Setiap kartu menampilkan.*?(</p>)',
   r'\1<span data-k="photos.p" data-fmt="rich">Setiap kartu menampilkan <strong>Foto Hasil</strong>, <strong>Harga</strong>, dan box <strong>Prompt</strong> yang dikirim admin lewat WhatsApp setelah pembelian dikonfirmasi.</span>\2')
rx(r'(<h2 class="font-display text-2xl sm:text-3xl font-extrabold text-zinc-950">)\s*Paket Storyboard Gambar &rarr; Video AI &amp; Remotion 2D\s*(</h2>)',
   r'\1<span data-k="sb.h2">Paket Storyboard Gambar &rarr; Video AI &amp; Remotion 2D</span>\2')
rx(r'(<p class="text-xs sm:text-sm text-zinc-500 mt-1">)\s*Alur produksi lengkap:.*?(</p>)',
   r'\1<span data-k="sb.p" data-fmt="rich">Alur produksi lengkap: <strong>Keyframe 01 &amp; 02 (Storyboard Gambar)</strong> di sisi kiri dan hasil animasi <strong>Video AI</strong> di sisi kanan, lengkap dengan dual-prompt.</span>\2')

# Cara kerja
for i, (t, p) in enumerate((
    ('Cek Foto Hasil &amp; Video AI', 'Bandingkan output visual &amp; animasi 2D sebelum membeli agar hasil sesuai kebutuhanmu.'),
    ('Pesan via WhatsApp', 'Masukkan ke keranjang, klik "Pesan via WhatsApp" — daftar pilihanmu otomatis kekirim ke admin buat atur pembayaran.'),
    ('Prompt Dikirim Admin', 'Setelah pembayaran dikonfirmasi, admin kirim teks prompt lengkap langsung di chat WhatsApp — siap salin.')), 1):
    rep('<h3 class="font-display font-bold text-sm text-zinc-950">%s</h3>' % t, '<h3 data-k="step%d.t" class="font-display font-bold text-sm text-zinc-950">%s</h3>' % (i, t))
    rep('<p class="text-xs text-zinc-500 mt-1 leading-relaxed">%s</p>' % p, '<p data-k="step%d.p" class="text-xs text-zinc-500 mt-1 leading-relaxed">%s</p>' % (i, p))

# Bundling: ganti seluruh kartu statis dengan kontainer dinamis
rx(r'<span class="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-\[11px\] font-bold">\s*HEMAT HINGGA 65% • SEKALI BAYAR\s*</span>',
   '<span id="bundle-badge" class="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-bold">SEKALI BAYAR</span>')
rx(r'(<h2 class="font-display text-2xl sm:text-3xl font-extrabold text-zinc-950 mt-2\.5">)\s*Paket Bundling Prompt &amp; Remotion 2D\s*(</h2>)',
   r'\1<span data-k="bundle.h2">Paket Bundling Prompt &amp; Remotion 2D</span>\2')
rx(r'(<p class="text-xs sm:text-sm text-zinc-500 mt-1">)\s*Buka kunci banyak prompt sekaligus.*?(</p>)',
   r'\1<span data-k="bundle.p">Buka kunci banyak prompt sekaligus dengan harga lebih hemat untuk kreator &amp; agensi.</span>\2')
rx(r'<div class="grid grid-cols-1 md:grid-cols-2 gap-6">\s*<!-- Bundle 1: Paket Kreator Pemula -->.*?</button>\s*</div>\s*</div>\s*</div>\s*</section>\s*<!-- FOOTER -->',
   '<div id="bundle-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>\n        </div>\n    </section>\n\n    <!-- FOOTER -->')

# Footer
rep('<span class="ml-1">&copy; 2026 — Marketplace Prompt Foto AI &amp; Storyboard Video 2D.</span>',
    '<span class="ml-1" data-k="footer.l1">&copy; 2026 — Marketplace Prompt Foto AI &amp; Storyboard Video 2D.</span>')
rep('<span>Pemesanan manual lewat WhatsApp admin — pembayaran diatur langsung saat chat.</span>',
    '<span data-k="footer.l2">Pemesanan manual lewat WhatsApp admin — pembayaran diatur langsung saat chat.</span>')
rx(r'<span>Ikuti kami:.*?</span>', '<span id="footer-social">Ikuti kami: </span>')

# Keranjang
rep('<h2 class="font-display font-extrabold text-base text-zinc-950">Keranjang &amp; Buka Prompt</h2>',
    '<h2 data-k="cart.title" class="font-display font-extrabold text-base text-zinc-950">Keranjang &amp; Buka Prompt</h2>')
rx(r'(<div class="p-3\.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-\[11px\] text-zinc-500 leading-relaxed">)\s*Belum ada pembayaran otomatis.*?(</div>)',
   r'\1<span data-k="cart.note">Belum ada pembayaran otomatis di sini. Klik "Pesan via WhatsApp" di bawah, daftar pilihanmu otomatis kekirim ke admin, lalu admin yang kirim detail pembayaran manual dan prompt lengkapnya setelah lunas.</span>\2')
rx(r'(<span)>Pesan via WhatsApp</span>(\s*</a>\s*</div>\s*</aside>)', r'\1 data-k="cart.wabtn">Pesan via WhatsApp</span>\2')

# 3. Nomor WA & link WA statis -> dikendalikan admin
rep('href="https://wa.me/6285722227544"', 'data-wa href="https://wa.me/6285722227544"', count=2)
rep("const WA_NUMBER = '6285722227544';", "let WA_NUMBER = '6285722227544';")

# 4. Data produk dari server (tidak ada lagi prompt tertanam di sumber halaman)
rx(r'const photoProducts = \[.*?\n        \];\s*const storyboardProducts = \[.*?\n        \];',
   "let STORE = null;\n        let photoProducts = [];\n        let storyboardProducts = [];")
rep("let unlockedIds = new Set(['pf-1']);", "let unlockedIds = new Set();")
rep("let sbPlayingMap = { 'sb-1': true, 'sb-2': true, 'sb-3': true, 'sb-4': true };", "let sbPlayingMap = {};")

# kartu foto: gambar nyata bila ada, prompt terkunci tidak memuat teks asli
rep('<canvas id="art-${p.id}" class="w-full h-full object-cover block grayscale group-hover:grayscale-0 transition-[filter] duration-500"></canvas>',
    '${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.title)}" loading="lazy" class="w-full h-full object-cover block">` : `<canvas id="art-${p.id}" class="w-full h-full object-cover block grayscale group-hover:grayscale-0 transition-[filter] duration-500"></canvas>`}')
rep('<span class="px-2.5 py-0.5 rounded-full bg-zinc-950/85 text-white font-mono text-[10px] font-bold">FOTO HASIL</span>',
    '<span class="px-2.5 py-0.5 rounded-full bg-zinc-950/85 text-white font-mono text-[10px] font-bold">${p.imageUrl ? \'FOTO HASIL\' : \'ILUSTRASI CONTOH\'}</span>')
rep('<span class="px-2 py-0.5 rounded-full bg-white/95 text-zinc-800 font-mono text-[10px] font-semibold border border-zinc-200">${p.model}</span>',
    '<span class="px-2 py-0.5 rounded-full bg-white/95 text-zinc-800 font-mono text-[10px] font-semibold border border-zinc-200">${esc(p.model)}</span>')
rep('bg-white/90 text-zinc-700 font-mono text-[10px] font-bold">${p.ratio}</span>', 'bg-white/90 text-zinc-700 font-mono text-[10px] font-bold">${esc(p.ratio)}</span>')
rep('<span class="text-[11px] font-medium text-zinc-400">${p.category}</span>', '<span class="text-[11px] font-medium text-zinc-400">${esc(p.category)}</span>')
rep('leading-snug mt-0.5">${p.title}</h3>', 'leading-snug mt-0.5">${esc(p.title)}</h3>')
rx(r"addProductToCart\('\$\{(\w+)\.id\}', '\$\{\w+\.title\}', \$\{\w+\.price\}, (true|false)\)", r"addProductToCart('${\1.id}', \2)", count=4)
rep('''<span>${p.promptPrefix}</span>
                                <span class="${isUnlocked ? '' : 'prompt-locked-blur'}">${p.promptSecret}</span>''',
    '''${isUnlocked ? `<span>${esc(p.prompt)}</span>` : `<span>${esc(p.prefix)}</span> <span class="prompt-locked-blur">${LOCK_FILL}</span>`}''')
rep("if (p) copyTextFallback(p.promptPrefix + p.promptSecret, 'Prompt Foto');", "if (p && p.prompt) copyTextFallback(p.prompt, 'Prompt Foto');")
rep('''filtered.forEach(p => {
                const c = document.getElementById('art-' + p.id);
                if (c) paintPhotoArtwork(c, p.artType);
            });''', '''filtered.forEach(p => {
                const c = document.getElementById('art-' + p.id);
                if (c) paintPhotoArtwork(c, p.artType || 'coffee');
            });''')
rep("grid.innerHTML = filtered.map(p => {", "grid.innerHTML = filtered.length ? filtered.map(p => {")
rep('''                </article>
                `;
            }).join('');

            filtered.forEach(p => {''', '''                </article>
                `;
            }).join('') : '<p class="col-span-full text-center text-sm text-zinc-500 py-10">Belum ada produk yang cocok.</p>';

            filtered.forEach(p => {''')

# storyboard
rep('<canvas id="kf1-${sb.id}" class="w-full aspect-square rounded-lg block bg-zinc-100"></canvas>',
    '${sb.kf1Url ? `<img src="${esc(sb.kf1Url)}" alt="" loading="lazy" class="w-full aspect-square rounded-lg block object-cover bg-zinc-100">` : `<canvas id="kf1-${sb.id}" class="w-full aspect-square rounded-lg block bg-zinc-100"></canvas>`}')
rep('<canvas id="kf2-${sb.id}" class="w-full aspect-square rounded-lg block bg-zinc-100"></canvas>',
    '${sb.kf2Url ? `<img src="${esc(sb.kf2Url)}" alt="" loading="lazy" class="w-full aspect-square rounded-lg block object-cover bg-zinc-100">` : `<canvas id="kf2-${sb.id}" class="w-full aspect-square rounded-lg block bg-zinc-100"></canvas>`}')
rep('block truncate">${sb.kf1Label}</span>', 'block truncate">${esc(sb.kf1Label)}</span>') if 'block truncate">${sb.kf1Label}' in out else None
out = out.replace('${sb.kf1Label}', '${esc(sb.kf1Label)}').replace('${sb.kf2Label}', '${esc(sb.kf2Label)}')
rep('<canvas id="vid-${sb.id}" class="w-full h-36 block"></canvas>',
    '${sb.videoUrl ? `<video id="vid-${sb.id}" src="${esc(sb.videoUrl)}" ${sb.videoPoster ? `poster="${esc(sb.videoPoster)}"` : \'\'} muted loop playsinline autoplay controls preload="metadata" class="w-full h-36 block bg-black object-contain"></video>` : `<canvas id="vid-${sb.id}" class="w-full h-36 block"></canvas>`}')
rep('<span class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/65 font-mono text-[9px] text-zinc-200">${sb.engine}</span>',
    '<span class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/65 font-mono text-[9px] text-zinc-200">${esc(sb.engine)}</span>')
rep('<span class="text-[11px] text-zinc-400 font-medium">${sb.category}</span>', '<span class="text-[11px] text-zinc-400 font-medium">${esc(sb.category)}</span>')
rep('<h3 class="font-display font-extrabold text-base text-zinc-950">${sb.title}</h3>', '<h3 class="font-display font-extrabold text-base text-zinc-950">${esc(sb.title)}</h3>')
rep('${sb.promptImage.slice(0, 42)}<span class="${isUnlocked ? \'\' : \'prompt-locked-blur\'}">${sb.promptImage.slice(42)}</span>',
    '${isUnlocked ? esc(sb.promptImage) : `${esc(sb.imagePrefix)} <span class="prompt-locked-blur">${LOCK_FILL}</span>`}')
rep('${sb.promptVideo.slice(0, 42)}<span class="${isUnlocked ? \'\' : \'prompt-locked-blur\'}">${sb.promptVideo.slice(42)}</span>',
    '${isUnlocked ? esc(sb.promptVideo) : `${esc(sb.videoPrefix)} <span class="prompt-locked-blur">${LOCK_FILL}</span>`}')

# helper + tombol video/animasi aman untuk produk tanpa canvas
rep("function formatRp(num) {", '''const LOCK_FILL = 'prompt lengkap dikirim admin lewat WhatsApp setelah pesanan dikonfirmasi';
        function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
        function formatRp(num) {''')

# fungsi keranjang: cari produk lewat id (judul tidak lagi masuk atribut onclick)
rx(r"function addProductToCart\(id, title, price, openImmediately = false\) \{.*?\n        \}\n\n        function addBundleToCart\(id, title, price\) \{.*?\n        \}",
   '''function findItem(id) {
            const a = photoProducts.find(x => x.id === id) || storyboardProducts.find(x => x.id === id);
            if (a) return { id: a.id, title: a.title, price: a.price };
            const b = (STORE && STORE.bundles || []).find(x => x.id === id);
            return b ? { id: b.id, title: b.title, price: b.price } : null;
        }
        function track(ev, item) {
            try { navigator.sendBeacon('/hey-api/track', new Blob([JSON.stringify({ e: ev, i: item || '' })], { type: 'application/json' })); } catch (e) {}
        }
        function addProductToCart(id, openImmediately = false) {
            const it = findItem(id);
            if (!it) return;
            if (!cartItems.some(x => x.id === id)) {
                cartItems.push(it);
                renderCart();
                track('add_to_cart', id);
                showToast(`"${it.title}" masuk ke keranjang.`, 'success');
            }
            if (openImmediately) openCartDrawer();
        }

        function addBundleToCart(id) {
            const it = findItem(id);
            if (it && !cartItems.some(x => x.id === id)) {
                cartItems.push(it);
                renderCart();
                track('add_to_cart', id);
            }
            openCartDrawer();
        }''')
rep('''<div class="text-xs font-bold text-zinc-950 truncate">${item.title}</div>''', '''<div class="text-xs font-bold text-zinc-950 truncate">${esc(item.title)}</div>''')
rep("onclick=\"removeCartItem('${item.id}')\"", "onclick=\"removeCartItem('${esc(item.id)}')\"")
rx(r"const msg = `\$\{greeting\} Saya mau pesan dari heyaipeople\.site:\\n\$\{lines\}\\n\\nTotal: \$\{formatRp\(tot\)\}`;",
   "const tpl = (STORE && STORE.s.waTemplate) || 'Halo, saya {nama}. Saya mau pesan dari heyaipeople.site:\\n{daftar}\\n\\nTotal: {total}';\n            const msg = tpl.replace('{nama}', name || '').replace('{daftar}', lines).replace('{total}', formatRp(tot)).replace('Halo, saya .', 'Halo,');", literal=True)
rep("const greeting = name ? `Halo, saya ${name}.` : 'Halo,';", "")
# modal 'Prompt saya' memakai prompt yang sudah terbuka saja
rep("const full = p.promptPrefix + p.promptSecret;", "const full = esc(p.prompt);")
rep('<span class="font-display font-bold text-xs sm:text-sm text-zinc-950">${p.title}</span>', '<span class="font-display font-bold text-xs sm:text-sm text-zinc-950">${esc(p.title)}</span>')
rep('<span class="font-display font-bold text-xs sm:text-sm text-zinc-950">${s.title}</span>', '<span class="font-display font-bold text-xs sm:text-sm text-zinc-950">${esc(s.title)}</span>')
rep('<span><strong>[Gambar]</strong> ${s.promptImage}</span>', '<span><strong>[Gambar]</strong> ${esc(s.promptImage)}</span>')
rep('<span><strong>[Video]</strong> ${s.promptVideo}</span>', '<span><strong>[Video]</strong> ${esc(s.promptVideo)}</span>')

# gambar kartu animasi untuk storyboard tanpa canvas / tanpa tipe
rep("function drawStaticKeyframes() {\n            storyboardProducts.forEach(sb => {\n                const c1 = document.getElementById('kf1-' + sb.id);\n                const c2 = document.getElementById('kf2-' + sb.id);",
    "function drawStaticKeyframes() {\n            storyboardProducts.forEach(sb => {\n                const c1 = document.getElementById('kf1-' + sb.id);\n                const c2 = document.getElementById('kf2-' + sb.id);\n                if (!c1 || !c2) return;")


# animasi: aman untuk produk baru, dan tombol putar juga mengendalikan video asli
rep("const frames = { 'sb-1': 1, 'sb-2': 1, 'sb-3': 1, 'sb-4': 1 };", "const frames = {};")
rep("if (sbPlayingMap[sb.id]) {\n                        frames[sb.id] = (frames[sb.id] % 150) + 1;\n                    }",
    "frames[sb.id] = frames[sb.id] || 1;\n                    if (sbPlayingMap[sb.id]) {\n                        frames[sb.id] = (frames[sb.id] % 150) + 1;\n                    }")
rep("const ctx = c.getContext('2d');\n                    const w = c.width = 240, h = c.height = 144;\n                    const t = f * 0.1;",
    "const ctx = c.getContext('2d');\n                    const w = c.width = 240, h = c.height = 144;\n                    const t = f * 0.1;\n                    if (sb.animType === 'none') { ctx.fillStyle = '#E4E4E7'; ctx.fillRect(0, 0, w, h); return; }")
rep("sbPlayingMap[id] = !sbPlayingMap[id];", "sbPlayingMap[id] = !sbPlayingMap[id];\n            const vEl = document.getElementById('vid-' + id);\n            if (vEl && vEl.tagName === 'VIDEO') { sbPlayingMap[id] ? vEl.play() : vEl.pause(); }")
rep('<span id="sb-fps-${sb.id}" class="font-mono text-[10px] text-zinc-400">001/150 @ 60fps</span>', '${sb.videoUrl ? \'\' : `<span id="sb-fps-${sb.id}" class="font-mono text-[10px] text-zinc-400">001/150 @ 60fps</span>`}')

# 5. Boot dari store.json
rep('''        // Inisialisasi Awal
        renderPhotoCatalog();
        renderStoryboardCatalog();
        renderCart();''', open('boot.js', encoding='utf-8').read())

open(sys.argv[2], 'w', encoding='utf-8').write(out)
print('OK', len(src), '->', len(out))
