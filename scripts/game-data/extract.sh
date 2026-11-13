#!/usr/bin/env bash
# Extract EVE Frontier static data (types, blueprints, facilities, reprocessing) from the
# locally installed client, using the client's own bundled Python + native cFSD loaders.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SHARED="${EVE_SHARED_CACHE:-$HOME/Library/Application Support/EVE Frontier/SharedCache}"
BUILD="$SHARED/stillness/EVE.app/Contents/Resources/build"
RESFILES="$SHARED/ResFiles"
OUT="${1:-$ROOT/data/game}"
PYINC="${PYTHON_INCLUDE:-$(python3 -c 'import sysconfig;print(sysconfig.get_paths()["include"])')}"

[ -d "$BUILD/bin64" ] || { echo "client not found at $BUILD" >&2; exit 1; }
mkdir -p "$HERE/.build" "$OUT"
clang -O1 -I"$PYINC" "$HERE/host.c" -o "$HERE/.build/host" \
  "$BUILD/bin64/libpython3.12.dylib" -Wl,-rpath,"$BUILD/bin64"
"$HERE/.build/host" "$BUILD/code.ccp" "$BUILD/bin64" "$HERE/dump_fsd.py" "$BUILD" "$RESFILES" "$OUT" "${@:2}"
[ -s "$OUT/typedogma.json" ] || "$HERE/.build/host" "$BUILD/code.ccp" "$BUILD/bin64" "$HERE/dump_fsd.py" "$BUILD" "$RESFILES" "$OUT" typedogma dogmaattributes
grep -E "^(version|build|branch|codename)" "$BUILD/start.ini" | tr -d '\r' > "$OUT/client_version.txt"
python3 -I "$HERE/extract_build_costs.py" "$BUILD" "$OUT"
python3 -I "$HERE/extract_client_meta.py" "$BUILD" "$RESFILES" "$OUT"

# build the full dataset for the gitignored /industry pages, then export icons for everything in it
python3 "$HERE/build_industry_json.py" "$OUT" "$ROOT/apps/home/src/data/full/industry.json"
python3 "$HERE/export_icons.py" "$BUILD" "$RESFILES" "$OUT" "$ROOT/apps/home/src/data/full/industry.json" "$ROOT/packages/assets/industry/icons"
ICON_DIR="$ROOT/packages/assets/industry/icons" python3 "$HERE/build_industry_json.py" "$OUT" "$ROOT/apps/home/src/data/full/industry.json"
