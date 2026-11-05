"""Time the matrix operations behind a RaMa-Scene analysis (no app code needed).

Usage:  python profile_l.py "/Users/<you>/Documents/datasets/ramascene 2" [year]
Needs numpy. Close other heavy programs first; L alone is 768 MB.
Run it twice: the first run reads from disk, the second shows the warm cache.
"""
import sys
import time
from pathlib import Path

import numpy as np

root = Path(sys.argv[1])
year = sys.argv[2] if len(sys.argv) > 2 else "2011"
d = root / year


def timed(label, fn):
    t = time.perf_counter()
    out = fn()
    print(f"{label:<55}{time.perf_counter() - t:8.3f} s")
    return out


rng = np.random.default_rng(0)

print(f"== {d} ==")
B = timed("load B (60 x 9800)", lambda: np.load(d / "B_v4.npy"))
Y = timed("load Y (9800 x 49)", lambda: np.load(d / "Y_v4.npy"))
Lm = timed("open L memory-mapped", lambda: np.load(d / "L_v4.npy", mmap_mode="r"))
print(f"L dtype {Lm.dtype}, shape {Lm.shape}, fortran_order {Lm.flags['F_CONTIGUOUS']}")

# A. loading
timed("load L fully into memory (what a fresh worker pays)", lambda: np.array(Lm))
L = np.array(Lm)

# B. column and row slices, memory-mapped vs in memory
for k in (1, 10, 200):
    cols = np.sort(rng.choice(L.shape[1], k, replace=False))
    timed(f"mmap  slice {k:>3} columns (cold-ish)", lambda: np.array(Lm[:, cols]))
    timed(f"RAM   slice {k:>3} columns", lambda: L[:, cols])
LT = timed("make transposed copy (columns become rows)", lambda: np.ascontiguousarray(L.T))
for k in (1, 10, 200):
    cols = np.sort(rng.choice(L.shape[1], k, replace=False))
    timed(f"RAM   slice {k:>3} columns from transposed copy", lambda: LT[cols].T)

# C. candidate precomputed arrays
M = timed("M = B @ L           (60 x 9800)", lambda: B @ L)
X = timed("X = L @ Y           (9800 x 49)", lambda: L @ Y)
timed("F = b_k * (L @ Y) for one indicator", lambda: B[0][:, None] * X)
print(f"size M {M.nbytes / 1e6:.1f} MB, X {X.nbytes / 1e6:.1f} MB, "
      f"F for 60 indicators {60 * 9800 * 49 * 8 / 1e6:.0f} MB per year")

# D. what a baseline query minimally needs: one consumed column set for one country
y = Y[:, 0]
timed("footprint of one country, all indicators: M @ y", lambda: M @ y)
timed("same without M: B @ (L @ y)", lambda: B @ (L @ y))
