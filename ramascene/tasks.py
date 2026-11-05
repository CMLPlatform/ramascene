from .models import Job
import logging
import json
import numpy as np
from celery import shared_task
from ramascene import querymanagement
from ramascene.analyze import Analyze
from ramascene.modelling import Modelling

log = logging.getLogger(__name__)


def complete_job(job_id, json_data, celery_id):
    """Store the calculation result on the job and mark it completed.

    Args:
        job_id (int): job id
        json_data (str): JSON string returned by the analysis route
        celery_id (str): Celery task id
    """
    job = Job.objects.get(pk=job_id)
    log.debug("Completed job_name=%s", job.name)
    job.celery_id = celery_id
    job.result = json.loads(json_data)
    job.status = "completed"
    job.save()
    return job


def fail_job(job_id):
    """Mark the job as failed."""
    Job.objects.filter(pk=job_id).update(status="failed")


def default_handler(job_name, job_id, ready_query_selection, query_selection):
    """invokes Celery function.

    Handler for invoking Celery method.

    Args:
        job_name (str): the name of the job
        job_id (int): the id of the job
        ready_query_selection (dict): the query_selection preprocessed (only needs convertion to numpy array)
        query_selection (dict): the original query_selection used for aggregations at later stage

    """
    # 1: allocate to queue according to model_details 2: first invoke the calculations, 3: second send ws message complete
    if "model_details" in query_selection:
        execute_calc.apply_async((job_name, job_id, ready_query_selection, query_selection)
                                 , queue='modelling')
    else:
        execute_calc.apply_async((job_name, job_id, ready_query_selection, query_selection)
                                 , queue='calc_default')


@shared_task
def execute_calc(job_name, job_id, ready_query_selection, query_selection):
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
                L = querymanagement.get_numpy_objects(query_selection["year"], "L", mmap=True)
            # instantiate Analyze class
            p2 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, query_selection, idx_units,
                         job_name, job_id, s_country_idx, Y, B, L)
            # invoke method for route 2 calculations
            json_data = p2.route_two()
            # Change task status to completed
            complete_job(job_id, json_data, execute_calc.request.id)
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
                L = querymanagement.get_numpy_objects(query_selection["year"], "L", mmap=True)
            # instantiate Analyze class
            p3 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, query_selection, idx_units,
                         job_name, job_id, s_country_idx, Y, B, L)
            # invoke method for route 3 calculations
            json_data = p3.route_three()
            # Change task status to completed
            complete_job(job_id, json_data, execute_calc.request.id)
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
                L = querymanagement.get_numpy_objects(query_selection["year"], "L", mmap=True)
            # instantiate Analyze class
            p1 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, query_selection, idx_units,
                         job_name, job_id, s_country_idx, Y, B, L)
            # invoke method for route 4 calculations
            json_data = p1.route_one()
            # Change task status to completed
            complete_job(job_id, json_data, execute_calc.request.id)
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
                L = querymanagement.get_numpy_objects(query_selection["year"], "L", mmap=True)
            # instantiate Analyze class
            p4 = Analyze(product_calc_indices, country_calc_indices, indicator_calc_indices, query_selection, idx_units,
                         job_name, job_id, s_country_idx, Y, B, L)
            # invoke method for route 4 calculations
            json_data = p4.route_four()
            # Change task status to completed
            complete_job(job_id, json_data, execute_calc.request.id)
            # save the json result to the celery result database
            return json_data
        else:
            fail_job(job_id)
            log.debug("Failed job_id=%s: no route matched", job_id)

    except Exception:
        fail_job(job_id)
        log.exception("Job %s failed", job_id)

