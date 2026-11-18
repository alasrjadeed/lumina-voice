#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voices import VOICES, speak

OUT = Path("/workspace/public/audio")
TMP = Path("/tmp/lumina-sample-wav")
OUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)

SAMPLES = [
    ("gb-young", "Lumina Voice. Close your eyes. The story begins."),
    ("gb-male", "Lumina Voice presents. Poetry and voices, around the clock."),
    ("gb-female", "This is Lumina Voice. A drama follows. Close your eyes."),
    ("pk-girl", "لومینا وائس۔ آنکھیں بند کیجیے… کہانی شروع ہوتی ہے۔"),
    ("pk-male", "لومینا وائس پیش کرتا ہے۔ آواز سنو۔ چہرہ مت دیکھو۔"),
    ("pk-female", "لومینا وائس۔ شاعری اور آوازیں، چوبیس گھنٹے۔ آنکھیں بند کیجیے۔"),
]


def encode(voice_key, text):
    mp3 = TMP / f"sample-{voice_key}.mp3"
    wav = TMP / f"sample-{voice_key}.wav"
    speak(text, voice_key, mp3)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(mp3), "-ac", "1", "-ar", "24000", str(wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    opus = OUT / f"sample-{voice_key}.opus"
    m4a = OUT / f"sample-{voice_key}.m4a"
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(wav), "-ac", "1", "-ar", "24000",
            "-c:a", "libopus", "-b:a", "32k", "-vbr", "on", "-application", "voip",
            "-compression_level", "10", "-frame_duration", "40", str(opus),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(wav), "-ac", "1", "-ar", "24000",
            "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "40k", "-movflags", "+faststart", str(m4a),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"{voice_key}: opus {opus.stat().st_size} B  m4a {m4a.stat().st_size} B  voice={VOICES[voice_key]['id']}")


def main():
    for key, text in SAMPLES:
        encode(key, text)


if __name__ == "__main__":
    main()
