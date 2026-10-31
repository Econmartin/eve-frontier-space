"""Publish the industry dataset and item icons to the remote D1 table `game_assets`.
Run from the repo root after extract.sh: python3 scripts/game-data/upload_assets.py
Nothing here goes into git; the worker serves these rows at /api/industry-data and /industry/icons/<id>.png.
"""
import glob, json, os, subprocess, sys, tempfile
PART = 40_000  # bytes per row: hex doubles it, staying under D1's 100 KB statement limit
data = json.load(open("apps/home/src/data/full/industry.json", encoding="utf-8"))
data["changelog"] = json.load(open("apps/home/src/data/full/changelog.json", encoding="utf-8"))
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
def rows(asset, ctype, raw):
    for i in range(0, max(1, len(raw)), PART):
        yield f"INSERT OR REPLACE INTO game_assets (asset, part, content_type, body) VALUES ('{asset}', {i // PART}, '{ctype}', X'{raw[i:i + PART].hex()}');"
sql = ["DELETE FROM game_assets;"] + list(rows("industry-data", "application/json; charset=utf-8", payload))
icons = sorted(glob.glob("packages/assets/industry/icons/*.png"))
for p in icons: sql += list(rows("icon/" + os.path.basename(p)[:-4], "image/png", open(p, "rb").read()))
with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as f: f.write("\n".join(sql) + "\n")
print(f"{len(sql)} statements, {os.path.getsize(f.name) // 1024} KB, {len(payload) // 1024} KB dataset, {len(icons)} icons")
args = sys.argv[1:] or ["--remote"]
r = subprocess.run(["npx", "wrangler", "d1", "execute", "eve-frontier-mining", *args, "--yes", f"--file={f.name}"], capture_output=True, text=True)
print(r.stdout[-400:], r.stderr[-400:]); os.unlink(f.name); sys.exit(r.returncode)
