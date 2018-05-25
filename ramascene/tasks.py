
from channels.layers import get_channel_layer
from .models import Job
import logging
import json
import numpy as np
from asgiref.sync import AsyncToSync
from celery import shared_task
from ramascene.data import Y_data
from ramascene import querymanagement
from ramascene.models import Indicator
from ramascene.analyze import Analyze

log = logging.getLogger(__name__)


def async_send(channel_name, job):
    """Send job completion message to front-end.

    uses the channel_name and Job object.

    Args:
        channel_name (object): websocket channel name
        job (object): model object of the job
    """
    channel_layer = get_channel_layer()

    AsyncToSync(channel_layer.send)(
            channel_name,
            {"type": "celery.message",
                "text": json.dumps({
                "action": "completed",
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


def calcOneHandler(job_name,job_id, channel_name, ready_querySelection, querySelection):
    """invokes Celery function.

    Handles Celery delay method.

    Args:
        job_name (str): the name of the job
        job_id (int): the id of the job
        channel_name (object): the websocket channel name
        ready_querySelection (dict): the querySelection preprocessed (only needs convertion to numpy array)
        querySelection (dict): the original querySelection used for aggregations at later stage
    Returns:
        Retrieves the celery ID when completed

    """
    myTask = calcOne.delay(job_name,job_id, channel_name, ready_querySelection, querySelection)
    return myTask


@shared_task
def calcOne(job_name,job_id, channel_name, ready_querySelection, querySelection):
    """
    Performs calculations  as a Celery  Task.
    """
    # retrieve calculation ready indices
    product_calc_indices = ready_querySelection["nodesSec"]
    country_calc_indices = ready_querySelection["nodesReg"]
    indicator_calc_indices = ready_querySelection["extn"]

    # retrieve the units on which the calculation is based
    indicators = querySelection["extn"]
    idx_units = {}
    for idx in indicators:
        idx_unit = (Indicator.objects.values_list('unit', flat=True).get(global_id=idx))
        idx_name = (Indicator.objects.values_list('name', flat=True).get(global_id=idx))
        idx_units[idx_name] = idx_unit

    # sort and convert to numpy array
    product_calc_indices, country_calc_indices, \
    indicator_calc_indices = querymanagement.convert_to_numpy(product_calc_indices,country_calc_indices,
                                                            indicator_calc_indices)

    # set constant for country selling product ("total")
    s_country_idx = np.arange(0, 49)
    # Try calculations for Analyzing part of the application
    # TODO check if user is in analyze or modeling stage
    try:
        # selection state No 2:  - country of consumption - multiple select
        if querySelection["vizType"] == "GeoMap" and querySelection["dimType"] == "Consumption":
            # instantiate Analyze class
            p2 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, querySelection,idx_units,
                job_name, job_id, s_country_idx, Y_data)
            # invoke method for route 2 calculations
            json_data = p2.route_two()
            # Change task status to completed
            job = job_update(job_id)
            # send the websocket message "task_status: completed"
            async_send(channel_name, job)
            # save the json result to the celery result database
            return json_data

        # selection state No 3: - country where emission takes place - multiple select
        elif querySelection["vizType"] == "GeoMap" and querySelection["dimType"] == "Production":
            # instantiate Analyze class
            p3 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, querySelection, idx_units,
                         job_name, job_id, s_country_idx, Y_data)
            # invoke method for route 3 calculations
            json_data = p3.route_three()
            # Change task status to completed
            job = job_update(job_id)
            # send the websocket message "task_status: completed"
            async_send(channel_name, job)
            # save the json result to the celery result database
            return json_data

        # selection state No 1: - consumed products - multiple select
        elif querySelection["vizType"] == "TreeMap" and querySelection["dimType"] == "Consumption":
            # instantiate Analyze class
            p1 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, querySelection, idx_units,
                         job_name, job_id, s_country_idx, Y_data)
            # invoke method for route 4 calculations
            json_data = p1.route_one()
            # Change task status to completed
            job = job_update(job_id)
            # send the websocket message "task_status: completed"
            async_send(channel_name, job)
            # save the json result to the celery result database
            return json_data

        # selection state No 4: - sector where emission takes place - multiple select
        elif querySelection["vizType"] == "TreeMap" and querySelection["dimType"] == "Production":
            # instantiate Analyze class
            p4 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, querySelection, idx_units,
                         job_name, job_id, s_country_idx, Y_data)
            # invoke method for route 4 calculations
            json_data = p4.route_four()
            # Change task status to completed
            job = job_update(job_id)
            # send the websocket message "task_status: completed"
            async_send(channel_name, job)
            # save the json result to the celery result database
            return json_data
        else:
            job = Job.objects.get(pk=job_id)
            job.status = "Failed"
            async_send(channel_name, job)
            log.debug("Failed job_name=%s",job.name)
    except Exception as e:
        job = Job.objects.get(pk=job_id)
        job.status = "Failed"
        async_send(channel_name, job)
        log.debug("Failed job_name=%s", e)
        print(e)



