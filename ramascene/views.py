from django.shortcuts import render
from django.http import JsonResponse
from .models import Job
from django_celery_results import models
import json
from django.views.decorators.csrf import csrf_exempt

def home(request):
    return render(request,'ramascene/home.html')

@csrf_exempt
def ajaxHandling(request):
    if request.method == 'POST':
        try:

            #start retrieving taskID/JobID
            jobId = request.POST.get('TaskID')

            # The model Job has a primary key that is exactly the matching jobID from the front-end
            celery_id = Job.objects.values_list('celery_id', flat=True).get(pk=jobId)

            if not (celery_id is None):
                #the model Task Results contains the results, so search via celery_id to get the results
                result = models.TaskResult.objects.values_list('result', flat=True).get(task_id=celery_id)
                cleaned_result = json.loads(result)

                data = {
                    'rawResultData': cleaned_result,
                }
                return JsonResponse(data)
            else:
                data = {
                    'status': "job failed (celery_id not found)",
                }
                return JsonResponse(data)
        except Exception as e:
            data = {
                'status': "job failed (Cannot fetch database jobID:"+ str(jobId) +" " + str(type(jobId))+")******"+str(e)+"*********" +"celeryID:"+str(celery_id),
            }
            return JsonResponse(data)
    else:
        return render(request, 'ramascene/error.html')