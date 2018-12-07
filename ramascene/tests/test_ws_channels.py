from channels.testing import WebsocketCommunicator
from ramascene.consumers import RamasceneConsumer
import pytest
from django.core.management import call_command

@pytest.fixture()
def resource():
    print("setup")
    call_command('populateHierarchies', verbosity=0)
    yield "resource"
    print("teardown")

@pytest.mark.django_db(transaction=True)
class TestConnect:


    @pytest.mark.asyncio
    async def test_my_consumer(self, resource):
        communicator = WebsocketCommunicator(RamasceneConsumer, "/ramascene/")
        connected, subprotocol = await communicator.connect()

        assert connected
        # Test sending json
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
        response = await communicator.receive_json_from()
        assert response["job_status"] == "started"
        # Close
        await communicator.disconnect()
        print("ok")
