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
TR, TS, TB = L("recipeoutputtransform.json", {}), L("recipeoutputtransformsource.json", {}), L("recipeoutputtransformbreakpoint.json", {})
META = L("client_meta.json", {"log10": [], "units": {}})
# the game's standard for each crafted item, from its own code (extract_crafted_defaults.py)
CD = L("crafted_defaults.json") or {}
STD = CD.get("defaults", {})
# the material the game's standard build puts in each trait slot, by schema: {schema: {slot: material}}
STD_SLOTS = {str(c["recipe"]): c["slots"] for c in CD.get("choices", {}).values() if c.get("slots")}
# "Mined from": which asteroid kinds hold each regolith, 5 Dominant, 4 Major, 3 Moderate, 2 Minor, 1 Trace
PRES = L("regolith_presence.json") or {}
PD, PDT, PDW = L("propertyderivation.json", {}), L("propertyderivationterm.json", {}), L("recipederivationwiring.json", {})
PDB = L("propertyderivationbreakpoint.json", {})
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
def fixed(rid):
    """stats a schema sets to one value whatever goes in: {property: value}"""
    return {str(x["propertyID"]): x["fixedValue"] for x in TR.get(str(rid), {}).get("transforms", []) if x["op"] == "fixed" and x.get("outputIndex", 0) == 0 and "fixedValue" in x}

def transforms(rid):
    """How each output stat follows from the input stacks: [{o: output index, p: property, op: l|b, c, e, s, b}].
    l = linear combination c + sum(coef x input value, log10 of it where flagged), e = take 10^result;
    b = breakpoint curve over one input property. Fixed stats are left out: they do not depend on the inputs."""
    srcs, bps, out = collections.defaultdict(list), collections.defaultdict(list), []
    for s in TS.get(str(rid), {}).get("sources", []): srcs[(s["outputIndex"], s["propertyID"])].append(s)
    for b in TB.get(str(rid), {}).get("breakpoints", []): bps[(b["outputIndex"], b["propertyID"])].append([b["x"], b["y"]])
    for x in TR.get(str(rid), {}).get("transforms", []):
        k = (x["outputIndex"], x["propertyID"])
        if x["op"] == "linearCombination":
            out.append({"o": x["outputIndex"], "p": x["propertyID"], "op": "l", "c": x.get("linearConstant", 0),
                        "s": [[s["inputIndex"], s["sourcePropertyID"], s.get("coefficient", 0), 1 if s.get("log10") else 0] for s in srcs[k]], **({"e": 1} if x.get("exp10") else {})})
        elif x["op"] == "breakpointTable" and srcs[k]:
            s = srcs[k][0]
            out.append({"o": x["outputIndex"], "p": x["propertyID"], "op": "b", "s": [[s["inputIndex"], s["sourcePropertyID"], 1, 1 if s.get("log10") else 0]], "b": sorted(bps[k]), **({"e": 1} if x.get("exp10") else {})})
    return out

def module_attrs(tid):
    """dogma attributes a type has; derived stats only count when the made item has the attribute they feed"""
    return {a["attributeID"] for a in ((td or {}).get(str(tid)) or {}).get("dogmaAttributes", [])}

