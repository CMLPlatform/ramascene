"""Offline regression harness for the calculation engine.

Calls Analyze.route_* directly, the way tasks.execute_calc does, but without
Celery, a broker, channels or an HTTP layer. Two levels:

* synthetic matrices, always runnable, run all four routes end to end and
  compare them with golden output from the unmodified engine;
* the real EXIOBASE 2011 v3 matrices, checked against the Octave reference
  values in validation_files/. Skipped (never silently passed) when the
  dataset is absent, see docs/regression-harness.md.
"""

import json
import os

import numpy as np
import pytest
from django.conf import settings

from ramascene import querymanagement
from ramascene.analyze import Analyze
from ramascene.modelling import Modelling
from ramascene.tests.validation_data import FILES_TO_TEST_AGAINST, VALIDATION_DIR, open_validation_file

COUNTRY_CNT = 49
PRODUCT_CNT = 200
MATRIX_ROWS = COUNTRY_CNT * PRODUCT_CNT
INDICATOR_ROWS = 60  # enough for every indicator global id in the fixtures
VALIDATION_YEAR = 2011

# Same dispatch as tasks.execute_calc.
ROUTES = {
    ("Contribution", "Geographic"): "route_two",
    ("Hotspot", "Geographic"): "route_three",
    ("Contribution", "Sectoral"): "route_one",
    ("Hotspot", "Sectoral"): "route_four",
}

# The validation CSVs predate commit e8e203f, which renamed these in the API.
LEGACY_VOCABULARY = {
    "Consumption": "Contribution",
    "Production": "Hotspot",
    "GeoMap": "Geographic",
    "TreeMap": "Sectoral",
}


def dataset_paths(year=VALIDATION_YEAR, names=("Y", "B", "L")):
    directory = os.path.join(settings.DATASET_DIR, str(year))
    return [os.path.join(directory, "{}_{}.npy".format(name, settings.DATASET_VERSION)) for name in names]


@pytest.fixture(scope="session")
def real_matrices():
    """(Y, B, L) for the validation year, or skip naming what is missing."""
    missing = [path for path in dataset_paths() if not os.path.exists(path)]
    if missing:
        pytest.skip(
            "EXIOBASE dataset missing: {}. Set DATASETS_DIR and see docs/regression-harness.md".format(
                ", ".join(missing)
            )
        )
    return tuple(querymanagement.get_numpy_objects(VALIDATION_YEAR, name) for name in ("Y", "B", "L"))


@pytest.fixture(scope="session")
def synthetic_matrices():
    """Stand-ins with the real shapes and dtype. L is dense, non-symmetric and
    diagonally dominant, so a slip that swaps rows for columns, L for L.T or
    the order of a product changes the result; an identity L would hide all
    three. Built without an inversion, so it costs one 9800x9800 allocation.
    """
    rng = np.random.default_rng(20260926)
    Y = rng.random((MATRIX_ROWS, COUNTRY_CNT))
    B = rng.random((INDICATOR_ROWS, MATRIX_ROWS))
    L = rng.random((MATRIX_ROWS, MATRIX_ROWS))
    L *= 1e-3
    L[np.diag_indices(MATRIX_ROWS)] += 1.0
    return Y, B, L


def read_query(filename):
    query, expected, unit = open_validation_file(os.path.join(VALIDATION_DIR, filename))
    query_selection = query["querySelection"]
    # the consumer unwraps the single-element year and modernises the vocabulary
    query_selection["year"] = int(query_selection["year"][0])
    query_selection["dimType"] = LEGACY_VOCABULARY[query_selection["dimType"]]
    query_selection["vizType"] = LEGACY_VOCABULARY[query_selection["vizType"]]
    return query_selection, expected, unit


def run_route(query_selection, matrices, job_name="regression", job_id=0):
    """Run the route the selection dispatches to; returns ({name: value}, unit)."""
    Y, B, L = matrices
    ready = querymanagement.calc_ready_selection(query_selection)
    analyze = Analyze(
        querymanagement.convert_to_numpy(ready["nodesSec"]),
        querymanagement.convert_to_numpy(ready["nodesReg"]),
        querymanagement.convert_to_numpy(ready["extn"]),
        query_selection,
        ready["idx_units"],
        job_name,
        job_id,
        np.arange(0, COUNTRY_CNT),
        Y,
        B,
        L,
    )
    route = ROUTES[(query_selection["dimType"], query_selection["vizType"])]
    result = json.loads(getattr(analyze, route)())
    values = result["rawResultData"]
    assert values, "engine returned no results for {}".format(route)
    # nothing downstream of the engine rejects nan or inf, so assert it here
    assert np.isfinite(list(values.values())).all(), "non-finite engine output from {}: {}".format(route, values)
    return values, result["unit"]


