import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [hidden, setHidden] = useState(
    () => sessionStorage.getItem('install_dismissed') === '1'
  )

  useEffect(() => {
    const handler = e => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
  }

  const handleDismiss = () => {
    setHidden(true)
    sessionStorage.setItem('install_dismissed', '1')
  }

  if (!prompt || hidden) return null

  return (
    <div className="fixed bottom-24 inset-x-4 z-50 bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
        💰
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">Instalar Finanzas Hogar</p>
        <p className="text-xs text-slate-400 mt-0.5">Acceso rápido desde tu pantalla de inicio</p>
      </div>
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-xs font-semibold text-white flex-shrink-0"
      >
        Instalar
      </button>
      <button onClick={handleDismiss} className="p-1 text-slate-500 hover:text-slate-300 flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}
