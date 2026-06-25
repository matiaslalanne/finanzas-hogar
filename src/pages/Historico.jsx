import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, Search, X } from 'lucide-react'
import { useRubros } from '../hooks/useRubros'
import { useMediosPago } from '../hooks/useMediosPago'
import { useTiposIngreso } from '../hooks/useTiposIngreso'
import { useHistorico } from '../hooks/useHistorico'
import { useToast } from '../contexts/ToastContext'
import MovimientoModal from '../components/historico/MovimientoModal'

function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inicioMesStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function fmtMonto(monto, moneda) {
  const n = Number(monto)
  return moneda === 'USD'
    ? `U$D ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtFechaGrupo(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (dt.getTime() === today.getTime()) return 'Hoy'
  if (dt.getTime() === yesterday.getTime()) return 'Ayer'
  return dt.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function exportCSV(items) {
  const headers = ['Tipo', 'Fecha', 'Monto', 'Moneda', 'Categoría', 'Persona', 'Medio de pago', 'Descripción', 'Origen']
  const rows = items.map(item => [
    item._tipo === 'gasto' ? 'Gasto' : 'Ingreso',
    item.fecha,
    item.monto,
    item.moneda,
    item._tipo === 'gasto' ? (item.rubro ?? '') : (item.tipo_ingreso ?? ''),
    item.persona,
    item._tipo === 'gasto' ? (item.medios_pago?.nombre ?? '') : '',
    item.descripcion ?? '',
    item._tipo === 'gasto' ? (item.origen ?? '') : '',
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `finanzas-${hoyStr()}.csv`,
  })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function ItemRow({ item, rubros, onClick }) {
  const isGasto = item._tipo === 'gasto'
  const icono = isGasto ? (rubros.find(r => r.nombre === item.rubro)?.icono ?? '💸') : '💰'
  const categoria = isGasto ? item.rubro : item.tipo_ingreso

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800/30 active:bg-slate-800/50 transition-colors text-left"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
        isGasto ? 'bg-rose-500/10' : 'bg-emerald-500/10'
      }`}>
        {icono}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-medium text-slate-200 truncate">{categoria}</span>
          <span className="text-[10px] text-slate-600 capitalize flex-shrink-0">{item.persona}</span>
        </div>
        {item.descripcion && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{item.descripcion}</p>
        )}
        {isGasto && item.medios_pago?.nombre && (
          <p className="text-[10px] text-slate-600 mt-0.5">{item.medios_pago.nombre}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        <p className={`text-sm font-semibold tabular-nums ${isGasto ? 'text-rose-400' : 'text-emerald-400'}`}>
          {isGasto ? '−' : '+'}{fmtMonto(item.monto, item.moneda)}
        </p>
      </div>
    </button>
  )
}

