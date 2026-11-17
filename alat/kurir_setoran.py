"""Kurir setoran: ambil pesan dari bot Telegram Dika, catat ke papan kantor.
Jalan lewat GitHub Actions (workflow kurir-setoran di branch main, tiap 10 menit) dengan secret TELEGRAM_BOT_TOKEN.

Pesan yang dikenali (dari chat yang terdaftar saja):
- diawali "SETORAN"  -> disimpan ke SETORAN/<tanggal>-<jam>-<ai>.md
- diawali "CEK"      -> baris "Cek silang:" di file yang disebut diubah jadi LULUS/GAGAL
- "/status"          -> bot membalas daftar yang menunggu cek silang
- "/start"           -> kalau belum ada chat terdaftar, chat ini didaftarkan
Pesan panjang yang dipecah Telegram digabung kalau datang berurutan (selisih <= 120 detik).
File .txt/.md yang dikirim ke bot juga dibaca.
"""
import datetime, json, os, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
API = f"https://api.telegram.org/bot{TOKEN}"
OFFSET_F = ROOT / "alat" / "kurir_offset.txt"
CHAT_F = ROOT / "alat" / "kurir_chat.txt"
WIB = datetime.timezone(datetime.timedelta(hours=7))
PASANGAN = {"gpt": "Gemini", "gemini": "GPT"}
RAHASIA = [r"gh[pousr]_[A-Za-z0-9]{30,}", r"\bsk-(ant-)?[A-Za-z0-9_-]{20,}", r"AIza[0-9A-Za-z_-]{30,}",
           r"\b\d{8,10}:[A-Za-z0-9_-]{35}\b", r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
           r"(?i)\b(password|kata sandi|passwd)\s*[:=]\s*\S{4,}"]


