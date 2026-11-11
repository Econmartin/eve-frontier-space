"""Build Mode costs: what ships and deployable structures take to build.
Usage: python3 extract_build_costs.py <client build dir> <data/game dir>

Ships (Creations) keep their costs in client code, frontier/base_building/common/build/util.py, keyed by
construction site type. The module is executed from code.ccp with its imports stubbed, so a stubbed name such
as inv_const.typeCreation comes back as the string "typeCreation". Structures carry theirs in the
smartDeployable space component (spacecomponentsbytype.json, written by dump_fsd.py).
Writes build_costs.json: {"ships": {siteTypeID: {typeID: qty}}, "structures": {typeID: {typeID: qty}}}
Needs the same Python minor version as the client (3.12) to read its bytecode.
"""
import builtins, json, marshal, os, sys, zipfile
build, d = sys.argv[1], sys.argv[2]

class Stub(str):
    """A stubbed module or attribute: behaves as its own name, and any attribute is another Stub."""
    def __getattr__(self, attr):
        if attr.startswith("__"): raise AttributeError(attr)
        return Stub(attr)
    def __call__(self, *a, **k): return self
    def __getitem__(self, k): return self
    def __or__(self, o): return self
def stub_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name in ("typing", "__future__", "collections", "functools", "itertools", "math", "logging"): return real_import(name, globals, locals, fromlist, level)
    return Stub(name)
real_import = builtins.__import__

with zipfile.ZipFile(os.path.join(build, "code.ccp")) as z:
    pyc = z.read("frontier/base_building/common/build/util.pyc")
code = marshal.loads(pyc[16:])
g = {"__name__": "build_util", "__builtins__": {**vars(builtins), "__import__": stub_import}}
exec(code, g)
recipes, sites = g["_CREATION_SHIP_BUILD_RECIPES"], g["_CREATION_SHIP_CONSTRUCTION_SITE_TYPES"]
ships = {str(sites[k]): {str(t): q for t, q in v.items()} for k, v in recipes.items() if k in sites}

sc = json.load(open(os.path.join(d, "spacecomponentsbytype.json")))
structures = {k: {str(t): q for t, q in v["smartDeployable"]["constructionCost"].items()}
              for k, v in sc.items() if isinstance(v, dict) and (v.get("smartDeployable") or {}).get("constructionCost")}
json.dump({"ships": ships, "structures": structures}, open(os.path.join(d, "build_costs.json"), "w"), indent=1)
print(f"build costs: {len(ships)} ships, {len(structures)} structures")
