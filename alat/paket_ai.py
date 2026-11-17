"""Gabungkan file inti papan jadi satu PAKET-AI.md untuk AI yang tidak bisa buka link (Gemini Gem lewat Google Docs).
Jalan otomatis di GitHub Actions setelah cek_papan.py."""
import datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
URUT = ["STATUS.md", "AI/BACA-DULU.md", "AI/PERAN.md", "ATURAN.md", "KUNCI.md", "BAGAN.md", "SETORAN/README.md", "ESTAFET/README.md", "ARTEFAK/RINGKAS.md", "PROYEK/heyaipeople/MASTER_BRAND_GUIDELINES.md", "PROYEK/heyaipeople/CONTENT_REGISTRY.md", "PROYEK/heyaipeople/DESIGN_REGISTRY.md", "PROYEK/README.md"]
jam = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime("%Y-%m-%d %H:%M WIB")
bagian = [f"# PAKET PAPAN KANTOR AI PEOPLE\n\nSalinan otomatis branch kantor ({jam}). Jangan diedit di sini: sumbernya GitHub akihabara-fuji/akihabara-store branch kantor.\nIsi: {', '.join(URUT)}, lalu HANDOFF tiap proyek.\n"]
for f in URUT:
    p = ROOT / f
    if p.exists():
        bagian.append(f"\n\n========== FILE: {f} ==========\n\n" + p.read_text(encoding="utf-8").replace("\r\n", "\n"))
for p in sorted((ROOT / "ESTAFET").glob("*/PROYEK.md")) + sorted((ROOT / "PROYEK").glob("*/HANDOFF.md")):
    bagian.append(f"\n\n========== FILE: {p.relative_to(ROOT)} ==========\n\n" + p.read_text(encoding="utf-8").replace("\r\n", "\n"))
(ROOT / "PAKET-AI.md").write_text("".join(bagian), encoding="utf-8")
print("PAKET-AI.md", sum(len(b) for b in bagian), "karakter")
