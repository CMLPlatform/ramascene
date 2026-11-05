from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ramascene import dataset, services
from ramascene.models import Country, Indicator, Job, ModellingProduct, Product
from ramascene.nuts2 import load_nuts2
from ramascene.serializers import JobRequestSerializer

# default cap on jobs that are queued or running at the same time (one class of 20-50 students)
DEFAULT_MAX_ACTIVE_JOBS = 50


class JobListView(APIView):
    """Start a calculation job."""

    authentication_classes = []
    permission_classes = []

    @extend_schema(
        request=JobRequestSerializer,
        responses={
            202: inline_serializer("JobAccepted", {
                "job_id": serializers.IntegerField(),
                "status": serializers.CharField(),
                "status_url": serializers.CharField(),
            }),
            400: OpenApiResponse(description="The request body is not valid."),
            429: OpenApiResponse(description="The server is busy. Try again in a few minutes."),
        },
    )
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

    @extend_schema(
        responses={
            200: inline_serializer("JobStatus", {
                "job_id": serializers.IntegerField(),
                "name": serializers.CharField(),
                "status": serializers.CharField(),
                "created": serializers.DateTimeField(),
                "result": serializers.JSONField(required=False),
            }),
            404: OpenApiResponse(description="No job with this id."),
        },
    )
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



class CatalogView(APIView):
    """Selectable products, countries, indicators and years, with the global ids the calculations use."""

    authentication_classes = []
    permission_classes = []

    @extend_schema(responses=inline_serializer("Catalog", {
        "years": serializers.ListField(child=serializers.IntegerField()),
        "nowcast_years": serializers.ListField(child=serializers.IntegerField()),
        "unavailable": serializers.DictField(),
        "source": serializers.CharField(),
        "products": serializers.ListField(child=serializers.DictField()),
        "countries": serializers.ListField(child=serializers.DictField()),
        "indicators": serializers.ListField(child=serializers.DictField()),
        "nuts2": serializers.JSONField(),
        "consumers": serializers.ListField(child=serializers.DictField()),
    }))
    def get(self, request):
        products = Product.objects.filter(identifier="LEAF").order_by("name")
        countries = Country.objects.filter(identifier="LEAF").order_by("name")
        indicators = Indicator.objects.order_by("global_id")
        consumers = ModellingProduct.objects.filter(identifier__in=["LEAF", "FINALCONSUMPTION"]).order_by("name")
        by_name = {i.name: i.global_id for i in indicators}
        unavailable = {str(y): sorted(by_name[n] for n in dataset.unavailable(y) if n in by_name)
                       for y in dataset.years() if dataset.unavailable(y)}
        return Response({
            "years": dataset.years(),
            "nowcast_years": dataset.nowcast_years(),
            "unavailable": unavailable,
            "source": dataset.source(),
            "products": [{"global_id": p.global_id, "name": p.name, "code": p.code} for p in products],
            "countries": [{"global_id": c.global_id, "name": c.name, "code": c.code} for c in countries],
            "indicators": [{"global_id": i.global_id, "name": i.name, "unit": i.unit, "parent_id": i.parent_id,
                            "level": i.level} for i in indicators],
            "nuts2": load_nuts2(),
            "consumers": [{"global_id": m.global_id, "name": m.name, "final": m.identifier == "FINALCONSUMPTION"}
                          for m in consumers],
        })
