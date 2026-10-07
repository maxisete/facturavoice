-- Numeración de documentos única, correlativa y calculada en la base de datos.
-- Issue #13.
--
-- 1. Valida el formato de los números existentes.
-- 2. Renumera, por orden de creación, las series que tienen duplicados.
-- 3. Añade restricciones de formato y de unicidad en public.documentos.
-- 4. Crea public.numeracion: último número asignado por usuario y serie.
-- 5. Crea siguiente_numero() y fijar_numeracion(), únicas vías de escritura.
-- 6. Conserva los contadores configurados en Ajustes (negocios.contador_*).

-- 1. Validación previa: si algún número no sigue el formato P-2026-001,
--    la migración se detiene entera sin cambiar nada.
do $$
begin
  if exists (
    select 1 from public.documentos
    where numero is null or numero !~ '^[FPA]-[0-9]{4}-[0-9]+$'
  ) then
    raise exception 'Hay documentos con un número de formato inesperado; revisar antes de migrar.';
  end if;
end
$$;

-- 2. Renumeración de las series con duplicados (cuenta de pruebas, sin
--    facturas emitidas). Las series sin duplicados no se tocan.
with series_duplicadas as (
  select distinct
    user_id,
    split_part(numero, '-', 1) || '-' || split_part(numero, '-', 2) as serie
  from public.documentos
  group by user_id, numero
  having count(*) > 1
),
renumerados as (
  select
    d.id,
    s.serie || '-' || lpad(
      n.posicion::text,
      greatest(3, length(n.posicion::text)),
      '0'
    ) as nuevo_numero
  from public.documentos d
  join series_duplicadas s
    on s.user_id = d.user_id
   and s.serie = split_part(d.numero, '-', 1) || '-' || split_part(d.numero, '-', 2)
  cross join lateral (
    select row_number() over (
      partition by d2.user_id, split_part(d2.numero, '-', 1), split_part(d2.numero, '-', 2)
      order by d2.created_at, d2.id
    ) as posicion, d2.id
    from public.documentos d2
    where d2.user_id = d.user_id
      and split_part(d2.numero, '-', 1) || '-' || split_part(d2.numero, '-', 2) = s.serie
  ) n
  where n.id = d.id
)
update public.documentos d
set numero = r.nuevo_numero
from renumerados r
where r.id = d.id
  and d.numero <> r.nuevo_numero;

-- 3. Restricciones en documentos: formato válido y número único por usuario.
alter table public.documentos
  add constraint documentos_numero_formato_check
  check (numero ~ '^[FPA]-[0-9]{4}-[0-9]+$');

alter table public.documentos
  add constraint documentos_user_numero_key
  unique (user_id, numero);

-- 4. Tabla de numeración: una fila por usuario y serie (F-2026, P-2026...).
create table public.numeracion (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  serie      text        not null check (serie ~ '^[FPA]-[0-9]{4}$'),
  ultimo     integer     not null default 0 check (ultimo >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, serie)
);

alter table public.numeracion enable row level security;

-- El usuario solo puede leer su propia numeración. No hay policies de
-- escritura: solo las funciones de abajo pueden modificarla.
create policy numeracion_select_propia
  on public.numeracion
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- GRANT explícitos (necesarios en tablas nuevas desde el 30 oct 2026).
revoke all on public.numeracion from anon, authenticated;
grant select on public.numeracion to authenticated;
grant all on public.numeracion to service_role;

-- 5a. Siguiente número: suma 1 y lo devuelve en una sola operación atómica.
--     Si la serie no existe (primer documento del año), parte del mayor
--     número ya guardado en documentos; si no hay ninguno, empieza en 001.
create or replace function public.siguiente_numero(p_tipo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_prefijo text;
  v_serie   text;
  v_maximo  integer;
  v_numero  integer;
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

  -- El año se toma en hora de España: la serie cambia el 1 de enero a las 00:00.
  v_serie := v_prefijo || '-' || to_char(now() at time zone 'Europe/Madrid', 'YYYY');

  select coalesce(max(split_part(numero, '-', 3)::integer), 0)
    into v_maximo
    from public.documentos
   where user_id = v_usuario
     and numero like v_serie || '-%';

  insert into public.numeracion as n (user_id, serie, ultimo)
  values (v_usuario, v_serie, v_maximo + 1)
  on conflict (user_id, serie) do update
    set ultimo = greatest(n.ultimo, v_maximo) + 1,
        updated_at = now()
  returning ultimo into v_numero;

  return v_serie || '-' || lpad(v_numero::text, greatest(3, length(v_numero::text)), '0');
end;
$$;

-- 5b. Continuar una numeración existente (Ajustes): fija el último número
--     usado en la serie del año en curso. Nunca por debajo de un número ya
--     guardado, para que no se puedan generar duplicados.
create or replace function public.fijar_numeracion(p_tipo text, p_ultimo integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_prefijo text;
  v_serie   text;
  v_maximo  integer;
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
  if p_ultimo is null or p_ultimo < 0 then
    raise exception 'El último número debe ser 0 o mayor.' using errcode = '22023';
  end if;

  v_serie := v_prefijo || '-' || to_char(now() at time zone 'Europe/Madrid', 'YYYY');

  select coalesce(max(split_part(numero, '-', 3)::integer), 0)
    into v_maximo
    from public.documentos
   where user_id = v_usuario
     and numero like v_serie || '-%';

  if p_ultimo < v_maximo then
    raise exception 'El último número (%) no puede ser menor que el del último documento guardado en la serie % (%).',
      p_ultimo, v_serie, v_maximo
      using errcode = '22023';
  end if;

  insert into public.numeracion (user_id, serie, ultimo)
  values (v_usuario, v_serie, p_ultimo)
  on conflict (user_id, serie) do update
    set ultimo = excluded.ultimo,
        updated_at = now();
end;
$$;

-- Permisos de las funciones: solo usuarios autenticados.
revoke all on function public.siguiente_numero(text) from public, anon;
grant execute on function public.siguiente_numero(text) to authenticated, service_role;

revoke all on function public.fijar_numeracion(text, integer) from public, anon;
grant execute on function public.fijar_numeracion(text, integer) to authenticated, service_role;

-- 6. Conservar lo configurado en Ajustes ("Próximo nº"), para la serie del
--    año en curso. siguiente_numero() usará siempre el mayor entre este valor
--    y el último documento guardado.
insert into public.numeracion (user_id, serie, ultimo)
select
  n.id,
  c.prefijo || '-' || to_char(now() at time zone 'Europe/Madrid', 'YYYY'),
  c.proximo - 1
from public.negocios n
cross join lateral (
  values
    ('F', n.contador_factura),
    ('P', n.contador_presupuesto),
    ('A', n.contador_albaran)
) as c (prefijo, proximo)
where c.proximo is not null
  and c.proximo > 1
on conflict (user_id, serie) do nothing;