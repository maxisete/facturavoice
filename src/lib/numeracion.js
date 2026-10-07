import { supabase } from './supabase'

// Pide a la base de datos el siguiente número de la serie del año en curso.
// La función SQL lo asigna de forma atómica: nunca se repite, aunque se pida
// desde varios dispositivos a la vez.
export async function obtenerSiguienteNumero(tipo) {
  const { data, error } = await supabase.rpc('siguiente_numero', { p_tipo: tipo })
  if (error) throw error
  return data
}

// Consulta el próximo número de la serie del año en curso, sin asignarlo.
export async function consultarSiguienteNumero(tipo) {
  const { data, error } = await supabase.rpc('consultar_siguiente_numero', { p_tipo: tipo })
  if (error) throw error
  return data
}

// Continuar una numeración existente: fija el último número usado en la serie.
// La base de datos rechaza cualquier valor menor que un número ya guardado.
export async function fijarNumeracion(tipo, ultimo) {
  const { error } = await supabase.rpc('fijar_numeracion', { p_tipo: tipo, p_ultimo: ultimo })
  if (error) throw error
}