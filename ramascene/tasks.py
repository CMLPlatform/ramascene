import string

from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from channels.layers import get_channel_layer
from ramasceneMasterProject.celery import app
from time import sleep
from .models import Job
import logging
import json
from ramasceneMasterProject.settings import PROJECT_ROOT
import os
import numpy as np
log = logging.getLogger(__name__)
from asgiref.sync import AsyncToSync
from celery import shared_task

from ramascene.data import B_data,L_data,Y_data
from ramascene import productindexmanger as pim
from ramascene import querymanagement
from ramascene.models import Indicator

def async_send(channel_name, job):
    """
    Sends task message to the front-end.
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


def calcOneHandler(job_name,job_id, channel_name, ready_querySelection, querySelection):
    """
    Invokes Celery function.
    """
    myTask = calcOne.delay(job_name,job_id, channel_name, ready_querySelection, querySelection)
    return myTask

@shared_task
def calcOne(job_name,job_id, channel_name, ready_querySelection, querySelection):
    """
    Performs calculations  as a Celery  Task.
    """
    #retrieve calculation ready indices
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
    #sort and convert to numpy array
    product_calc_indices, country_calc_indices, \
    indicator_calc_indices = querymanagement.convert_to_numpy(product_calc_indices,country_calc_indices,
                                                            indicator_calc_indices)


    #set constant for country selling product ("total")
    s_country_idx = np.arange(0, 49)
    ####Try calculations
    try:
        #switch case
        ###############################################################################
        #                                                                             #
        # selection state No 2:                                                       #
        #   - country of consumption - multiple select                                #
        #   - consumed products - single select                                       #
        #   - country where emission takes place - single select                      #
        #   - country selling product - single select                                 #
        #   - sector where emission takes place - single select                       #
        #   - indicator of interest - single select                                   #
        #                                                                             #
        ###############################################################################

        if querySelection["vizType"] == "GeoMap" and querySelection["dimType"] == "Consumption":
            print("state 2")
            p_product_idx = np.arange(0,200)
            p_country_idx = np.arange(0,49)

            # Expand selected ranges
            ids = pim.ProductIndexManager(product_calc_indices, s_country_idx, p_product_idx, p_country_idx)
            full_c_product_idx = ids.get_consumed_product_ids()
            full_p_product_idx = ids.get_produced_product_ids()
            tot_prd_cnt = ids.get_product_count()
            tot_cntr_cnt = ids.get_country_count()
            selected_c_cntr_cnt = len(country_calc_indices)

            # Get data
            Y = Y_data
            L = L_data
            B = B_data

            # Set-up final demand. Select consuming countries and
            # set the non-selected consumed product categories to zero
            Y = Y[:, country_calc_indices]
            mask = np.zeros((tot_cntr_cnt * tot_prd_cnt, selected_c_cntr_cnt), dtype=bool)
            mask[full_c_product_idx, :] = True
            Y[~mask] = 0

            # Calculate total output needed to satisfy the
            # selected final demand of countries
            X = np.dot(L, Y)

            # Select those sectors, regions from B and X
            # that are of interest of the user - single selection
            X = X[full_p_product_idx, :]
            b = B[indicator_calc_indices, :]
            b = b[:, full_p_product_idx]

            # calculate final result
            m = np.dot(b, X)

            # Return dictionary with results. Multiple values, one value
            # for each selected country where consumption takes place
            m = m.flatten()
            result = {}
            for idx, value in np.ndenumerate(country_calc_indices):
                result[value] = m[idx[0]]

            # after calc we expect an dict, we pass that into get_aggregations_xxxx function
            result_as_global_ids = querymanagement.get_aggregations_countries(querySelection, result)

            # invoke with returned object get_calc_names_xxxx function
            result_as_names = querymanagement.get_calc_names_country(result_as_global_ids)

            # Change task status to completed
            job = Job.objects.get(pk=job_id)
            log.debug("Running job_name=%s", job.name)
            job.status = "completed"
            job.save()
            # send the websocket message "task_status: completed"
            async_send(channel_name, job)

            # built json object for saving
            data = {}
            data['job_name'] = job_name
            data['job_id'] = job_id
            data['unit'] = idx_units
            # save the final dict result in rawResultData
            data['rawResultData'] = result_as_names
            json_data = json.dumps(data)
            return json_data


        ###############################################################################
        #                                                                             #
        # selection state No 3:                                                       #
        #   - country of consumption - single select                                  #
        #   - consumed products - single select                                       #
        #   - country where emission takes place - multiple select                    #
        #   - country selling product - single select                                 #
        #   - sector where emission takes place - single select                       #
        #   - indicator of interest - single select                                   #
        #                                                                             #
        ###############################################################################
        elif querySelection["vizType"] == "GeoMap" and querySelection["dimType"] == "Production":
            c_product_idx = np.arange(0,200)
            c_country_idx = np.arange(0,49)

            print("state 3")
            # Expand selected ranges
            ids = pim.ProductIndexManager(c_product_idx, s_country_idx, product_calc_indices, country_calc_indices)
            full_c_product_idx = ids.get_consumed_product_ids()
            full_p_product_idx = ids.get_produced_product_ids()
            tot_prd_cnt = ids.get_product_count()
            tot_cntr_cnt = ids.get_country_count()
            selected_p_prd_cnt = ids.get_selected_p_product_count()
            selected_p_cntr_cnt = ids.get_selected_p_country_count()

            # Get data
            Y = Y_data
            L = L_data
            B = B_data

            # Set-up final demand. Select consuming countries and
            # set the non-selected consumed product categories to zero
            y = np.sum(Y[:, c_country_idx], axis=1, keepdims=True)
            mask = np.zeros((tot_cntr_cnt * tot_prd_cnt, 1), dtype=bool)
            mask[full_c_product_idx, :] = True
            y[~mask] = 0

            # Calculate total output needed to satisfy the
            # selected final demand of countries
            x = np.dot(L, y)

            # Calculate extensions for each selected product
            # Non selected products are simply skipped. M
            # only retains selected sectors and regions of
            # emission
            b = B[indicator_calc_indices, :]
            (row_cnt, col_cnt) = np.shape(b)
            M = np.array([np.multiply(x[prd_idx, 0], b[0, prd_idx]) for prd_idx in full_p_product_idx])
            M = np.transpose(M)

            # Aggregate M per selected country/region
            M = M.reshape(row_cnt, selected_p_cntr_cnt, selected_p_prd_cnt)
            m = np.sum(M, axis=2)

            # Return dictionary with results. Multiple values, one value
            # for each selected country where emission takes place
            m = m.flatten()
            result = {}
            test = {}
            for idx, value in np.ndenumerate(country_calc_indices):
                result[value] = m[idx[0]]
                str_value = str(value)
                test[str_value] = m[idx[0]]

            # after calc we expect an dict, we pass that into get_aggregations_xxxx function
            result_as_global_ids = querymanagement.get_aggregations_countries(querySelection, result)

            # invoke with returned object get_calc_names_xxxx function
            result_as_names = querymanagement.get_calc_names_country(result_as_global_ids)

            # Change task status to completed
            job = Job.objects.get(pk=job_id)
            log.debug("Running job_name=%s", job.name)
            job.status = "completed"
            job.save()
            # send the websocket message "task_status: completed"
            async_send(channel_name, job)

            # built json object for saving
            data = {}
            data['job_name'] = job_name
            data['job_id'] = job_id
            data['unit'] = idx_units
            # save the final dict result in rawResultData
            data['rawResultData'] = result_as_names
            json_data = json.dumps(data)
            return json_data
         # switch case
        ###############################################################################
        #                                                                             #
        # selection state No 1:                                                       #
        #   - country of consumption - single select - aggregate                      #
        #   - consumed products - multiple select                                     #
        #   - country where emission takes place - single select                      #
        #   - country selling product - single select                                 #
        #   - sector where emission takes place - single select                       #
        #   - indicator of interest - single select                                   #
        #                                                                             #
        ###############################################################################
        elif querySelection["vizType"] == "TreeMap" and querySelection["dimType"] == "Consumption":

            p_product_idx = np.arange(0,200)
            p_country_idx = np.arange(0,49)

            # Expand selected ids ranges
            ids = pim.ProductIndexManager(product_calc_indices, s_country_idx, p_product_idx, p_country_idx)
            full_c_product_idx = ids.get_consumed_product_ids()
            full_p_product_idx = ids.get_produced_product_ids()
            selected_s_cntr_cnt = ids.get_selected_s_country_count()
            selected_c_prd_cnt = ids.get_selected_c_product_count()

            # Get data
            Y = Y_data
            L = L_data
            B = B_data

            # Set-up final demand based on selected consuming countries
            # Select and aggregate countries/regions
            y = np.sum(Y[:, country_calc_indices], axis=1, keepdims=True)

            # Calculated total output from every sector associated
            # with the final consumption of every selected product
            # Consumed products not selected are skipped.
            X = np.array([np.multiply(y[idx], L[:, idx]) for idx in full_c_product_idx])
            X = np.transpose(X)

            # Select those sectors and regions from B and X
            # that are of interest to the user - single selection only
            X = X[full_p_product_idx, :]
            b = B[indicator_calc_indices, :]
            b = b[:, full_p_product_idx]

            # Calculate emissions associated with
            # every selected consumed product supplied
            # by each country
            m = np.dot(b, X)

            # Aggregate the emissions based on the
            # country selling final product selection
            m = m.reshape(selected_s_cntr_cnt, selected_c_prd_cnt)
            m = np.sum(m, axis=0)

            # Return dictionary with results. Multiple values, one value
            # for each product that is consumed
            m = m.flatten()
            result = {}
            for idx, value in np.ndenumerate(product_calc_indices):
                result[value] = m[idx[0]]

            # after calc we expect an dict, we pass that into get_aggregations_xxxx function
            result_as_global_ids = querymanagement.get_aggregations_products(querySelection, result)

            # invoke with returned object get_calc_names_xxxx function
            result_as_names = querymanagement.get_calc_names_product(result_as_global_ids)

            # Change task status to completed
            job = Job.objects.get(pk=job_id)
            log.debug("Running job_name=%s", job.name)
            job.status = "completed"
            job.save()
            # send the websocket message "task_status: completed"
            async_send(channel_name, job)

            # built json object for saving
            data = {}
            data['job_name'] = job_name
            data['job_id'] = job_id
            data['unit'] = idx_units
            # save the final dict result in rawResultData
            data['rawResultData'] = result_as_names
            json_data = json.dumps(data)
            return json_data
         # switch case
        ###############################################################################
        #                                                                             #
        # selection state No 4:                                                       #
        #   - country of consumption - single select                                  #
        #   - consumed products - single select                                       #
        #   - country where emission takes place - single select                      #
        #   - country selling product - single select                                 #
        #   - sector where emission takes place - multiple select                     #
        #   - indicator of interest - single select                                   #
        #                                                                             #
        ###############################################################################
        elif querySelection["vizType"] == "TreeMap" and querySelection["dimType"] == "Production":
            c_product_idx = np.arange(0, 200)
            c_country_idx = np.arange(0, 49)

            # Expand selected ranges
            ids = pim.ProductIndexManager(c_product_idx, s_country_idx, product_calc_indices, country_calc_indices)
            full_c_product_idx = ids.get_consumed_product_ids()
            full_p_product_idx = ids.get_produced_product_ids()
            tot_prd_cnt = ids.get_product_count()
            tot_cntr_cnt = ids.get_country_count()
            selected_p_prd_cnt = ids.get_selected_p_product_count()
            selected_p_cntr_cnt = ids.get_selected_p_country_count()

            # Get data
            Y = Y_data
            L = L_data
            B = B_data

            # Set-up final demand. Select countries
            # and set non-selected consumed product categories to zero
            y = np.sum(Y[:, c_country_idx], axis=1, keepdims=True)  # select countries/regions
            mask = np.zeros((tot_cntr_cnt * tot_prd_cnt, 1), dtype=bool)
            mask[full_c_product_idx, :] = True
            y[~mask] = 0

            # Calculate total output needed to satisfy
            # selected final demand of countries
            x = np.dot(L, y)

            # Calculate extensions for each selected product
            # Non selected products are simply skipped. M
            # only retains selected sectors and regions of
            # emission
            b = B[indicator_calc_indices, :]
            (row_cnt, col_cnt) = np.shape(b)
            M = np.array([np.multiply(x[prd_idx, 0], b[:, prd_idx]) for prd_idx in full_p_product_idx])
            M = np.transpose(M)

            # Aggregate M per selected product
            M = M.reshape(row_cnt, selected_p_prd_cnt, selected_p_cntr_cnt, order='F')
            m = np.sum(M, axis=2)

            # Return dictionary with results. Multiple values, one value
            # for each selected country where emission takes place
            m = m.flatten()
            result = {}
            for idx, value in np.ndenumerate(product_calc_indices):
                result[value] = m[idx[0]]

            # after calc we expect an dict, we pass that into get_aggregations_xxxx function
            result_as_global_ids = querymanagement.get_aggregations_products(querySelection, result)

            # invoke with returned object get_calc_names_xxxx function
            result_as_names = querymanagement.get_calc_names_product(result_as_global_ids)

            # Change task status to completed
            job = Job.objects.get(pk=job_id)
            log.debug("Running job_name=%s", job.name)
            job.status = "completed"
            job.save()
            # send the websocket message "task_status: completed"
            async_send(channel_name, job)

            # built json object for saving
            data = {}
            data['job_name'] = job_name
            data['job_id'] = job_id
            data['unit'] = idx_units
            # save the final dict result in rawResultData
            data['rawResultData'] = result_as_names
            json_data = json.dumps(data)
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






