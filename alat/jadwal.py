#!/usr/bin/env python3
"""Jadwal konten (Konten OS): satu baris = satu konten untuk satu platform, dari ide sampai dievaluasi.
Hanya pustaka standar Python. Perintah: lihat `python3 alat/jadwal.py bantuan`.
Sumber tunggal: JADWAL/jadwal.csv. Tahap produksi dibaca langsung dari ESTAFET/<id>/PROYEK.md.
Aturan emas: tidak ada yang tayang otomatis; DIPOSTING hanya oleh Dika; angka hasil tidak boleh dikarang."""
import csv, datetime, json, os, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
J = ROOT / "JADWAL"; CSV = J / "jadwal.csv"; LOG = J / "log.csv"
KOLOM = ["id", "estafet", "akun", "platform", "format", "judul", "tanggal", "jam", "status_post", "acc_dika",
         "file_drive", "url_posting", "diposting_oleh", "views", "likes", "saves", "shares", "dievaluasi", "catatan", "diubah"]
AKUN = ["pribadi", "heyaipeople", "catatanakademik"]
PLATFORM = ["instagram", "tiktok", "youtube", "facebook", "blog", "web"]
FORMAT = ["reels", "shorts", "carousel", "feed", "story", "video-panjang", "artikel"]
STATUS_POST = ["IDE", "SIAP_JADWAL", "TERJADWAL", "DIPOSTING", "DIEVALUASI"]
# tahap produksi dari ESTAFET (urutan tangga)
TAHAP_ESTAFET = {"LOCK_GEMINI": "BRIEF", "LOCK_GPT": "NASKAH", "LOCK_FLOW": "KLIP", "LOCK_CLAUDE_REMOTION": "RAKIT",
                 "READY_FOR_AUDIT": "AUDIT", "MENUNGGU_ACC_DIKA": "ACC"}
TANGGA = ["IDE", "BRIEF", "NASKAH", "KLIP", "RAKIT", "AUDIT", "ACC", "SIAP_JADWAL", "TERJADWAL", "DIPOSTING", "DIEVALUASI"]
PEMEGANG = {"IDE": "AI mana pun", "BRIEF": "Gemini", "NASKAH": "GPT", "KLIP": "Dika (Flow)", "RAKIT": "Claude", "AUDIT": "Claude",
            "ACC": "Dika", "SIAP_JADWAL": "AI mana pun", "TERJADWAL": "Dika", "DIPOSTING": "Dika", "DIEVALUASI": "Claude/Gemini"}
METRIK = ["views", "likes", "saves", "shares"]
WIB = datetime.timezone(datetime.timedelta(hours=7))


def sekarang():
    return datetime.datetime.now(WIB)


def baca():
    if not CSV.exists():
        return []
    with CSV.open(encoding="utf-8", newline="") as f:
        return [{k: (r.get(k) or "").strip() for k in KOLOM} for r in csv.DictReader(f)]


def tulis(rows):
    J.mkdir(exist_ok=True)
    with CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=KOLOM, lineterminator="\n"); w.writeheader(); w.writerows(rows)


