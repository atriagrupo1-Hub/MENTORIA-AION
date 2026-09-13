-- =====================================================================
-- Exercício da aula
--
-- A mentoria não termina no vídeo: cada aula pede um trabalho no
-- caderno da aluna. Até aqui o app tinha um botão "Exercício" que abria
-- uma frase genérica do protótipo, igual em todas as aulas e sem lugar
-- nenhum para a administradora escrever o que ela realmente quer pedir.
--
-- `exercicio` guarda esse texto, por aula. Nulo ou vazio quer dizer que
-- a aula não tem exercício — e aí o app não mostra o botão, em vez de
-- oferecer uma porta que não leva a lugar nenhum.
--
-- Uma linha por passo. É a forma mais simples de escrever para quem vai
-- preencher pelo painel, e a tela numera sozinha na hora de mostrar.
--
-- ---------------------------------------------------------------------
-- Por que os GRANTs abaixo existem
--
-- `aulas` tem permissão concedida coluna a coluna, não na tabela
-- inteira. Coluna nova nasce sem permissão alguma: sem estas linhas,
-- nem a aluna leria nem a administradora escreveria, e o erro que
-- aparece é "permission denied", que não se parece nada com o que
-- realmente aconteceu.
--
-- Só `authenticated` recebe. `anon` tem as outras colunas por herança
-- de quando a tabela foi criada, mas quem não entrou não lê aula
-- nenhuma — a RLS barra antes. Não há motivo para ampliar isso agora.
--
-- Quem decide o acesso continua sendo a RLS, como sempre: estes GRANTs
-- só dizem que a coluna existe para o papel. A política de `aulas` é
-- que diz quais linhas ele enxerga.
-- =====================================================================

alter table aulas
  add column if not exists exercicio text;

comment on column aulas.exercicio is
  'Passo a passo do exercício da aula, uma linha por passo. Nulo ou vazio = a aula não tem exercício, e o app não mostra o botão.';

grant select (exercicio) on aulas to authenticated;
grant insert (exercicio) on aulas to authenticated;
grant update (exercicio) on aulas to authenticated;
