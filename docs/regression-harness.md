# Offline regression harness

Runs the calculation engine (`ramascene/analyze.py`, `ramascene/modelling.py`)
directly, with no Celery, broker, channels layer or HTTP server. The ORM is
still needed, because the engine expands and labels selections through the
`Product`/`Country`/`Indicator` models, so the harness points Django at the
checked-in `db.sqlite3` and runs no migrations.

## Run it

```text
pip install -r requirements.txt -r requirements-dev.txt   # the locked set CI installs
pytest -v -rs
```

That is the whole default suite. Without the dataset, the tests that need it
skip, and `-rs` prints why; each test's docstring says what it checks.

No environment variables are needed.

`pytest.ini` turns pytest-django off (`-p no:django`) for this suite: the
harness reads the checked-in database directly, and pytest-django would block
that access. With the full `requirements.txt` installed, the Celery module
skips because the minimal settings do not install `django_celery_results`.

Tests that need Celery, a broker or a freshly populated test database are
marked `integration` and deselected by `pytest.ini`. To see them:

```text
pytest -m integration        # expect failures: they need the infrastructure in README.md
```

Running it touches the checked-in database: `ramascene/__init__.py` puts SQLite
into WAL mode, so connections create `db.sqlite3-wal` and `db.sqlite3-shm` next
to it. Both are ignored by git, and a test run leaves the tracked `db.sqlite3`
unchanged.

## The dataset

The validation fixtures in `ramascene/tests/validation_files/` are for
**EXIOBASE year 2011** only. The matrices are the modified EXIOBASE published
at <https://doi.org/10.5281/zenodo.3533196> ("EXIOBASE v3.3.sm", ~15 GB). That
record ships every year's matrices with the suffix `_v4`, not `_v3`, so run
the harness with `DATASETS_VERSION=v4`:

```text
DATASETS_DIR=/path/to/datasets DATASETS_VERSION=v4 pytest -v -rs
```

It then looks for exactly:

```text
$DATASETS_DIR/2011/Y_v4.npy
$DATASETS_DIR/2011/B_v4.npy
$DATASETS_DIR/2011/L_v4.npy
$DATASETS_DIR/2011/A_v4.npy   # the scenario-path tests only
```

`DATASETS_DIR` and `DATASETS_VERSION` are the variables the deployment
settings read (see `sample-dev-env.sh`); the harness also accepts
`DATASET_DIR`/`DATASET_VERSION` and otherwise defaults to `./dataset` and
`v3`, the version `sample-dev-env.sh` sets. The stored matrices are float64
(`A` and `L` 9800 x 9800, `Y` 9800 x 49, `B` 60 x 9800).

With the 2011 files from that record, the four Octave-reference tests pass on
both `master`'s engine code and the engine as changed here: all 122 reference
values (50 + 50 + 3 + 19) reproduce within the default tolerance of
`pytest.approx` (relative 1e-6). They cover `route_two` and `route_four`, for
value added and GHG emissions (see the table below). With the dataset the
suite reports `24 passed, 2 skipped, 18 deselected`.

Scenario modelling never forms `L`: it solves `(I - A) x = y` for each route
(`LeontiefSolve` in `modelling.py`). With `A_v4.npy` present, 9 more tests run
that path on the real `A` with a 0% intermediate change: the same 4 Octave
references, and all five synthetic cases compared with the published-`L`
path (default `pytest.approx`, relative 1e-6), which also covers `route_one`
and `route_three`. A missing `A_v4.npy` skips those 9 alone.

Float32 input also works now: the LEAF branches of `get_aggregations_countries`
and `get_aggregations_products` convert the numpy scalar to a Python float, so
`json.dumps` no longer fails on it.

`python_ini/devScripts/script/create_numpy_objects_v3.py` is **not** the source
of the validation data: it loops over 1995-1999 and never produces 2011.

## What the fixtures cover

Each CSV's column 10 (`octave_results`) holds reference values from an external
Octave implementation. Their `view_type`/`calc_route` columns still use the
pre-2019 vocabulary (`Consumption`/`Production`, `GeoMap`/`TreeMap`), renamed
to `Contribution`/`Hotspot` and `Geographic`/`Sectoral` in commit `e8e203f`;
the harness translates them. By that dispatch the files map to routes as:

| fixture | route | keyed by |
| --- | --- | --- |
| `validation_analytical_1_v3.csv` | `route_two` | 50 countries, indicator 2 |
| `validation_analytical_2_v3.csv` | `route_two` | 50 countries, indicator 5 |
| `validation_analytical_3_v3.csv` | `route_two` | 3 aggregate/leaf regions |
| `validation_analytical_4_v3.csv` | `route_four` | 19 products, country 37 |

So the reference data covers `route_two` and `route_four` only.

The Celery-based `test_validation_analytical.py` sends these queries through
the websocket consumer unchanged, in the old vocabulary, which
`tasks.execute_calc` no longer dispatches, so it cannot have passed since commit `e8e203f` (September
2019). That is easy to miss in a test nobody can run locally. The harness runs
the same queries against the engine directly.

## Synthetic matrices and golden output

The synthetic tests always run. `L` is dense, non-symmetric and diagonally
dominant (seeded random entries scaled by `1e-3`, plus 1 on the diagonal),
built without an inversion. An identity `L` would hide the likeliest
vectorisation slips: scaling rows instead of columns, `L` against `L.T`, and
sums that collapse to a single term.

`ramascene/tests/synthetic_golden.json` holds the output of the unmodified
engine (`analyze.py` and `modelling.py` as on `master`) for each synthetic
case, so all four routes are checked against fixed values, including
`route_one` and `route_three`, which have no Octave reference. The comparison
uses `rel=1e-12` rather than exact equality, because a different BLAS may sum
`np.dot` in a different order. An indexing slip moves the results by far more:
scaling rows instead of columns in `route_one` shifts every value by up to 15%.

Regenerate the goldens only when a change to the engine's results is
intended, and say so in the pull request. Regenerate them on `master`'s engine
code, then copy the file to your branch. Goldens that come from the code under
review pass whatever that code computes.

```text
REGENERATE_GOLDEN=1 pytest -k golden   # rewrites synthetic_golden.json; the cases report as skipped
```
