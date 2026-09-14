-- =====================================================================
-- O nome da aluna aparece nos comentários — só nos novos
--
-- Até aqui o comentário era anônimo, e não por descuido: a coluna
-- `autora_id` simplesmente não é concedida ao papel `authenticated`
-- (migração 0003), então não existe caminho pelo qual uma aluna alcance
-- a autoria de outra. E, embaixo da caixa de comentário, o aplicativo
-- prometia por escrito: "Seu nome não será exibido".
--
-- Agora o nome aparece. O que faz uma seção de comentários virar
-- comunidade é as alunas se reconhecerem; anônimo não cria comunidade,
-- cria caixa de sugestões.
--
-- ---------------------------------------------------------------------
-- Por que os comentários antigos continuam anônimos
--
-- Os que já existem foram escritos sob aquela promessa. Revelá-los
-- agora seria desfazer, sem avisar, uma combinação que o próprio
-- aplicativo fez com quem escreveu. Quem escolheu falar sabendo que não
-- seria identificada continua não sendo.
--
-- `nome_visivel` guarda qual promessa valia na hora em que o comentário
-- foi escrito. O truque está na ordem das duas linhas abaixo: a coluna
-- nasce com `default false`, e é esse valor que o banco grava nas
-- linhas que já existem. Só depois o padrão vira `true`, valendo dali
-- para a frente.
--
-- A aluna não escolhe. A coluna não é concedida a `authenticated`, nem
-- para escrever nem para ler: quem decide é o banco, na hora da
-- inserção, e não o navegador. Sem isso, bastaria alterar o pedido para
-- comentar sem nome enquanto todas as outras aparecem.
-- =====================================================================

alter table comentarios
  add column if not exists nome_visivel boolean not null default false;

comment on column comentarios.nome_visivel is
  'Qual promessa valia quando o comentário foi escrito. Falso nos anteriores a esta migração, que foram feitos sob anonimato. Verdadeiro dali em diante. A aluna não escolhe: o padrão do banco decide.';

alter table comentarios
  alter column nome_visivel set default true;

-- ---------------------------------------------------------------------
-- A leitura passa a ser por função, e não mais pela view
--
-- A view `comentarios_publicos` roda com a permissão de quem consulta
-- (`security_invoker = true`), que é justamente o que garante o
-- anonimato: a aluna não alcança `autora_id`, nem a linha de `profiles`
-- de outra aluna. Para mostrar o nome seria preciso afrouxar as duas
-- coisas — e aí o nome ficaria alcançável por qualquer consulta, não só
-- por esta. Errado.
--
-- Uma função `security definer` mostra exatamente um campo, calculado
-- aqui dentro, e nada mais. É o mesmo padrão já usado para mídia,
-- credenciais e moderação nesta base.
--
-- O `pode_ver_aula` na cláusula `where` é a linha mais importante do
-- arquivo. Rodando como dona, a função não passa pela RLS da tabela:
-- sem essa conferência, ela entregaria os comentários de qualquer aula
-- a qualquer aluna. A regra do item 8 continua inteira — quem decide o
-- acesso é o banco, e é aqui que ele decide.
--
-- `minha` vem calculado junto. Antes o aplicativo fazia duas viagens ao
-- banco para montar a lista — a view e `meus_comentarios` — e cruzava
-- os identificadores no navegador. Uma viagem só responde tudo.
-- ---------------------------------------------------------------------

create or replace function comentarios_da_aula(p_aula uuid)
returns table (
  id uuid,
  aula_id uuid,
  texto text,
  posicao_segundos integer,
  criado_em timestamptz,
  autora_nome text,
  minha boolean
) language sql stable security definer set search_path = public as $$
  select c.id,
         c.aula_id,
         c.texto,
         c.posicao_segundos,
         c.criado_em,
         -- Nulo quer dizer anônimo, e a tela escreve "Anônimo". O nome
         -- de quem não abriu mão do anonimato não sai daqui.
         case when c.nome_visivel then p.nome end,
         c.autora_id = auth.uid()
  from comentarios c
  left join profiles p on p.id = c.autora_id
  where c.aula_id = p_aula
    and c.status = 'publicado'
    and pode_ver_aula(p_aula)
  order by c.criado_em desc;
$$;

revoke execute on function comentarios_da_aula(uuid) from public, anon;
grant execute on function comentarios_da_aula(uuid) to authenticated;
