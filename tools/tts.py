"""Teks -> suara (gratis, edge-tts). Jalankan di laptop (butuh internet).
Pakai:  pip install edge-tts   lalu   python tools/tts.py src/data/uaop.json
Hasil: public/voice/1.mp3, 2.mp3, ... (urutan = urutan scene). Scene tanpa 'voice' dilewati."""
import asyncio, json, sys, os
import edge_tts

VOICE = os.environ.get("VOICE", "id-ID-ArdiNeural")  # cewek: id-ID-GadisNeural
RATE = os.environ.get("RATE", "-5%")

async def main(path):
    data = json.load(open(path, encoding="utf-8"))
    os.makedirs("public/voice", exist_ok=True)
    for i, sc in enumerate(data["scenes"], 1):
        t = (sc.get("voice") or "").strip()
        if not t:
            continue
        if len(t) > 500:
            sys.exit(f"Scene {i}: {len(t)} karakter, maksimal 500. Pendekkan.")
        await edge_tts.Communicate(t, VOICE, rate=RATE).save(f"public/voice/{i}.mp3")
        print("ok", i, len(t), "char")

asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "src/data/uaop.json"))
