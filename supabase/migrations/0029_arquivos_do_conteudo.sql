-- ---------------------------------------------------------------------
-- 0029 — Os arquivos do conteúdo universal
-- ---------------------------------------------------------------------
-- As políticas de `materiais` e `audios` reconheciam UMA origem:
-- `aula_materiais`. Um PDF cadastrado em `conteudos` existiria no
-- depósito e não sairia dele para ninguém — e o pior caso não é o erro,
-- é alguém concluir que "não funciona" e deixar o arquivo público para
-- resolver.
--
-- A regra continua a mesma: o arquivo sai porque a liberação DELE
-- passou, não porque o endereço é difícil de adivinhar.
-- `pode_ver_conteudo` devolve a liberação do dono — a aula, o item, a
-- seção ou o produto.
--
-- `capas` fica de fora: é público de propósito, como diz a 0002. A capa
-- aparece antes de qualquer conferência, e é assim que a tela mostra
-- módulo bloqueado com arte e título.
-- ---------------------------------------------------------------------

drop policy if exists materiais_leitura on storage.objects;
create policy materiais_leitura on storage.objects
  for select using (
    bucket_id = 'materiais'
    and (
      eh_admin()
      or exists (
        select 1 from public.aula_materiais m
        where m.arquivo_path = storage.objects.name
          and public.pode_ver_aula(m.aula_id)
      )
      or exists (
        select 1 from public.conteudos k
        where k.arquivo_path = storage.objects.name
          and public.pode_ver_conteudo(k.id)
      )
    )
  );

drop policy if exists audios_leitura on storage.objects;
create policy audios_leitura on storage.objects
  for select using (
    bucket_id = 'audios'
    and (
      eh_admin()
      or exists (
        select 1 from public.aula_materiais m
        where m.arquivo_path = storage.objects.name
          and public.pode_ver_aula(m.aula_id)
      )
      or exists (
        select 1 from public.conteudos k
        where k.arquivo_path = storage.objects.name
          and public.pode_ver_conteudo(k.id)
      )
    )
  );
