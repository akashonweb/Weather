# core/admin.py
from django.contrib import admin
from .models import District, ForecastEntry, RealizedEntry, WarningEntry, VerificationScore , MapForecast
@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "geojson_file")
    search_fields = ("name", "code")


@admin.register(ForecastEntry)
class ForecastEntryAdmin(admin.ModelAdmin):
    list_display = ("district", "date", "horizon", "rainfall_mm", "entered_by", "entered_at")
    list_filter = ("horizon", "date", "source")
    search_fields = ("district__name", "district__code")


@admin.register(RealizedEntry)
class RealizedEntryAdmin(admin.ModelAdmin):
    list_display = ("district", "date", "horizon", "rainfall_mm", "observed_at")


@admin.register(WarningEntry)
class WarningEntryAdmin(admin.ModelAdmin):
    list_display = ("district", "date", "horizon", "phenomenon", "severity", "created_by", "created_at")


@admin.register(VerificationScore)
class VerificationScoreAdmin(admin.ModelAdmin):
    list_display = ("date", "horizon", "metric", "district", "value", "computed_at")
    list_filter = ("metric", "horizon", "date")



@admin.register(MapForecast)
class MapForecastAdmin(admin.ModelAdmin):
    list_display = ("date", "scope", "entered_by", "updated_at")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-date",)