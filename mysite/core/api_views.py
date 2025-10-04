# core/api_views.py
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import District, ForecastEntry, RealizedEntry, WarningEntry, VerificationScore
from .serializers import (
    DistrictSerializer, ForecastEntrySerializer,
    RealizedEntrySerializer, WarningEntrySerializer,
    VerificationScoreSerializer
)

class DistrictViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = District.objects.all().order_by("name")
    serializer_class = DistrictSerializer
    permission_classes = [permissions.IsAuthenticated]


class ForecastViewSet(viewsets.ModelViewSet):
    queryset = ForecastEntry.objects.all().select_related("district").order_by("-date")
    serializer_class = ForecastEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["district__name", "district__code"]

    def perform_create(self, serializer):
        serializer.save(entered_by=self.request.user)

    @action(detail=False, methods=["get"])
    def by_date(self, request):
        # /api/forecasts/by_date/?date=YYYY-MM-DD&horizon=1
        date = request.query_params.get("date")
        horizon = request.query_params.get("horizon")
        qs = self.queryset
        if date:
            qs = qs.filter(date=date)
        if horizon:
            qs = qs.filter(horizon=horizon)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)


class RealizedViewSet(viewsets.ModelViewSet):
    queryset = RealizedEntry.objects.all().select_related("district").order_by("-date")
    serializer_class = RealizedEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(entered_by=self.request.user)


class WarningViewSet(viewsets.ModelViewSet):
    queryset = WarningEntry.objects.all().select_related("district").order_by("-date")
    serializer_class = WarningEntrySerializer
    permission_classes = [permissions.IsAuthenticated]


class VerificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VerificationScore.objects.all().order_by("-computed_at")
    serializer_class = VerificationScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
