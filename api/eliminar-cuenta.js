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
    await supabaseAdmin.from('cuentas_eliminadas').insert({
      email,
      user_id: userId,
      motivo: 'Eliminación solicitada por el usuario desde Ajustes',
    })

    const { error: err1 } = await supabaseAdmin.from('documentos').delete().eq('user_id', userId)
    if (err1) console.error('Error borrando documentos:', err1)

    const { error: err2 } = await supabaseAdmin.from('facturas_proveedor').delete().eq('user_id', userId)
    if (err2) console.error('Error borrando facturas_proveedor:', err2)

    const { error: err3 } = await supabaseAdmin.from('clientes').delete().eq('user_id', userId)
    if (err3) console.error('Error borrando clientes:', err3)

    const { error: err4 } = await supabaseAdmin.from('negocios').delete().eq('id', userId)
    if (err4) console.error('Error borrando negocios:', err4)

    const { error: err5 } = await supabaseAdmin.from('auditoria').delete().eq('user_id', userId)
    if (err5) console.error('Error borrando auditoria:', err5)

    const { error: errDelete } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (errDelete) throw errDelete

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Error eliminando cuenta:', err)
    return res.status(500).json({ error: 'Error al eliminar la cuenta' })
  }
}