def catat(oleh, id_, aksi, detail=""):
    baru = not LOG.exists()
    with LOG.open("a", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        if baru:
            w.writerow(["waktu", "oleh", "id", "aksi", "detail"])
        w.writerow([sekarang().strftime("%Y-%m-%d %H:%M"), oleh, id_, aksi, detail])


def status_estafet(eid):
    if not eid:
        return ""
    p = ROOT / "ESTAFET" / eid / "PROYEK.md"
    if not p.exists():
        return "?"
    m = re.search(r"^Status:\s*(\S+)", p.read_text(encoding="utf-8", errors="replace"), re.M)
    return m.group(1) if m else "?"


def tahap(r):
    """Tahap tampilan: selama ESTAFET belum selesai, tahap produksinya yang berlaku; sesudahnya status_post."""
    st = status_estafet(r["estafet"])
    if st in TAHAP_ESTAFET and r["status_post"] in ("", "IDE", "SIAP_JADWAL"):
        return TAHAP_ESTAFET[st]
    return r["status_post"] or "IDE"


def waktu_jadwal(r):
    try:
        return datetime.datetime.strptime(r["tanggal"] + " " + (r["jam"] or "00:00"), "%Y-%m-%d %H:%M").replace(tzinfo=WIB)
    except ValueError:
        return None


def telat(r):
    """Terlambat: tanggal/jam target sudah lewat tetapi belum DIPOSTING (apa pun tahap produksinya)."""
    if r["status_post"] in ("DIPOSTING", "DIEVALUASI") or not r["tanggal"]:
        return False
    w = waktu_jadwal(r)
    if not w:
        return False
    return w < sekarang() if r["jam"] else w.date() < sekarang().date()


def validasi(rows):
    err, ids = [], set()
    for i, r in enumerate(rows, 2):
        n = f"baris {i} ({r['id'] or 'tanpa id'})"
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,60}", r["id"]):
            err.append(f"{n}: id harus huruf kecil, angka, tanda hubung")
        if r["id"] in ids:
            err.append(f"{n}: id dobel")
        ids.add(r["id"])
        for kol, ok in (("akun", AKUN), ("platform", PLATFORM), ("format", FORMAT)):
            if r[kol] and r[kol] not in ok:
                err.append(f"{n}: {kol} '{r[kol]}' tidak dikenal ({'/'.join(ok)})")
        if r["status_post"] not in STATUS_POST:
            err.append(f"{n}: status_post '{r['status_post']}' tidak valid ({'/'.join(STATUS_POST)})")
        if not r["judul"]:
            err.append(f"{n}: judul kosong")
        if r["estafet"] and not (ROOT / "ESTAFET" / r["estafet"] / "PROYEK.md").exists():
            err.append(f"{n}: ESTAFET/{r['estafet']}/PROYEK.md tidak ada")
        if r["tanggal"] and not waktu_jadwal(r):
            err.append(f"{n}: tanggal/jam salah format (YYYY-MM-DD, HH:MM)")
        s = r["status_post"]
        if s in ("TERJADWAL", "DIPOSTING", "DIEVALUASI"):
            if not (r["akun"] and r["platform"] and r["format"]):
                err.append(f"{n}: {s} wajib punya akun, platform, format")
            if r["acc_dika"] != "ya":
                err.append(f"{n}: {s} wajib acc_dika=ya (belum di-ACC Dika)")
            if not r["tanggal"] or not r["jam"]:
                err.append(f"{n}: {s} wajib tanggal dan jam")
        if s == "TERJADWAL" and r["estafet"] and status_estafet(r["estafet"]) not in ("ACC_DIKA", "COMPLETED"):
            err.append(f"{n}: estafet {r['estafet']} belum ACC_DIKA/COMPLETED")
        if s in ("DIPOSTING", "DIEVALUASI"):
            if r["diposting_oleh"] != "dika":
                err.append(f"{n}: {s} hanya sah kalau diposting_oleh=dika (tidak ada posting otomatis)")
            if not r["url_posting"]:
                err.append(f"{n}: {s} wajib url_posting")
        if s == "DIEVALUASI":
            if not any(r[m] for m in METRIK) or not r["dievaluasi"]:
                err.append(f"{n}: DIEVALUASI wajib minimal satu angka hasil dan tanggal dievaluasi (jangan dikarang)")
        for m in METRIK:
            if r[m] and not r[m].isdigit():
                err.append(f"{n}: {m} harus angka asli")
    return err


def kunci_urut(r):
    return (r["tanggal"] or "9999", r["jam"] or "99", r["id"])


