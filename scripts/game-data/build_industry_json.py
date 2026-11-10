"""Build the slim industry dataset consumed by the /industry pages in apps/home.
Usage: python3 build_industry_json.py <data/game dir> <output json>

Since 0.7.6.0 (Digital Chemistry) crafting runs on schemas: the recipe* tables. A schema input slot can ask
for a specific item or for any material with a trait; trait-only slots become stand-in items with negative
ids ("Any Radome material") so the graph, planner and browser can treat them like any other input.
Only types that take part in industry (schema inputs/outputs, facilities, regoliths) are included.
"""
import json, os, sys, re, collections
d, out = sys.argv[1], sys.argv[2]
icon_dir = os.environ.get("ICON_DIR")  # if set, items get an icon path when <id>.png exists there
def L(n, default=None):
    p = os.path.join(d, n)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default
types, groups, cats = L("types.json"), L("groups.json"), L("categories.json")
R, RI, RIT, RO = L("recipe.json"), L("recipeinput.json"), L("recipeinputtrait.json"), L("recipeoutput.json")
RF, YS = L("recipefacilities.json"), L("recipeoutputyieldsource.json", {})
P, T, TP = L("property.json"), L("trait.json"), L("traitproperty.json")
NP, NT = L("neotypeproperty.json", {}), L("neotypetrait.json", {})
regolith_ids = {int(t) for t, v in types.items() if groups.get(str(v.get("groupID")), {}).get("groupName", "").endswith("Regoliths")}

# asteroid bodies (Char, Slag, ...): the rock you scan, and the regolith it yields (dogma attribute asteroidOutputTypeID)
rocks, prices, consumers = [], {}, {}
td, da = L("typedogma.json"), L("dogmaattributes.json")
if td and da:
    attr = lambda name: next((int(k) for k, v in da.items() if v.get("name") == name), None)
    out_attr, price_attr, cons_attr = attr("asteroidOutputTypeID"), attr("roamingTradeBasePrice"), attr("consumptionType")
    for tid, t in types.items():
        g = groups.get(str(t.get("groupID")), {}); c = cats.get(str(g.get("categoryID")), {})
        if c.get("categoryName") != "Asteroid" or not t.get("published"): continue
        yields = next((int(a["value"]) for a in (td.get(tid) or {}).get("dogmaAttributes") or [] if a.get("attributeID") == out_attr), None)
        if yields and yields in regolith_ids and int(tid) != yields:
            desc = t.get("description") or ""
            rocks.append({"id": int(tid), "output": yields, "belt": "inner" if "Inner Belt" in desc else "outer" if "Outer Belt" in desc else None})
    rocks.sort(key=lambda r: types[str(r["id"])]["typeName"])
    for tid, e in td.items():
        for a in e.get("dogmaAttributes") or []:
            if a.get("attributeID") == price_attr and a.get("value"): prices[int(tid)] = a["value"]
            if a.get("attributeID") == cons_attr and a.get("value"): consumers.setdefault(int(a["value"]), []).append(int(tid))

# --- traits: who can fill a slot ------------------------------------------------------------------
# Discrete parts list their traits (neotypetrait); bulk materials qualify when some variant's property
# range overlaps every range the trait asks for. Both count as "can fill".
ranges = {int(i): {p["propertyID"]: (p.get("minValue", -1e300), p.get("maxValue", 1e300)) for p in v.get("properties", [])} for i, v in NP.items()}
listed = collections.defaultdict(set)
for i, v in NT.items():
    for x in v.get("traits", []): listed[x["traitID"]].add(int(i))
def overlaps(item, tid):
    need = TP.get(str(tid), {}).get("properties", [])
    if not need: return False
    have = ranges.get(item, {})
    for c in need:
        r = have.get(c["propertyID"])
        if r is None or ("minValue" in c and r[1] < c["minValue"]) or ("maxValue" in c and r[0] > c["maxValue"]): return False
    return True
def members(tid): return sorted(listed[tid] | {i for i in ranges if overlaps(i, tid)})

# --- schemas ----------------------------------------------------------------------------------------
fac_of = collections.defaultdict(list)
for fid, v in RF.items():
    for x in v["recipes"]: fac_of[x["recipeID"]].append({"id": int(fid), "maxInputRuns": x["maxMultiplier"], "maxOutputRuns": x["maxMultiplier"]})
used_traits, recipes = set(), []
for rid, r in R.items():
    rid = int(rid)
    if rid not in fac_of: continue  # test schemas and Basic Sand have no facility
    slot_trait = {x["inputIndex"]: x["traitID"] for x in RIT.get(str(rid), {}).get("traits", [])}
    yield_from = collections.defaultdict(set)
    for s in YS.get(str(rid), {}).get("sources", []): yield_from[s["outputIndex"]].add(s["sourcePropertyID"])
    inputs = []
    for x in sorted(RI[str(rid)]["inputs"], key=lambda x: x["inputIndex"]):
        tr = slot_trait.get(x["inputIndex"])
        if "typeID" not in x and tr is None: continue
        if tr is not None: used_traits.add(tr)
        inputs.append({"id": x["typeID"] if "typeID" in x else -tr, "qty": x["quantity"], **({"trait": tr} if tr is not None else {})})
    outputs = [{"id": o["typeID"], "qty": o["quantity"], **({"yieldBy": sorted(yield_from[o["outputIndex"]])} if yield_from.get(o["outputIndex"]) else {})}
               for o in sorted(RO[str(rid)]["outputs"], key=lambda o: o["outputIndex"])]
    if not outputs: continue
    recipes.append({"id": rid, "name": r["name"], "kind": r["recipeType"], "product": outputs[0]["id"], "time": r["duration"],
                    "inputs": inputs, "outputs": outputs, "facilities": fac_of[rid]})
