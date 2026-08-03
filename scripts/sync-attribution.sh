#!/bin/bash
# Propaga attribution.js e supabase-leads.js para todas as LPs + atualiza HTMLs.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/shared"

LP_DIRS=(
  auxilio-acidente auxilio-acidente2 auxilio-acidente3 auxilio-acidente4 auxilio-acidente4.1
  pensaopormorte1.1 pensaopormorte2 pensaopormorte4
  aposentadoria-rural aposentadoria-rural1.1 aposentadoria-rural2 aposentadoria-rural3 aposentadoria-rural4
  deploy/auxilio-acidente deploy/auxilio-acidente2 deploy/auxilio-acidente3 deploy/auxilio-acidente4 deploy/auxilio-acidente4.1
  deploy/pensaopormorte1.1 deploy/pensaopormorte2 deploy/pensaopormorte4
  deploy/aposentadoria-rural deploy/aposentadoria-rural1.1 deploy/aposentadoria-rural2 deploy/aposentadoria-rural3 deploy/aposentadoria-rural4
)

for dir in "${LP_DIRS[@]}"; do
  target="$ROOT/$dir"
  if [ -d "$target" ]; then
    cp "$SHARED/supabase-leads.js" "$target/supabase-leads.js"
    cp "$SHARED/attribution.js" "$target/attribution.js"
    cp "$SHARED/google-ads.js" "$target/google-ads.js"
    echo "✓ $dir"
  fi
done

patch_html() {
  local file="$1"
  [ -f "$file" ] || return 0

  # utm-passthrough → attribution
  sed -i '' 's|utm-passthrough\.js?v=[0-9]*|attribution.js?v=1|g' "$file" 2>/dev/null || \
    sed -i 's|utm-passthrough\.js?v=[0-9]*|attribution.js?v=1|g' "$file"

  # bump supabase-leads version
  sed -i '' 's|supabase-leads\.js?v=[0-9]*|supabase-leads.js?v=9|g' "$file" 2>/dev/null || \
    sed -i 's|supabase-leads\.js?v=[0-9]*|supabase-leads.js?v=9|g' "$file"

  # add attribution before supabase-leads if missing
  if grep -q 'supabase-leads.js' "$file" && ! grep -q 'attribution.js' "$file"; then
    sed -i '' 's|<script src="supabase-leads.js|<script src="attribution.js?v=1"></script>\
<script src="supabase-leads.js|g' "$file" 2>/dev/null || \
    sed -i 's|<script src="supabase-leads.js|<script src="attribution.js?v=1"></script>\n<script src="supabase-leads.js|g' "$file"
  fi
}

for dir in "${LP_DIRS[@]}"; do
  target="$ROOT/$dir"
  patch_html "$target/index.html"
  patch_html "$target/analise-de-beneficio.html"
done

patch_html "$ROOT/shared/pensao-por-morte/analise-de-beneficio.html"

echo ""
echo "HTMLs atualizados. Remova utm-passthrough.js obsoleto manualmente se desejar."
