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
                                        "unit": "MIO_EUR", "time": str(year), "geo": codes + [codes[0][:2]]})
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


# Eurostat publishes the two tables in different NUTS editions (checked with --list-codes 2019). Our region list
# (nuts2_map.json, circumat_regions.csv) is the one the map geometry uses, so the published codes are bridged to it.
EXTRA_CODES = {"HR": ["HR02", "HR05", "HR06"], "NL": ["NL35", "NL36"],
               "PT": ["PT19", "PT1A", "PT1B", "PT1C", "PT1D"]}
RENAMED = {"NL35": "NL31", "NL36": "NL33"}                      # same regions, new codes (NUTS 2024)
MERGED = {"HR04": ["HR02", "HR05", "HR06"]}                     # three NUTS 2021 regions form our HR04
PT_AML = ["PT1A", "PT1B"]                                       # = PT17
PT_REST = ["PT19", "PT1C", "PT1D"]                              # = PT16 + PT18 (borders moved in NUTS 2024)


def bridge(cc, income_data, employment_data):
    """Return the names of regions that had to be derived. Changes the dictionaries in place."""
    notes = []
    for new, old in RENAMED.items():
        if new in income_data and old not in income_data:
            income_data[old] = income_data.pop(new)
            notes.append(f"{old} income from {new}")
    for table in (income_data, employment_data or {}):
        for ours, parts in MERGED.items():
            if all(p in table for p in parts) and ours not in table:
                if table is income_data:
                    table[ours] = sum(table[p] for p in parts)
                else:
                    table[ours] = {n: sum(table[p].get(n, 0) for p in parts)
                                   for n in sorted({n for p in parts for n in table[p]})}
                if table is income_data:
                    notes.append(f"{ours} income = {' + '.join(parts)}")
    if cc == "PT" and "PT17" not in income_data and all(c in income_data for c in PT_AML + PT_REST):
        income_data["PT17"] = income_data[PT_AML[0]] + income_data[PT_AML[1]]
        rest = sum(income_data[c] for c in PT_REST)
        weight = {c: sum((employment_data or {}).get(c, {}).values()) for c in ("PT16", "PT18")}
        if sum(weight.values()) > 0:
            for c in ("PT16", "PT18"):
                income_data[c] = round(rest * weight[c] / sum(weight.values()))
            notes.append("PT17 = PT1A + PT1B; PT16 and PT18 split from PT19 + PT1C + PT1D by employment")
    return notes


def fill_income(codes, income_data, employment_data):
    """Eurostat leaves some regions out (e.g. NL31, NL33). If the country total is there, the rest is
    split over the missing regions in proportion to their employment. Returns the names of the filled regions."""
    country = codes[0][:2]
    missing = [c for c in codes if c not in income_data]
    if not missing or country not in income_data or not income_data[country] > 0:
        return []
    weight = {c: sum((employment_data or {}).get(c, {}).values()) for c in missing}
    rest = income_data[country] - sum(income_data[c] for c in codes if c in income_data)
    total = sum(weight.values())
    if rest <= 0 or total <= 0:
        return []
    for c in missing:
        income_data[c] = round(rest * weight[c] / total)
    return missing


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


def list_codes(year, output):
    """Which NUTS2 regions does each table publish, and how do they differ from nuts2_map.json?"""
    regions = json.load(open(NUTS2_MAP))
    ours = {key.split("_", 1)[0]: {e["code"] if isinstance(e, dict) else e for e in entries}
            for key, entries in regions.items()}
    income_js, _ = fetch("nama_10r_2hhinc", {"format": "JSON", "lang": "EN", "na_item": "B5N", "direct": "BAL",
                                              "unit": "MIO_EUR", "time": str(year)})
    sbs_js, _ = fetch("sbs_r_nuts06_r2", {"format": "JSON", "lang": "EN", "indic_sb": "V16110", "time": str(year)})
    published = {"income": {}, "employment": {}}
    labels = {}
    for c, _v in cells(income_js):
        published["income"].setdefault(c["geo"][:2], set()).add(c["geo"])
    for c, _v in cells(sbs_js):
        published["employment"].setdefault(c["geo"][:2], set()).add(c["geo"])
    for js in (income_js, sbs_js):
        labels.update(js["dimension"]["geo"]["category"].get("label", {}))
    report = {}
    for cc in sorted(ours):
        row = {"ours": sorted(ours[cc])}
        for table, got in published.items():
            codes = {g for g in got.get(cc, set()) if len(g) == 4}   # NUTS2 codes only
            row[table] = sorted(codes)
            row[table + "_not_in_ours"] = sorted(codes - ours[cc])
            row[table + "_ours_missing"] = sorted(ours[cc] - codes)
        report[cc] = row
        flag = "" if not any(row[t + "_not_in_ours"] or row[t + "_ours_missing"] for t in published) else "  <-- differs"
        print(f"{cc}: ours {len(ours[cc])}, income {len(row['income'])}, employment {len(row['employment'])}{flag}")
    output.mkdir(parents=True, exist_ok=True)
    with open(output / f"published_nuts2_codes_{year}.json", "w") as fh:
        json.dump({"labels": {k: v for k, v in labels.items() if len(k) == 4}, "report": report}, fh, indent=1)
    print("written", output / f"published_nuts2_codes_{year}.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("output", type=Path)
    ap.add_argument("--years", nargs="+", type=int, default=[2019])
    ap.add_argument("--countries", nargs="*", help="two-letter codes, default all countries in nuts2_map.json")
    ap.add_argument("--list-codes", type=int, metavar="YEAR",
                    help="only list the NUTS2 codes both tables publish for YEAR and compare them with nuts2_map.json")
    ap.add_argument("--dry-run", action="store_true", help="print the first request and stop")
    args = ap.parse_args()

    if args.list_codes:
        return list_codes(args.list_codes, args.output)
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
            request = codes + EXTRA_CODES.get(cc, [])
            used_inc, got_inc = with_fallback(income, year, request)
            used_emp, got_emp = with_fallback(employment, year, request)
            record = {"country": cc, "year": year, "income_year": used_inc, "employment_year": used_emp}
            derived = bridge(cc, got_inc[0], got_emp[0] if got_emp else None) if got_inc else []
            if derived:
                record["bridged"] = derived
                print(f"  {cc}: " + "; ".join(derived))
            filled = fill_income(codes, got_inc[0], got_emp[0] if got_emp else None) if got_inc else []
            if filled:
                record["income_filled_from_country_total"] = filled
            if got_inc:
                write_income(inc_path, codes, got_inc[0])
                record["income_regions"] = len(got_inc[0])
            if got_emp:
                write_employment(emp_path, codes, got_emp[1], got_emp[0])
                record["employment_regions"] = len(got_emp[0])
                record["nace_columns"] = len(got_emp[1])
            missing = [c for c in codes if not got_inc or c not in got_inc[0]] if got_inc else codes
            if filled:
                print(f"  {cc}: income for {', '.join(filled)} not published, filled from the country total")
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
