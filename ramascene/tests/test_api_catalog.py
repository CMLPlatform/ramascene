from django.test import TestCase
from rest_framework.test import APIClient

from ramascene.models import Country, Indicator, Product


class CatalogApiTests(TestCase):
    def setUp(self):
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
        self.assertEqual(body["indicators"], [{"global_id": 5, "name": "GHG emissions", "unit": "kg CO2 eq"}])
        self.assertEqual(body["years"][0], 1995)
        self.assertEqual(body["years"][-1], 2011)
