"""Runs inside the EVE Frontier client's bundled Python (see host.c / extract.sh).

Loads cFSD static-data tables with the client's own native loaders and writes
plain JSON. Usage: host code.ccp bin64 dump_fsd.py <build_dir> <resfiles_dir> <out_dir> [table ...]
"""
import sys, os, json, pickle, re

build_dir, res_dir, out_dir = sys.argv[1:4]
wanted = sys.argv[4:] or [
    "industry_blueprints", "industry_facilities", "typematerials",
    "recipe", "recipeinput", "recipeoutput",
    "types", "groups", "categories", "marketgroups", "iconids", "metagroups",
]

# --- resolve res:/ paths to files in the content-addressed cache -----------
index = {}
with open(os.path.join(build_dir, "resfileindex.txt"), encoding="utf-8") as f:
    for line in f:
        parts = line.rstrip("\n").split(",")
        if len(parts) >= 2:
            index[parts[0].lower()] = os.path.join(res_dir, parts[1])

# --- loader modules: <name>Loader.so  <->  res:/staticdata/<name>.fsdbinary ---
bin64 = os.path.join(build_dir, "bin64")
loaders = {}
for fn in os.listdir(bin64):
    m = re.match(r"^(.+)Loader\.so$", fn)
    if m:
        loaders[m.group(1).lower()] = m.group(1) + "Loader"

PRIMS = (int, float, str, bool, bytes, type(None))

def norm(o):
    if isinstance(o, PRIMS):
        return o.decode("utf-8", "replace") if isinstance(o, bytes) else o
    if hasattr(o, "keys") and hasattr(o, "__getitem__"):
        return {str(norm(k)): norm(o[k]) for k in o.keys()}
    if hasattr(o, "__iter__") and hasattr(o, "__len__"):
        return [norm(x) for x in o]
    out = {}
    for a in dir(o):
        if a.startswith("_"):
            continue
        try:
            v = getattr(o, a)
        except (ValueError, UnicodeError):
            out[a] = None  # a few strings contain invalid code points
            continue
        if callable(v):
            continue
        out[a] = norm(v)
    return out

# --- localization (en-us): plain pickled (lang, {messageID: (text, ...)}) ----
loc = {}
loc_path = index.get("res:/localizationfsd/localization_fsd_en-us.pickle")
if loc_path:
    with open(loc_path, "rb") as f:
        lang, table = pickle.load(f)
    for mid, v in table.items():
        loc[mid] = v[0] if isinstance(v, (tuple, list)) else v
    print("localization en-us:", len(loc), "strings")

NAME_FIELDS = {"typeNameID": "typeName", "groupNameID": "groupName", "categoryNameID": "categoryName",
               "nameID": "name", "descriptionID": "description"}

def localize(o):
    if isinstance(o, dict):
        extra = {}
        for k, v in o.items():
            if k in NAME_FIELDS and isinstance(v, int) and v in loc:
                extra[NAME_FIELDS[k]] = loc[v]
            localize(v)
        o.update(extra)
    elif isinstance(o, list):
        for v in o:
            localize(v)
    return o

os.makedirs(out_dir, exist_ok=True)
manifest = {}
for name in wanted:
    key = name.lower()
    res = index.get("res:/staticdata/%s.fsdbinary" % key)
    if key not in loaders or res is None:
        print("SKIP", name, "(loader or data not found)")
        continue
    mod = __import__(loaders[key])
    data = localize(norm(mod.load(res)))
    path = os.path.join(out_dir, name + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
    manifest[name] = {"rows": len(data), "source": res, "file": os.path.basename(path)}
    print("OK  %-22s %6d rows -> %s" % (name, len(data), path))

with open(os.path.join(out_dir, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1, sort_keys=True)
