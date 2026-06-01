export function calcularTotales(lineas) {
  const subtotal = lineas.reduce((acc, linea) => {
    return acc + (linea.quantity || 0) * (linea.unit_price || 0)
  }, 0)

  const desgloseIva = {}
  lineas.forEach(linea => {
    const tipo = linea.vat_rate || 21
    const base = (linea.quantity || 0) * (linea.unit_price || 0)
    if (!desgloseIva[tipo]) desgloseIva[tipo] = { base: 0, cuota: 0 }
    desgloseIva[tipo].base += base
    desgloseIva[tipo].cuota += base * (tipo / 100)
  })

  const totalIva = Object.values(desgloseIva).reduce((acc, v) => acc + v.cuota, 0)
  const total = subtotal + totalIva

  return {
    subtotal: redondear(subtotal),
    desgloseIva: Object.entries(desgloseIva).map(([tipo, v]) => ({
      tipo: Number(tipo),
      base: redondear(v.base),
      cuota: redondear(v.cuota),
    })),
    totalIva: redondear(totalIva),
    total: redondear(total),
  }
}

function redondear(n) {
  return Math.round(n * 100) / 100
}

export function formatearEuros(cantidad) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(cantidad)
}

export function formatearFecha(fecha) {
  return new Intl.DateTimeFormat('es-ES').format(
    fecha instanceof Date ? fecha : new Date(fecha)
  )
}

export function crearDocumentoVacio(tipo, cliente, numero) {
  const hoy = new Date()
  return {
    id: crypto.randomUUID(),
    tipo,
    numero,
    cliente,
    lineas: [],
    fecha: hoy.toISOString(),
    fecha_vencimiento: null,
    condiciones_pago: null,
    notas: null,
    mostrar_logo: true,
    estado: 'borrador',
    totales: { subtotal: 0, desgloseIva: [], totalIva: 0, total: 0 },
  }
}