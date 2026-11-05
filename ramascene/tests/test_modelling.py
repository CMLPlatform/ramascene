"""
Tests for Modelling.apply_model on small synthetic matrices.

The index manager maps product and country ids onto EXIOBASE layout (the number of industries per country comes from settings).
Using only countries 0 and 1 and products below the industry count keeps every index below twice that, so a
small technology matrix is enough to exercise the full intervention path.
"""
import copy
from unittest import mock

import numpy as np
from django.test import SimpleTestCase

from ramascene import dimensions, woodbury
from ramascene.modelling import Modelling

P = dimensions.n_products()  # industries per country
N = 2 * P  # 2 countries
Y_SHAPE = (N, 49)


def _details(interventions):
    """Build ready_model_details in the structure apply_model unpacks."""
    keys = ["product", "consumedBy", "originReg", "consumedReg", "techChange", "identifiers"]
    # deep copy: convert_to_numpy sorts the lists in place
    return {key: copy.deepcopy([intervention[key] for intervention in interventions]) for key in keys}


def _dense_reference(A, interventions):
    """Apply the same block scalings directly to A and invert."""
    A_mod = A.copy()
    for intervention in interventions:
        rows = [p + o * P for o in intervention["originReg"] for p in intervention["product"]]
        cols = [p + r * P for r in intervention["consumedReg"] for p in intervention["consumedBy"]]
        factor = 1 + intervention["techChange"][0] / 100
        A_mod[np.ix_(rows, cols)] *= factor
    return np.linalg.inv(np.identity(N) - A_mod)


class ModellingTests(SimpleTestCase):
    def setUp(self):
        rng = np.random.default_rng(0)
        self.A = rng.random((N, N)) * (0.4 / N)
        self.L = np.linalg.inv(np.identity(N) - self.A)
        self.Y = rng.random(Y_SHAPE)
        self.interventions = [
            {"product": [1, 2, 5], "originReg": [0], "consumedBy": [3, 4], "consumedReg": [1],
             "techChange": [-20.0], "identifiers": "INTERMEDIATE"},
            {"product": [7], "originReg": [1], "consumedBy": [9, 10, 11], "consumedReg": [0],
             "techChange": [35.0], "identifiers": "INTERMEDIATE"},
        ]

    def _run(self, interventions, **kwargs):
        model = Modelling(_details(interventions), self.Y, [True], 2011, {}, A=self.A.copy(),
                          L=self.L.copy(), **kwargs)
        _, L_new = model.apply_model()
        if isinstance(L_new, woodbury.WoodburyL):
            L_new = L_new.to_dense()
        return L_new

    def test_woodbury_matches_dense_inversion(self):
        L_new = self._run(self.interventions)
        expected = _dense_reference(self.A, self.interventions)
        np.testing.assert_allclose(L_new, expected, rtol=1e-9, atol=1e-12)

    def test_no_intermediate_intervention_keeps_L(self):
        final_demand_only = [dict(self.interventions[0], identifiers="FINALCONSUMPTION")]
        model = Modelling(_details(final_demand_only), self.Y.copy(), [False], 2011, {},
                          A=None, L=self.L.copy())
        Y_new, L_new = model.apply_model()
        np.testing.assert_array_equal(L_new, self.L)
        self.assertFalse(np.array_equal(Y_new, self.Y))

    def test_fallback_to_full_inversion_when_rank_limit_exceeded(self):
        with mock.patch.object(woodbury, "MAX_WOODBURY_RANK", 1):
            L_new = self._run(self.interventions)
        expected = _dense_reference(self.A, self.interventions)
        np.testing.assert_allclose(L_new, expected, rtol=1e-9, atol=1e-12)
