"""Build the slim industry dataset consumed by the /industry pages in apps/home.
Usage: python3 build_industry_json.py <data/game dir> <output json>
Only types that take part in industry (recipe inputs/outputs, facilities, regoliths) are included.
"""
import json, os, sys, collections
d, out = sys.argv[1], sys.argv[2]
icon_dir = os.environ.get("ICON_DIR")  # if set, items get an icon path when <id>.png exists there
L = lambda n: json.load(open(os.path.join(d, n), encoding="utf-8"))
types, groups, cats = L("types.json"), L("groups.json"), L("categories.json")
rec = L("recipes.json")
sc_path = os.environ.get("SPACECOMPONENTS_JSON")
regolith_ids = set()
if sc_path and os.path.exists(sc_path):
    sc = json.load(open(sc_path))
    regolith_ids = {int(t) for t, v in sc.items() if isinstance(v, dict) and "regolithBlock" in v}
else:  # fall back to group names
    regolith_ids = {int(t) for t, v in types.items() if groups.get(str(v.get("groupID")), {}).get("groupName", "").endswith("Regoliths")}

# asteroid bodies (Char, Slag, ...): the rock you scan, and the regolith it yields (dogma attribute asteroidOutputTypeID)
rocks = []
td_path, da_path = os.path.join(d, "typedogma.json"), os.path.join(d, "dogmaattributes.json")
if os.path.exists(td_path) and os.path.exists(da_path):
    td, da = json.load(open(td_path)), json.load(open(da_path))
    attr_id = next((int(k) for k, v in da.items() if v.get("name") == "asteroidOutputTypeID"), None)
    for tid, t in types.items():
        g = groups.get(str(t.get("groupID")), {}); c = cats.get(str(g.get("categoryID")), {})
        if c.get("categoryName") != "Asteroid" or not t.get("published"): continue
        attrs = (td.get(tid) or {}).get("dogmaAttributes") or []
        yields = next((int(a["value"]) for a in attrs if a.get("attributeID") == attr_id), None)
        if yields and yields in regolith_ids and int(tid) != yields:
            desc = t.get("description") or ""
            belt = "inner" if "Inner Belt" in desc else "outer" if "Outer Belt" in desc else None
            rocks.append({"id": int(tid), "output": yields, "belt": belt})
    rocks.sort(key=lambda r: types[str(r["id"])]["typeName"])
# NPC roaming-trade base price and "consumes" links from dogma (both optional)
prices, consumers = {}, {}
if os.path.exists(td_path) and os.path.exists(da_path):
    price_attr = next((int(k) for k, v in da.items() if v.get("name") == "roamingTradeBasePrice"), None)
    cons_attr = next((int(k) for k, v in da.items() if v.get("name") == "consumptionType"), None)
    for tid, e in td.items():
        for a in e.get("dogmaAttributes") or []:
            if a.get("attributeID") == price_attr and a.get("value"): prices[int(tid)] = a["value"]
            if a.get("attributeID") == cons_attr and a.get("value"): consumers.setdefault(int(a["value"]), []).append(int(tid))
ids = set(regolith_ids) | {r["id"] for r in rocks}
for k, v in consumers.items(): ids.add(k); ids.update(v)
for r in rec["recipes"]:
    ids.add(r["product"]["typeID"]); ids.update(i["typeID"] for i in r["inputs"]); ids.update(o["typeID"] for o in r["outputs"])
    ids.update(f["facilityTypeID"] for f in r["facilities"])
for r in rec["reprocessing"]:
    ids.add(r["typeID"]); ids.update(m["typeID"] for m in r["materials"])
ids.update(f["typeID"] for f in rec["facilities"])

def tinfo(tid):
    t = types.get(str(tid), {}); g = groups.get(str(t.get("groupID")), {}); c = cats.get(str(g.get("categoryID")), {})
    return {"id": tid, "name": t.get("typeName", "type %s" % tid), "group": g.get("groupName", "?"), "category": c.get("categoryName", "?"),
            "published": bool(t.get("published")), "volume": t.get("volume"), "mass": t.get("mass"), "portionSize": t.get("portionSize"), "description": __import__("re").sub(r"<[^>]+>", "", (t.get("description") or ""))[:900] or None}
items = {str(i): tinfo(i) for i in sorted(ids)}
for i in regolith_ids: items[str(i)]["regolith"] = True
for i, pr in prices.items():
    if str(i) in items: items[str(i)]["price"] = pr
if icon_dir:
    for k, it in items.items():
        if os.path.exists(os.path.join(icon_dir, f"{it['id']}.png")): it["icon"] = f"/industry/icons/{it['id']}.png"

recipes = [{"id": r["blueprintID"], "product": r["product"]["typeID"], "time": r["runTimeSeconds"],
            "inputs": [{"id": i["typeID"], "qty": i["quantity"]} for i in r["inputs"]],
            "outputs": [{"id": o["typeID"], "qty": o["quantity"]} for o in r["outputs"]],
            "facilities": [{"id": f["facilityTypeID"], "maxInputRuns": f["maxInputRuns"], "maxOutputRuns": f["maxOutputRuns"]} for f in r["facilities"]]} for r in rec["recipes"]]
facilities = [{"id": f["typeID"], "name": f["name"], "blueprints": f["blueprintIDs"]} for f in rec["facilities"]]
reprocessing = [{"id": r["typeID"], "portionSize": r["portionSize"], "materials": [{"id": m["typeID"], "qty": m["quantity"]} for m in r["materials"]]} for r in rec["reprocessing"]]
version = open(os.path.join(d, "client_version.txt")).read().strip().replace("\n", ", ") if os.path.exists(os.path.join(d, "client_version.txt")) else "?"
data = {"clientVersion": version, "items": items, "recipes": recipes, "facilities": facilities, "reprocessing": reprocessing, "rocks": rocks, "consumedBy": {str(k): v for k, v in consumers.items() if str(k) in items}}
with open(out, "w", encoding="utf-8") as fh:
    json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
print(f"wrote {out}: {len(items)} items, {len(recipes)} recipes, {len(facilities)} facilities, {len(reprocessing)} reprocessing, {len(regolith_ids)} regoliths, {len(rocks)} rocks; {os.path.getsize(out)//1024} KB")
