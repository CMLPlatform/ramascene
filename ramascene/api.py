from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ramascene import services
from ramascene.models import Job
from ramascene.serializers import JobRequestSerializer

# default cap on jobs that are queued or running at the same time (one class of 20-50 students)
DEFAULT_MAX_ACTIVE_JOBS = 50


class JobListView(APIView):
    """Start a calculation job."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = JobRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        limit = getattr(settings, "RAMASCENE_MAX_ACTIVE_JOBS", DEFAULT_MAX_ACTIVE_JOBS)
        if Job.objects.filter(status="started").count() >= limit:
            return Response({"detail": "The server is busy. Try again in a few minutes."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        job = services.submit_job(serializer.validated_data)
        return Response({
            "job_id": job.id,
            "status": job.status,
            "status_url": reverse("job-detail", args=[job.id]),
        }, status=status.HTTP_202_ACCEPTED)


class JobDetailView(APIView):
    """Status of a job, with the result once it is completed."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, job_id):
        job = get_object_or_404(Job, pk=job_id)
        body = {
            "job_id": job.id,
            "name": job.name,
            "status": job.status,
            "created": job.created,
        }
        if job.status == "completed":
            body["result"] = job.result
        return Response(body)
