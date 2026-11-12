-- =====================================================================
-- Patinhas Caiçara — Área de perfil
-- Rode DEPOIS do 01_base.sql e do 02_microchipagem.sql.
-- =====================================================================

-- ---------- Novos campos do perfil ----------
alter table public.profiles
  add column if not exists bio            text check (char_length(bio) <= 300),
  add column if not exists avatar_preset  text not null default 'cachorro'
    check (avatar_preset in ('cachorro','gato','papagaio','tartaruga','caranguejo','peixe')),
  add column if not exists tema           text not null default 'claro' check (tema in ('claro','escuro')),
  add column if not exists updated_at     timestamptz not null default now();

create or replace function public.perfil_antes_update()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists perfil_antes_update on public.profiles;
create trigger perfil_antes_update before update on public.profiles
  for each row execute function public.perfil_antes_update();

-- ---------- Privacidade: telefone e preferências só para o dono ----------
-- Todos veem nome, cidade, foto, avatar e bio. O resto só pela função meu_perfil().
revoke select, update on public.profiles from anon, authenticated;
grant select (id, nome, cidade, avatar_url, avatar_preset, bio, created_at)
  on public.profiles to anon, authenticated;
grant update (nome, cidade, telefone, bio, avatar_url, avatar_preset, tema)
  on public.profiles to authenticated;

create or replace function public.meu_perfil()
returns table (
  id uuid, nome text, cidade text, telefone text, bio text,
  avatar_url text, avatar_preset text, tema text, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nome, p.cidade, p.telefone, p.bio, p.avatar_url, p.avatar_preset, p.tema, p.created_at
    from public.profiles p
   where p.id = auth.uid();
$$;
revoke execute on function public.meu_perfil() from public, anon;
grant  execute on function public.meu_perfil() to authenticated;

-- ---------- Excluir a própria conta ----------
-- Apaga o usuário do Auth. Em cascata somem perfil, anúncios, conversas e mensagens.
-- Os microchips no nome dele também são apagados.
-- (As fotos no Storage são removidas pelo site antes de chamar esta função.)
create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Você precisa estar logado.'; end if;
  delete from public.microchips where tutor_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;
revoke execute on function public.excluir_minha_conta() from public, anon;
grant  execute on function public.excluir_minha_conta() to authenticated;

-- ---------- Storage: fotos de perfil ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "usuário envia foto de perfil" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "usuário apaga foto de perfil" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Listar os próprios arquivos (usado para limpar fotos antigas e ao excluir a conta)
create policy "usuário lista os próprios arquivos" on storage.objects
  for select to authenticated
  using (bucket_id in ('avatares','fotos-animais')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
