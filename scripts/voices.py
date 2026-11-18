#!/usr/bin/env python3
# Neural voice cast for Lumina Voice.
# British English for English playback and station IDs; Pakistani Urdu for the stories.
import asyncio
from pathlib import Path

import edge_tts

VOICES = {
    "gb-young": {
        "id": "en-GB-MaisieNeural",
        "label": "Young British",
        "gender": "female",
        "locale": "en-GB",
        "rate": "+4%",
        "pitch": "+6Hz",
    },
    "gb-male": {
        "id": "en-GB-RyanNeural",
        "label": "British male",
        "gender": "male",
        "locale": "en-GB",
        "rate": "+0%",
        "pitch": "-2Hz",
    },
    "gb-female": {
        "id": "en-GB-LibbyNeural",
        "label": "British female",
        "gender": "female",
        "locale": "en-GB",
        "rate": "+2%",
        "pitch": "+2Hz",
    },
    "pk-girl": {
        "id": "ur-PK-UzmaNeural",
        "label": "Young girl, Pakistan",
        "gender": "female",
        "locale": "ur-PK",
        "rate": "+6%",
        "pitch": "+10Hz",
    },
    "pk-male": {
        "id": "ur-PK-AsadNeural",
        "label": "Pakistani male",
        "gender": "male",
        "locale": "ur-PK",
        "rate": "+0%",
        "pitch": "-3Hz",
    },
    "pk-female": {
        "id": "ur-PK-UzmaNeural",
        "label": "Pakistani female",
        "gender": "female",
        "locale": "ur-PK",
        "rate": "+1%",
        "pitch": "+1Hz",
    },
}

ENGLISH_VOICE = {
    "pk-girl": "gb-young",
    "pk-male": "gb-male",
    "pk-female": "gb-female",
    "gb-young": "gb-young",
    "gb-male": "gb-male",
    "gb-female": "gb-female",
}


async def _speak(text, voice_key, dest: Path):
    v = VOICES[voice_key]
    comm = edge_tts.Communicate(text, v["id"], rate=v["rate"], pitch=v["pitch"])
    await comm.save(str(dest))


def speak(text, voice_key, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    asyncio.run(_speak(text, voice_key, dest))


async def _speak_many(jobs):
    for text, voice_key, dest in jobs:
        dest.parent.mkdir(parents=True, exist_ok=True)
        await _speak(text, voice_key, dest)
        print(f"  tts {voice_key:10} {dest.name}")


def speak_many(jobs):
    asyncio.run(_speak_many(jobs))


def english_voice(voice_key):
    return ENGLISH_VOICE.get(voice_key, "gb-female")
