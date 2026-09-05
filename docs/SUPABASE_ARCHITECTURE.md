# Arquitectura Supabase de FacturaVoice

Estado verificado el 5 de septiembre de 2026 contra el proyecto de producción FacturaVoice.

## Plataforma

- Región: `eu-north-1`
- PostgreSQL: 17
- PostgREST reflejado en los tipos: 14.5
- Edge Functions desplegadas: ninguna
- Vistas o funciones propias en `public`: ninguna
- Migración base registrada: `20260905092534_baseline_and_harden_facturavoice`

El identificador del proyecto y las credenciales no se guardan en este documento. La aplicación obtiene la URL y las claves desde variables de entorno.

## Tablas

| Tabla | Propietario lógico | Acceso desde cliente | Borrado de usuario |
| --- | --- | --- | --- |
| `negocios` | `id = auth.uid()` | SELECT, INSERT, UPDATE | CASCADE |
| `clientes` | `user_id = auth.uid()` | SELECT, INSERT, UPDATE, DELETE | CASCADE |
| `documentos` | `user_id = auth.uid()` | SELECT, INSERT, UPDATE | CASCADE |
| `facturas_proveedor` | `user_id = auth.uid()` | SELECT, INSERT, UPDATE | CASCADE |
| `auditoria` | `user_id = auth.uid()` | SELECT, INSERT | CASCADE |
| `cuentas_eliminadas` | acceso interno | ninguno | conserva el registro histórico |

Todas las tablas tienen RLS activo. Las políticas se limitan al rol `authenticated`, comparan con `(select auth.uid())` y las políticas de actualización comprueban tanto la fila actual como la resultante.

`anon` no tiene privilegios sobre estas tablas. `cuentas_eliminadas` no tiene policies de cliente de forma intencionada; la API de servidor usa su clave privada para insertar el registro antes de eliminar una cuenta.

## Índices de acceso por usuario

- `idx_clientes_user_created_at`
- `idx_documentos_user_tipo_created_at`
- `idx_facturas_proveedor_user_created_at`
- `idx_auditoria_user_created_at`

Los cuatro cubren las claves foráneas y las consultas habituales filtradas por usuario y ordenadas por fecha. El índice de documentos también incluye `tipo`.

## Storage

| Bucket | Exposición | Límite | MIME | Ruta obligatoria |
| --- | --- | --- | --- | --- |
| `logos` | público para lectura | 5 MiB | PNG, JPEG, WEBP | `<user_id>/...` |
| `facturas-proveedor` | privado | 10 MiB | PDF, PNG, JPEG, WEBP | `<user_id>/...` |

Los logos son activos de marca destinados a aparecer en documentos y se sirven mediante URL pública. INSERT, SELECT y UPDATE de objetos siguen aislados por la primera carpeta, que debe coincidir con `auth.uid()`.

Las facturas de proveedor son privadas. La columna histórica `archivo_url` almacena la ruta del objeto, no una URL pública. Si se añade una descarga, debe generarse una URL firmada de corta duración después de comprobar la sesión.

## Código relacionado

- `src/lib/supabase.js`: cliente web con URL y clave pública de entorno.
- `api/eliminar-cuenta.js`: cliente de servidor con `SUPABASE_SERVICE_ROLE_KEY`; valida primero el token del usuario.
- `src/pages/ComprasPage.jsx`: subida al bucket privado y persistencia de la ruta.
- `src/pages/EmpresaPage.jsx`: subida y reemplazo del logo.
- `src/types/database.types.ts`: tipos generados desde producción.

No debe importarse `SUPABASE_SERVICE_ROLE_KEY` desde `src/` ni exponerse con un prefijo `VITE_`.

## Procedimiento de cambios

1. Revisar `git status`, cambios locales y la rama remota.
2. Crear una migración pequeña y descriptiva en `supabase/migrations/`.
3. Probar la migración en una rama o base local cuando esté disponible.
4. Aplicar la migración remota de forma atómica.
5. Verificar tablas, constraints, índices, grants y policies.
6. Regenerar `src/types/database.types.ts` cuando cambie el esquema público.
7. Revisar consultas y Storage en frontend, API y Edge Functions.
8. Ejecutar lint, build, auditoría de dependencias y búsqueda de secretos.
9. Ejecutar Security Advisors y Performance Advisors.
10. Revisar el diff, confirmar los commits y hacer push sin reescribir historial.

## Hallazgos pendientes

- La protección de Supabase Auth frente a contraseñas filtradas está desactivada. Debe habilitarse desde la configuración de Auth; no forma parte de una migración SQL.
- Security Advisor marca `cuentas_eliminadas` por tener RLS sin policies. Es un cierre deliberado y documentado, no una tabla olvidada.
- Performance Advisor puede marcar inicialmente los cuatro índices como no utilizados hasta que exista tráfico suficiente.
