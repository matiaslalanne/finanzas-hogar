import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function calcSaldo(ubicacion, movimientos) {
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

export function useAhorros() {
  const [ubicaciones, setUbicaciones] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase.from('ubicaciones_ahorro').select('*').eq('activo', true).order('nombre'),
      supabase
        .from('movimientos_ahorro')
        .select('*, origen:ubicacion_origen(id,nombre,moneda), destino:ubicacion_destino(id,nombre,moneda)')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
    ]).then(([{ data: ubics }, { data: movs }]) => {
      if (cancelled) return
      const ubicsList = ubics ?? []
      const movsList = movs ?? []
      setUbicaciones(ubicsList.map(u => ({ ...u, saldo: calcSaldo(u, movsList) })))
      setMovimientos(movsList)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [tick])

  return { ubicaciones, movimientos, loading, refetch: () => setTick(t => t + 1) }
}
