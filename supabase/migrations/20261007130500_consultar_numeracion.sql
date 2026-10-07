-- Consulta del próximo número de una serie SIN asignarlo. Issue #13.
-- La usa la pantalla de Ajustes para mostrar el número real que se asignará.
create or replace function public.consultar_siguiente_numero(p_tipo text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_prefijo text;
  v_serie   text;
  v_maximo  integer;
  v_ultimo  integer;
begin
  if v_usuario is null then
    raise exception 'Usuario no autenticado.' using errcode = '42501';
  end if;

  v_prefijo := case p_tipo
    when 'factura'     then 'F'
    when 'presupuesto' then 'P'
    when 'albaran'     then 'A'
  end;
  if v_prefijo is null then
    raise exception 'Tipo de documento no válido: %', p_tipo using errcode = '22023';
  end if;

  v_serie := v_prefijo || '-' || to_char(now() at time zone 'Europe/Madrid', 'YYYY');

  select coalesce(max(split_part(numero, '-', 3)::integer), 0)
    into v_maximo
    from public.documentos
   where user_id = v_usuario
     and numero like v_serie || '-%';

  select ultimo
    into v_ultimo
    from public.numeracion
   where user_id = v_usuario
     and serie = v_serie;

  -- Misma regla que siguiente_numero(): el mayor entre lo configurado y lo usado.
  return greatest(coalesce(v_ultimo, 0), v_maximo) + 1;
end;
$$;

revoke all on function public.consultar_siguiente_numero(text) from public, anon;
grant execute on function public.consultar_siguiente_numero(text) to authenticated, service_role;