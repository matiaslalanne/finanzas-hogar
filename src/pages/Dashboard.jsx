import { useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useRubros } from '../hooks/useRubros'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function hoyYM() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function fmtARS(n) {
  return `$ ${Math.abs(Number(n)).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtUSD(n) {
  return `U$D ${Math.abs(Number(n)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pctDiff(actual, anterior) {
  if (!anterior) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}

function Skeleton() {
  return <div className="h-4 bg-slate-800 rounded-full animate-pulse" />
}

export default function Dashboard() {
  const { year: hoyYear, month: hoyMonth } = hoyYM()
  const [year, setYear] = useState(hoyYear)
  const [month, setMonth] = useState(hoyMonth)
  const { data, loading } = useDashboard(year, month)
  const { rubros } = useRubros()

  const esHoy = year === hoyYear && month === hoyMonth

  function prevMes() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMes() {
    if (esHoy) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const iconRubro = (nombre) => rubros.find(r => r.nombre === nombre)?.icono ?? '•'

  return (
    <div className="pb-8">

      {/* ── MES NAV ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <button onClick={prevMes} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-slate-200 capitalize">
          {MESES[month - 1]} {year}
        </span>
        <button
          onClick={nextMes}
          disabled={esHoy}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-20"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="px-4 pt-6 space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : !data ? null : (
        <>
          {/* ── BALANCE ─────────────────────────────────── */}
          <section className="px-4 pt-5 pb-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Balance del mes</p>
            <div className={`text-4xl font-bold tabular-nums ${
              data.balanceARS >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {data.balanceARS >= 0 ? '+' : '−'}{fmtARS(data.balanceARS)}
            </div>
            {data.gastosAntARS > 0 && (() => {
              const pct = pctDiff(data.gastosTotalARS, data.gastosAntARS)
              if (pct === null) return null
              const mejor = pct < 0
              return (
                <div className={`flex items-center gap-1 mt-2 text-xs ${mejor ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {mejor ? <TrendingDown size={13} /> : pct === 0 ? <Minus size={13} /> : <TrendingUp size={13} />}
                  <span>
                    Gastos {mejor ? `${Math.abs(pct)}% menos` : pct === 0 ? 'igual' : `${pct}% más`} que {MESES[month === 1 ? 11 : month - 2]}
                  </span>
                </div>
              )
            })()}
          </section>

          {/* ── INGRESOS / GASTOS ARS ───────────────────── */}
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest mb-1">Ingresos ARS</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">{fmtARS(data.ingresosTotalARS)}</p>
            </div>
            <div className="bg-rose-500/10 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-widest mb-1">Gastos ARS</p>
              <p className="text-lg font-bold text-rose-400 tabular-nums">{fmtARS(data.gastosTotalARS)}</p>
            </div>
          </div>

          {/* USD del mes (si hay) */}
          {(data.gastosTotalUSD > 0 || data.ingresosTotalUSD > 0) && (
            <div className="px-4 pb-4 grid grid-cols-2 gap-3">
              {data.ingresosTotalUSD > 0 && (
                <div className="bg-emerald-500/10 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest mb-1">Ingresos USD</p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">{fmtUSD(data.ingresosTotalUSD)}</p>
                </div>
              )}
              {data.gastosTotalUSD > 0 && (
                <div className="bg-rose-500/10 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-widest mb-1">Gastos USD</p>
                  <p className="text-lg font-bold text-rose-400 tabular-nums">{fmtUSD(data.gastosTotalUSD)}</p>
                </div>
              )}
            </div>
          )}

          {/* ── GASTOS POR RUBRO ────────────────────────── */}
          {data.gastosPorRubro.length > 0 && (
            <section className="px-4 pb-5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Gastos por rubro (ARS)
              </p>
              <div className="space-y-3">
                {data.gastosPorRubro.map(({ rubro, monto, pct }, i) => (
                  <div key={rubro} className="flex items-center gap-3">
                    <span className="w-6 text-center text-base leading-none flex-shrink-0">
                      {iconRubro(rubro)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xs text-slate-300 truncate">{rubro}</span>
                        <span className="text-xs font-medium text-slate-400 tabular-nums ml-2 flex-shrink-0">
                          {fmtARS(monto)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: `hsl(${Math.max(0, 10 - i * 1.5) * 10}, 70%, 55%)`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-600 w-7 text-right flex-shrink-0">{pct}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.gastosPorRubro.length === 0 && (
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-600 text-center py-4">Sin gastos en este período</p>
            </div>
          )}

          {/* ── AHORROS ─────────────────────────────────── */}
          <section className="px-4 pb-5 border-t border-slate-800 pt-5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Ahorros</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-800 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Total USD</p>
                <p className="text-lg font-bold text-slate-100 tabular-nums">{fmtUSD(data.totalUSD)}</p>
              </div>
              <div className="bg-slate-800 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Total ARS</p>
                <p className="text-lg font-bold text-slate-100 tabular-nums">{fmtARS(data.totalARSAhorros)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {data.ubicaciones.map(u => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40">
                  <span className="text-xs text-slate-400">{u.nombre}</span>
                  <span className="text-xs font-medium text-slate-300 tabular-nums">
                    {u.moneda === 'USD' ? fmtUSD(u.saldo) : fmtARS(u.saldo)}
                  </span>
                </div>
              ))}
              {data.ubicaciones.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-2">Sin ubicaciones cargadas</p>
              )}
            </div>
          </section>

          {/* ── METAS ───────────────────────────────────── */}
          {data.metas.length > 0 && (
            <section className="px-4 pb-5 border-t border-slate-800 pt-5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Metas</p>
              <div className="space-y-4">
                {data.metas.map(meta => (
                  <div key={meta.id}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200">{meta.nombre}</span>
                          {meta.cumplida && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                              ✓ Cumplida
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fmtUSD(meta.actual)} de {fmtUSD(meta.monto_objetivo)}
                          {meta.fecha_objetivo && (
                            <span className="ml-1 text-slate-600">
                              · objetivo {new Date(meta.fecha_objetivo).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${meta.cumplida ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {meta.pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${meta.cumplida ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${meta.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
