"""Snapshot live community clears into apps/home/src/data/composites.json under `seen`.
Run from the repo root: python3 scripts/game-data/update_rock_stats.py
Shares pool clears of 100+ voxels by units (smaller scrapes only sample the outer shell);
a rock with no big clear falls back to all its samples and is marked low confidence.
"""
import collections, datetime, json, subprocess, time
Q = "SELECT rock, COALESCE(prefix,'') prefix, ticks, total, materials, submitter FROM mining_sessions;"
BIG = 100
def fetch():
    for _ in range(5):
        out = subprocess.run(["npx", "wrangler", "d1", "execute", "eve-frontier-mining", "--remote", "--json", "--command", Q], capture_output=True, text=True).stdout
        try: return json.loads(out)[0]["results"]
        except (json.JSONDecodeError, KeyError, IndexError): time.sleep(3)
    raise SystemExit("could not read D1")
def pool(rs):
    p = collections.Counter()
    for r in rs: p.update({int(k): v for k, v in json.loads(r["materials"]).items()})
    t = sum(p.values()) or 1
    return {str(k): round(100 * v / t, 1) for k, v in p.most_common()}
rows, seen = fetch(), {}
for rock in sorted({r["rock"] for r in rows}):
    rs = [r for r in rows if r["rock"] == rock]; big = [r for r in rs if r["ticks"] >= BIG]; use = big or rs
    e = {"clears": len(big), "samples": len(rs), "pilots": len({r["submitter"] for r in rs}), "voxels": sum(r["ticks"] for r in rs), "shares": pool(use),
         "presence": {str(m): sum(1 for r in use if str(m) in json.loads(r["materials"])) for m in {int(k) for r in use for k in json.loads(r["materials"])}}}
    groups = {p: [r for r in big if r["prefix"] == p] for p in {r["prefix"] for r in big}}
    if sum(1 for g in groups.values() if len(g) >= 3) >= 2:  # two prefixes with enough big clears to compare
        e["variants"] = {(p or "plain"): {"clears": len(g), "shares": pool(g)} for p, g in sorted(groups.items()) if len(g) >= 3}
    seen[rock] = e
path = "apps/home/src/data/composites.json"
d = json.load(open(path)); d["seen"] = {"_comment": "Measured from community clears (scripts/game-data/update_rock_stats.py). Shares are % of units from clears of 100+ voxels.", "updated": datetime.date.today().isoformat(), "rocks": seen}
json.dump(d, open(path, "w"), indent=2, ensure_ascii=False); open(path, "a").write("\n")
print(len(rows), "rows;", {k: (v["clears"], v["samples"]) for k, v in seen.items()})
