-- =====================================================================
-- Patinhas Caiçara — Cadastro de microchipagem
-- Rode DEPOIS do 01_base.sql (SQL Editor do Supabase → Run).
-- =====================================================================

-- Selo "Microchipado" na vitrine (mantido automaticamente por gatilho)
alter table public.anuncios add column if not exists microchipado boolean not null default false;

-- ---------- Microchips ----------
create table public.microchips (
  id              uuid primary key default gen_random_uuid(),
  numero          text not null unique check (numero ~ '^[0-9]{15}$'),  -- padrão ISO 11784/11785 (15 dígitos)
  tutor_id        uuid references public.profiles(id) on delete set null, -- responsável atual
  anuncio_id      uuid references public.anuncios(id) on delete set null, -- anúncio de doação vinculado (opcional)
  nome_animal     text not null,
  especie         text not null check (especie in ('cachorro','gato','outro')),
  sexo            text check (sexo in ('macho','femea')),
  pelagem         text,                      -- cor / marcas
  nascimento      text,                      -- livre: "03/2023", "aprox. 2 anos"
  cidade          text check (cidade in (
                    'Antonina','Guaraqueçaba','Guaratuba','Matinhos',
                    'Morretes','Paranaguá','Pontal do Paraná')),
  data_implante   date,
  local_implante  text,                      -- clínica, mutirão, ONG
  veterinario     text,
  crmv            text,
  observacoes     text,
  situacao        text not null default 'ativo'
                    check (situacao in ('ativo','perdido','falecido')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index microchips_tutor_idx   on public.microchips (tutor_id);
create index microchips_anuncio_idx on public.microchips (anuncio_id);

-- ---------- Histórico de cada microchip ----------
create table public.microchip_eventos (
  id            uuid primary key default gen_random_uuid(),
  microchip_id  uuid not null references public.microchips(id) on delete cascade,
  tipo          text not null check (tipo in
                  ('cadastro','atualizacao','transferencia','perdido','reencontrado','falecido','avistado')),
  autor_id      uuid references public.profiles(id) on delete set null,
  de_tutor      uuid references public.profiles(id) on delete set null,
  para_tutor    uuid references public.profiles(id) on delete set null,
  mensagem      text,
  created_at    timestamptz not null default now()
);
create index microchip_eventos_chip_idx on public.microchip_eventos (microchip_id, created_at desc);

-- =====================================================================
-- Gatilhos: histórico automático + selo no anúncio
-- =====================================================================
create or replace function public.sincronizar_selo_microchip(p_anuncio uuid)
returns void language sql security definer set search_path = '' as $$
  update public.anuncios a
     set microchipado = exists (select 1 from public.microchips m where m.anuncio_id = a.id)
   where a.id = p_anuncio;
$$;

create or replace function public.microchip_antes_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.numero <> old.numero then
    raise exception 'O número do microchip não pode ser alterado.';
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.microchip_apos_mudanca()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.microchip_eventos (microchip_id, tipo, autor_id, para_tutor)
    values (new.id, 'cadastro', auth.uid(), new.tutor_id);
    perform public.sincronizar_selo_microchip(new.anuncio_id);

  elsif tg_op = 'UPDATE' then
    if new.situacao <> old.situacao then
      insert into public.microchip_eventos (microchip_id, tipo, autor_id)
      values (new.id,
              case when new.situacao = 'ativo' then 'reencontrado' else new.situacao end,
              auth.uid());
    elsif new.tutor_id is not distinct from old.tutor_id then
      -- mudança de tutor é registrada pela função concluir_adocao
      insert into public.microchip_eventos (microchip_id, tipo, autor_id)
      values (new.id, 'atualizacao', auth.uid());
    end if;
    if new.anuncio_id is distinct from old.anuncio_id then
      perform public.sincronizar_selo_microchip(old.anuncio_id);
      perform public.sincronizar_selo_microchip(new.anuncio_id);
    end if;

  elsif tg_op = 'DELETE' then
    perform public.sincronizar_selo_microchip(old.anuncio_id);
  end if;
  return null;
end $$;

create trigger microchip_antes_update before update on public.microchips
  for each row execute function public.microchip_antes_update();
create trigger microchip_apos_mudanca after insert or update or delete on public.microchips
  for each row execute function public.microchip_apos_mudanca();

-- =====================================================================
-- Segurança (RLS)
-- =====================================================================
alter table public.microchips        enable row level security;
alter table public.microchip_eventos enable row level security;

-- Só o tutor atual vê e edita o cadastro completo.
-- A consulta pública passa pela função consultar_microchip (dados limitados).
create policy "tutor vê seus microchips" on public.microchips
  for select to authenticated using ((select auth.uid()) = tutor_id);

create policy "tutor cadastra microchip" on public.microchips
  for insert to authenticated
  with check (
    (select auth.uid()) = tutor_id
    and (anuncio_id is null or exists (
      select 1 from public.anuncios a where a.id = anuncio_id and a.doador_id = (select auth.uid())))
  );

-- O tutor não pode passar o chip para outra pessoa por UPDATE direto
-- (a transferência é feita só pela função concluir_adocao)
create policy "tutor edita microchip" on public.microchips
  for update to authenticated
  using ((select auth.uid()) = tutor_id)
  with check (
    (select auth.uid()) = tutor_id
    and (anuncio_id is null or exists (
      select 1 from public.anuncios a where a.id = anuncio_id and a.doador_id = (select auth.uid())))
  );

create policy "tutor apaga microchip" on public.microchips
  for delete to authenticated using ((select auth.uid()) = tutor_id);

-- Histórico: o tutor atual vê tudo do animal; quem avisou vê o próprio aviso
create policy "ver histórico do microchip" on public.microchip_eventos
  for select to authenticated
  using (
    autor_id = (select auth.uid())
    or exists (select 1 from public.microchips m
               where m.id = microchip_id and m.tutor_id = (select auth.uid()))
  );
-- (sem política de insert: eventos só entram por gatilhos e funções abaixo)

-- =====================================================================
-- Funções (RPC) chamadas pelo site
-- =====================================================================

-- Consulta pública por número: mostra só o necessário para devolver o animal
create or replace function public.consultar_microchip(p_numero text)
returns table (
  nome_animal text, especie text, sexo text, pelagem text, cidade text,
  situacao text, tutor_nome text, data_implante date, anuncio_id uuid, id uuid
)
language sql stable security definer set search_path = '' as $$
  select m.nome_animal, m.especie, m.sexo, m.pelagem, m.cidade, m.situacao,
         split_part(p.nome, ' ', 1), m.data_implante, m.anuncio_id,
         case when m.tutor_id = auth.uid() then m.id end   -- id só para o próprio tutor
    from public.microchips m
    left join public.profiles p on p.id = m.tutor_id
   where m.numero = regexp_replace(p_numero, '\D', '', 'g');
$$;
revoke execute on function public.consultar_microchip(text) from public;
grant  execute on function public.consultar_microchip(text) to anon, authenticated;

-- Quem encontrou/avistou o animal deixa um recado para o tutor
create or replace function public.avisar_tutor(p_numero text, p_mensagem text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para avisar o tutor.'; end if;
  if coalesce(trim(p_mensagem), '') = '' then raise exception 'Escreva onde e quando você viu o animal.'; end if;
  select id into v_id from public.microchips where numero = regexp_replace(p_numero, '\D', '', 'g');
  if v_id is null then raise exception 'Microchip não encontrado.'; end if;
  insert into public.microchip_eventos (microchip_id, tipo, autor_id, mensagem)
  values (v_id, 'avistado', auth.uid(), left(trim(p_mensagem), 1000));
end $$;
revoke execute on function public.avisar_tutor(text, text) from public, anon;
grant  execute on function public.avisar_tutor(text, text) to authenticated;

-- Doador conclui a adoção pela conversa: anúncio vira "adotado" e
-- os microchips vinculados passam para o adotante, com registro no histórico
create or replace function public.concluir_adocao(p_conversa uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare c public.conversas; n integer := 0;
begin
  select * into c from public.conversas where id = p_conversa;
  if c.id is null or c.doador_id <> auth.uid() then
    raise exception 'Só o doador pode concluir esta adoção.';
  end if;

  update public.anuncios set status = 'adotado' where id = c.anuncio_id;

  with transferidos as (
    update public.microchips
       set tutor_id = c.interessado_id, anuncio_id = null
     where anuncio_id = c.anuncio_id and tutor_id = auth.uid()
    returning id
  )
  insert into public.microchip_eventos (microchip_id, tipo, autor_id, de_tutor, para_tutor, mensagem)
  select id, 'transferencia', auth.uid(), auth.uid(), c.interessado_id, 'Adoção concluída pelo Patinhas Caiçara'
    from transferidos;
  get diagnostics n = row_count;

  insert into public.mensagens (conversa_id, autor_id, texto)
  values (p_conversa, auth.uid(),
          '🎉 Adoção concluída!' || case when n > 0
            then ' O microchip agora está no seu nome — confira em "Microchip".' else '' end);
  return n;
end $$;
revoke execute on function public.concluir_adocao(uuid) from public, anon;
grant  execute on function public.concluir_adocao(uuid) to authenticated;
