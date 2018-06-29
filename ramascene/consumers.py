import json
import logging
from .models import Job
from .tasks import default_handler
from channels.consumer import AsyncConsumer
from ramascene import querymanagement
import asyncio
from ramasceneMasterProject.settings import REDIS_FOR_CELERY

log = logging.getLogger(__name__)


class RamasceneConsumer(AsyncConsumer):
    """
    This  class  represents  the  Django  Channels  web  socket  interface  functionality.
    """
    async def websocket_connect(self, event):
        """
        websocket first connection, accept immediately
        """
        print("Connected")
        print(event)
        print(self.channel_name)
        await self.send({
            "type": "websocket.accept",
        })

    async def websocket_receive(self, event):
        """Receives message from front-end.

            Tries to parse the message, if successful it will perform pre-processing steps and invokes Celery tasks.

            Args:
                event (dict): message from front-end

        """

        try:
            data = json.loads(event['text'])
            # if action message from front-end is inside payload
            if data["action"] == "default" or data["action"] == "model":
                # get query
                query_selection = data["querySelection"]
                info_query_selection = query_selection.copy()
                ready_query_selection = query_selection.copy()
                if data["action"] == "model":
                    model_details = (data["model_details"])
                    for intervention in model_details:
                        #for each modeling change retrieve the details (global ids)
                        product = intervention["product"]
                        model_perspective = intervention["consumedBy"]
                        origin_reg = intervention["originReg"]
                        consumed_reg = intervention["consumedReg"]
                        tech_change = intervention["techChange"]

                        name_origin_reg = querymanagement.get_names_country(origin_reg)
                        name_consumed_reg = querymanagement.get_names_country(consumed_reg)
                        name_product  = querymanagement.get_names_product(product)
                        #WS response as job_name should now include the modeling details
                        info_query_selection.update({'originReg': name_origin_reg, 'comsumedReg':name_consumed_reg
                                                     ,'product': name_product, 'techChange': tech_change})

                # clean query for info or alternatively said job_name
                names_products = querymanagement.get_names_product(query_selection["nodesSec"])
                names_countries = querymanagement.get_names_country(query_selection["nodesReg"])
                name_indicator = querymanagement.get_names_indicator(query_selection["extn"])

                info_query_selection.update({'nodesSec': names_products, 'nodesReg': names_countries,
                                             'extn': name_indicator})

                job_name = info_query_selection
                log.debug("job Name=%s", job_name)

                # Save model to our database
                job = await self.save_job(job_name)

                #return websocket response
                await self.ws_response(job)

                # get query objects that need to be made ready for calculations
                my_received_product_global_ids = query_selection["nodesSec"]
                my_received_country_global_ids = query_selection["nodesReg"]
                my_received_indicator_global_ids = query_selection["extn"]

                # prepare for Celery handler
                product_calc_indices, country_calc_indices = \
                    querymanagement.get_leafs(my_received_product_global_ids, my_received_country_global_ids)

                # set offset for indicator/extension, so prepare for default handler
                indicator_calc_indices = querymanagement.clean_indicators(my_received_indicator_global_ids)

                # querySelection ready for calculations
                ready_query_selection.update({'nodesSec': product_calc_indices, 'nodesReg': country_calc_indices,
                                             'extn': indicator_calc_indices})
                # call default handler
                default_handler(job_name, job.id, self.channel_name, ready_query_selection, query_selection)
            elif data["action"] == "timeseries":
                print("Timeseries is called...")
                # TODO 1)abstract to functions the websocket messaging and saving a job (see action "default" ex.)
                # For this make an async function and make sure that what you call in websocket_receive has await before
                # e.g. await save_job() and await send_start_message
                # also add the celery queue times test there, we might can use it to update users.
                # TODO 2)Adjust action "default" function to call these functions as well as in timeseries
                # TODO 3)check querySelection perspective
                # TODO 4)and delegate to a new handler called ts_default_handler and new Task calc_ts_default

            # if action is not received
            else:

                data.update({"status": "error wrong input"})

        except Exception as e:
            log.debug("ws message isn't json text=%s", event['text'])
            print("error: " + str(e))
            return

    async def websocket_disconnect(self, message):
        """
        Websocket disconnect function.
        """
        pass

    async def celery_message(self, event):
        """
           Sends Celery task status.
        """
        await asyncio.sleep(0.5)
        await self.send({
            "type": "websocket.send",
            "text": event["text"],
        })

    async def save_job(self, job_name):
        job = Job(
            name=job_name,
            status="started",
        )
        job.save()
        return job

    async def ws_response(self,job):
        #If REDIS is used as broker, we check how long the queue length is
        if REDIS_FOR_CELERY:
            import redis
            queue_name = "celery"
            client = redis.Redis(host="localhost", port=6379, db=1)
            length = client.llen(queue_name)
        else:
            length= "Unavailable"
        # return data
        await self.send({"type": "websocket.send", "text": json.dumps({
            "action": "started",
            "job_id": job.id,
            "job_name": job.name,
            "job_status": job.status,
            "queue_length": str(length)
        })})
