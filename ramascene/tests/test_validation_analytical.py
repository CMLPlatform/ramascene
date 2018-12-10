from channels.testing import WebsocketCommunicator
from ramascene.consumers import RamasceneConsumer
import pytest
from django.core.management import call_command
import os
import json
from django.test.client import Client
import ast

# waiting time for celery results
TIMEOUT = 100
FILES_TO_TEST_AGAINST = ["validation_analytical_1_v3.csv",
                         "validation_analytical_2_v3.csv",
                         "validation_analytical_3_v3.csv",
                         "validation_analytical_4_v3.csv"]


@pytest.fixture()
def resource():
    print("setup")
    call_command('populateHierarchies', verbosity=0)
    yield "resource"
    call_command('clear_models', verbosity=0)
    print("teardown")


@pytest.mark.django_db(transaction=True)
class TestLifeCycle:
    """
    This class tests the full life-cycle of the back-end.
    It uses the real database, but cleans it afterwards.
    Incorporation tests of websocket connection, API, Celery & database results
    It runs outside of the standard django tests, but uses pytest.
    Please run Celery when you use this test
    Afterwards the populate command has to be performed again for deployment
    """

    @pytest.mark.asyncio
    async def test_my_consumer(self, resource):

        # create client for POST request
        client = Client()

        for file in FILES_TO_TEST_AGAINST:
            query, origin_results, origin_unit = self.open_validation_file(
                os.path.join('./ramascene/tests/validation_files/',
                             '') + file)

            communicator = WebsocketCommunicator(RamasceneConsumer,
                                                 "/ramascene/")
            # test connection
            connected, subprotocol = await communicator.connect()
            assert connected
            # check if it's accepting connections
            response = await communicator.receive_json_from(timeout=TIMEOUT)
            assert response["type"] == "websocket.accept"

            # Test sending json queries
            await communicator.send_json_to(query)
            # get the result and see if the stop has started
            response = await communicator.receive_json_from(timeout=TIMEOUT)
            assert response["job_status"] == "started"

            # check if task is finished
            response = await communicator.receive_json_from(timeout=TIMEOUT)
            assert response["job_status"] == "completed"

            # Close connection
            await communicator.disconnect()

            # retrieve via ajax with job_id the result
            r = client.post('/ajaxhandling/', {'TaskID': response["job_id"], },
                            HTTP_X_REQUESTED_WITH='XMLHttpRequest')

            result = json.loads(r.content.decode('UTF-8'))

            # unpack the results
            data, unit = self.unpack(result)

            # test
            assert unit == origin_unit
            # loop over the two dictionaries for comparison
            # While not assuming that the keys auto match
            for k, v in data.items():
                t = k, origin_results[k], v
                assert t[2] == pytest.approx(t[1])

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
                dimType = parts[0]
                vizType = parts[1]
                year = [parts[2]]
                results[parts[6]] = float(parts[9])
                unit[parts[8]] = parts[7]

            # clean (only single element for list depending on vizType)
            if len(nodesReg) > len(set(nodesReg)):
                regions = set(nodesReg)
                nodesReg = list(regions)
            if len(nodesSec) > len(set(nodesSec)):
                sectors = set(nodesSec)
                nodesSec = list(sectors)

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

    def unpack(self, json_response):
        result = json_response["rawResultData"]
        cleaned_result = ast.literal_eval(result)
        data = cleaned_result["rawResultData"]
        unit = cleaned_result["unit"]
        return data, unit
