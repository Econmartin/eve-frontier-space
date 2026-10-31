#!/usr/bin/env python3
"""Read EVE Frontier game logs and report what you mined, per asteroid.

The client writes one line per mining tick to ~/Documents/Frontier/logs/Gamelogs/*.txt.
Ticks are grouped into sessions (one per rock) whenever the gap between ticks exceeds --gap seconds.

  mining_log.py                      summarise every log
  mining_log.py --since 2026-10-12   only sessions from that date
  mining_log.py --watch              tail the newest log and print running totals while you mine
  mining_log.py --json               machine-readable output (sessions with per-material totals)
"""
import argparse, glob, json, os, re, sys, time
from datetime import datetime

LOG_DIR = os.path.expanduser("~/Documents/Frontier/logs/Gamelogs")
LINE = re.compile(r"^﻿?\[ (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}) \] \(mining\) .*?You mined .*?>(\d[\d,]*)<.*? units of .*?size=12>([^<]+)<", re.S)

def parse_file(path):
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = LINE.match(line)
            if m:
                out.append((datetime.strptime(m.group(1), "%Y.%m.%d %H:%M:%S"), int(m.group(2).replace(",", "")), m.group(3).strip(), os.path.basename(path)))
    return out

def sessions(ticks, gap):
    ticks.sort()
    groups, cur = [], []
    for t in ticks:
        if cur and (t[0] - cur[-1][0]).total_seconds() > gap:
            groups.append(cur); cur = []
        cur.append(t)
    if cur: groups.append(cur)
    res = []
    for g in groups:
        totals = {}
        for _, n, name, _ in g: totals[name] = totals.get(name, 0) + n
        res.append({"start": g[0][0].isoformat(sep=" "), "end": g[-1][0].isoformat(sep=" "), "ticks": len(g), "log": g[0][3],
                    "total": sum(totals.values()), "materials": dict(sorted(totals.items(), key=lambda kv: -kv[1]))})
    return res

def show(sess):
    for s in sess:
        mins = (datetime.fromisoformat(s["end"]) - datetime.fromisoformat(s["start"])).total_seconds() / 60
        print(f"\n{s['start']}  ·  {s['ticks']} ticks over {mins:.0f} min  ·  {s['total']:,} units   ({s['log']})")
        for name, n in s["materials"].items():
            print(f"   {n:>8,}  {100 * n / s['total']:5.1f}%  {name}")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=LOG_DIR); ap.add_argument("--gap", type=int, default=180, help="seconds of silence that starts a new session (default 180)")
    ap.add_argument("--since", help="YYYY-MM-DD"); ap.add_argument("--json", action="store_true"); ap.add_argument("--watch", action="store_true")
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.dir, "*.txt")))
    if not files: sys.exit(f"no game logs in {a.dir}")
    if a.watch:
        path = max(files, key=os.path.getmtime)
        print(f"watching {path}  (Ctrl-C to stop)")
        seen = parse_file(path); shown = 0
        with open(path, encoding="utf-8", errors="replace") as f:
            f.seek(0, 2)
            while True:
                line = f.readline()
                if not line: time.sleep(0.5); continue
                m = LINE.match(line)
                if not m: continue
                seen.append((datetime.strptime(m.group(1), "%Y.%m.%d %H:%M:%S"), int(m.group(2).replace(",", "")), m.group(3).strip(), os.path.basename(path)))
                s = sessions(list(seen), a.gap)[-1]
                mats = "  ".join(f"{k} {v:,}" for k, v in s["materials"].items())
                print(f"\r[{s['ticks']:>4} ticks · {s['total']:>8,} units]  {mats}", end="", flush=True)
                if s["ticks"] == 1 and shown: print()
                shown += 1
    ticks = [t for p in files for t in parse_file(p)]
    if a.since: ticks = [t for t in ticks if t[0] >= datetime.fromisoformat(a.since)]
    sess = sessions(ticks, a.gap)
    if a.json: json.dump(sess, sys.stdout, indent=1); print()
    else:
        print(f"{len(ticks)} mining ticks in {len(files)} logs → {len(sess)} sessions (gap {a.gap}s)"); show(sess)

if __name__ == "__main__":
    main()
