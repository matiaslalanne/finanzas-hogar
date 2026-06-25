import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAhorros } from '../hooks/useAhorros'
import { useToast } from '../contexts/ToastContext'
import NuevoMovimientoModal from '../components/ahorros/NuevoMovimientoModal'

const TIPO_INFO = {
  saldo_inicial:   { emoji: '🏁', label: 'Saldo inicial'   },
  deposito:        { emoji: '📥', label: 'Depósito'        },
  retiro:          { emoji: '📤', label: 'Retiro'          },
  transferencia:   { emoji: '↔️', label: 'Transferencia'   },
  compra_usd:      { emoji: '💵', label: 'Compra USD'      },
  venta_usd:       { emoji: '💰', label: 'Venta USD'       },
  ingreso_negocio: { emoji: '💼', label: 'Negocio'         },
  ajuste:          { emoji: '⚙️', label: 'Ajuste'          },
}

function fmtMonto(monto, moneda, { abs = false } = {}) {
  const n = abs ? Math.abs(Number(monto)) : Number(monto)
  return moneda === 'USD'
    ? `U$D ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtFechaCorta(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function MovimientoRow({ mov }) {
  const info = TIPO_INFO[mov.tipo] ?? { emoji: '•', label: mov.tipo }
  const esCompraVenta = mov.tipo === 'compra_usd' || mov.tipo === 'venta_usd'
  const esCompra = mov.tipo === 'compra_usd'

  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 text-lg mt-0.5">
        {info.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200">{info.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {mov.origen?.nombre && mov.destino?.nombre
                ? `${mov.origen.nombre} → ${mov.destino.nombre}`
                : mov.origen?.nombre
                  ? `← ${mov.origen.nombre}`
                  : mov.destino?.nombre
                    ? `→ ${mov.destino.nombre}`
                    : ''}
            </p>
            {esCompraVenta && mov.cotizacion && (
              <p className="text-[10px] text-slate-600 mt-0.5">
                @ ${Number(mov.cotizacion).toLocaleString('es-AR')}
                {mov.monto_pesos ? ` = $ ${Number(mov.monto_pesos).toLocaleString('es-AR')}` : ''}
              </p>
            )}
            {mov.descripcion && (
              <p className="text-[10px] text-slate-600 mt-0.5 truncate">{mov.descripcion}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-slate-300">
              {fmtMonto(mov.monto, mov.moneda, { abs: true })}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">{fmtFechaCorta(mov.fecha)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function UbicacionCard({ u }) {
  const negativo = u.saldo < 0
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 rounded-xl">
      <span className="text-sm text-slate-300">{u.nombre}</span>
      <span className={`text-sm font-semibold tabular-nums ${negativo ? 'text-rose-400' : 'text-slate-100'}`}>
        {fmtMonto(Math.abs(u.saldo), u.moneda)}{negativo ? ' −' : ''}
      </span>
    </div>
  )
}

export default function Ahorros() {
  const { showToast } = useToast()
  const { ubicaciones, movimientos, loading, refetch } = useAhorros()
  const [showModal, setShowModal] = useState(false)

  const ubiARS = ubicaciones.filter(u => u.moneda === 'ARS')
  const ubiUSD = ubicaciones.filter(u => u.moneda === 'USD')
  const totalARS = ubiARS.reduce((s, u) => s + u.saldo, 0)
  const totalUSD = ubiUSD.reduce((s, u) => s + u.saldo, 0)

  const movRecientes = movimientos.slice(0, 30)

  return (
    <div className="pb-8">

      {/* ── TOTALES ───────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Total USD</p>
          <p className="text-xl font-bold text-slate-100 tabular-nums">
            {fmtMonto(totalUSD, 'USD')}
          </p>
        </div>
        <div className="bg-slate-800 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Total ARS</p>
          <p className="text-xl font-bold text-slate-100 tabular-nums">
            {fmtMonto(totalARS, 'ARS')}
          </p>
        </div>
      </div>

      {/* ── BOTÓN NUEVO MOVIMIENTO ─────────────────────── */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-900 font-bold text-sm rounded-2xl transition-colors"
        >
          <Plus size={18} strokeWidth={2.5} />
          Nuevo movimiento
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── UBICACIONES USD ───────────────────────── */}
          {ubiUSD.length > 0 && (
            <section className="px-4 mb-5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                💵 Dólares
              </p>
              <div className="space-y-2">
                {ubiUSD.map(u => <UbicacionCard key={u.id} u={u} />)}
              </div>
            </section>
          )}

          {/* ── UBICACIONES ARS ───────────────────────── */}
          {ubiARS.length > 0 && (
            <section className="px-4 mb-5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                💰 Pesos
              </p>
              <div className="space-y-2">
                {ubiARS.map(u => <UbicacionCard key={u.id} u={u} />)}
              </div>
            </section>
          )}

          {/* ── EMPTY STATE ───────────────────────────── */}
          {ubicaciones.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-slate-500">Sin ubicaciones de ahorro</p>
              <p className="text-slate-600 text-sm">Agregá ubicaciones desde Más → Administrador</p>
            </div>
          )}

          {/* ── HISTORIAL ─────────────────────────────── */}
          {movRecientes.length > 0 && (
            <section>
              <div className="px-4 mb-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Últimos movimientos
                </p>
              </div>
              <div className="divide-y divide-slate-800/50">
                {movRecientes.map(m => <MovimientoRow key={m.id} mov={m} />)}
              </div>
              {movimientos.length > 30 && (
                <p className="text-center text-xs text-slate-600 py-4">
                  Mostrando los últimos 30 movimientos
                </p>
              )}
            </section>
          )}

          {movRecientes.length === 0 && ubicaciones.length > 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-slate-600 text-sm">Todavía no hay movimientos</p>
            </div>
          )}
        </>
      )}

      {/* ── MODAL ─────────────────────────────────────── */}
      {showModal && (
        <NuevoMovimientoModal
          ubicaciones={ubicaciones}
          onClose={() => setShowModal(false)}
          onGuardado={() => { setShowModal(false); refetch() }}
        />
      )}
    </div>
  )
}
