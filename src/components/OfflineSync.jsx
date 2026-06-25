import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getQueue, removeFromQueue, queueSize } from '../lib/offlineQueue'
import { useToast } from '../contexts/ToastContext'

export default function OfflineSync() {
  const { showToast } = useToast()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(queueSize)
  const syncing = useRef(false)

  const syncQueue = async () => {
    if (syncing.current) return
    const queue = getQueue()
    if (queue.length === 0) return
    syncing.current = true
    let synced = 0
    for (const item of queue) {
      const { _id, _at, ...gasto } = item
      const { error } = await supabase.from('gastos').insert(gasto)
      if (!error) {
        removeFromQueue(_id)
        synced++
      }
    }
    syncing.current = false
    const remaining = queueSize()
    setPending(remaining)
    if (synced > 0) {
      showToast(`${synced} gasto${synced > 1 ? 's' : ''} sincronizado${synced > 1 ? 's' : ''} ✓`)
    }
  }

  useEffect(() => {
    if (navigator.onLine) syncQueue()

    const handleOnline = () => {
      setIsOnline(true)
      syncQueue()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setPending(queueSize())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && pending === 0) return null

  return (
    <div
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white backdrop-blur ${
        isOnline ? 'bg-amber-500/90' : 'bg-slate-700/90'
      }`}
    >
      {isOnline ? (
        <>
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          Sincronizando {pending} gasto{pending !== 1 ? 's' : ''} pendiente{pending !== 1 ? 's' : ''}…
        </>
      ) : (
        <>
          <WifiOff size={14} />
          Sin conexión — los gastos se guardan localmente
        </>
      )}
    </div>
  )
}
