"""
Scenario updates of the Leontief inverse without re-inverting the full matrix (Sherman-Morrison-Woodbury).

Background
----------
modelling.Modelling applies intermediate interventions as block scalings of the technology matrix A:

    A[np.ix_(rows, cols)] *= factor          (factor = 1 + tech_change / 100)

Interventions compose sequentially, so the total change D = A' - A is sparse. Let Rs and Cs be the
rows and columns touched by D and Dsub = D[Rs, Cs] (nr x nc). With L = (I - A)^-1, D has rank at most
min(nr, nc), and the update can be written on either side:

    rows side (nr <= nc):  L' = L + L[:, Rs] (I_nr - Dsub L[Cs, Rs])^-1 Dsub L[Cs, :]
    columns side (nc < nr): L' = L + (L[:, Rs] Dsub) (I_nc - L[Cs, Rs] Dsub)^-1 L[Cs, :]

The two are equal (push-through identity). The smaller side is used, so a change to one sector across
all its suppliers (many rows, one column) is a rank-1 update. In both cases L' = L + U (W L[Cs, :]);
L' itself is never materialised.
"""
import numpy as np
import scipy.sparse as sp

# Above this rank (the smaller of touched rows and touched columns) the caller falls back to a full inversion
# (about 20 s and 2.3 GB). Measured on 2011 data (random blocks, 200 columns read):
#   rank  881: setup 0.4 s   rank 2640: setup 1.7 s   rank 3985: setup 4.4 s, U+W 440 MB, error 6e-15
# so up to this value the update is still several times cheaper than a full inversion. Re-measure on the server.
MAX_WOODBURY_RANK = 4000

# Rows of L read at a time when forming L[:, Rs] @ Dsub, to bound memory
_CHUNK = 1024


def block_scale(D, A, rows, cols, factor):
    """Return D updated with the scaling A[rows, cols] *= factor, applied on top of A + D.

    This matches Modelling.model_intermediates, which scales the current value of the block.
    A is read but not modified.
    """
    rows = np.unique(np.asarray(rows, dtype=np.int64))
    cols = np.unique(np.asarray(cols, dtype=np.int64))
    current = np.asarray(A[np.ix_(rows, cols)], dtype=float) + np.asarray(D[rows][:, cols].todense())
    delta = (factor - 1.0) * current
    block = sp.coo_matrix(
        (delta.ravel(), (np.repeat(rows, len(cols)), np.tile(cols, len(rows)))), shape=D.shape
    ).tocsr()
    out = (D + block).tocsr()
    out.eliminate_zeros()
    return out


class WoodburyL:
    """Leontief inverse of (I - A - D), represented through the original L and the sparse change D.

    Supports the access patterns used by analyze.py: ``L @ M`` for vectors and matrices, and
    ``L[:, idx]`` for column selections.
    """

    def __init__(self, L, D):
        D = D.tocsr()
        rows, cols = D.nonzero()
        self.L = L
        self.shape = L.shape
        n = L.shape[0]
        self.Rs = np.unique(rows)
        self.Cs = np.unique(cols)
        nr, nc = len(self.Rs), len(self.Cs)
        self.k = min(nr, nc)
        if self.k > MAX_WOODBURY_RANK:
            raise ValueError(f"Woodbury rank {self.k} exceeds {MAX_WOODBURY_RANK}; use a full inversion")
        if self.k == 0:
            self.U = np.zeros((n, 0))
            self.W = np.zeros((0, nc))
            return
        Dsub = np.asarray(D[self.Rs][:, self.Cs].todense())                   # nr x nc
        LCsRs = np.asarray(L[np.ix_(self.Cs, self.Rs)])                       # nc x nr
        if nr <= nc:
            self.U = np.asarray(L[:, self.Rs])                                # n x nr
            self.W = np.linalg.inv(np.eye(nr) - Dsub @ LCsRs) @ Dsub         # nr x nc
        else:
            U = np.empty((n, nc))
            for start in range(0, n, _CHUNK):
                block = np.asarray(L[start:start + _CHUNK])[:, self.Rs]
                U[start:start + _CHUNK] = block @ Dsub
            self.U = U                                                        # n x nc
            self.W = np.linalg.inv(np.eye(nc) - LCsRs @ Dsub)                 # nc x nc

    def __matmul__(self, M):
        LM = np.asarray(self.L @ M)
        return LM + self.U @ (self.W @ LM[self.Cs])

    def __getitem__(self, key):
        rows, cols = key
        if not (isinstance(rows, slice) and rows == slice(None)):
            raise IndexError("WoodburyL supports column selection only: L[:, idx]")
        Lc = np.asarray(self.L[:, cols])
        return Lc + self.U @ (self.W @ np.asarray(self.L[np.ix_(self.Cs, cols)]))

    def to_dense(self):
        """Materialise L' (for tests and small matrices only)."""
        Ld = np.asarray(self.L)
        return Ld + self.U @ (self.W @ Ld[self.Cs])

