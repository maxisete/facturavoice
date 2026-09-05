# FacturaVoice

Aplicación de facturación desarrollada con React y Vite. Usa Supabase para autenticación, PostgreSQL, Row Level Security y almacenamiento, y se despliega en Vercel.

## Desarrollo

1. Copia `.env.example` como `.env.local`.
2. Completa sólo las variables necesarias en tu entorno local.
3. Instala y ejecuta:

```bash
npm ci
npm run dev
```

Nunca confirmes archivos `.env`, claves privadas, `service_role`, tokens ni credenciales de terceros.

## Supabase

- Configuración local: `supabase/config.toml`
- Migraciones: `supabase/migrations/`
- Tipos generados: `src/types/database.types.ts`
- Arquitectura y procedimiento: `docs/SUPABASE_ARCHITECTURE.md`

El esquema remoto y el repositorio deben cambiar juntos. Todo cambio de tablas, constraints, índices, RLS, Storage o funciones debe quedar en una migración revisada antes de desplegarse.

## Comprobaciones

```bash
npm run lint
npm run build
npm audit --audit-level=high
```

Después de cualquier migración remota se deben revisar los Security Advisors y Performance Advisors de Supabase.
