import { useState } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { fechaHoy } from '../../lib/formatters'

const TIPOS = [
  { id: 'deposito',        emoji: '📥', label: 'Depósito'       },
  { id: 'retiro',          emoji: '📤', label: 'Retiro'         },
  { id: 'transferencia',   emoji: '↔️',  label: 'Transferencia' },
  { id: 'compra_usd',      emoji: '💵', label: 'Compra USD'     },
  { id: 'venta_usd',       emoji: '💰', label: 'Venta USD'      },
  { id: 'ingreso_negocio', emoji: '💼', label: 'Negocio'        },
  { id: 'ajuste',          emoji: '⚙️', label: 'Ajuste'         },
]

const PERSONAS = [
  { id: 'mati', emoji: '👨', label: 'Mati' },
  { id: 'sofi', emoji: '👩', label: 'Sofi' },
  { id: 'hogar', emoji: '🏠', label: 'Hogar' },
]

function fmtSaldo(saldo, moneda) {
  const n = Number(saldo)
  return moneda === 'USD'
    ? `U$D ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function parseDec(str) {
  return parseFloat(String(str).replace(',', '.')) || 0
}

function UbicChips({ ubicaciones, value, onChange, label, monedaFilter }) {
  const filtered = monedaFilter ? ubicaciones.filter(u => u.moneda === monedaFilter) : ubicaciones
  if (filtered.length === 0) {
    return (
      <div>
        {label && <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</p>}
        <p className="text-xs text-slate-600 italic">No hay ubicaciones en {monedaFilter}</p>
      </div>
    )
  }
  return (
    <div>
      {label && <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</p>}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filtered.map(u => (
          <button
            key={u.id}
            onClick={() => onChange(value === u.id ? null : u.id)}
            className={`flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              value === u.id
                ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="whitespace-nowrap">{u.nombre}</span>
            <span className={`text-[10px] tabular-nums ${value === u.id ? 'text-emerald-500' : 'text-slate-500'}`}>
              {fmtSaldo(u.saldo, u.moneda)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  )
}

function MontoInput({ label, value, onChange, placeholder = '0' }) {
  return (
    <Campo label={label}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9,.]/g, ''))}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-800 rounded-xl text-slate-100 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums placeholder-slate-700"
      />
    </Campo>
  )
}

