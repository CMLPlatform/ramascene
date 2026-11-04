"""
Preparation and submission of calculation jobs.

The query from the client is resolved into database names (for the job record) and into
calculation indices (for the numerical routes). This used to live in the websocket consumer;
it is now shared by the REST API.
"""
import logging

from ramascene import querymanagement
from ramascene.models import Job
from ramascene.tasks import default_handler

log = logging.getLogger(__name__)


def prepare_job(validated):
    """Turn a validated job request into the structures used by the calculation.

    Args:
        validated (dict): output of JobRequestSerializer (action, querySelection, model_details)

    Returns:
        tuple: (job_name, ready_query_selection, query_selection)
            job_name: human-readable selection, stored on the Job
            ready_query_selection: indices and modelling details for the calculation
            query_selection: the original selection, used for aggregations
    """
    action = validated["action"]
    query_selection = dict(validated["querySelection"])

    # the API always gets a list of years; the calculation uses a single year
    year = query_selection["year"][0]
    query_selection.update({"year": year})

    info_query_selection = query_selection.copy()
    ready_query_selection = query_selection.copy()

    if action == "model":
        model_details = validated["model_details"]
        model_year = "Scenario year:" + str(year)

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
        for intervention in model_details:
            # for each modeling change retrieve the details (global ids)
            names_origin_regions.append(querymanagement.get_names_country(intervention["originReg"]))
            names_consumed_regions.append(querymanagement.get_names_country(intervention["consumedReg"]))
            names_products.append(querymanagement.get_names_product(intervention["product"]))
            names_consumed_by_products.append(querymanagement.get_modelled_names_product(intervention["consumedBy"]))

            tech_change = intervention["techChange"]
            tech_changes.append(tech_change)

            # get calculation ready indices explicitly
            origin_regions.append(querymanagement.get_leafs_country(intervention["originReg"]))
            consumed_regions.append(querymanagement.get_leafs_country(intervention["consumedReg"]))
            products.append(querymanagement.get_leafs_product(intervention["product"]))
            consumed_by_products.append(querymanagement.get_leafs_modelled_product(intervention["consumedBy"]))

            # as optimisation step check if there is any modelling query that needs the A matrix
            identifier = querymanagement.identify_modelling_product(intervention["consumedBy"][0])
            identifiers.append(identifier)
            # FINALCONSUMPTION only needs Y; anything else needs A instead of the default L
            load_A.append(identifier != "FINALCONSUMPTION")

        info_query_selection.update(
            {"originReg": names_origin_regions, "consumedReg": names_consumed_regions,
             "product": names_products, "techChange": tech_changes,
             "year": model_year, "consumedBy": names_consumed_by_products})

        ready_query_selection.update(
            {"originReg": origin_regions, "consumedReg": consumed_regions,
             "product": products, "techChange": tech_changes,
             "year": year, "consumedBy": consumed_by_products, "identifiers": identifiers})
        # the full model details are not sent to Celery, but the flags are needed
        query_selection.update({"model_details": model_details, "load_A": load_A})

    # clean query for info (job_name)
    names_products = querymanagement.get_names_product(query_selection["nodesSec"])
    names_countries = querymanagement.get_names_country(query_selection["nodesReg"])
    name_indicator = querymanagement.get_names_indicator(query_selection["extn"])
    info_query_selection.update({"nodesSec": names_products, "nodesReg": names_countries,
                                 "extn": name_indicator})
    job_name = info_query_selection

    # prepare for the Celery handler
    product_calc_indices = querymanagement.get_leafs_product(query_selection["nodesSec"])
    country_calc_indices = querymanagement.get_leafs_country(query_selection["nodesReg"])
    indicator_calc_indices = querymanagement.clean_indicators(query_selection["extn"])
    idx_units = querymanagement.get_indicator_units(query_selection["extn"])
    ready_query_selection.update({"nodesSec": product_calc_indices, "nodesReg": country_calc_indices,
                                  "extn": indicator_calc_indices, "idx_units": idx_units})

    return job_name, ready_query_selection, query_selection


def submit_job(validated):
    """Create the job record, enqueue the calculation and return the job.

    Args:
        validated (dict): output of JobRequestSerializer
    """
    job_name, ready_query_selection, query_selection = prepare_job(validated)
    log.debug("job Name=%s", job_name)
    job = Job(name=str(job_name), status="started")
    job.save()
    default_handler(job_name, job.id, ready_query_selection, query_selection)
    return job
