#!/usr/bin/env bash
# Aplica as migrations num PostgreSQL local e roda os testes das regras
# de acesso. Não toca em nenhum projeto Supabase.
#
#   ./supabase/testes/rodar.sh
#
# Precisa de postgresql-16 instalado. Sobe uma instância descartável na
# porta 5433 e derruba no fim.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGDATA=/var/lib/postgresql/aion-testes
BIN=/usr/lib/postgresql/16/bin
PORTA=5433
export PGHOST=/tmp PGPORT=$PORTA PGUSER=postgres

limpar() { su postgres -c "$BIN/pg_ctl -D $PGDATA stop -m immediate" >/dev/null 2>&1 || true; }
trap limpar EXIT

# Derruba qualquer instancia anterior que ainda segure o socket.
limpar
rm -f "/tmp/.s.PGSQL.$PORTA" "/tmp/.s.PGSQL.$PORTA.lock"

rm -rf "$PGDATA"; mkdir -p "$PGDATA"; chown postgres:postgres "$PGDATA"
su postgres -c "$BIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
# Só socket unix: evita brigar por porta TCP com qualquer outra instância.
su postgres -c "$BIN/pg_ctl -D $PGDATA -o \"-k /tmp -p $PORTA -c listen_addresses=''\" -l $PGDATA.log start" >/dev/null
sleep 1

psql -q -c 'create database aion;'
psql -q -d aion -c 'create extension if not exists pgcrypto;'
psql -q -d aion -v ON_ERROR_STOP=1 -f "$RAIZ/supabase/testes/00_arremedo_supabase.sql"

echo '--- aplicando migrations ---'
for m in "$RAIZ"/supabase/migrations/*.sql; do
  echo "  $(basename "$m")"
  psql -q -d aion -v ON_ERROR_STOP=1 -f "$m"
done

psql -q -d aion -c 'grant usage on schema public, auth to authenticated, anon;
                    grant execute on function auth.uid() to authenticated, anon;
                    grant select, insert, update, delete on all tables in schema public to authenticated;'

psql -q -d aion -v ON_ERROR_STOP=1 -f "$RAIZ/supabase/testes/01_semear.sql"

echo '--- regras de acesso ---'
psql -d aion -f "$RAIZ/supabase/testes/02_regras_de_acesso.sql"
