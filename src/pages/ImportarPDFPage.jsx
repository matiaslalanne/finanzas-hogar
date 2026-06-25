import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileUp, Pencil, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useRubros } from '../hooks/useRubros'
import { useMediosPago } from '../hooks/useMediosPago'
import { fechaHoy } from '../lib/formatters'

// ── helpers ─────────────────────────────────────────────────────────────────

function fmtMonto(n, moneda) {
  const v = Math.abs(Number(n))
  return moneda === 'USD'
    ? `U$D ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function uid() {
  return Math.random().toString(36).slice(2)
}

async function pdfToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function detectarDuplicados(transacciones) {
  if (!transacciones.length) return transacciones
  const fechas = transacciones.map(t => t.fecha).sort()
  const minFecha = adjustDate(fechas[0], -3)
  const maxFecha = adjustDate(fechas[fechas.length - 1], 3)

  const { data: existing } = await supabase
    .from('gastos')
    .select('fecha, monto, moneda')
    .gte('fecha', minFecha)
    .lte('fecha', maxFecha)

  return transacciones.map(t => {
    const esDup = (existing ?? []).some(g =>
      g.moneda === t.moneda &&
      Math.abs(Number(g.monto) - t.monto) < 0.01 &&
      Math.abs(new Date(g.fecha) - new Date(t.fecha)) <= 3 * 86400000
    )
    return { ...t, duplicado: esDup }
  })
}

function adjustDate(fechaStr, days) {
  const d = new Date(fechaStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── EditarFila modal ─────────────────────────────────────────────────────────

function EditarFilaModal({ fila, rubros, onSave, onClose }) {
  const [form, setForm] = useState({
    fecha: fila.fecha,
    descripcion: fila.descripcion,
    montoStr: String(fila.monto),
    rubro: fila.rubro,
  })
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 inset-x-0 z-[60] bg-slate-900 border-t border-slate-800 rounded-t-2xl flex flex-col max-h-[88vh]">
        <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex justify-center mb-0 flex-1">
            <span className="text-sm font-semibold text-slate-200">Editar transacción</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Descripción</p>
            <input
              type="text"
              value={form.descripcion}
              onChange={e => setField('descripcion', e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Monto ({fila.moneda})</p>
            <input
              type="text"
              inputMode="decimal"
              value={form.montoStr}
              onChange={e => setField('montoStr', e.target.value.replace(/[^0-9.,]/g, ''))}
              className="w-full px-4 py-3 bg-slate-800 rounded-xl text-slate-100 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Fecha</p>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setField('fecha', e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Rubro</p>
            <div className="grid grid-cols-4 gap-1.5">
              {rubros.map(r => (
                <button
                  key={r.id}
                  onClick={() => setField('rubro', r.nombre)}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-all ${
                    form.rubro === r.nombre
                      ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl leading-none">{r.icono}</span>
                  <span className="text-[9px] mt-1 text-center leading-tight font-medium line-clamp-2 w-full">{r.nombre}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onSave({ fecha: form.fecha, descripcion: form.descripcion, monto: parseFloat(form.montoStr.replace(',', '.')) || fila.monto, rubro: form.rubro })}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm rounded-xl transition-colors"
          >
            Aplicar cambios
          </button>
        </div>
      </div>
    </>
  )
}

// ── main ────────────────────────────────────────────────────────────────────

export default function ImportarPDFPage() {
  const navigate = useNavigate()
  const { persona } = useAuth()
  const { showToast } = useToast()
  const { rubros } = useRubros()
  const { mediosPago } = useMediosPago()
  const fileRef = useRef(null)

  const [step, setStep] = useState('setup') // setup | procesando | revision | exito
  const [selectedCard, setSelectedCard] = useState(null)
  const [rows, setRows] = useState([])
  const [editando, setEditando] = useState(null) // fila id
  const [filtroMoneda, setFiltroMoneda] = useState('todos')
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState(null) // { insertados, descartados }
  const [error, setError] = useState(null)

  const tarjetas = mediosPago.filter(m => m.tipo === 'tarjeta_credito')

  const handlePDF = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') return showToast('Solo se aceptan archivos PDF', 'error')
    if (file.size > 4 * 1024 * 1024) return showToast('El PDF no puede superar los 4 MB', 'error')
    if (!selectedCard) return showToast('Primero elegí la tarjeta', 'error')

    setError(null)
    setStep('procesando')

    try {
      const pdfBase64 = await pdfToBase64(file)

      const res = await fetch('/.netlify/functions/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64 }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      if (!json.transacciones?.length) throw new Error('No se encontraron transacciones en el PDF')

      // Agregar ids internos y rubro inicial
      let parsed = json.transacciones.map(t => ({
        ...t,
        id: uid(),
        rubro: t.rubro_sugerido,
        incluir: true,
        duplicado: false,
      }))

      // Detección de duplicados
      parsed = await detectarDuplicados(parsed)

      setRows(parsed)
      setStep('revision')
    } catch (err) {
      setError(err.message)
      setStep('setup')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const updateRow = (id, cambios) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...cambios } : r))
  const toggleIncluir = (id) => updateRow(id, { incluir: !rows.find(r => r.id === id)?.incluir })
  const toggleTodas = () => {
    const todas = rowsFiltradas.every(r => r.incluir)
    const ids = new Set(rowsFiltradas.map(r => r.id))
    setRows(rs => rs.map(r => ids.has(r.id) ? { ...r, incluir: !todas } : r))
  }

  const rowsFiltradas = filtroMoneda === 'todos' ? rows
    : rows.filter(r => r.moneda === filtroMoneda)

  const seleccionadas = rows.filter(r => r.incluir)
  const totalARS = seleccionadas.filter(r => r.moneda === 'ARS').reduce((s, r) => s + r.monto, 0)
  const totalUSD = seleccionadas.filter(r => r.moneda === 'USD').reduce((s, r) => s + r.monto, 0)

  const handleConfirmar = async () => {
    if (!seleccionadas.length) return showToast('No hay filas seleccionadas', 'error')
    setConfirmando(true)
    try {
      // Crear registro pdf_imports
      const { data: pdfImport, error: errImport } = await supabase
        .from('pdf_imports')
        .insert({
          fecha: fechaHoy(),
          medio_pago_id: selectedCard.id,
          estado: 'confirmado',
          raw_json: rows,
        })
        .select('id')
        .single()

      if (errImport) throw errImport

      // Insertar gastos aprobados
      const { error: errGastos } = await supabase.from('gastos').insert(
        seleccionadas.map(r => ({
          fecha: r.fecha,
          monto: r.monto,
          moneda: r.moneda,
          rubro: r.rubro,
          medio_pago_id: selectedCard.id,
          persona,
          descripcion: r.descripcion || null,
          origen: 'pdf',
          pdf_import_id: pdfImport.id,
        }))
      )
      if (errGastos) throw errGastos

      setResultado({ insertados: seleccionadas.length, descartados: rows.length - seleccionadas.length })
      setStep('exito')
    } catch (err) {
      showToast('Error al importar: ' + err.message, 'error')
    } finally {
      setConfirmando(false)
    }
  }

  const reiniciar = () => {
    setStep('setup')
    setRows([])
    setSelectedCard(null)
    setResultado(null)
    setError(null)
    setFiltroMoneda('todos')
    if (fileRef.current) fileRef.current.value = ''
  }

  const filaEditando = editando ? rows.find(r => r.id === editando) : null

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate('/mas')} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 font-semibold text-slate-100 text-sm">Importar resumen de tarjeta</h1>
        {step === 'revision' && (
          <span className="text-xs text-slate-500">{rows.length} filas</span>
        )}
      </header>

      {/* ── SETUP ──────────────────────────────────────────────────────── */}
      {step === 'setup' && (
        <div className="flex-1 px-4 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-rose-500/10 rounded-xl text-rose-400 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Seleccionar tarjeta */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Tarjeta del resumen
            </p>
            {tarjetas.length === 0 ? (
              <p className="text-sm text-slate-600">No hay tarjetas de crédito cargadas. Agregá una desde Más → Administrador.</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {tarjetas.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedCard(t.id === selectedCard?.id ? null : t)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      selectedCard?.id === t.id
                        ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload area */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">PDF del resumen</p>
            <label className={`flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
              selectedCard
                ? 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/30'
                : 'border-slate-800 opacity-40 cursor-not-allowed'
            }`}>
              <FileUp size={32} className="text-slate-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-300">Tocá para seleccionar el PDF</p>
                <p className="text-xs text-slate-600 mt-1">Máximo 4 MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={handlePDF}
                disabled={!selectedCard}
                className="sr-only"
              />
            </label>
          </div>

          <div className="px-4 py-3 bg-slate-800/50 rounded-xl text-xs text-slate-500 space-y-1">
            <p>La IA (Claude) extrae y categoriza automáticamente los consumos.</p>
            <p>Los consumos en USD se registran en dólares sin convertir (stop debit).</p>
            <p className="text-amber-600">Requiere estar desplegado en Netlify con la API key configurada.</p>
          </div>
        </div>
      )}

      {/* ── PROCESANDO ─────────────────────────────────────────────────── */}
      {step === 'procesando' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-14 h-14 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-slate-200 font-medium">Analizando con IA…</p>
            <p className="text-slate-500 text-sm mt-1">Esto puede tardar entre 10 y 30 segundos</p>
          </div>
        </div>
      )}

      {/* ── REVISIÓN ───────────────────────────────────────────────────── */}
      {step === 'revision' && (
        <div className="flex-1 flex flex-col">

          {/* Sub-header: filtros + totales */}
          <div className="px-4 py-3 border-b border-slate-800 space-y-2">
            {/* Filtros moneda */}
            <div className="flex items-center gap-2">
              {[['todos','Todas'],['ARS','Solo ARS'],['USD','Solo USD']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFiltroMoneda(val)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filtroMoneda === val ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}>
                  {lbl}
                </button>
              ))}
              <button onClick={toggleTodas} className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors">
                {rowsFiltradas.every(r => r.incluir) ? 'Deseleccionar' : 'Seleccionar todas'}
              </button>
            </div>
            {/* Totales */}
            <div className="flex gap-4 text-xs text-slate-500">
              <span>{seleccionadas.length} de {rows.length} seleccionadas</span>
              {totalARS > 0 && <span>ARS: <span className="text-rose-400 font-medium">{fmtMonto(totalARS, 'ARS')}</span></span>}
              {totalUSD > 0 && <span>USD: <span className="text-amber-400 font-medium">{fmtMonto(totalUSD, 'USD')}</span></span>}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto pb-24 divide-y divide-slate-800/40">
            {rowsFiltradas.map(row => (
              <div key={row.id} className={`px-4 py-3 flex items-start gap-3 ${!row.incluir ? 'opacity-40' : ''}`}>
                {/* Checkbox */}
                <button
                  onClick={() => toggleIncluir(row.id)}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    row.incluir ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                  }`}
                >
                  {row.incluir && <span className="text-slate-900 text-xs font-bold">✓</span>}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{row.descripcion}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          row.moneda === 'USD' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                        }`}>{row.moneda}</span>
                        <span className="text-[10px] text-slate-500">{row.rubro}</span>
                        <span className="text-[10px] text-slate-600">{row.fecha}</span>
                        {row.duplicado && (
                          <span className="text-[10px] font-medium text-amber-500 flex items-center gap-0.5">
                            <AlertTriangle size={10} />
                            posible duplicado
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-300 tabular-nums">
                        {fmtMonto(row.monto, row.moneda)}
                      </span>
                      <button
                        onClick={() => setEditando(row.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fixed bottom button */}
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-4">
            <button
              onClick={handleConfirmar}
              disabled={confirmando || seleccionadas.length === 0}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-900 font-bold text-base rounded-2xl transition-colors"
            >
              {confirmando ? 'Importando…' : `Importar ${seleccionadas.length} gasto${seleccionadas.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── ÉXITO ──────────────────────────────────────────────────────── */}
      {step === 'exito' && resultado && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center">
            <CheckCircle2 size={44} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-100">¡Importado!</h2>
            <p className="text-slate-400 mt-2">
              Se cargaron <span className="text-emerald-400 font-semibold">{resultado.insertados}</span> gastos
            </p>
            {resultado.descartados > 0 && (
              <p className="text-slate-600 text-sm mt-1">
                {resultado.descartados} descartado{resultado.descartados !== 1 ? 's' : ''}
              </p>
            )}
            <p className="text-xs text-slate-600 mt-1">Tarjeta: {selectedCard?.nombre}</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => navigate('/historico')}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-2xl transition-colors"
            >
              Ver en Histórico
            </button>
            <button
              onClick={reiniciar}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-2xl transition-colors"
            >
              Importar otro resumen
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────── */}
      {filaEditando && (
        <EditarFilaModal
          fila={filaEditando}
          rubros={rubros}
          onSave={(cambios) => { updateRow(filaEditando.id, cambios); setEditando(null) }}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  )
}
