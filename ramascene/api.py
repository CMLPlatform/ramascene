from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ramascene import services
from ramascene.models import Country, Indicator, Job, Product
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


# years covered by the EXIOBASE dataset (v4 binaries, see DATASET_DIR)
DATASET_YEARS = list(range(1995, 2012))


class CatalogView(APIView):
    """Selectable products, countries, indicators and years, with the global ids the calculations use."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        products = Product.objects.filter(identifier="LEAF").order_by("name")
        countries = Country.objects.filter(identifier="LEAF").order_by("name")
        indicators = Indicator.objects.order_by("name")
        return Response({
            "years": DATASET_YEARS,
            "products": [{"global_id": p.global_id, "name": p.name, "code": p.code} for p in products],
            "countries": [{"global_id": c.global_id, "name": c.name, "code": c.code} for c in countries],
            "indicators": [{"global_id": i.global_id, "name": i.name, "unit": i.unit} for i in indicators],
        })
