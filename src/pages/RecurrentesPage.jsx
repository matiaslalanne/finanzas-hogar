import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, X, AlertTriangle, RefreshCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRubros } from '../hooks/useRubros'
import { useToast } from '../contexts/ToastContext'

function fmtMonto(n, moneda) {
  const v = Number(n)
  return moneda === 'USD'
    ? `U$D ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function diaLabel(d) {
  if (d === 1) return '1° de cada mes'
  if (d === 31) return 'último día del mes'
  return `Día ${d} de cada mes`
}

// ── MODAL ──────────────────────────────────────────────────────────────────

function RecurrenteModal({ item, rubros, onClose, onSaved, onDeleted }) {
  const { showToast } = useToast()
  const isEdit = !!item?.id
  const [mode, setMode] = useState('form')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    rubro: item?.rubro ?? '',
    monto: item ? String(item.monto) : '',
    moneda: item?.moneda ?? 'ARS',
    dia_del_mes: item ? String(item.dia_del_mes) : '1',
    descripcion: item?.descripcion ?? '',
    activo: item?.activo ?? true,
  })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleGuardar = async () => {
    if (!form.rubro) return showToast('Elegí un rubro', 'error')
    const monto = parseFloat(form.monto) || 0
    if (monto <= 0) return showToast('Ingresá un monto', 'error')
    const dia = parseInt(form.dia_del_mes) || 1
    if (dia < 1 || dia > 31) return showToast('El día debe ser entre 1 y 31', 'error')

    setSaving(true)
    const payload = {
      rubro: form.rubro,
      monto,
      moneda: form.moneda,
      dia_del_mes: dia,
      descripcion: form.descripcion.trim() || null,
      activo: form.activo,
    }

    const { error } = isEdit
      ? await supabase.from('gastos_recurrentes').update(payload).eq('id', item.id)
      : await supabase.from('gastos_recurrentes').insert(payload)

    setSaving(false)
    if (error) { showToast('Error al guardar', 'error') }
    else { showToast(isEdit ? 'Actualizado' : 'Recurrente creado'); onSaved() }
  }

  const handleBorrar = async () => {
    setSaving(true)
    const { error } = await supabase.from('gastos_recurrentes').delete().eq('id', item.id)
    setSaving(false)
    if (error) { showToast('Error al eliminar', 'error') }
    else { onDeleted() }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-2xl flex flex-col max-h-[94vh]">
        <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-slate-800">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">
              {isEdit ? 'Editar recurrente' : 'Nuevo recurrente'}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-8">

          {mode === 'form' && (
            <>
              {/* Rubro */}
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
                      <span className="text-[9px] mt-1 text-center leading-tight font-medium line-clamp-2 w-full">
                        {r.nombre}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto + Moneda */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Monto</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.monto}
                    onChange={e => setField('monto', e.target.value.replace(/[^0-9.]/g, ''))}
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

              {/* Día del mes */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Día del mes</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.dia_del_mes}
                    onChange={e => setField('dia_del_mes', e.target.value)}
                    className="w-24 px-4 py-3 bg-slate-800 rounded-xl text-slate-100 text-xl font-bold text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                  <span className="text-sm text-slate-500">de cada mes</span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Descripción (opcional)</p>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={e => setField('descripcion', e.target.value)}
                  placeholder="Ej: Alquiler depto"
                  maxLength={200}
                  className="w-full px-4 py-2.5 bg-slate-800 rounded-xl text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Activo toggle */}
              <button
                onClick={() => setField('activo', !form.activo)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  form.activo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <span className="text-sm font-medium">Activo</span>
                <div className={`w-10 h-6 rounded-full transition-colors ${form.activo ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full m-0.5 transition-transform ${form.activo ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>

              <div className="flex gap-3 pt-2">
                {isEdit && (
                  <button
                    onClick={() => setMode('confirm-delete')}
                    className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={handleGuardar}
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold text-sm rounded-xl transition-colors"
                >
                  {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear recurrente'}
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
                <p className="font-semibold text-slate-100">¿Eliminar este recurrente?</p>
                <p className="text-sm text-slate-400 mt-1">{item.rubro} · {fmtMonto(item.monto, item.moneda)}</p>
                <p className="text-xs text-slate-600 mt-1">No elimina los gastos ya generados.</p>
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

export default function RecurrentesPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { rubros } = useRubros()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(undefined) // undefined=closed, null=nuevo, item=editar

  const fetchItems = () => {
    setLoading(true)
    supabase
      .from('gastos_recurrentes')
      .select('*')
      .order('activo', { ascending: false })
      .order('dia_del_mes')
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { fetchItems() }, [])

  const toggleActivo = async (item) => {
    await supabase.from('gastos_recurrentes').update({ activo: !item.activo }).eq('id', item.id)
    fetchItems()
  }

  const activos = items.filter(i => i.activo)
  const inactivos = items.filter(i => !i.activo)

  const iconRubro = (nombre) => rubros.find(r => r.nombre === nombre)?.icono ?? '•'

  function ItemRow({ item }) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl">
        <span className="text-xl flex-shrink-0">{iconRubro(item.rubro)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200">
            {item.descripcion || item.rubro}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {fmtMonto(item.monto, item.moneda)} · {diaLabel(item.dia_del_mes)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => toggleActivo(item)}
            className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${item.activo ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${item.activo ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <button
            onClick={() => setModalItem(item)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate('/mas')} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 font-semibold text-slate-100 text-sm">Gastos recurrentes</h1>
        <button
          onClick={() => setModalItem(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs rounded-xl transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nuevo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <RefreshCcw size={32} className="text-slate-700" />
          <p className="text-slate-500">Sin gastos recurrentes</p>
          <button onClick={() => setModalItem(null)} className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors">
            + Agregar el primero
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-5">
          {activos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Activos ({activos.length})
              </p>
              {activos.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          )}
          {inactivos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Inactivos ({inactivos.length})
              </p>
              {inactivos.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          )}
        </div>
      )}

      {modalItem !== undefined && (
        <RecurrenteModal
          item={modalItem}
          rubros={rubros}
          onClose={() => setModalItem(undefined)}
          onSaved={() => { setModalItem(undefined); fetchItems() }}
          onDeleted={() => { setModalItem(undefined); fetchItems(); showToast('Eliminado') }}
        />
      )}
    </div>
  )
}
