# Informe técnico — Fase 11: sincronización Supabase y GitHub

Fecha de ejecución: 5 de septiembre de 2026

Repositorio: `maxisete/facturavoice`

Rama de trabajo: `codex/fase-11-supabase-sync`
Commit técnico publicado: `5a141d44` (`feat(supabase): sincronizar esquema, seguridad y documentación`)

Commit de normalización: `8c257e3` (`chore(git): normalizar finales de linea del cambio`)

## Estado inicial

El repositorio remoto sólo contenía la aplicación React/Vite y tres funciones de servidor Vercel. No existían `supabase/config.toml`, migraciones, tipos generados ni documentación del esquema.

El proyecto Supabase FacturaVoice estaba activo en `eu-north-1`, con PostgreSQL 17.6. La base de datos sí contenía seis tablas de aplicación, RLS y dos buckets, pero el historial remoto indicaba cero migraciones. Tampoco había Edge Functions desplegadas.

Los Advisors iniciales devolvieron:

- Security: 2 hallazgos; protección frente a contraseñas filtradas desactivada y una tabla con RLS sin policies.
- Performance: 56 hallazgos; 4 claves foráneas sin índice, 17 evaluaciones de `auth.uid()` por fila y 35 combinaciones de policies permisivas duplicadas.

## Cambios en Supabase

Se aplicó de forma atómica la migración `20260905092534_baseline_and_harden_facturavoice`.

### Esquema e integridad

- Se registró como código el esquema actual de `negocios`, `clientes`, `documentos`, `facturas_proveedor`, `auditoria` y `cuentas_eliminadas`.
- Todas las relaciones de datos de usuario hacia `auth.users(id)` quedaron con `ON DELETE CASCADE`.
- `cuentas_eliminadas.user_id` se mantiene sin clave foránea para conservar el registro de la solicitud después de eliminar al usuario.
- No se eliminaron tablas, usuarios, archivos ni filas reales.

### RLS y permisos

- Se eliminaron las policies `ALL` duplicadas de `negocios` y `clientes`.
- Todas las policies de aplicación se limitaron a `authenticated`.
- Todas las comparaciones de identidad usan `(select auth.uid())`.
- Las policies UPDATE incluyen `USING` y `WITH CHECK`.
- Se retiraron todos los privilegios de tabla de `anon`.
- `cuentas_eliminadas` conserva RLS sin policy de cliente. Sólo la API de servidor dispone de INSERT y SELECT mediante `service_role`.

### Rendimiento

Se añadieron índices que cubren las claves foráneas y los accesos habituales:

- `idx_clientes_user_created_at`
- `idx_documentos_user_tipo_created_at`
- `idx_facturas_proveedor_user_created_at`
- `idx_auditoria_user_created_at`

### Storage

- `logos`: público para lectura, 5 MiB, PNG/JPEG/WEBP y escritura aislada por carpeta de usuario.
- `facturas-proveedor`: privado, 10 MiB, PDF/PNG/JPEG/WEBP y lectura/subida aislada por carpeta de usuario.
- Se añadió la policy UPDATE que necesita el `upsert` del logo.
- La aplicación guarda ahora la ruta del objeto privado de la factura, no una URL pública.

## Cambios en GitHub

