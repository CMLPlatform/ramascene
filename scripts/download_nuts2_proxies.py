"""Download the NUTS2 proxy data that the CircuMAT regionalization needs, from Eurostat.

It writes the same two kinds of files as the CircuMAT Zenodo record (record 15789999) for Spain and France:

  Income/<year>_income_<CC>_<Country>_B5N_MIO_EUR_BAL.csv
      tab separated, no header: NUTS2 code, value, "Million euro"
      Eurostat table nama_10r_2hhinc: na_item B5N (balance of primary incomes, net), direct BAL, unit MIO_EUR
  Employment_By_Sector/<year>_SBS_<CC>_<Country>_V16110.csv
      tab separated, first row the NACE Rev. 2 codes (sections and two-digit divisions), then one row per NUTS2
      region with the number of persons employed
      Eurostat table sbs_r_nuts06_r2: indic_sb V16110 (persons employed, number)

The table codes and variables follow the names of the CircuMAT files; check them against the data section of the
paper (Springer, doi 10.1007/s44498-026-00024-0) before you rely on the output.

Usage (on a machine that can reach ec.europa.eu):
    python3 scripts/download_nuts2_proxies.py <output folder> [--years 2019 2023] [--countries NL DE] [--dry-run]

Regional tables end earlier than the national ones. If a year has no data for a country, the script falls back to
the latest earlier year (up to 8 years back) and writes the result under the requested year. What it did is listed
in <output folder>/proxies_manifest.json. Safe to run again: finished files are skipped.
Needs only the Python standard library.
"""
import argparse
import itertools
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
NACE = re.compile(r"^[A-Z](\d{2})?$")   # sections and two-digit divisions, as in the CircuMAT files
MAX_FALLBACK = 8
HERE = Path(__file__).resolve().parent
NUTS2_MAP = HERE.parent / "python_ini" / "data" / "nuts2_map.json"


def fetch(table, params):
    query = urllib.parse.urlencode(params, doseq=True)
    url = f"{API}{table}?{query}"
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response), url


def cells(js):
    """JSON-stat 2.0 to a list of (dict of dimension -> category code, value)."""
    ids, sizes = js["id"], js["size"]
    categories = []
    for dim in ids:
        index = js["dimension"][dim]["category"]["index"]
        if isinstance(index, dict):
            order = sorted(index, key=index.get)
        else:
            order = list(index)
        categories.append(order)
    raw = js.get("value", {})
    values = raw if isinstance(raw, dict) else {str(i): v for i, v in enumerate(raw) if v is not None}
    out = []
    for position, combo in enumerate(itertools.product(*[range(s) for s in sizes])):
        value = values.get(str(position))
        if value is None:
            continue
        out.append(({dim: categories[k][combo[k]] for k, dim in enumerate(ids)}, value))
    return out


def income(codes, year):
    js, url = fetch("nama_10r_2hhinc", {"format": "JSON", "lang": "EN", "na_item": "B5N", "direct": "BAL",
                                        "unit": "MIO_EUR", "time": str(year), "geo": codes})
    return {c["geo"]: v for c, v in cells(js)}, url


def employment(codes, year):
    js, url = fetch("sbs_r_nuts06_r2", {"format": "JSON", "lang": "EN", "indic_sb": "V16110", "time": str(year),
                                        "geo": codes})
    table, nace = {}, []
    for c, v in cells(js):
        if NACE.match(c["nace_r2"]):
            table.setdefault(c["geo"], {})[c["nace_r2"]] = v
            if c["nace_r2"] not in nace:
                nace.append(c["nace_r2"])
    return table, sorted(nace), url


def write_income(path, codes, data):
    with open(path, "w") as fh:
        for code in codes:
            if code in data:
                fh.write(f"{code}\t{data[code]}\tMillion euro\n")


def write_employment(path, codes, nace, data):
    with open(path, "w") as fh:
        fh.write(" \t" + "\t".join(nace) + "\n")
        for code in codes:
            if code in data:
                fh.write(code + "\t" + "\t".join(str(data[code].get(n, 0)) for n in nace) + "\n")


def with_fallback(get, year, codes):
    """Try the requested year, then earlier years; returns (year used, result) or (None, None)."""
    for used in range(year, year - MAX_FALLBACK - 1, -1):
        try:
            result = get(codes, used)
        except urllib.error.HTTPError as error:
            if error.code in (400, 404):  # no data for that year
                continue
            raise
        if result[0]:
            return used, result
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("output", type=Path)
    ap.add_argument("--years", nargs="+", type=int, default=[2019])
    ap.add_argument("--countries", nargs="*", help="two-letter codes, default all countries in nuts2_map.json")
    ap.add_argument("--dry-run", action="store_true", help="print the first request and stop")
    args = ap.parse_args()

    regions = json.load(open(NUTS2_MAP))
    manifest, problems = [], []
    for key, entries in regions.items():
        cc, name = key.split("_", 1)
        if args.countries and cc not in args.countries:
            continue
        codes = [e["code"] if isinstance(e, dict) else e for e in entries]
        for year in args.years:
            inc_path = args.output / "Income" / f"{year}_income_{cc}_{name}_B5N_MIO_EUR_BAL.csv"
            emp_path = args.output / "Employment_By_Sector" / f"{year}_SBS_{cc}_{name}_V16110.csv"
            if inc_path.exists() and emp_path.exists():
                print(f"{cc} {year}: already there")
                continue
            if args.dry_run:
                print("would request", fetch.__name__, "nama_10r_2hhinc and sbs_r_nuts06_r2 for", cc, codes[:3], "...")
                return
            inc_path.parent.mkdir(parents=True, exist_ok=True)
            emp_path.parent.mkdir(parents=True, exist_ok=True)
            used_inc, got_inc = with_fallback(income, year, codes)
            used_emp, got_emp = with_fallback(employment, year, codes)
            record = {"country": cc, "year": year, "income_year": used_inc, "employment_year": used_emp}
            if got_inc:
                write_income(inc_path, codes, got_inc[0])
                record["income_regions"] = len(got_inc[0])
            if got_emp:
                write_employment(emp_path, codes, got_emp[1], got_emp[0])
                record["employment_regions"] = len(got_emp[0])
                record["nace_columns"] = len(got_emp[1])
            missing = [c for c in codes if not got_inc or c not in got_inc[0]] if got_inc else codes
            if not got_inc or not got_emp or missing:
                problems.append(f"{cc} {year}: income {used_inc}, employment {used_emp}, "
                                f"regions without income {len(missing)} of {len(codes)}")
            print(f"{cc} {year}: income {used_inc}, employment {used_emp}")
            manifest.append(record)
            time.sleep(0.5)
    args.output.mkdir(parents=True, exist_ok=True)
    with open(args.output / "proxies_manifest.json", "w") as fh:
        json.dump(manifest, fh, indent=1)
    if problems:
        print("\nCheck these:")
        print("\n".join("  " + p for p in problems))


if __name__ == "__main__":
    sys.exit(main())
