from channels.testing import WebsocketCommunicator
from ramascene.consumers import RamasceneConsumer
import pytest
from django.core.management import call_command

# waiting time for celery results
TIMEOUT = 100

@pytest.fixture()
def resource():
    print("setup")
    call_command('populateHierarchies', verbosity=0)
    yield "resource"
    print("teardown")

@pytest.mark.django_db(transaction=True)
class TestConnect:
    """
    This class tests the websocket API
    It runs outside of the standard django tests, but uses pytest
    """


    @pytest.mark.asyncio
    async def test_my_consumer(self, resource):
        communicator = WebsocketCommunicator(RamasceneConsumer, "/ramascene/")

        # test connection
        connected, subprotocol = await communicator.connect()
        assert connected
        # check if it's accepting connections
        response = await communicator.receive_json_from(timeout=TIMEOUT)
        assert response["type"] == "websocket.accept"

        # Test sending json queries
        await communicator.send_json_to({"action":"model","querySelection":{"dimType":"Consumption",
  "vizType":"GeoMap","nodesSec":[77],"nodesReg":[6],"extn":[2],"year":[2011]},
  "model_details":[
        {
            "product": [1],
            "originReg": [10],
            "consumedBy": [276],
            "consumedReg": [10],
            "techChange": [100]
        },
        {
            "product": [1],
            "originReg": [10],
            "consumedBy": [76],
            "consumedReg": [10],
            "techChange": [-100]
        },
    ]})
        # get the result and see if the stop has started
        response = await communicator.receive_json_from(timeout=TIMEOUT)
        assert response["job_status"] == "started"

        # get the final results of a finished tasks
        response = await communicator.receive_json_from(timeout=TIMEOUT)
        assert response["job_status"] == "completed"

        # Close connection
        await communicator.disconnect()
        print("ok")

