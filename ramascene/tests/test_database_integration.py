from django.test import TestCase
from django.core.management import call_command

from ramascene.models import ModellingProduct, Country, Product, Indicator
import csv

FN_COUNTRY = './python_ini/data/mod_final_countryTree_exiovisuals.csv'
FN_PRODUCT = './python_ini/data/mod_final_productTree_exiovisuals.csv'
FN_MODELLING_PRODUCT = './python_ini/data/modelling_mod_final_productTree_exiovisuals.csv'
FN_INDICATOR = './python_ini/data/mod_indicators.csv'

class DatabaseTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('populateHierarchies', verbosity=0)

    def parse_default(self, fn, model):
        with open(fn) as csv_file:
            csv_reader = csv.reader(csv_file)
            headers = next(csv_reader)
            str1 = ''.join(headers)  # Convert list into string
            headers = str1.split("\t")
            self.assertEquals(len(headers), 9)
            for row in csv_reader:
                str1 = ''.join(row)  # Convert list into string
                parts = str1.split("\t")
                csv_name = parts[0]
                csv_code = parts[1]
                csv_global_id = parts[2]
                csv_parent_id = parts[3]
                csv_local_id = parts[4]
                csv_level = parts[5]
                csv_identifier = parts[6]
                csv_leaf_children_global = parts[7]
                csv_leaf_children_local = parts[8]
                name = model.objects.values_list('name', flat=True).get(global_id=int(csv_global_id))
                code = model.objects.values_list('code', flat=True).get(global_id=int(csv_global_id))
                global_id = model.objects.values_list('global_id', flat=True).get(global_id=int(csv_global_id))
                parent_id = model.objects.values_list('parent_id', flat=True).get(global_id=int(csv_global_id))
                local_id = model.objects.values_list('local_id', flat=True).get(global_id=int(csv_global_id))
                level = model.objects.values_list('level', flat=True).get(global_id=int(csv_global_id))
                identifier = model.objects.values_list('identifier', flat=True).get(global_id=int(csv_global_id))
                leaf_children_global = model.objects.values_list('leaf_children_global', flat=True).\
                    get(global_id=int(csv_global_id))
                leaf_children_local = model.objects.values_list('leaf_children_local', flat=True).\
                    get(global_id=int(csv_global_id))
                # for names replace the comma for empty string due to csv reader module
                self.assertEquals(csv_name, name.replace(',', ''))
                self.assertEquals(csv_code, str(code))
                self.assertEquals(csv_global_id, str(global_id))
                self.assertEquals(csv_parent_id, str(parent_id))
                self.assertEquals(csv_local_id, str(local_id))
                self.assertEquals(csv_level, str(level))
                self.assertEquals(csv_identifier, str(identifier))
                self.assertEquals(csv_leaf_children_global, str(leaf_children_global))
                self.assertEquals(csv_leaf_children_local, str(leaf_children_local))

    def test_country(self):
        self.parse_default(FN_COUNTRY, Country)

    def test_product(self):
        self.parse_default(FN_PRODUCT, Product)

    def test_modelling_product(self):
        self.parse_default(FN_MODELLING_PRODUCT, ModellingProduct)

    def test_indicator(self):
        with open(FN_INDICATOR) as csv_file:
            csv_reader = csv.reader(csv_file)
            headers = next(csv_reader)
            str1 = ''.join(headers)  # Convert list into string
            headers = str1.split("\t")
            self.assertEquals(len(headers), 6)
            for row in csv_reader:
                str1 = ''.join(row)  # Convert list into string
                parts = str1.split("\t")
                csv_name = parts[0]
                csv_unit = parts[1]
                csv_global_id = parts[2]
                csv_parent_id = parts[3]
                csv_local_id = parts[4]
                csv_level = parts[5]
                name = Indicator.objects.values_list('name', flat=True).get(global_id=int(csv_global_id))
                unit = Indicator.objects.values_list('unit', flat=True).get(global_id=int(csv_global_id))
                global_id = Indicator.objects.values_list('global_id', flat=True).get(global_id=int(csv_global_id))
                parent_id = Indicator.objects.values_list('parent_id', flat=True).get(global_id=int(csv_global_id))
                local_id = Indicator.objects.values_list('local_id', flat=True).get(global_id=int(csv_global_id))
                level = Indicator.objects.values_list('level', flat=True).get(global_id=int(csv_global_id))
                # for names replace the comma for empty string due to csv reader module
                self.assertEquals(csv_name, name.replace(',', ''))
                self.assertEquals(csv_unit, str(unit))
                self.assertEquals(csv_global_id, str(global_id))
                self.assertEquals(csv_parent_id, str(parent_id))
                self.assertEquals(csv_local_id, str(local_id))
                self.assertEquals(csv_level, str(level))



