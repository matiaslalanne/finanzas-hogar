import { Delete } from 'lucide-react'

const ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  [',', '0', '⌫'],
]

export default function NumericKeypad({ onKey }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 px-3 pt-3 pb-1">
      {ROWS.flat().map((key) => (
        <button
          key={key}
          onClick={() => onKey(key)}
          className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 select-none ${
            key === '⌫'
              ? 'bg-slate-700/80 text-rose-400 hover:bg-slate-600'
              : key === ','
              ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
              : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
          }`}
        >
          {key === '⌫' ? <Delete size={22} className="mx-auto" /> : key}
        </button>
      ))}
    </div>
  )
}
