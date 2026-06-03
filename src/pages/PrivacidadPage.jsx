import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function PrivacidadPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-void">
      <header className="px-5 py-3 flex items-center gap-3 sticky top-0 z-10"
        style={{ borderBottom: '1px solid rgba(0,245,255,0.15)', background: 'rgba(10,10,15,0.98)' }}
      >
        <button onClick={() => navigate(-1)} className="text-neon-cyan">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-orbitron font-bold text-white neon-cyan text-sm">POLÍTICA DE PRIVACIDAD</h1>
      </header>

      <div className="px-5 py-6 max-w-lg mx-auto space-y-6 text-sm font-mono">

        <p className="text-gray-600 text-xs">Última actualización: 3 de junio de 2026</p>

        <section>
          <h2 className="text-neon-cyan font-orbitron text-xs tracking-widest mb-3">// 1. RESPONSABLE DEL TRATAMIENTO</h2>
          <p className="text-gray-400 leading-relaxed">El responsable del tratamiento de sus datos es el titular de FacturaVoice. Para cualquier consulta relacionada con sus datos personales puede contactar en <span className="text-neon-cyan">maxisete@gmail.com</span>.</p>
        </section>

        <section>
          <h2 className="text-neon-cyan font-orbitron text-xs tracking-widest mb-3">// 2. DATOS QUE RECOPILAMOS</h2>
          <p className="text-gray-400 leading-relaxed mb-2">Recopilamos los siguientes datos:</p>
          <ul className="space-y-1 text-gray-500">
            <li>• Email y contraseña cifrada (registro)</li>
            <li>• Datos de su negocio (nombre, NIF, dirección, teléfono)</li>
            <li>• Datos de sus clientes (nombre, NIF, contacto)</li>
            <li>• Contenido de documentos (presupuestos, facturas, albaranes)</li>
            <li>• Dirección IP con fines de seguridad (caducidad: 15 minutos)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-neon-cyan font-orbitron text-xs tracking-widest mb-3">// 3. FINALIDAD Y BASE JURÍDICA</h2>
          <p className="text-gray-400 leading-relaxed">Tratamos sus datos para prestar el servicio de generación de documentos fiscales (Art. 6.1.b RGPD), garantizar la seguridad (Art. 6.1.f RGPD) y responder a solicitudes de soporte (Art. 6.1.a RGPD — consentimiento).</p>
        </section>

        <section>
          <h2 className="text-neon-cyan font-orbitron text-xs tracking-widest mb-3">// 4. PROVEEDORES DE SERVICIO</h2>
          <p className="text-gray-400 leading-relaxed mb-2">Sus datos pueden ser procesados por los siguientes proveedores, todos con transferencia amparada por Cláusulas Contractuales Tipo:</p>
          <ul className="space-y-1 text-gray-500">
            <li>• <span className="text-white">Supabase</span> — Base de datos y autenticación (servidor en UE)</li>
            <li>• <span className="text-white">Vercel</span> — Alojamiento de la aplicación</li>
            <li>• <span className="text-white">Groq</span> — Procesamiento de voz mediante IA</li>
            <li>• <span className="text-white">Resend</span> — Envío de emails transaccionales</li>
            <li>• <span className="text-white">Upstash</span> — Control de seguridad (servidor en UE)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-neon-cyan font-orbitron text-xs tracking-widest mb-3">// 5. CONSERVACIÓN</h2>
          <p className="text-gray-400 leading-relaxed">Conservamos sus datos mientras mantenga su cuenta activa y durante los 5 años posteriores a su cancelación, en cumplimiento de las obligaciones fiscales vigentes.</p>
        </section>

        <section>
          <h2 className="text-neon-cyan font-orbitron text-xs tracking-widest mb-3">// 6. SUS DERECHOS</h2>
          <p className="text-gray-400 leading-relaxed mb-2">Puede ejercer sus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición contactando en <span className="text-neon-cyan">maxisete@gmail.com</span>. Si considera que el tratamiento no se ajusta a la normativa, puede reclamar ante la <span className="text-white">AEPD (www.aepd.es)</span>.</p>
        </section>

        <section>
          <h2 className="text-neon-cyan font-orbitron text-xs tracking-widest mb-3">// 7. SEGURIDAD</h2>
          <p className="text-gray-400 leading-relaxed">Implementamos cifrado HTTPS/TLS, contraseñas con hash bcrypt, control de acceso por filas (RLS), rate limiting y cabeceras de seguridad HTTP.</p>
        </section>

        <section>
          <h2 className="text-neon-cyan font-orbitron text-xs tracking-widest mb-3">// 8. COOKIES</h2>
          <p className="text-gray-400 leading-relaxed">Solo utilizamos cookies técnicas estrictamente necesarias para la gestión de sesión. No usamos cookies de seguimiento ni publicidad.</p>
        </section>

        <div className="pt-4" style={{ borderTop: '1px solid rgba(0,245,255,0.1)' }}>
          <p className="text-gray-700 text-xs">FacturaVoice — https://facturavoice.vercel.app</p>
        </div>
      </div>
    </div>
  )
}