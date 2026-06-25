import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useRubros } from '../hooks/useRubros'
import { useMediosPago } from '../hooks/useMediosPago'
import { supabase } from '../lib/supabase'
import { displayMonto, fechaHoy, handleMontoKey, parseMonto } from '../lib/formatters'
import NumericKeypad from '../components/ui/NumericKeypad'
import { enqueue } from '../lib/offlineQueue'

export default function CargarGasto() {
  const navigate = useNavigate()
  const { persona } = useAuth()
  const { showToast } = useToast()
  const { rubros } = useRubros()
  const { mediosPago } = useMediosPago()

  const [montoRaw, setMontoRaw] = useState('0')
  const [rubro, setRubro] = useState(null)
  const [medioPagoId, setMedioPagoId] = useState(null)
  const [moneda, setMoneda] = useState('ARS')
  const [personaGasto, setPersonaGasto] = useState(persona)
  const [fecha, setFecha] = useState(fechaHoy)
  const [descripcion, setDescripcion] = useState('')
  const [foto, setFoto] = useState(null) // { file, previewUrl }
  const [guardando, setGuardando] = useState(false)
  const fotoInputRef = useRef(null)

  const sortedMedios = useMemo(() => {
    return [...mediosPago].sort((a, b) => {
      const score = (m) =>
        m.titular === personaGasto ? 0 : m.titular === 'hogar' ? 1 : 2
      return score(a) - score(b)
    })
  }, [mediosPago, personaGasto])

  const handleKey = (key) => setMontoRaw((prev) => handleMontoKey(prev, key))

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (foto?.previewUrl) URL.revokeObjectURL(foto.previewUrl)
    setFoto({ file, previewUrl: URL.createObjectURL(file) })
  }

  const removeFoto = () => {
    if (foto?.previewUrl) URL.revokeObjectURL(foto.previewUrl)
    setFoto(null)
    if (fotoInputRef.current) fotoInputRef.current.value = ''
  }

  const resetForm = () => {
    setMontoRaw('0')
    setRubro(null)
    setDescripcion('')
    if (foto?.previewUrl) URL.revokeObjectURL(foto.previewUrl)
    setFoto(null)
    if (fotoInputRef.current) fotoInputRef.current.value = ''
  }

  const handleGuardar = async () => {
    const monto = parseMonto(montoRaw)
    if (monto <= 0) return showToast('Ingresá un monto', 'error')
    if (!rubro) return showToast('Elegí un rubro', 'error')

    setGuardando(true)

    if (!navigator.onLine) {
      enqueue({
        fecha,
        monto,
        moneda,
        rubro,
        medio_pago_id: medioPagoId ?? null,
        persona: personaGasto,
        descripcion: descripcion.trim() || null,
        foto_url: null,
        origen: 'manual',
      })
      showToast('Sin conexión — gasto guardado localmente')
      resetForm()
      setGuardando(false)
      return
    }

    let foto_url = null
    if (foto?.file) {
      const ext = foto.file.name.split('.').pop()
      const { data: upload } = await supabase.storage
        .from('tickets')
        .upload(`${Date.now()}.${ext}`, foto.file, { contentType: foto.file.type })
      if (upload) foto_url = upload.path
    }

    const { error } = await supabase.from('gastos').insert({
      fecha,
      monto,
      moneda,
      rubro,
      medio_pago_id: medioPagoId ?? null,
      persona: personaGasto,
      descripcion: descripcion.trim() || null,
      foto_url,
      origen: 'manual',
    })

    if (error) {
      showToast('Error al guardar. Intentá de nuevo.', 'error')
    } else {
      showToast('¡Gasto guardado!')
      resetForm()
    }

    setGuardando(false)
  }

  const monto = parseMonto(montoRaw)
  const puedeGuardar = monto > 0 && rubro && !guardando

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-200 active:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 font-semibold text-slate-100">Nuevo gasto</h1>
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
        <button
          onClick={() => navigate('/cargar/ingreso')}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors pl-1"
        >
          Ingreso →
        </button>
      </header>

      {/* Contenido scrollable — padding-bottom para que no tape el teclado fijo */}
      <div className="flex-1 overflow-y-auto pb-[350px]">

        {/* Monto */}
        <div className="text-center py-5 px-4">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
            {moneda === 'ARS' ? 'Pesos argentinos' : 'Dólares'}
          </div>
          <div className="text-5xl font-bold text-slate-100 tracking-tight tabular-nums">
            <span className="text-slate-500 text-3xl mr-1">
              {moneda === 'ARS' ? '$' : 'U$D'}
            </span>
            {displayMonto(montoRaw)}
          </div>
        </div>

        {/* Rubro */}
        <section className="px-4 mb-5">
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Rubro
          </h2>
          <div className="grid grid-cols-4 gap-1.5">
            {rubros.map((r) => (
              <button
                key={r.id}
                onClick={() => setRubro((prev) => (prev === r.nombre ? null : r.nombre))}
                className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all active:scale-95 ${
                  rubro === r.nombre
                    ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <span className="text-2xl leading-none">{r.icono}</span>
                <span
                  className={`text-[9px] mt-1.5 text-center leading-tight font-medium line-clamp-2 w-full ${
                    rubro === r.nombre ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {r.nombre}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Medio de pago */}
        <section className="mb-5">
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 px-4">
            Medio de pago
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 px-4 scrollbar-none">
            {sortedMedios.map((m) => (
              <button
                key={m.id}
                onClick={() => setMedioPagoId((prev) => (prev === m.id ? null : m.id))}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  medioPagoId === m.id
                    ? 'bg-emerald-500 text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        </section>

        {/* Extras: persona · fecha · foto */}
        <section className="px-4 flex items-center gap-2 mb-4">
          {/* Persona toggle */}
          <button
            onClick={() =>
              setPersonaGasto((p) => (p === 'mati' ? 'sofi' : 'mati'))
            }
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <span className="text-base leading-none">
              {personaGasto === 'sofi' ? '👩' : '👨'}
            </span>
            <span className="text-sm capitalize text-slate-300 font-medium">
              {personaGasto}
            </span>
          </button>

          {/* Fecha */}
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 bg-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
          />

          {/* Foto ticket */}
          {foto ? (
            <div className="relative flex-shrink-0">
              <img
                src={foto.previewUrl}
                alt="ticket"
                className="w-10 h-10 object-cover rounded-xl"
              />
              <button
                onClick={removeFoto}
                className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center"
              >
                <X size={9} className="text-white" />
              </button>
            </div>
          ) : (
            <label className="flex-shrink-0 p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
              <Camera size={18} />
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFoto}
                className="sr-only"
              />
            </label>
          )}
        </section>

        {/* Descripción */}
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

      {/* Teclado numérico + botón guardar (fijo al fondo) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur border-t border-slate-800">
        <NumericKeypad onKey={handleKey} />
        <div className="px-3 pt-1 pb-8">
          <button
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-30 text-slate-900 font-bold text-base rounded-2xl transition-colors"
          >
            {guardando ? 'Guardando…' : 'Guardar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}
