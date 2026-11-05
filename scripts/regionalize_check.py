"""Regionalize one country into its NUTS2 regions and report the checks, time and memory.

    python3 scripts/regionalize_check.py <dataset folder> <year> <CC> <proxy folder> <proxy year> [--no-invert]

Example (Ireland, 2023 matrices, 2019 proxies):
    python3 scripts/regionalize_check.py ~/Documents/datasets/ramascene-exiobase-3.11.2 2023 IE \
        ~/Documents/datasets/nuts2-proxies 2019
CC is the Eurostat country code (EL for Greece, UK is not available). Nothing is written.
"""
import json
import os
import resource
import sys
import time
from pathlib import Path

import numpy as np

import importlib.util  # noqa: E402


def _load(name):
    """Import ramascene/<name>.py without the Django package __init__ (these modules need only numpy)."""
    path = Path(__file__).resolve().parent.parent / "ramascene" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


px, rg = _load("nuts2_proxies"), _load("regionalize")


def mem():
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return peak / (1024 ** 3 if sys.platform == "linux" else 1024 ** 3) if sys.platform != "linux" else peak / 1024 ** 2


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    root, year, cc, proxies, pyear = Path(args[0]).expanduser(), args[1], args[2], Path(args[3]).expanduser(), args[4]
    invert = "--no-invert" not in sys.argv
    meta = json.load(open(root / "dataset_v5.json"))
    regions = meta["regions"]
    country = regions.index(px.exiobase_code(cc))
    n = len(meta["industries"])
    t0 = time.time()
    codes, income, employment, info = px.load(proxies, cc, pyear)
    print(f"{cc} ({regions[country]}): {len(codes)} regions, proxies {pyear}: {info}")
    d = root / year
    A = np.load(d / "A_v5.npy", mmap_mode="r")
    L = np.load(d / "L_v5.npy", mmap_mode="r")
    Y7 = np.load(d / "Y7_v5.npy", mmap_mode="r")
    B = np.load(d / "B_v5.npy")
    x = np.asarray(L @ np.asarray(Y7).sum(axis=1))
    s, slq, c = rg.shares_from_proxies(employment, income)
    print(f"income shares {np.round(c, 3).tolist()}")
    print(f"industries without employment data: {int((employment.sum(0) == 0).sum())} of {n}")
    t1 = time.time()
    R = rg.regionalize(np.asarray(A), np.asarray(Y7), x, country, (s, slq, c), n)
    print(f"regionalized in {time.time() - t1:.1f} s, table {R.A.shape[0]} x {R.A.shape[0]}, peak memory {mem():.1f} GB")
    Nw, K = len(R.world), R.n_regions
    ci = slice(country * n, (country + 1) * n)
    xr = R.x[Nw:].reshape(K, n).sum(axis=0)
    print(f"output of the regions vs nation: max relative gap {np.max(np.abs(xr - x[ci]) / np.maximum(x[ci], 1e-9)):.2e}")
    va = R.value_added()
    vao = x - (np.asarray(A) * x[None, :]).sum(axis=0)
    neg = va[Nw:] < -1e-9 * np.maximum(R.x[Nw:], 1)
    print(f"value added: regions {va[Nw:].sum():.4g}, nation {vao[ci].sum():.4g}; "
          f"negative in {int(neg.sum())} of {K * n} region-industries")
    print(f"share of national output in regions with negative value added: "
          f"{R.x[Nw:][neg].sum() / R.x[Nw:].sum():.3%}")
    if invert:
        t2 = time.time()
        Ln = np.linalg.inv(np.eye(R.A.shape[0]) - R.A)
        print(f"inverted in {time.time() - t2:.1f} s, peak memory {mem():.1f} GB")
        print(f"balance L'Y' vs x': {np.abs(Ln @ R.Y7.sum(axis=1) - R.x).max() / R.x.max():.2e}")
        Bn = rg.expand_extensions(B, country, K, n)
        yn = R.Y7.reshape(R.Y7.shape[0], -1, 7).sum(axis=2)
        y0 = np.asarray(Y7).reshape(Y7.shape[0], -1, 7).sum(axis=2)
        f1 = Bn @ Ln @ yn.sum(axis=1)
        f0 = B @ np.asarray(L @ y0.sum(axis=1))
        print(f"global footprints before/after, worst relative gap {np.max(np.abs(f1 - f0) / np.maximum(np.abs(f0), 1e-12)):.2e}")
        # footprint of final demand of the country (all regions) before and after
        fc0 = B @ (np.asarray(L) @ y0[:, country])
        fc1 = Bn @ Ln @ yn[:, len(regions) - 1:].sum(axis=1)
        names = [r["name"] for r in meta["indicators"]]
        g = names.index("GHG emissions: Total")
        print(f"{names[g]}: footprint of {cc} final demand {fc0[g]:.4g} (national) vs {fc1[g]:.4g} (sum of regions)")
        for k, code in enumerate(codes):
            col = len(regions) - 1 + k
            print(f"  {code}: {(Bn[g] @ Ln @ yn[:, col]):.4g}")
    print(f"total {time.time() - t0:.1f} s")


if __name__ == "__main__":
    main()
