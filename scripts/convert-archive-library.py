#!/usr/bin/env python3
"""Convert verified Archive.org MP3s to Opus (32k + 24k mono) with AAC fallback.

Only records in src/data/archiveLibraryVerified.json that are marked verified
and carry explicit reuse rights are converted. No new dependencies: urllib and
the ffmpeg/ffprobe binaries already used by the verifier.
"""

import argparse
import datetime
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "src" / "data" / "archiveLibraryVerified.json"
REPORT = ROOT / "data" / "libraryConversionReport.json"
ALLOWED_RIGHTS = {"public-domain", "cc0", "cc-by", "cc-by-sa", "licensed"}
MAX_SOURCE_BYTES = 400 * 1024 * 1024
USER_AGENT = "LuminaVoice-library-converter/1.0"


def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode:
        detail = (result.stderr or result.stdout or "unknown error").strip().splitlines()
        raise RuntimeError(detail[-1] if detail else "command failed")
    return result.stdout.strip()


def probe_duration(path):
    value = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ])
    return round(float(value))


def download(url, destination):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    total = 0
    with urllib.request.urlopen(request, timeout=60) as response, destination.open("wb") as output:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_SOURCE_BYTES:
                raise RuntimeError("source-audio-too-large")
            output.write(chunk)
    return total


def asset_slug(record):
    asset_id = str(record.get("assetId") or "")
    slug = asset_id.rsplit("/", 1)[-1].lower()
    if not slug or not all(ch.isalnum() or ch in "-_" for ch in slug):
        raise RuntimeError("invalid-asset-id")
    return slug


def is_convertible(record):
    if record.get("playbackStatus") != "verified":
        return "playback-not-verified"
    rights = record.get("rights") or {}
    if rights.get("status") not in ALLOWED_RIGHTS:
        return f"rights-{rights.get('status', 'unknown')}"
    if not record.get("directMp3Url", "").startswith("https://archive.org/download/"):
        return "source-not-archive-org"
    return ""


def convert_record(record, out_dir, dry_run=False, force=False):
    slug = asset_slug(record)
    targets = {
        "opus": out_dir / f"{slug}.opus",
        "low": out_dir / f"{slug}.lo.opus",
        "aac": out_dir / f"{slug}.m4a",
    }
    if dry_run:
        return {"status": "dry-run", "id": record["id"], "files": [p.name for p in targets.values()]}

    if not force and all(p.exists() and p.stat().st_size for p in targets.values()):
        return {"status": "cached", "id": record["id"], "files": [p.name for p in targets.values()]}

    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="lumina-archive-") as work:
        source = pathlib.Path(work) / "source.mp3"
        download(record["directMp3Url"], source)
        duration = probe_duration(source)
        expected = int(record.get("durationSeconds") or 0)
        if expected and abs(duration - expected) > max(60, expected * 0.05):
            raise RuntimeError(f"duration-mismatch:{duration}s vs {expected}s")

        run([
            "ffmpeg", "-y", "-v", "error", "-i", str(source), "-vn", "-ac", "1",
            "-c:a", "libopus", "-b:a", "32k", "-vbr", "on", str(targets["opus"]),
        ])
        run([
            "ffmpeg", "-y", "-v", "error", "-i", str(source), "-vn", "-ac", "1",
            "-c:a", "libopus", "-b:a", "24k", "-vbr", "on", str(targets["low"]),
        ])
        run([
            "ffmpeg", "-y", "-v", "error", "-i", str(source), "-vn", "-ac", "1",
            "-c:a", "aac", "-b:a", "48k", str(targets["aac"]),
        ])

    for path in targets.values():
        if not path.exists() or not path.stat().st_size:
            raise RuntimeError(f"missing-output:{path.name}")
    return {
        "status": "converted",
        "id": record["id"],
        "durationSeconds": duration,
        "files": [p.name for p in targets.values()],
        "bytes": sum(p.stat().st_size for p in targets.values()),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="maximum records to convert")
    parser.add_argument("--id", action="append", default=[], help="only this record id (repeatable)")
    parser.add_argument("--out-dir", default=str(ROOT / "public" / "audio" / "archive"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true", help="reconvert files that already exist")
    args = parser.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            parser.error(f"{tool} is required but was not found on PATH")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    records = manifest.get("records", [])
    ids = set(args.id)
    if ids:
        records = [r for r in records if r.get("id") in ids]
    if args.limit:
        records = records[: args.limit]

    out_dir = pathlib.Path(args.out_dir).resolve()
    results = []
    for record in records:
        reason = is_convertible(record)
        if reason:
            results.append({"status": "skipped", "id": record.get("id", ""), "reason": reason})
            continue
        try:
            results.append(convert_record(record, out_dir, args.dry_run, args.force))
        except Exception as error:  # noqa: BLE001 - report and continue with the next record
            results.append({"status": "error", "id": record.get("id", ""), "reason": str(error)})
        item = results[-1]
        print(f"{record.get('id', '')} {item['status']} {item.get('reason', item.get('files', ''))}")

    summary = {}
    for item in results:
        summary[item["status"]] = summary.get(item["status"], 0) + 1
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(
        json.dumps(
            {
                "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "summary": summary,
                "results": results,
            },
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(summary))
    print(f"report: {REPORT.relative_to(ROOT)}")
    return 0 if not summary.get("error") else 1


if __name__ == "__main__":
    sys.exit(main())