def derived(rid, inputs, product=None):
    """Module stats (Mining Amount, Range…) worked out from the parts' ratings: [{p, op: l|b, c, s, d: 1}].
    Each term reads one rating from the input carrying its trait (or the slot the schema wires it to); 'average'
    over several inputs is folded into the coefficients so it stays a plain sum. A breakpoint one (Volatility)
    runs that sum through its curve."""
    wired = {(w["propertyID"], w["termIndex"]): w["inputIndex"] for w in PDW.get(str(rid), {}).get("wiring", [])}
    # traits an input brings: its own, the slot's, and for a trait slot those of the parts that can fill it
    # (D1 Fuel's slot asks for one trait; the Fuel Stock that fills it carries the one its stats read)
    carried = lambda tid: {x["traitID"] for x in NT.get(str(tid), {}).get("traits", [])}
    own = {i["slot"]: carried(i["id"]) | ({i["trait"]} | set().union(*(carried(m) for m in members(i["trait"]))) if "trait" in i else set()) for i in inputs}
    out, has = [], module_attrs(product) if product else set()
    for pid, d in PD.items():
        if d.get("op") not in ("linearCombination", "breakpointTable"): continue
        curve = sorted([b["x"], b["y"]] for b in PDB.get(pid, {}).get("breakpoints", [])) if d["op"] == "breakpointTable" else None
        if d["op"] == "breakpointTable" and not curve: continue
        if P.get(pid, {}).get("bridgedAttributeID") not in has: continue  # the game only applies stats the module carries
        rows, ok = [], True
        for term in PDT.get(pid, {}).get("terms", []):
            slots = [wired[(int(pid), term["termIndex"])]] if (int(pid), term["termIndex"]) in wired else [s for s, tr in own.items() if term.get("traitID") in tr]
            if not slots: ok = False; break
            share = 1 / len(slots) if term.get("reduce") == "average" else 1
            rows += [[s, term["sourcePropertyID"], term.get("coefficient", 0) * share, 1 if term.get("log10") else 0] for s in slots]
        # s: every slot that could feed it (for the page to know which properties matter); r: the terms as the game has
        # them, resolved on the page against the materials actually chosen (t trait, w wired slot, a averaged)
        terms = [{"t": term.get("traitID"), "p": term["sourcePropertyID"], "k": term.get("coefficient", 0), **({"g": 1} if term.get("log10") else {}),
                  **({"a": 1} if term.get("reduce") == "average" else {}), **({"w": wired[(int(pid), term["termIndex"])]} if (int(pid), term["termIndex"]) in wired else {})}
                 for term in PDT.get(pid, {}).get("terms", [])]
        if ok and rows: out.append({"o": 0, "p": int(pid), **({"op": "b", "b": curve} if curve else {"op": "l", "c": d.get("linearConstant", 0)}), "s": rows, "d": 1, "r": terms})
    return out

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
        inputs.append({"id": x["typeID"] if "typeID" in x else -tr, "qty": x["quantity"], "slot": x["inputIndex"], **({"trait": tr} if tr is not None else {})})
    outputs = [{"id": o["typeID"], "qty": o["quantity"], **({"yieldBy": sorted(yield_from[o["outputIndex"]])} if yield_from.get(o["outputIndex"]) else {})}
               for o in sorted(RO[str(rid)]["outputs"], key=lambda o: o["outputIndex"])]
    if not outputs: continue
    recipes.append({"id": rid, "name": r["name"], "kind": r["recipeType"], "product": outputs[0]["id"], "time": r["duration"],
                    **({"std": {k: v for k, v in STD_SLOTS[str(rid)].items()}} if str(rid) in STD_SLOTS else {}),
                    "inputs": inputs, "outputs": outputs, "facilities": fac_of[rid], **({"tf": tf} if (tf := transforms(rid) + (derived(rid, inputs, outputs[0]["id"]) if r["recipeType"] == "manufacturing" else [])) else {}),
                    **({"fx": fx} if r["recipeType"] == "manufacturing" and (fx := fixed(rid)) else {})})

# --- Build Mode: ships (Creations) and deployable structures are built in space, not from schemas ---------
# Ids are offset so they never collide with schema ids; the site->ship match is by name (site "LAI" builds the LAI).
BUILD_ID = 1_000_000
costs = L("build_costs.json", {"ships": {}, "structures": {}})
ship_by_name = {types.get(k, {}).get("typeName"): int(k) for k in (L("creation_templates.json") or {})}
built = [(ship_by_name.get(types.get(site, {}).get("typeName"), int(site)), c) for site, c in costs["ships"].items()]
built += [(int(k), c) for k, c in costs["structures"].items() if types.get(k, {}).get("published")]
for tid, c in built:
    recipes.append({"id": BUILD_ID + tid, "name": types.get(str(tid), {}).get("typeName"), "kind": "build", "product": tid, "time": 0,
                    "inputs": [{"id": int(t), "qty": q} for t, q in c.items()], "outputs": [{"id": tid, "qty": 1}], "facilities": []})
recipes.sort(key=lambda r: r["id"])

# --- old materials: made before Digital Chemistry, now only refined back into new materials ----------------
# Retired parts and pre-0.7.6.0 minerals: no schema makes them, and refining is all they are good for.
# Salvage, rift crude and ores still drop, so only the Material category counts, plus what the dev blog names.
RETIRED_EXTRA = {"Nomad Program Frame"}
STILL_DROPS = {"Synod Technocore"}  # loot: nothing uses it except refining this cycle, but it is not retired
made = {o["id"] for r in recipes if r["kind"] != "reprocessing" for o in r["outputs"]}
used = {i["id"] for r in recipes if r["kind"] != "reprocessing" for i in r["inputs"]}
refined = {i["id"] for r in recipes if r["kind"] == "reprocessing" for i in r["inputs"]}
def category(tid): return cats.get(str(groups.get(str(types.get(str(tid), {}).get("groupID")), {}).get("categoryID")), {}).get("categoryName")
legacy = {i for i in refined if i not in made and i not in used and i not in regolith_ids and types.get(str(i), {}).get("typeName") not in STILL_DROPS
          and (category(i) == "Material" or types.get(str(i), {}).get("typeName") in RETIRED_EXTRA)}
