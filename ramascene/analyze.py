import logging
import json
import numpy as np
from ramascene import productindexmanger as pim
from ramascene import querymanagement

log = logging.getLogger(__name__)


class Analyze:
    """
    This class contains the method for calculations
    """
    def __init__(self, product_calc_indices, country_calc_indices, indicator_calc_indices, querySelection,idx_units,
                 job_name, job_id, s_country_idx, Y_data, B_data, L_data):
        self.product_calc_indices = product_calc_indices
        self.country_calc_indices = country_calc_indices
        self.indicator_calc_indices = indicator_calc_indices
        self.job_name = job_name
        self.job_id = job_id
        self.querySelection = querySelection
        self.idx_units = idx_units
        self.s_country_idx = s_country_idx
        self.Y_data = Y_data
        self.B_data = B_data
        self.L_data = L_data

    def route_one(self):
        """Perform calculations according to route one.


        Returns:
            json: json result data
        """
        print("route 1")
        p_product_idx = np.arange(0, 200)
        p_country_idx = np.arange(0, 49)

        # Expand selected ids ranges
        ids = pim.ProductIndexManager(self.product_calc_indices, self.s_country_idx, p_product_idx, p_country_idx)
        full_c_product_idx = ids.get_consumed_product_ids()
        full_p_product_idx = ids.get_produced_product_ids()
        selected_s_cntr_cnt = ids.get_selected_s_country_count()
        selected_c_prd_cnt = ids.get_selected_c_product_count()

        # Get data
        Y = self.Y_data
        L = self.L_data
        B = self.B_data

        # Set-up final demand based on selected consuming countries
        # Select and aggregate countries/regions
        y = np.sum(Y[:, self.country_calc_indices], axis=1, keepdims=True)

        # Calculated total output from every sector associated
        # with the final consumption of every selected product
        # Consumed products not selected are skipped.
        X = np.array([np.multiply(y[idx], L[:, idx]) for idx in full_c_product_idx])
        X = np.transpose(X)

        # Select those sectors and regions from B and X
        # that are of interest to the user - single selection only
        X = X[full_p_product_idx, :]
        b = B[self.indicator_calc_indices, :]
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
        for idx, value in np.ndenumerate(self.product_calc_indices):
            result[value] = m[idx[0]]

        # after calc we expect an dict, we pass that into get_aggregations_xxxx function
        result_as_global_ids = querymanagement.get_aggregations_products(self.querySelection, result)

        # invoke with returned object get_calc_names_xxxx function
        result_as_names = querymanagement.get_calc_names_product(result_as_global_ids)

        # built json object for saving
        data = {}
        data['job_name'] = self.job_name
        data['job_id'] = self.job_id
        data['unit'] = self.idx_units
        # save the final dict result in rawResultData
        data['rawResultData'] = result_as_names
        json_data = json.dumps(data)
        return json_data

    def route_two(self):
        """Perform calculations according to route two.


        Returns:
            json: json result data
        """
        print("route 2")
        p_product_idx = np.arange(0, 200)
        p_country_idx = np.arange(0, 49)

        # Expand selected ranges
        ids = pim.ProductIndexManager(self.product_calc_indices, self.s_country_idx, p_product_idx, p_country_idx)
        full_c_product_idx = ids.get_consumed_product_ids()
        full_p_product_idx = ids.get_produced_product_ids()
        tot_prd_cnt = ids.get_product_count()
        tot_cntr_cnt = ids.get_country_count()
        selected_c_cntr_cnt = len(self.country_calc_indices)

        # Get data
        Y = self.Y_data
        L = self.L_data
        B = self.B_data

        # Set-up final demand. Select consuming countries and
        # set the non-selected consumed product categories to zero
        Y = Y[:, self.country_calc_indices]
        mask = np.zeros((tot_cntr_cnt * tot_prd_cnt, selected_c_cntr_cnt), dtype=bool)
        mask[full_c_product_idx, :] = True
        Y[~mask] = 0

        # Calculate total output needed to satisfy the
        # selected final demand of countries
        X = np.dot(L, Y)

        # Select those sectors, regions from B and X
        # that are of interest of the user - single selection
        X = X[full_p_product_idx, :]
        b = B[self.indicator_calc_indices, :]
        b = b[:, full_p_product_idx]

        # calculate final result
        m = np.dot(b, X)

        # Return dictionary with results. Multiple values, one value
        # for each selected country where consumption takes place
        m = m.flatten()
        result = {}
        for idx, value in np.ndenumerate(self.country_calc_indices):
            result[value] = m[idx[0]]

        # after calc we expect an dict, we pass that into get_aggregations_xxxx function
        result_as_global_ids = querymanagement.get_aggregations_countries(self.querySelection, result)

        # invoke with returned object get_calc_names_xxxx function
        result_as_names = querymanagement.get_calc_names_country(result_as_global_ids)

        # built json object for saving
        data = {}
        data['job_name'] = self.job_name
        data['job_id'] = self.job_id
        data['unit'] = self.idx_units
        # save the final dict result in rawResultData
        data['rawResultData'] = result_as_names
        json_data = json.dumps(data)
        return json_data

    def route_three(self):
        """Perform calculations according to route three.


        Returns:
            json: json result data
        """
        print("route 3")
        c_product_idx = np.arange(0, 200)
        c_country_idx = np.arange(0, 49)


        # Expand selected ranges
        ids = pim.ProductIndexManager(c_product_idx, self.s_country_idx, self.product_calc_indices, self.country_calc_indices)
        full_c_product_idx = ids.get_consumed_product_ids()
        full_p_product_idx = ids.get_produced_product_ids()
        tot_prd_cnt = ids.get_product_count()
        tot_cntr_cnt = ids.get_country_count()
        selected_p_prd_cnt = ids.get_selected_p_product_count()
        selected_p_cntr_cnt = ids.get_selected_p_country_count()

        # Get data
        Y = self.Y_data
        L = self.L_data
        B = self.B_data

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
        b = B[self.indicator_calc_indices, :]
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
        for idx, value in np.ndenumerate(self.country_calc_indices):
            result[value] = m[idx[0]]
            str_value = str(value)
            test[str_value] = m[idx[0]]

        # after calc we expect an dict, we pass that into get_aggregations_xxxx function
        result_as_global_ids = querymanagement.get_aggregations_countries(self.querySelection, result)

        # invoke with returned object get_calc_names_xxxx function
        result_as_names = querymanagement.get_calc_names_country(result_as_global_ids)

        # built json object for saving
        data = {}
        data['job_name'] = self.job_name
        data['job_id'] = self.job_id
        data['unit'] = self.idx_units
        # save the final dict result in rawResultData
        data['rawResultData'] = result_as_names
        json_data = json.dumps(data)
        return json_data

    def route_four(self):
        """Perform calculations according to route four.


        Returns:
            json: json result data
        """
        print("route 4")
        c_product_idx = np.arange(0, 200)
        c_country_idx = np.arange(0, 49)

        # Expand selected ranges
        ids = pim.ProductIndexManager(c_product_idx, self.s_country_idx, self.product_calc_indices, self.country_calc_indices)
        full_c_product_idx = ids.get_consumed_product_ids()
        full_p_product_idx = ids.get_produced_product_ids()
        tot_prd_cnt = ids.get_product_count()
        tot_cntr_cnt = ids.get_country_count()
        selected_p_prd_cnt = ids.get_selected_p_product_count()
        selected_p_cntr_cnt = ids.get_selected_p_country_count()

        # Get data
        Y = self.Y_data
        L = self.L_data
        B = self.B_data

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
        b = B[self.indicator_calc_indices, :]
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
        for idx, value in np.ndenumerate(self.product_calc_indices):
            result[value] = m[idx[0]]

        # after calc we expect an dict, we pass that into get_aggregations_xxxx function
        result_as_global_ids = querymanagement.get_aggregations_products(self.querySelection, result)

        # invoke with returned object get_calc_names_xxxx function
        result_as_names = querymanagement.get_calc_names_product(result_as_global_ids)

        # built json object for saving
        data = {}
        data['job_name'] = self.job_name
        data['job_id'] = self.job_id
        data['unit'] = self.idx_units
        # save the final dict result in rawResultData
        data['rawResultData'] = result_as_names
        json_data = json.dumps(data)
        return json_data