recipes.sort(key=lambda r: r["id"])

ids = set(regolith_ids) | {r["id"] for r in rocks}
for k, v in consumers.items(): ids.add(k); ids.update(v)
for r in recipes:
    ids.update(i["id"] for i in r["inputs"] if i["id"] > 0); ids.update(o["id"] for o in r["outputs"]); ids.update(f["id"] for f in r["facilities"])
trait_members = {t: members(t) for t in used_traits}
for m in trait_members.values(): ids.update(m)
reprocessing = [{"id": int(k), "portionSize": types.get(k, {}).get("portionSize"), "materials": [{"id": m["materialTypeID"], "qty": m["quantity"]} for m in v.get("materials", [])]}
                for k, v in (L("typematerials.json") or {}).items()]
for r in reprocessing: ids.add(r["id"]); ids.update(m["id"] for m in r["materials"])

strip = lambda s: re.sub(r"<[^>]+>", "", s or "")[:900] or None
def tinfo(tid):
    t = types.get(str(tid), {}); g = groups.get(str(t.get("groupID")), {}); c = cats.get(str(g.get("categoryID")), {})
    it = {"id": tid, "name": t.get("typeName", "type %s" % tid), "group": g.get("groupName", "?"), "category": c.get("categoryName", "?"),
          "published": bool(t.get("published")), "volume": t.get("volume"), "mass": t.get("mass"), "portionSize": t.get("portionSize"), "description": strip(t.get("description"))}
    if t.get("quantityKind") == "continuous": it["unit"] = "kg"  # bulk material, measured by mass since 0.7.6.0
    rg = ranges.get(tid)
    if rg:
        it["props"] = [{"id": p, "min": lo, "max": hi} for p, (lo, hi) in sorted(rg.items())]
    tr =sorted(t_ for t_, m in trait_members.items() if tid in m)
    if tr: it["traits"] = tr
    return it
items = {str(i): tinfo(i) for i in sorted(ids)}
for i in regolith_ids: items[str(i)]["regolith"] = True
for i, pr in prices.items():
    if str(i) in items: items[str(i)]["price"] = pr
for t in sorted(used_traits):
    tr = T.get(str(t), {})
    items[str(-t)] = {"id": -t, "name": "Any %s material" % tr.get("name", t), "group": "Trait", "category": "Trait", "published": True,
                      "description": strip(tr.get("description")), "trait": t, "unit": "kg"}
if icon_dir:
    for k, it in items.items():
        if it["id"] > 0 and os.path.exists(os.path.join(icon_dir, f"{it['id']}.png")): it["icon"] = f"/industry/icons/{it['id']}.png"

fac_names = lambda fid: types.get(str(fid), {}).get("typeName", str(fid))
facilities = [{"id": int(fid), "name": fac_names(fid), "blueprints": sorted(x["recipeID"] for x in v["recipes"] if x["recipeID"] in {r["id"] for r in recipes})} for fid, v in RF.items()]
traits = {str(t): {"name": T.get(str(t), {}).get("name"), "description": strip(T.get(str(t), {}).get("description")),
                   "needs": [{"prop": c["propertyID"], **({"min": c["minValue"]} if "minValue" in c else {}), **({"max": c["maxValue"]} if "maxValue" in c else {})} for c in TP.get(str(t), {}).get("properties", [])],
                   "members": trait_members[t]} for t in sorted(used_traits)}
prop_ids = {p for it in items.values() for p in [x["id"] for x in it.get("props", [])]} | {c["prop"] for tr in traits.values() for c in tr["needs"]} | {p for r in recipes for o in r["outputs"] for p in o.get("yieldBy", [])}
properties = {str(p): {"name": P[str(p)]["name"], "kind": P[str(p)]["kind"], "min": P[str(p)].get("naturalMin"), "max": P[str(p)].get("naturalMax")} for p in sorted(prop_ids) if str(p) in P}

ini = os.path.join(d, "start.ini"); cv = os.path.join(d, "client_version.txt")
if os.path.exists(ini):
    kv = dict(l.strip().split(" = ", 1) for l in open(ini) if " = " in l)
    version = f"version = {kv.get('version')}, build = {kv.get('build')}, codename = {kv.get('codename')}, branch = {kv.get('branch')}"
else:
    version = open(cv).read().strip().replace("\n", ", ") if os.path.exists(cv) else "?"
data = {"clientVersion": version, "items": items, "recipes": recipes, "facilities": facilities, "reprocessing": reprocessing, "rocks": rocks,
        "traits": traits, "properties": properties, "consumedBy": {str(k): v for k, v in consumers.items() if str(k) in items}}
with open(out, "w", encoding="utf-8") as fh:
    json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
kinds = collections.Counter(r["kind"] for r in recipes)
print(f"wrote {out}: {len(items)} items, {len(recipes)} schemas ({dict(kinds)}), {len(facilities)} facilities, {len(traits)} traits, {len(properties)} properties, {len(regolith_ids)} regoliths, {len(rocks)} rocks; {os.path.getsize(out)//1024} KB")
