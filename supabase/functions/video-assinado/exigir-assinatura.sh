#!/usr/bin/env bash
#
# Liga "Require Signed URLs" nos vídeos do Cloudflare Stream.
#
# Enquanto um vídeo aceitar endereço sem assinatura, assinar não protege
# nada: o identificador antigo continua tocando. É este passo que fecha
# a porta — e por isso ele vem por último.
#
# Uso:
#   bash exigir-assinatura.sh            lista os vídeos e como estão
#   bash exigir-assinatura.sh <UID>      exige assinatura nesse vídeo
#   bash exigir-assinatura.sh --todos    exige em todos de uma vez
#
# Comece por um vídeo só. Confira que a aula toca no aplicativo antes de
# fechar as outras.

set -euo pipefail

command -v jq >/dev/null 2>&1 || { echo "Este roteiro precisa do jq." >&2; exit 1; }

printf 'ID da conta Cloudflare: '
read -r CONTA
printf 'Token da API (não aparece na tela): '
read -rs TOKEN
printf '\n\n'

BASE="https://api.cloudflare.com/client/v4/accounts/${CONTA}/stream"
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

conferir() {
  if [ "$(printf '%s' "$1" | jq -r '.success')" != "true" ]; then
    echo "O Cloudflare recusou:" >&2
    printf '%s' "$1" | jq '.errors' >&2
    exit 1
  fi
}

exigir() {
  local uid="$1"
  local r
  r=$(curl -sS -X POST "${BASE}/${uid}" "${AUTH[@]}" -d '{"requireSignedURLs":true}')
  conferir "$r"
  echo "  fechado: ${uid}"
}

case "${1:-}" in
  "")
    r=$(curl -sS "${BASE}?limit=1000" "${AUTH[@]}")
    conferir "$r"
    printf '%s' "$r" | jq -r '
      .result[]
      | (if .requireSignedURLs then "fechado " else "ABERTO  " end)
        + .uid + "  " + (.meta.name // "sem nome")'
    echo
    echo 'Os marcados ABERTO tocam para qualquer um que tenha o identificador.'
    ;;
  --todos)
    r=$(curl -sS "${BASE}?limit=1000" "${AUTH[@]}")
    conferir "$r"
    for uid in $(printf '%s' "$r" | jq -r '.result[] | select(.requireSignedURLs | not) | .uid'); do
      exigir "$uid"
    done
    echo "Pronto."
    ;;
  *)
    exigir "$1"
    ;;
esac
