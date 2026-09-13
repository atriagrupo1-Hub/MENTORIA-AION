# Ícone do aplicativo

De onde vem o ícone que fica na tela inicial do celular.

## Origem

`Chronos X Aiōn_ Manual de identidade.zip`, nesta mesma pasta, arquivo
`png/aion-simbolo-dourado.png` — o símbolo isolado, dourado, sobre fundo
transparente (2400 × 1402, sobrando 2196 × 1181 depois de aparar a
margem vazia).

Só o símbolo. A assinatura completa traz `AIŌN` e `A VIDA PELOS OLHOS DE
DEUS` embaixo, e num ícone de 12 mm de lado essas duas linhas viram
mancha. O nome aparece de outro jeito: o próprio sistema o escreve
embaixo do ícone, a partir do `short_name` do manifesto.

Nenhuma cor foi alterada. O símbolo é composto por cima do preto do app
(`#000000`), que é também o `background_color` do manifesto.

## Tamanhos

| Arquivo | Lado | Símbolo | Para quê |
|---|---|---|---|
| `public/icone-192.png` | 192 | 78% da largura | Android |
| `public/icone-512.png` | 512 | 78% | Android, tela de abertura |
| `public/icone-maskable-512.png` | 512 | **62%** | Android, quando o sistema recorta |
| `public/apple-touch-icon.png` | 180 | 78% | iPhone e iPad |
| `public/favicon-32.png` | 32 | 78% | aba do navegador |

O `maskable` é menor de propósito. O Android recorta o ícone na forma que
o aparelho usa — círculo, quadrado arredondado, gota — e só garante o
que estiver dentro de um círculo central com 80% do lado. O símbolo é
largo (1,86 : 1); pela diagonal, o limite para caber nesse círculo é 70%
da largura. 62% deixa a folga.

## Para trocar por outra arte

Substitua os cinco arquivos de `public/`. Mantenha os nomes — eles estão
escritos em `public/manifest.webmanifest`, em `index.html` e no cartão de
instalação. O script que gerou estes está no histórico deste commit.
