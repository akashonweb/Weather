# core/management/commands/import_districts.py
import csv
from django.core.management.base import BaseCommand
from core.models import District

class Command(BaseCommand):
    help = "Import districts from CSV: code,name,geojson_file (geojson_file optional)"

    def add_arguments(self, parser):
        parser.add_argument("csvfile", type=str)

    def handle(self, *args, **options):
        fpath = options["csvfile"]
        created = 0
        updated = 0
        with open(fpath, newline="", encoding="utf8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                code = row.get("code") or row.get("district_code") or row.get("id")
                name = row.get("name") or row.get("district_name")
                geo = row.get("geojson_file") or row.get("geojson")
                if not code or not name:
                    self.stdout.write(self.style.WARNING(f"Skipping row missing code/name: {row}"))
                    continue
                obj, ok = District.objects.update_or_create(
                    code=code.strip(),
                    defaults={"name": name.strip(), "geojson_file": (geo or "").strip()},
                )
                if ok:
                    created += 1
                else:
                    updated += 1
        self.stdout.write(self.style.SUCCESS(f"Import done. created={created} updated={updated}"))
