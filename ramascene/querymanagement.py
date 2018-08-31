from ramascene.models import Country, Product, Indicator
import numpy as np
import math

"""
Supporting  module  for  cleaning  up  query  data  for  calculations,  data  aggregations  and  cleaning  result  data.
"""


def get_leafs_product(product_global_ids):
    """    Returns the leaf nodes of a given global id

        Uses the database/model to fetch leaf nodes.

        Args:
            product_global_ids (list): A list of user selected product global ids

        Returns:
            list: complete list of  leaf ids (minus a offset of -1 for calculation purposes)
    """
    OFFSET = -1
    product_calc_indices = []
    # It's always a list even if it only has a single element
    for id in product_global_ids:
        # perform identification,
        if identify_product(id) == "LEAF":
            # perform retrieval
            leaf = (Product.objects.values_list('local_id', flat=True).get(global_id=id))
            leaf = clean_single_leafs(leaf, OFFSET)
            product_calc_indices.append(leaf)
        elif identify_product(id) == "AGG" or identify_product(id) == "TOTAL":
            # perform retrieval
            my_local_leafs = (Product.objects.values_list('leaf_children_local', flat=True).get(global_id=id))
            leafs = clean_local_leafs(my_local_leafs)
            product_calc_indices.append(leafs)
    # flatten lists
    product_calc_indices = [item for sublist in product_calc_indices for item in sublist]
    return product_calc_indices


def get_leafs_country(country_global_ids):
    """    Returns the leaf nodes of a given global id

        Uses the database/model to fetch leaf nodes.

        Args:
            country_global_ids (list): A list of user selected country global ids

        Returns:
            list: complete list of  leaf ids (minus a offset of -1 for calculation purposes)
    """
    OFFSET = -1
    country_calc_indices = []
    # It's always a list even if it only has a single element
    for id in country_global_ids:
        # perform identification,
        if identify_country(id) == "LEAF":
            # perform retrieval
            leaf = (Country.objects.values_list('local_id', flat=True).get(global_id=id))
            leaf = clean_single_leafs(leaf, OFFSET)
            country_calc_indices.append(leaf)
        elif identify_country(id) == "AGG" or identify_country(id) == "TOTAL":
            # perform retrieval
            my_local_leafs = (Country.objects.values_list('leaf_children_local', flat=True).get(global_id=id))
            leafs = clean_local_leafs(my_local_leafs)
            country_calc_indices.append(leafs)
    #flatten list
    country_calc_indices = [item for sublist in country_calc_indices for item in sublist]
    return country_calc_indices


def get_calc_names_product(prod_result_data):
    """Get name of products.

        Uses the database/model to fetch names, used inside calculation as conversion step

        Args:
            prod_result_data (dict): key/value pair product with key as global_id

        Returns:
            dict: key/value pair product with key as name corresponding to querySelection global_id

    """
    #create return dict
    product_result_named = {}
    #loop over dictionary, from key (global ID) get the name
    for key, value in prod_result_data.items():
        product_name = (Product.objects.values_list('name', flat=True).get(global_id=key))
        product_result_named[product_name] = value
    return product_result_named


def get_calc_names_country(country_result_data):
    """Get name of countries.

        Uses the database/model to fetch names, used inside calculation as conversion step

        Args:
            country_result_data (dict): key/value pair product with key as global_id

        Returns:
            dict: key/value pair country with key as name corresponding to querySelection global_id

    """
    #create return dict
    country_result_named = {}
    #loop over dictionary, from key (global ID) get the name
    for key, value in country_result_data.items():
        country_name = (Country.objects.values_list('name', flat=True).get(global_id=key))
        country_result_named[country_name] = value
    return country_result_named


def get_names_product(prod_ids):
    """Get name of products

    Uses the database/model to fetch names, used for sending selection information to front-end

    Args:
        prod_ids (list): list of products by global id

    Returns:
        list: lists of products

    """
    prod_names = []
    for prod in prod_ids:
        prod_name = (Product.objects.values_list('name', flat=True).get(global_id=prod))
        prod_names.append(prod_name)
    return prod_names


