-- =====================================================================
-- Patinhas Caiçara — Ajustes de segurança (rode depois do 03_perfil.sql)
-- Funções internas (gatilhos e auxiliares) não devem ser chamadas pela API.
-- =====================================================================
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.microchip_apos_mudanca() from public, anon, authenticated;
revoke execute on function public.microchip_antes_update() from public, anon, authenticated;
revoke execute on function public.perfil_antes_update() from public, anon, authenticated;
revoke execute on function public.sincronizar_selo_microchip(uuid) from public, anon, authenticated;
