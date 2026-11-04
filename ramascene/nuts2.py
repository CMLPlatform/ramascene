"""NUTS2 regions per country, from CircuMAT (python_ini/data/circumat_regions.csv).

The file is tab separated. Level 2 rows are countries, level 3 rows are their NUTS2 regions and
point to the country through parent_id. Country names equal the EXIOBASE country names.
"""
import csv
import os
from functools import lru_cache

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         "python_ini", "data", "circumat_regions.csv")


@lru_cache(maxsize=1)
def load_nuts2():
    """Return {country name: [{"code": ..., "name": ...}, ...]}, regions in file order."""
    with open(DATA_FILE, newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    countries = {row["global_id"]: row["name"] for row in rows if row["level"] == "2"}
    regions = {name: [] for name in countries.values()}
    for row in rows:
        if row["level"] == "3":
            regions[countries[row["parent_id"]]].append({"code": row["code"], "name": row["name"]})
    return regions
