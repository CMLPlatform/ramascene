import numpy as np
from ramascene import productindexmanger as pim
from ramascene import querymanagement


class Modelling:
    """
    This class contains the methods for modeling
    """

    def __init__(self, Y_data, L_data, model_details):
        self.Y_data = Y_data
        self.L_data = L_data
        self.model_details = model_details

    def apply_model(self):
        # copy the original final demand for use
        self.Y = self.Y_data.copy()
        self.L = self.L_data.copy()

        # loop over the different interventions, such that we can apply changes individually
        Y_modified = False
        L_modified = False
        for intervention in self.model_details:

            product_idx = np.arange(0, 200)
            country_idx = np.arange(0, 49)
            consuming_cat = intervention["consumedBy"]
            tech_change = intervention["techChange"]

            # get calculation ready indices explicitly
            calc_ready_product = querymanagement.get_leafs_product(intervention["product"])
            calc_ready_origin_reg = querymanagement.get_leafs_country(intervention["originReg"])
            calc_ready_consumed_reg = querymanagement.get_leafs_country(intervention["consumedReg"])

            # convert to numpy arrays explicitly
            calc_ready_product = querymanagement.convert_to_numpy(calc_ready_product)
            calc_ready_origin_reg = querymanagement.convert_to_numpy(calc_ready_origin_reg)
            calc_ready_consumed_reg = querymanagement.convert_to_numpy(calc_ready_consumed_reg)

            # TODO after front-end change, we don't need to explicitly get the first element out of the list
            if isinstance(consuming_cat, (list,)):
                consuming_cat = consuming_cat[0]

            if consuming_cat == "FinalConsumption":
                # identify local coordinates
                ids = pim.ProductIndexManager(calc_ready_product,
                                              calc_ready_origin_reg,
                                              product_idx,
                                              country_idx
                                              )
                rows = ids.get_consumed_product_ids()
                columns = calc_ready_consumed_reg

                self.Y = self.model_final_demand(self.Y, rows, columns, tech_change)

                Y_modified = True

            elif consuming_cat != "FinalConsumption":
                # do not do anything yet as it fails at the moment
                # TODO implement L
                L_modified = True

        if Y_modified is True:
            self.Y = self.Y
        elif Y_modified is False:
            self.Y = self.Y_data

        # TODO implement L

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
    def model_intermediates(self, L, rows, columns, tech_change):
        """
        It allows for modification of values within intermediates
        for scenario building

        """

        # Work in progress

        return L