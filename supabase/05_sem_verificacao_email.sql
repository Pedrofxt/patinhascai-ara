-- =====================================================================
-- Patinhas Caiçara — Cadastro sem verificação por e-mail
-- Rode depois do 04_ajustes_seguranca.sql.
-- A conta já nasce confirmada: o Supabase não envia o e-mail de
-- confirmação e a pessoa entra no site assim que cria a conta.
-- Para voltar a exigir confirmação, apague o gatilho:
--   drop trigger confirmar_email_automatico on auth.users;
-- =====================================================================
create or replace function public.confirmar_email_automatico()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end $$;
revoke execute on function public.confirmar_email_automatico() from public, anon, authenticated;

drop trigger if exists confirmar_email_automatico on auth.users;
create trigger confirmar_email_automatico
  before insert on auth.users
  for each row execute function public.confirmar_email_automatico();
