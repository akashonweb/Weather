
# Create your views here.
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login , logout
from django.contrib import messages
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth.decorators import login_required
from .models import MapForecast

def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            messages.success(request, f"Welcome back, {user.username}!")
            return redirect("home")
        else:
            messages.error(request, "Invalid username or password")
            return redirect("login")

    return render(request, "login.html")

def home_view(request):
    return render(request, "home.html")

def logout_view(request):
    logout(request)
    messages.info(request, "Logged out.")
    return redirect("index")

def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        confirm_password = request.POST.get("confirm_password")

        if password != confirm_password:
            messages.error(request, "Passwords do not match")
            return redirect("register")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken")
            return redirect("register")

        # create new user
        user = User.objects.create_user(username=username, password=password)
        messages.success(request, "Account created successfully! Please log in.")
        return redirect("login")

    return render(request, "register.html")

def index_view(request):
    return render(request, "index.html")

#@login_required
def home_view(request):
    # simple dashboard that links to the map forecast page when authenticated
    return render(request, "home.html")

def about_view(request):
    return render(request, "about.html")
    
def map_forecast_view(request):
    # Renders the map-based forecast entry page
    ctx = {"today": timezone.localdate().isoformat()}
    return render(request, 'map_forecast.html', ctx)

def map_view(request):
    # Renders the map page that loads static/geojson/wb_districts.geojson
    return render(request, 'map.html')

#@login_required
def rainfall_forecast(request):
    # page that should display the map (we will include your existing map.html here)
    # If your existing map template is core/map.html, we can extend it or include it.
    return render(request, 'map.html')

#@login_required
def district_warnings(request):
    # simple placeholder — you can fill with real content later
    return render(request, 'district_warnings.html')

#@login_required
def realised_entry(request):
    # placeholder for realised entry page
    return render(request, 'realised_entry.html')

def forecast_entry(request):
    # placeholder for realised entry page
    return render(request, 'forecast_entry.html')

from django.contrib.auth.decorators import login_required

@login_required
def profile_view(request):
    return render(request, 'profile.html')

@login_required
def settings_view(request):
    return render(request, 'settings.html')

def forecast_list(request):
    """
    Minimal placeholder view for the forecasts list.
    Replace 'forecasts' with real queryset when you add models.
    """
    # TODO: replace with real data from models
    forecasts = []  # placeholder list
    return render(request, "forecast_list.html", {"forecasts": forecasts})


def forecast_create(request):
    """
    Minimal placeholder view to create a new forecast.
    Accepts GET to render a basic form and POST to handle submission.
    Update to use a Django Form / ModelForm when available.
    """
    if request.method == "POST":
        # Placeholder: implement saving logic or form handling
        # For now, show a message and redirect back to list
        messages.success(request, "Forecast saved (placeholder).")
        return redirect("forecast_list")
    # GET => render a simple form/template
    return render(request, "forecast_create.html", {})


@login_required
@require_POST
def save_map_forecast(request):
    """
    Save or update the MapForecast for a given date.
    Expects JSON body:
      { "date": "YYYY-MM-DD", "scope": "mixed", "data": { area_id: {category, rainfall_mm}, ... } }
    """
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponseBadRequest("Invalid JSON body.")

    date_str = payload.get("date")
    if not date_str:
        return HttpResponseBadRequest("Missing 'date' in request body.")
    d = parse_date(date_str)
    if not d:
        return HttpResponseBadRequest("Invalid 'date' format. Use YYYY-MM-DD.")

    data = payload.get("data")
    if not isinstance(data, dict):
        return HttpResponseBadRequest("'data' must be an object mapping area_id -> forecast object.")

    scope = payload.get("scope", "mixed")

    obj, created = MapForecast.objects.update_or_create(
        date=d,
        defaults={
            "data": data,
            "scope": scope,
            "entered_by": request.user,
        },
    )

    return JsonResponse({
        "ok": True,
        "created": created,
        "id": obj.id,
        "date": str(obj.date),
    })


@login_required
@require_GET
def get_map_forecast(request):
    """
    Return the MapForecast for the requested date.
    Query param: ?date=YYYY-MM-DD
    """
    date_str = request.GET.get("date")
    if not date_str:
        return HttpResponseBadRequest("Please provide ?date=YYYY-MM-DD")
    d = parse_date(date_str)
    if not d:
        return HttpResponseBadRequest("Invalid date format.")

    try:
        obj = MapForecast.objects.get(date=d)
    except MapForecast.DoesNotExist:
        return JsonResponse({"ok": True, "found": False, "date": date_str})

    return JsonResponse({
        "ok": True,
        "found": True,
        "date": str(obj.date),
        "scope": obj.scope,
        "data": obj.data
    })