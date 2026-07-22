#!/bin/bash
# One-shot: publishes the dnata add-in to GitHub Pages under your account.
set -e
cd "$(dirname "$0")"
[ -d .git ] || git init -q -b main
git add -A
git commit -q -m "dnata Cases and Investigations MyGeotab add-in v1.1.7" 2>/dev/null || true
gh repo create aryandesai-ux/dnata-cases-investigations --public --source=. --remote=origin --push
gh api -X POST repos/aryandesai-ux/dnata-cases-investigations/pages \
  -f 'source[branch]=main' -f 'source[path]=/' \
  || echo ">> If that errored: open the repo on github.com > Settings > Pages > Source: Branch=main, folder=/ (root) > Save"
echo ""
echo "Done. Pages goes live in ~1-3 min at:"
echo "  https://aryandesai-ux.github.io/dnata-cases-investigations/today.html"
