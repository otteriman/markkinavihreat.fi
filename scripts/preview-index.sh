#!/usr/bin/env bash
# Prints the root index.html of the gh-pages branch previews: one link per
# branch directory in the current directory. Run from the gh-pages checkout by
# .github/workflows/preview-branches.yml after a preview is added or removed.
set -euo pipefail

echo '<!doctype html>'
echo '<html lang="fi"><head><meta charset="utf-8">'
echo '<meta name="viewport" content="width=device-width, initial-scale=1">'
echo '<meta name="robots" content="noindex">'
echo '<title>Haarojen esikatselut</title>'
echo '<style>body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem}</style>'
echo '</head><body><h1>Haarojen esikatselut</h1>'
echo '<p>Esikatseluja, ei tuotantoa. Varsinainen sivusto: <a href="https://markkinavihreat.fi/">markkinavihreat.fi</a>.</p><ul>'
for dir in */; do
  [ -d "$dir" ] || continue
  name="${dir%/}"
  echo "<li><a href=\"$name/\">$name</a></li>"
done
echo '</ul></body></html>'
