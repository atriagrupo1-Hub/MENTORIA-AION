-- =====================================================================
-- `modulos.titulo_na_arte` — o título mora na imagem, ou na tela?
--
-- No protótipo isso era a lista `ART`, escrita no código: uma lista de
-- números de módulo que o programador tinha de editar toda vez que uma
-- arte nova chegasse. Em produção vira campo do módulo, como pede a
-- especificação das capas, e passa a ser decisão da administradora no
-- painel — sem depender de novo deploy.
--
-- Verdadeiro: a arte já traz o título; a tela não sobrepõe nada, só
--   escurece o topo o suficiente para o texto de apoio ficar legível.
-- Falso: a tela desenha o título do módulo sobre a capa.
--
-- O padrão é falso de propósito. Um módulo criado hoje ainda não tem
-- arte; se o padrão fosse verdadeiro, ele apareceria sem título nenhum
-- — some a informação. Falso erra para o lado seguro: no máximo o
-- título aparece duas vezes, o que se vê e se corrige num clique.
-- =====================================================================

alter table modulos
  add column if not exists titulo_na_arte boolean not null default false;

comment on column modulos.titulo_na_arte is
  'Verdadeiro quando a arte da capa já traz o título do módulo embutido; nesse caso a tela não sobrepõe o título.';

-- Os 11 módulos existentes têm arte com o título embutido, que é o
-- comportamento que já estava no ar pela lista `ART`. Marcar aqui deixa
-- a tela idêntica à de antes desta migração.
update modulos set titulo_na_arte = true where numero between 0 and 10;
