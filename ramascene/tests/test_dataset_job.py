"""A job started through the API gives the number you get from the matrices directly.

Needs a converted dataset (DATASETS_DIR, DATASETS_VERSION) and runs Celery eagerly, so no broker is required.
Skipped without a dataset.
"""
import json
import os

import numpy as np
import pytest
from celery import current_app
from django.core.management import call_command
from rest_framework.test import APIClient

ROOT = os.environ.get("DATASETS_DIR", "")
VERSION = os.environ.get("DATASETS_VERSION", "v5")
META = os.path.join(ROOT, f"dataset_{VERSION}.json")

pytestmark = pytest.mark.skipif(not os.path.exists(META), reason="no converted dataset available")


@pytest.fixture()
def resource():
    call_command("populateHierarchies", verbosity=0)
    yield
    call_command("clear_models", verbosity=0)


@pytest.fixture()
def eager_celery():
    previous = current_app.conf.task_always_eager
    current_app.conf.task_always_eager = True
    yield
    current_app.conf.task_always_eager = previous


def load(year, name, mmap=False):
    return np.load(os.path.join(ROOT, str(year), f"{name}_{VERSION}.npy"), mmap_mode="r" if mmap else None)


@pytest.mark.django_db(transaction=True)
def test_consumption_footprint_matches_matrix_calculation(resource, eager_celery):
    from ramascene.models import Country, Indicator, Product

    with open(META) as fh:
        meta = json.load(fh)
    year = meta["years"][-2]  # the last year that is not a now-cast
    ghg = Indicator.objects.get(name="GHG emissions: Total")
    country = Country.objects.get(code="NL", identifier="LEAF")
    sectors = list(Product.objects.filter(identifier="LEAF").values_list("global_id", flat=True))

    client = APIClient()
    response = client.post("/api/jobs/", {"action": "default", "querySelection": {
        "dimType": "Contribution", "vizType": "Sectoral", "nodesSec": sectors, "nodesReg": [country.global_id],
        "extn": [ghg.global_id], "year": [str(year)]}}, format="json")
    assert response.status_code == 202, response.content
    body = client.get(response.json()["status_url"]).json()
    assert body["status"] == "completed"

    B, L, Y = load(year, "B"), load(year, "L", mmap=True), load(year, "Y")
    expected = float((np.asarray(B[ghg.global_id - 1]) @ np.asarray(L)) @ np.asarray(Y[:, country.local_id - 1]))
    got = sum(body["result"]["rawResultData"].values())
    assert got == pytest.approx(expected, rel=1e-9)
    assert body["result"]["unit"] == {ghg.name: "kg CO2 eq"}


@pytest.mark.django_db(transaction=True)
def test_a_theme_selects_all_its_industries(resource, eager_celery):
    """Selecting an aggregate (here the Energy theme) gives the footprint of all its industries together."""
    from ramascene import dimensions
    from ramascene.models import Country, Indicator, Product

    with open(META) as fh:
        meta = json.load(fh)
    year = meta["years"][-2]
    ghg = Indicator.objects.get(name="GHG emissions: Total")
    country = Country.objects.get(code="NL", identifier="LEAF")
    theme = Product.objects.get(name="Energy", identifier="AGG")
    members = [int(i) for i in theme.leaf_children_local.split("#")]
    assert 20 < len(members) < 40

    client = APIClient()
    response = client.post("/api/jobs/", {"action": "default", "querySelection": {
        "dimType": "Contribution", "vizType": "Sectoral", "nodesSec": [theme.global_id],
        "nodesReg": [country.global_id], "extn": [ghg.global_id], "year": [str(year)]}}, format="json")
    assert response.status_code == 202, response.content
    body = client.get(response.json()["status_url"]).json()
    assert body["status"] == "completed"

    P, C = dimensions.n_products(), dimensions.n_countries()
    rows = np.array([c * P + m for c in range(C) for m in members])
    B, L, Y = load(year, "B"), load(year, "L", mmap=True), load(year, "Y")
    bL = np.asarray(B[ghg.global_id - 1]) @ np.asarray(L)
    expected = float(bL[rows] @ np.asarray(Y)[rows, country.local_id - 1])
    assert sum(body["result"]["rawResultData"].values()) == pytest.approx(expected, rel=1e-9)
