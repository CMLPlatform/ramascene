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
        #tester to validate original final demand total summed value
        print("----------")
        print("default final demand: " + str(sum(sum(self.Y_data))))
        print("----------")
        #copy the original final demand for use
        Y = self.Y_data.copy()
        #L = self.L_data
        #loop over the different interventions, such that we can apply changes individually
        for intervention in self.model_details:
            print(intervention)
            product = intervention["product"]
            model_perspective = intervention["consumedBy"]
            origin_reg = intervention["originReg"]
            consumed_reg = intervention["consumedReg"]
            tech_change = intervention["techChange"]

            #get calculation ready indices
            calc_ready_product = querymanagement.get_leafs_product(product)
            calc_ready_origin_reg = querymanagement.get_leafs_country(origin_reg)
            calc_ready_consumed_reg = querymanagement.get_leafs_country(consumed_reg)

            #convert to numpy arrays
            calc_ready_product = querymanagement.convert_to_numpy(calc_ready_product)
            calc_ready_origin_reg = querymanagement.convert_to_numpy(calc_ready_origin_reg)
            calc_ready_consumed_reg = querymanagement.convert_to_numpy(calc_ready_consumed_reg)

            if model_perspective == "FinalConsumption":
                Y = self.myfunc(Y, tech_change)
                print("----------")
                print("inside loop:"+str(sum(sum(Y))))
                print("----------")
            elif model_perspective == "intermediate":
                Y = self.my_other_func(Y, tech_change)
        print("----------")
        print("outside loop value, ready for use as mod:" + str(sum(sum(Y))))
        print("----------")
        return Y
    def myfunc(self,Y, tech_change):
        if tech_change[0] == -100:
            Y = np.ones_like(Y)
        elif tech_change[0] == 100:
            test = Y
            Y = np.ones_like(Y) + test
        elif tech_change[0] == 50:

            test = np.ones_like(Y)
            Y = Y - test
        return Y

    def my_other_func(self,Y,tech_change):
        if tech_change[0] == -100:
            Y = np.ones_like(Y)
        elif tech_change[0] == 100:
            test = Y
            Y = np.ones_like(Y) + test
            Y = test + Y
        elif tech_change[0] == 50:
            test = np.ones_like(Y)
            Y = Y - test
        return Y