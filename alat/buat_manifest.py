"""Susun project_manifest.json untuk komposisi EstafetVideo.

Pakai: python3 alat/buat_manifest.py <id> <folder-klip> [--audio narasi.mp3]
- Tabel SCENE diambil dari setoran GPT terbaru untuk estafet <id> (baris "Estafet: <id> -> LOCK_FLOW")
  atau dari ESTAFET/<id>/SCENE.md kalau ada.
- <folder-klip> berisi scene_01.mp4, scene_02.mp4, ... (unduhan Flow dari Drive). Manifest ditulis ke folder itu.
- Di repo kang-catat-plus, salin folder klip ke public/estafet/<id>/ sebelum render.
Keluar dengan kode 1 kalau ada scene tanpa klip atau klip tanpa scene.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def tabel_scene(teks):
    bagian = teks.split("## SCENE", 1)
    if len(bagian) < 2:
        return []
    baris = [b.strip() for b in bagian[1].splitlines() if b.strip().startswith("|")]
    if len(baris) < 3:
        return []
    kolom = [k.strip().lower() for k in baris[0].strip("|").split("|")]
    hasil = []
    for b in baris[2:]:
        sel = [k.strip() for k in b.strip("|").split("|")]
        if len(sel) != len(kolom):
            continue
        d = dict(zip(kolom, sel))
        hasil.append({"no": int(d["no"]), "durasi": float(d["durasi"]), "teks_overlay": d.get("teks_overlay", ""),
                      "narasi": d.get("narasi", "")})
    return hasil


def cari_sumber(id_):
    scene_md = ROOT / "ESTAFET" / id_ / "SCENE.md"
    if scene_md.exists():
        return scene_md
    kandidat = [p for p in sorted((ROOT / "SETORAN").glob("20*.md"))
                if re.search(rf"^Estafet:\s*{re.escape(id_)}\s*->\s*LOCK_FLOW", p.read_text(encoding="utf-8"), re.M)]
    return kandidat[-1] if kandidat else None


def main():
    if len(sys.argv) < 3:
        print(__doc__); return 1
    id_, folder = sys.argv[1], pathlib.Path(sys.argv[2])
    audio = sys.argv[sys.argv.index("--audio") + 1] if "--audio" in sys.argv else None
    sumber = cari_sumber(id_)
    if not sumber:
        print(f"Tidak ada tabel SCENE untuk {id_} (SCENE.md atau setoran GPT ke LOCK_FLOW)."); return 1
    scenes = tabel_scene(sumber.read_text(encoding="utf-8"))
    if not scenes:
        print(f"Tabel SCENE di {sumber} kosong atau formatnya salah."); return 1
    klip = {int(m.group(1)): p.name for p in folder.glob("scene_*.mp4") if (m := re.match(r"scene_(\d+)\.mp4$", p.name))}
    tanpa_klip = [s["no"] for s in scenes if s["no"] not in klip]
    tanpa_scene = [n for n in klip if n not in {s["no"] for s in scenes}]
    for s in scenes:
        s["clip"] = f"estafet/{id_}/{klip.get(s['no'], f'scene_{s['no']:02d}.mp4')}"
    manifest = {"id": id_, "judul": id_, "fps": 30, "width": 1080, "height": 1920, "watermark": "heyaipeople.site",
                "scenes": scenes}
    if audio:
        manifest["audio"] = f"estafet/{id_}/{pathlib.Path(audio).name}"
    (folder / "project_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifest ditulis: {folder / 'project_manifest.json'} ({len(scenes)} scene, sumber {sumber.relative_to(ROOT)})")
    if tanpa_klip or tanpa_scene:
        print(f"PERINGATAN: scene tanpa klip {tanpa_klip}, klip tanpa scene {tanpa_scene}"); return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
