-- =====================================================================
-- Catálogo da mentoria — item (K) do modelo de dados
--
-- Os 11 módulos e as 50 aulas do protótipo viram linhas com id
-- permanente. Nome e ordem transcritos sem alteração (item 11 do
-- README do handoff).
--
-- A mídia NÃO é semeada aqui. Os vídeos de demonstração do protótipo
-- estavam no YouTube, e a hospedagem decidida é o Cloudflare Stream:
-- aula_midia fica vazia até os vídeos subirem, e a aula aparece como
-- indisponível enquanto isso — que é o comportamento correto.
--
-- capa_path é o caminho dentro do depósito `capas`, nunca URL.
-- =====================================================================

insert into modulos (numero, titulo, intro, cor_destaque, ordem, capa_path) values
  (0, 'BOAS-VINDAS E DIAGNÓSTICO', 'O ponto de partida da sua jornada: entender onde você está hoje e o que deseja construir a partir de agora.', '157,117,54', 0, 'modulo-0.png'),
  (1, 'DESCOBRINDO O VERDADEIRO BLOQUEIO', 'Antes de mudar os resultados, é preciso ver com clareza o processo invisível que os produz.', '115,27,27', 1, 'modulo-1.png'),
  (2, 'ENCONTRANDO A ORIGEM DOS BLOQUEIOS', 'Uma volta cuidadosa à formação das suas crenças, desde antes das primeiras palavras.', '28,68,108', 2, 'modulo-2.png'),
  (3, 'DESCONSTRUINDO AS CRENÇAS LIMITANTES', 'O trabalho central da mentoria: separar o fato do significado e enfraquecer a crença antiga.', '87,49,109', 3, 'modulo-3.png'),
  (4, 'RESTAURANDO A FORMA CORRETA DE ORAR', 'Sua oração revela aquilo em que você realmente acredita. Aqui ela é restaurada.', '51,91,136', 4, 'modulo-4.png'),
  (5, 'CONSTRUINDO UMA NOVA IDENTIDADE', 'A identidade antiga não precisa continuar governando a sua vida. Uma nova forma de pensar começa aqui.', '121,128,58', 5, 'modulo-5.png'),
  (6, 'REPROGRAMANDO O AMBIENTE', 'O que você vê, ouve e convive todos os dias sustenta ou desmonta a mudança.', '152,93,32', 6, 'modulo-6.png'),
  (7, 'REPROGRAMANDO O VERBO', 'A palavra dita e a palavra interior passam a caminhar em coerência com a nova identidade.', '29,78,129', 7, 'modulo-7.png'),
  (8, 'FORTALECENDO O ESTADO INTERIOR', 'Paz, esperança e confiança deixam de ser sentimentos ocasionais e passam a ser um estado cultivado.', '112,46,68', 8, 'modulo-8.png'),
  (9, 'TRANSFORMANDO A FÉ EM AÇÃO', 'Fé e responsabilidade caminham juntas. Aqui a mudança interior encontra as decisões práticas.', '144,98,55', 9, 'modulo-9.png'),
  (10, 'CONSOLIDANDO A NOVA VIDA', 'Consolidar não é terminar. É seguir com autonomia, administrando as novas bênçãos.', '143,90,28', 10, 'modulo-10.png');

