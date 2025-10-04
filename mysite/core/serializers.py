# core/serializers.py
from rest_framework import serializers
from .models import District, ForecastEntry, RealizedEntry, WarningEntry, VerificationScore

class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ["id", "code", "name", "geojson_file"]


class ForecastEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ForecastEntry
        fields = "__all__"
        read_only_fields = ("entered_by", "entered_at")


class RealizedEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = RealizedEntry
        fields = "__all__"
        read_only_fields = ("entered_by", "entered_at")


class WarningEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WarningEntry
        fields = "__all__"
        read_only_fields = ("created_by", "created_at")


class VerificationScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationScore
        fields = "__all__"
