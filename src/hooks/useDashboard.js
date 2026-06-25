import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function calcSaldoUbic(ubicacion, movimientos) {
  let saldo = 0
  const { id, moneda } = ubicacion
  for (const m of movimientos) {
    const esDest = m.ubicacion_destino === id
    const esOrig = m.ubicacion_origen === id
    if (!esDest && !esOrig) continue
    let delta = 0
    if (m.tipo === 'compra_usd') {
      if (esOrig && moneda === 'ARS') delta = -Number(m.monto_pesos ?? 0)
      else if (esDest && moneda === 'USD') delta = Number(m.monto)
    } else if (m.tipo === 'venta_usd') {
      if (esOrig && moneda === 'USD') delta = -Number(m.monto)
      else if (esDest && moneda === 'ARS') delta = Number(m.monto_pesos ?? 0)
    } else {
      if (esDest) delta = Number(m.monto)
      if (esOrig) delta = -Number(m.monto)
    }
    saldo += delta
  }
  return saldo
}

function pad(n) { return String(n).padStart(2, '0') }

export function useDashboard(year, month) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const desde = `${year}-${pad(month)}-01`
    const hasta = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`

    const prevDate = new Date(year, month - 2, 1)
    const pY = prevDate.getFullYear(), pM = prevDate.getMonth() + 1
    const prevDesde = `${pY}-${pad(pM)}-01`
    const prevHasta = `${pY}-${pad(pM)}-${pad(new Date(pY, pM, 0).getDate())}`

    Promise.all([
      // gastos mes actual ARS
      supabase.from('gastos').select('rubro, monto').eq('moneda', 'ARS').gte('fecha', desde).lte('fecha', hasta),
      // gastos mes actual USD
      supabase.from('gastos').select('rubro, monto').eq('moneda', 'USD').gte('fecha', desde).lte('fecha', hasta),
      // ingresos mes actual
      supabase.from('ingresos').select('monto, moneda').gte('fecha', desde).lte('fecha', hasta),
      // gastos mes anterior ARS (solo total)
      supabase.from('gastos').select('monto').eq('moneda', 'ARS').gte('fecha', prevDesde).lte('fecha', prevHasta),
      // ingresos mes anterior ARS
      supabase.from('ingresos').select('monto').eq('moneda', 'ARS').gte('fecha', prevDesde).lte('fecha', prevHasta),
      // ubicaciones + movimientos para saldos
      supabase.from('ubicaciones_ahorro').select('*').eq('activo', true).order('nombre'),
      supabase.from('movimientos_ahorro').select('*'),
      // metas
      supabase.from('metas').select('*').eq('activa', true).order('es_fondo_emergencia', { ascending: false }),
    ]).then(([
      { data: gARS },
      { data: gUSD },
      { data: ingresos },
      { data: gPrevARS },
      { data: iPrevARS },
      { data: ubics },
      { data: movs },
      { data: metas },
    ]) => {
      if (cancelled) return

      // Totales del mes
      const gastosTotalARS = (gARS ?? []).reduce((s, g) => s + Number(g.monto), 0)
      const gastosTotalUSD = (gUSD ?? []).reduce((s, g) => s + Number(g.monto), 0)
      const ingresosTotalARS = (ingresos ?? []).filter(i => i.moneda === 'ARS').reduce((s, i) => s + Number(i.monto), 0)
      const ingresosTotalUSD = (ingresos ?? []).filter(i => i.moneda === 'USD').reduce((s, i) => s + Number(i.monto), 0)

      // Totales mes anterior
      const gastosAntARS = (gPrevARS ?? []).reduce((s, g) => s + Number(g.monto), 0)
      const ingresosAntARS = (iPrevARS ?? []).reduce((s, i) => s + Number(i.monto), 0)

      // Gastos por rubro (ARS)
      const porRubro = {}
      for (const g of gARS ?? []) {
        porRubro[g.rubro] = (porRubro[g.rubro] ?? 0) + Number(g.monto)
      }
      const maxRubro = Math.max(...Object.values(porRubro), 1)
      const gastosPorRubro = Object.entries(porRubro)
        .sort(([, a], [, b]) => b - a)
        .map(([rubro, monto]) => ({ rubro, monto, pct: Math.round((monto / maxRubro) * 100) }))

      // Ahorros
      const ubicsList = ubics ?? []
      const movsList = movs ?? []
      const ubicacionesConSaldo = ubicsList.map(u => ({ ...u, saldo: calcSaldoUbic(u, movsList) }))
      const totalUSD = ubicacionesConSaldo.filter(u => u.moneda === 'USD').reduce((s, u) => s + u.saldo, 0)
      const totalARSAhorros = ubicacionesConSaldo.filter(u => u.moneda === 'ARS').reduce((s, u) => s + u.saldo, 0)

      // Metas con progreso
      const metasList = metas ?? []
      const fondo = metasList.find(m => m.es_fondo_emergencia)
      const fondoObj = fondo ? Number(fondo.monto_objetivo) : 0
      const sobrante = Math.max(0, totalUSD - fondoObj)

      const metasConProgreso = metasList.map(m => {
        const obj = Number(m.monto_objetivo)
        const actual = m.es_fondo_emergencia ? Math.min(totalUSD, obj) : Math.min(sobrante, obj)
        const pct = obj > 0 ? Math.min(100, Math.round((actual / obj) * 100)) : 0
        return { ...m, actual, pct, cumplida: actual >= obj }
      })

      setData({
        gastosTotalARS,
        gastosTotalUSD,
        ingresosTotalARS,
        ingresosTotalUSD,
        gastosAntARS,
        ingresosAntARS,
        balanceARS: ingresosTotalARS - gastosTotalARS,
        balanceAntARS: ingresosAntARS - gastosAntARS,
        gastosPorRubro,
        ubicaciones: ubicacionesConSaldo,
        totalUSD,
        totalARSAhorros,
        metas: metasConProgreso,
      })
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [year, month])

  return { data, loading }
}
