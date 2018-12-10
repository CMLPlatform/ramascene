from django.test import TestCase
from django.core.management import call_command

from ramascene.models import ModellingProduct, Country, Product, Indicator
import csv

FN_COUNTRY = './python_ini/data/mod_final_countryTree_exiovisuals.csv'
FN_PRODUCT = './python_ini/data/mod_final_productTree_exiovisuals.csv'
FN_MODELLING_PRODUCT = './python_ini/data/modelling_mod_final_productTree_exiovisuals.csv'
FN_INDICATOR = './python_ini/data/mod_indicators.csv'
FN_COUNTRY_STATIC = './static_assets/final_countryTree_exiovisuals.csv'
FN_PRODUCT_STATIC = './static_assets/final_productTree_exiovisuals.csv'
FN_MODELLING_PRODUCT_STATIC = './static_assets/final_productTree_exiovisuals.csv'
FN_INDICATOR_STATIC = './static_assets/mod_indicators.csv'


class DatabaseTests(TestCase):
    """
    This class tests if the database values are in-line with the CSV files used
    It also tests if the static assets CSV's used for the front-end are similar to the database contents
    """

    @classmethod
    def setUpTestData(cls):
        call_command('populateHierarchies', verbosity=0)

    def test_country(self):
        self.parse_default(FN_COUNTRY, Country)

    def test_product(self):
        self.parse_default(FN_PRODUCT, Product)

    def test_modelling_product(self):
        self.parse_default(FN_MODELLING_PRODUCT, ModellingProduct)

    def test_indicators(self):
        self.parse_indicator(FN_INDICATOR)

    def test_country_static(self):
        self.parse_static(FN_COUNTRY, Country)

    def test_product_static(self):
        self.parse_static(FN_PRODUCT, Product)

    def test_modelling_product_static(self):
        self.parse_static(FN_MODELLING_PRODUCT, ModellingProduct)

    def test_indicators_static(self):
        self.parse_indicator_static(FN_INDICATOR)

    def parse_default(self, fn, model):
        with open(fn) as csv_file:
            csv_reader = csv.reader(csv_file)
            headers = next(csv_reader)
            str1 = ''.join(headers)  # Convert list into string
            headers = str1.split("\t")
            self.assertEqual(len(headers), 9)
            for row in csv_reader:
                str1 = ''.join(row)  # Convert list into string
                parts = str1.split("\t")
                name = model.objects.values_list(
                    'name', flat=True).get(global_id=int(parts[2]))
                code = model.objects.values_list(
                    'code', flat=True).get(global_id=int(parts[2]))
                global_id = model.objects.values_list(
                    'global_id', flat=True).get(global_id=int(parts[2]))
                parent_id = model.objects.values_list(
                    'parent_id', flat=True).get(global_id=int(parts[2]))
                local_id = model.objects.values_list(
                    'local_id', flat=True).get(global_id=int(parts[2]))
                level = model.objects.values_list(
                    'level', flat=True).get(global_id=int(parts[2]))
                identifier = model.objects.values_list(
                    'identifier', flat=True).get(global_id=int(parts[2]))
                leaf_children_global = model.objects.values_list(
                    'leaf_children_global', flat=True). \
                    get(global_id=int(parts[2]))
                leaf_children_local = model.objects.values_list(
                    'leaf_children_local', flat=True). \
                    get(global_id=int(parts[2]))
                self.assertEqual(parts[0], name.replace(',', ''))
                self.assertEqual(parts[1], str(code))
                self.assertEqual(parts[2], str(global_id))
                self.assertEqual(parts[3], str(parent_id))
                self.assertEqual(parts[4], str(local_id))
                self.assertEqual(parts[5], str(level))
                self.assertEqual(parts[6], str(identifier))
                self.assertEqual(parts[7], str(leaf_children_global))
                self.assertEqual(parts[8], str(leaf_children_local))

    def parse_indicator(self, fn):
        with open(fn) as csv_file:
            csv_reader = csv.reader(csv_file)
            headers = next(csv_reader)
            str1 = ''.join(headers)  # Convert list into string
            headers = str1.split("\t")
            self.assertEqual(len(headers), 6)
            for row in csv_reader:
                str1 = ''.join(row)  # Convert list into string
                parts = str1.split("\t")
                name = Indicator.objects.values_list(
                    'name', flat=True).get(global_id=int(parts[2]))
                unit = Indicator.objects.values_list(
                    'unit', flat=True).get(global_id=int(parts[2]))
                global_id = Indicator.objects.values_list(
                    'global_id', flat=True).get(global_id=int(parts[2]))
                parent_id = Indicator.objects.values_list(
                    'parent_id', flat=True).get(global_id=int(parts[2]))
                local_id = Indicator.objects.values_list(
                    'local_id', flat=True).get(global_id=int(parts[2]))
                level = Indicator.objects.values_list(
                    'level', flat=True).get(global_id=int(parts[2]))
                self.assertEqual(parts[0], name.replace(',', ''))
                self.assertEqual(parts[1], str(unit))
                self.assertEqual(parts[2], str(global_id))
                self.assertEqual(parts[3], str(parent_id))
                self.assertEqual(parts[4], str(local_id))
                self.assertEqual(parts[5], str(level))

    def parse_static(self, fn, model):
        with open(fn) as csv_file:
            csv_reader = csv.reader(csv_file)
            headers = next(csv_reader)
            str1 = ''.join(headers)  # Convert list into string
            headers = str1.split("\t")
            self.assertEqual(len(headers), 9)
            for row in csv_reader:
                str1 = ''.join(row)  # Convert list into string
                parts = str1.split("\t")
                name = model.objects.values_list(
                    'name', flat=True).get(global_id=int(parts[2]))
                code = model.objects.values_list(
                    'code', flat=True).get(global_id=int(parts[2]))
                global_id = model.objects.values_list(
                    'global_id', flat=True).get(global_id=int(parts[2]))
                parent_id = model.objects.values_list(
                    'parent_id', flat=True).get(global_id=int(parts[2]))
                local_id = model.objects.values_list(
                    'local_id', flat=True).get(global_id=int(parts[2]))
                level = model.objects.values_list(
                    'level', flat=True).get(global_id=int(parts[2]))
                self.assertEqual(parts[0], name.replace(',', ''))
                self.assertEqual(parts[1], str(code))
                self.assertEqual(parts[2], str(global_id))
                self.assertEqual(parts[3], str(parent_id))
                self.assertEqual(parts[4], str(local_id))
                self.assertEqual(parts[5], str(level))

    def parse_indicator_static(self, fn):
        with open(fn) as csv_file:
            csv_reader = csv.reader(csv_file)
            headers = next(csv_reader)
            str1 = ''.join(headers)  # Convert list into string
            headers = str1.split("\t")
            self.assertEqual(len(headers), 6)
            for row in csv_reader:
                str1 = ''.join(row)  # Convert list into string
                parts = str1.split("\t")
                name = Indicator.objects.values_list(
                    'name', flat=True).get(global_id=int(parts[2]))
                unit = Indicator.objects.values_list(
                    'unit', flat=True).get(global_id=int(parts[2]))
                global_id = Indicator.objects.values_list(
                    'global_id', flat=True).get(global_id=int(parts[2]))
                parent_id = Indicator.objects.values_list(
                    'parent_id', flat=True).get(global_id=int(parts[2]))
                local_id = Indicator.objects.values_list(
                    'local_id', flat=True).get(global_id=int(parts[2]))
                level = Indicator.objects.values_list(
                    'level', flat=True).get(global_id=int(parts[2]))

                self.assertEqual(parts[0], name.replace(',', ''))
                self.assertEqual(parts[1], str(unit))
                self.assertEqual(parts[2], str(global_id))
                self.assertEqual(parts[3], str(parent_id))
                self.assertEqual(parts[4], str(local_id))
                self.assertEqual(parts[5], str(level))
