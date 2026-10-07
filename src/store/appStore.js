import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// La numeración de documentos ya no vive aquí: la asigna la base de datos
// (funciones siguiente_numero y fijar_numeracion, issue #13).
export const useAppStore = create(
  persist(
    (set) => ({
      // Datos del negocio
      negocio: null,
      setNegocio: (negocio) => set({ negocio }),

      // Clientes
      clientes: [],
      addCliente: (cliente) => set(s => ({ clientes: [...s.clientes, cliente] })),
      setClientes: (clientes) => set({ clientes }),

      // Plantilla PDF
      plantillaPDF: 'clasica',
      setPlantillaPDF: (plantilla) => set({ plantillaPDF: plantilla }),

      // Tema visual de la app
      tema: 'ochentera',
      setTema: (tema) => set({ tema }),

      // Modo oscuro
      modoOscuro: false,
      toggleModoOscuro: () => set(s => ({ modoOscuro: !s.modoOscuro })),
    }),
    {
      name: 'facturavoice-storage',
      partialize: (state) => ({
        negocio: state.negocio,
        clientes: state.clientes,
        modoOscuro: state.modoOscuro,
        plantillaPDF: state.plantillaPDF,
        tema: state.tema,
      })
    }
  )
)