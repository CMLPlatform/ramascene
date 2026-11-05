import logging
import json
import numpy as np
from ramascene import dimensions
from ramascene import productindexmanger as pim
from ramascene import querymanagement

log = logging.getLogger(__name__)

SUPPLY_CELLS = 400


class Analyze:
    """
    This class contains the method for calculations
    """

    def __init__(self, product_calc_indices, country_calc_indices, indicator_calc_indices, querySelection, idx_units,
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

        The footprint of the selected products, consumed in the selected countries, split up
        by where the footprint arises. Three views of the same total are returned:

        rawResultData: one value per supplying product (summed over supplying countries)
        consumed: one value per selected consumed product (summed over the consuming countries)
        supply: the largest cells of the supplying product by supplying country matrix (cells),
            and the total per supplying country (countries)

        The columns of L are processed in chunks so that a selection of all products in all
        countries stays within a few tens of megabytes.

        Returns:
            json: json result data
        """
        p_product_idx = np.arange(0, dimensions.n_products())
        p_country_idx = np.arange(0, dimensions.n_countries())

        # Expand selected ids ranges
        ids = pim.ProductIndexManager(self.product_calc_indices, self.s_country_idx, p_product_idx, p_country_idx)
        full_c_product_idx = ids.get_consumed_product_ids()
        full_p_product_idx = ids.get_produced_product_ids()
        selected_p_cntr_cnt = ids.get_selected_p_country_count()
        selected_p_prd_cnt = ids.get_selected_p_product_count()

        # Get data
        Y = self.Y_data
        L = self.L_data
        B = self.B_data

        # Set-up final demand based on selected consuming countries
        y = np.sum(Y[:, self.country_calc_indices], axis=1)
        y_cols = y[full_c_product_idx]

        # One indicator only
        b = B[self.indicator_calc_indices, :]
        b = b[:, full_p_product_idx]
        if b.shape[0] != 1:
            raise ValueError("route one takes exactly one indicator")
        b = b[0]

        # Total output needed for the selected final consumption, per supplying product, and the
        # footprint per consumed column. Consumed products not selected are skipped.
        supply = np.zeros(len(full_p_product_idx))
        consumed_cols = np.zeros(len(full_c_product_idx))
        chunk = 500
        for start in range(0, len(full_c_product_idx), chunk):
            cols = full_c_product_idx[start:start + chunk]
            L_part = np.asarray(L[:, cols])[full_p_product_idx, :]
            weighted = L_part * y_cols[start:start + chunk]
            supply += weighted.sum(axis=1)
            consumed_cols[start:start + chunk] = b @ weighted
        supply = supply * b

        # full_p_product_idx lists the origin countries outer and the products inner
        cells = supply.reshape(selected_p_cntr_cnt, selected_p_prd_cnt)
        by_product = cells.sum(axis=0)

        # full_c_product_idx lists the consuming countries outer and the products inner
        n_selected_c = len(self.product_calc_indices)
        by_consumed = consumed_cols.reshape(-1, n_selected_c).sum(axis=0)

        product_names = querymanagement.get_leaf_product_names()
        country_names = querymanagement.get_leaf_country_names()
        result = {product_names[idx]: float(value) for idx, value in enumerate(by_product)}
        consumed = {product_names[int(idx)]: float(value) for idx, value in zip(self.product_calc_indices, by_consumed)}

        top = np.argsort(cells, axis=None)[::-1][:SUPPLY_CELLS]
        top_cells = []
        for flat in top:
            c_idx, p_idx = divmod(int(flat), selected_p_prd_cnt)
            top_cells.append([product_names[p_idx], country_names[c_idx], float(cells[c_idx, p_idx])])

        # built json object for saving
        data = {}
        data['job_name'] = self.job_name
        data['job_id'] = self.job_id
        data['unit'] = self.idx_units
        # save the final dict result in rawResultData
        data['rawResultData'] = result
        data['consumed'] = consumed
        by_country = cells.sum(axis=1)
        data['supply'] = {
            'cells': top_cells,
            'countries': {country_names[idx]: float(value) for idx, value in enumerate(by_country)},
        }
        json_data = json.dumps(data)
        return json_data

    def route_two(self):
        """Perform calculations according to route two.


        Returns:
            json: json result data
        """
        p_product_idx = np.arange(0, dimensions.n_products())
        p_country_idx = np.arange(0, dimensions.n_countries())

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
        X = L @ Y

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
        c_product_idx = np.arange(0, dimensions.n_products())
        c_country_idx = np.arange(0, dimensions.n_countries())

        # Expand selected ranges
        ids = pim.ProductIndexManager(c_product_idx, self.s_country_idx, self.product_calc_indices,
                                      self.country_calc_indices)
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
        x = L @ y

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
        c_product_idx = np.arange(0, dimensions.n_products())
        c_country_idx = np.arange(0, dimensions.n_countries())

        # Expand selected ranges
        ids = pim.ProductIndexManager(c_product_idx, self.s_country_idx, self.product_calc_indices,
                                      self.country_calc_indices)
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
        x = L @ y

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
