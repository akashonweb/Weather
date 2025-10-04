# core/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone


class District(models.Model):
    code = models.CharField(max_length=32, unique=True)   # stable key, e.g. 'ALIPORE_42807'
    name = models.CharField(max_length=120)
    geojson_file = models.CharField(max_length=255, blank=True, null=True,
                                    help_text="relative path under static/geojson or filename")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class ForecastEntryBase(models.Model):
    district = models.ForeignKey(District, on_delete=models.PROTECT, related_name="%(class)ss")
    date = models.DateField(help_text="Date the forecast is for (YYYY-MM-DD)")
    horizon = models.PositiveSmallIntegerField(help_text="Forecast horizon in days (1..7)", default=1)
    rainfall_mm = models.FloatField(null=True, blank=True)
    rainfall_category = models.CharField(max_length=32, blank=True, null=True)
    extras = models.JSONField(default=dict, blank=True)    # store optional values like temperatures
    entered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    entered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        unique_together = ("district", "date", "horizon")


class ForecastEntry(ForecastEntryBase):
    source = models.CharField(max_length=32, default="manual")
    version = models.CharField(max_length=32, blank=True, null=True)

    class Meta(ForecastEntryBase.Meta):
        verbose_name = "Forecast Entry"


class RealizedEntry(ForecastEntryBase):
    observed_at = models.DateTimeField(null=True, blank=True)

    class Meta(ForecastEntryBase.Meta):
        verbose_name = "Realized Entry"


class WarningEntry(models.Model):
    district = models.ForeignKey(District, on_delete=models.PROTECT)
    date = models.DateField()
    horizon = models.PositiveSmallIntegerField(default=1)
    phenomenon = models.CharField(max_length=64)  # e.g., "Heavy Rain", "Heat Wave"
    severity = models.CharField(max_length=32, blank=True, null=True)  # e.g., "Yellow","Orange","Red"
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("district", "date", "horizon", "phenomenon")


class VerificationScore(models.Model):
    # aggregated verification results for a district (or null for aggregated region)
    date = models.DateField(help_text="Date or period end the metric refers to")
    horizon = models.PositiveSmallIntegerField(default=1)
    metric = models.CharField(max_length=64)  # e.g., 'MAE', 'RMSE', 'POD', 'FAR', 'CSI'
    district = models.ForeignKey(District, null=True, blank=True, on_delete=models.SET_NULL)
    value = models.FloatField()
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["date", "horizon", "metric"]),
        ]

    def __str__(self):
        d = self.district.name if self.district else "REGIONAL"
        return f"{self.date} H{self.horizon} {self.metric} {d} = {self.value:.3f}"



class MapForecast(models.Model):
    """
    One row per date containing the forecast for the whole map (districts + states).
    'data' stores mapping area_id -> { "category": "DRY", "rainfall_mm": null, ... }
    """
    SCOPE_CHOICES = [
        ("district", "District-level"),
        ("state", "State-level"),
        ("mixed", "Mixed (district+states)"),
    ]

    date = models.DateField(unique=True, help_text="Forecast valid date (one row per date).")
    scope = models.CharField(max_length=16, choices=SCOPE_CHOICES, default="mixed")
    data = models.JSONField(default=dict, help_text="Map of area_id -> {category, rainfall_mm, ...}")
    entered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        verbose_name = "Map Forecast"
        verbose_name_plural = "Map Forecasts"

    def __str__(self):
        return f"MapForecast {self.date} ({self.scope})"
