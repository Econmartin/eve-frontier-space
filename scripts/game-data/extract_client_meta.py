"""How the game stores and shows material properties, read from the client.
Usage: python3 extract_client_meta.py <client build dir> <ResFiles dir> <data/game dir>

- log10: property ids the game stores as log10 and shows as plain numbers (_LOG10_PLAIN_IDS in
  frontier/neotype_variant/client/formatting.py, read from code.ccp's bytecode).
- units: each dogma unit's display symbol (kg/m³, W/(m·K)…) from the en-us localization.
Writes client_meta.json. Needs the client's Python minor version (3.12) to read its bytecode.
"""
import dis, json, marshal, os, pickle, sys, zipfile
build, res, d = sys.argv[1:4]

with zipfile.ZipFile(os.path.join(build, "code.ccp")) as z:
    code = marshal.loads(z.read("frontier/neotype_variant/client/formatting.pyc")[16:])
ins = list(dis.get_instructions(code))
at = next(i for i, x in enumerate(ins) if x.opname == "STORE_NAME" and x.argval == "_LOG10_PLAIN_IDS")
# frozenset((9, 81, …)): the tuple is the nearest constant before the store
log10 = sorted(next(x.argval for x in reversed(ins[:at]) if x.opname == "LOAD_CONST" and isinstance(x.argval, tuple)))

index = {}
for line in open(os.path.join(build, "resfileindex.txt"), encoding="utf-8"):
    p = line.rstrip("\n").split(",")
    if len(p) >= 2: index[p[0].lower()] = p[1]
_, loc = pickle.load(open(os.path.join(res, index["res:/localizationfsd/localization_fsd_en-us.pickle"]), "rb"))
text = lambda mid: (lambda v: v[0] if isinstance(v, (tuple, list)) else v)(loc.get(mid)) if mid else None
units = {k: text(v.get("displayNameID")) for k, v in json.load(open(os.path.join(d, "dogmaunits.json"))).items() if text(v.get("displayNameID"))}

json.dump({"log10": log10, "units": units}, open(os.path.join(d, "client_meta.json"), "w"), indent=1, ensure_ascii=False)
print(f"client meta: {len(log10)} log10 properties, {len(units)} unit symbols")
