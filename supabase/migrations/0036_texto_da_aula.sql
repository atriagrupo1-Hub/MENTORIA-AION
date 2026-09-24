-- ---------------------------------------------------------------------
-- 0036 — O texto da aula, e a fundação do curso
-- ---------------------------------------------------------------------
-- A aula guardava título, capa, vídeo e exercício. O que ela ensina só
-- existia dentro do vídeo — em lugar nenhum por escrito.
--
-- Isso fecha duas portas de uma vez. A aluna que não pode ver vídeo
-- agora (ônibus, dado no fim, casa sem internet boa) fica sem a aula
-- inteira. E qualquer coisa que venha a ler a mentoria — uma busca, um
-- assistente de dúvidas — não tem o que ler: título não é conteúdo.
--
-- Três campos de texto, escritos à mão no painel, uma aula por vez:
--
--   resumo     o que a aula ensinou, em texto corrido
--   exercicio  já existia: uma linha por passo
--   aplicacao  o que fazer com isso na vida, fora do caderno
--
-- E no curso, duas coisas que valem para todas as aulas dele:
--
--   fundacao        o que é esta mentoria, para quem, com que voz
--   aviso_material  a frase do PDF ("peça no grupo"), escrita uma vez
--                   e não cinquenta e uma
--
-- Tudo opcional. Aula sem resumo continua funcionando como hoje.
-- ---------------------------------------------------------------------

alter table aulas add column if not exists resumo text;
alter table aulas add column if not exists aplicacao text;

comment on column aulas.resumo is
  'O que a aula ensina, em texto. Escrito à mão no painel. A aluna lê na aba Aplicação; é também o único conteúdo que algo automático conseguiria ler.';
comment on column aulas.aplicacao is
  'O que fazer com a aula fora do caderno. Texto corrido, escrito à mão.';

alter table produtos add column if not exists fundacao text;
alter table produtos add column if not exists aviso_material text;

comment on column produtos.fundacao is
  'O que é este curso: para quem, o que promete, com que voz. Vale para todas as aulas dele.';
comment on column produtos.aviso_material is
  'Frase única sobre material de apoio — por exemplo, pedir o PDF no grupo. Escrita uma vez, aparece em toda aula do curso.';

-- ---------------------------------------------------------------------
-- Quem escreve e quem lê.
--
-- As políticas de `aulas` e `produtos` já mandam: a equipe escreve, a
-- aluna lê o que está liberado para ela. Coluna nova entra debaixo da
-- mesma política — não há o que abrir aqui, e é de propósito que não
-- haja. O que muda é o GRANT de coluna, que em `authenticated` é por
-- tabela e não por coluna: nada a fazer.
--
-- Conferido depois de aplicar, como aluna logada:
--   update aulas set resumo = 'x'  ->  0 linhas
-- ---------------------------------------------------------------------
