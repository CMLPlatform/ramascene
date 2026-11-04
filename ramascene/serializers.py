from rest_framework import serializers

from ramascene.models import Country, ModellingProduct, Product

# the four view combinations the analysis routes understand (see tasks.execute_calc)
VALID_VIEWS = {
    ("Contribution", "Geographic"),
    ("Hotspot", "Geographic"),
    ("Contribution", "Sectoral"),
    ("Hotspot", "Sectoral"),
}
REQUIRED_SELECTION_KEYS = ("dimType", "vizType", "nodesSec", "nodesReg", "extn", "year")


MAX_TECH_CHANGE = 100.0


class InterventionSerializer(serializers.Serializer):
    """One scenario change: a product from a producing region, consumed by a consumer in a consuming region.

    consumedBy is a modelling product: a sector for technology changes, or the final consumption node.
    """

    originReg = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    consumedReg = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    product = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    consumedBy = serializers.ListField(child=serializers.IntegerField(), min_length=1, max_length=1)
    techChange = serializers.ListField(child=serializers.FloatField(), min_length=1, max_length=1)

    def validate_techChange(self, value):
        if abs(value[0]) > MAX_TECH_CHANGE:
            raise serializers.ValidationError(f"change must be between -{MAX_TECH_CHANGE:g} and {MAX_TECH_CHANGE:g}")
        return value

    def validate(self, attrs):
        regions = set(attrs["originReg"]) | set(attrs["consumedReg"])
        if Country.objects.filter(global_id__in=regions).count() != len(regions):
            raise serializers.ValidationError("unknown country id")
        if Product.objects.filter(global_id__in=attrs["product"]).count() != len(set(attrs["product"])):
            raise serializers.ValidationError("unknown product id")
        if not ModellingProduct.objects.filter(global_id=attrs["consumedBy"][0]).exists():
            raise serializers.ValidationError("unknown consumer id")
        return attrs


class JobRequestSerializer(serializers.Serializer):
    """Request body for starting a calculation job."""

    action = serializers.ChoiceField(choices=["default", "model"])
    querySelection = serializers.DictField()
    model_details = InterventionSerializer(many=True, required=False)

    def validate_querySelection(self, value):
        missing = [key for key in REQUIRED_SELECTION_KEYS if key not in value]
        if missing:
            raise serializers.ValidationError(f"missing keys: {', '.join(missing)}")
        if (value["dimType"], value["vizType"]) not in VALID_VIEWS:
            raise serializers.ValidationError(
                f"unknown view: dimType={value['dimType']!r}, vizType={value['vizType']!r}")
        if not isinstance(value["year"], list) or len(value["year"]) == 0:
            raise serializers.ValidationError("year must be a non-empty list")
        for key in ("nodesSec", "nodesReg", "extn"):
            if not isinstance(value[key], list):
                raise serializers.ValidationError(f"{key} must be a list")
        return value

    def validate(self, attrs):
        if attrs["action"] == "model" and not attrs.get("model_details"):
            raise serializers.ValidationError({"model_details": "at least one intervention is required for action 'model'"})
        return attrs
