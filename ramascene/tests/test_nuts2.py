import json
import os

from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from ramascene.nuts2 import DATA_FILE, load_nuts2

MAP_FILE = os.path.join(os.path.dirname(DATA_FILE), "nuts2_map.json")


class Nuts2DataTests(SimpleTestCase):
    def test_every_country_has_regions_with_unique_codes(self):
        regions = load_nuts2()
        self.assertEqual(len(regions), 28)
        codes = [r["code"] for rs in regions.values() for r in rs]
        self.assertEqual(len(codes), 281)
        self.assertEqual(len(codes), len(set(codes)))
        self.assertTrue(all(rs for rs in regions.values()))

    def test_region_codes_start_with_the_country_code(self):
        # NUTS codes use the country code, except Greece (EL) and the United Kingdom (UK) which differ from ISO
        regions = load_nuts2()
        for rs in regions.values():
            prefixes = {r["code"][:2] for r in rs}
            self.assertEqual(len(prefixes), 1)

    def test_agrees_with_the_circumat_nuts2_map(self):
        with open(MAP_FILE, encoding="utf-8") as handle:
            nuts_map = json.load(handle)
        from_map = {key.split("_", 1)[1]: codes for key, codes in nuts_map.items()}
        from_csv = {name: [r["code"] for r in rs] for name, rs in load_nuts2().items()}
        self.assertEqual(from_csv, from_map)

    def test_netherlands(self):
        nl = load_nuts2()["Netherlands"]
        self.assertEqual(len(nl), 12)
        self.assertEqual(nl[0], {"code": "NL11", "name": "Groningen"})


class CatalogNuts2Tests(TestCase):
    def test_catalog_includes_regions(self):
        body = APIClient().get("/api/catalog/").json()
        self.assertEqual(len(body["nuts2"]["Germany"]), 38)
