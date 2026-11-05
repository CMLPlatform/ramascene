"""Turn EXIOBASE 3.11.2 industry-by-industry archives into the matrices RaMa-Scene reads.

Usage
    python scripts/convert_exiobase.py <folder with IOT_<year>_ixi.zip> <output folder> [year ...]

Example
    python scripts/convert_exiobase.py ~/Documents/datasets/exiobase-3.11.2-download/23039074 \
        ~/Documents/datasets/ramascene-exiobase-3.11.2 2015 2016

Needs numpy and pandas. A year takes about a minute and needs ~3 GB of memory.
Years that are already converted are skipped (use --force to redo them).

Per year it writes <output>/<year>/
    A_v5.npy   technical coefficients, 7987 x 7987   (Z divided by industry output; empty industries give 0)
    L_v5.npy   Leontief inverse (I - A)^-1, 7987 x 7987
    B_v5.npy   stressor intensities per unit of output, n_indicators x 7987 (see exiobase_spec.indicator_table)
    Y_v5.npy   final demand, 7987 x 49: the seven categories of a region summed (households, NPISH,
               government, fixed capital, inventories, valuables, exports as in EXIOBASE)
    Y7_v5.npy  final demand with the seven categories kept apart, 7987 x 343 (needed for NUTS2 regionalization)
    validation.json   the checks described below
and once <output>/dataset_v5.json (labels, indicator list, GWP factors, source).

Row/column i of the 7987 x 7987 matrices is region (i // 163) and industry (i % 163), the same
order as in EXIOBASE, so the index arithmetic of the app is unchanged.

Checks (stored in validation.json, the script stops if one fails badly):
    balance      output = intermediate use + final demand, per industry
    leontief     L @ (final demand) reproduces the output
    footprints   for every indicator, the global footprint (B L y) equals the direct total (sum of F)
"""
import argparse
import hashlib
import json
import os
import sys
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import exiobase_spec as spec  # noqa: E402

GROUPS = ["air_emissions", "deforestation", "employment", "energy", "factor_inputs", "land", "material",
          "nutrients", "water"]
V = spec.DATASET_VERSION


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def read_table(zf, name, label_cols):
    """Numbers of a PyMRIO text table: three header lines, then label_cols label columns."""
    with zf.open(name) as fh:
        df = pd.read_csv(fh, sep="\t", header=None, skiprows=3, dtype={i: str for i in range(label_cols)})
    labels = df.iloc[:, :label_cols].copy()
    values = df.iloc[:, label_cols:].to_numpy(dtype=np.float64)
    return labels, values


def read_header(zf, name, line):
    with zf.open(name) as fh:
        for i, raw in enumerate(fh):
            if i == line:
                return raw.decode().rstrip("\r\n").split("\t")
    raise ValueError(name)


def find(zf, tail):
    hits = [n for n in zf.namelist() if n == tail or n.endswith("/" + tail)]
    assert len(hits) == 1, f"{tail}: {hits}"
    return hits[0]


def stressor_labels(zf):
    labels, units = {}, {}
    for g in GROUPS:
        u = pd.read_csv(zf.open(find(zf, f"{g}/unit.txt")), sep="\t")
        labels[g] = list(u.iloc[:, 0])
        for s, unit in zip(u.iloc[:, 0], u.iloc[:, 1]):
            units[(g, s)] = unit
    labels["__units__"] = units
    return labels


def reference(source):
    """Labels from the first archive that has every stressor group (the now-cast year misses some)."""
    for path in sorted(source.glob("IOT_*_ixi.zip")):
        zf = zipfile.ZipFile(path)
        names = set(zf.namelist())
        if all(f"{g}/unit.txt" in names for g in GROUPS):
            xdf = pd.read_csv(zf.open("x.txt"), sep="\t")
            return (stressor_labels(zf), list(dict.fromkeys(xdf["region"])),
                    list(dict.fromkeys(xdf["sector"])), path.name)
    raise SystemExit("no archive with all stressor groups found")


