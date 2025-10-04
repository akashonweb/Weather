# core/management/commands/compute_verification.py
from django.core.management.base import BaseCommand
from django.db.models import F
from core.models import ForecastEntry, RealizedEntry, VerificationScore, District
from datetime import date, timedelta
import math

class Command(BaseCommand):
    help = "Compute simple verification metrics for forecasts vs realized."

    def add_arguments(self, parser):
        parser.add_argument("--start", type=str, help="start date YYYY-MM-DD", required=True)
        parser.add_argument("--end", type=str, help="end date YYYY-MM-DD", required=True)
        parser.add_argument("--horizon", type=int, default=1)

    def handle(self, *args, **options):
        start = options["start"]
        end = options["end"]
        horizon = options["horizon"]
        from datetime import datetime
        start_d = datetime.fromisoformat(start).date()
        end_d = datetime.fromisoformat(end).date()

        # iterate districts
        districts = District.objects.all()
        threshold = 2.5  # mm threshold for event
        for d in districts:
            # pair forecasts and realized by date
            f_qs = ForecastEntry.objects.filter(district=d, horizon=horizon, date__range=(start_d, end_d))
            r_qs = RealizedEntry.objects.filter(district=d, horizon=horizon, date__range=(start_d, end_d))

            # map by date
            f_map = {f.date: f for f in f_qs}
            r_map = {r.date: r for r in r_qs}
            paired_dates = set(f_map.keys()) & set(r_map.keys())
            if not paired_dates:
                continue

            abs_errors = []
            H = F = M = 0
            for dt in paired_dates:
                fval = f_map[dt].rainfall_mm or 0.0
                oval = r_map[dt].rainfall_mm or 0.0
                abs_errors.append(abs(fval - oval))
                f_evt = fval >= threshold
                o_evt = oval >= threshold
                if f_evt and o_evt:
                    H += 1
                elif f_evt and not o_evt:
                    F += 1
                elif not f_evt and o_evt:
                    M += 1

            mae = sum(abs_errors)/len(abs_errors) if abs_errors else None
            csi = H / (H+F+M) if (H+F+M) else None
            pod = H / (H+M) if (H+M) else None
            far = F / (H+F) if (H+F) else None

            # store VerificationScore records
            if mae is not None:
                VerificationScore.objects.create(date=end_d, horizon=horizon,
                    metric="MAE", district=d, value=mae)
            if pod is not None:
                VerificationScore.objects.create(date=end_d, horizon=horizon,
                    metric="POD", district=d, value=pod)
            if far is not None:
                VerificationScore.objects.create(date=end_d, horizon=horizon,
                    metric="FAR", district=d, value=far)
            if csi is not None:
                VerificationScore.objects.create(date=end_d, horizon=horizon,
                    metric="CSI", district=d, value=csi)

        self.stdout.write(self.style.SUCCESS("Verification compute done."))
