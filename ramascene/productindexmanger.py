import numpy as np


class ProductIndexManager:
    """The ProductIndexManager provides functions to translate ids of
        selected countries and products into ids of the combination of
        selected countries and products and returns ids that cab be used
        directly to select columns and/or rows from final demand matrices, extension matrices and
        leontief inverse matrix.

        The selected countries and products have to be supplied when initializing
        the ProductIndexManager. After initialisation no changes to the supplied ids are allowed.

        Args:
            c_prd_ids: ndarray
                1D array containing integers indicating the ids of selected consumed products
            s_cntr_ids: ndarray
                1D array containing integers indicating the ids of the selected countries selling final products
            p_prd_ids: ndarray
                1D array containing integers indicating the ids of the selected produced products
            p_cntr_ids:
                1D array containing integers indicating the ids of the selected producing countries

        """

    # class variable
    __prd_cnt = 200
    __cntr_cnt = 49

    def __init__(self, c_prd_ids, s_cntr_ids, p_prd_ids, p_cntr_ids):
        self.c_prd_ids = c_prd_ids
        self.s_cntr_ids = s_cntr_ids
        self.p_prd_ids = p_prd_ids
        self.p_cntr_ids = p_cntr_ids
        self.selected_c_prd_cnt = len(c_prd_ids)
        self.selected_s_cntr_cnt = len(s_cntr_ids)
        self.selected_p_prd_cnt = len(p_prd_ids)
        self.selected_p_cntr_cnt = len(p_cntr_ids)
        self.full_selected_c_prd_cnt = self.selected_c_prd_cnt * self.selected_s_cntr_cnt
        self.full_selected_p_prd_cnt = self.selected_p_prd_cnt * self.selected_p_cntr_cnt

    def get_consumed_product_ids(self):
        """Get the ids of the selected consumed products

            Based on the ids of the selected consumed products and the ids of the
            selected countries selling final products the ids of all selected products
            in the final demand vector are generated. It allows
            to make a full selection of the selected consumed products from
            a final demand vector. A full selection means that if the id of the product bread
            was selected, now the ids of bread from Italy, bread from Belgium etc
            are generated as long as Italy, Belgium etc are within the ids of countries
            selling final products. The ids are zero based.

            Returns:
                one dimensional numpy array with ids of type int

        """
        expanded_idx = np.zeros(self.full_selected_c_prd_cnt, dtype=int)
        for cntr_idx in range(0, self.selected_s_cntr_cnt):
            start_idx = cntr_idx * self.selected_c_prd_cnt
            end_idx = cntr_idx * self.selected_c_prd_cnt + self.selected_c_prd_cnt
            expanded_idx[start_idx:end_idx, ] = self.c_prd_ids + (self.s_cntr_ids[cntr_idx] * self.__prd_cnt)
        return expanded_idx

    def get_produced_product_ids(self):
        """Get the ids of the selected produced products

            Based on the ids of the selected produced products and the ids of the
            selected producing countries the ids of all selected produced products
            are generated. It allows to make a full selection of the selected produced products from
            the output vector. A full selection means that if the id of the product car
            was selected, now the ids of car from Germany, car from France etc
            are generated as long as Germany, France etc are within the ids of selected producing
            countries. The ids are zero based.

        Returns:
            one dimensional numpy array with ids of type int

        """
        expanded_idx = np.zeros(self.full_selected_p_prd_cnt, dtype=int)
        for cntr_idx in range(0, self.selected_p_cntr_cnt):
            start_idx = cntr_idx * self.selected_p_prd_cnt
            end_idx = cntr_idx * self.selected_p_prd_cnt + self.selected_p_prd_cnt
            expanded_idx[start_idx:end_idx, ] = self.p_prd_ids + (self.p_cntr_ids[cntr_idx] * self.__prd_cnt)
        return expanded_idx

    def get_product_count(self):
        """Get the number of products per country in EXIOBASE

            Returns:
                integer object with the number of products.

        """
        return self.__prd_cnt

    def get_country_count(self):
        """Get the number of countries and regions in EXIOBASE

            Returns:
                integer object with the number of countries/regions.

        """
        return self.__cntr_cnt

    def get_full_selected_c_product_count(self):
        """Get the full number of consuming products selected.

            Products in different countries are counted as unique items, i.e.
            bread from Belgium and bread from Italy consumed in a particular country
            are considered two items.

            Returns:
                integer object with the full count of consumed products selected.

        """
        return self.full_selected_c_prd_cnt

    def get_full_selected_p_product_count(self):
        """Get the full number of produced products selected.

            Products in different countries are counted as unique items, i.e.
            cars produced in France and cars produced in Germany are considered two items.

            Returns:
                integer object with the full count of produced products selected.

        """
        return self.full_selected_p_prd_cnt

    def get_selected_c_product_count(self):
        """Get the number of consumed products selected.

             Returns:
                 integer object with the number of consumed products selected.

        """
        return self.selected_c_prd_cnt

    def get_selected_s_country_count(self):
        """Get the number of selected countries selling final products.

        Returns:
            integer object with the number of contries selling final products selected.

        """
        return self.selected_s_cntr_cnt

    def get_selected_p_product_count(self):
        """Get the number of selected produced products.

         Returns:
            integer object with the number of produced products selected.

        """
        return self.selected_p_prd_cnt

    def get_selected_p_country_count(self):
        """Get the number of selected producing countries.

        Returns:
            integer object with the number of  producing countries selected.

        """
        return self.selected_p_cntr_cnt
