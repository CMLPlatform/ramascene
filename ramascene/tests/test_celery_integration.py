from ramascene.tasks import execute_calc
from ramascene.models import Job
from celery.contrib.testing.worker import start_worker
from django.test import SimpleTestCase
from ramasceneMasterProject.celery import app
from django_celery_results import models
import json
from django.core.management import call_command

LATEST_YEAR = 2011

class TestAjaxCelery(SimpleTestCase):
    """
    This class tests Ajax and Celery as part of basic integration tests
    test_celery_default = tests the standard query upon entering the application
    test_celery_bounds = tests the if there is no out of bounds errors related to indicators
    Note: it assumes that we have 200 products and 49 countries
    """

    allow_database_queries = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        app.loader.import_module('celery.contrib.testing.tasks')
        # Start up celery worker
        cls.celery_worker = start_worker(app)
        cls.celery_worker.__enter__()
        # create a dummy job in the in-memory database
        job = Job(
            name="test job",
            status="started",
        )
        job.save()
        cls.job_id = job.id
        # call command for populating database
        call_command('populateHierarchies', verbosity=0)


    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

        # Close worker
        cls.celery_worker.__exit__(None, None, None)


    def test_celery_default(self):
        self.task = execute_calc.apply(args=[self.job_id, 1, "channel_name", {'dimType': 'Production', 'vizType': 'TreeMap',
                                                                    'nodesSec': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                                                                                 11, 12, 13, 14, 15, 16, 17, 18, 19,
                                                                                 20, 21, 22, 23, 24, 25, 26, 27, 28,
                                                                                 29, 30, 31, 32, 33, 34, 35, 36, 37,
                                                                                 38, 39, 40, 41, 42, 43, 44, 45, 46,
                                                                                 47, 48, 49, 50, 51, 52, 53, 54, 55,
                                                                                 56, 57, 58, 59, 60, 61, 62, 63, 64,
                                                                                 65, 66, 67, 68, 69, 70, 71, 72, 73,
                                                                                 74, 75, 76, 77, 78, 79, 80, 81, 82,
                                                                                 83, 84, 85, 86, 87, 88, 89, 90, 91,
                                                                                 92, 93, 94, 95, 96, 97, 98, 99,
                                                                                 100,
                                                                                 101, 102, 103, 104, 105, 106, 107,
                                                                                 108, 109, 110, 111, 112, 113, 114,
                                                                                 115, 116, 117, 118, 119, 120, 121,
                                                                                 122, 123, 124, 125, 126, 127, 128,
                                                                                 129, 130, 131, 132, 133, 134, 135,
                                                                                 136, 137, 138, 139, 140, 141, 142,
                                                                                 143, 144, 145, 146, 147, 148, 149,
                                                                                 150, 151, 152, 153, 154, 155, 156,
                                                                                 157, 158, 159, 160, 161, 162, 163,
                                                                                 164, 165, 166, 167, 168, 169, 170,
                                                                                 171, 172, 173, 174, 175, 176, 177,
                                                                                 178, 179, 180, 181, 182, 183, 184,
                                                                                 185, 186, 187, 188, 189, 190, 191,
                                                                                 192, 193, 194, 195, 196, 197, 198,
                                                                                 199],
                                                                    'nodesReg': [0, 1, 2, 3, 4, 5,
                                                                                 6, 7, 8, 9, 10,
                                                                                 11, 12, 13, 14,
                                                                                 15, 16, 17, 18,
                                                                                 19, 20, 21, 22,
                                                                                 23, 24, 25, 26,
                                                                                 27, 28, 29, 30,
                                                                                 31, 32, 33, 34,
                                                                                 35, 36, 37, 38,
                                                                                 39, 40, 41, 42,
                                                                                 43, 44, 45, 46,
                                                                                 47, 48], 'extn':
                                                                        [0], 'year': LATEST_YEAR, 'idx_units':
                                                                        {'Product Output: Total': 'M.EUR'}},
                                             {'dimType': 'Production', 'vizType': 'TreeMap',
                                              'nodesSec': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                                              'nodesReg': [1], 'extn': [1], 'year': LATEST_YEAR}
                                             ])
        # get the results
        # self.results = self.task.get()
        # get the state
        self.assertEqual(self.task.state, 'SUCCESS')

        # store the results manually
        models.TaskResult.objects.create(task_id=self.task.id,  result=self.task.get())

        # retrieve via ajax
        r = self.client.post('/ajaxhandling/', {'TaskID': self.job_id, },
                             HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        result = json.loads(r.content.decode('UTF-8'))
        self.assertEqual(json.loads(self.task.get()), result["rawResultData"])


    def test_celery_bounds(self):
        self.task = execute_calc.apply(args=[self.job_id, 1, "channel_name", {'dimType': 'Production', 'vizType': 'TreeMap',
                                                                    'nodesSec': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                                                                                 11, 12, 13, 14, 15, 16, 17, 18, 19,
                                                                                 20, 21, 22, 23, 24, 25, 26, 27, 28,
                                                                                 29, 30, 31, 32, 33, 34, 35, 36, 37,
                                                                                 38, 39, 40, 41, 42, 43, 44, 45, 46,
                                                                                 47, 48, 49, 50, 51, 52, 53, 54, 55,
                                                                                 56, 57, 58, 59, 60, 61, 62, 63, 64,
                                                                                 65, 66, 67, 68, 69, 70, 71, 72, 73,
                                                                                 74, 75, 76, 77, 78, 79, 80, 81, 82,
                                                                                 83, 84, 85, 86, 87, 88, 89, 90, 91,
                                                                                 92, 93, 94, 95, 96, 97, 98, 99,
                                                                                 100,
                                                                                 101, 102, 103, 104, 105, 106, 107,
                                                                                 108, 109, 110, 111, 112, 113, 114,
                                                                                 115, 116, 117, 118, 119, 120, 121,
                                                                                 122, 123, 124, 125, 126, 127, 128,
                                                                                 129, 130, 131, 132, 133, 134, 135,
                                                                                 136, 137, 138, 139, 140, 141, 142,
                                                                                 143, 144, 145, 146, 147, 148, 149,
                                                                                 150, 151, 152, 153, 154, 155, 156,
                                                                                 157, 158, 159, 160, 161, 162, 163,
                                                                                 164, 165, 166, 167, 168, 169, 170,
                                                                                 171, 172, 173, 174, 175, 176, 177,
                                                                                 178, 179, 180, 181, 182, 183, 184,
                                                                                 185, 186, 187, 188, 189, 190, 191,
                                                                                 192, 193, 194, 195, 196, 197, 198,
                                                                                 199],
                                                                    'nodesReg': [0, 1, 2, 3, 4, 5,
                                                                                 6, 7, 8, 9, 10,
                                                                                 11, 12, 13, 14,
                                                                                 15, 16, 17, 18,
                                                                                 19, 20, 21, 22,
                                                                                 23, 24, 25, 26,
                                                                                 27, 28, 29, 30,
                                                                                 31, 32, 33, 34,
                                                                                 35, 36, 37, 38,
                                                                                 39, 40, 41, 42,
                                                                                 43, 44, 45, 46,
                                                                                 47, 48], 'extn':
                                                                        [59], 'year': LATEST_YEAR, 'idx_units':
                                                                        {'Product Output: Total': 'M.EUR'}},
                                             {'dimType': 'Production', 'vizType': 'TreeMap',
                                              'nodesSec': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                                              'nodesReg': [1], 'extn': [60], 'year': LATEST_YEAR}
                                             ])
        # get the results
        # self.results = self.task.get()
        # get the state
        self.assertEqual(self.task.state, 'SUCCESS')

        # store the results manually
        models.TaskResult.objects.create(task_id=self.task.id,  result=self.task.get())

        # retrieve via ajax
        r = self.client.post('/ajaxhandling/', {'TaskID': self.job_id, },
                             HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        result = json.loads(r.content.decode('UTF-8'))
        self.assertEqual(json.loads(self.task.get()), result["rawResultData"])

