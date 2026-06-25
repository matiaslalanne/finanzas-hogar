import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useTiposIngreso } from '../hooks/useTiposIngreso'
import { supabase } from '../lib/supabase'
import { displayMonto, fechaHoy, handleMontoKey, parseMonto } from '../lib/formatters'
import NumericKeypad from '../components/ui/NumericKeypad'

const PERSONAS = [
  { id: 'mati', emoji: '👨', label: 'Mati' },
  { id: 'sofi', emoji: '👩', label: 'Sofi' },
  { id: 'hogar', emoji: '🏠', label: 'Hogar' },
]

export default function CargarIngreso() {
  const navigate = useNavigate()
  const { persona } = useAuth()
  const { showToast } = useToast()
  const { tipos } = useTiposIngreso()

  const [montoRaw, setMontoRaw] = useState('0')
  const [tipoIngreso, setTipoIngreso] = useState(null)
  const [moneda, setMoneda] = useState('ARS')
  const [personaIngreso, setPersonaIngreso] = useState(persona)
  const [fecha, setFecha] = useState(fechaHoy)
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)

  const handleKey = (key) => setMontoRaw((prev) => handleMontoKey(prev, key))

  const handleTipo = (tipo) => {
    setTipoIngreso((prev) => (prev === tipo.nombre ? null : tipo.nombre))
    setMoneda(tipo.moneda_default)
  }

  const resetForm = () => {
    setMontoRaw('0')
    setTipoIngreso(null)
    setDescripcion('')
  }

  const handleGuardar = async () => {
    const monto = parseMonto(montoRaw)
    if (monto <= 0) return showToast('Ingresá un monto', 'error')
    if (!tipoIngreso) return showToast('Elegí un tipo de ingreso', 'error')

    setGuardando(true)

    const { error } = await supabase.from('ingresos').insert({
      fecha,
      monto,
      moneda,
      tipo_ingreso: tipoIngreso,
      persona: personaIngreso,
      descripcion: descripcion.trim() || null,
    })

    if (error) {
      showToast('Error al guardar. Intentá de nuevo.', 'error')
    } else {
      showToast('¡Ingreso guardado!')
      resetForm()
    }

    setGuardando(false)
  }

  const monto = parseMonto(montoRaw)
  const puedeGuardar = monto > 0 && tipoIngreso && !guardando

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-200 active:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 font-semibold text-slate-100">Nuevo ingreso</h1>
        <button
          onClick={() => setMoneda((m) => (m === 'ARS' ? 'USD' : 'ARS'))}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors ${
            moneda === 'USD'
              ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {moneda}
        </button>
      </header>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto pb-[350px]">

        {/* Monto */}
        <div className="text-center py-5 px-4">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
            {moneda === 'ARS' ? 'Pesos argentinos' : 'Dólares'}
          </div>
          <div className="text-5xl font-bold text-emerald-400 tracking-tight tabular-nums">
            <span className="text-emerald-700 text-3xl mr-1">
              {moneda === 'ARS' ? '$' : 'U$D'}
            </span>
            {displayMonto(montoRaw)}
          </div>
        </div>

        {/* Tipo de ingreso */}
        <section className="px-4 mb-5">
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Tipo de ingreso
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {tipos.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTipo(t)}
                className={`py-3.5 px-4 rounded-xl text-sm font-medium transition-all active:scale-95 text-left flex items-center justify-between ${
                  tipoIngreso === t.nombre
                    ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{t.nombre}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  t.moneda_default === 'USD'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-700 text-slate-500'
                }`}>
                  {t.moneda_default}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Persona */}
        <section className="px-4 mb-5">
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
            ¿A quién corresponde?
          </h2>
          <div className="flex gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersonaIngreso(p.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  personaIngreso === p.id
                    ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Fecha y descripción */}
        <section className="px-4 flex gap-2 mb-4">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
          />
        </section>
        <div className="px-4">
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción (opcional)"
            maxLength={200}
            className="w-full px-4 py-2.5 bg-slate-800 rounded-xl text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Teclado + botón guardar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur border-t border-slate-800">
        <NumericKeypad onKey={handleKey} />
        <div className="px-3 pt-1 pb-8">
          <button
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-30 text-slate-900 font-bold text-base rounded-2xl transition-colors"
          >
            {guardando ? 'Guardando…' : 'Guardar ingreso'}
          </button>
        </div>
      </div>
    </div>
  )
}
