import subprocess
import sys

# Function to install packages
def install_if_absent(package):
    try:
        __import__(package)
        print(f"✅ {package} already installed")
    except ImportError:
        print(f"📦 Installing {package} ...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Ensure geopandas is installed
install_if_absent("geopandas")

# Now you can safely import and use it

import geopandas as gpd

# Path to your shapefile
shapefile_path = "C:\Project\Weather\mysite\static\geojson\society-states.shp"

# Read shapefile
gdf = gpd.read_file(shapefile_path)

# Save as GeoJSON
geojson_path ="C:\Project\Weather\mysite\static\geojson\rmc-kolkata.geojson"
gdf.to_file(geojson_path, driver="GeoJSON")

print("✅ GeoJSON file created:", geojson_path)
