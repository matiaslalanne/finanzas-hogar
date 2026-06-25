import LoginForm from '../components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="text-6xl mb-4">💰</div>
          <h1 className="text-3xl font-bold text-slate-100">Finanzas Hogar</h1>
          <p className="text-slate-400 text-sm">Mati &amp; Sofi</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
