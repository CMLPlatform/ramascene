from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from ramascene.models import Job

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