export default function Historico() {
  const { showToast } = useToast()
  const { rubros } = useRubros()
  const { mediosPago } = useMediosPago()
  const { tipos: tiposIngreso } = useTiposIngreso()

  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    desde: inicioMesStr(),
    hasta: hoyStr(),
    rubro: '',
    persona: '',
    moneda: '',
    origen: '',
  })

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 400)
    return () => clearTimeout(t)
  }, [busqueda])

  const filtrosConBusqueda = useMemo(
    () => ({ ...filtros, busqueda: busquedaDebounced }),
    [filtros, busquedaDebounced]
  )

  const { items, loading, refetch } = useHistorico(filtrosConBusqueda)

  const set = (key, val) => setFiltros(f => ({ ...f, [key]: val }))
  const toggle = (key, val) => setFiltros(f => ({ ...f, [key]: f[key] === val ? '' : val }))

  const activeFilterCount = [
    filtros.tipo !== 'todos',
    filtros.rubro,
    filtros.persona,
    filtros.moneda,
    filtros.origen,
  ].filter(Boolean).length

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      if (!map.has(item.fecha)) map.set(item.fecha, [])
      map.get(item.fecha).push(item)
    }
    return Array.from(map.entries())
  }, [items])

  const totales = useMemo(() => ({
    gastoARS: items.filter(i => i._tipo === 'gasto' && i.moneda === 'ARS').reduce((s, i) => s + Number(i.monto), 0),
    gastoUSD: items.filter(i => i._tipo === 'gasto' && i.moneda === 'USD').reduce((s, i) => s + Number(i.monto), 0),
    ingresoARS: items.filter(i => i._tipo === 'ingreso' && i.moneda === 'ARS').reduce((s, i) => s + Number(i.monto), 0),
    ingresoUSD: items.filter(i => i._tipo === 'ingreso' && i.moneda === 'USD').reduce((s, i) => s + Number(i.monto), 0),
  }), [items])

  return (
    <div className="pb-4">

      {/* ── STICKY SEARCH + FILTER BAR ───────────────────── */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 space-y-3">

        {/* Search + action buttons */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por descripción…"
              className="w-full pl-9 pr-8 py-2 bg-slate-800 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFiltros(v => !v)}
            className={`relative p-2.5 rounded-xl transition-colors ${
              showFiltros ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter size={17} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-bold text-slate-900 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { exportCSV(items); showToast('CSV exportado') }}
            disabled={items.length === 0}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            title="Exportar CSV"
          >
            <Download size={17} />
          </button>
        </div>

        {/* ── FILTER PANEL ──────────────────────────────── */}
        {showFiltros && (
          <div className="space-y-3 pb-1">

            {/* Tipo */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Tipo</p>
              <div className="flex gap-1.5">
                {[['todos', 'Todos'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos']].map(([val, lbl]) => (
                  <button key={val} onClick={() => set('tipo', val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filtros.tipo === val ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Período */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Período</p>
              <div className="flex items-center gap-2">
                <input type="date" value={filtros.desde} onChange={e => set('desde', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]" />
                <span className="text-slate-600 text-xs">→</span>
                <input type="date" value={filtros.hasta} onChange={e => set('hasta', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]" />
              </div>
            </div>

            {/* Persona */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Persona</p>
              <div className="flex gap-1.5">
                {['mati', 'sofi', 'hogar'].map(p => (
                  <button key={p} onClick={() => toggle('persona', p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                      filtros.persona === p ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Moneda */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Moneda</p>
              <div className="flex gap-1.5">
                {['ARS', 'USD'].map(m => (
                  <button key={m} onClick={() => toggle('moneda', m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filtros.moneda === m ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Rubro (solo si muestra gastos) */}
            {filtros.tipo !== 'ingreso' && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Rubro</p>
                <div className="flex gap-1.5 flex-wrap">
                  {rubros.map(r => (
                    <button key={r.id} onClick={() => toggle('rubro', r.nombre)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        filtros.rubro === r.nombre ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}>
                      {r.icono} {r.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Origen (solo gastos) */}
            {filtros.tipo !== 'ingreso' && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Origen</p>
                <div className="flex gap-1.5">
                  {[['manual', 'Manual'], ['pdf', 'PDF']].map(([val, lbl]) => (
                    <button key={val} onClick={() => toggle('origen', val)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        filtros.origen === val ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <button
                onClick={() => setFiltros(f => ({ ...f, tipo: 'todos', rubro: '', persona: '', moneda: '', origen: '' }))}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── SUMMARY BAR ───────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-800/50">
          {totales.gastoARS > 0 && (
            <span className="text-xs text-slate-500">
              Gastos: <span className="text-rose-400 font-medium">{fmtMonto(totales.gastoARS, 'ARS')}</span>
            </span>
          )}
          {totales.gastoUSD > 0 && (
            <span className="text-xs text-slate-500">
              Gastos: <span className="text-rose-400 font-medium">{fmtMonto(totales.gastoUSD, 'USD')}</span>
            </span>
          )}
          {totales.ingresoARS > 0 && (
            <span className="text-xs text-slate-500">
              Ingresos: <span className="text-emerald-400 font-medium">{fmtMonto(totales.ingresoARS, 'ARS')}</span>
            </span>
          )}
          {totales.ingresoUSD > 0 && (
            <span className="text-xs text-slate-500">
              Ingresos: <span className="text-emerald-400 font-medium">{fmtMonto(totales.ingresoUSD, 'USD')}</span>
            </span>
          )}
          <span className="text-xs text-slate-600 ml-auto">{items.length} registros</span>
        </div>
      )}

      {/* ── LIST ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-slate-500">Sin movimientos</p>
          <p className="text-slate-600 text-sm">Ajustá los filtros o cargá movimientos</p>
        </div>
      ) : (
        <div>
          {grouped.map(([fecha, grupo]) => (
            <div key={fecha}>
              <div className="px-4 py-2 bg-slate-800/30">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider capitalize">
                  {fmtFechaGrupo(fecha)}
                </span>
              </div>
              <div className="divide-y divide-slate-800/40">
                {grupo.map(item => (
                  <ItemRow
                    key={`${item._tipo}-${item.id}`}
                    item={item}
                    rubros={rubros}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DETAIL / EDIT MODAL ───────────────────────────── */}
      {selectedItem && (
        <MovimientoModal
          item={selectedItem}
          rubros={rubros}
          mediosPago={mediosPago}
          tiposIngreso={tiposIngreso}
          onClose={() => setSelectedItem(null)}
          onSaved={() => { setSelectedItem(null); refetch() }}
          onDeleted={() => { setSelectedItem(null); refetch(); showToast('Registro eliminado') }}
        />
      )}
    </div>
  )
}
