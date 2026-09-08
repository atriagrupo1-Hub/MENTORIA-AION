-- =====================================================================
-- Depósitos de arquivos (Supabase Storage)
--
-- capas     — público. A capa não tem valor isolado e aparece em tela
--             antes de qualquer conferência de liberação.
-- materiais — restrito. PDFs e e-books, entregues por link assinado.
-- audios    — restrito. Mesma regra dos materiais.
--
-- O banco guarda apenas o caminho relativo (`capa_path`,
-- `arquivo_path`), nunca a URL completa — item (J) do modelo.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('capas', 'capas', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('materiais', 'materiais', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('audios', 'audios', false)
on conflict (id) do nothing;

-- CAPAS ---------------------------------------------------------------
-- Leitura livre; escrita só da administradora.
create policy capas_leitura on storage.objects
  for select using (bucket_id = 'capas');

create policy capas_escrita on storage.objects
  for insert with check (bucket_id = 'capas' and eh_admin());

create policy capas_atualiza on storage.objects
  for update using (bucket_id = 'capas' and eh_admin())
          with check (bucket_id = 'capas' and eh_admin());

create policy capas_remove on storage.objects
  for delete using (bucket_id = 'capas' and eh_admin());

-- MATERIAIS -----------------------------------------------------------
-- A aluna só alcança o arquivo se ele estiver cadastrado em
-- `aula_materiais` e a aula estiver liberada para ela. É essa permissão
-- que o link assinado carrega — esconder o endereço não é segurança.
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
    )
  );

create policy materiais_escrita on storage.objects
  for insert with check (bucket_id = 'materiais' and eh_admin());

create policy materiais_atualiza on storage.objects
  for update using (bucket_id = 'materiais' and eh_admin())
          with check (bucket_id = 'materiais' and eh_admin());

create policy materiais_remove on storage.objects
  for delete using (bucket_id = 'materiais' and eh_admin());

-- ÁUDIOS --------------------------------------------------------------
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
    )
  );

create policy audios_escrita on storage.objects
  for insert with check (bucket_id = 'audios' and eh_admin());

create policy audios_atualiza on storage.objects
  for update using (bucket_id = 'audios' and eh_admin())
          with check (bucket_id = 'audios' and eh_admin());

create policy audios_remove on storage.objects
  for delete using (bucket_id = 'audios' and eh_admin());
