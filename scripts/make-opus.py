#!/usr/bin/env python3
import argparse
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

REPO_AUDIO = Path(__file__).resolve().parent.parent / "public" / "audio"

parser = argparse.ArgumentParser(description="Render Lumina Voice tracks to Opus/AAC.")
parser.add_argument(
    "-o",
    "--out",
    default=os.environ.get("LUMINA_OUT_DIR", str(REPO_AUDIO)),
    help="Output directory for audio objects (default: <repo>/public/audio).",
)
OUT = Path(parser.parse_args().out).expanduser()
OUT.mkdir(parents=True, exist_ok=True)

from voices import english_voice, speak  # noqa: E402

TMP = Path("/tmp/lumina-wav")
TMP.mkdir(parents=True, exist_ok=True)

# Spoken scripts: Urdu for the home mix, English for listener language = English.
# Natural delivery — short clauses, breath punctuation, no stiff recitation.
TRACKS = [
    {
        "id": "raat-01",
        "voice": "pk-male",
        "intro": {
            "voice": "gb-male",
            "text": "Lumina Voice presents Raat ke Musafir. Episode one. Close your eyes. The story begins.",
        },
        "kbps": 32,
        "text": (
            "لومینا وائس پیش کرتا ہے۔ رات کے مسافر، پہلی قسط۔ "
            "کراچی کی پرانی بندرگاہ پر رات نے چراغ گل کر دیے تھے۔ "
            "ایف ڈی اے کے ایجنٹ زیب نے ایک مہر بند لفافہ کھولا۔ اندر صرف ایک جملہ تھا — "
            "آواز سنو۔ چہرہ مت دیکھو۔ "
            "سڑک پر ایک ریڈیو بج رہا تھا، اور اس کی لہجے میں ایک راز چھپا تھا۔ "
            "زیب نے کان لگایا، آنکھیں بند کیں… اور کہانی شروع ہوئی。"
        ),
        "text_en": (
            "Lumina Voice presents Raat ke Musafir. Episode one. "
            "Night had put out the lamps along Karachi’s old harbour. "
            "Agent Zeib broke a sealed envelope. Inside, a single line: "
            "Listen to the voice. Never look at the face. "
            "A radio was playing in the street, and a secret sat inside the accent. "
            "Zeib leaned in, closed his eyes… and the story began."
        ),
    },
    {
        "id": "raat-02",
        "voice": "pk-male",
        "kbps": 32,
        "text": (
            "رات کے مسافر، دوسری قسط۔ ہوٹل مریدیان کی چھت پر بارش ہو رہی تھی۔ "
            "ہر مہمان کا نام جھوٹا تھا۔ ہر کمرا ایک جال۔ "
            "زیب نے ویٹر سے اردو میں پوچھا — کون سی میز پر سچ بیٹھا ہے؟ "
            "ویٹر نے سر جھکایا اور کہا، جو میز خاموش ہے۔ "
            "خاموشی میں ایک گھڑی کی ٹک ٹک تھی… اور وہ گھڑی کسی اور شہر کی تھی。"
        ),
        "text_en": (
            "Raat ke Musafir. Episode two. Rain on the roof of Hotel Meridian. "
            "Every guest had a false name. Every room was a trap. "
            "Zeib asked the waiter, in Urdu — which table is telling the truth? "
            "The waiter bowed. The quiet table, he said. "
            "In the quiet, a clock was ticking… and that clock belonged to another city."
        ),
    },
    {
        "id": "shehr-01",
        "voice": "pk-female",
        "intro": {
            "voice": "gb-female",
            "text": "Lumina Voice. Shehr-e-Khawab. A drama in Urdu. Episode one.",
        },
        "kbps": 40,
        "text": (
            "شہرِ خواب، ڈرامہ، پہلی قسط۔ لاہور کی گلیوں میں رات کو روشنیاں ہنستی ہیں۔ "
            "نادیہ تھیٹر کی پرانی سیڑھیوں پر کھڑی تھی۔ ہاتھ میں ایک خط تھا، جو کبھی نہیں بھیجا گیا۔ "
            "پردہ اٹھا… مگر اداکار موجود نہ تھا۔ ہال میں صرف آواز گونجی — "
            "تم میری جگہ لے لو۔ "
            "نادیہ نے آنکھیں بند کیں، اور اس کی آواز نے اسٹیج کو اپنے قبضے میں لے لیا।"
        ),
        "text_en": (
            "Shehr-e-Khawab. A drama. Episode one. "
            "At night the lights laugh in the streets of Lahore. "
            "Nadia stood on the old theatre stairs, a letter in her hand that was never sent. "
            "The curtain rose. The actor was not there. Only a voice filled the hall — "
            "Take my place. "
            "Nadia closed her eyes, and her voice took the stage."
        ),
    },
    {
        "id": "shehr-02",
        "voice": "pk-female",
        "kbps": 40,
        "text": (
            "شہرِ خواب، دوسری قسط۔ وقفہ بیس منٹ کا تھا۔ تین راز، ایک خط۔ "
            "نادیہ نے پرامپٹ باکس میں جھانکا تو اپنی ہی آواز سنی — کل کی ریہرسل سے۔ "
            "کوئی اس کی یادداشت چرا رہا تھا۔ "
            "ڈرامہ اب اسٹیج پر نہیں تھا۔ وہ اس کے دل میں چل رہا تھا۔"
        ),
        "text_en": (
            "Shehr-e-Khawab. Episode two. A twenty-minute interval. Three secrets. One letter. "
            "Nadia looked into the prompt box and heard her own voice — yesterday’s rehearsal. "
            "Someone was stealing her memory. "
            "The play was no longer on the stage. It was running in her heart."
        ),
    },
    {
        "id": "bandar-01",
        "voice": "pk-male",
        "intro": {
            "voice": "gb-male",
            "text": "Bandargah ki Raat. A crime story from the Karachi docks. Episode one.",
        },
        "kbps": 32,
        "text": (
            "بندرگاہ کی رات، جرائم، پہلی قسط۔ انسپکٹر وسیم نے لہریں سنیں… اور لہروں کے ساتھ ایک لاش لوٹی۔ "
            "پیئر پر ریڈیو اب بھی چل رہا تھا۔ اردو نغمہ ادھورا۔ "
            "وسیم نے کان لگایا۔ ریڈیو نے کہا — جو ڈوبا، وہ واپس آئے گا۔ "
            "بندرگاہ نے ایک راز واپس دے دیا تھا، اور شہر نے سانس روک لی۔"
        ),
        "text_en": (
            "Bandargah ki Raat. A crime story. Episode one. "
            "Inspector Waseem heard the waves… and with the waves, a body came in. "
            "On the pier a radio was still playing — an Urdu song, unfinished. "
            "Waseem listened. The radio said: whoever went under will come back. "
            "The harbour had returned a secret. The city held its breath."
        ),
    },
    {
        "id": "bandar-02",
        "voice": "pk-male",
        "kbps": 32,
        "text": (
            "بندرگاہ کی رات، دوسری قسط۔ لالٹین والے کمرے میں ملاح بیٹھے تھے، اور سب جھوٹ بول رہے تھے۔ "
            "ایک کھڑکی کبھی اندھیری نہ ہوئی۔ وسیم نے دروازہ کھٹکھٹایا۔ "
            "اندر سے آواز آئی — داخل ہو جاؤ۔ مگر یقین مت کرنا۔ "
            "کمرے میں نمک کی بو تھی… اور ایک عورت کی خاموشی۔"
        ),
        "text_en": (
            "Bandargah ki Raat. Episode two. "
            "Sailors sat in the lantern room, and every one of them was lying. "
            "One window had never gone dark. Waseem knocked. "
            "A voice from inside: come in. But do not believe. "
            "The room smelled of salt… and of a woman’s silence."
        ),
    },
    {
        "id": "court-01",
        "voice": "pk-male",
        "intro": {
            "voice": "gb-young",
            "text": "Chandni Darbar. A comedy. Episode one. Do not take the pastry chef for a duke.",
        },
        "kbps": 24,
        "text": (
            "چاندنی دربار، مزاحیہ، پہلی قسط۔ ایک پاستری شیف کو ڈیوک سمجھ کر دربار میں بٹھا دیا گیا۔ "
            "وزیرِ اعظم کانپتے ہوئے بولے — حضور، امن ایک میٹھے پر منحصر ہے۔ "
            "شیف نے مسکرا کر کہا — امن ہمیشہ میٹھے پر منحصر رہتا ہے۔ "
            "دربار ہنسا… اور جنگ ملتوی ہو گئی।"
        ),
        "text_en": (
            "Chandni Darbar. A comedy. Episode one. "
            "They sat a pastry chef on the throne, thinking he was a duke. "
            "The prime minister trembled. Your Highness — peace depends on a pudding. "
            "The chef smiled. Peace, he said, has always depended on pudding. "
            "The court laughed… and the war was postponed."
        ),
    },
    {
        "id": "bagh-01",
        "voice": "pk-female",
        "intro": {
            "voice": "gb-female",
            "text": "Sheeshe ka Bagh. A novel. Chapter one.",
        },
        "kbps": 48,
        "text": (
            "شیشے کا باغ، ناول۔ پہلا باب۔ ایک ماہرِ نباتات کو وراثت میں ایسا گل خانہ ملا "
            "جس کے درخت ان لوگوں کو یاد رکھتے تھے جنہوں نے انہیں لگایا تھا۔ "
            "جب ہوا چلی تو پتے اردو میں سرگوشی کرتے — نام، تاریخ، اور ایک ادھوری دعا۔ "
            "اس نے آنکھیں بند کیں۔ کہانی شروع ہوئی۔"
        ),
        "text_en": (
            "Sheeshe ka Bagh. A novel. Chapter one. "
            "A botanist inherited a glasshouse whose trees remembered the people who planted them. "
            "When the wind moved, the leaves whispered in Urdu — a name, a date, and a prayer left unfinished. "
            "She closed her eyes. The story began."
        ),
    },
    {
        "id": "nazm-01",
        "voice": "pk-girl",
        "intro": {
            "voice": "gb-young",
            "text": "Lantern poems. Recited tonight by a young voice from Karachi.",
        },
        "kbps": 48,
        "text": (
            "لالٹین کی نظمیں۔ میرا سولن۔ "
            "رات نے دریا کو خط لکھا… مگر ڈاکیا چاند تھا۔ "
            "میں نے کمرے میں ایک چراغ جلایا، اور اس کی روشنی نے میرا نام پڑھ لیا۔ "
            "اے مسافر، آواز سنو۔ چہرہ مت ڈھونڈو۔ "
            "کہانی کانوں سے گزر کر دل میں اترتی ہے۔"
        ),
        "text_en": (
            "Lantern poems. Mira Solon. "
            "Night wrote a letter to the river… but the postman was the moon. "
            "I lit a lamp in the room, and the light read my name. "
            "Traveller — listen to the voice. Do not look for the face. "
            "A story passes through the ear, and settles in the heart."
        ),
    },
    {
        "id": "nazm-02",
        "voice": "pk-male",
        "kbps": 48,
        "text": (
            "بے گھڑی شہر۔ تھیو برین۔ "
            "اسٹیشن کے درمیان والا لمحہ سب سے سچا ہوتا ہے۔ "
            "ٹرین رکی نہیں۔ وقت رکا۔ "
            "چھت پر کبوتر اردو بولتے تھے، "
            "اور میں نے سنا — گھر وہ جگہ ہے جہاں آواز پہچانی جائے۔"
        ),
        "text_en": (
            "The unclocked city. Theo Breen. "
            "The truest moment is the one between stations. "
            "The train did not stop. Time did. "
            "Pigeons on the roof were speaking Urdu, "
            "and I heard it — home is the place where a voice is known."
        ),
    },
    {
        "id": "radio-live",
        "voice": "pk-female",
        "intro": {
            "voice": "gb-young",
            "text": "Lumina Voice. Sada Bahar, live. Poetry and voices, around the clock. Close your eyes. The story begins.",
        },
        "kbps": 40,
        "text": (
            "لومینا وائس۔ براہِ راست ریڈیو، سدا بہار۔ "
            "شاعری اور آوازیں، چوبیس گھنٹے۔ "
            "آپ سن رہے ہیں کراچی، لاہور، اسلام آباد، اور دنیا بھر کے اردو گھروں سے۔ "
            "آنکھیں بند کیجیے… کہانی شروع ہوتی ہے۔ "
            "آج کی پہلی نظم، رات کے مسافر… اور اس کے بعد شہرِ خواب کے اداکاروں کی گفتگو۔ "
            "لومینا وائس — جہاں آواز مرکزی کردار ہے۔"
        ),
        "text_en": (
            "Lumina Voice. Sada Bahar, live. "
            "Poetry and voices, around the clock. "
            "You are listening from Karachi, Lahore, Islamabad, and Urdu homes across the world. "
            "Close your eyes. The story begins. "
            "Tonight’s first poem, Raat ke Musafir… and then the players of Shehr-e-Khawab. "
            "Lumina Voice — where the voice is the leading part."
        ),
    },
]


