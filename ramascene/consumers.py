import json
import logging
from .models import Job
from .tasks import calcOneHandler
log = logging.getLogger(__name__)
from channels.consumer import AsyncConsumer
from ramascene import querymanagement

"""
This  file  represents  the  Django  Channels  web  socket  interface  functionalities.
"""

class RamasceneConsumer(AsyncConsumer):
    #websocket first connection, accept immediately
    async def websocket_connect(self, event):
        print("Connected")
        print(event)
        print(self.channel_name)
        await self.send({
            "type": "websocket.accept",
        })

    async def websocket_receive(self, event):


        try:
            data = json.loads(event['text'])


            #if action message from front-end is inside payload
            if data["action"] == "start_calc":

                #get query
                querySelection = data["querySelection"]
                info_querySelection = querySelection.copy()
                ready_querySelection = querySelection.copy()

                #clean query for info or alternatively said job_name
                namesProducts, namesCountries, nameIndicator = querymanagement.get_names(querySelection["nodesSec"],
                                                                          querySelection["nodesReg"], querySelection["extn"])

                info_querySelection.update({'nodesSec': namesProducts, 'nodesReg': namesCountries, 'extn':nameIndicator})
                job_name = info_querySelection
                log.debug("job Name=%s", job_name)

                # Save model to our database
                job = Job(
                    name=job_name,
                    status="started",
                )
                job.save()

                # return data
                await self.send({"type": "websocket.send", "text": json.dumps({
                    "action": "started",
                    "job_id": job.id,
                    "job_name": job.name,
                    "job_status": job.status,
                })})

                #get query objects that need to be made ready for calculations
                my_received_product_global_ids = querySelection["nodesSec"]
                my_received_country_global_ids = querySelection["nodesReg"]
                my_received_indicator_global_ids = querySelection["extn"]

                #prepare for Celery handler
                product_calc_indices, country_calc_indices = \
                    querymanagement.get_leafs(my_received_product_global_ids, my_received_country_global_ids)

                #set offset for indicator/extension, so prepare for calcOnehandler
                indicator_calc_indices = querymanagement.clean_indicators(my_received_indicator_global_ids)

                #querySelection ready for calculations
                ready_querySelection.update({'nodesSec': product_calc_indices, 'nodesReg': country_calc_indices,
                                             'extn':indicator_calc_indices})

                #call Tasks
                my_task = calcOneHandler(job_name, job.id, self.channel_name, ready_querySelection, querySelection)
                #save the task in Job model object
                job.celery_id = my_task.id
                job.save()

            #if action is not received
            else:
                data.update({"status": "error wrong input"})


        except Exception as e:
            log.debug("ws message isn't json text=%s", event['text'])

            return

    async def websocket_disconnect(self, message):
        #disconnection of web socket
        pass

    async def celery_message(self, event):
        await self.send({
            "type": "websocket.send",
            "text": event["text"],
        })

