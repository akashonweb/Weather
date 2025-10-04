"""
URL configuration for mysite project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""


from django.urls import path
from . import views

urlpatterns = [
    path('', views.index_view, name='index'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'),
	path('home/', views.home_view, name='home'),
    path('about/', views.about_view, name='about'),
	path("map/forecast/", views.map_forecast_view, name="map_forecast"),
	path('map/', views.map_view, name='map'),
    path('forecast/', views.forecast_entry, name='forecast_entry'), # /forecast/
    path('forecast/', views.forecast_entry, name='forecast_entry'), # /forecast/
    path('forecast/list/', views.forecast_list, name='forecast_list'),
    path('forecast/create/', views.forecast_create, name='forecast_create'),
    path('forecast/rainfall/', views.rainfall_forecast, name='rainfall_forecast'), # /forecast/rainfall/
    path('forecast/warnings/', views.district_warnings, name='district_warnings'),  # /forecast/warnings/
    path('realised/', views.realised_entry, name='realised_entry'), # /realised/
    path('profile/', views.profile_view, name='profile'),
    path('settings/', views.settings_view, name='settings'),
    path('forecast/save_map/', views.save_map_forecast, name='save_map_forecast'),
    path('forecast/get_map/', views.get_map_forecast, name='get_map_forecast'),





]