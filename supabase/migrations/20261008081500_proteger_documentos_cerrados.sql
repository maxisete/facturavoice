-- Documentos cerrados: facturas y albaranes ya facturados no se pueden
-- modificar. Issue #14.
--
-- Una factura emitida no debe cambiar: para corregirla se emite una factura
-- rectificativa. Hasta ahora solo lo impedía la pantalla (soloLectura); con
-- este trigger lo garantiza la base de datos, también ante llamadas directas
-- a la API.

create or replace function public.proteger_documentos_cerrados()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.tipo = 'factura' or (old.tipo = 'albaran' and coalesce(old.facturado, false)))
     and new is distinct from old then
    raise exception 'El documento % está cerrado y no se puede modificar.', old.numero
      using errcode = '42501',
            hint = 'Las facturas emitidas se corrigen con una factura rectificativa.';
  end if;
  return new;
end;
$$;

-- Es una función de trigger: nadie debe poder ejecutarla directamente.
revoke all on function public.proteger_documentos_cerrados() from public, anon, authenticated;

create trigger documentos_proteger_cerrados
  before update on public.documentos
  for each row
  execute function public.proteger_documentos_cerrados();