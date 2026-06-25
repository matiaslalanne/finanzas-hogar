import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Plus, PiggyBank, History, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/',          label: 'Inicio',    icon: Home,            end: true },
  { to: '/cargar',    label: 'Cargar',    icon: Plus             },
  { to: '/ahorros',   label: 'Ahorros',   icon: PiggyBank        },
  { to: '/historico', label: 'Histórico', icon: History          },
  { to: '/mas',       label: 'Más',       icon: MoreHorizontal   },
]

const safeTop = { paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }
const safeBottom = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
const safeFAB = { bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }

export default function AppShell() {
  const navigate = useNavigate()
  const { persona } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Header */}
      <header
        style={safeTop}
        className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 pb-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="font-semibold text-slate-100 text-sm">Finanzas Hogar</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-500">Hola,</span>
          <span className="font-medium text-emerald-400 capitalize">{persona}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/cargar')}
        style={safeFAB}
        className="fixed right-4 z-30 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 active:scale-95 rounded-full shadow-lg shadow-emerald-900/50 flex items-center justify-center transition-all"
        aria-label="Cargar gasto rápido"
      >
        <Plus size={28} className="text-slate-900" strokeWidth={2.5} />
      </button>

      {/* Bottom nav */}
      <nav
        style={safeBottom}
        className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900 border-t border-slate-800 flex"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs transition-colors ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
