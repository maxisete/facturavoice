-- FacturaVoice production schema baseline and RLS hardening.
-- Safe to run on the existing project: no user data is modified.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.negocios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  nif text,
  direccion text,
  ciudad text,
  telefono text,
  email text,
  iva_defecto numeric default 21,
  color_marca text default '#FF5C39',
  contador_presupuesto integer default 1,
  contador_factura integer default 1,
  contador_albaran integer default 1,
  created_at timestamptz default now(),
  nombre_usuario text,
  logo_url text
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  nif text,
  telefono text,
  email text,
  direccion text,
  ciudad text,
  created_at timestamptz default now()
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  numero text not null,
  cliente jsonb,
  lineas jsonb default '[]'::jsonb,
  totales jsonb,
  fecha timestamptz default now(),
  notas text,
  condiciones_pago text,
  created_at timestamptz default now(),
  facturado boolean default false
);

create table if not exists public.facturas_proveedor (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre_proveedor text,
  numero_factura text,
  fecha_factura text,
  lineas jsonb,
  total numeric,
  archivo_url text,
  created_at timestamptz default now()
);

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  accion text not null,
  detalle jsonb,
  created_at timestamptz default now()
);

create table if not exists public.cuentas_eliminadas (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid not null,
  fecha timestamptz not null default now(),
  motivo text default 'Eliminación solicitada por el usuario'
);

alter table public.facturas_proveedor
  drop constraint if exists facturas_proveedor_user_id_fkey;
alter table public.facturas_proveedor
  add constraint facturas_proveedor_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.auditoria
  drop constraint if exists auditoria_user_id_fkey;
alter table public.auditoria
  add constraint auditoria_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists idx_clientes_user_created_at
  on public.clientes (user_id, created_at desc);
create index if not exists idx_documentos_user_tipo_created_at
  on public.documentos (user_id, tipo, created_at desc);
create index if not exists idx_facturas_proveedor_user_created_at
  on public.facturas_proveedor (user_id, created_at desc);
create index if not exists idx_auditoria_user_created_at
  on public.auditoria (user_id, created_at desc);

alter table public.negocios enable row level security;
alter table public.clientes enable row level security;
alter table public.documentos enable row level security;
alter table public.facturas_proveedor enable row level security;
alter table public.auditoria enable row level security;
alter table public.cuentas_eliminadas enable row level security;

drop policy if exists "Usuario ve su negocio" on public.negocios;
drop policy if exists negocios_select on public.negocios;
drop policy if exists negocios_insert on public.negocios;
drop policy if exists negocios_update on public.negocios;
create policy negocios_select on public.negocios for select to authenticated
  using ((select auth.uid()) = id);
create policy negocios_insert on public.negocios for insert to authenticated
  with check ((select auth.uid()) = id);
create policy negocios_update on public.negocios for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Usuario ve sus clientes" on public.clientes;
drop policy if exists clientes_select on public.clientes;
drop policy if exists clientes_insert on public.clientes;
drop policy if exists clientes_update on public.clientes;
drop policy if exists clientes_delete on public.clientes;
create policy clientes_select on public.clientes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy clientes_insert on public.clientes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy clientes_update on public.clientes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy clientes_delete on public.clientes for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists documentos_select on public.documentos;
drop policy if exists documentos_insert on public.documentos;
drop policy if exists documentos_update on public.documentos;
create policy documentos_select on public.documentos for select to authenticated
  using ((select auth.uid()) = user_id);
create policy documentos_insert on public.documentos for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy documentos_update on public.documentos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists fp_select on public.facturas_proveedor;
drop policy if exists fp_insert on public.facturas_proveedor;
drop policy if exists fp_update on public.facturas_proveedor;
create policy fp_select on public.facturas_proveedor for select to authenticated
  using ((select auth.uid()) = user_id);
create policy fp_insert on public.facturas_proveedor for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy fp_update on public.facturas_proveedor for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists auditoria_select on public.auditoria;
drop policy if exists auditoria_insert on public.auditoria;
create policy auditoria_select on public.auditoria for select to authenticated
  using ((select auth.uid()) = user_id);
create policy auditoria_insert on public.auditoria for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all privileges on table
  public.negocios,
  public.clientes,
  public.documentos,
  public.facturas_proveedor,
  public.auditoria,
  public.cuentas_eliminadas
from anon, authenticated;

grant select, insert, update on public.negocios to authenticated;
grant select, insert, update, delete on public.clientes to authenticated;
grant select, insert, update on public.documentos to authenticated;
grant select, insert, update on public.facturas_proveedor to authenticated;
grant select, insert on public.auditoria to authenticated;

grant select, delete on public.negocios to service_role;
grant select, delete on public.clientes to service_role;
grant select, delete on public.documentos to service_role;
grant select, delete on public.facturas_proveedor to service_role;
grant select, delete on public.auditoria to service_role;
grant select, insert on public.cuentas_eliminadas to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('logos', 'logos', true, 5242880, array['image/png','image/jpeg','image/webp']),
  ('facturas-proveedor', 'facturas-proveedor', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "usuarios pueden subir su logo 1peuqw_0" on storage.objects;
drop policy if exists "usuarios pueden ver su logo" on storage.objects;
drop policy if exists "usuarios pueden actualizar su logo" on storage.objects;
drop policy if exists "usuarios pueden subir sus facturas" on storage.objects;
drop policy if exists "usuarios pueden ver sus facturas" on storage.objects;

create policy "usuarios pueden subir su logo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "usuarios pueden ver su logo"
  on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "usuarios pueden actualizar su logo"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "usuarios pueden subir sus facturas"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'facturas-proveedor' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "usuarios pueden ver sus facturas"
  on storage.objects for select to authenticated
  using (bucket_id = 'facturas-proveedor' and (storage.foldername(name))[1] = (select auth.uid())::text);

comment on table public.cuentas_eliminadas is
  'Registro interno de solicitudes de borrado. Sin acceso desde anon o authenticated.';
comment on column public.facturas_proveedor.archivo_url is
  'Ruta del objeto dentro del bucket privado facturas-proveedor; no debe almacenar una URL publica.';
