"""Checks on the converted dataset itself. Skipped when no dataset folder is configured.

Run with DATASETS_DIR and DATASETS_VERSION set, e.g. the folder written by scripts/convert_exiobase.py.
"""
import json
import os

import numpy as np
import pytest

ROOT = os.environ.get("DATASETS_DIR", "")
VERSION = os.environ.get("DATASETS_VERSION", "v5")
META = os.path.join(ROOT, f"dataset_{VERSION}.json")

pytestmark = pytest.mark.skipif(not os.path.exists(META), reason="no converted dataset available")


@pytest.fixture(scope="module")
def meta():
    with open(META) as fh:
        return json.load(fh)


def load(year, name, mmap=True):
    return np.load(os.path.join(ROOT, str(year), f"{name}_{VERSION}.npy"), mmap_mode="r" if mmap else None)


def test_every_year_has_matrices_of_the_expected_shape(meta):
    n = len(meta["regions"]) * len(meta["industries"])
    for year in meta["years"]:
        assert load(year, "A").shape == (n, n)
        assert load(year, "L").shape == (n, n)
        assert load(year, "B").shape == (len(meta["indicators"]), n)
        assert load(year, "Y").shape == (n, len(meta["regions"]))
        assert load(year, "Y7").shape == (n, 7 * len(meta["regions"]))


def test_leontief_inverse_matches_the_coefficients(meta):
    """(I - A) L = I on a few random columns of the latest year."""
    year = meta["years"][-1]
    A, L = load(year, "A"), load(year, "L")
    n = A.shape[0]
    rng = np.random.default_rng(1)
    cols = np.sort(rng.choice(n, 20, replace=False))
    product = np.asarray(L[:, cols]) - np.asarray(A) @ np.asarray(L[:, cols])
    expected = np.zeros((n, len(cols)))
    expected[cols, np.arange(len(cols))] = 1.0
    np.testing.assert_allclose(product, expected, atol=1e-8)


def test_final_demand_categories_add_up(meta):
    year = meta["years"][-1]
    y7 = np.asarray(load(year, "Y7"))
    y = np.asarray(load(year, "Y"))
    np.testing.assert_allclose(y7.reshape(y.shape[0], y.shape[1], 7).sum(axis=2), y, rtol=1e-12, atol=1e-9)


def test_footprints_add_up_to_the_direct_totals(meta):
    """The footprint of all final demand of the world equals the greenhouse gas emitted by all industries."""
    for year in meta["years"]:
        with open(os.path.join(ROOT, str(year), "validation.json")) as fh:
            validation = json.load(fh)
        assert validation["footprint_vs_direct_max_rel"] < 1e-8
        assert validation["balance_max_rel_to_largest_output"] < 1e-8
        assert validation["unallocated_share_ghg_total"] < 1e-3
