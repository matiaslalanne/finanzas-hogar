import { useNavigate } from 'react-router-dom'
import { Target, RefreshCcw, FileUp, Settings2, ChevronRight } from 'lucide-react'

const ITEMS = [
  {
    to: '/mas/metas',
    Icon: Target,
    label: 'Metas de ahorro',
    desc: 'Objetivos y progreso',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    to: '/mas/recurrentes',
    Icon: RefreshCcw,
    label: 'Gastos recurrentes',
    desc: 'Alquiler, suscripciones y más',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    to: '/mas/importar',
    Icon: FileUp,
    label: 'Importar resumen',
    desc: 'PDF de tarjeta con IA',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    to: '/mas/admin',
    Icon: Settings2,
    label: 'Administrador',
    desc: 'Rubros, medios de pago, cierres',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
  },
]

export default function MasMenu() {
  const navigate = useNavigate()
  return (
    <div className="px-4 pt-4 pb-8 space-y-2">
      {ITEMS.map(({ to, Icon, label, desc, color, bg }) => (
        <button
          key={to}
          onClick={() => navigate(to)}
          className="w-full flex items-center gap-4 px-4 py-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-700/80 rounded-2xl transition-colors text-left"
        >
          <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={22} className={color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
          <ChevronRight size={18} className="text-slate-600 flex-shrink-0" />
        </button>
      ))}
    </div>
  )
}