def get_names_country(country_ids):
    """Get name of countries

    Uses the database/model to fetch names, used for sending selection information to front-end

    Args:
        country_ids (list): list of countries by global id

    Returns:
        list: lists of countries

    """
    country_names = []
    for country in country_ids:
        country_name = (Country.objects.values_list('name', flat=True).get(global_id=country))
        country_names.append(country_name)
    return country_names


def get_names_indicator(indicator_ids):
    """Get name of indicators

    Uses the database/model to fetch names, used for sending selection information to front-end

    Args:

        indicator_ids (list): list of indicators by global id

    Returns:
        list: lists of indicators as names

    """
    indicator_names = []
    for indicator in indicator_ids:
        indicator_name = (Indicator.objects.values_list('name', flat=True).get(global_id=indicator))
        indicator_names.append(indicator_name)
    return indicator_names


def get_aggregations_countries(querySelection, result_data):
    """Sum to construct aggregates results for countries.

        Invoked at Celery tasks to sum values that belong to a certain aggregate.

        Args:
            querySelection (dict): original querySelection from user
            result_data (dict): dictionary of result_data from calculation

        Returns:
            dict: dicitonary of result_data, but with aggregations if there are any

    """
    OFFSET = -1
    # make a result container
    result_container = {}

    #loop over original querySelection first
    for global_country_id in querySelection["nodesReg"]:
        #if the given global id is a leaf
        if identify_country(global_country_id) == "LEAF":
            # get local leaf just for lookup in the result_data table
            leaf = (Country.objects.values_list('local_id', flat=True).get(global_id=global_country_id))
            leaf = clean_single_leafs(leaf, OFFSET)
            #leaf returns a list (artifact of function get_leafs), however its one element so use it
            value = result_data.get(leaf[0])
            #assign the the global id instead of local id the value
            result_container[global_country_id] = value
            #if the global id corresponds to an aggregate we need to sum every respective leaf from the result_data
        elif identify_country(global_country_id) == "AGG" or identify_country(global_country_id) =="TOTAL":
            # get local leafs again as we need it to look up the result_data table
            my_local_leafs = \
                (Country.objects.values_list('leaf_children_local', flat=True).get(global_id=global_country_id))
            cleaned_local_leafs = clean_local_leafs(my_local_leafs)

            #result list for aggregating
            tmp_list = []
            #loop over cleaned_local leafs
            for a_leaf in cleaned_local_leafs:
                #for each leaf pull the data value from the dict
                value = result_data.get(a_leaf)
                #append to list ready for aggregation
                tmp_list.append(value)
            tmp_agg_result = math.fsum(tmp_list)
            result_container[global_country_id] = tmp_agg_result

    return result_container


def get_aggregations_products(querySelection, result_data):
    """Sum to construct aggregates results for products.

        Invoked at Celery tasks to sum values that belong to a certain aggregate.

        Args:
            querySelection (dict): original querySelection from user
            result_data (dict): dictionary of result_data from calculation

        Returns:
            dict: dicitonary of result_data, but with aggregations if there are any

    """
    OFFSET = -1
    # make a result container
    result_container = {}

    #loop over original querySelection first
    for global_product_id in querySelection["nodesSec"]:
        #if the given global id is a leaf
        if identify_product(global_product_id) == "LEAF":
            # get local leaf just for lookup in the result_data table
            leaf = (Product.objects.values_list('local_id', flat=True).get(global_id=global_product_id))
            leaf = clean_single_leafs(leaf, OFFSET)
            #leaf returns a list (artifact of function get_leafs), however its one element so use it
            value = result_data.get(leaf[0])
            #assign the the global id instead of local id the value
            result_container[global_product_id] = value
            #if the global id corresponds to an aggregate we need to sum every respective leaf from the result_data
        elif identify_product(global_product_id) == "AGG" or identify_product(global_product_id) =="TOTAL":
            # get local leafs again as we need it to look up the result_data table
            my_local_leafs = \
                (Product.objects.values_list('leaf_children_local', flat=True).get(global_id=global_product_id))
            cleaned_local_leafs = clean_local_leafs(my_local_leafs)
            #result list for aggregating
            tmp_list = []
            #loop over cleaned_local leafs
            for a_leaf in cleaned_local_leafs:

                #for each leaf pull the data value from the dict
                value = result_data.get(a_leaf)
                #append to list ready for aggregation
                tmp_list.append(value)
            tmp_agg_result = math.fsum(tmp_list)
            result_container[global_product_id] = tmp_agg_result
    return result_container


