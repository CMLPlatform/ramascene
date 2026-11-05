"""Read the NUTS2 proxy files (Eurostat income and employment) and turn them into regionalization inputs.

Files, as written by scripts/download_nuts2_proxies.py or found in the CircuMAT Zenodo record:
    <folder>/Income/<year>_income_<CC>_<Country>_B5N_MIO_EUR_BAL.csv       region code, value, unit (no header)
    <folder>/Employment_By_Sector/<year>_SBS_<CC>_<Country>_V16110.csv     header of NACE codes, one row per region
The CircuMAT record keeps the files of Spain and France directly in one folder; both layouts are found.
"""
import csv
import json
from pathlib import Path

import numpy as np

DATA = Path(__file__).resolve().parent.parent / "python_ini" / "data"
EXIOBASE_CODE = {"EL": "GR", "UK": "GB"}      # Eurostat code -> EXIOBASE region code


def exiobase_code(eurostat_cc):
    return EXIOBASE_CODE.get(eurostat_cc, eurostat_cc)


def nuts2_regions(cc, name=None):
    """(country name, [NUTS2 codes]) from python_ini/data/nuts2_map.json for a Eurostat country code."""
    data = json.load(open(DATA / "nuts2_map.json"))
    for key, entries in data.items():
        k_cc, k_name = key.split("_", 1)
        if k_cc == cc:
            return k_name, [e["code"] if isinstance(e, dict) else e for e in entries]
    raise KeyError(cc)


def _find(folder, sub, pattern):
    folder = Path(folder)
    for candidate in (folder / sub, folder):
        hits = sorted(candidate.glob(pattern))
        if hits:
            return hits[0]
    raise FileNotFoundError(f"{folder}/{sub}/{pattern}")


def concordance():
    """W (n_nace x 163) and the list of NACE codes: share of a NACE row's employment going to each industry."""
    rows = list(csv.DictReader(open(DATA / "nace_to_industries.csv")))
    nace = sorted({r["nace"] for r in rows})
    W = np.zeros((len(nace), 163))
    for r in rows:
        W[nace.index(r["nace"]), int(r["industry"]) - 1] = float(r["weight"])
    return W, nace


def load(folder, cc, year, codes=None):
    """Returns (codes, income (K,), employment (K, 163), info)."""
    name, default_codes = nuts2_regions(cc)
    codes = codes or default_codes
    inc_file = _find(folder, "Income", f"{year}_income_{cc}_*")
    emp_file = _find(folder, "Employment_By_Sector", f"{year}_SBS_{cc}_*")
    income = {}
    for line in open(inc_file):
        parts = line.rstrip("\n").split("\t")
        if len(parts) >= 2 and parts[0] in codes:
            income[parts[0]] = float(parts[1])
    with open(emp_file) as fh:
        header = [h.strip() for h in fh.readline().rstrip("\n").split("\t")]
        emp = {}
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if parts[0].strip() in codes:
                emp[parts[0].strip()] = {n: float(v) if v not in ("", ":") else 0.0
                                         for n, v in zip(header[1:], parts[1:])}
    missing_income = [c for c in codes if c not in income]
    missing_emp = [c for c in codes if c not in emp]
    if missing_income:
        raise ValueError(f"{cc}: no income for {missing_income}")
    W, nace = concordance()
    nace_emp = np.zeros((len(codes), len(nace)))
    for k, code in enumerate(codes):
        for j, n in enumerate(nace):
            nace_emp[k, j] = emp.get(code, {}).get(n, 0.0)
    employment = nace_emp @ W
    info = {"income_file": inc_file.name, "employment_file": emp_file.name, "regions_without_employment": missing_emp,
            "nace_columns_missing": [n for n in nace if n not in header]}
    return codes, np.array([income[c] for c in codes]), employment, info