@pytest.mark.parametrize("filename", FILES_TO_TEST_AGAINST)
def test_matches_octave_reference(filename, real_matrices):
    query_selection, expected, expected_unit = read_query(filename)
    values, unit = run_route(query_selection, real_matrices)
    assert unit == expected_unit
    assert values == pytest.approx(expected)


# The fixtures only cover route_two (files 1-3) and route_four (file 4), so the
# other two routes borrow a selection and flip the dispatch keys. The last case
# selects two indicators: with one, a (k, 1) and a (1, k) intermediate reshape
# identically, so a missing transpose in route_four would go unnoticed. The
# route reports the first of them after sorting, here indicator 2.
SYNTHETIC_CASES = {
    "route_two": ("validation_analytical_1_v3.csv", "Contribution", "Geographic", None),
    "route_three": ("validation_analytical_1_v3.csv", "Hotspot", "Geographic", None),
    "route_one": ("validation_analytical_4_v3.csv", "Contribution", "Sectoral", None),
    "route_four": ("validation_analytical_4_v3.csv", "Hotspot", "Sectoral", None),
    "route_four_two_indicators": ("validation_analytical_4_v3.csv", "Hotspot", "Sectoral", [2, 5]),
}

# Output of master's analyze.py on synthetic_matrices, one entry per case.
GOLDEN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "synthetic_golden.json")


@pytest.mark.parametrize("case", sorted(SYNTHETIC_CASES))
def test_routes_match_golden_on_synthetic_matrices(case, synthetic_matrices):
    filename, dim_type, viz_type, extn = SYNTHETIC_CASES[case]
    query_selection, _, _ = read_query(filename)
    query_selection["dimType"] = dim_type
    query_selection["vizType"] = viz_type
    if extn:
        query_selection["extn"] = extn
    values, unit = run_route(query_selection, synthetic_matrices)
    with open(GOLDEN_PATH) as golden_file:
        goldens = json.load(golden_file)
    if os.environ.get("REGENERATE_GOLDEN"):
        # only on master's engine code, see docs/regression-harness.md
        goldens[case] = {"unit": unit, "values": values}
        with open(GOLDEN_PATH, "w") as golden_file:
            json.dump(goldens, golden_file, indent=1, sort_keys=True)
        pytest.skip("regenerated the golden output for {}".format(case))
    golden = goldens[case]
    assert unit == golden["unit"]
    # rel=1e-12 rather than ==: BLAS may sum np.dot in a different order on
    # another machine. Any indexing slip moves results by far more than that.
    assert values == pytest.approx(golden["values"], rel=1e-12)



def model_with(monkeypatch, identifier, tech_change):
    """A one-intervention Modelling on small matrices. Product 0 of country 0
    selected everywhere, so an intermediate change hits the diagonal A[0, 0]."""
    n = 50
    A = np.random.default_rng(0).random((n, n)) * 1e-3
    monkeypatch.setattr(querymanagement, "get_numpy_objects", lambda year, name: A)
    one = [[0]]
    return Modelling(
        {"product": one, "consumedBy": one, "originReg": one, "consumedReg": one,
         "techChange": [[tech_change]], "identifiers": [identifier]},
        np.ones((n, 1)), [identifier == "INTERMEDIATE"], VALIDATION_YEAR, None,
    )


def test_non_finite_technical_change_raises(monkeypatch):
    """A nan in A makes all of L nan; the job must fail, not report zeros."""
    with pytest.raises(ValueError, match="non-finite technical coefficients"):
        model_with(monkeypatch, "INTERMEDIATE", "nan").apply_model()


def test_infinite_technical_change_raises(monkeypatch):
    """float("1e400") is inf. On the diagonal of A it gives a finite but wrong
    L, so only a check on A, before the inversion, catches it."""
    with pytest.raises(ValueError, match="non-finite technical coefficients"):
        model_with(monkeypatch, "INTERMEDIATE", "1e400").apply_model()


def test_non_finite_final_demand_raises(monkeypatch):
    """A final-demand change never touches L, so the L check cannot see it."""
    with pytest.raises(ValueError, match="non-finite final demand"):
        model_with(monkeypatch, "FINALCONSUMPTION", "nan").apply_model()
