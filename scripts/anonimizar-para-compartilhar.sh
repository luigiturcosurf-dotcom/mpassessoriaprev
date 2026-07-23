#!/usr/bin/env bash
# Gera uma cópia anonimizada do projeto para compartilhar (código / zip).
# NÃO altera as LPs de produção — só escreve em anonymized-export/.
#
# Uso:
#   ./scripts/anonimizar-para-compartilhar.sh
#   ./scripts/anonimizar-para-compartilhar.sh --zip
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/anonymized-export"
STAMP="$(date +%Y%m%d-%H%M%S)"
MAKE_ZIP=0

for arg in "$@"; do
  case "$arg" in
    --zip|-z) MAKE_ZIP=1 ;;
    -h|--help)
      echo "Uso: $0 [--zip]"
      exit 0
      ;;
  esac
done

echo "==> Limpando ${OUT_DIR}"
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

echo "==> Copiando estrutura (sem assets pesados / git / zips)"
if command -v rsync >/dev/null 2>&1; then
  rsync -a \
    --exclude '.git/' \
    --exclude '.cursor/' \
    --exclude '.vercel/' \
    --exclude 'node_modules/' \
    --exclude '.venv/' \
    --exclude 'anonymized-export/' \
    --exclude 'assets/' \
    --exclude 'Assets/' \
    --exclude '**/assets/' \
    --exclude '**/Assets/' \
    --exclude 'scripts/anonimizar-para-compartilhar.sh' \
    --exclude '*.zip' \
    --exclude '*.webp' \
    --exclude '*.jpg' \
    --exclude '*.jpeg' \
    --exclude '*.png' \
    --exclude '*.avif' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    "${ROOT}/" "${OUT_DIR}/"
else
  find "${ROOT}" \( \
      -path '*/.git' -o -path '*/.git/*' -o \
      -path '*/.vercel' -o -path '*/.vercel/*' -o \
      -path '*/node_modules' -o -path '*/node_modules/*' -o \
      -path '*/anonymized-export' -o -path '*/anonymized-export/*' -o \
      -path '*/assets' -o -path '*/assets/*' -o \
      -path '*/Assets' -o -path '*/Assets/*' \
    \) -prune -o \
    -type f \( \
      -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.gs' -o \
      -name '*.sql' -o -name '*.json' -o -name '*.md' -o -name '*.sh' -o \
      -name '*.mdc' -o -name '.gitignore' -o -name 'vercel.json' \
    \) -print0 | while IFS= read -r -d '' f; do
      rel="${f#"${ROOT}"/}"
      mkdir -p "${OUT_DIR}/$(dirname "$rel")"
      cp "$f" "${OUT_DIR}/${rel}"
    done
fi

echo "==> Anonimizando identificadores do cliente"
find "${OUT_DIR}" -type f \( \
  -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.gs' -o \
  -name '*.sql' -o -name '*.json' -o -name '*.md' -o -name '*.sh' -o \
  -name '*.txt' -o -name '*.mdc' -o -name '*.htaccess' -o \
  -name 'vercel.json' -o -name '.gitignore' -o -name '.htaccess' \
\) ! -name 'anonimizar-para-compartilhar.sh' -print0 | while IFS= read -r -d '' file; do
  perl -i -pe '
    s/mpassessoriaprevidenciaria\.com\.br/[DOMINIO]/g;
    s/MP Assessoria Previdenci[aá]ria/[CLIENTE]/g;
    s/MP Assessoria/[CLIENTE]/g;
    s/\bmpassessoria\b/[CLIENTE_SLUG]/g;
    s/Mamae Protegida/[CLIENTE]/g;
    s/mamae-protegida-app/[CLIENTE_SLUG]/g;
    s/5511947642923/[TELEFONE]/g;
    s/5511963922594/[TELEFONE_B]/g;
    s/2851865198508090/[ID_CONTA_PIXEL_A]/g;
    s/1229096362421532/[ID_CONTA_PIXEL_B]/g;
    s/1752369442414230/[ID_CONTA_PIXEL_C]/g;
    s/GTM-P97C37L3/[ID_CONTA_GTM]/g;
    s|AW-17670340948/AuYoCJTl0b8cENSC8OlB|[ID_CONTA_ADS]|g;
    s/AW-17670340948/[ID_CONTA_ADS]/g;
    s/jiuxiyxsausauqfsudus/[ID_CONTA_SUPABASE]/g;
    s/sb_publishable_EQdUpWMg45TuCM9Dj5pE3w_qHvi21AT/[CHAVE_API]/g;
    s/luigiturcosurf-dotcom\/mpassessoriaprev/[ORG]\/[REPO]/g;
  ' "$file"
done

cat > "${OUT_DIR}/LEIA-ME-ANONIMIZADO.md" <<'EOF'
# Cópia anonimizada — NÃO usar em produção

Gerada por `scripts/anonimizar-para-compartilhar.sh`.

| Placeholder | Significado |
|---|---|
| `[CLIENTE]` | Nome da empresa / marca |
| `[DOMINIO]` | Domínio do site |
| `[TELEFONE]` / `[TELEFONE_B]` | Números WhatsApp |
| `[ID_CONTA_*]` | Pixel Meta, GTM, Ads, projeto Supabase |
| `[CHAVE_API]` | Chave publishable / secret |

**Não faça deploy desta pasta.** Use só para revisão ou compartilhamento.
EOF

echo "==> Conferência rápida"
if rg -n "mpassessoriaprevidenciaria|5511947642923|5511963922594|jiuxiyxsausauqfsudus|sb_publishable_EQd" "${OUT_DIR}" 2>/dev/null; then
  echo "AVISO: ainda há identificadores reais — revise o script."
  exit 1
fi
echo "OK: nenhum identificador sensível conhecido restante."

if [[ "$MAKE_ZIP" -eq 1 ]]; then
  ZIP_PATH="${ROOT}/anonymized-export-${STAMP}.zip"
  echo "==> Gerando zip: ${ZIP_PATH}"
  ( cd "${ROOT}" && zip -qr "${ZIP_PATH}" anonymized-export )
  echo "Zip pronto: ${ZIP_PATH}"
fi

echo ""
echo "Pronto. Pasta: ${OUT_DIR}"
echo "Para zip: ./scripts/anonimizar-para-compartilhar.sh --zip"