def encode_opus(wav, out, bitrate, application):
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav),
            "-ac",
            "1",
            "-ar",
            "24000",
            "-c:a",
            "libopus",
            "-b:a",
            bitrate,
            "-vbr",
            "on",
            "-application",
            application,
            "-compression_level",
            "10",
            "-frame_duration",
            "40",
            str(out),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def encode_aac(wav, out, bitrate):
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav),
            "-ac",
            "1",
            "-ar",
            "24000",
            "-c:a",
            "aac",
            "-profile:a",
            "aac_low",
            "-b:a",
            bitrate,
            "-movflags",
            "+faststart",
            str(out),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def probe(path):
    return subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_name,channels,sample_rate,bit_rate",
            "-of",
            "default=noprint_wrappers=1",
            str(path),
        ],
        text=True,
    ).strip()


def tts_to_wav(text, voice_key, dest):
    mp3 = dest.with_suffix(".mp3")
    speak(text, voice_key, mp3)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(mp3), "-ac", "1", "-ar", "24000", str(dest)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def encode(track, lang="ur"):
    suffix = ".en" if lang == "en" else ""
    asset_id = f"{track['id']}{suffix}"
    wav = TMP / f"{asset_id}.wav"
    opus = OUT / f"{asset_id}.opus"
    opus_lo = OUT / f"{asset_id}.lo.opus"
    aac = OUT / f"{asset_id}.m4a"
    parts = []
    intro = None if lang == "en" else track.get("intro")
    if intro:
        intro_wav = TMP / f"{asset_id}-intro.wav"
        tts_to_wav(intro["text"], intro["voice"], intro_wav)
        parts.append(intro_wav)
    body = TMP / f"{asset_id}-body.wav"
    if lang == "en":
        voice_key = english_voice(track.get("voice", "pk-female"))
        tts_to_wav(track["text_en"], voice_key, body)
    else:
        voice_key = track.get("voice", "pk-female")
        tts_to_wav(track["text"], voice_key, body)
    parts.append(body)
    if len(parts) == 1:
        wav = parts[0]
    else:
        concat = TMP / f"{asset_id}-concat.txt"
        concat.write_text("".join(f"file '{p}'\n" for p in parts))
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat),
                "-ac",
                "1",
                "-ar",
                "24000",
                str(wav),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    bitrate = f"{track['kbps']}k"
    encode_opus(wav, opus, bitrate, "voip")
    encode_opus(wav, opus_lo, "24k", "voip")
    aac_bitrate = f"{max(32, int(track['kbps']) + 8)}k"
    encode_aac(wav, aac, aac_bitrate)
    print(f"{asset_id}  voice={voice_key} intro={intro['voice'] if intro else '-'}")
    print(f"  opus  {opus.stat().st_size:>8} B  {probe(opus).replace(chr(10), ' ')}")
    print(f"  lo    {opus_lo.stat().st_size:>8} B  {probe(opus_lo).replace(chr(10), ' ')}")
    print(f"  m4a   {aac.stat().st_size:>8} B  {probe(aac).replace(chr(10), ' ')}")


def main():
    only = os.environ.get("LUMINA_TRACK")
    lang = os.environ.get("LUMINA_LANG", "both")
    for t in TRACKS:
        if only and t["id"] != only:
            continue
        if lang in ("ur", "both"):
            encode(t, "ur")
        if lang in ("en", "both"):
            encode(t, "en")
    print("opus:", len(list(OUT.glob("*.opus"))), "aac:", len(list(OUT.glob("*.m4a"))))


if __name__ == "__main__":
    main()
