import { supabase } from './supabase'

export async function registrarAccion(accion, detalle = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('auditoria').insert({
      user_id: user.id,
      accion,
      detalle
    })
  } catch {
    // silencioso — la auditoría nunca debe romper el flujo principal
  }
}