| Cambio | Motivo | Componente | Archivo | Comprobación | Resultado | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Migración base y hardening | Versionar producción y corregir RLS/rendimiento | PostgreSQL, RLS, Storage | `supabase/migrations/20260905092534_baseline_and_harden_facturavoice.sql` | Aplicación atómica e inspección posterior | Correcto | `5a141d44` |
| Configuración local | Fijar PostgreSQL 17 y servicios locales sin secretos | Supabase CLI | `supabase/config.toml` | Parseo TOML | Correcto | `5a141d44` |
| Tipos generados | Reflejar las seis tablas de producción | TypeScript | `src/types/database.types.ts` | Generación desde Supabase | Correcto | `5a141d44` |
| Ruta de factura privada | Evitar guardar una URL pública para un bucket privado | Frontend y Storage | `src/pages/ComprasPage.jsx` | Build y validación de MIME/tamaño | Correcto | `5a141d44` |
| Dependencias vulnerables | Corregir ocho avisos, incluido PDF.js | Cadena de suministro | `package-lock.json` | `npm ci` y `npm audit` | 0 vulnerabilidades | `5a141d44` |
| CI de seguridad | Impedir que un fallo alto quede ignorado | GitHub Actions | `.github/workflows/security.yml` | Revisión del workflow | Correcto | `5a141d44` |
| Protección de secretos | Ignorar variantes `.env` y documentar nombres de variables | Git y configuración | `.gitignore`, `.env.example` | Búsqueda de literales secretos | Sin secretos | `5a141d44` |
| Documentación | Describir arquitectura y procedimiento futuro | Documentación | `README.md`, `docs/SUPABASE_ARCHITECTURE.md` | Revisión de diff | Correcto | `5a141d44` |

## Verificaciones realizadas

### Base de datos

- La migración se validó primero dentro de una transacción revertida.
- La aplicación remota finalizó correctamente y creó el registro de migración.
- Se inspeccionaron de nuevo constraints, índices, grants, policies y buckets.
- Una prueba RLS transaccional permitió INSERT y UPDATE del propietario, bloqueó la reasignación de `user_id` a otro usuario y se revirtió.
- Se comprobó que `anon` no tiene SELECT y que `authenticated` no puede leer `cuentas_eliminadas`.

### Aplicación y dependencias

- `npm ci`: correcto y reproducible desde el lockfile.
- `npm run build`: correcto con Vite 8.1.3.
- Arranque de la compilación con `vite preview`: HTTP 200 y elemento raíz presente.
- `npm audit --audit-level=high`: 0 vulnerabilidades.
- `git diff --check`: correcto.
- Búsqueda de secretos y credenciales literales: sin coincidencias.

### Lint

`npm run lint` sigue fallando con 22 errores y 5 avisos preexistentes en distintos archivos. Incluyen configuración de entorno Node para `api/`, variables sin uso y reglas nuevas de React Hooks. No se corrigieron en esta fase para evitar mezclar una refactorización amplia con la sincronización de Supabase. El build de producción sí finaliza correctamente.

## Advisors finales

### Security Advisors

Persisten dos avisos conocidos:

1. `auth_leaked_password_protection` — WARN. La protección frente a contraseñas filtradas está desactivada. La organización se verificó en plan `free` y Supabase sólo ofrece esta función integrada en Pro o superior. No es una migración SQL y no se intentó forzar su activación.
2. `rls_enabled_no_policy` — INFO. Afecta a `cuentas_eliminadas` y representa el cierre deliberado de la tabla frente a clientes.

Referencia: <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>

### Performance Advisors

Los 56 avisos iniciales quedaron reducidos a 4 avisos INFO `unused_index`. Son esperables inmediatamente después de crear los índices y deben revisarse cuando exista una muestra de tráfico suficiente. Ya no aparecen claves foráneas sin índice, `auth_rls_initplan` ni policies permisivas múltiples.

## Seguridad de secretos

El repositorio contiene nombres de variables, nunca valores. `SUPABASE_SERVICE_ROLE_KEY` sólo se usa en `api/eliminar-cuenta.js`, código de servidor. El frontend sólo usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, cuya exposición es intencionada y queda protegida por RLS.

Se revisaron expresamente patrones de `service_role`, JWT, secretos de Supabase, Vercel, Resend, Upstash, contraseñas, tokens y archivos `.env`. No se detectaron credenciales confirmadas.

## Estado de sincronización

El esquema, RLS, Storage, índices y permisos aplicados a Supabase están representados por la migración remota y por el mismo archivo en Git. Los tipos se generaron desde el esquema resultante. No existen Edge Functions que sincronizar.

La protección frente a contraseñas filtradas se cierra como limitación aceptada del plan Free. El Advisor seguirá mostrando el aviso mientras no se actualice el plan. La deuda de lint ya existente permanece registrada por separado.
