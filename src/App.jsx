import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import LoginPage from './pages/LoginPage'
import PersonaSelector from './components/auth/PersonaSelector'
import AppShell from './pages/AppShell'
import CargarGasto from './pages/CargarGasto'
import CargarIngreso from './pages/CargarIngreso'
import Historico from './pages/Historico'
import Ahorros from './pages/Ahorros'
import Dashboard from './pages/Dashboard'
import MasMenu from './pages/MasMenu'
import MetasPage from './pages/MetasPage'
import RecurrentesPage from './pages/RecurrentesPage'
import ImportarPDFPage from './pages/ImportarPDFPage'
import AdminPage from './pages/AdminPage'
import { generarRecurrentes } from './lib/generarRecurrentes'
import OfflineSync from './components/OfflineSync'
import InstallPrompt from './components/InstallPrompt'

function Cargando() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function RutaProtegida() {
  const { session, loading, persona } = useAuth()

  useEffect(() => {
    if (session) generarRecurrentes().catch(() => {})
  }, [session])

  if (loading) return <Cargando />
  if (!session) return <Navigate to="/login" replace />
  if (!persona) return <PersonaSelector />
  return <Outlet />
}

function LoginRoute() {
  const { session, loading } = useAuth()
  if (loading) return <Cargando />
  if (session) return <Navigate to="/" replace />
  return <LoginPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <OfflineSync />
          <InstallPrompt />
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<RutaProtegida />}>
              {/* Pantallas full-screen (sin nav inferior) */}
              <Route path="/cargar" element={<CargarGasto />} />
              <Route path="/cargar/ingreso" element={<CargarIngreso />} />
              {/* App shell con nav inferior */}
              <Route path="/" element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="ahorros" element={<Ahorros />} />
                <Route path="historico" element={<Historico />} />
                <Route path="mas" element={<MasMenu />} />
                <Route path="mas/metas" element={<MetasPage />} />
                <Route path="mas/recurrentes" element={<RecurrentesPage />} />
                <Route path="mas/importar" element={<ImportarPDFPage />} />
                <Route path="mas/admin" element={<AdminPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
