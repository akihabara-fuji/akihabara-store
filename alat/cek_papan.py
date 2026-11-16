"""Pemeriksa papan kantor: format SETORAN/LAPORAN, cek silang, kunci, dan rahasia bocor.
Jalan otomatis lewat GitHub Actions tiap push ke branch kantor, atau manual: python3 alat/cek_papan.py
Hasil ditulis ke STATUS.md. Keluar dengan kode 1 kalau ada rahasia bocor atau format rusak.
"""
import datetime, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MULAI_CEK = "2026-11-17"  # file sebelum tanggal ini dibuat sebelum aturan cek silang
WAJIB_SETORAN = ["Proyek:", "Bagan/langkah:", "Tugas:", "Hasil:", "Belum dicek:", "Status langkah:",
                 "Lanjutan berikutnya:", "Butuh dari Dika:", "Cek silang:"]
WAJIB_LAPORAN = ["SELESAI:", "BELUM:", "STATUS LANGKAH:", "PERUBAHAN ASET:", "BUTUH DARI DIKA:", "Cek silang:"]
RAHASIA = {
    "token GitHub": r"gh[pousr]_[A-Za-z0-9]{30,}",
    "kunci OpenAI/Anthropic": r"\bsk-(ant-)?[A-Za-z0-9_-]{20,}",
    "kunci Google": r"AIza[0-9A-Za-z_-]{30,}",
    "token bot Telegram": r"\b\d{8,10}:[A-Za-z0-9_-]{35}\b",
    "kunci privat": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "kata sandi tertulis": r"(?i)\b(password|kata sandi|passwd)\s*[:=]\s*\S{4,}",
}


def baca(p):
    return p.read_text(encoding="utf-8", errors="replace")


def cek_silang(teks):
    m = re.search(r"^Cek silang:\s*(.+)$", teks, re.M)
    return m.group(1).strip() if m else ""


def main():
    masalah, bocor, menunggu, gagal, lulus = [], [], [], [], []

    for p in sorted(ROOT.rglob("*.md")) + sorted(ROOT.rglob("*.json")):
        if ".git" in p.parts or p.name in ("STATUS.md", "PAKET-AI.md"):
            continue
        teks = baca(p)
        for nama, pola in RAHASIA.items():
            if re.search(pola, teks):
                bocor.append(f"`{p.relative_to(ROOT)}`: kemungkinan {nama}")

    for folder, wajib in (("SETORAN", WAJIB_SETORAN), ("LAPORAN", WAJIB_LAPORAN)):
        for p in sorted((ROOT / folder).glob("20*.md")):
            if p.name[:10] < MULAI_CEK:
                continue
            teks, rel = baca(p), f"`{folder}/{p.name}`"
            kurang = [w for w in wajib if w not in teks]
            if kurang:
                masalah.append(f"{rel}: kurang {', '.join(kurang)}")
            cs = cek_silang(teks)
            if cs.upper().startswith("MENUNGGU"):
                menunggu.append(f"{rel}: {cs}")
            elif cs.upper().startswith("GAGAL"):
                gagal.append(f"{rel}: {cs}")
            elif cs.upper().startswith("LULUS"):
                lulus.append(f"{rel}: {cs}")
            elif cs:
                masalah.append(f"{rel}: isi Cek silang harus MENUNGGU / LULUS / GAGAL, tertulis \"{cs}\"")

    kunci = [l.strip("- ").split("|")[0].strip() + " · " + re.search(r"DIPEGANG[^|]*", l).group(0).strip()
             for l in baca(ROOT / "KUNCI.md").splitlines() if "DIPEGANG" in l and l.startswith("-")]

    laporan = sorted((ROOT / "LAPORAN").glob("20*.md"))[-5:][::-1]
    setoran = sorted((ROOT / "SETORAN").glob("20*.md"))[-5:][::-1]

    def daftar(xs, kosong="tidak ada"):
        return "\n".join(f"- {x}" for x in xs) if xs else f"- {kosong}"

    jam = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime("%Y-%m-%d %H:%M WIB")
    status = f"""# STATUS papan kantor

Dibuat otomatis oleh `alat/cek_papan.py` ({jam}). Jangan diedit manual: perbaiki file sumbernya, status ini ikut berubah.
Semua AI baca file ini dulu untuk tahu apa yang menunggu dicek.

## Rahasia bocor (harus segera dihapus)
{daftar(bocor)}

## Format rusak
{daftar(masalah)}

## Menunggu cek silang
{daftar(menunggu)}

## Gagal cek silang (perlu diperbaiki pembuatnya)
{daftar(gagal)}

## Lulus cek silang (terbaru)
{daftar(lulus[-5:])}

## Kunci aset yang sedang dipegang
{daftar(kunci, "semua bebas")}

## Laporan terbaru
{daftar([f"`LAPORAN/{p.name}`" for p in laporan])}

## Setoran terbaru
{daftar([f"`SETORAN/{p.name}`" for p in setoran])}
"""
    (ROOT / "STATUS.md").write_text(status, encoding="utf-8")
    print(status)
    return 1 if (bocor or masalah) else 0


if __name__ == "__main__":
    sys.exit(main())
