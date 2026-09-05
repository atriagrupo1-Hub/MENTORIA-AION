# Caminho do Desbloqueio para Bênçãos Ilimitadas

Área de membros da mentoria — 11 módulos (0 a 10), 50 aulas, área da aluna e
painel administrativo.

## Estado do repositório

As telas estão recriadas em React: área da aluna (Login, Início, Módulos, página
do módulo, tela da aula, aula ao vivo, Presentes, Perfil) e painel
administrativo (Alunas, Conteúdo, Presentes).

Os dados ainda vêm de um adaptador local (`src/data/repositorio.ts`), que é o
único arquivo que conhece a origem. O Supabase entra ali.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint     # checagem de tipos
```

Rotas: `/` login · `/inicio` · `/modulos` · `/modulo/:numero` ·
`/aula/:modulo/:aula` · `/ao-vivo/:modulo` · `/presentes` · `/presente/:id` ·
`/perfil` · `/admin` (senha do protótipo: `mentoria`).

## Organização

| Pasta | O que tem |
|---|---|
| `src/design/` | Tokens do item 3 do README do handoff: cores, paleta por módulo, tipografia |
| `src/data/` | Catálogo transcrito do protótipo, tipos do modelo aprovado, adaptador de dados e estado |
| `src/components/` | Peças compartilhadas: capa com fundo de reserva, barra, ícones em CSS, aviso |
| `src/screens/` | Telas da aluna |
| `src/admin/` | Painel administrativo |

## Arquitetura decidida

| Camada | Escolha |
|---|---|
| Front | Vite + React + TypeScript + Tailwind, publicado na Cloudflare Pages |
| Dados e autenticação | Supabase (PostgreSQL + Auth + RLS) |
| Arquivos | Supabase Storage — `capas` público; `materiais` e `audios` por link assinado |
| Vídeo | Serviço dedicado a definir (recomendação: Cloudflare Stream) |
| Login | Nome + código de 4 números, conferido no servidor por Edge Function |

**Regra que não pode ser quebrada:** o Supabase é a única autoridade sobre
autenticação, liberações, bloqueios e progresso. Não sendo possível validar uma
autorização, o aplicativo não concede acesso — nunca decide por dado local. No
navegador ficam apenas a sessão e a posição recente do vídeo, como cache
descartável.

## `handoff_area_de_membros/`

Pacote de entrega, versionado como referência. Leia
[`handoff_area_de_membros/README.md`](handoff_area_de_membros/README.md) antes de
mexer em qualquer tela: ele descreve o projeto tela por tela, com as cores, a
tipografia, os espaçamentos, os estados e os textos aprovados.

| Arquivo | O que é |
|---|---|
| `README.md` | Especificação completa, tela por tela |
| `app/Area de Membros.dc.html` | Protótipo da área da aluna, jornada em andamento |
| `app/Area de Membros - Primeiro Acesso.dc.html` | O mesmo, com progresso zerado |
| `app/Painel Administrativo.dc.html` | Protótipo do painel da administradora |
| `app/Modelo de Dados.md` | Modelo de dados aprovado e mapeamento do estado atual |
| `app/Banco de Dados.sql` | Script de criação do banco: tabelas, RLS e funções |
| `app/support.js` | Runtime da ferramenta de design. Referência apenas; não portar |

Os `.dc.html` são **referência de design, não código para publicar**. As telas são
recriadas na stack acima, com fidelidade alta: nada de redesenhar, reescrever os
textos da interface ou renumerar módulos e aulas.

As 56 capas oficiais (`assets/capas/`) não fazem parte deste pacote, por volume.
Convenção de nomes no item 10 do README do handoff.
