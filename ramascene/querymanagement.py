from ramascene.models import Country, Product, Indicator
import numpy as np

"""
Supporting  file  for  cleaning  up  query  data  for  calculations,  data  aggregations  and  cleaning  result  data.
"""


#this function returns the leaf nodes of a given global id in a format ready for calculation
def get_leafs(product_global_ids, country_global_ids):
    OFFSET = -1
    product_calc_indices = []
    country_calc_indices = []
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

    #flatten lists
    product_calc_indices = [item for sublist in product_calc_indices for item in sublist]
    country_calc_indices = [item for sublist in country_calc_indices for item in sublist]



    return product_calc_indices, country_calc_indices

#return key/value pair product with key as name corresponding to querySelection global_id
#expects arguments key/value pair product with key as global_id
def get_calc_names_product(prod_result_data):
    #create return dict
    product_result_named = {}
    #loop over dictionary, from key (global ID) get the name
    for key, value in prod_result_data.items():
        product_name = (Product.objects.values_list('name', flat=True).get(global_id=key))
        product_result_named[product_name] = value
    return product_result_named

#return key/value pair product with key as name corresponding to querySelection global_id
#expects arguments key/value pair product with key as global_id
def get_calc_names_country(country_result_data):
    #create return dict
    country_result_named = {}
    #loop over dictionary, from key (global ID) get the name
    for key, value in country_result_data.items():
        country_name = (Country.objects.values_list('name', flat=True).get(global_id=key))
        country_result_named[country_name] = value
    return country_result_named


#returns from a list o_bnamf global_ids the corresponding names
#expects list of global_ids
def get_names(prod_ids, country_ids, indicator_ids):
    prod_names =[]
    country_names=[]
    indicator_names=[]
    for prod in prod_ids:
        prod_name = (Product.objects.values_list('name', flat=True).get(global_id=prod))
        prod_names.append(prod_name)
    for country in country_ids:
        country_name = (Country.objects.values_list('name', flat=True).get(global_id=country))
        country_names.append(country_name)
    for indicator in indicator_ids:
        indicator_name = (Indicator.objects.values_list('name', flat=True).get(global_id=indicator))
        indicator_names.append(indicator_name)
    return prod_names, country_names, indicator_names

#invoked at Celery TASK, non-django function
#return key/value pair country with key name corresponding to querySelection global_id
#This function aggragates result data that came from calculation process (calcOne) (summing is performed only if needed)
def get_aggregations_countries(querySelection, result_data):
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
            tmp_agg_result = sum(tmp_list)
            result_container[global_country_id] = tmp_agg_result

    return result_container

def get_aggregations_products(querySelection, result_data):
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
            tmp_agg_result = sum(tmp_list)
            result_container[global_product_id] = tmp_agg_result
    return result_container

#return model identifier (check if it represent aggregations or not)
def identify_product(prod_id):
    prod_identifier = (Product.objects.values_list('identifier', flat=True).get(global_id=prod_id))
    return prod_identifier

#return model identifier (check if it represent aggregations or not)
def identify_country(country_id):
    reg_identifier = (Country.objects.values_list('identifier', flat=True).get(global_id=country_id))
    return reg_identifier

#clean the data ready for calculations
def clean_local_leafs(a_list):
    #split on hashtag if multiple elements
    a_list = a_list.split("#")
    #convert that list to a list of integers
    a_list = list(map(int, a_list))
    return a_list

#clean the data ready for calculations
def clean_single_leafs(leaf, OFFSET):
    #apply offset and make it integers
    leaf = int(leaf) + OFFSET
    #make list for heterogenity purposes with AGG nodes
    sm_tmp_list = []
    sm_tmp_list.append(leaf)
    return sm_tmp_list

#clean indicator data to make it ready for calculations
def clean_indicators(idx_lst):
    OFFSET = -1
    return_lst = []
    for ind in idx_lst:
        i = int(ind) + OFFSET
        return_lst.append(i)
    return return_lst

def convert_to_numpy(products,countries, indicators):
    #order
    products.sort(reverse=False)
    countries.sort(reverse=False)
    indicators.sort(reverse=False)

    #convert to array
    products = np.asarray(products, dtype=np.int64)
    countries = np.asarray(countries, dtype=np.int64)
    indicators = np.asarray(indicators, dtype=np.int64)

    return products, countries, indicators

