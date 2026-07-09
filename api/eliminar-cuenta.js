import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token de autenticación' })
  }
  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error: errUser } = await supabaseAdmin.auth.getUser(token)
  if (errUser || !user) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const userId = user.id
  const email = user.email

  try {
    // 0. Registrar el borrado ANTES de tocar nada (por si algo falla a mitad)
    await supabaseAdmin.from('cuentas_eliminadas').insert({
      email,
      user_id: userId,
      motivo: 'Eliminación solicitada por el usuario desde Ajustes',
    })

    // 1. Borrar documentos del usuario
    await supabaseAdmin.from('documentos').delete().eq('user_id', userId)

    // 2. Borrar facturas de proveedor
    await supabaseAdmin.from('facturas_proveedor').delete().eq('user_id', userId)

    // 3. Borrar clientes del usuario
    await supabaseAdmin.from('clientes').delete().eq('user_id', userId)

    // 4. Borrar datos de negocio
    await supabaseAdmin.from('negocios').delete().eq('id', userId)

    // 5. Borrar el log de auditoría del usuario (ya tenemos el registro mínimo en cuentas_eliminadas)
    await supabaseAdmin.from('auditoria').delete().eq('user_id', userId)

    // 6. Borrar el usuario de Auth (esto invalida su sesión y credenciales)
    const { error: errDelete } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (errDelete) throw errDelete

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Error eliminando cuenta:', err)
    return res.status(500).json({ error: 'Error al eliminar la cuenta' })
  }
}