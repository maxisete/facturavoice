export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          accion: string
          created_at: string | null
          detalle: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string | null
          detalle?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string | null
          detalle?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ciudad: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          nif: string | null
          nombre: string
          telefono: string | null
          user_id: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nif?: string | null
          nombre: string
          telefono?: string | null
          user_id: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nif?: string | null
          nombre?: string
          telefono?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cuentas_eliminadas: {
        Row: {
          email: string
          fecha: string
          id: string
          motivo: string | null
          user_id: string
        }
        Insert: {
          email: string
          fecha?: string
          id?: string
          motivo?: string | null
          user_id: string
        }
        Update: {
          email?: string
          fecha?: string
          id?: string
          motivo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          cliente: Json | null
          condiciones_pago: string | null
          created_at: string | null
          facturado: boolean | null
          fecha: string | null
          id: string
          lineas: Json | null
          notas: string | null
          numero: string
          tipo: string
          totales: Json | null
          user_id: string
        }
        Insert: {
          cliente?: Json | null
          condiciones_pago?: string | null
          created_at?: string | null
          facturado?: boolean | null
          fecha?: string | null
          id?: string
          lineas?: Json | null
          notas?: string | null
          numero: string
          tipo: string
          totales?: Json | null
          user_id: string
        }
        Update: {
          cliente?: Json | null
          condiciones_pago?: string | null
          created_at?: string | null
          facturado?: boolean | null
          fecha?: string | null
          id?: string
          lineas?: Json | null
          notas?: string | null
          numero?: string
          tipo?: string
          totales?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      facturas_proveedor: {
        Row: {
          archivo_url: string | null
          created_at: string | null
          fecha_factura: string | null
          id: string
          lineas: Json | null
          nombre_proveedor: string | null
          numero_factura: string | null
          total: number | null
          user_id: string
        }
        Insert: {
          archivo_url?: string | null
          created_at?: string | null
          fecha_factura?: string | null
          id?: string
          lineas?: Json | null
          nombre_proveedor?: string | null
          numero_factura?: string | null
          total?: number | null
          user_id: string
        }
        Update: {
          archivo_url?: string | null
          created_at?: string | null
          fecha_factura?: string | null
          id?: string
          lineas?: Json | null
          nombre_proveedor?: string | null
          numero_factura?: string | null
          total?: number | null
          user_id?: string
        }
        Relationships: []
      }
      negocios: {
        Row: {
          ciudad: string | null
          color_marca: string | null
          contador_albaran: number | null
          contador_factura: number | null
          contador_presupuesto: number | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          iva_defecto: number | null
          logo_url: string | null
          nif: string | null
          nombre: string | null
          nombre_usuario: string | null
          telefono: string | null
        }
        Insert: {
          ciudad?: string | null
          color_marca?: string | null
          contador_albaran?: number | null
          contador_factura?: number | null
          contador_presupuesto?: number | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id: string
          iva_defecto?: number | null
          logo_url?: string | null
          nif?: string | null
          nombre?: string | null
          nombre_usuario?: string | null
          telefono?: string | null
        }
        Update: {
          ciudad?: string | null
          color_marca?: string | null
          contador_albaran?: number | null
          contador_factura?: number | null
          contador_presupuesto?: number | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          iva_defecto?: number | null
          logo_url?: string | null
          nif?: string | null
          nombre?: string | null
          nombre_usuario?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
