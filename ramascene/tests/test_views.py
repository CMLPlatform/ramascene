from django.test import SimpleTestCase
from django.urls import reverse

from ramasceneMasterProject import views
from ramascene import views

class ViewsTests(SimpleTestCase):

    def test_home_page_status_code(self):
        response = self.client.get('/')
        self.assertEquals(response.status_code, 200)

    def test_status_code_tool(self):
        response = self.client.get('/ramascene/')
        self.assertEquals(response.status_code, 200)

    def test_view_url_by_name(self):
        response = self.client.get(reverse('homePage'))
        self.assertEquals(response.status_code, 200)

    def test_view_url_by_name_tool(self):
        response = self.client.get(reverse('home'))
        self.assertEquals(response.status_code, 200)

    def test_view_uses_correct_template(self):
        response = self.client.get(reverse('homePage'))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'ramasceneMasterProject/home.html')

    def test_view_uses_correct_template_tool(self):
        response = self.client.get(reverse('home'))
        self.assertEquals(response.status_code, 200)
        self.assertTemplateUsed(response, 'ramascene/home.html')