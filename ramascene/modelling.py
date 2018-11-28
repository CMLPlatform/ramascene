import numpy as np
from ramascene import productindexmanger as pim
from ramascene import querymanagement


class Modelling:
    """
    This class contains the methods for modeling
    """

    def __init__(self, Y_data, L_data, model_details, A_data=0): # A_data is defaulted to 0 for testing please eliminate default value plus # mock up for testing once ready for integration
        self.Y_data = Y_data
        self.L_data = L_data
        self.A_data = A_data
        self.model_details = model_details

    def apply_model(self):
        # copy the original final demand for use
        self.Y = self.Y_data.copy()
        self.L = self.L_data.copy()
        self.A = self.A_data.copy()

        # loop over the different interventions, such that we can apply changes individually
        A_modified = False
        for intervention in self.model_details:

            product_idx = np.arange(0, 200)
            country_idx = np.arange(0, 49)


            # convert to numpy arrays explicitly
            calc_ready_product = querymanagement.convert_to_numpy(calc_ready_product)
            calc_ready_origin_reg = querymanagement.convert_to_numpy(calc_ready_origin_reg)
            calc_ready_consumed_reg = querymanagement.convert_to_numpy(calc_ready_consumed_reg)

# =============================================================================
#             # TODO after front-end change, we don't need to explicitly get the first element out of the list
#             if isinstance(consuming_cat, (list,)):
#                 consuming_cat = consuming_cat[0]
# =============================================================================

            # consuming_cat = [0, 1, 10, 76, 199] # mock up for testing
            if consuming_cat == "FinalConsumption": # needs to be adapted to take ids
                # identify local coordinates
                ids = pim.ProductIndexManager(calc_ready_product,
                                              calc_ready_origin_reg,
                                              product_idx,
                                              country_idx
                                              )
                rows = ids.get_consumed_product_ids()
                columns = calc_ready_consumed_reg

                self.Y = self.model_final_demand(self.Y, rows, columns, tech_change)

            elif consuming_cat != "FinalConsumption":  # needs to be adapted to take ids
                calc_ready_production = querymanagement.get_leafs_product(consuming_cat)
                calc_ready_production = querymanagement.convert_to_numpy(calc_ready_production)
                ids = pim.ProductIndexManager(calc_ready_product,
                                              calc_ready_origin_reg,
                                              calc_ready_production,
                                              calc_ready_consumed_reg
                                              )

                rows = ids.get_consumed_product_ids()
                columns = ids.get_produced_product_ids()

                self.A = self.model_intermediates(self.A, rows, columns, tech_change)

                A_modified = True

        if A_modified is True:
            self.L = 1/(np.identity(len(self.A))-self.A)
            
        return self.Y, self.L

    # noinspection PyMethodMayBeStatic
    def model_final_demand(self, Y, rows, columns, tech_change):
        """
        It allows for modification of values within final demand
        for scenario building
        """
        Y[np.ix_(rows, columns)] = Y[np.ix_(rows, columns)] * (1 - -float(tech_change[0]) * 1e-2)
        return Y

    # noinspection PyMethodMayBeStatic
    def model_intermediates(self, A, rows, columns, tech_change):
        """
        It allows for modification of values within intermediates
        for scenario building

        """
        # Work in progress
        A[np.ix_(rows, columns)] = A[np.ix_(rows, columns)] * (1 - -float(tech_change[0]) * 1e-2)

        return A

