#!/usr/bin/env bash
# Exercita a Edge Function `entrar` de ponta a ponta.
#
#   ./supabase/testes/testar_entrar.sh <login> <codigo>
#
# Ou com as variáveis já definidas:
#   URL_PROJETO=https://xxxx.supabase.co CHAVE_ANON=... ./…/testar_entrar.sh admin 123456
#
# Não imprime os tokens: mostra só o tamanho, para confirmar que vieram.
set -uo pipefail

URL_PROJETO="${URL_PROJETO:-https://crcclhmamknqkamvavyp.supabase.co}"
CHAVE_ANON="${CHAVE_ANON:-}"
LOGIN="${1:-}"
CODIGO="${2:-}"

if [ -z "$CHAVE_ANON" ]; then
  echo "Defina CHAVE_ANON com a chave publicável (anon) do projeto." >&2
  echo "Painel do Supabase → Project Settings → API Keys." >&2
  exit 1
fi

if [ -z "$LOGIN" ] || [ -z "$CODIGO" ]; then
  echo "Uso: $0 <login> <codigo>" >&2
  exit 1
fi

ENDERECO="$URL_PROJETO/functions/v1/entrar"
CORPO=$(mktemp)
trap 'rm -f "$CORPO"' EXIT

chamar() {
  local descricao="$1" carga="$2"
  printf '=== %s\n' "$descricao"
  local status
  status=$(curl -sS -o "$CORPO" -w '%{http_code}' -X POST "$ENDERECO" \
    -H "apikey: $CHAVE_ANON" \
    -H 'Content-Type: application/json' \
    -d "$carga")
  printf 'HTTP %s\n' "$status"
  python3 - "$CORPO" <<'PY'
import json, sys
try:
    dados = json.load(open(sys.argv[1]))
except Exception:
    print(open(sys.argv[1]).read()[:300]); raise SystemExit
for chave in ("access_token", "refresh_token"):
    if chave in dados:
        dados[chave] = f"<{len(dados[chave])} caracteres>"
print(json.dumps(dados, ensure_ascii=False, indent=2)[:700])
PY
  printf '\n'
}

chamar 'campos faltando  (espera 400)'   '{"login":"'"$LOGIN"'"}'
chamar 'codigo com letras (espera 400)'  '{"login":"'"$LOGIN"'","codigo":"abcd"}'
chamar 'nome inexistente  (espera 401)'  '{"login":"ninguem-existe","codigo":"'"$CODIGO"'"}'
chamar 'codigo errado     (espera 401)'  '{"login":"'"$LOGIN"'","codigo":"000000"}'
chamar 'CODIGO CERTO      (espera 200)'  '{"login":"'"$LOGIN"'","codigo":"'"$CODIGO"'"}'

echo 'Se a última devolveu 200 com access_token e refresh_token, o login está de pé.'
echo 'Atenção: as tentativas erradas acima contam para a trava de 5 por conta.'
