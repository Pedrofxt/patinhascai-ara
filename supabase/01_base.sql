-- =====================================================================
-- Patinhas Caiçara — esquema do banco (Supabase / Postgres)
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- =====================================================================

-- ---------- Perfis (1 por usuário do Supabase Auth) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  cidade      text,
  telefone    text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, cidade)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'cidade'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Anúncios de doação ----------
create table public.anuncios (
  id          uuid primary key default gen_random_uuid(),
  doador_id   uuid not null references public.profiles(id) on delete cascade,
  nome        text not null,
  especie     text not null check (especie in ('cachorro','gato','outro')),
  sexo        text not null check (sexo in ('macho','femea')),
  idade       text,                       -- livre: "4 meses", "2 anos"
  porte       text not null check (porte in ('pequeno','medio','grande')),
  cidade      text not null check (cidade in (
                'Antonina','Guaraqueçaba','Guaratuba','Matinhos',
                'Morretes','Paranaguá','Pontal do Paraná')),
  descricao   text,
  vacinado    boolean not null default false,
  castrado    boolean not null default false,
  fotos       text[] not null default '{}',
  status      text not null default 'disponivel'
                check (status in ('disponivel','reservado','adotado')),
  created_at  timestamptz not null default now()
);
create index anuncios_status_idx on public.anuncios (status, created_at desc);
create index anuncios_doador_idx on public.anuncios (doador_id);

-- ---------- Conversas (1 por anúncio + interessado) ----------
create table public.conversas (
  id              uuid primary key default gen_random_uuid(),
  anuncio_id      uuid not null references public.anuncios(id) on delete cascade,
  doador_id       uuid not null references public.profiles(id) on delete cascade,
  interessado_id  uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (anuncio_id, interessado_id),
  check (doador_id <> interessado_id)
);
create index conversas_doador_idx on public.conversas (doador_id);
create index conversas_interessado_idx on public.conversas (interessado_id);

-- ---------- Mensagens ----------
create table public.mensagens (
  id           uuid primary key default gen_random_uuid(),
  conversa_id  uuid not null references public.conversas(id) on delete cascade,
  autor_id     uuid not null references public.profiles(id) on delete cascade,
  texto        text not null check (char_length(texto) between 1 and 2000),
  lida         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index mensagens_conversa_idx on public.mensagens (conversa_id, created_at);

-- =====================================================================
-- Segurança (Row Level Security)
-- =====================================================================
alter table public.profiles  enable row level security;
alter table public.anuncios  enable row level security;
alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;

-- Perfis: qualquer um vê o nome/cidade; só o dono edita
create policy "perfis visíveis" on public.profiles
  for select using (true);
create policy "dono edita perfil" on public.profiles
  for update using ((select auth.uid()) = id);

-- Anúncios: vitrine pública; só o doador cria/edita/apaga os seus
create policy "anúncios visíveis" on public.anuncios
  for select using (true);
create policy "doador cria anúncio" on public.anuncios
  for insert to authenticated with check ((select auth.uid()) = doador_id);
create policy "doador edita anúncio" on public.anuncios
  for update to authenticated using ((select auth.uid()) = doador_id);
create policy "doador apaga anúncio" on public.anuncios
  for delete to authenticated using ((select auth.uid()) = doador_id);

-- Conversas: só os dois participantes enxergam;
-- quem abre é o interessado, e o doador precisa ser o dono do anúncio
create policy "participantes veem conversa" on public.conversas
  for select to authenticated
  using ((select auth.uid()) in (doador_id, interessado_id));
create policy "interessado abre conversa" on public.conversas
  for insert to authenticated
  with check (
    (select auth.uid()) = interessado_id
    and doador_id = (select a.doador_id from public.anuncios a where a.id = anuncio_id)
  );

-- Mensagens: só participantes leem e escrevem
create policy "participantes leem mensagens" on public.mensagens
  for select to authenticated
  using (exists (
    select 1 from public.conversas c
    where c.id = conversa_id
      and (select auth.uid()) in (c.doador_id, c.interessado_id)
  ));
create policy "participantes enviam mensagens" on public.mensagens
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and exists (
      select 1 from public.conversas c
      where c.id = conversa_id
        and (select auth.uid()) in (c.doador_id, c.interessado_id)
    )
  );

-- Chat em tempo real
alter publication supabase_realtime add table public.mensagens;

-- =====================================================================
-- Storage: fotos dos animais
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('fotos-animais', 'fotos-animais', true)
on conflict (id) do nothing;

-- Cada usuário só envia/apaga dentro da própria pasta: <uid>/arquivo.jpg
create policy "usuário envia fotos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-animais'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "usuário apaga fotos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos-animais'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