def bangun():
    rows = sorted(baca(), key=kunci_urut)
    data = []
    for r in rows:
        d = dict(r); d["tahap"] = tahap(r); d["pemegang"] = PEMEGANG[d["tahap"]]; d["telat"] = telat(r)
        d["estafet_status"] = status_estafet(r["estafet"]); data.append(d)
    out = {"dibuat": sekarang().strftime("%Y-%m-%d %H:%M WIB"), "tangga": TANGGA, "pemegang": PEMEGANG, "rows": data}
    (J / "dasbor").mkdir(parents=True, exist_ok=True)
    (J / "dasbor" / "data.js").write_text("window.JADWAL=" + json.dumps(out, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    (J / "jadwal.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    # PAPAN.md
    L = [f"# Papan jadwal konten\n", f"Diperbarui otomatis {out['dibuat']}. Jangan diedit tangan: ubah JADWAL/jadwal.csv lalu jalankan `python3 alat/jadwal.py bangun`.\n"]
    tl = [d for d in data if d["telat"]]
    if tl:
        L.append("## Terlambat (tanggal target lewat, belum diposting)")
        L += [f"- `{d['id']}` · {d['akun']}/{d['platform']} · {d['tanggal']} {d['jam']} · {d['judul']}" for d in tl]
        L.append("")
    L.append("## Per tahap")
    for t in TANGGA:
        xs = [d for d in data if d["tahap"] == t]
        L.append(f"### {t} · {PEMEGANG[t]} ({len(xs)})")
        L += ([f"- `{d['id']}` · {d['akun'] or '?'}/{d['platform'] or '?'}/{d['format'] or '?'} · {d['tanggal'] or 'tanpa tanggal'} · {d['judul']}" for d in xs] or ["- kosong"])
        L.append("")
    (J / "PAPAN.md").write_text("\n".join(L), encoding="utf-8")
    return len(data)


def impor_estafet():
    rows, ada = baca(), {r["estafet"] for r in baca() if r["estafet"]}
    baru = 0
    for p in sorted((ROOT / "ESTAFET").glob("*/PROYEK.md")):
        eid = p.parent.name
        if eid in ada:
            continue
        t = p.read_text(encoding="utf-8", errors="replace")
        judul = re.sub(r"^#\s*ESTAFET\s+\S+:\s*", "", t.splitlines()[0]).strip() or eid
        tgl = re.search(r"jadwal\.json`\s*j-(\d{4}-\d{2}-\d{2})", t)
        if not tgl:
            m2 = re.search(r"\(\w+ (\d{1,2}) (Nov|Des)\w*\)", judul)
            tgl_s = f"2026-{11 if m2.group(2)=='Nov' else 12}-{int(m2.group(1)):02d}" if m2 else ""
        else:
            tgl_s = tgl.group(1)
        mj = re.search(r"\b(\d{2})\.(\d{2})\b", judul)
        jam_s = f"{mj.group(1)}:{mj.group(2)}" if mj else ""
        akun = "catatanakademik" if re.search(r"catatanakademik", t, re.I) else ("heyaipeople" if re.search(r"heyaipeople", t, re.I) and "Akun" in t else "")
        fmt = "carousel" if "carousel" in eid else ("video-panjang" if "youtube" in eid else ("artikel" if "artikel" in eid else ("reels" if "bwai" in eid or "video" in eid else "")))
        plat = {"carousel": "instagram", "video-panjang": "youtube", "artikel": "blog"}.get(fmt, "")
        r = {k: "" for k in KOLOM}
        r.update(id=eid, estafet=eid, akun=akun, platform=plat, format=fmt, judul=judul, tanggal=tgl_s, jam=jam_s,
                 status_post="IDE", diubah=sekarang().strftime("%Y-%m-%d %H:%M"), catatan="diimpor dari ESTAFET; akun/platform/format diperiksa AI berikutnya")
        rows.append(r); baru += 1
    tulis(rows); return baru


def tambah(a):
    kv = dict(x.split("=", 1) for x in a if "=" in x)
    rows = baca()
    if any(r["id"] == kv.get("id") for r in rows):
        sys.exit("id sudah ada")
    r = {k: kv.get(k, "") for k in KOLOM}; r["status_post"] = r["status_post"] or "IDE"
    r["diubah"] = sekarang().strftime("%Y-%m-%d %H:%M"); rows.append(r)
    e = validasi(rows)
    if e:
        sys.exit("\n".join(e))
    tulis(rows); catat(kv.get("oleh", os.environ.get("KONTEN_OLEH", "ai")), r["id"], "tambah", r["judul"]); print("ok", r["id"])


def pindah(id_, status, a):
    kv = dict(x.split("=", 1) for x in a if "=" in x)
    rows = baca(); r = next((x for x in rows if x["id"] == id_), None)
    if not r:
        sys.exit("id tidak ditemukan")
    oleh = kv.pop("oleh", os.environ.get("KONTEN_OLEH", "ai"))
    if status == "DIPOSTING":
        kv["diposting_oleh"] = "dika" if oleh == "dika" else r["diposting_oleh"]
    for k, v in kv.items():
        if k in KOLOM and k not in ("id",):
            r[k] = v
    r["status_post"] = status; r["diubah"] = sekarang().strftime("%Y-%m-%d %H:%M")
    e = validasi(rows)
    if e:
        sys.exit("DITOLAK:\n" + "\n".join(e))
    tulis(rows); catat(oleh, id_, "pindah", status); print("ok", id_, "->", status)


def terapkan_setoran():
    """Baca baris 'Jadwal: <id> -> <STATUS> k=v ...' di SETORAN/*.md (dari GPT/Gemini lewat kurir). Idempoten."""
    sudah = LOG.read_text(encoding="utf-8") if LOG.exists() else ""
    n = 0
    for f in sorted((ROOT / "SETORAN").glob("20*.md")):
        for i, ln in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            m = re.match(r"^Jadwal:\s*(\S+)\s*->\s*(\S+)(.*)$", ln.strip())
            tag = f"setoran:{f.name}:{i}"
            if not m or tag in sudah:
                continue
            try:
                pindah(m.group(1), m.group(2), m.group(3).split() + [f"oleh=setoran"]); n += 1
                catat("setoran", m.group(1), "setoran", tag)
            except SystemExit as e:
                catat("setoran", m.group(1), "ditolak", f"{tag} {str(e)[:150]}"); print("ditolak", tag)
    print("setoran diterapkan:", n)


def daftar(a):
    kv = dict(x.split("=", 1) for x in a if "=" in x)
    for r in sorted(baca(), key=kunci_urut):
        d = tahap(r)
        if all(kv.get(k) in (None, r.get(k), d if k == "tahap" else None) for k in kv):
            print(f"{r['id']:<28} {d:<11} {r['akun'] or '?':<15} {r['platform'] or '?':<10} {r['tanggal'] or '-':<10} {r['jam'] or '-':<5} {r['judul'][:50]}")


def main():
    c = (sys.argv[1:] or ["bantuan"])[0]; a = sys.argv[2:]
    if c == "validasi":
        e = validasi(baca()); print("\n".join(e) or f"OK, {len(baca())} baris valid"); sys.exit(1 if e else 0)
    elif c == "bangun":
        e = validasi(baca())
        if e:
            print("\n".join(e)); sys.exit(1)
        print("dibangun:", bangun(), "baris")
    elif c == "impor-estafet": print("diimpor:", impor_estafet())
    elif c == "tambah": tambah(a)
    elif c == "pindah": pindah(a[0], a[1], a[2:])
    elif c == "daftar": daftar(a)
    elif c == "telat": [print(r["id"], r["tanggal"], r["jam"], r["judul"]) for r in baca() if telat(r)]
    elif c == "terapkan-setoran": terapkan_setoran()
    else:
        print(__doc__ + "\nPerintah: validasi | bangun | daftar [akun=.. platform=.. tahap=..] | telat | impor-estafet\n"
              "  tambah id=.. akun=.. platform=.. format=.. judul=.. [tanggal=.. jam=..] [oleh=..]\n"
              "  pindah <id> <STATUS> [tanggal=.. jam=.. acc_dika=ya url_posting=.. views=.. likes=.. saves=.. shares=.. dievaluasi=.. oleh=dika]\n"
              "  terapkan-setoran   (baris 'Jadwal: <id> -> <STATUS> k=v' di SETORAN/)")


if __name__ == "__main__":
    main()
