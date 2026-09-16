-- =====================================================================
-- As trancas que faltavam
--
-- Nenhuma porta estava aberta. Conferi cada uma, como visitante sem
-- login: dar acesso a alguém foi recusado, listar módulos devolveu
-- nada, ler a tabela de aulas foi recusado, pedir o endereço de um
-- vídeo foi recusado.
--
-- O que este arquivo conserta é outra coisa: há permissões concedidas
-- que não precisavam existir, e o que segura a porta hoje é a segunda
-- tranca, não a primeira.
--
-- ---------------------------------------------------------------------
-- 1. Funções de administração alcançáveis por quem não entrou
--
-- `definir_acesso`, `estender_acesso`, `gerar_cronograma` e as outras
-- estão concedidas ao papel `anon` — o visitante anônimo. Elas se
-- defendem por dentro, conferindo `eh_admin()`, e é por isso que a
-- tentativa volta com `sem_permissao` em vez de dar acesso a alguém.
--
-- Mas a defesa mora dentro do corpo da função. Basta alguém, um dia,
-- escrever uma função nova seguindo o mesmo padrão e esquecer a
-- conferência, e a concessão a `anon` vira a porta. A tranca certa é
-- não conceder: quem não entrou não alcança nem para tentar.
--
-- `meu_perfil` e `meus_modulos` entram junto por outro motivo. Elas não
-- vazam nada — sem `auth.uid()` devolvem lista vazia —, mas devolver
-- vazio a quem não entrou é responder uma pergunta que não deveria ter
-- sido aceita. O aplicativo já não as chama sem sessão: `temSessao()`
-- é conferido antes, no carregamento.
-- ---------------------------------------------------------------------

revoke execute on function cronograma_da_aluna(uuid) from anon;
revoke execute on function definir_abertura(uuid, uuid, timestamptz) from anon;
revoke execute on function definir_acesso(uuid, integer, integer, integer) from anon;
revoke execute on function estender_acesso(uuid, integer, integer, integer) from anon;
revoke execute on function gerar_cronograma(uuid, uuid[], integer, timestamptz) from anon;
revoke execute on function gerar_cronograma_lote(uuid[], uuid[], integer, timestamptz) from anon;
revoke execute on function remover_aula_da_aluna(uuid, uuid) from anon;
revoke execute on function meu_perfil() from anon;
revoke execute on function meus_modulos() from anon;

-- ---------------------------------------------------------------------
-- 2. A tabela que conta as tentativas de entrar
--
-- `tentativas_ip` é o que segura força bruta no login: guarda quantas
-- vezes cada endereço tentou e falhou. Ela tem RLS ligada e nenhuma
-- regra, o que na prática fecha a tabela — sem regra, a RLS não deixa
-- passar linha nenhuma.
--
-- Só que `anon` e `authenticated` têm as sete permissões da tabela
-- concedidas. Hoje isso não serve para nada, porque a RLS barra antes.
-- Amanhã alguém escreve uma política para resolver outro problema, e
-- as permissões que ninguém lembrava que existiam passam a valer.
--
-- Mais grave do que parece: esta tabela é justamente a que registra
-- quem está tentando arrombar. Poder apagá-la seria poder apagar o
-- próprio rastro, e recomeçar a contagem do zero.
--
-- Quem escreve aqui é a Edge Function do login, com a chave de
-- serviço, que passa por cima da RLS e não precisa destas concessões.
-- Por isso continua sem política: não é esquecimento, é que ninguém
-- além do servidor tem o que fazer aqui.
-- ---------------------------------------------------------------------

revoke all on table tentativas_ip from anon, authenticated;

comment on table tentativas_ip is
  'Força bruta no login: tentativas por endereço. Escrita só pela Edge Function `entrar`, com a chave de serviço. Sem política de RLS de propósito — a chave de serviço passa por cima dela, e ninguém mais deve alcançar esta tabela. As permissões de anon e authenticated foram revogadas na 0016.';
