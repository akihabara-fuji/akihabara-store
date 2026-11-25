        // =========================================================================
        // 6. MUAT DATA DARI ADMIN (store.json) — hanya konten publik, prompt terkunci tidak pernah dikirim
        // =========================================================================
        function fmtText(el, raw, mode) {
            const t = String(raw == null ? '' : raw);
            if (mode === 'title') {
                el.innerHTML = t.split('\n').map(line => '<span class="block">' + esc(line).replace(/\[\[(.+?)\]\]/g, '<span class="text-[#FF4D1C]">$1</span>') + '</span>').join('');
            } else if (mode === 'rich') {
                el.innerHTML = esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            } else {
                el.textContent = t;
            }
        }

        function renderBundles() {
            const grid = document.getElementById('bundle-grid');
            const list = (STORE.bundles || []).filter(b => !b.hidden);
            const nf = photoProducts.length, ns = storyboardProducts.length;
            const sum = (arr) => arr.reduce((a, x) => a + x.price, 0);
            const ctx = (b) => ({ foto: nf, sb: ns, total: nf + ns });
            const sub = (s, b) => String(s || '').replace(/\{foto\}/g, nf).replace(/\{sb\}/g, ns).replace(/\{total\}/g, nf + ns);
            let best = 0;
            grid.innerHTML = list.map(b => {
                const base = b.scope === 'photos' ? sum(photoProducts) : b.scope === 'storyboards' ? sum(storyboardProducts) : sum(photoProducts) + sum(storyboardProducts);
                const original = b.originalPrice > 0 ? b.originalPrice : base;
                const pct = original > b.price ? Math.round((1 - b.price / original) * 100) : 0;
                if (pct > best) best = pct;
                const hi = !!b.highlighted;
                const badge = b.badge ? sub(b.badge) : (pct > 0 ? 'HEMAT ' + formatRp(original - b.price).replace('Rp ', 'Rp ') : '');
                const feats = (b.features || []).map(f => `<li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 ${hi ? 'text-[#FF4D1C]' : 'text-emerald-600'} shrink-0"></i><span>${esc(sub(f))}</span></li>`).join('');
                return `
                <div class="relative rounded-3xl p-6 sm:p-7 ${hi ? 'bg-zinc-950 text-white shadow-xl' : 'bg-zinc-50 border border-zinc-200'} flex flex-col justify-between">
                    ${hi && badge ? `<div class="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[#FF4D1C] text-white font-bold text-[10px] tracking-wider uppercase">${esc(badge)}</div>` : ''}
                    <div>
                        <div class="flex items-center justify-between gap-2">
                            <h3 class="font-display font-extrabold text-lg ${hi ? 'text-white' : 'text-zinc-950'}">${esc(b.title)}</h3>
                            ${b.chip ? `<span class="px-2.5 py-0.5 rounded-full ${hi ? 'bg-white/10 text-amber-300' : 'bg-white border border-zinc-200 text-zinc-600'} font-mono text-[11px] font-semibold">${esc(sub(b.chip))}</span>` : ''}
                        </div>
                        <p class="text-xs ${hi ? 'text-zinc-400' : 'text-zinc-500'} mt-1.5">${esc(sub(b.desc))}</p>
                        <div class="my-5 pb-5 border-b ${hi ? 'border-zinc-800' : 'border-zinc-200'}">
                            ${pct > 0 ? `<span class="text-xs ${hi ? 'text-zinc-500' : 'text-zinc-400'} line-through">${formatRp(original)}</span>` : ''}
                            <div class="flex items-baseline gap-1.5">
                                <span class="font-display text-3xl font-extrabold ${hi ? 'text-white' : 'text-zinc-950'}">${formatRp(b.price)}</span>
                                <span class="text-xs ${hi ? 'text-zinc-400' : 'text-zinc-500'}">sekali bayar</span>
                            </div>
                            ${!hi && badge ? `<span class="inline-block mt-1.5 text-[10px] font-mono font-bold text-emerald-700">${esc(badge)}</span>` : ''}
                        </div>
                        <ul class="space-y-2.5 text-xs ${hi ? 'text-zinc-200' : 'text-zinc-700'}">${feats}</ul>
                    </div>
                    <button onclick="addBundleToCart('${esc(b.id)}')" class="mt-7 w-full py-3 rounded-xl ${hi ? 'bg-[#FF4D1C] hover:bg-[#E63E10] text-white shadow-lg shadow-orange-500/25 active:scale-95' : 'bg-white hover:bg-zinc-950 border border-zinc-950 text-zinc-950 hover:text-white'} font-bold text-xs sm:text-sm transition cursor-pointer">${esc(b.cta || 'Tambah ke keranjang')}</button>
                </div>`;
            }).join('');
            const bb = document.getElementById('bundle-badge');
            const custom = (STORE.s.bundleBadge || '').trim();
            bb.textContent = custom ? custom : (best > 0 ? 'HEMAT HINGGA ' + best + '% • SEKALI BAYAR' : 'SEKALI BAYAR');
            lucide.createIcons();
        }

        function renderPills() {
            const box = document.getElementById('photo-filter-pills');
            const cats = [...new Set(photoProducts.map(p => p.category).filter(Boolean))];
            const on = 'p-pill px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-950 border border-zinc-950 text-white shrink-0 cursor-pointer';
            const off = 'p-pill px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-zinc-950 hover:bg-zinc-950 text-zinc-950 hover:text-white shrink-0 cursor-pointer transition';
            box.innerHTML = [['all', 'Semua']].concat(cats.map(c => [c, c])).map(([v, l]) => `<button data-cat="${esc(v)}" class="${v === activePhotoCat ? on : off}">${esc(l)}</button>`).join('');
            box.querySelectorAll('.p-pill').forEach(btn => btn.addEventListener('click', () => {
                activePhotoCat = btn.dataset.cat;
                renderPills();
                renderPhotoCatalog();
            }));
        }

        function applyStore(data) {
            STORE = data;
            const s = data.s || {};
            document.querySelectorAll('[data-k]').forEach(el => {
                const v = data.t && data.t[el.dataset.k];
                if (v !== undefined && v !== null && v !== '') fmtText(el, v, el.dataset.fmt);
            });
            WA_NUMBER = (s.waNumber || WA_NUMBER).replace(/\D/g, '');
            document.querySelectorAll('[data-wa]').forEach(a => { a.href = 'https://wa.me/' + WA_NUMBER; });
            const ann = document.getElementById('ann');
            if (s.annOn && s.ann) { ann.textContent = s.ann; ann.classList.remove('hidden'); } else { ann.classList.add('hidden'); }
            const soc = document.getElementById('footer-social');
            const links = [['Instagram', s.instagram], ['TikTok', s.tiktok], ['YouTube', s.youtube]].filter(x => x[1]);
            soc.innerHTML = links.length ? 'Ikuti kami: ' + links.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener" class="underline hover:text-white">${l}</a>`).join(' · ') : '';
            photoProducts = data.photos || [];
            storyboardProducts = data.sbs || [];
            unlockedIds = new Set(photoProducts.concat(storyboardProducts).filter(x => x.free).map(x => x.id));
            storyboardProducts.forEach(sb => { sbPlayingMap[sb.id] = true; });
            const uc = document.getElementById('nav-unlocked-count');
            uc.textContent = unlockedIds.size;
            uc.closest('button').classList.toggle('hidden', unlockedIds.size === 0);
            renderPills();
            renderPhotoCatalog();
            renderStoryboardCatalog();
            renderBundles();
            renderCart();
        }

        fetch('store.json?v=' + Date.now(), { cache: 'no-store' })
            .then(r => { if (!r.ok) throw new Error('store.json ' + r.status); return r.json(); })
            .then(d => { applyStore(d); track('pageview'); })
            .catch(() => {
                document.getElementById('photo-catalog-grid').innerHTML = '<p class="col-span-full text-center text-sm text-zinc-500 py-10">Katalog sedang tidak bisa dimuat. Coba muat ulang halaman, atau hubungi admin lewat WhatsApp.</p>';
            });
        document.getElementById('cart-wa-btn').addEventListener('click', () => { if (cartItems.length) track('wa_click'); });
        renderCart();
