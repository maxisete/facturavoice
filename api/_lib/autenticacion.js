import { createClient } from '@supabase/supabase-js'

// Cliente con la clave PÚBLICA: para validar una sesión no hace falta la
// clave de administrador (principio de mínimo privilegio).
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Devuelve el usuario que hace la petición, o null si no hay sesión válida.
// La app envía el token en la cabecera: Authorization: Bearer <token>.
export async function obtenerUsuario(req) {
  const cabecera = req.headers.authorization
  if (!cabecera?.startsWith('Bearer ')) return null
  const token = cabecera.slice('Bearer '.length)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}