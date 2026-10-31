"""Diff two recipes.json snapshots and append an entry to the industry changelog.
Usage: diff_snapshots.py <old recipes.json> <new recipes.json> <changelog.json> [version label]
"""
import json, sys, datetime
old, new, log = (json.load(open(p, encoding="utf-8")) for p in sys.argv[1:4])
label = sys.argv[4] if len(sys.argv) > 4 else new.get("clientVersion", "?")
def key(r): return r["blueprintID"]
def sig(r): return {"product": r["product"]["name"], "time": r["runTimeSeconds"],
                    "inputs": sorted((i["name"], i["quantity"]) for i in r["inputs"]),
                    "outputs": sorted((o["name"], o["quantity"]) for o in r["outputs"]),
                    "facilities": sorted({f["facility"] for f in r["facilities"]})}
O = {key(r): r for r in old["recipes"]}; N = {key(r): r for r in new["recipes"]}
def brief(r): return {"id": key(r), "product": r["product"]["name"], "time": r["runTimeSeconds"],
                      "inputs": [f'{i["quantity"]} × {i["name"]}' for i in r["inputs"]], "outputs": [f'{o["quantity"]} × {o["name"]}' for o in r["outputs"]],
                      "facilities": sorted({f["facility"] for f in r["facilities"]})}
added = [brief(N[k]) for k in sorted(set(N) - set(O))]
removed = [brief(O[k]) for k in sorted(set(O) - set(N))]
changed = []
for k in sorted(set(O) & set(N)):
    a, b = sig(O[k]), sig(N[k])
    if a != b:
        changed.append({"id": k, "product": b["product"], "before": brief(O[k]), "after": brief(N[k]),
                        "fields": [f for f in a if a[f] != b[f]]})
entry = {"version": label, "date": datetime.date.today().isoformat(), "note": "",
         "counts": {"recipes": len(N), "facilities": len(new["facilities"]), "reprocessing": len(new["reprocessing"])},
         "added": added, "removed": removed, "changed": changed}
log["entries"].insert(0, entry)
json.dump(log, open(sys.argv[3], "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"{label}: +{len(added)} -{len(removed)} ~{len(changed)} recipes")
