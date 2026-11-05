import json
import tempfile
from pathlib import Path

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from ramascene.models import Country, Indicator, Product


DATASET = {
    "years": [2023, 2024],
    "nowcast_years": [2024],
    "source": "EXIOBASE test",
    "unavailable_indicators_by_year": {"2024": ["Land use", "Not in the catalog"]},
}


class CatalogApiTests(TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        (Path(folder.name) / "dataset_v5.json").write_text(json.dumps(DATASET))
        override = override_settings(DATASET_DIR=folder.name, DATASET_VERSION="v5")
        override.enable()
        self.addCleanup(override.disable)
        Indicator.objects.create(name="Land use", unit="km2", global_id=6, parent_id=0, local_id=2, level=1)
        Product.objects.create(name="Electricity", code="p1", global_id=10, parent_id=0, local_id=1,
                               level=2, identifier="LEAF", leaf_children_global="#", leaf_children_local="#")
        Product.objects.create(name="Total", code="p0", global_id=1, parent_id=0, local_id=0,
                               level=0, identifier="TOTAL", leaf_children_global="#", leaf_children_local="#")
        Country.objects.create(name="Netherlands", code="NL", global_id=20, parent_id=0, local_id=1,
                               level=2, identifier="LEAF", leaf_children_global="#", leaf_children_local="#")
        Country.objects.create(name="World", code="AGG", global_id=2, parent_id=0, local_id=0,
                               level=0, identifier="AGG", leaf_children_global="#", leaf_children_local="#")
        Indicator.objects.create(name="GHG emissions", unit="kg CO2 eq", global_id=5, parent_id=0,
                                 local_id=1, level=1)

    def test_catalog_lists_leaf_nodes_with_global_ids(self):
        response = APIClient().get('/api/catalog/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["products"], [{"global_id": 10, "name": "Electricity", "code": "p1"}])
        self.assertEqual(body["countries"], [{"global_id": 20, "name": "Netherlands", "code": "NL"}])
        self.assertEqual(body["indicators"], [{"global_id": 5, "name": "GHG emissions", "unit": "kg CO2 eq", "parent_id": 0, "level": 1},
                                              {"global_id": 6, "name": "Land use", "unit": "km2", "parent_id": 0, "level": 1}])
        self.assertEqual(body["years"], [2023, 2024])
        self.assertEqual(body["nowcast_years"], [2024])
        self.assertEqual(body["source"], "EXIOBASE test")

    def test_catalog_lists_indicators_without_data_per_year(self):
        body = APIClient().get('/api/catalog/').json()
        self.assertEqual(body["unavailable"], {"2024": [6]})