def identify_product(prod_id):
    """Helper function.

            Does database check on products if the global_id the user selected is an aggregate or not

            Args:
                prod_id (int): global id

            Returns:
                str: identifier e.g. LEAF or AGG or TOTAL

    """
    prod_identifier = (Product.objects.values_list('identifier', flat=True).get(global_id=prod_id))
    return prod_identifier


def identify_country(country_id):
    """Helper function.

            Does database check on countries if the global_id the user selected is an aggregate or not

            Args:
                country_id (int): global id

            Returns:
                str: identifier e.g. LEAF or AGG or TOTAL

    """
    reg_identifier = (Country.objects.values_list('identifier', flat=True).get(global_id=country_id))
    return reg_identifier


def clean_local_leafs(a_list):
    """Clean data as preprocessing step for calculation.

        Clean the country or product data for calculations by splitting and converting to integers.

        Args:
            a_list (str): country or product string of coordinates separated by #

        Returns:
            list: country or product list of coordinates as integers

    """
    #split on hashtag if multiple elements
    a_list = a_list.split("#")
    #convert that list to a list of integers
    a_list = list(map(int, a_list))
    return a_list


def clean_single_leafs(leaf, OFFSET):
    """Clean data as preprocessing step for calculation.

        Clean the country or product data for calculations by splitting, applying offset (-1) and converting to integers.

        Args:
            leaf (str): single country or product coordinate (non-processed)

        Returns:
            list: country or product list of coordinates (single element, processed)

    """
    #apply offset and make it integers
    leaf = int(leaf) + OFFSET
    #make list for heterogenity purposes with AGG nodes
    sm_tmp_list = []
    sm_tmp_list.append(leaf)
    return sm_tmp_list


def clean_indicators(idx_lst):
    """Clean data as preprocessing step for calculation.

        Clean the selected indicator by converting to integers and applying offset of -1.

        Args:
            idx_lst (list): indicators

        Returns:
            list: indicators(processed)

    """
    OFFSET = -1
    return_lst = []
    for ind in idx_lst:
        i = int(ind) + OFFSET
        return_lst.append(i)
    return return_lst


def get_indicator_units(idx_lst):
    """Get units of passed-in indicators.

        Can be multiple or single units depending on the API implementation version

        Args:
            idx_lst (list): indicators

        Returns:
            dict: key/value pair name of indicator and corresponding unit

    """
    idx_units = {}
    for idx in idx_lst:
        idx_unit = (Indicator.objects.values_list('unit', flat=True).get(global_id=idx))
        idx_name = (Indicator.objects.values_list('name', flat=True).get(global_id=idx))
        idx_units[idx_name] = idx_unit
    return idx_units


def convert_to_numpy(list_obj):
    """Clean data as preprocessing step for calculation.

        Convert processed country,product, indicator lists to numpy array.

        Args:
            product,country,indicator (list): pre-processed list


        Returns:
            list: numpy arrays of products or countries or indicator coordinates

    """
    # order
    list_obj.sort(reverse=False)
    # convert to array
    numpy_array = np.asarray(list_obj, dtype=np.int64)

    return numpy_array