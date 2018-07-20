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
            if data["action"] == "default" or data["action"] == "model" or data["action"] == "start_calc":

                # get query
                query_selection = data["querySelection"]
                # TODO remove temporary year setting after fron-end update and then use the year query selection
                # get year
                if not 'year' in query_selection.keys():
                    year = 2011
                    query_selection.update({"year": year})
                else:
                    # TODO this piece of code should not be removed after the front-end update
                    # as we always get an array, we need to get the first value from the query,
                    # In future "actions" this might differ and we allow multiple years or multiple indicators
                    year = query_selection["year"][0]
                    # update the query_selection to only contain a single value
                    query_selection.update({'year': year})
                info_query_selection = query_selection.copy()
                ready_query_selection = query_selection.copy()

                if data["action"] == "model":
                    model_details = (data["model_details"])
                    # update the original year selected with a .1 so we can differentiate with model year
                    model_year = year + .1
                    origin_regions = []
                    consumed_regions = []
                    products = []
                    # update the year of the query selection to a model year (2011.1)
                    for intervention in model_details:
                        # for each modeling change retrieve the details (global ids)
                        product = intervention["product"]
                        origin_reg = intervention["originReg"]
                        consumed_reg = intervention["consumedReg"]
                        name_origin_reg = querymanagement.get_names_country(origin_reg)
                        name_consumed_reg = querymanagement.get_names_country(consumed_reg)
                        name_product  = querymanagement.get_names_product(product)
                        origin_regions.append(name_origin_reg)
                        consumed_regions.append(name_consumed_reg)
                        products.append(name_product)

                    info_query_selection.update({'originReg': origin_regions, 'comsumedReg':consumed_regions
                                                     ,'product': products, 'techChange': intervention["techChange"],
                                                 'year':model_year})
                    # as the full data object is not send to Celery, insert model_details into the queryseleciton
                    query_selection.update({'model_details': model_details})
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

                # return websocket response
                await self.ws_response(job, "calc_default")

                # prepare for Celery handler
                product_calc_indices = querymanagement.get_leafs_product(query_selection["nodesSec"])
                country_calc_indices = querymanagement.get_leafs_country(query_selection["nodesReg"])

                # set offset for indicator/extension, so prepare for default handler
                indicator_calc_indices = querymanagement.clean_indicators(query_selection["extn"])

                # querySelection ready for calculations
                ready_query_selection.update({'nodesSec': product_calc_indices, 'nodesReg': country_calc_indices,
                                             'extn': indicator_calc_indices})
                # call default handler
                default_handler(job_name, job.id, self.channel_name, ready_query_selection, query_selection)
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
        """
        Update and save the job status to started
        """
        job = Job(
            name=job_name,
            status="started",
        )
        job.save()
        return job

    async def ws_response(self,job, queue_name):
        """
        Sends web socket response that the job is started
        """
        #If REDIS is used as broker, we check how long the queue length is
        if REDIS_FOR_CELERY:
            import redis
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
            "queue_length": str(length),
        })})