insert into aulas (modulo_id, numero, titulo, ordem, capa_path)
select m.id, v.numero, v.titulo, v.ordem, v.capa
from modulos m join (values
  (0, 1::smallint, 'Você não entrou em mais um curso', 0, 'modulo-0-aula-1.png'),
  (0, 2::smallint, 'Seu ponto de partida e a vida que deseja construir', 1, 'modulo-0-aula-2.png'),
  (1, 1::smallint, 'Os frutos que você vê não são o começo', 0, 'modulo-1-aula-1.png'),
  (1, 2::smallint, 'O processo invisível por trás dos resultados', 1, 'modulo-1-aula-2.png'),
  (1, 3::smallint, 'O Ciclo da Escassez e o Ciclo da Prosperidade', 2, 'modulo-1-aula-3.png'),
  (1, 4::smallint, 'O mapa dos resultados que se repetem', 3, 'modulo-1-aula-4.png'),
  (2, 1::smallint, 'Ninguém nasce acreditando tudo o que acredita hoje', 0, 'modulo-2-aula-1.png'),
  (2, 2::smallint, 'A Primeira Escrita da Vida: heranças e período pré-natal', 1, 'modulo-2-aula-2.png'),
  (2, 3::smallint, 'Antes das palavras: a fase pré-verbal', 2, 'modulo-2-aula-3.png'),
  (2, 4::smallint, 'Quando as palavras começaram a definir o mundo', 3, 'modulo-2-aula-4.png'),
  (2, 5::smallint, 'Quem e o que participou da sua formação', 4, 'modulo-2-aula-5.png'),
  (3, 1::smallint, 'O fato e o significado que você deu a ele', 0, 'modulo-3-aula-1.png'),
  (3, 2::smallint, 'Como uma interpretação se transforma em crença', 1, 'modulo-3-aula-2.png'),
  (3, 3::smallint, 'Os hábitos da mente e a identidade antiga', 2, 'modulo-3-aula-3.png'),
  (3, 4::smallint, 'Crenças de dinheiro, prosperidade e escassez', 3, 'modulo-3-aula-4.png'),
  (3, 5::smallint, 'Merecimento, culpa, sofrimento e abundância', 4, 'modulo-3-aula-5.png'),
  (3, 6::smallint, 'Relacionamentos, saúde e envelhecimento', 5, 'modulo-3-aula-6.png'),
  (3, 7::smallint, 'A verdade que enfraquece a crença antiga', 6, 'modulo-3-aula-7.png'),
  (4, 1::smallint, 'O que sua oração revela sobre aquilo em que você acredita', 0, 'modulo-4-aula-1.png'),
  (4, 2::smallint, 'Fé, desespero, perseverança e insegurança', 1, 'modulo-4-aula-2.png'),
  (4, 3::smallint, 'Esperar em Deus sem abandonar sua responsabilidade', 2, 'modulo-4-aula-3.png'),
  (4, 4::smallint, 'Sua nova prática de oração', 3, 'modulo-4-aula-4.png'),
  (5, 1::smallint, 'A identidade antiga não precisa continuar governando', 0, 'modulo-5-aula-1.png'),
  (5, 2::smallint, 'Nascer de novo: uma nova forma de pensar e viver', 1, 'modulo-5-aula-2.png'),
  (5, 3::smallint, 'Quem você decidiu se tornar', 2, 'modulo-5-aula-3.png'),
  (5, 4::smallint, 'Autorização interna para receber, crescer e administrar', 3, 'modulo-5-aula-4.png'),
  (5, 5::smallint, 'As primeiras evidências da nova identidade', 4, 'modulo-5-aula-5.png'),
  (6, 1::smallint, 'Seu ambiente repete uma identidade todos os dias', 0, 'modulo-6-aula-1.png'),
  (6, 2::smallint, 'Ambiente físico e emocional', 1, 'modulo-6-aula-2.png'),
  (6, 3::smallint, 'Televisão, notícias e redes sociais', 2, 'modulo-6-aula-3.png'),
  (6, 4::smallint, 'Pessoas, limites e uma rotina que protege a mudança', 3, 'modulo-6-aula-4.png'),
  (7, 1::smallint, 'As três formas do verbo', 0, 'modulo-7-aula-1.png'),
  (7, 2::smallint, 'A linguagem da identidade antiga', 1, 'modulo-7-aula-2.png'),
  (7, 3::smallint, 'Reconhecer sem condenar e afirmar com coerência', 2, 'modulo-7-aula-3.png'),
  (7, 4::smallint, 'O verbo, a oração e o novo diálogo interior', 3, 'modulo-7-aula-4.png'),
  (8, 1::smallint, 'O estado interior participa de suas respostas', 0, 'modulo-8-aula-1.png'),
  (8, 2::smallint, 'Paz, esperança e confiança', 1, 'modulo-8-aula-2.png'),
  (8, 3::smallint, 'Ansiedade e medo sem governo automático', 2, 'modulo-8-aula-3.png'),
  (8, 4::smallint, 'Frustração, culpa e disciplina emocional', 3, 'modulo-8-aula-4.png'),
  (8, 5::smallint, 'Imaginação e visualização do futuro', 4, 'modulo-8-aula-5.png'),
  (9, 1::smallint, 'Fé e responsabilidade caminham juntas', 0, 'modulo-9-aula-1.png'),
  (9, 2::smallint, 'A menor ação coerente e o poder da decisão', 1, 'modulo-9-aula-2.png'),
  (9, 3::smallint, 'Da ação ao hábito que confirma a nova identidade', 2, 'modulo-9-aula-3.png'),
  (9, 4::smallint, 'Ação nas finanças, organização, administração e trabalho', 3, 'modulo-9-aula-4.png'),
  (9, 5::smallint, 'Plano Integrado de Fé em Ação', 4, 'modulo-9-aula-5.png'),
  (10, 1::smallint, 'Consolidar não é terminar', 0, 'modulo-10-aula-1.png'),
  (10, 2::smallint, 'Sinais de retorno à identidade antiga', 1, 'modulo-10-aula-2.png'),
  (10, 3::smallint, 'O Protocolo de Retorno', 2, 'modulo-10-aula-3.png'),
  (10, 4::smallint, 'Seus ciclos de 21, 60 e 90 dias', 3, 'modulo-10-aula-4.png'),
  (10, 5::smallint, 'Administrando as novas bênçãos e seguindo com autonomia', 4, 'modulo-10-aula-5.png')
) as v(modulo_numero, numero, titulo, ordem, capa)
  on m.numero = v.modulo_numero;

-- Uma aula ao vivo por módulo, bloqueada até receber data (LIVE no protótipo).
insert into aulas_ao_vivo (modulo_id, titulo, descricao, liberada)
select m.id,
       'Encontro ao vivo do Módulo ' || m.numero,
       'Uma aula ao vivo dedicada a este módulo: revisão dos pontos centrais, respostas às dúvidas das alunas e orientação prática para aplicar o conteúdo na sua rotina.',
       false
from modulos m;

-- Categorias do acervo de presentes, ainda sem itens.
insert into categorias (titulo, ordem) values
  ('Lançamentos', 0),
  ('Frequências', 1),
  ('Ebooks', 2),
  ('Documentários', 3);
