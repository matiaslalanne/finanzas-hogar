import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useHistorico(filtros) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function run() {
      const { tipo, desde, hasta, rubro, persona, moneda, origen, busqueda } = filtros
      const promises = []

      if (tipo !== 'ingreso') {
        let q = supabase.from('gastos').select('*, medios_pago(nombre)')
        if (desde) q = q.gte('fecha', desde)
        if (hasta) q = q.lte('fecha', hasta)
        if (rubro) q = q.eq('rubro', rubro)
        if (persona) q = q.eq('persona', persona)
        if (moneda) q = q.eq('moneda', moneda)
        if (origen) q = q.eq('origen', origen)
        if (busqueda) q = q.ilike('descripcion', `%${busqueda}%`)
        promises.push(
          q.order('fecha', { ascending: false })
           .order('created_at', { ascending: false })
           .then(({ data }) => (data ?? []).map(g => ({ ...g, _tipo: 'gasto' })))
        )
      }

      if (tipo !== 'gasto') {
        let q = supabase.from('ingresos').select('*')
        if (desde) q = q.gte('fecha', desde)
        if (hasta) q = q.lte('fecha', hasta)
        if (persona) q = q.eq('persona', persona)
        if (moneda) q = q.eq('moneda', moneda)
        if (busqueda) q = q.ilike('descripcion', `%${busqueda}%`)
        promises.push(
          q.order('fecha', { ascending: false })
           .order('created_at', { ascending: false })
           .then(({ data }) => (data ?? []).map(i => ({ ...i, _tipo: 'ingreso' })))
        )
      }

      const results = await Promise.all(promises)
      if (cancelled) return

      const merged = results.flat().sort((a, b) => {
        const fd = b.fecha.localeCompare(a.fecha)
        if (fd !== 0) return fd
        return (b.created_at ?? '').localeCompare(a.created_at ?? '')
      })

      setItems(merged)
      setLoading(false)
    }

    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filtros), tick])

  return { items, loading, refetch: () => setTick(t => t + 1) }
}
