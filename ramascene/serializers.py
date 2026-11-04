from rest_framework import serializers

# the four view combinations the analysis routes understand (see tasks.execute_calc)
VALID_VIEWS = {
    ("Contribution", "Geographic"),
    ("Hotspot", "Geographic"),
    ("Contribution", "Sectoral"),
    ("Hotspot", "Sectoral"),
}
REQUIRED_SELECTION_KEYS = ("dimType", "vizType", "nodesSec", "nodesReg", "extn", "year")


class JobRequestSerializer(serializers.Serializer):
    """Request body for starting a calculation job."""

    action = serializers.ChoiceField(choices=["default", "model"])
    querySelection = serializers.DictField()
    model_details = serializers.ListField(child=serializers.DictField(), required=False)

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
        if attrs["action"] == "model" and "model_details" not in attrs:
            raise serializers.ValidationError({"model_details": "required for action 'model'"})
        return attrs
