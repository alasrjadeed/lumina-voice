#!/usr/bin/env python3
# Generates original, fictional Urdu advertising spots for Lumina Voice.
# No real brands or copyrighted material are used. Each spot is emitted in the same
# three delivery variants as the programme audio so the player can negotiate a codec.
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voices import speak

OUT = Path("/workspace/public/audio")
OUT.mkdir(parents=True, exist_ok=True)
TMP = Path("/tmp/lumina-ad-wav")
TMP.mkdir(parents=True, exist_ok=True)

SPOTS = [
    {
        "id": "ad-chai-khana",
        "voice": "pk-female",
        "kbps": 32,
        "text": (
            "چائے خانہ۔ پرانی کراچی کی گلیوں سے — کڑک چائے، اور گرما گرم سموسے۔ "
            "شام کو دوستوں کے ساتھ بیٹھیں۔ باتوں کا ذائقہ بڑھائیں۔ "
            "چائے خانہ… جہاں ہر کپ میں ایک کہانی ہے۔ آج ہی تشریف لائیں۔"
        ),
    },
    {
        "id": "ad-noor-mobile",
        "voice": "pk-male",
        "kbps": 32,
        "text": (
            "نور موبائل۔ نئے اور پرانے فونز — سستی قیمت، پکی وارنٹی۔ "
            "پرانا دے کر نیا لے جائیں۔ نور موبائل، آپ کے شہر میں۔"
        ),
    },
    {
        "id": "ad-roshni-solar",
        "voice": "pk-female",
            "intro": {"voice": "gb-female", "text": "Roshni Solar. Cut the bill in half. Clean power, for the home."},
        "kbps": 32,
        "text": (
            "روشنی سولر۔ بجلی کے بل کو الوداع کہیے۔ "
            "گھر اور دکان کے لیے سولر سسٹم — ماہرین کی نگرانی میں۔ "
            "اگلا بل آدھا کیجیے… روشنی سولر کے ساتھ۔"
        ),
    },
    {
        "id": "ad-kaghaz-books",
        "voice": "pk-girl",
        "kbps": 32,
        "text": (
            "کاغذ کتاب گھر۔ اردو ادب، تاریخ، اور ناولوں کا بڑا ذخیرہ۔ "
            "ہر کتاب پر خصوصی رعایت۔ کاغذ کتاب گھر… پڑھنے والوں کا گھر۔"
        ),
    },
    {
        "id": "ad-bazaar-fresh",
        "voice": "pk-male",
        "kbps": 32,
        "text": (
            "بازار فریش۔ تازہ سبزی، خالص پھل — سیدھا کھیت سے آپ کے گھر۔ "
            "صبح آٹھ بجے تک آرڈر کیجیے، اسی دن ڈیلیوری۔ بازار فریش… تازگی کا وعدہ۔"
        ),
    },
    {
        "id": "ad-sehat-line",
        "voice": "pk-female",
        "kbps": 32,
        "text": (
            "صحت لائن۔ ہیلپ لائن، چوبیس گھنٹے، مفت طبی مشورہ۔ "
            "بخار ہو، کھانسی ہو، یا کوئی اور تشویش — ماہر ڈاکٹر سے بات کیجیے۔ "
            "صحت لائن۔ صحت پہلے… ہر وقت۔"
        ),
    },
    {
        "id": "ad-safeer-travels",
        "voice": "pk-male",
        "intro": {"voice": "gb-male", "text": "Safeer Travels. Three coaches a week. Sit back. Arrive on time."},
        "kbps": 32,
        "text": (
            "سفیر ٹریولز۔ ہفتے میں تین بسوں — ہر بڑے شہر کے لیے۔ "
            "آرام دہ سیٹیں، پیشہ ور ڈرائیور، اور وقت کی پابندی۔ "
            "سفیر ٹریولز… سفر کو آرام دہ بنائیے۔"
        ),
    },
    {
        "id": "ad-lumina-plus",
        "voice": "pk-girl",
        "intro": {"voice": "gb-young", "text": "Lumina Plus. Every story, no ads, yours to keep. Close your eyes. The story begins."},
        "kbps": 40,
        "text": (
            "لومینا پلس۔ بغیر اشتہار، ڈاؤن لوڈ کے قابل، اور پوری کہانی تک رسائی۔ "
            "رات کے مسافر سے شہرِ خواب تک — سب کچھ ایک جگہ۔ "
            "لومینا پلس اپ گریڈ کیجیے… اور کہانی بغیر رکاوٹ سنیے۔"
        ),
    },
]


def encode_opus(wav, out, bitrate, application):
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav), "-ac", "1", "-ar", "24000",
         "-c:a", "libopus", "-b:a", bitrate, "-vbr", "on",
         "-application", application, "-compression_level", "10", "-frame_duration", "40", str(out)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def encode_aac(wav, out, bitrate):
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav), "-ac", "1", "-ar", "24000",
         "-c:a", "aac", "-profile:a", "aac_low", "-b:a", bitrate, "-movflags", "+faststart", str(out)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def tts_to_wav(text, voice_key, dest):
    mp3 = dest.with_suffix(".mp3")
    speak(text, voice_key, mp3)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(mp3), "-ac", "1", "-ar", "24000", str(dest)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def encode(spot):
    wav = TMP / f"{spot['id']}.wav"
    opus = OUT / f"{spot['id']}.opus"
    opus_lo = OUT / f"{spot['id']}.lo.opus"
    aac = OUT / f"{spot['id']}.m4a"
    parts = []
    intro = spot.get("intro")
    if intro:
        intro_wav = TMP / f"{spot['id']}-intro.wav"
        tts_to_wav(intro["text"], intro["voice"], intro_wav)
        parts.append(intro_wav)
    body = TMP / f"{spot['id']}-body.wav"
    tts_to_wav(spot["text"], spot.get("voice", "pk-female"), body)
    parts.append(body)
    if len(parts) == 1:
        wav = parts[0]
    else:
        concat = TMP / f"{spot['id']}-concat.txt"
        concat.write_text("".join(f"file '{p}'\n" for p in parts))
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-ac", "1", "-ar", "24000", str(wav)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    bitrate = f"{spot['kbps']}k"
    encode_opus(wav, opus, bitrate, "voip")
    encode_opus(wav, opus_lo, "24k", "voip")
    encode_aac(wav, aac, f"{max(32, int(spot['kbps']) + 8)}k")
    print(f"{spot['id']} voice={spot.get('voice')} intro={(intro or {}).get('voice', '-')}: opus {opus.stat().st_size} B · lo {opus_lo.stat().st_size} B · m4a {aac.stat().st_size} B")


def main():
    for spot in SPOTS:
        encode(spot)
    print("ad spots:", len(SPOTS))


if __name__ == "__main__":
    main()
