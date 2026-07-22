#!/bin/bash
set -e
cd "$(dirname "$0")"
git add -A
git commit -q -m "Fix asset base resolution for MyGeotab (v1.1.8)" || { echo "nothing to commit"; exit 0; }
git push
echo ""
echo "Pushed. GitHub Pages rebuilds in ~1-2 min. Then hard-refresh MyGeotab (Cmd+Shift+R)."
