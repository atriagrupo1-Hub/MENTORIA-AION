# Capas — inventário e convenção de nomes

56 arquivos em `assets/capas/`. Todos PNG. Manter os nomes exatamente como estão: o aplicativo monta o caminho a partir do número do módulo e da aula.

## Convenção

| Padrão | O que é | Proporção |
|---|---|---|
| `modulo-N.png` | capa do módulo | vertical 2:3 |
| `modulo-N-aula-X.png` | capa da aula (X começa em 1, reinicia em cada módulo) | horizontal 16:9, 1280×720 |
| `ao-vivo-modulo-N.png` | capa da aula ao vivo do módulo | horizontal 16:9 |
| `presente-N.png` | capa do presente | vertical 2:3 |

## Inventário atual

### Capas de módulo — 11 esperadas, 11 presentes

`modulo-0.png` · `modulo-1.png` · `modulo-2.png` · `modulo-3.png` · `modulo-4.png` · `modulo-5.png` · `modulo-6.png` · `modulo-7.png` · `modulo-8.png` · `modulo-9.png` · `modulo-10.png`

Observação: `modulo-10.png` existe mas ainda é arte provisória — os módulos 0 a 9 têm arte final.

### Capas de aula — 50 esperadas, 45 presentes

| Módulo | Aulas | Presentes | Faltando |
|---|---|---|---|
| 0 | 2 | 1, 2 | — |
| 1 | 4 | 1, 2, 3, 4 | — |
| 2 | 5 | 1, 2, 3, 4, 5 | — |
| 3 | 7 | 1, 2, 3, 4, 5, 6, 7 | — |
| 4 | 4 | 1, 2, 3, 4 | — |
| 5 | 5 | 1, 2, 3, 4, 5 | — |
| 6 | 4 | 1, 2, 3, 4 | — |
| 7 | 4 | 1, 2, 3, 4 | — |
| 8 | 5 | 1, 2, 3, 4, 5 | — |
| 9 | 5 | 1, 2, 3, 4, 5 | — |
| 10 | 5 | nenhuma | **1, 2, 3, 4, 5** |

Total: 45 de 50. Faltam as cinco aulas do Módulo 10.

### Aulas ao vivo — 0 de 11

Nenhuma capa `ao-vivo-modulo-N.png` produzida ainda.

### Presentes — 0

Nenhuma capa `presente-N.png` produzida ainda. A quantidade depende de quantos presentes o cliente cadastrar.

## Regras de exibição

- Proporção sempre mantida, `object-fit: cover` — nunca deformar nem cortar título
- Fundo de reserva em degradê caso a imagem não carregue: `linear-gradient(160deg, #131c33, #060911 60%, #101830)`. Nunca deixar espaço vazio
- Capas de módulo que já traem o título na própria arte **não recebem título sobreposto** — no protótipo isso é a lista `ART` no código; em produção deve ser um campo do módulo (ex. `titulo_na_arte`)
- A mesma capa de aula aparece grande (fundo do player) e pequena (miniatura de 112–132px). Texto miúdo na arte não é legível na miniatura

## Destino em produção

Bucket `capas` no Supabase Storage, público. O banco guarda apenas o caminho relativo em `modulos.capa_path`, `aulas.capa_path` e `presentes.capa_path` — nunca o endereço completo.

---

## Conferência automática do pacote entregue

Os três pacotes (`capas-pacote-1/2/3`) foram descompactados juntos e
conferidos contra o catálogo do banco em 2026-09-08:

- **56 arquivos PNG**, todos com nome idêntico ao `capa_path` gravado —
  nenhum nome fora do padrão, nenhum arquivo sobrando
- **Proporções todas corretas**: as 11 capas de módulo em 1024×1536
  (2:3); as 45 capas de aula em 16:9 — 38 em 1280×720 e 7 em 1672×941
- **Faltando, como o inventário já dizia**: `modulo-10-aula-1.png` a
  `modulo-10-aula-5.png`

As artes de módulo trazem "MÓDULO N" e o título embutidos, inclusive a
provisória do módulo 10. Por isso os onze módulos estão com
`titulo_na_arte = true` no banco, e a tela não sobrepõe título nenhum.

As imagens em si não são versionadas neste repositório: somam cerca de
82 MB, o aplicativo não as lê daqui (lê do depósito `capas` do Supabase
Storage) e o Git guardaria cada versão para sempre. O que vale versionar
é a convenção de nomes e o inventário, que é este arquivo.

---

## Conversão para WebP — 2026-09-09

As 56 capas foram convertidas de PNG para WebP, qualidade 85. As mesmas
artes, sem diferença visível — conferi a área mais difícil, o texto
dourado com serifa sobre fundo escuro, no tamanho real.

| | |
|---|---|
| Antes | 82,8 MB |
| Depois | 7,2 MB (9% do original) |
| Maior arquivo | 330 KB, era 2,8 MB |

As 7 capas de aula que estavam em 1672×941 desceram para 1280×720,
igual às outras 38. As 11 de módulo continuam em 1024×1536.

A convenção de nomes não mudou; só a extensão. O padrão passa a ser:

| Padrão | Proporção |
|---|---|
| `modulo-N.webp` | vertical 2:3, 1024×1536 |
| `modulo-N-aula-X.webp` | horizontal 16:9, 1280×720 |
| `ao-vivo-modulo-N.webp` | horizontal 16:9 |
| `presente-N.webp` | vertical 2:3 |

Arte nova deve chegar em WebP, ou ser convertida antes de subir.
