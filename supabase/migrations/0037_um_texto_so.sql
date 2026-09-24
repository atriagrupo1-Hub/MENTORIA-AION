-- ---------------------------------------------------------------------
-- 0037 — Um campo só para o texto da aula
-- ---------------------------------------------------------------------
-- A 0036 dividiu o texto em três — resumo, exercício, aplicação. Estava
-- errado, e o dono disse na primeira vez que viu: ele escreve tudo
-- junto, separa o que quiser separar, destaca o que quiser destacar. As
-- três caixas obrigavam a picar um texto que nasce inteiro, e a aluna
-- via três títulos que ninguém pediu.
--
-- Um campo só: `aulas.texto`. Quem escreve decide o que tem dentro.
--
-- Os três antigos saem. Nenhum tinha uma linha preenchida — medido nas
-- 51 aulas antes de apagar: 0 com resumo, 0 com aplicação, 0 com
-- exercício. Não há dado a perder, e deixar coluna morta só faria a
-- próxima pessoa perguntar qual das quatro é a de verdade.
-- ---------------------------------------------------------------------

alter table aulas add column if not exists texto text;

comment on column aulas.texto is
  'O que a aula ensina, escrito à mão no painel. Um texto só: o espaçamento e o destaque são de quem escreve. É o único conteúdo em texto que a aluna vê, e o único que algo automático conseguiria ler.';

alter table aulas drop column if exists resumo;
alter table aulas drop column if exists aplicacao;
alter table aulas drop column if exists exercicio;
