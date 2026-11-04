"""
Scenario updates of the Leontief inverse without re-inverting the full matrix (Sherman-Morrison-Woodbury).

Background
----------
modelling.Modelling applies intermediate interventions as block scalings of the technology matrix A:

    A[np.ix_(rows, cols)] *= factor          (factor = 1 + tech_change / 100)

Interventions compose sequentially, so the total change D = A' - A is sparse. Let Rs and Cs be the
rows and columns touched by D, and Dsub = D[Rs, Cs] (k x |Cs|, with k = |Rs|). With L = (I - A)^-1:

    L' = (I - A - D)^-1 = L + L[:, Rs] (I_k - Dsub L[Cs, Rs])^-1 Dsub L[Cs, :]

Only the rows and columns of L that are touched are needed, so L' is never materialised.
"""
import numpy as np
import scipy.sparse as sp

# Above this many touched rows the correction costs more than a full inversion; the caller falls back.
MAX_WOODBURY_RANK = 2000


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
        self.Rs = np.unique(rows)
        self.Cs = np.unique(cols)
        self.k = len(self.Rs)
        if self.k > MAX_WOODBURY_RANK:
            raise ValueError(f"Woodbury rank {self.k} exceeds {MAX_WOODBURY_RANK}; use a full inversion")
        self.Dsub = np.asarray(D[self.Rs][:, self.Cs].todense())            # k x |Cs|
        self.LRs = np.asarray(L[:, self.Rs])                                  # n x k
        LCsRs = np.asarray(L[np.ix_(self.Cs, self.Rs)])                       # |Cs| x k
        self.Kinv = np.linalg.inv(np.eye(self.k) - self.Dsub @ LCsRs)        # k x k
        # correction operator G (n x |Cs|) so that L' = L + G @ L[Cs, :]
        self.G = self.LRs @ (self.Kinv @ self.Dsub)

    def __matmul__(self, M):
        LM = np.asarray(self.L @ M)
        return LM + self.G @ LM[self.Cs]

    def __getitem__(self, key):
        rows, cols = key
        if not (isinstance(rows, slice) and rows == slice(None)):
            raise IndexError("WoodburyL supports column selection only: L[:, idx]")
        Lc = np.asarray(self.L[:, cols])
        return Lc + self.G @ np.asarray(self.L[np.ix_(self.Cs, cols)])

    def to_dense(self):
        """Materialise L' (for tests and small matrices only)."""
        return np.asarray(self.L) + self.G @ np.asarray(self.L)[self.Cs]

