#!/usr/bin/env bash
#
# Cria a chave de assinatura do Cloudflare Stream.
#
# O painel do Cloudflare não tem botão para isto — a chave só nasce pela
# API. Este roteiro faz a chamada e mostra os dois valores que você vai
# colar nos segredos do Supabase.
#
# Peça o token e o número da conta na hora, sem digitar na linha de
# comando: assim eles não ficam no histórico do terminal. E não guarde a
# chave privada em arquivo nenhum — ela vai daqui direto para o campo do
# Supabase, e mais nada.
#
# Uso:  bash criar-chave.sh

set -euo pipefail

printf 'ID da conta Cloudflare: '
read -r CONTA

# `-s` não mostra o que você digita, como uma senha.
printf 'Token da API (não aparece na tela): '
read -rs TOKEN
printf '\n\n'

if [ -z "$CONTA" ] || [ -z "$TOKEN" ]; then
  echo "Faltou o número da conta ou o token." >&2
  exit 1
fi

RESPOSTA=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${CONTA}/stream/keys" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

# `jq` deixa a leitura melhor, mas não é obrigatório.
if command -v jq >/dev/null 2>&1; then
  if [ "$(printf '%s' "$RESPOSTA" | jq -r '.success')" != "true" ]; then
    echo "O Cloudflare recusou:" >&2
    printf '%s\n' "$RESPOSTA" | jq '.errors' >&2
    exit 1
  fi
  ID=$(printf '%s' "$RESPOSTA" | jq -r '.result.id')
  JWK=$(printf '%s' "$RESPOSTA" | jq -r '.result.jwk')

  cat <<FIM
Chave criada. Cole estes dois valores em
Supabase → Edge Functions → Secrets:

  STREAM_CHAVE_ID
$ID

  STREAM_CHAVE_JWK
$JWK

A chave privada acima não será mostrada de novo pelo Cloudflare. Se
perder, crie outra e troque o segredo — a antiga pode ser apagada.

Feche esta janela do terminal depois de colar.
FIM
else
  echo "Resposta do Cloudflare (procure por \"id\" e \"jwk\"):"
  printf '%s\n' "$RESPOSTA"
fi
