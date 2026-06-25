import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = useCallback((mensaje, tipo = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ mensaje, tipo })
    timerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          className={`fixed top-safe-or-4 top-4 left-4 right-4 z-[100] rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-3 text-sm font-semibold ${
            toast.tipo === 'success'
              ? 'bg-emerald-500 text-slate-900'
              : toast.tipo === 'error'
              ? 'bg-rose-500 text-white'
              : 'bg-slate-700 text-slate-100'
          }`}
        >
          {toast.tipo === 'success' && <CheckCircle2 size={18} className="flex-shrink-0" />}
          {toast.tipo === 'error' && <XCircle size={18} className="flex-shrink-0" />}
          <span>{toast.mensaje}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
