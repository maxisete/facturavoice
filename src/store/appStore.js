import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Datos del negocio
      negocio: null,
      setNegocio: (negocio) => set({ negocio }),

      setContadores: (contadores) => set({ contadores }),

      // Clientes
      clientes: [],
      addCliente: (cliente) => set(s => ({ clientes: [...s.clientes, cliente] })),

      // Modo oscuro
      modoOscuro: false,
      toggleModoOscuro: () => set(s => ({ modoOscuro: !s.modoOscuro })),

      // Numeración automática de documentos
      contadores: {},
      getSiguienteNumero: (tipo) => {
        const año = new Date().getFullYear()
        const prefijo = tipo === 'factura' ? 'F' : tipo === 'presupuesto' ? 'P' : 'A'
        const clave = `${prefijo}-${año}`
        const negocio = get().negocio
        const campoContador = `contador_${tipo === 'albaran' ? 'albaran' : tipo}`
        const actual = get().contadores[clave] ?? (negocio?.[campoContador] ? negocio[campoContador] - 1 : 0)
        const siguiente = actual + 1
        return `${clave}-${String(siguiente).padStart(3, '0')}`
      },
      incrementarContador: (tipo) => {
        const año = new Date().getFullYear()
        const prefijo = tipo === 'factura' ? 'F' : tipo === 'presupuesto' ? 'P' : 'A'
        const clave = `${prefijo}-${año}`
        set(s => ({
          contadores: {
            ...s.contadores,
            [clave]: (s.contadores[clave] || 0) + 1
          }
        }))
      }
    }),
    {
      name: 'facturavoice-storage',
      partialize: (state) => ({
        negocio: state.negocio,
        clientes: state.clientes,
        modoOscuro: state.modoOscuro,
        contadores: state.contadores,
      })
    }
  )
)