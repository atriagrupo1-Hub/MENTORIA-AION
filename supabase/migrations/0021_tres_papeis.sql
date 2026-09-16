-- Três papéis na equipe, e nada mais.
--
-- Até aqui `papel_usuario` tinha dois valores: `aluna` e `admin`. Toda a
-- guarda do painel — 17 funções e 27 políticas — pergunta a mesma coisa,
-- `eh_admin()`. Um único papel, uma única porta.
--
-- Agora são três pessoas diferentes:
--
--   dono     — quem manda. Só ele mexe na equipe.
--   admin    — faz tudo no painel, menos mexer na equipe.
--   suporte  — responde comentário, cadastra, remove e bloqueia aluna,
--              e vê a ficha. Nada mais.
--
-- Esta migração só acrescenta os dois valores ao enum, porque o
-- PostgreSQL não deixa usar um valor de enum na mesma transação que o
-- criou. Quem usa os valores é a 0022.

alter type papel_usuario add value if not exists 'dono';
alter type papel_usuario add value if not exists 'suporte';
