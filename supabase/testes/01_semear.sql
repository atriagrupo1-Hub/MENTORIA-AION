-- Duas alunas e uma administradora, com liberação parcial.
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');

insert into profiles (id, nome, login, papel) values
  ('11111111-1111-1111-1111-111111111111', 'Administradora', 'admin', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'Maria', 'maria', 'aluna'),
  ('33333333-3333-3333-3333-333333333333', 'Ana', 'ana', 'aluna');

insert into credenciais (aluna_id, codigo) values
  ('11111111-1111-1111-1111-111111111111', '482913'),
  ('22222222-2222-2222-2222-222222222222', '1234'),
  ('33333333-3333-3333-3333-333333333333', '5678');

insert into modulos (id, numero, titulo, ordem) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 0, 'BOAS-VINDAS E DIAGNOSTICO', 0),
  ('bbbbbbbb-0000-0000-0000-000000000000', 1, 'DESCOBRINDO O VERDADEIRO BLOQUEIO', 1);

insert into aulas (id, modulo_id, numero, titulo, ordem) values
  ('a0a00000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 1, 'Aula 0.1', 0),
  ('a0a00000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 2, 'Aula 0.2', 1),
  ('b0b00000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', 1, 'Aula 1.1', 0);

insert into aula_midia (aula_id, video_provider, video_ref) values
  ('a0a00000-0000-0000-0000-000000000001', 'stream', 'uid-secreto-aula-0-1'),
  ('b0b00000-0000-0000-0000-000000000001', 'stream', 'uid-secreto-aula-1-1');

-- Maria tem só o Módulo 0. Ana não tem nada.
insert into acessos (aluna_id, escopo, modulo_id) values
  ('22222222-2222-2222-2222-222222222222', 'modulo', 'aaaaaaaa-0000-0000-0000-000000000000');

-- Um comentário de Maria.
insert into comentarios (aula_id, autora_id, texto, posicao_segundos) values
  ('a0a00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Comentario da Maria', 272);
