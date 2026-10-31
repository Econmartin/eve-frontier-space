"""Copy item icons for every industry-related type out of the client's resource cache.
Usage: export_icons.py <build dir> <ResFiles dir> <data/game dir> <industry.json> <out dir>
UI icons are copied as-is (mostly 64 px); ships and structures use the 128 px render by graphicID.
"""
import json, os, re, shutil, sys
build, res, d, ind_path, out = sys.argv[1:6]
idx = {}
for line in open(os.path.join(build, "resfileindex.txt"), encoding="utf-8"):
    p = line.rstrip("\n").split(",")
    if len(p) >= 2: idx[p[0].lower()] = p[1]
types = json.load(open(os.path.join(d, "types.json"))); icons = json.load(open(os.path.join(d, "iconids.json")))
ind = json.load(open(ind_path))
renders = {}
for p in idx:
    m = re.search(r"spaceobjectfactory/icons/[^/]+/(\d+)_(\d+)(_no_background)?\.png$", p)
    if m:
        g, size, nobg = int(m.group(1)), int(m.group(2)), bool(m.group(3))
        renders.setdefault(g, {})[(size, nobg)] = p
os.makedirs(out, exist_ok=True)
copied = missing = 0
for it in ind["items"].values():
    tid = it["id"]; t = types.get(str(tid), {})
    src = None
    f = (icons.get(str(t.get("iconID")), {}).get("iconFile") or "").lower()
    if f in idx: src = idx[f]
    else:
        r = renders.get(t.get("graphicID"), {})
        for key in ((128, True), (128, False), (64, True), (64, False), (512, False)):
            if key in r: src = idx[r[key]]; break
    if not src: missing += 1; continue
    shutil.copyfile(os.path.join(res, src), os.path.join(out, f"{tid}.png")); copied += 1
print(f"icons: copied {copied}, missing {missing} -> {out}")
