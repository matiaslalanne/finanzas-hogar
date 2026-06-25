import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const PERSONAS = [
  {
    id: 'sofi',
    nombre: 'Sofi',
    emoji: '👩',
    ring: 'ring-violet-400',
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    check: 'text-violet-400',
  },
  {
    id: 'mati',
    nombre: 'Mati',
    emoji: '👨',
    ring: 'ring-cyan-400',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    check: 'text-cyan-400',
  },
]

export default function PersonaSelector() {
  const { setPersona } = useAuth()
  const [seleccionada, setSeleccionada] = useState(null)

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-slate-100">¿Quién sos?</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Este dispositivo te va a recordar.
            <br />
            Podés cambiarlo desde ajustes.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSeleccionada(p.id)}
              className={`relative flex flex-col items-center justify-center gap-3 p-7 rounded-2xl ring-2 transition-all ${
                seleccionada === p.id
                  ? `${p.ring} ${p.bg}`
                  : 'ring-slate-700 bg-slate-800 hover:ring-slate-500 hover:bg-slate-750'
              }`}
            >
              {seleccionada === p.id && (
                <span className={`absolute top-3 right-3 ${p.check}`}>
                  <CheckCircle2 size={18} />
                </span>
              )}
              <span className="text-5xl leading-none">{p.emoji}</span>
              <span
                className={`font-semibold text-lg ${
                  seleccionada === p.id ? p.text : 'text-slate-200'
                }`}
              >
                {p.nombre}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => seleccionada && setPersona(seleccionada)}
          disabled={!seleccionada}
          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl transition-colors"
        >
          Listo, entrar
        </button>
      </div>
    </div>
  )
}
