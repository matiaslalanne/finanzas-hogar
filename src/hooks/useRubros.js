import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRubros() {
  const [rubros, setRubros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('rubros')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        setRubros(data ?? [])
        setLoading(false)
      })
  }, [])

  return { rubros, loading }
}
