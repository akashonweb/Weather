# make_districts_csv.py
import json
import os
geojson_path ="C:\Project\Weather\mysite\utilities\static\geojson\wb_districts.geojson"
out_csv = "other_states_from_geojson.csv"

print(os.path)
print(geojson_path)

with open(geojson_path, "r", encoding="utf8") as f:
    print(geojson_path)
    gj = json.load(f)

features = gj.get("features", [])
rows = []
for feat in features:
    props = feat.get("properties", {})
    # try the property names I observed: Dist_Code and Dist_Name
    code = props.get("Dist_Code") or props.get("DIST_CODE") or props.get("DIST_CODE_1") or props.get("DistCode") or props.get("code")
    name = props.get("Dist_Name") or props.get("DIST_NAME") or props.get("name") or props.get("Name")
    if not code:
        # fallback: try id or name alone
        code = props.get("id") or props.get("ID") or name
    if not name:
        name = code
    rows.append((str(code).strip(), str(name).strip()))

if not rows:
    raise SystemExit("No features or no properties found in geojson. Check static/geojson/wb_districts.geojson")

# write csv
with open(out_csv, "w", encoding="utf8") as fo:
    fo.write("code,name,geojson_file\n")
    for code, name in rows:
        # write geojson_file as the code too (used by earlier import pattern)
        fo.write(f"{code},{name},{code}\n")

print(f"Wrote {len(rows)} rows to {out_csv}")
