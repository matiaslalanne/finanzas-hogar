import { useState } from 'react'
import { X, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

function fmtMonto(monto, moneda) {
  const n = Number(monto)
  return moneda === 'USD'
    ? `U$D ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtFecha(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const PERSONAS = [
  { id: 'mati', emoji: '👨', label: 'Mati' },
  { id: 'sofi', emoji: '👩', label: 'Sofi' },
  { id: 'hogar', emoji: '🏠', label: 'Hogar' },
]

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-200 text-right">{value}</span>
    </div>
  )
}

export default function MovimientoModal({ item, rubros, mediosPago, tiposIngreso, onClose, onSaved, onDeleted }) {
  const { showToast } = useToast()
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'confirm-delete'
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    fecha: item.fecha,
    montoStr: String(item.monto),
    moneda: item.moneda,
    rubro: item.rubro ?? '',
    tipoIngreso: item.tipo_ingreso ?? '',
    medioPagoId: item.medio_pago_id ?? null,
    persona: item.persona,
    descripcion: item.descripcion ?? '',
  })

  const isGasto = item._tipo === 'gasto'
  const setField = (key, val) => setEditData(d => ({ ...d, [key]: val }))

  const handleGuardar = async () => {
    const monto = parseFloat(editData.montoStr.replace(',', '.')) || 0
    if (monto <= 0) return showToast('Ingresá un monto válido', 'error')
    if (isGasto && !editData.rubro) return showToast('Elegí un rubro', 'error')
    if (!isGasto && !editData.tipoIngreso) return showToast('Elegí un tipo de ingreso', 'error')

    setSaving(true)
    const table = isGasto ? 'gastos' : 'ingresos'
    const updates = isGasto
      ? {
          fecha: editData.fecha,
          monto,
          moneda: editData.moneda,
          rubro: editData.rubro,
          medio_pago_id: editData.medioPagoId ?? null,
          persona: editData.persona,
          descripcion: editData.descripcion.trim() || null,
        }
      : {
          fecha: editData.fecha,
          monto,
          moneda: editData.moneda,
          tipo_ingreso: editData.tipoIngreso,
          persona: editData.persona,
          descripcion: editData.descripcion.trim() || null,
        }

    const { error } = await supabase.from(table).update(updates).eq('id', item.id)
    setSaving(false)
    if (error) {
      showToast('Error al guardar', 'error')
    } else {
      showToast('Cambios guardados')
      onSaved()
    }
  }

  const handleBorrar = async () => {
    setSaving(true)
    const table = isGasto ? 'gastos' : 'ingresos'
    const { error } = await supabase.from(table).delete().eq('id', item.id)
    setSaving(false)
    if (error) {
      showToast('Error al eliminar', 'error')
    } else {
      onDeleted()
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-2xl flex flex-col max-h-[92vh]">
        {/* Handle + header */}
        <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-slate-800">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isGasto ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {isGasto ? 'Gasto' : 'Ingreso'}
              </span>
              {mode === 'edit' && <span className="text-xs text-slate-500">Editando</span>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── VIEW MODE ─────────────────────────────────── */}
          {mode === 'view' && (
            <div className="px-4 py-4 space-y-4">
              <div className="text-center py-2">
                <p className={`text-4xl font-bold tabular-nums ${isGasto ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isGasto ? '−' : '+'}{fmtMonto(item.monto, item.moneda)}
                </p>
                <p className="text-sm text-slate-500 mt-1 capitalize">{fmtFecha(item.fecha)}</p>
              </div>

              <div className="space-y-2.5">
                <Row label="Categoría" value={isGasto ? item.rubro : item.tipo_ingreso} />
                <Row label="Persona" value={<span className="capitalize">{item.persona}</span>} />
                {isGasto && item.medios_pago?.nombre && (
                  <Row label="Medio de pago" value={item.medios_pago.nombre} />
                )}
                {isGasto && (
                  <Row label="Origen" value={item.origen === 'pdf' ? 'Resumen PDF' : 'Manual'} />
                )}
                {item.descripcion && (
                  <Row label="Descripción" value={item.descripcion} />
                )}
              </div>

              <div className="flex gap-3 pt-2 pb-4">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition-colors"
                >
                  <Pencil size={15} />
                  Editar
                </button>
                <button
                  onClick={() => setMode('confirm-delete')}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-medium text-sm transition-colors"
                >
                  <Trash2 size={15} />
                  Borrar
                </button>
              </div>
            </div>
          )}

          {/* ── EDIT MODE ─────────────────────────────────── */}
          {mode === 'edit' && (
            <div className="px-4 py-4 space-y-5 pb-8">
              {/* Monto + Moneda */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Monto</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editData.montoStr}
                    onChange={e => setField('montoStr', e.target.value.replace(/[^0-9,.]/g, ''))}
                    className="flex-1 px-4 py-3 bg-slate-800 rounded-xl text-slate-100 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                  <button
                    onClick={() => setField('moneda', editData.moneda === 'ARS' ? 'USD' : 'ARS')}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                      editData.moneda === 'USD'
                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {editData.moneda}
                  </button>
                </div>
              </div>

              {/* Fecha */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Fecha</p>
                <input
                  type="date"
                  value={editData.fecha}
                  onChange={e => setField('fecha', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
                />
              </div>

              {/* Rubro (gastos) */}
              {isGasto && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Rubro</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {rubros.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setField('rubro', r.nombre)}
                        className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-all ${
                          editData.rubro === r.nombre
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
              )}

              {/* Tipo ingreso */}
              {!isGasto && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Tipo de ingreso</p>
                  <div className="grid grid-cols-2 gap-2">
                    {tiposIngreso.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setField('tipoIngreso', t.nombre); setField('moneda', t.moneda_default) }}
                        className={`py-3 px-3 rounded-xl text-sm font-medium transition-all text-left flex items-center justify-between ${
                          editData.tipoIngreso === t.nombre
                            ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="truncate pr-1">{t.nombre}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                          t.moneda_default === 'USD' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-500'
                        }`}>
                          {t.moneda_default}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Medio de pago (gastos) */}
              {isGasto && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Medio de pago</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => setField('medioPagoId', null)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        editData.medioPagoId === null
                          ? 'bg-emerald-500 text-slate-900'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Ninguno
                    </button>
                    {mediosPago.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setField('medioPagoId', m.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          editData.medioPagoId === m.id
                            ? 'bg-emerald-500 text-slate-900'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {m.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Persona */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Persona</p>
                <div className="flex gap-2">
                  {PERSONAS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setField('persona', p.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        editData.persona === p.id
                          ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <span>{p.emoji}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Descripción</p>
                <input
                  type="text"
                  value={editData.descripcion}
                  onChange={e => setField('descripcion', e.target.value)}
                  placeholder="Opcional"
                  maxLength={200}
                  className="w-full px-4 py-2.5 bg-slate-800 rounded-xl text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setMode('view')}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 rounded-xl font-bold text-sm transition-colors"
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}

          {/* ── CONFIRM DELETE ────────────────────────────── */}
          {mode === 'confirm-delete' && (
            <div className="px-4 py-8 flex flex-col items-center gap-5">
              <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={28} className="text-rose-400" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-slate-100 mb-1">¿Eliminar este registro?</h3>
                <p className="text-sm text-slate-400">
                  {fmtMonto(item.monto, item.moneda)} · {isGasto ? item.rubro : item.tipo_ingreso} · {item.fecha}
                </p>
                <p className="text-xs text-slate-600 mt-1">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setMode('view')}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBorrar}
                  disabled={saving}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
                >
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