for r in recipes:
    if r["kind"] == "reprocessing" and any(i["id"] in legacy for i in r["inputs"]): r["legacy"] = True

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
    nt = sorted(x["traitID"] for x in NT.get(str(tid), {}).get("traits", []))
    if nt: it["nt"] = nt
    # the game's standard stack of a crafted part (what "atypical" and the build deltas compare with); bulk
    # materials have none, their standard is the middle of each range
    if str(tid) in STD: it["std"] = {p: float("%.7g" % v) for p, v in STD[str(tid)].items()}
    return it
items = {str(i): tinfo(i) for i in sorted(ids)}
for i in regolith_ids: items[str(i)]["regolith"] = True
for i, kinds in PRES.get("ores", {}).items():
    if i in items:
        items[i]["minedFrom"] = sorted(([PRES["asteroids"].get(k, {}).get("name") or k, a] for k, a in kinds), key=lambda x: (-x[1], x[0]))
for i in legacy: items[str(i)]["legacy"] = True
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
schema_ids = {r["id"] for r in recipes}
facilities = [{"id": int(fid), "name": fac_names(fid), "blueprints": sorted(x["recipeID"] for x in v["recipes"] if x["recipeID"] in schema_ids)} for fid, v in RF.items()]
traits = {str(t): {"name": T.get(str(t), {}).get("name"), "description": strip(T.get(str(t), {}).get("description")),
                   "needs": [{"prop": c["propertyID"], **({"min": c["minValue"]} if "minValue" in c else {}), **({"max": c["maxValue"]} if "maxValue" in c else {})} for c in TP.get(str(t), {}).get("properties", [])],
                   "members": trait_members[t]} for t in sorted(used_traits)}
# traits module stats read (Weld Arc Control…) need their names too, even when no schema slot asks for them
for r in recipes:
    for t_ in r.get("tf", []):
        for term in t_.get("r", []):
            k = term.get("t")
            if k is not None and str(k) not in traits:
                traits[str(k)] = {"name": T.get(str(k), {}).get("name"), "description": strip(T.get(str(k), {}).get("description")), "needs": [], "members": sorted(listed.get(k, ()))}
prop_ids = {p for it in items.values() for p in [x["id"] for x in it.get("props", [])]} | {c["prop"] for tr in traits.values() for c in tr["needs"]} | {p for r in recipes for o in r["outputs"] for p in o.get("yieldBy", [])}
prop_ids |= {t["p"] for r in recipes for t in r.get("tf", [])} | {s[1] for r in recipes for t in r.get("tf", []) for s in t["s"]}
LOG10 = set(META["log10"])
# unit is the game's display symbol; log marks values stored as log10 (shown as 10^value)
# a module stat with no unit of its own shows in the unit of the module attribute it feeds (Range in m…)
unit_of = lambda p: P[str(p)].get("unitID") or (da or {}).get(str(P[str(p)].get("bridgedAttributeID")), {}).get("unitID")
properties = {str(p): {"name": P[str(p)]["name"], "kind": P[str(p)]["kind"], "min": P[str(p)].get("naturalMin"), "max": P[str(p)].get("naturalMax"),
                       **({"unitID": unit_of(p), "unit": META["units"].get(str(unit_of(p)))} if unit_of(p) else {}), **({"log": 1} if p in LOG10 else {}),
                       # module stats show in game under the module attribute's name ("Volatility", not "Volatility Chance")
                       **({"stat": a} if (a := META.get("attributes", {}).get(str(P[str(p)].get("bridgedAttributeID")))) and a != P[str(p)]["name"] else {})}
              for p in sorted(prop_ids) if str(p) in P}

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
print(f"old materials: {len(legacy)} ({', '.join(sorted(items[str(i)]['name'] for i in legacy))})")
print(f"wrote {out}: {len(items)} items, {len(recipes)} schemas ({dict(kinds)}), {len(facilities)} facilities, {len(traits)} traits, {len(properties)} properties, {len(regolith_ids)} regoliths, {len(rocks)} rocks; {os.path.getsize(out)//1024} KB")
