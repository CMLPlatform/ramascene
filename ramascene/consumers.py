import json
import logging
from .models import Job
from .tasks import default_handler
from channels.generic.websocket import JsonWebsocketConsumer
from channels.exceptions import StopConsumer
from ramascene import querymanagement
import time

log = logging.getLogger(__name__)


class RamasceneConsumer(JsonWebsocketConsumer):
    """
    This  class  represents  the  Django  Channels  web  socket  interface  functionality.
    """
    def websocket_connect(self, event):
        """
        websocket first connection, accept immediately
        """
        self.connect()
        self.send_json({
            "type": "websocket.accept",
        })

    def websocket_receive(self, event):
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

                # as we always get an array from the API, we need to get the first value from the query,
                # In future versions this might differ and we allow multiple years or multiple indicators
                year = query_selection["year"][0]

                # update the query_selection to only contain a single value
                query_selection.update({'year': year})

                info_query_selection = query_selection.copy()
                ready_query_selection = query_selection.copy()

                if data["action"] == "model":
                    model_details = data["model_details"]
                    # update the original year selected with a .1 so we can differentiate with model year
                    model_year = "Scenario year:"+str(year)

                    # boolean elements in list to determine if we need to load in the A matrix
                    load_A = []
                    identifiers = []
                    names_origin_regions = []
                    names_consumed_regions = []
                    names_products = []
                    names_consumed_by_products = []
                    origin_regions = []
                    consumed_regions = []
                    products = []
                    consumed_by_products = []
                    tech_changes = []
                    # update the year of the query selection to a model year (2011.1)
                    for intervention in model_details:
                        # for each modeling change retrieve the details (global ids)
                        name_origin_reg = \
                            querymanagement.get_names_country(intervention["originReg"])
                        name_consumed_reg = \
                            querymanagement.get_names_country(intervention["consumedReg"])
                        name_product  = \
                            querymanagement.get_names_product(intervention["product"])
                        name_consumed_by_products = \
                            querymanagement.get_modelled_names_product(intervention["consumedBy"])
                        names_origin_regions.append(name_origin_reg)
                        names_consumed_regions.append(name_consumed_reg)
                        names_products.append(name_product)
                        names_consumed_by_products.append(name_consumed_by_products)

                        tech_change = intervention["techChange"]

                        # get calculation ready indices explicitly
                        calc_ready_product = querymanagement.get_leafs_product(intervention["product"])
                        calc_ready_origin_reg = querymanagement.get_leafs_country(intervention["originReg"])
                        calc_ready_consumed_reg = querymanagement.get_leafs_country(intervention["consumedReg"])
                        calc_ready_consumed_by_products = querymanagement.get_leafs_modelled_product(intervention["consumedBy"])
                        origin_regions.append(calc_ready_origin_reg)
                        consumed_regions.append(calc_ready_consumed_reg)
                        products.append(calc_ready_product)
                        consumed_by_products.append(calc_ready_consumed_by_products)
                        tech_changes.append(tech_change)
                        # as optimisation step check if there is any modelling query that needs the A matrix
                        identifier = querymanagement.identify_modelling_product(intervention["consumedBy"][0])
                        identifiers.append(identifier)
                        # if the identifier returns FINALCONSUMPTION it is for final demand modelling
                        # if the identifier also returns others, we need to load in A instead of default L matrix
                        if identifier != "FINALCONSUMPTION":
                            # explicitly append
                            load_A.append(True)
                        else:
                            load_A.append(False)


                    info_query_selection.update({'originReg': names_origin_regions, 'consumedReg':names_consumed_regions
                                                     ,'product': names_products, 'techChange': tech_changes,
                                                 'year':model_year, 'consumedBy': names_consumed_by_products})

                    ready_query_selection.update({'originReg': origin_regions, 'consumedReg':consumed_regions
                                                     ,'product': products, 'techChange': tech_changes,
                                                 'year':year, 'consumedBy': consumed_by_products, 'identifiers':
                                                  identifiers})
                    # as the full data object is not send to Celery, insert model_details into the queryseleciton
                    query_selection.update({'model_details': model_details, 'load_A': load_A})

                # clean query for info (job_name)
                names_products = \
                    querymanagement.get_names_product(query_selection["nodesSec"])
                names_countries = \
                    querymanagement.get_names_country(query_selection["nodesReg"])
                name_indicator = querymanagement.get_names_indicator(query_selection["extn"])

                info_query_selection.update({'nodesSec': names_products, 'nodesReg': names_countries,
                                             'extn': name_indicator})

                job_name = info_query_selection
                log.debug("job Name=%s", job_name)

                # Save model to our database
                job = self.save_job(job_name)

                # return websocket response
                self.ws_response(job)

                # prepare for Celery handler
                product_calc_indices = \
                    querymanagement.get_leafs_product(query_selection["nodesSec"])
                country_calc_indices = \
                    querymanagement.get_leafs_country(query_selection["nodesReg"])

                # set offset for indicator/extension
                indicator_calc_indices = \
                    querymanagement.clean_indicators(query_selection["extn"])

                idx_units = \
                    querymanagement.get_indicator_units(query_selection["extn"])
                # querySelection ready for calculations
                ready_query_selection.update({'nodesSec': product_calc_indices, 'nodesReg': country_calc_indices,
                                             'extn': indicator_calc_indices, 'idx_units': idx_units})

                # call default handler
                default_handler(job_name, job.id, self.channel_name, ready_query_selection, query_selection)
            # if action is not received
            else:
                data.update({"status": "error wrong input"})

        except Exception as e:
            log.debug("Error during handling websocket message=%s", event['text'])
            log.debug("Error is related to: %s", e)
            return

    def websocket_disconnect(self, message):
        """
        Websocket disconnect function.
        """

        self.close()
        raise StopConsumer()

    def celery_message(self, event):
        """
           Sends Celery task status.
        """

        time.sleep(0.5)
        test = json.loads(event["text"])
        self.send_json(test)
        # gracefully shutdown connection
        self.websocket_disconnect(0)

    def save_job(self, job_name):
        """
        Update and save the job status to started
        """
        job = Job(
            name=job_name,
            status="started",
        )
        job.save()
        return job

    def ws_response(self,job):
        """
        Sends web socket response that the job is started
        """
        # return data
        self.send_json({
            "action": "started",
            "job_id": job.id,
            "job_name": job.name,
            "job_status": job.status,
        })