def convert_year(year, zip_path, out_root, force, labels, table):
    out = out_root / str(year)
    if (out / "validation.json").exists() and not force:
        log(f"{year}: already converted, skipping")
        return None
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    n = spec.N_REGIONS * spec.N_INDUSTRIES
    zf = zipfile.ZipFile(zip_path)

    # ---- output and labels
    xdf = pd.read_csv(zf.open(find(zf, "x.txt")), sep="\t")
    regions = list(dict.fromkeys(xdf["region"]))
    industries = list(dict.fromkeys(xdf["sector"]))
    assert len(xdf) == n and len(regions) == spec.N_REGIONS and len(industries) == spec.N_INDUSTRIES
    assert (xdf["region"].to_numpy() == np.repeat(regions, spec.N_INDUSTRIES)).all()
    assert (xdf["sector"].to_numpy() == np.tile(industries, spec.N_REGIONS)).all()
    x = xdf["indout"].to_numpy(dtype=np.float64)

    # ---- final demand
    log(f"{year}: reading Y")
    y_lab, y7 = read_table(zf, find(zf, "Y.txt"), 2)
    assert y7.shape == (n, spec.N_REGIONS * spec.N_FINAL_DEMAND), y7.shape
    head = read_header(zf, find(zf, "Y.txt"), 0)[2:]
    assert head == list(np.repeat(regions, spec.N_FINAL_DEMAND)), "Y columns are not grouped by region"
    y49 = y7.reshape(n, spec.N_REGIONS, spec.N_FINAL_DEMAND).sum(axis=2)
    y_total = y49.sum(axis=1)

    # ---- intermediate use, balance check, coefficients
    log(f"{year}: reading Z")
    z_lab, Z = read_table(zf, find(zf, "Z.txt"), 2)
    assert Z.shape == (n, n)
    balance_gap = np.abs(Z.sum(axis=1) + y_total - x)
    scale = max(float(np.abs(x).max()), 1.0)
    empty = x <= 0
    inv_x = np.zeros(n)
    inv_x[~empty] = 1.0 / x[~empty]
    np.multiply(Z, inv_x, out=Z)
    A = Z
    del Z, z_lab
    col_sum = A.sum(axis=0)
    validation = {
        "year": year,
        "balance_max_abs_gap": float(balance_gap.max()),
        "balance_max_rel_to_largest_output": float(balance_gap.max() / scale),
        "industries_with_zero_output": int(empty.sum()),
        "negative_outputs": int((x < 0).sum()),
        "columns_with_input_share_above_1": int((col_sum > 1.0).sum()),
        "largest_column_sum_of_A": float(col_sum.max()),
        "negative_coefficients": int((A < 0).sum()),
    }
    log(f"{year}: balance gap {validation['balance_max_rel_to_largest_output']:.2e}, "
        f"{validation['industries_with_zero_output']} empty industries, "
        f"max column sum {validation['largest_column_sum_of_A']:.3f}")

    # ---- Leontief inverse
    log(f"{year}: inverting {n} x {n}")
    M = -A
    M[np.diag_indices(n)] += 1.0
    L = np.linalg.inv(M)
    del M
    x_check = L @ y_total
    validation["leontief_max_abs_gap"] = float(np.abs(x_check - x).max())
    validation["leontief_max_rel_to_largest_output"] = float(np.abs(x_check - x).max() / scale)
    log(f"{year}: Leontief check {validation['leontief_max_rel_to_largest_output']:.2e}")

    # ---- stressors
    names = set(zf.namelist())
    missing = [g for g in GROUPS if f"{g}/F.txt" not in names]
    year_labels = {}
    for g in GROUPS:
        if g not in missing:
            u = pd.read_csv(zf.open(find(zf, f"{g}/unit.txt")), sep="\t")
            year_labels[g] = list(u.iloc[:, 0])
            lacking = set(labels[g]) - set(year_labels[g])
            assert not lacking, f"{g}: stressors missing in {year}: {sorted(lacking)[:3]}"
            # a year may carry extra stressors (e.g. BC, OC in 2024); rows are always looked up by name
    needed = sorted({(g, s) for row in table for g, s, _ in row["recipe"] if g != "__output__"})
    F = {}
    for g in sorted({g for g, _ in needed}):
        if g in missing:   # not in this archive: zeros, and the indicators are reported as unavailable
            F[g] = pd.DataFrame(np.zeros((len(labels[g]), n)), index=labels[g])
            continue
        f_lab, f_val = read_table(zf, find(zf, f"{g}/F.txt"), 1)
        assert f_val.shape == (len(year_labels[g]), n)
        assert list(f_lab.iloc[:, 0]) == year_labels[g], f"{g}: F rows differ from unit.txt"
        F[g] = pd.DataFrame(f_val, index=year_labels[g])
    B = np.zeros((len(table), n))
    direct = np.zeros(len(table))
    lost = np.zeros(len(table))      # signed amount that sits in industries without output
    lost_abs = np.zeros(len(table))
    for k, row in enumerate(table):
        f_row = np.zeros(n)
        for g, s, w in row["recipe"]:
            f_row += w * (x if g == "__output__" else F[g].loc[s].to_numpy())
        direct[k] = f_row.sum()
        lost[k] = f_row[empty].sum()
        lost_abs[k] = np.abs(f_row[empty]).sum()
        B[k, ~empty] = f_row[~empty] / x[~empty]
    # Stressors recorded for an industry without output cannot be turned into an intensity, so they are
    # not part of any footprint. The check below therefore compares with the direct total minus that part.
    global_fp = B @ x_check
    scale_k = np.maximum(np.abs(direct), 1e-12)
    rel = np.abs(global_fp - (direct - lost)) / scale_k
    validation["indicators"] = len(table)
    validation["missing_stressor_groups"] = missing
    validation["unavailable_indicators"] = [
        r["name"] for r in table if r["recipe"][0][0] in missing and all(g in missing for g, _, _ in r["recipe"])]
    validation["footprint_vs_direct_max_rel"] = float(rel.max())
    validation["footprint_vs_direct_worst_indicator"] = table[int(rel.argmax())]["name"]
    share = lost_abs / scale_k
    validation["unallocated_share_ghg_total"] = float(share[[r["name"] for r in table].index("GHG emissions: Total")])
    validation["indicators_with_over_0.1_percent_unallocated"] = {
        table[k]["name"]: round(float(share[k]), 4) for k in np.argsort(-share) if share[k] > 1e-3}
    log(f"{year}: footprints vs direct totals, worst {validation['footprint_vs_direct_max_rel']:.2e} "
        f"({validation['footprint_vs_direct_worst_indicator']}); GHG not allocable "
        f"{validation['unallocated_share_ghg_total']:.1e}")
    validation["global_totals_by_top_level_indicator"] = {
        r["name"]: {"unit": r["unit"], "total": float(direct[k])} for k, r in enumerate(table) if r["level"] == 1}

    # ---- write (to temporary names, then rename, so a stopped run leaves nothing half written)
    log(f"{year}: writing")
    for name, arr in (("A", A), ("L", L), ("B", B), ("Y", y49), ("Y7", y7)):
        tmp = out / f"{name}_{V}.npy.part"
        with open(tmp, "wb") as fh:
            np.save(fh, np.ascontiguousarray(arr))
        os.replace(tmp, out / f"{name}_{V}.npy")
    validation["seconds"] = round(time.time() - t0, 1)
    validation["source"] = Path(zip_path).name
    with open(out / "validation.json", "w") as fh:
        json.dump(validation, fh, indent=2)
    log(f"{year}: done in {validation['seconds']} s")
    return validation


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 22), b""):
            h.update(block)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("output", type=Path)
    ap.add_argument("years", nargs="*", type=int, default=list(range(2015, 2025)))
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    labels, regions, industries, ref_name = reference(args.source)
    table = spec.indicator_table(labels)
    log(f"labels from {ref_name}: {len(table)} indicators")
    for year in args.years:
        zip_path = args.source / f"IOT_{year}_ixi.zip"
        if not zip_path.exists():
            log(f"{year}: {zip_path} not found")
            continue
        convert_year(year, zip_path, args.output, args.force, labels, table)

    done = sorted(int(p.parent.name) for p in args.output.glob("*/validation.json"))
    unavailable = {}
    for y in done:
        u = json.load(open(args.output / str(y) / "validation.json")).get("unavailable_indicators", [])
        if u:
            unavailable[str(y)] = u
    meta = {
        "version": V,
        "source": f"EXIOBASE {spec.EXIOBASE_VERSION}, industry by industry (ixi), https://zenodo.org/records/23039074",
        "created": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "years": done,
        "nowcast_years": [y for y in spec.NOWCAST_YEARS if y in done],
        "regions": regions,
        "industries": industries,
        "gwp100": spec.GWP100,
        "gwp_note": "IPCC AR6, 100 years; HFC and PFC are delivered in kg CO2-eq; biogenic CO2 is excluded, "
                    "CH4 and N2O from biomass combustion are included.",
        "unavailable_indicators_by_year": unavailable,
        "indicators": [dict(index=i, name=r["name"], unit=r["unit"], level=r["level"], parent=r["parent"],
                            recipe=[[g, s, w] for g, s, w in r["recipe"]]) for i, r in enumerate(table)],
    }
    with open(args.output / f"dataset_{V}.json", "w") as fh:
        json.dump(meta, fh, indent=1)
    log(f"wrote dataset_{V}.json for years {done[0]}-{done[-1]}" if done else "nothing converted")


if __name__ == "__main__":
    main()
