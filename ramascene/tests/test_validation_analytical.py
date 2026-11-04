"""
Contract test: the REST API reproduces the v3 analytical reference values (2011).

Jobs are started with POST /api/jobs/ and read back with GET /api/jobs/<id>/.
Celery runs eagerly (no broker or worker needed) for the duration of the test.
Run with pytest. Afterwards the populate command has to be performed again for deployment.
"""
import os

import pytest
from celery import current_app
from django.core.management import call_command
from rest_framework.test import APIClient

# The v3 reference files use the old view names. Map them to the names the app uses now
# (tasks.execute_calc): Consumption/GeoMap -> Contribution/Geographic (route two),
# Production/TreeMap -> Hotspot/Sectoral (route four).
LEGACY_VIEW_NAMES = {
    ("Consumption", "GeoMap"): ("Contribution", "Geographic"),
    ("Production", "TreeMap"): ("Hotspot", "Sectoral"),
}
FILES_TO_TEST_AGAINST = ["validation_analytical_1_v3.csv",
                         "validation_analytical_2_v3.csv",
                         "validation_analytical_3_v3.csv",
                         "validation_analytical_4_v3.csv"]
VALIDATION_DIR = os.path.join(os.path.dirname(__file__), "validation_files")


@pytest.fixture()
def resource():
    call_command('populateHierarchies', verbosity=0)
    yield "resource"
    call_command('clear_models', verbosity=0)


@pytest.fixture()
def eager_celery():
    previous = current_app.conf.task_always_eager
    current_app.conf.task_always_eager = True
    yield
    current_app.conf.task_always_eager = previous


@pytest.mark.django_db(transaction=True)
class TestJobContract:
    """Full job life cycle through the REST API, compared with the v3 reference values."""

    def test_api_reproduces_reference_values(self, resource, eager_celery):
        client = APIClient()

        for file in FILES_TO_TEST_AGAINST:
            query, origin_results, origin_unit = self.open_validation_file(os.path.join(VALIDATION_DIR, file))

            response = client.post('/api/jobs/', query, format='json')
            assert response.status_code == 202
            status_url = response.json()["status_url"]

            body = client.get(status_url).json()
            assert body["status"] == "completed"

            data = body["result"]["rawResultData"]
            unit = body["result"]["unit"]

            assert unit == origin_unit
            for k, v in data.items():
                assert v == pytest.approx(origin_results[k])

    def open_validation_file(self, fn):
        with open(fn) as csv_file:
            F = csv_file.read()
            U = F.split('\n')
            data = []
            for line in U:
                data.append(line.split('\t'))
            nodesReg = []
            nodesSec = []
            results = {}
            unit = {}
            data.pop(0)
            data.pop(-1)
            for parts in data:
                nodesReg.append(int(parts[3]))
                nodesSec.append(int(parts[4]))
                extn = [int(parts[5])]
                dimType, vizType = LEGACY_VIEW_NAMES[(parts[0], parts[1])]
                year = [parts[2]]
                results[parts[6]] = float(parts[9])
                unit[parts[8]] = parts[7]

            # clean (only single element for list depending on vizType)
            if len(nodesReg) > len(set(nodesReg)):
                nodesReg = list(set(nodesReg))
            if len(nodesSec) > len(set(nodesSec)):
                nodesSec = list(set(nodesSec))

        query = {
            "action": "default",
            "querySelection": {
                "dimType": dimType,
                "vizType": vizType,
                "nodesSec": nodesSec,
                "nodesReg": nodesReg,
                "extn": extn,
                "year": year
            }
        }
        return query, results, unit
