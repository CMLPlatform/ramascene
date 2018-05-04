import numpy as np


class ProductIndexManager:

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

    # Expand selected consumed product ids
    # Based on given:
    #      - consumed product ids (c_prd_ids)
    #      - country ids selling final product (s_cntr_ids)
    def get_consumed_product_ids(self):
        expanded_idx = np.zeros(self.full_selected_c_prd_cnt, dtype=int)
        for cntr_idx in range(0, self.selected_s_cntr_cnt):
            start_idx = cntr_idx * self.selected_c_prd_cnt
            end_idx = cntr_idx * self.selected_c_prd_cnt + self.selected_c_prd_cnt
            expanded_idx[start_idx:end_idx, ] = self.c_prd_ids + (self.s_cntr_ids[cntr_idx] * self.__prd_cnt)
        return expanded_idx

    # Expand selected produced productids
    # Based on given:
    #        - producer ids where emission takes place (p_prd_ids)
    #        - country ids where emission takes place )p_cntr_ids)
    def get_produced_product_ids(self):
        expanded_idx = np.zeros(self.full_selected_p_prd_cnt, dtype=int)
        for cntr_idx in range(0, self.selected_p_cntr_cnt):
            start_idx = cntr_idx * self.selected_p_prd_cnt
            end_idx = cntr_idx * self.selected_p_prd_cnt + self.selected_p_prd_cnt
            expanded_idx[start_idx:end_idx, ] = self.p_prd_ids + (self.p_cntr_ids[cntr_idx] * self.__prd_cnt)
        return expanded_idx

    def get_product_count(self):
        return self.__prd_cnt

    def get_country_count(self):
        return self.__cntr_cnt

    def get_full_selected_c_product_count(self):
        return self.full_selected_c_prd_cnt

    def get_full_selected_p_product_count(self):
        return self.full_selected_p_prd_cnt

    def get_selected_c_product_count(self):
        return self.selected_c_prd_cnt

    def get_selected_s_country_count(self):
        return self.selected_s_cntr_cnt

    def get_selected_p_product_count(self):
        return self.selected_p_prd_cnt

    def get_selected_p_country_count(self):
        return self.selected_p_cntr_cnt