# Arquitectura Supabase de FacturaVoice

Estado verificado el 5 de septiembre de 2026 contra el proyecto de producción FacturaVoice. Actualizado el 7 de octubre de 2026 con la numeración de documentos (issue #13).

## Plataforma

- Región: `eu-north-1`
- PostgreSQL: 17
- PostgREST reflejado en los tipos: 14.5
- Edge Functions desplegadas: ninguna
- Funciones propias en `public`: `siguiente_numero`, `consultar_siguiente_numero` y `fijar_numeracion` (ver «Numeración de documentos»), y la función de trigger `proteger_documentos_cerrados` (ver «Documentos cerrados»)
- Vistas propias en `public`: ninguna
- Migraciones registradas:
  - `20260905092534_baseline_and_harden_facturavoice`
  - `20261007122600_numeracion_documentos`
  - `20261007130500_consultar_numeracion`
  - `20261008081500_proteger_documentos_cerrados`

El identificador del proyecto y las credenciales no se guardan en este documento. La aplicación obtiene la URL y las claves desde variables de entorno.

## Tablas

| Tabla | Propietario lógico | Acceso desde cliente | Borrado de usuario |
| --- | --- | --- | --- |
| `negocios` | `id = auth.uid()` | SELECT, INSERT, UPDATE | CASCADE |
| `clientes` | `user_id = auth.uid()` | SELECT, INSERT, UPDATE, DELETE | CASCADE |
| `documentos` | `user_id = auth.uid()` | SELECT, INSERT, UPDATE | CASCADE |
| `facturas_proveedor` | `user_id = auth.uid()` | SELECT, INSERT, UPDATE | CASCADE |
| `auditoria` | `user_id = auth.uid()` | SELECT, INSERT | CASCADE |
| `numeracion` | `user_id = auth.uid()` | SELECT (la escritura solo es posible mediante funciones) | CASCADE |
| `cuentas_eliminadas` | acceso interno | ninguno | conserva el registro histórico |

Todas las tablas tienen RLS activo. Las políticas se limitan al rol `authenticated`, comparan con `(select auth.uid())` y las políticas de actualización comprueban tanto la fila actual como la resultante.

`anon` no tiene privilegios sobre estas tablas. `cuentas_eliminadas` no tiene policies de cliente de forma intencionada; la API de servidor usa su clave privada para insertar el registro antes de eliminar una cuenta.

## Numeración de documentos

La numeración la asigna la base de datos. Nunca se calcula en el navegador, porque cada dispositivo tendría su propio contador.

- **Serie**: prefijo y año, por ejemplo `F-2026`, `P-2026` o `A-2026`. El año se toma en hora de España (`Europe/Madrid`), así que la numeración se reinicia automáticamente a 001 cada 1 de enero sin repetir números.
- **`numeracion`**: guarda, por usuario y serie, el último número asignado. Tiene RLS con solo lectura para su propietario; no hay policies de escritura.
- **`siguiente_numero(tipo)`**: suma 1 y devuelve el número en una sola operación atómica (`insert … on conflict do update … returning`), por lo que dos peticiones simultáneas nunca reciben el mismo. Si la serie no existe, parte del mayor número ya guardado en `documentos`.
- **`consultar_siguiente_numero(tipo)`**: devuelve el próximo número sin asignarlo (`stable`). La usa la pantalla de Ajustes.
- **`fijar_numeracion(tipo, ultimo)`**: permite continuar una numeración que el usuario trae de otro programa. Rechaza cualquier valor menor que el último número guardado en la serie.
- Las tres funciones son `security definer` con `search_path = ''`, usan `auth.uid()` para operar solo sobre el usuario que llama y solo pueden ejecutarlas `authenticated` y `service_role`.

Restricciones en `documentos`:

- `documentos_numero_formato_check`: el número debe tener el formato `F-2026-001`.
- `documentos_user_numero_key`: el número es único por usuario.

La migración `20261007122600_numeracion_documentos` renumeró por orden de creación las series que tenían números duplicados. Era aceptable porque la cuenta afectada es de pruebas y no hay facturas emitidas; con datos reales no lo sería. Las columnas `negocios.contador_*` quedan como históricas: la migración trasladó su valor a `numeracion` y la aplicación ya no las usa.

## Documentos cerrados

Las facturas y los albaranes ya facturados no se pueden modificar. El trigger `documentos_proteger_cerrados` (`BEFORE UPDATE` sobre `documentos`) rechaza cualquier cambio en esas filas con el error `42501`, también si la petición llega directamente a la API. Las facturas emitidas se corrigen con una factura rectificativa. Los albaranes sin facturar sí pueden cambiar, incluido el paso de `facturado` a `true` al agruparlos en una factura.

La edición de presupuestos y de albaranes sin facturar se guarda con el botón **GUARDAR** de `DocumentPage.jsx`, que actualiza solo `lineas`, `totales` y `notas`, y registra `editar_documento` en `auditoria`.

## Índices de acceso por usuario

- `idx_clientes_user_created_at`
- `idx_documentos_user_tipo_created_at`
- `idx_facturas_proveedor_user_created_at`
- `idx_auditoria_user_created_at`

Los cuatro cubren las claves foráneas y las consultas habituales filtradas por usuario y ordenadas por fecha. El índice de documentos también incluye `tipo`. La restricción única `documentos_user_numero_key` y la clave primaria de `numeracion` (`user_id`, `serie`) aportan además sus propios índices.

## Storage

| Bucket | Exposición | Límite | MIME | Ruta obligatoria |
| --- | --- | --- | --- | --- |
| `logos` | público para lectura | 5 MiB | PNG, JPEG, WEBP | `<user_id>/...` |
| `facturas-proveedor` | privado | 10 MiB | PDF, PNG, JPEG, WEBP | `<user_id>/...` |

Los logos son activos de marca destinados a aparecer en documentos y se sirven mediante URL pública. INSERT, SELECT y UPDATE de objetos siguen aislados por la primera carpeta, que debe coincidir con `auth.uid()`.

Las facturas de proveedor son privadas. La columna histórica `archivo_url` almacena la ruta del objeto, no una URL pública. Si se añade una descarga, debe generarse una URL firmada de corta duración después de comprobar la sesión.

## Código relacionado

- `src/lib/supabase.js`: cliente web con URL y clave pública de entorno.
- `src/lib/numeracion.js`: llamadas a las funciones de numeración. Lo usan `DictatePage.jsx`, `DocumentosPage.jsx` y `DocumentPage.jsx` al crear documentos, y `AjustesPage.jsx` para consultar y fijar la numeración.
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
- Security Advisor marca `siguiente_numero`, `consultar_siguiente_numero` y `fijar_numeracion` como funciones `SECURITY DEFINER` ejecutables por usuarios autenticados. Es intencionado: son la única vía de escritura en `numeracion`, que no tiene policies de escritura. Las tres fijan `search_path = ''`, operan solo sobre `auth.uid()`, validan sus parámetros y `anon` no puede ejecutarlas. Pasarlas a `SECURITY INVOKER` obligaría a abrir policies de escritura en `numeracion` y permitiría modificarla directamente desde la API, saltándose la validación.
- Performance Advisor puede marcar inicialmente los cuatro índices como no utilizados hasta que exista tráfico suficiente.