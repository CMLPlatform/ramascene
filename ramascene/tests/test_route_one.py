"""Route one: the consumption-side and production-side views of one footprint (small synthetic economy)."""
import json
from unittest import mock

import numpy as np
from django.test import SimpleTestCase, override_settings

from ramascene.analyze import Analyze

N_PRODUCTS, N_COUNTRIES = 3, 4
N = N_PRODUCTS * N_COUNTRIES
PRODUCTS = ["bread", "steel", "power"]
COUNTRIES = ["A", "B", "C", "D"]


@override_settings(N_PRODUCTS=N_PRODUCTS, N_COUNTRIES=N_COUNTRIES)
class RouteOneViewsTests(SimpleTestCase):
    def setUp(self):
        rng = np.random.default_rng(7)
        A = rng.random((N, N)) * (rng.random((N, N)) < 0.4)
        A = A / (A.sum(axis=0, keepdims=True) * 1.6 + 1e-12)
        self.L = np.linalg.inv(np.eye(N) - A)
        self.Y = rng.random((N, N_COUNTRIES)) * (rng.random((N, N_COUNTRIES)) < 0.6)   # exports are off-diagonal
        self.B = rng.random((1, N))
        patches = [
            mock.patch("ramascene.querymanagement.get_leaf_product_names", return_value=PRODUCTS),
            mock.patch("ramascene.querymanagement.get_leaf_country_names", return_value=COUNTRIES),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

    def run_route(self, products, consuming):
        analysis = Analyze(np.array(products), np.array(consuming), np.array([0]), {}, {}, "t", 0,
                           np.arange(N_COUNTRIES), self.Y, self.B, self.L)
        return json.loads(analysis.route_one())

    def test_production_side_footprint_is_the_multiplier_times_total_final_demand(self):
        s = 1
        result = self.run_route([s], range(N_COUNTRIES))
        bL = self.B[0] @ self.L
        y_total = self.Y.sum(axis=1)
        for c, name in enumerate(COUNTRIES):
            row = c * N_PRODUCTS + s
            self.assertAlmostEqual(result["origins"][name], bL[row] * y_total[row], places=10)

    def test_origins_and_consumption_add_up_to_the_same_total(self):
        s = 2
        result = self.run_route([s], range(N_COUNTRIES))
        consumption = sum(
            self.B[0] @ self.L @ np.where(np.arange(N) % N_PRODUCTS == s, self.Y[:, c], 0.0) for c in range(N_COUNTRIES)
        )
        self.assertAlmostEqual(sum(result["origins"].values()), consumption, places=10)
        self.assertAlmostEqual(result["consumed"][PRODUCTS[s]], consumption, places=10)

    def test_consumption_of_one_country_excludes_what_its_sector_exports(self):
        s, c = 0, 2
        consumed_by_c = self.run_route([s], [c])
        bL = self.B[0] @ self.L
        rows = np.arange(N_COUNTRIES) * N_PRODUCTS + s
        self.assertAlmostEqual(consumed_by_c["consumed"][PRODUCTS[s]], float(bL[rows] @ self.Y[rows, c]), places=10)
        # the production side of country c also includes its sector's final demand from the other countries
        produced = self.run_route([s], range(N_COUNTRIES))["origins"]["C"]
        self.assertAlmostEqual(produced, float(bL[c * N_PRODUCTS + s] * self.Y[c * N_PRODUCTS + s, :].sum()), places=10)