export default function NuevoMovimientoModal({ ubicaciones, onClose, onGuardado }) {
  const { persona: defaultPersona } = useAuth()
  const { showToast } = useToast()

  const [tipo, setTipo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    montoStr: '',
    cotizacionStr: '',
    origenId: null,
    destinoId: null,
    ajusteUbicId: null,
    ajusteDir: '+',
    persona: defaultPersona,
    fecha: fechaHoy(),
    descripcion: '',
  })

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const resetAndBack = () => {
    setTipo(null)
    setForm(f => ({
      montoStr: '',
      cotizacionStr: '',
      origenId: null,
      destinoId: null,
      ajusteUbicId: null,
      ajusteDir: '+',
      persona: f.persona,
      fecha: f.fecha,
      descripcion: '',
    }))
  }

  const monto = parseDec(form.montoStr)
  const cotizacion = parseDec(form.cotizacionStr)
  const montoPesos = monto * cotizacion

  const getMoneda = (id) => ubicaciones.find(u => u.id === id)?.moneda ?? 'ARS'

  const handleGuardar = async () => {
    if (monto <= 0) return showToast('Ingresá un monto', 'error')

    const base = {
      fecha: form.fecha,
      tipo,
      persona: form.persona,
      descripcion: form.descripcion.trim() || null,
    }

    let payload = null

    switch (tipo) {
      case 'deposito':
        if (!form.destinoId) return showToast('Elegí la ubicación destino', 'error')
        payload = { ...base, ubicacion_destino: form.destinoId, monto, moneda: getMoneda(form.destinoId) }
        break
      case 'ingreso_negocio':
        if (!form.destinoId) return showToast('Elegí la ubicación destino', 'error')
        payload = { ...base, ubicacion_destino: form.destinoId, monto, moneda: 'USD' }
        break
      case 'retiro':
        if (!form.origenId) return showToast('Elegí la ubicación origen', 'error')
        payload = { ...base, ubicacion_origen: form.origenId, monto, moneda: getMoneda(form.origenId) }
        break
      case 'transferencia':
        if (!form.origenId || !form.destinoId) return showToast('Elegí origen y destino', 'error')
        if (form.origenId === form.destinoId) return showToast('Origen y destino deben ser distintos', 'error')
        payload = {
          ...base,
          ubicacion_origen: form.origenId,
          ubicacion_destino: form.destinoId,
          monto,
          moneda: getMoneda(form.origenId),
        }
        break
      case 'compra_usd':
        if (!form.destinoId) return showToast('Elegí dónde van los dólares', 'error')
        if (cotizacion <= 0) return showToast('Ingresá la cotización', 'error')
        payload = {
          ...base,
          ubicacion_origen: form.origenId ?? null,
          ubicacion_destino: form.destinoId,
          monto,
          moneda: 'USD',
          cotizacion: cotizacion || null,
          monto_pesos: montoPesos || null,
        }
        break
      case 'venta_usd':
        if (!form.origenId) return showToast('Elegí de dónde salen los dólares', 'error')
        if (cotizacion <= 0) return showToast('Ingresá la cotización', 'error')
        payload = {
          ...base,
          ubicacion_origen: form.origenId,
          ubicacion_destino: form.destinoId ?? null,
          monto,
          moneda: 'USD',
          cotizacion: cotizacion || null,
          monto_pesos: montoPesos || null,
        }
        break
      case 'ajuste': {
        if (!form.ajusteUbicId) return showToast('Elegí la ubicación', 'error')
        const moneda = getMoneda(form.ajusteUbicId)
        payload = {
          ...base,
          ubicacion_origen: form.ajusteDir === '-' ? form.ajusteUbicId : null,
          ubicacion_destino: form.ajusteDir === '+' ? form.ajusteUbicId : null,
          monto,
          moneda,
        }
        break
      }
    }

    if (!payload) return

    setSaving(true)
    const { error } = await supabase.from('movimientos_ahorro').insert(payload)
    setSaving(false)

    if (error) {
      showToast('Error al guardar', 'error')
    } else {
      showToast('Movimiento guardado')
      onGuardado()
    }
  }

  const tipoInfo = TIPOS.find(t => t.id === tipo)

  // Derivar moneda del form según tipo para mostrar labels
  const monedaForm =
    tipo === 'deposito' ? (form.destinoId ? getMoneda(form.destinoId) : 'ARS') :
    tipo === 'retiro' ? (form.origenId ? getMoneda(form.origenId) : 'ARS') :
    tipo === 'transferencia' ? (form.origenId ? getMoneda(form.origenId) : 'ARS') :
    tipo === 'ajuste' ? (form.ajusteUbicId ? getMoneda(form.ajusteUbicId) : 'ARS') :
    'USD'

  const ubiARS = ubicaciones.filter(u => u.moneda === 'ARS')
  const ubiUSD = ubicaciones.filter(u => u.moneda === 'USD')
  // Para transferencia: solo misma moneda que origen
  const origenMoneda = form.origenId ? getMoneda(form.origenId) : null
  const ubiDestinoTransf = origenMoneda
    ? ubicaciones.filter(u => u.moneda === origenMoneda && u.id !== form.origenId)
    : []

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-2xl flex flex-col max-h-[94vh]">

        {/* Handle + header */}
        <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-slate-800">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {tipo ? (
                <button
                  onClick={resetAndBack}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span className="text-sm">{tipoInfo?.emoji} {tipoInfo?.label}</span>
                </button>
              ) : (
                <span className="text-sm font-semibold text-slate-200">Nuevo movimiento</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: tipo selector ───────────────────── */}
          {!tipo && (
            <div className="px-4 py-4">
              <div className="grid grid-cols-4 gap-2">
                {TIPOS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    className="flex flex-col items-center py-4 px-2 bg-slate-800 hover:bg-slate-700 rounded-2xl active:scale-95 transition-all gap-1"
                  >
                    <span className="text-2xl leading-none">{t.emoji}</span>
                    <span className="text-[10px] text-slate-400 font-medium text-center leading-tight mt-0.5">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: form ────────────────────────────── */}
          {tipo && (
            <div className="px-4 py-4 space-y-5 pb-8">

              {/* ── DEPÓSITO ── */}
              {tipo === 'deposito' && (
                <>
                  <UbicChips
                    ubicaciones={ubicaciones}
                    value={form.destinoId}
                    onChange={v => setField('destinoId', v)}
                    label="Destino"
                  />
                  <MontoInput
                    label={`Monto (${monedaForm})`}
                    value={form.montoStr}
                    onChange={v => setField('montoStr', v)}
                  />
                </>
              )}

              {/* ── INGRESO NEGOCIO ── */}
              {tipo === 'ingreso_negocio' && (
                <>
                  <UbicChips
                    ubicaciones={ubicaciones}
                    value={form.destinoId}
                    onChange={v => setField('destinoId', v)}
                    label="Destino (USD)"
                    monedaFilter="USD"
                  />
                  <MontoInput label="Monto (USD)" value={form.montoStr} onChange={v => setField('montoStr', v)} />
                </>
              )}

              {/* ── RETIRO ── */}
              {tipo === 'retiro' && (
                <>
                  <UbicChips
                    ubicaciones={ubicaciones}
                    value={form.origenId}
                    onChange={v => setField('origenId', v)}
                    label="Origen"
                  />
                  <MontoInput
                    label={`Monto (${monedaForm})`}
                    value={form.montoStr}
                    onChange={v => setField('montoStr', v)}
                  />
                </>
              )}

              {/* ── TRANSFERENCIA ── */}
              {tipo === 'transferencia' && (
                <>
                  <UbicChips
                    ubicaciones={ubicaciones}
                    value={form.origenId}
                    onChange={v => { setField('origenId', v); setField('destinoId', null) }}
                    label="Desde"
                  />
                  {form.origenId && (
                    <UbicChips
                      ubicaciones={ubiDestinoTransf}
                      value={form.destinoId}
                      onChange={v => setField('destinoId', v)}
                      label="Hacia"
                    />
                  )}
                  <MontoInput
                    label={`Monto (${monedaForm})`}
                    value={form.montoStr}
                    onChange={v => setField('montoStr', v)}
                  />
                </>
              )}

              {/* ── COMPRA USD ── */}
              {tipo === 'compra_usd' && (
                <>
                  <UbicChips
                    ubicaciones={ubiUSD}
                    value={form.destinoId}
                    onChange={v => setField('destinoId', v)}
                    label="Dólares → destino"
                  />
                  <UbicChips
                    ubicaciones={ubiARS}
                    value={form.origenId}
                    onChange={v => setField('origenId', v)}
                    label="Pesos ← origen (opcional)"
                  />
                  <MontoInput label="Cantidad USD" value={form.montoStr} onChange={v => setField('montoStr', v)} />
                  <Campo label="Cotización (precio por dólar)">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.cotizacionStr}
                      onChange={e => setField('cotizacionStr', e.target.value.replace(/[^0-9,.]/g, ''))}
                      placeholder="1050"
                      className="w-full px-4 py-3 bg-slate-800 rounded-xl text-slate-100 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums placeholder-slate-700"
                    />
                    {montoPesos > 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Total pesos: <span className="text-amber-400 font-medium">
                          $ {montoPesos.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </p>
                    )}
                  </Campo>
                </>
              )}

              {/* ── VENTA USD ── */}
              {tipo === 'venta_usd' && (
                <>
                  <UbicChips
                    ubicaciones={ubiUSD}
                    value={form.origenId}
                    onChange={v => setField('origenId', v)}
                    label="Dólares ← origen"
                  />
                  <UbicChips
                    ubicaciones={ubiARS}
                    value={form.destinoId}
                    onChange={v => setField('destinoId', v)}
                    label="Pesos → destino (opcional)"
                  />
                  <MontoInput label="Cantidad USD" value={form.montoStr} onChange={v => setField('montoStr', v)} />
                  <Campo label="Cotización (precio por dólar)">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.cotizacionStr}
                      onChange={e => setField('cotizacionStr', e.target.value.replace(/[^0-9,.]/g, ''))}
                      placeholder="1050"
                      className="w-full px-4 py-3 bg-slate-800 rounded-xl text-slate-100 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums placeholder-slate-700"
                    />
                    {montoPesos > 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Total pesos: <span className="text-amber-400 font-medium">
                          $ {montoPesos.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </p>
                    )}
                  </Campo>
                </>
              )}

              {/* ── AJUSTE ── */}
              {tipo === 'ajuste' && (
                <>
                  <UbicChips
                    ubicaciones={ubicaciones}
                    value={form.ajusteUbicId}
                    onChange={v => setField('ajusteUbicId', v)}
                    label="Ubicación"
                  />
                  <Campo label="Dirección">
                    <div className="flex gap-2">
                      {[['+', 'Sumar (crédito)'], ['-', 'Restar (débito)']].map(([dir, lbl]) => (
                        <button
                          key={dir}
                          onClick={() => setField('ajusteDir', dir)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            form.ajusteDir === dir
                              ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </Campo>
                  <MontoInput
                    label={`Monto (${monedaForm})`}
                    value={form.montoStr}
                    onChange={v => setField('montoStr', v)}
                  />
                </>
              )}

              {/* ── CAMPOS COMUNES ── */}
              <Campo label="Fecha">
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setField('fecha', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
                />
              </Campo>

              <Campo label="Persona">
                <div className="flex gap-2">
                  {PERSONAS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setField('persona', p.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        form.persona === p.id
                          ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-300'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <span>{p.emoji}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </Campo>

              <Campo label="Descripción (opcional)">
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={e => setField('descripcion', e.target.value)}
                  placeholder="Ej: Compra a Cambio Azul"
                  maxLength={200}
                  className="w-full px-4 py-2.5 bg-slate-800 rounded-xl text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Campo>

              <button
                onClick={handleGuardar}
                disabled={saving}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold text-base rounded-2xl transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar movimiento'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
