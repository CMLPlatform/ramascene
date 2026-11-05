"""The dataset size comes from settings, so a classification with another number of industries works."""
import numpy as np
from django.test import SimpleTestCase, override_settings

from ramascene import dimensions
from ramascene.productindexmanger import ProductIndexManager


class DimensionTests(SimpleTestCase):
    def test_defaults_match_the_current_dataset(self):
        self.assertEqual((dimensions.n_products(), dimensions.n_countries()), (163, 49))
        self.assertEqual(dimensions.n_rows(), 7987)

    @override_settings(N_PRODUCTS=200, N_COUNTRIES=49)
    def test_the_earlier_product_by_product_sizes_still_work(self):
        self.assertEqual(dimensions.n_rows(), 9800)

    @override_settings(N_PRODUCTS=163, N_COUNTRIES=49)
    def test_row_index_uses_the_configured_product_count(self):
        ids = ProductIndexManager(np.array([2]), np.array([0, 3]), np.array([5]), np.array([1, 4]))
        # country * 163 + product
        np.testing.assert_array_equal(ids.get_consumed_product_ids(), [2, 3 * 163 + 2])
        np.testing.assert_array_equal(ids.get_produced_product_ids(), [163 + 5, 4 * 163 + 5])
