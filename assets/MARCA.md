# Ícone do aplicativo

De onde vem o ícone que fica na tela inicial do celular.

## Origem

`marca-png/AION-marca-original-transparente.png`, nesta mesma pasta — a
marca completa em metal dourado, sobre fundo transparente. 866 × 677, e
819 × 673 depois de aparar a margem vazia, o que dá a proporção **1,217**.

Essa proporção é o motivo de ser esta arte e não outra. Uma marca larga
demais nunca enche um quadrado: sobra faixa vazia em cima e embaixo, e o
desenho parece pequeno. A 1,217 a marca ocupa o ícone inteiro.

A arte tem um halo escuro em volta do símbolo. Sobre branco pareceria
sujeira; sobre o preto do app (`#000000`, o mesmo `background_color` do
manifesto) ele vira o brilho que a arte pretendia. Nenhuma cor foi
alterada — a marca é composta por cima do preto, e mais nada.

O `Chronos X Aiōn_ Manual de identidade.zip` continua aqui como
referência da marca, mas não é ele que gera o ícone.

## Tamanhos

| Arquivo | Lado | Marca | Para quê |
|---|---|---|---|
| `public/icone-192.png` | 192 | 84% da largura | Android |
| `public/icone-512.png` | 512 | 84% | Android, tela de abertura |
| `public/icone-maskable-512.png` | 512 | **60%** | Android, quando o sistema recorta |
| `public/apple-touch-icon.png` | 180 | 84% | iPhone e iPad |
| `public/favicon-32.png` | 32 | 84% | aba do navegador |

O `maskable` é menor de propósito. O Android recorta o ícone na forma que
o aparelho usa — círculo, quadrado arredondado, gota — e só garante o que
estiver dentro de um círculo central com 80% do lado. Pela diagonal, uma
marca de proporção 1,217 só cabe nesse círculo até 61,8% da largura; 60%
deixa a folga. Sem essa versão, num aparelho que recorta em círculo as
pontas do X e as extremidades do A e do N sairiam.

## Para trocar por outra arte

Substitua os cinco arquivos de `public/`. Mantenha os nomes — eles estão
escritos em `public/manifest.webmanifest`, em `index.html` e no cartão de
instalação (`src/components/ConviteInstalar.tsx`). O script que gerou
estes está no histórico deste commit.

Se a arte nova for bem mais larga que alta, reduza o número da marca e
espere faixa preta em cima e embaixo: é geometria, não ajuste.

---

# Marca do painel administrativo

`public/marca-painel.png` — **o mesmo logo do ícone**, com o nome, em branco.

Não é outra arte: é `marca-png/AION-marca-original-transparente.png`
recolorida. O painel é preto e branco, e ali o dourado seria a única cor
da tela inteira.

## Como a recoloração é feita

Achatar o dourado em branco não funciona: a arte tem uma fumaça escura em
volta do símbolo, e pintá-la de branco também deixa um borrão que come as
pontas do X. Foi a primeira tentativa, e o resultado ficou sujo.

O que funciona é usar o **brilho como chave**. No original, o traço é
claro e a fumaça é escura, então a transparência nova sai de
`transparência antiga × (luminância / 255) ^ 0,85`: o traço dourado vira
branco sólido, a fumaça desaparece sozinha, e o clarão da estrela no
cruzamento do X continua lá. Valores abaixo de 14 são zerados para não
sobrar véu.

O script está no histórico do commit que criou este arquivo.

## Para trocar

Se a marca mudar, refaça `public/marca-painel.png` a partir da nova arte
pelo mesmo caminho, e mantenha o nome — ele está escrito em
`src/admin/PainelAdmin.tsx`.
