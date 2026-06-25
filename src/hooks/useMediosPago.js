import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useMediosPago() {
  const [mediosPago, setMediosPago] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('medios_pago')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        setMediosPago(data ?? [])
        setLoading(false)
      })
  }, [])

  return { mediosPago, loading }
}
