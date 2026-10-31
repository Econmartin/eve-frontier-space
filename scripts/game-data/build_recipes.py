"""Join the raw FSD dumps into a recipe graph (recipes.json) and a readable RECIPES.md.
Usage: python3 build_recipes.py <data_dir>
"""
import json, os, sys
from collections import defaultdict

d = sys.argv[1]
def load(n):
    p = os.path.join(d, n + ".json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}

types, groups, cats = load("types"), load("groups"), load("categories")
bps, facs, mats = load("industry_blueprints"), load("industry_facilities"), load("typematerials")
version = open(os.path.join(d, "client_version.txt")).read().strip().replace("\n", ", ") if os.path.exists(os.path.join(d, "client_version.txt")) else "?"

def tname(tid):
    t = types.get(str(tid)) or {}
    return t.get("typeName") or "type %s" % tid
def tgroup(tid):
    t = types.get(str(tid)) or {}
    g = groups.get(str(t.get("groupID"))) or {}
    return g.get("groupName") or "group %s" % t.get("groupID")
def tcat(tid):
    t = types.get(str(tid)) or {}
    g = groups.get(str(t.get("groupID"))) or {}
    c = cats.get(str(g.get("categoryID"))) or {}
    return c.get("categoryName") or "category %s" % g.get("categoryID")

# facility -> blueprints
bp_facilities = defaultdict(list)
for ftid, f in facs.items():
    for b in f.get("blueprints", []):
        bp_facilities[str(b["blueprintID"])].append({"facilityTypeID": int(ftid), "facility": tname(ftid),
                                                    "maxInputRuns": b.get("maxInputRuns"), "maxOutputRuns": b.get("maxOutputRuns")})

recipes = []
for bid, bp in sorted(bps.items(), key=lambda kv: int(kv[0])):
    recipes.append({
        "blueprintID": int(bid),
        "product": {"typeID": bp["primaryTypeID"], "name": tname(bp["primaryTypeID"]), "group": tgroup(bp["primaryTypeID"]), "category": tcat(bp["primaryTypeID"])},
        "runTimeSeconds": bp["runTime"],
        "inputs": [{"typeID": i["typeID"], "name": tname(i["typeID"]), "quantity": i["quantity"]} for i in bp.get("inputs", [])],
        "outputs": [{"typeID": o["typeID"], "name": tname(o["typeID"]), "quantity": o["quantity"]} for o in bp.get("outputs", [])],
        "facilities": bp_facilities.get(bid, []),
    })

reprocessing = []
for tid, m in sorted(mats.items(), key=lambda kv: int(kv[0])):
    t = types.get(tid) or {}
    reprocessing.append({"typeID": int(tid), "name": tname(tid), "portionSize": t.get("portionSize"),
                         "materials": [{"typeID": x["materialTypeID"], "name": tname(x["materialTypeID"]), "quantity": x["quantity"]} for x in m.get("materials", [])]})

# reverse index: what is each item used in / produced by
used_in, produced_by = defaultdict(list), defaultdict(list)
for r in recipes:
    for i in r["inputs"]: used_in[i["typeID"]].append(r["blueprintID"])
    for o in r["outputs"]: produced_by[o["typeID"]].append(r["blueprintID"])

out = {"clientVersion": version, "recipes": recipes, "reprocessing": reprocessing,
       "facilities": [{"typeID": int(k), "name": tname(k), "blueprintIDs": [b["blueprintID"] for b in v.get("blueprints", [])]} for k, v in sorted(facs.items(), key=lambda kv: int(kv[0]))],
       "index": {"usedIn": {str(k): v for k, v in used_in.items()}, "producedBy": {str(k): v for k, v in produced_by.items()}}}
json.dump(out, open(os.path.join(d, "recipes.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)

def fmt_items(items): return ", ".join("%s × %s" % (x["quantity"], x["name"]) for x in items) or "—"
def fmt_time(s):
    s = int(s); return "%dh %02dm %02ds" % (s // 3600, s % 3600 // 60, s % 60) if s >= 3600 else ("%dm %02ds" % (s // 60, s % 60) if s >= 60 else "%ds" % s)

lines = ["# EVE Frontier in-game recipes", "", "Extracted from the locally installed client (%s)." % version,
         "Source tables: `industry_blueprints` (%d blueprints), `industry_facilities` (%d facilities), `typematerials` (%d reprocessable types)." % (len(bps), len(facs), len(mats)), ""]

# by facility
lines += ["## Blueprints by facility", ""]
by_fac = defaultdict(list)
for r in recipes:
    if not r["facilities"]: by_fac["(no facility listed)"].append(r)
    for f in r["facilities"]: by_fac[f["facility"]].append(r)
for fac in sorted(by_fac):
    lines += ["### %s (%d)" % (fac, len(by_fac[fac])), "", "| Product | Outputs | Inputs | Run time | BP |", "|---|---|---|---|---|"]
    for r in sorted(by_fac[fac], key=lambda r: (r["product"]["category"], r["product"]["group"], r["product"]["name"])):
        lines.append("| %s | %s | %s | %s | %d |" % (r["product"]["name"], fmt_items(r["outputs"]), fmt_items(r["inputs"]), fmt_time(r["runTimeSeconds"]), r["blueprintID"]))
    lines.append("")

# by product category
lines += ["## Products by category", ""]
by_cat = defaultdict(list)
for r in recipes: by_cat[(r["product"]["category"], r["product"]["group"])].append(r)
cur = None
for (c, g), rs in sorted(by_cat.items()):
    if c != cur: lines += ["### %s" % c, ""]; cur = c
    lines.append("- **%s**: %s" % (g, ", ".join(sorted(set(r["product"]["name"] for r in rs)))))
lines.append("")

lines += ["## Reprocessing (type materials)", "", "| Item | Portion | Yields |", "|---|---|---|"]
for r in reprocessing:
    lines.append("| %s | %s | %s |" % (r["name"], r["portionSize"], fmt_items(r["materials"])))
lines.append("")

# raw materials: inputs never produced by a blueprint
raw = sorted({i["typeID"] for r in recipes for i in r["inputs"]} - set(produced_by), key=tname)
lines += ["## Base inputs (consumed by blueprints, never produced by one)", ""]
for tid in raw:
    lines.append("- %s (%s, used in %d blueprints)" % (tname(tid), tgroup(tid), len(used_in[tid])))
lines.append("")
open(os.path.join(d, "RECIPES.md"), "w", encoding="utf-8").write("\n".join(lines))
print("recipes.json: %d recipes, %d reprocessing entries, %d facilities, %d base inputs" % (len(recipes), len(reprocessing), len(facs), len(raw)))
