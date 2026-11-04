"""
Tests for the Woodbury scenario update. They use synthetic matrices, so they run without the EXIOBASE data.
The check is against a full inversion of the modified matrix.
"""
import numpy as np
import scipy.sparse as sp

from ramascene.woodbury import WoodburyL, block_scale


def random_technology_matrix(n, rng):
    """Small non-negative A with column sums below 1, so that I - A is invertible."""
    A = rng.random((n, n)) * (rng.random((n, n)) < 0.3)
    return A / (A.sum(axis=0, keepdims=True) * 1.5 + 1e-12)


def apply_interventions_densely(A, interventions):
    """Reference: apply block scalings directly, as Modelling.model_intermediates does."""
    A_mod = A.copy()
    for rows, cols, factor in interventions:
        A_mod[np.ix_(np.unique(rows), np.unique(cols))] *= factor
    return A_mod


def test_block_scale_matches_dense_application():
    rng = np.random.default_rng(0)
    n = 60
    A = random_technology_matrix(n, rng)
    interventions = [
        (np.array([1, 5, 9]), np.array([2, 3, 20]), 0.8),
        (np.array([5, 9, 40]), np.array([3, 20, 41]), 1.3),   # overlaps the first block
    ]
    D = sp.csr_matrix((n, n))
    for rows, cols, factor in interventions:
        D = block_scale(D, A, rows, cols, factor)
    expected = apply_interventions_densely(A, interventions) - A
    np.testing.assert_allclose(D.toarray(), expected, rtol=1e-12, atol=1e-14)


def test_woodbury_matches_full_inversion_for_vectors_and_columns():
    rng = np.random.default_rng(1)
    n = 120
    A = random_technology_matrix(n, rng)
    L = np.linalg.inv(np.eye(n) - A)
    interventions = [
        (rng.choice(n, 10, replace=False), rng.choice(n, 15, replace=False), 0.7),
        (rng.choice(n, 8, replace=False), rng.choice(n, 12, replace=False), 1.4),
    ]
    D = sp.csr_matrix((n, n))
    for rows, cols, factor in interventions:
        D = block_scale(D, A, rows, cols, factor)

    L_full = np.linalg.inv(np.eye(n) - A - D.toarray())
    W = WoodburyL(L, D)

    y = rng.random((n, 3))
    np.testing.assert_allclose(W @ y, L_full @ y, rtol=1e-9, atol=1e-10)
    idx = np.array([0, 7, 33, 100])
    np.testing.assert_allclose(W[:, idx], L_full[:, idx], rtol=1e-9, atol=1e-10)
    np.testing.assert_allclose(W.to_dense(), L_full, rtol=1e-9, atol=1e-10)


def test_no_change_returns_original_inverse():
    rng = np.random.default_rng(2)
    n = 50
    A = random_technology_matrix(n, rng)
    L = np.linalg.inv(np.eye(n) - A)
    W = WoodburyL(L, sp.csr_matrix((n, n)))
    assert W.k == 0
    np.testing.assert_allclose(W.to_dense(), L, rtol=1e-12, atol=1e-12)


def test_rank_limit_is_enforced(monkeypatch):
    import ramascene.woodbury as wb
    monkeypatch.setattr(wb, "MAX_WOODBURY_RANK", 3)
    rng = np.random.default_rng(3)
    n = 30
    A = random_technology_matrix(n, rng)
    L = np.linalg.inv(np.eye(n) - A)
    D = block_scale(sp.csr_matrix((n, n)), A, np.arange(10), np.arange(5), 0.5)
    try:
        WoodburyL(L, D)
    except ValueError:
        return
    raise AssertionError("expected the rank limit to be enforced")
