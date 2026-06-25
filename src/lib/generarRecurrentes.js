import { supabase } from './supabase'

export async function generarRecurrentes() {
  const hoy = new Date()
  const diaHoy = hoy.getDate()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

  const { data: recurrentes, error } = await supabase
    .from('gastos_recurrentes')
    .select('*')
    .eq('activo', true)
    .lte('dia_del_mes', diaHoy)

  if (error || !recurrentes?.length) return

  const { data: yaExisten } = await supabase
    .from('gastos')
    .select('rubro, monto, moneda')
    .eq('origen', 'recurrente')
    .gte('fecha', `${mesActual}-01`)
    .lte('fecha', `${mesActual}-31`)

  const generados = new Set((yaExisten ?? []).map(g => `${g.rubro}|${g.monto}|${g.moneda}`))

  const nuevos = recurrentes.filter(r => !generados.has(`${r.rubro}|${r.monto}|${r.moneda}`))
  if (!nuevos.length) return

  await supabase.from('gastos').insert(
    nuevos.map(r => ({
      fecha: `${mesActual}-${String(r.dia_del_mes).padStart(2, '0')}`,
      monto: r.monto,
      moneda: r.moneda,
      rubro: r.rubro,
      medio_pago_id: null,
      persona: 'hogar',
      descripcion: r.descripcion ?? null,
      origen: 'recurrente',
    }))
  )
}
