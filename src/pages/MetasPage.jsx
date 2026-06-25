import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, X, AlertTriangle, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAhorros } from '../hooks/useAhorros'
import { useToast } from '../contexts/ToastContext'

function fmtUSD(n) {
  return `U$D ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtARS(n) {
  return `$ ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtMonto(n, moneda) {
  return moneda === 'USD' ? fmtUSD(n) : fmtARS(n)
}

// ── MODAL ──────────────────────────────────────────────────────────────────

function MetaModal({ meta, onClose, onSaved, onDeleted }) {
  const { showToast } = useToast()
  const isEdit = !!meta?.id
  const [mode, setMode] = useState('form') // 'form' | 'confirm-delete'
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: meta?.nombre ?? '',
    monto_objetivo: meta ? String(meta.monto_objetivo) : '',
    moneda: meta?.moneda ?? 'USD',
    fecha_objetivo: meta?.fecha_objetivo ?? '',
    es_fondo_emergencia: meta?.es_fondo_emergencia ?? false,
    activa: meta?.activa ?? true,
  })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return showToast('Ingresá un nombre', 'error')
    const monto = parseFloat(form.monto_objetivo) || 0
    if (monto <= 0) return showToast('Ingresá el monto objetivo', 'error')

    setSaving(true)
    const payload = {
      nombre: form.nombre.trim(),
      monto_objetivo: monto,
      moneda: form.moneda,
      fecha_objetivo: form.fecha_objetivo || null,
      es_fondo_emergencia: form.es_fondo_emergencia,
      activa: form.activa,
    }

    const { error } = isEdit
      ? await supabase.from('metas').update(payload).eq('id', meta.id)
      : await supabase.from('metas').insert(payload)

    setSaving(false)
    if (error) { showToast('Error al guardar', 'error') }
    else { showToast(isEdit ? 'Meta actualizada' : 'Meta creada'); onSaved() }
  }

  const handleBorrar = async () => {
    setSaving(true)
    const { error } = await supabase.from('metas').delete().eq('id', meta.id)
    setSaving(false)
    if (error) { showToast('Error al eliminar', 'error') }
    else { onDeleted() }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-2xl flex flex-col max-h-[92vh]">
        <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-slate-800">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">
              {isEdit ? 'Editar meta' : 'Nueva meta'}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {mode === 'form' && (
            <>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Nombre</p>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setField('nombre', e.target.value)}
                  placeholder="Ej: Viaje a Europa"
                  maxLength={80}
                  className="w-full px-4 py-2.5 bg-slate-800 rounded-xl text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Objetivo</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.monto_objetivo}
                    onChange={e => setField('monto_objetivo', e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    className="flex-1 px-4 py-3 bg-slate-800 rounded-xl text-slate-100 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums placeholder-slate-700"
                  />
                  <button
                    onClick={() => setField('moneda', form.moneda === 'ARS' ? 'USD' : 'ARS')}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                      form.moneda === 'USD'
                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {form.moneda}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Fecha objetivo (opcional)
                </p>
                <input
                  type="date"
                  value={form.fecha_objetivo}
                  onChange={e => setField('fecha_objetivo', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
                />
              </div>

              {!isEdit && (
                <button
                  onClick={() => setField('es_fondo_emergencia', !form.es_fondo_emergencia)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                    form.es_fondo_emergencia
                      ? 'bg-blue-500/20 ring-1 ring-blue-500/40 text-blue-300'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Shield size={18} className="flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Es fondo de emergencia</p>
                    <p className="text-[10px] mt-0.5 opacity-70">Se prioriza antes que las otras metas</p>
                  </div>
                </button>
              )}

              <button
                onClick={() => setField('activa', !form.activa)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  form.activa ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <span className="text-sm font-medium">Meta activa</span>
                <div className={`w-10 h-6 rounded-full transition-colors ${form.activa ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full m-0.5 transition-transform ${form.activa ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>

              <div className="flex gap-3 pt-2 pb-4">
                {isEdit && (
                  <button
                    onClick={() => setMode('confirm-delete')}
                    className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={handleGuardar}
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold text-sm rounded-xl transition-colors"
                >
                  {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear meta'}
                </button>
              </div>
            </>
          )}

          {mode === 'confirm-delete' && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={28} className="text-rose-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-100">¿Eliminar "{meta.nombre}"?</p>
                <p className="text-xs text-slate-600 mt-1">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setMode('form')} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-sm font-medium">
                  Cancelar
                </button>
                <button onClick={handleBorrar} disabled={saving} className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
                  {saving ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function MetasPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { ubicaciones, loading: loadingAhorros } = useAhorros()

  const [metas, setMetas] = useState([])
  const [loadingMetas, setLoadingMetas] = useState(true)
  const [modalMeta, setModalMeta] = useState(undefined) // undefined=closed, null=nueva, meta=editar

  const fetchMetas = () => {
    setLoadingMetas(true)
    supabase
      .from('metas')
      .select('*')
      .order('es_fondo_emergencia', { ascending: false })
      .order('activa', { ascending: false })
      .order('nombre')
      .then(({ data }) => {
        setMetas(data ?? [])
        setLoadingMetas(false)
      })
  }

  useEffect(() => { fetchMetas() }, [])

  const totalUSD = ubicaciones.filter(u => u.moneda === 'USD').reduce((s, u) => s + u.saldo, 0)

  const metasConProgreso = useMemo(() => {
    const fondo = metas.find(m => m.es_fondo_emergencia)
    const fondoObj = fondo ? Number(fondo.monto_objetivo) : 0
    const sobrante = Math.max(0, totalUSD - fondoObj)

    return metas.map(m => {
      const obj = Number(m.monto_objetivo)
      const actual = m.es_fondo_emergencia ? Math.min(totalUSD, obj) : Math.min(sobrante, obj)
      const pct = obj > 0 ? Math.min(100, Math.round((actual / obj) * 100)) : 0
      return { ...m, actual, pct, cumplida: actual >= obj }
    })
  }, [metas, totalUSD])

  const loading = loadingAhorros || loadingMetas

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate('/mas')} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 font-semibold text-slate-100 text-sm">Metas de ahorro</h1>
        <button
          onClick={() => setModalMeta(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs rounded-xl transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nueva
        </button>
      </div>

      {/* Saldo de referencia */}
      <div className="px-4 py-3 border-b border-slate-800/50">
        <p className="text-xs text-slate-500">
          Ahorros USD disponibles: <span className="text-slate-300 font-medium">{fmtUSD(totalUSD)}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : metasConProgreso.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-slate-500">Sin metas todavía</p>
          <button onClick={() => setModalMeta(null)} className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors">
            + Crear primera meta
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {metasConProgreso.map(meta => (
            <div key={meta.id} className={`bg-slate-800 rounded-2xl px-4 py-4 ${!meta.activa ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {meta.es_fondo_emergencia && (
                      <Shield size={13} className="text-blue-400 flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-slate-200">{meta.nombre}</span>
                    {meta.cumplida && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        ✓ Cumplida
                      </span>
                    )}
                    {!meta.activa && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-500">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {fmtMonto(meta.actual, meta.moneda)} de {fmtMonto(meta.monto_objetivo, meta.moneda)}
                    {meta.fecha_objetivo && (
                      <span className="text-slate-600 ml-1">
                        · hasta {new Date(meta.fecha_objetivo).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${meta.cumplida ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {meta.pct}%
                  </span>
                  <button
                    onClick={() => setModalMeta(meta)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${meta.cumplida ? 'bg-emerald-500' : meta.es_fondo_emergencia ? 'bg-blue-500' : 'bg-indigo-500'}`}
                  style={{ width: `${meta.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMeta !== undefined && (
        <MetaModal
          meta={modalMeta}
          onClose={() => setModalMeta(undefined)}
          onSaved={() => { setModalMeta(undefined); fetchMetas() }}
          onDeleted={() => { setModalMeta(undefined); fetchMetas(); showToast('Meta eliminada') }}
        />
      )}
    </div>
  )
}
