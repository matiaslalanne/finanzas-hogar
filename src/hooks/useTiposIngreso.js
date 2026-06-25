import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTiposIngreso() {
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('tipos_ingreso')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        setTipos(data ?? [])
        setLoading(false)
      })
  }, [])

  return { tipos, loading }
}
