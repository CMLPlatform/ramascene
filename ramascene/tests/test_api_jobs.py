from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from ramascene.models import Country, Job, Product

VALID_QUERY = {
    "action": "default",
    "querySelection": {
        "dimType": "Contribution",
        "vizType": "Geographic",
        "nodesSec": [0],
        "nodesReg": [0],
        "extn": [0],
        "year": ["2011"],
    },
}


@override_settings(DATASET_DIR="/nonexistent")
class JobApiValidationTests(TestCase):
    """Requests that are rejected before any calculation starts."""

    def setUp(self):
        self.client_api = APIClient()

    def post(self, body):
        return self.client_api.post('/api/jobs/', body, format='json')

    def test_unknown_action_is_rejected(self):
        response = self.post({**VALID_QUERY, "action": "delete"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("action", response.json())

    def test_missing_selection_keys_are_listed(self):
        body = {**VALID_QUERY, "querySelection": {"dimType": "Contribution", "vizType": "Geographic"}}
        response = self.post(body)
        self.assertEqual(response.status_code, 400)
        self.assertIn("nodesSec", str(response.json()))

    def test_unknown_view_is_rejected(self):
        body = {**VALID_QUERY, "querySelection": {**VALID_QUERY["querySelection"], "vizType": "GeoMap"}}
        response = self.post(body)
        self.assertEqual(response.status_code, 400)

    def test_model_action_requires_model_details(self):
        response = self.post({**VALID_QUERY, "action": "model"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("model_details", response.json())

    def test_empty_year_is_rejected(self):
        body = {**VALID_QUERY, "querySelection": {**VALID_QUERY["querySelection"], "year": []}}
        response = self.post(body)
        self.assertEqual(response.status_code, 400)

    def test_rejected_requests_create_no_job(self):
        self.post({**VALID_QUERY, "action": "delete"})
        self.assertEqual(Job.objects.count(), 0)


@override_settings(DATASET_DIR="/nonexistent")
class JobApiLimitTests(TestCase):
    def test_too_many_active_jobs_returns_429(self):
        with override_settings(RAMASCENE_MAX_ACTIVE_JOBS=0):
            response = APIClient().post('/api/jobs/', VALID_QUERY, format='json')
        self.assertEqual(response.status_code, 429)
        self.assertEqual(Job.objects.count(), 0)


class JobApiDetailTests(TestCase):
    def test_unknown_job_returns_404(self):
        response = APIClient().get('/api/jobs/999999/')
        self.assertEqual(response.status_code, 404)

    def test_started_job_has_no_result(self):
        job = Job.objects.create(name="test", status="started")
        response = APIClient().get(f'/api/jobs/{job.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "started")
        self.assertNotIn("result", response.json())


@override_settings(DATASET_DIR="/nonexistent")
class JobApiInterventionTests(TestCase):
    """Scenario requests: intervention structure and ids are checked before a job is created."""

    def setUp(self):
        from ramascene.models import ModellingProduct
        common = dict(parent_id=0, local_id=1, level=2, leaf_children_global="#", leaf_children_local="#")
        Country.objects.create(name="Netherlands", code="NL", global_id=20, identifier="LEAF", **common)
        Country.objects.create(name="Germany", code="DE", global_id=21, identifier="LEAF", **common)
        Product.objects.create(name="Electricity", code="p1", global_id=10, identifier="LEAF", **common)
        ModellingProduct.objects.create(name="Electricity", code="p1", global_id=30, identifier="LEAF", **common)
        ModellingProduct.objects.create(name="Final consumption", code="fc", global_id=276,
                                        identifier="FINALCONSUMPTION", **common)
        self.client_api = APIClient()

    def intervention(self, **changes):
        base = {"originReg": [20], "consumedReg": [21], "product": [10], "consumedBy": [276],
                "techChange": [-20.0]}
        return {**base, **changes}

    def body(self, interventions):
        return {"action": "model", "querySelection": VALID_QUERY["querySelection"],
                "model_details": interventions}

    def post(self, body):
        return self.client_api.post('/api/jobs/', body, format='json')

    def test_final_demand_intervention_is_accepted(self):
        from unittest import mock
        with mock.patch('ramascene.api.services.submit_job') as submit:
            submit.return_value = Job.objects.create(name="x", status="started")
            response = self.post(self.body([self.intervention()]))
        self.assertEqual(response.status_code, 202)
        validated = submit.call_args.args[0]
        self.assertEqual(validated["action"], "model")
        self.assertEqual(validated["model_details"][0]["techChange"], [-20.0])

    def test_technology_change_on_a_sector_is_accepted(self):
        from unittest import mock
        with mock.patch('ramascene.api.services.submit_job') as submit:
            submit.return_value = Job.objects.create(name="x", status="started")
            response = self.post(self.body([self.intervention(consumedBy=[30])]))
        self.assertEqual(response.status_code, 202)

    def test_unknown_country_is_rejected(self):
        response = self.post(self.body([self.intervention(originReg=[999])]))
        self.assertEqual(response.status_code, 400)
        self.assertIn("unknown country", str(response.json()))

    def test_unknown_consumer_is_rejected(self):
        response = self.post(self.body([self.intervention(consumedBy=[999])]))
        self.assertEqual(response.status_code, 400)

    def test_change_out_of_range_is_rejected(self):
        response = self.post(self.body([self.intervention(techChange=[150.0])]))
        self.assertEqual(response.status_code, 400)

    def test_model_action_needs_at_least_one_intervention(self):
        response = self.post(self.body([]))
        self.assertEqual(response.status_code, 400)
        self.assertIn("model_details", response.json())


class JobApiDatasetYearTests(TestCase):
    """A job must use a year that is in the dataset and an indicator that has data in that year."""

    def setUp(self):
        import json
        import tempfile
        from pathlib import Path

        from ramascene.models import Indicator
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        (Path(folder.name) / "dataset_v5.json").write_text(json.dumps({
            "years": [2023, 2024], "unavailable_indicators_by_year": {"2024": ["Land use"]}}))
        override = override_settings(DATASET_DIR=folder.name, DATASET_VERSION="v5")
        override.enable()
        self.addCleanup(override.disable)
        Indicator.objects.create(name="Land use", unit="km2", global_id=6, parent_id=0, local_id=1, level=1)
        Indicator.objects.create(name="GHG", unit="kg", global_id=5, parent_id=0, local_id=2, level=1)

    def post(self, year, indicator):
        body = {"action": "default", "querySelection": dict(VALID_QUERY["querySelection"], year=[year], extn=[indicator])}
        return APIClient().post("/api/jobs/", body, format="json")

    def test_year_outside_the_dataset_is_rejected(self):
        response = self.post("2011", 5)
        self.assertEqual(response.status_code, 400)
        self.assertIn("not in the dataset", str(response.json()))

    def test_indicator_without_data_in_that_year_is_rejected(self):
        response = self.post("2024", 6)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Land use has no data for 2024", str(response.json()))

    def test_the_same_indicator_is_fine_in_a_year_that_has_data(self):
        with mock.patch("ramascene.api.services.submit_job") as submit:
            submit.return_value = mock.Mock(id=1, status="started")
            self.assertEqual(self.post("2023", 6).status_code, 202)