def api(method, **params):
    data = json.dumps(params).encode()
    req = urllib.request.Request(f"{API}/{method}", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def balas(chat, teks):
    try:
        api("sendMessage", chat_id=chat, text=teks[:4000])
    except Exception as e:  # balasan gagal tidak boleh menggagalkan pencatatan
        print("gagal balas:", e)


def ambil_dokumen(doc):
    if not (doc.get("file_name", "").lower().endswith((".txt", ".md")) and doc.get("file_size", 0) < 500_000):
        return None
    path = api("getFile", file_id=doc["file_id"])["result"]["file_path"]
    with urllib.request.urlopen(f"https://api.telegram.org/file/bot{TOKEN}/{path}", timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def nama_aman(s):
    return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-") or "ai"


def simpan_setoran(teks):
    if any(re.search(p, teks) for p in RAHASIA):
        return "DITOLAK: ada yang mirip token/kata sandi. Hapus dulu bagian itu, lalu kirim ulang."
    kepala = teks.splitlines()[0]
    m = re.match(r"SETORAN\s*·\s*([^·]+)·\s*(.+)", kepala)
    ai = m.group(1).strip() if m else "ai"
    if not re.search(r"^Cek silang:", teks, re.M):
        teks = teks.rstrip() + f"\nCek silang: MENUNGGU {PASANGAN.get(ai.lower(), 'GPT')}\n"
    jam = datetime.datetime.now(WIB)
    p = ROOT / "SETORAN" / f"{jam:%Y-%m-%d-%H%M}-{nama_aman(ai)}.md"
    i = 2
    while p.exists():
        p = p.with_name(f"{jam:%Y-%m-%d-%H%M}-{nama_aman(ai)}-{i}.md"); i += 1
    p.write_text(teks.strip() + "\n", encoding="utf-8")
    est = re.search(r"^Estafet:\s*([a-z0-9-]+)\s*->\s*([A-Z_]+)", teks, re.M | re.I)
    info_est = " " + pindah_estafet(est.group(1), est.group(2).upper(), ai, f"SETORAN/{p.name}") if est else ""
    kurang = [w for w in ["Proyek:", "Bagan/langkah:", "Tugas:", "Hasil:", "Status langkah:"] if w not in teks]
    catatan = f" Kurang kolom: {', '.join(kurang)}." if kurang else ""
    cs = re.search(r"^Cek silang:\s*(.+)$", teks, re.M).group(1)
    return f"Tercatat: SETORAN/{p.name}. Cek silang: {cs}.{catatan}{info_est}"


def catat_cek(teks):
    f = re.search(r"^File:\s*(\S+)", teks, re.M)
    h = re.search(r"^Hasil:\s*(LULUS|GAGAL)", teks, re.M | re.I)
    if not f or not h:
        return "CEK tidak dicatat: butuh baris 'File: ...' dan 'Hasil: LULUS/GAGAL'."
    target = (ROOT / f.group(1)).resolve()
    if ROOT not in target.parents or not target.exists() or target.suffix != ".md":
        return f"CEK tidak dicatat: file {f.group(1)} tidak ada di papan."
    kepala = teks.splitlines()[0]
    m = re.match(r"CEK\s*·\s*([^·]+)·\s*(.+)", kepala)
    ai, waktu = (m.group(1).strip(), m.group(2).strip()) if m else ("?", datetime.datetime.now(WIB).strftime("%Y-%m-%d %H:%M"))
    cat = re.search(r"^Catatan:\s*(.+)$", teks, re.M)
    baris = f"Cek silang: {h.group(1).upper()} {ai} {waktu}" + (f" ({cat.group(1).strip()})" if cat and cat.group(1).strip() != "-" else "")
    isi = target.read_text(encoding="utf-8")
    isi = re.sub(r"^Cek silang:.*$", baris, isi, flags=re.M) if re.search(r"^Cek silang:", isi, re.M) else isi.rstrip() + "\n" + baris + "\n"
    target.write_text(isi, encoding="utf-8")
    return f"Cek dicatat di {target.relative_to(ROOT)}: {baris[12:]}"


URUT = ["LOCK_GEMINI", "LOCK_GPT", "LOCK_FLOW", "LOCK_CLAUDE_REMOTION", "READY_FOR_AUDIT",
        "MENUNGGU_ACC_DIKA", "ACC_DIKA", "COMPLETED"]


def pindah_estafet(id_, ke, siapa, ref=""):
    id_ = nama_aman(id_)
    p = ROOT / "ESTAFET" / id_ / "PROYEK.md"
    if not p.exists():
        return f"Estafet {id_} tidak ada. Buat dulu dengan /baru {id_} <judul>."
    if ke not in URUT:
        return f"Status {ke} tidak dikenal. Pilihan: {', '.join(URUT)}."
    isi = p.read_text(encoding="utf-8")
    dari = re.search(r"^Status:\s*(\S+)", isi, re.M).group(1)
    if dari == "COMPLETED":
        return f"Estafet {id_} sudah COMPLETED, tidak dipindah."
    if URUT.index(ke) > URUT.index(dari) + 1:
        return f"Estafet {id_} tidak boleh lompat dari {dari} ke {ke}."
    jam = datetime.datetime.now(WIB).strftime("%Y-%m-%d %H:%M")
    isi = re.sub(r"^Status:.*$", f"Status: {ke}", isi, count=1, flags=re.M)
    isi = isi.rstrip() + f"\n- {jam} · {siapa} · {dari} -> {ke}" + (f" · {ref}" if ref else "") + "\n"
    p.write_text(isi, encoding="utf-8")
    return f"Estafet {id_}: {dari} -> {ke}."


def estafet_baru(id_, judul):
    id_ = nama_aman(id_)
    d = ROOT / "ESTAFET" / id_
    if d.exists():
        return f"Estafet {id_} sudah ada."
    d.mkdir(parents=True)
    jam = datetime.datetime.now(WIB).strftime("%Y-%m-%d %H:%M")
    (d / "PROYEK.md").write_text(f"""# ESTAFET {id_}: {judul or '(tanpa judul)'}

Status: LOCK_GEMINI
Dibuat: {jam} oleh Dika (bot kurir)
Folder Drive klip Flow: (belum ada)

Alur dan aturan: ESTAFET/README.md. Hanya pemegang status yang boleh mengerjakan proyek ini.

## Riwayat
- {jam} · Dika · dibuat -> LOCK_GEMINI
""", encoding="utf-8")
    return f"Estafet {id_} dibuat, giliran Gemini (LOCK_GEMINI)."


def ringkas_status():
    s = (ROOT / "STATUS.md").read_text(encoding="utf-8")
    m = re.search(r"## Menunggu cek silang\n(.*?)\n## ", s, re.S)
    e = re.search(r"## Estafet: giliran siapa\n(.*?)\n## ", s, re.S)
    return ("Menunggu cek silang:\n" + (m.group(1).strip() if m else "-")
            + "\n\nEstafet:\n" + (e.group(1).strip() if e else "-"))


def main():
    offset = int(OFFSET_F.read_text().strip()) if OFFSET_F.exists() else 0
    terdaftar = CHAT_F.read_text().strip() if CHAT_F.exists() else ""
    print("bot:", api("getMe")["result"].get("username"))
    upd = api("getUpdates", offset=offset, timeout=0)["result"]
    print("update baru:", len(upd))
    pesan = []
    for u in upd:
        offset = u["update_id"] + 1
        msg = u.get("message") or {}
        chat = str(msg.get("chat", {}).get("id", ""))
        teks = msg.get("text") or (ambil_dokumen(msg["document"]) if msg.get("document") else None) or ""
        if not chat or not teks:
            continue
        if not terdaftar and teks.strip().startswith("/start"):
            terdaftar = chat
            CHAT_F.write_text(chat + "\n")
            balas(chat, "Chat ini sekarang terdaftar sebagai pengirim setoran Kantor Ai People. Kirim blok SETORAN atau CEK ke sini.")
            continue
        if chat != terdaftar:
            balas(chat, "Bot ini khusus Kantor Ai People.")
            continue
        if pesan and not re.match(r"\s*(SETORAN|CEK|/)", teks) and msg.get("date", 0) - pesan[-1]["date"] <= 120:
            pesan[-1]["teks"] += "\n" + teks
        else:
            pesan.append({"chat": chat, "teks": teks.strip(), "date": msg.get("date", 0)})

    for p in pesan:
        t = p["teks"]
        if t.startswith("SETORAN"):
            hasil = simpan_setoran(t)
        elif t.startswith("CEK"):
            hasil = catat_cek(t)
        elif t.startswith("/status"):
            hasil = ringkas_status()
        elif t.startswith("/baru"):
            b = t.split(maxsplit=2)
            hasil = estafet_baru(b[1], b[2] if len(b) > 2 else "") if len(b) > 1 else "Pakai: /baru <id> <judul>"
        elif t.startswith("/flow"):
            b = t.split()
            hasil = pindah_estafet(b[1], "LOCK_CLAUDE_REMOTION", "Dika (Flow)") if len(b) > 1 else "Pakai: /flow <id>"
        elif t.startswith("/acc"):
            b = t.split()
            if len(b) < 2:
                hasil = "Pakai: /acc <id>"
            else:
                ps = ROOT / "ESTAFET" / nama_aman(b[1]) / "PROYEK.md"
                ok = ps.exists() and re.search(r"^Status:\s*MENUNGGU_ACC_DIKA", ps.read_text(encoding="utf-8"), re.M)
                hasil = pindah_estafet(b[1], "ACC_DIKA", "Dika") if ok else f"Estafet {b[1]} belum menunggu ACC (atau tidak ada)."
        else:
            hasil = "Pesan diabaikan. Kirim blok SETORAN atau CEK, atau perintah /status, /baru, /flow, /acc."
        print(hasil)
        balas(p["chat"], hasil)
    OFFSET_F.write_text(str(offset) + "\n")


if __name__ == "__main__":
    main()
