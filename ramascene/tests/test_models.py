from django.test import TestCase

from ramascene.models import ModellingProduct, Country, Product, Indicator


class ModelsTests(TestCase):

    def setUp(self):
        ModellingProduct.objects.create(name='ModProduct', code='ABC', global_id=1, parent_id=0, local_id=0, level=1,
                                        identifier='AGG', leaf_children_global='#3', leaf_children_local="#2")

        Country.objects.create(name='Country', code='ABC', global_id=1, parent_id=0, local_id=0, level=1,
                                        identifier='AGG', leaf_children_global='#3', leaf_children_local="#2")
        Product.objects.create(name='Product', code='ABC', global_id=1, parent_id=0, local_id=0, level=1,
                                        identifier='AGG', leaf_children_global='#3', leaf_children_local="#2")
        Indicator.objects.create(name='Indicator', unit='kg', global_id=1, parent_id=0, local_id=0, level=1,)

    def test_content_ModellingProduct(self):
        post = ModellingProduct.objects.get(id=1)
        expected_object_name = f'{post.name}'
        self.assertEquals(expected_object_name, 'ModProduct')

    def test_content_Product(self):
        post = Product.objects.get(id=1)
        expected_object_name = f'{post.name}'
        self.assertEquals(expected_object_name, 'Product')

    def test_content_Country(self):
        post = Country.objects.get(id=1)
        expected_object_name = f'{post.name}'
        self.assertEquals(expected_object_name, 'Country')

    def test_content_Indicator(self):
        post = Indicator.objects.get(id=1)
        expected_object_name = f'{post.name}'
        self.assertEquals(expected_object_name, 'Indicator')