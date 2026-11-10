"""Diff two industry.json datasets (schemas) and append an entry to the industry changelog.
Usage: diff_snapshots.py <old industry.json> <new industry.json> <changelog.json> [version label] [note]
"""
import json, sys, datetime
old, new, log = (json.load(open(p, encoding="utf-8")) for p in sys.argv[1:4])
label = sys.argv[4] if len(sys.argv) > 4 else new.get("clientVersion", "?")
note = sys.argv[5] if len(sys.argv) > 5 else ""
def namer(d): return lambda i: d["items"].get(str(i), {}).get("name", f"type {i}")
on, nn = namer(old), namer(new)
def brief(r, nm, d):
    fac = {f["id"]: f["name"] for f in d["facilities"]}
    return {"id": r["id"], "product": r.get("name") or nm(r["product"]), "time": r["time"],
            "inputs": [f'{i["qty"]:g} × {nm(i["id"])}' for i in r["inputs"]], "outputs": [f'{o["qty"]:g} × {nm(o["id"])}' for o in r["outputs"]],
            "facilities": sorted({fac.get(f["id"], str(f["id"])) for f in r["facilities"]})}
O = {r["id"]: brief(r, on, old) for r in old["recipes"]}; N = {r["id"]: brief(r, nn, new) for r in new["recipes"]}
# a dataset from before schemas has nothing comparable: record the note and counts only
schemas = lambda d: all("kind" in r for r in d["recipes"])
comparable = schemas(old) and schemas(new)
added = [N[k] for k in sorted(set(N) - set(O))] if comparable else []
removed = [O[k] for k in sorted(set(O) - set(N))] if comparable else []
changed = []
for k in sorted(set(O) & set(N)) if comparable else []:
    a, b = O[k], N[k]
    fields = [f for f in ("product", "time", "inputs", "outputs", "facilities") if a[f] != b[f]]
    if fields: changed.append({"id": k, "product": b["product"], "before": a, "after": b, "fields": fields})
entry = {"version": label, "date": datetime.date.today().isoformat(), "note": note,
         "counts": {"recipes": len(N), "facilities": len(new["facilities"]), "traits": len(new.get("traits", {}))},
         "added": added, "removed": removed, "changed": changed}
log["entries"].insert(0, entry)
json.dump(log, open(sys.argv[3], "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"{label}: +{len(added)} -{len(removed)} ~{len(changed)} schemas" + ("" if comparable else " (not comparable: blueprints -> schemas)"))
