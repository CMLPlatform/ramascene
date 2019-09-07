from channels.layers import get_channel_layer
from .models import Job
import logging
import json
import numpy as np
from asgiref.sync import AsyncToSync
from celery import shared_task
from ramascene import querymanagement
from ramascene.analyze import Analyze
from ramascene.modelling import Modelling

log = logging.getLogger(__name__)


def async_send(channel_name, job):
    """Send job message to front-end.

    uses the channel_name and Job object. Send success or failure status.

    Args:
        channel_name (object): websocket channel name
        job (object): model object of the job
    """
    channel_layer = get_channel_layer()

    AsyncToSync(channel_layer.send)(
        channel_name,
        {"type": "celery.message",
         "text": json.dumps({
             "action": "check status",
             "job_id": job.id,
             "job_name": job.name,
             "job_status": job.status,
         })
         })


def job_update(job_id):
    """Update job status to completion.

    Update the job status by reference job id.
    Args:
        job_id (int): job id
    """
    # Change task status to completed
    job = Job.objects.get(pk=job_id)
    log.debug("Running job_name=%s", job.name)
    job.status = "completed"
    job.save()
    return job


def default_handler(job_name, job_id, channel_name, ready_query_selection, query_selection):
    """invokes Celery function.

    Handler for invoking Celery method.

    Args:
        job_name (str): the name of the job
        job_id (int): the id of the job
        channel_name (object): the websocket channel name
        ready_query_selection (dict): the query_selection preprocessed (only needs convertion to numpy array)
        query_selection (dict): the original query_selection used for aggregations at later stage

    """
    # 1: allocate to queue according to model_details 2: first invoke the calculations, 3: second send ws message complete
    if "model_details" in query_selection:
        execute_calc.apply_async((job_name, job_id, channel_name, ready_query_selection, query_selection)
                                 , queue='modelling')
    else:
        execute_calc.apply_async((job_name, job_id, channel_name, ready_query_selection, query_selection)
                                 , queue='calc_default')


@shared_task
def execute_calc(job_name, job_id, channel_name, ready_query_selection, query_selection):
    """
    Performs calculations  as a Celery  Task.
    """

    # retrieve calculation and indicator ready indices and sort and convert to numpy array
    product_calc_indices = querymanagement.convert_to_numpy(ready_query_selection["nodesSec"])
    country_calc_indices = querymanagement.convert_to_numpy(ready_query_selection["nodesReg"])
    indicator_calc_indices = querymanagement.convert_to_numpy(ready_query_selection["extn"])
    idx_units = ready_query_selection["idx_units"]
    # retrieve standard matrix
    B = querymanagement.get_numpy_objects(query_selection["year"], "B")
    # set constant for country selling product ("total")
    s_country_idx = np.arange(0, 49)
    try:
        # selection state No 2:  - country of consumption - multiple select
        if query_selection["vizType"] == "Geographic" and query_selection["dimType"] == "Contribution":
            # if there are model_details
            if "model_details" in query_selection:
                Y_data = querymanagement.get_numpy_objects(query_selection["year"], "Y")

                model = Modelling(ready_query_selection, Y_data, query_selection["load_A"],
                                  query_selection["year"], query_selection["model_details"])
                Y, L = model.apply_model()
            else:
                Y = querymanagement.get_numpy_objects(query_selection["year"], "Y")
                L = querymanagement.get_numpy_objects(query_selection["year"], "L")
            # instantiate Analyze class
            p2 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, query_selection, idx_units,
                         job_name, job_id, s_country_idx, Y, B, L)
            # invoke method for route 2 calculations
            json_data = p2.route_two()
            # Change task status to completed
            job_update(job_id)
            handle_complete(job_id, channel_name, execute_calc.request.id)
            # save the json result to the celery result database
            return json_data

        # selection state No 3: - country where emission takes place - multiple select
        elif query_selection["vizType"] == "Geographic" and query_selection["dimType"] == "Hotspot":
            # if there are model_details
            if "model_details" in query_selection:
                Y_data = querymanagement.get_numpy_objects(query_selection["year"], "Y")

                model = Modelling(ready_query_selection, Y_data, query_selection["load_A"],
                                  query_selection["year"], query_selection["model_details"])
                Y, L = model.apply_model()
            else:
                Y = querymanagement.get_numpy_objects(query_selection["year"], "Y")
                L = querymanagement.get_numpy_objects(query_selection["year"], "L")
            # instantiate Analyze class
            p3 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, query_selection, idx_units,
                         job_name, job_id, s_country_idx, Y, B, L)
            # invoke method for route 3 calculations
            json_data = p3.route_three()
            # Change task status to completed
            job_update(job_id)
            handle_complete(job_id, channel_name, execute_calc.request.id)
            # save the json result to the celery result database
            return json_data

        # selection state No 1: - consumed products - multiple select
        elif query_selection["vizType"] == "Sectoral" and query_selection["dimType"] == "Contribution":
            # if there are model_details
            if "model_details" in query_selection:
                Y_data = querymanagement.get_numpy_objects(query_selection["year"], "Y")

                model = Modelling(ready_query_selection, Y_data, query_selection["load_A"],
                                  query_selection["year"], query_selection["model_details"])
                Y, L = model.apply_model()
            else:
                Y = querymanagement.get_numpy_objects(query_selection["year"], "Y")
                L = querymanagement.get_numpy_objects(query_selection["year"], "L")
            # instantiate Analyze class
            p1 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, query_selection, idx_units,
                         job_name, job_id, s_country_idx, Y, B, L)
            # invoke method for route 4 calculations
            json_data = p1.route_one()
            # Change task status to completed
            job_update(job_id)
            handle_complete(job_id, channel_name, execute_calc.request.id)
            # save the json result to the celery result database
            return json_data

        # selection state No 4: - sector where emission takes place - multiple select
        elif query_selection["vizType"] == "Sectoral" and query_selection["dimType"] == "Hotspot":
            # if there are model_details
            if "model_details" in query_selection:
                Y_data = querymanagement.get_numpy_objects(query_selection["year"], "Y")

                model = Modelling(ready_query_selection, Y_data, query_selection["load_A"],
                                  query_selection["year"], query_selection["model_details"])
                Y, L = model.apply_model()
            else:
                Y = querymanagement.get_numpy_objects(query_selection["year"], "Y")
                L = querymanagement.get_numpy_objects(query_selection["year"], "L")
            # instantiate Analyze class
            p4 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, query_selection, idx_units,
                         job_name, job_id, s_country_idx, Y, B, L)
            # invoke method for route 4 calculations
            json_data = p4.route_four()
            # Change task status to completed
            job_update(job_id)
            handle_complete(job_id, channel_name, execute_calc.request.id)
            # save the json result to the celery result database
            return json_data
        else:
            job = Job.objects.get(pk=job_id)
            job.status = "Failed"
            async_send(channel_name, job)
            log.debug("Failed job_name=%s", job.name)

    except Exception as e:
        job = Job.objects.get(pk=job_id)
        job.status = "Failed"
        async_send(channel_name, job)
        log.debug("Failed job_name=%s", e)
        print("failed at:" + str(e))


def handle_complete(job_id, channel_name, celery_id):
    """
    Handle a successful Celery  Task.
    """
    # get the job model by primary key
    job = Job.objects.get(pk=job_id)
    job.celery_id = celery_id
    job.save()
    # send final complete message
    async_send(channel_name, job)
