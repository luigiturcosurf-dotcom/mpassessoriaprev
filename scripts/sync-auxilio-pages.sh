#!/bin/bash
# Sincroniza CONTEÚDO (copy/estrutura) da Página Preta → Azul e INSS.
# Mantém o <head> de cada tema intacto.
#
# Uso: ./scripts/sync-auxilio-pages.sh
#
# auxilio-acidente  = Página Preta  (MP escuro + verde)
# auxilio-acidente2 = Página Azul   (navy/dourado)
# auxilio-acidente3 = Página INSS   (paleta Meu INSS)

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRETA="$ROOT/auxilio-acidente/index.html"
TMP="$(mktemp)"

sed -n '/<body>/,/<\/body>/p' "$PRETA" > "$TMP.body"

sync_page() {
  local TARGET="$1"
  local SCRIPT_VER="$2"
  {
    sed -n '1,/<\/head>/p' "$TARGET"
    cat "$TMP.body"
    echo "<script src=\"script.js?v=${SCRIPT_VER}\"></script>"
    echo '</html>'
  } > "${TARGET}.new"
  mv "${TARGET}.new" "$TARGET"
  echo "✓ $(basename "$(dirname "$TARGET")")"
}

sync_page "$ROOT/auxilio-acidente2/index.html" "4"
sync_page "$ROOT/auxilio-acidente3/index.html" "1"

rm -f "$TMP.body"
echo ""
echo "Copy sincronizada a partir de auxilio-acidente/"
