"""What the dataset on disk contains: years, now-cast years and indicators that are missing in a year.

The converter (scripts/convert_exiobase.py) writes `dataset_<version>.json` next to the year folders.
The app reads it, so a new data release needs no code change. Without the file the dataset counts as empty.
"""
import json
import os

from django.conf import settings

_cache = {}


def _path():
    return os.path.join(settings.DATASET_DIR, f"dataset_{settings.DATASET_VERSION}.json")


def info():
    path = _path()
    try:
        mtime = os.path.getmtime(path)
    except OSError:
        return {}
    hit = _cache.get(path)
    if hit and hit[0] == mtime:
        return hit[1]
    with open(path) as fh:
        data = json.load(fh)
    _cache[path] = (mtime, data)
    return data


def years():
    return [int(y) for y in info().get("years", [])]


def nowcast_years():
    return [int(y) for y in info().get("nowcast_years", [])]


def unavailable(year):
    """Names of the indicators that have no data in this year (the numbers would be zero, not real)."""
    return set(info().get("unavailable_indicators_by_year", {}).get(str(year), []))


def source():
    return info().get("source", "")
