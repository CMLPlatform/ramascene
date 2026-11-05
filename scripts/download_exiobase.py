"""Download the files needed for the RaMa-Scene update from Zenodo, with checksum checks.

Usage (run on a machine that can reach zenodo.org):
    python3 download_exiobase.py ~/Documents/datasets/exiobase-3.11.2-download

Gets
  - EXIOBASE 3.11.2 (record 23039074): Changelog.txt, hashes.csv, LICENSE.txt and the industry-by-industry
    (ixi) archives for 2015-2024 only (not the product-by-product ones)
  - CircuMAT regionalization (record 15789999): all seven files (135 kB)

Safe to run again: finished files are skipped, partial files are resumed.
Needs only the Python standard library.
"""
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

YEARS = range(2015, 2025)
RECORDS = {
    "23039074": lambda name: (
        name in {"Changelog.txt", "hashes.csv", "LICENSE.txt"}
        or ("ixi" in name.lower() and any(re.search(rf"(?<!\d){y}(?!\d)", name) for y in YEARS))
    ),
    "15789999": lambda name: True,
}


def get_json(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def download(url, target, size):
    have = target.stat().st_size if target.exists() else 0
    if have == size:
        return
    request = urllib.request.Request(url, headers={"Range": f"bytes={have}-"} if 0 < have < size else {})
    mode = "ab" if 0 < have < size else "wb"
    with urllib.request.urlopen(request, timeout=120) as r, open(target, mode) as out:
        done = have if mode == "ab" else 0
        while True:
            block = r.read(1 << 20)
            if not block:
                break
            out.write(block)
            done += len(block)
            print(f"\r  {target.name}: {done / 1e6:8.1f} / {size / 1e6:.1f} MB", end="", flush=True)
    print()


def main():
    root = Path(sys.argv[1]).expanduser()
    for record, wanted in RECORDS.items():
        meta = get_json(f"https://zenodo.org/api/records/{record}")
        files = [f for f in meta["files"] if wanted(f["key"])]
        folder = root / record
        folder.mkdir(parents=True, exist_ok=True)
        print(f"Record {record}: {meta['metadata']['title']} - {len(files)} files, "
              f"{sum(f['size'] for f in files) / 1e9:.2f} GB")
        for f in sorted(files, key=lambda f: f["key"]):
            target = folder / f["key"]
            url = f["links"]["self"]
            download(url, target, f["size"])
            expected = f.get("checksum", "").split(":")[-1]
            if expected and md5_of(target) != expected:
                print(f"  CHECKSUM MISMATCH for {f['key']}: delete it and run again")
            else:
                print(f"  ok {f['key']}")


if __name__ == "__main__":
    main()
