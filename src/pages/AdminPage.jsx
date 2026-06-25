import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

// ── Constants ────────────────────────────────────────────────────────────────

const TIPOS_MEDIO = [
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'tarjeta_debito', label: 'Tarjeta débito' },
  { value: 'cuenta_banco', label: 'Cuenta banco' },
  { value: 'billetera', label: 'Billetera' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
]

const TITULARES = [
  { value: 'mati', label: 'Mati' },
  { value: 'sofi', label: 'Sofi' },
  { value: 'hogar', label: 'Hogar' },
]

const MONEDAS = [
  { value: 'ARS', label: 'ARS $' },
  { value: 'USD', label: 'USD U$D' },
]

const TIPO_SHORT = {
  tarjeta_credito: 'TC', tarjeta_debito: 'TD', cuenta_banco: 'Banco',
  billetera: 'Billetera', efectivo: 'Efectivo', transferencia: 'Transf.',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcSaldo(ubicacion, movimientos) {
  let saldo = 0
  const { id, moneda } = ubicacion
  for (const m of movimientos) {
    const esDest = m.ubicacion_destino === id
    const esOrig = m.ubicacion_origen === id
    if (!esDest && !esOrig) continue
    let delta = 0
    if (m.tipo === 'compra_usd') {
      if (esOrig && moneda === 'ARS') delta = -Number(m.monto_pesos ?? 0)
      else if (esDest && moneda === 'USD') delta = Number(m.monto)
    } else if (m.tipo === 'venta_usd') {
      if (esOrig && moneda === 'USD') delta = -Number(m.monto)
      else if (esDest && moneda === 'ARS') delta = Number(m.monto_pesos ?? 0)
    } else {
      if (esDest) delta = Number(m.monto)
      if (esOrig) delta = -Number(m.monto)
    }
    saldo += delta
  }
  return saldo
}

function fmtARS(n) {
  return `$ ${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
function fmtUSD(n) {
  return `U$D ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center pt-12">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-800 rounded-t-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-1 text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4 pb-8 space-y-4">
          {children}
        </div>
      </div>
    </>
  )
}

function Chips({ options, value, onChange, label }) {
  return (
    <div>
      {label && <p className="text-xs text-slate-400 mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              value === o.value
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TextInput({ label, ...props }) {
  return (
    <div>
      {label && <p className="text-xs text-slate-400 mb-1.5">{label}</p>}
      <input
        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        {...props}
      />
    </div>
  )
}

function GuardarBtn({ onClick, saving, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || saving}
      className="w-full py-3.5 rounded-2xl bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-sm"
    >
      {saving ? 'Guardando...' : 'Guardar'}
    </button>
  )
}

function ConfirmDialog({ open, msg, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-2xl p-6 border border-slate-700 w-full max-w-sm">
        <p className="text-sm text-slate-200 mb-6">{msg}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-sm text-slate-300">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

function NewBtn({ onClick, label }) {
  return (
    <div className="flex justify-end mb-4">
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white"
      >
        <Plus size={16} /> {label}
      </button>
    </div>
  )
}

function ItemRow({ item, label, sub, icon, onEdit, onDelete, onToggle }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${item.activo ? 'bg-slate-800' : 'bg-slate-800/40'}`}>
      {icon !== undefined && (
        <span className="text-xl w-8 text-center flex-shrink-0">{icon || '📦'}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${item.activo ? 'text-slate-200' : 'text-slate-500'}`}>
          {label}
        </p>
        {sub && <p className="text-xs text-slate-500 truncate mt-0.5">{sub}</p>}
      </div>
      <button onClick={onToggle} className="p-1.5 flex-shrink-0">
        {item.activo
          ? <ToggleRight size={22} className="text-emerald-400" />
          : <ToggleLeft size={22} className="text-slate-600" />}
      </button>
      <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-200 flex-shrink-0">
        <Pencil size={16} />
      </button>
      <button onClick={onDelete} className="p-1.5 text-red-500/60 hover:text-red-400 flex-shrink-0">
        <Trash2 size={16} />
      </button>
    </div>
  )
}

// ── RUBROS TAB ───────────────────────────────────────────────────────────────

function RubrosTab() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState({ open: false, item: null })
  const [form, setForm] = useState({ nombre: '', icono: '' })
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const load = async () => {
    const { data } = await supabase.from('rubros').select('*').order('nombre')
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm({ nombre: '', icono: '' }); setSheet({ open: true, item: null }) }
  const openEdit = item => { setForm({ nombre: item.nombre, icono: item.icono ?? '' }); setSheet({ open: true, item }) }
  const closeSheet = () => setSheet({ open: false, item: null })

  const handleSave = async () => {
    if (!form.nombre.trim()) return showToast('Ingresá un nombre', 'error')
    setSaving(true)
    const payload = { nombre: form.nombre.trim(), icono: form.icono.trim() || null }
    const { error } = sheet.item
      ? await supabase.from('rubros').update(payload).eq('id', sheet.item.id)
      : await supabase.from('rubros').insert(payload)
    setSaving(false)
    if (error) return showToast(error.message ?? 'Error al guardar', 'error')
    closeSheet()
    showToast(sheet.item ? 'Rubro actualizado' : 'Rubro creado')
    load()
  }

  const handleToggle = async item => {
    await supabase.from('rubros').update({ activo: !item.activo }).eq('id', item.id)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('rubros').delete().eq('id', confirm.id)
    setConfirm({ open: false, id: null })
    if (error) return showToast('No se puede eliminar (en uso)', 'error')
    showToast('Rubro eliminado')
    load()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <NewBtn onClick={openNew} label="Nuevo rubro" />
      <div className="space-y-2">
        {items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            label={item.nombre}
            icon={item.icono}
            onEdit={() => openEdit(item)}
            onDelete={() => setConfirm({ open: true, id: item.id })}
            onToggle={() => handleToggle(item)}
          />
        ))}
      </div>

      <BottomSheet open={sheet.open} onClose={closeSheet} title={sheet.item ? 'Editar rubro' : 'Nuevo rubro'}>
        <TextInput
          label="Nombre"
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Supermercado"
        />
        <TextInput
          label="Icono (emoji)"
          value={form.icono}
          onChange={e => setForm(f => ({ ...f, icono: e.target.value }))}
          placeholder="🛒"
          maxLength={4}
        />
        <GuardarBtn onClick={handleSave} saving={saving} disabled={!form.nombre.trim()} />
      </BottomSheet>

      <ConfirmDialog
        open={confirm.open}
        msg="¿Eliminar este rubro? Los gastos asociados quedarán sin categoría."
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, id: null })}
      />
    </div>
  )
}

// ── MEDIOS DE PAGO TAB ───────────────────────────────────────────────────────

function MediosPagoTab() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState({ open: false, item: null })
  const [form, setForm] = useState({ nombre: '', tipo: 'tarjeta_credito', banco: '', titular: 'mati', moneda: 'ARS' })
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const load = async () => {
    const { data } = await supabase.from('medios_pago').select('*').order('nombre')
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm({ nombre: '', tipo: 'tarjeta_credito', banco: '', titular: 'mati', moneda: 'ARS' })
    setSheet({ open: true, item: null })
  }
  const openEdit = item => {
    setForm({
      nombre: item.nombre,
      tipo: item.tipo,
      banco: item.banco ?? '',
      titular: item.titular ?? 'mati',
      moneda: item.moneda,
    })
    setSheet({ open: true, item })
  }
  const closeSheet = () => setSheet({ open: false, item: null })

  const handleSave = async () => {
    if (!form.nombre.trim()) return showToast('Ingresá un nombre', 'error')
    setSaving(true)
    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      banco: form.banco.trim() || null,
      titular: form.titular,
      moneda: form.moneda,
    }
    const { error } = sheet.item
      ? await supabase.from('medios_pago').update(payload).eq('id', sheet.item.id)
      : await supabase.from('medios_pago').insert(payload)
    setSaving(false)
    if (error) return showToast(error.message ?? 'Error al guardar', 'error')
    closeSheet()
    showToast(sheet.item ? 'Medio actualizado' : 'Medio creado')
    load()
  }

  const handleToggle = async item => {
    await supabase.from('medios_pago').update({ activo: !item.activo }).eq('id', item.id)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('medios_pago').delete().eq('id', confirm.id)
    setConfirm({ open: false, id: null })
    if (error) return showToast('No se puede eliminar (en uso)', 'error')
    showToast('Medio de pago eliminado')
    load()
  }

  const subLabel = item =>
    [
      TIPO_SHORT[item.tipo],
      item.banco,
      item.titular
        ? item.titular === 'hogar'
          ? 'Hogar'
          : item.titular.charAt(0).toUpperCase() + item.titular.slice(1)
        : null,
      item.moneda,
    ]
      .filter(Boolean)
      .join(' · ')

  if (loading) return <Spinner />

  return (
    <div>
      <NewBtn onClick={openNew} label="Nuevo medio" />
      <div className="space-y-2">
        {items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            label={item.nombre}
            sub={subLabel(item)}
            onEdit={() => openEdit(item)}
            onDelete={() => setConfirm({ open: true, id: item.id })}
            onToggle={() => handleToggle(item)}
          />
        ))}
      </div>

      <BottomSheet open={sheet.open} onClose={closeSheet} title={sheet.item ? 'Editar medio de pago' : 'Nuevo medio de pago'}>
        <TextInput
          label="Nombre"
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Visa ICBC Mati"
        />
        <Chips label="Tipo" options={TIPOS_MEDIO} value={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v }))} />
        <TextInput
          label="Banco (opcional)"
          value={form.banco}
          onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
          placeholder="ICBC"
        />
        <Chips label="Titular" options={TITULARES} value={form.titular} onChange={v => setForm(f => ({ ...f, titular: v }))} />
        <Chips label="Moneda" options={MONEDAS} value={form.moneda} onChange={v => setForm(f => ({ ...f, moneda: v }))} />
        <GuardarBtn onClick={handleSave} saving={saving} disabled={!form.nombre.trim()} />
      </BottomSheet>

      <ConfirmDialog
        open={confirm.open}
        msg="¿Eliminar este medio de pago? No es posible si está referenciado en gastos o importaciones."
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, id: null })}
      />
    </div>
  )
}

// ── UBICACIONES TAB ──────────────────────────────────────────────────────────

function UbicacionesTab() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState({ open: false, item: null })
  const [form, setForm] = useState({ nombre: '', moneda: 'USD' })
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const load = async () => {
    const { data } = await supabase.from('ubicaciones_ahorro').select('*').order('nombre')
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm({ nombre: '', moneda: 'USD' }); setSheet({ open: true, item: null }) }
  const openEdit = item => { setForm({ nombre: item.nombre, moneda: item.moneda }); setSheet({ open: true, item }) }
  const closeSheet = () => setSheet({ open: false, item: null })

  const handleSave = async () => {
    if (!form.nombre.trim()) return showToast('Ingresá un nombre', 'error')
    setSaving(true)
    const payload = { nombre: form.nombre.trim(), moneda: form.moneda }
    const { error } = sheet.item
      ? await supabase.from('ubicaciones_ahorro').update(payload).eq('id', sheet.item.id)
      : await supabase.from('ubicaciones_ahorro').insert(payload)
    setSaving(false)
    if (error) return showToast(error.message ?? 'Error al guardar', 'error')
    closeSheet()
    showToast(sheet.item ? 'Ubicación actualizada' : 'Ubicación creada')
    load()
  }

  const handleToggle = async item => {
    await supabase.from('ubicaciones_ahorro').update({ activo: !item.activo }).eq('id', item.id)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('ubicaciones_ahorro').delete().eq('id', confirm.id)
    setConfirm({ open: false, id: null })
    if (error) return showToast('No se puede eliminar (tiene movimientos)', 'error')
    showToast('Ubicación eliminada')
    load()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <NewBtn onClick={openNew} label="Nueva ubicación" />
      <div className="space-y-2">
        {items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            label={item.nombre}
            sub={item.moneda}
            onEdit={() => openEdit(item)}
            onDelete={() => setConfirm({ open: true, id: item.id })}
            onToggle={() => handleToggle(item)}
          />
        ))}
      </div>

      <BottomSheet open={sheet.open} onClose={closeSheet} title={sheet.item ? 'Editar ubicación' : 'Nueva ubicación'}>
        <TextInput
          label="Nombre"
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="ICBC Mati"
        />
        <Chips label="Moneda" options={MONEDAS} value={form.moneda} onChange={v => setForm(f => ({ ...f, moneda: v }))} />
        <GuardarBtn onClick={handleSave} saving={saving} disabled={!form.nombre.trim()} />
      </BottomSheet>

      <ConfirmDialog
        open={confirm.open}
        msg="¿Eliminar esta ubicación? No es posible si tiene movimientos asociados."
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, id: null })}
      />
    </div>
  )
}

// ── TIPOS DE INGRESO TAB ─────────────────────────────────────────────────────

function TiposIngresoTab() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState({ open: false, item: null })
  const [form, setForm] = useState({ nombre: '', moneda_default: 'ARS' })
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const load = async () => {
    const { data } = await supabase.from('tipos_ingreso').select('*').order('nombre')
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm({ nombre: '', moneda_default: 'ARS' }); setSheet({ open: true, item: null }) }
  const openEdit = item => { setForm({ nombre: item.nombre, moneda_default: item.moneda_default }); setSheet({ open: true, item }) }
  const closeSheet = () => setSheet({ open: false, item: null })

  const handleSave = async () => {
    if (!form.nombre.trim()) return showToast('Ingresá un nombre', 'error')
    setSaving(true)
    const payload = { nombre: form.nombre.trim(), moneda_default: form.moneda_default }
    const { error } = sheet.item
      ? await supabase.from('tipos_ingreso').update(payload).eq('id', sheet.item.id)
      : await supabase.from('tipos_ingreso').insert(payload)
    setSaving(false)
    if (error) return showToast(error.message ?? 'Error al guardar', 'error')
    closeSheet()
    showToast(sheet.item ? 'Tipo actualizado' : 'Tipo creado')
    load()
  }

  const handleToggle = async item => {
    await supabase.from('tipos_ingreso').update({ activo: !item.activo }).eq('id', item.id)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('tipos_ingreso').delete().eq('id', confirm.id)
    setConfirm({ open: false, id: null })
    if (error) return showToast('No se puede eliminar (en uso)', 'error')
    showToast('Tipo de ingreso eliminado')
    load()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <NewBtn onClick={openNew} label="Nuevo tipo" />
      <div className="space-y-2">
        {items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            label={item.nombre}
            sub={item.moneda_default}
            onEdit={() => openEdit(item)}
            onDelete={() => setConfirm({ open: true, id: item.id })}
            onToggle={() => handleToggle(item)}
          />
        ))}
      </div>

      <BottomSheet open={sheet.open} onClose={closeSheet} title={sheet.item ? 'Editar tipo de ingreso' : 'Nuevo tipo de ingreso'}>
        <TextInput
          label="Nombre"
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Sueldo ARS"
        />
        <Chips
          label="Moneda por defecto"
          options={MONEDAS}
          value={form.moneda_default}
          onChange={v => setForm(f => ({ ...f, moneda_default: v }))}
        />
        <GuardarBtn onClick={handleSave} saving={saving} disabled={!form.nombre.trim()} />
      </BottomSheet>

      <ConfirmDialog
        open={confirm.open}
        msg="¿Eliminar este tipo de ingreso?"
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, id: null })}
      />
    </div>
  )
}

// ── CIERRE DE MES TAB ────────────────────────────────────────────────────────

function CierreMesTab() {
  const { showToast } = useToast()
  const today = new Date()
  const toMes = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const prevMes = toMes(new Date(today.getFullYear(), today.getMonth() - 1, 1))

  const [mes, setMes] = useState(prevMes)
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [cierres, setCierres] = useState([])

  const loadCierres = async () => {
    const { data } = await supabase
      .from('cierres_mes')
      .select('*')
      .order('mes', { ascending: false })
      .limit(24)
    setCierres(data ?? [])
  }
  useEffect(() => { loadCierres() }, [])

  const calcular = async () => {
    setCargando(true)
    setResumen(null)
    const desde = `${mes}-01`
    const [y, m] = mes.split('-').map(Number)
    const hasta = new Date(y, m, 0).toISOString().slice(0, 10)

    const [gasR, ingR, ubicsR, movsR] = await Promise.all([
      supabase.from('gastos').select('monto,moneda').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('ingresos').select('monto,moneda').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('ubicaciones_ahorro').select('id,nombre,moneda').eq('activo', true).order('nombre'),
      supabase
        .from('movimientos_ahorro')
        .select('ubicacion_origen,ubicacion_destino,monto,monto_pesos,tipo,moneda')
        .lte('fecha', hasta),
    ])

    const sum = (arr, mon) =>
      (arr ?? []).filter(r => r.moneda === mon).reduce((s, r) => s + Number(r.monto), 0)

    const gastos = gasR.data ?? []
    const ingresos = ingR.data ?? []
    const ubicaciones = ubicsR.data ?? []
    const movs = movsR.data ?? []

    const totalGastosARS = sum(gastos, 'ARS')
    const totalGastosUSD = sum(gastos, 'USD')
    const totalIngresosARS = sum(ingresos, 'ARS')
    const totalIngresosUSD = sum(ingresos, 'USD')

    const snapshotUbicaciones = ubicaciones.map(u => ({
      nombre: u.nombre,
      moneda: u.moneda,
      saldo: calcSaldo(u, movs),
    }))

    setResumen({
      totalGastosARS,
      totalGastosUSD,
      totalIngresosARS,
      totalIngresosUSD,
      ahorroARS: totalIngresosARS - totalGastosARS,
      ahorroUSD: totalIngresosUSD - totalGastosUSD,
      snapshotUbicaciones,
    })
    setCargando(false)
  }

  const handleCerrar = async () => {
    if (!resumen) return
    setCerrando(true)
    const { error } = await supabase.from('cierres_mes').upsert(
      {
        mes,
        total_ingresos_ars: resumen.totalIngresosARS,
        total_ingresos_usd: resumen.totalIngresosUSD,
        total_gastos_ars: resumen.totalGastosARS,
        total_gastos_usd: resumen.totalGastosUSD,
        ahorro_neto_ars: resumen.ahorroARS,
        ahorro_neto_usd: resumen.ahorroUSD,
        snapshot_ubicaciones: resumen.snapshotUbicaciones,
      },
      { onConflict: 'mes' }
    )
    setCerrando(false)
    if (error) return showToast('Error al guardar el cierre', 'error')
    showToast(`Cierre de ${mes} guardado`)
    loadCierres()
  }

  const yaCerrado = cierres.some(c => c.mes === mes)

  const CARDS = resumen
    ? [
        { label: 'Ingresos ARS', v: fmtARS(resumen.totalIngresosARS), pos: true },
        { label: 'Ingresos USD', v: fmtUSD(resumen.totalIngresosUSD), pos: true },
        { label: 'Gastos ARS', v: fmtARS(resumen.totalGastosARS), pos: false },
        { label: 'Gastos USD', v: fmtUSD(resumen.totalGastosUSD), pos: false },
        { label: 'Ahorro ARS', v: fmtARS(resumen.ahorroARS), pos: resumen.ahorroARS >= 0 },
        { label: 'Ahorro USD', v: fmtUSD(resumen.ahorroUSD), pos: resumen.ahorroUSD >= 0 },
      ]
    : []

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Mes a cerrar</p>
        <input
          type="month"
          value={mes}
          max={toMes(today)}
          onChange={e => { setMes(e.target.value); setResumen(null) }}
          className="bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {yaCerrado && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-400">
            Este mes ya fue cerrado. Podés recalcular y actualizar el snapshot.
          </p>
        </div>
      )}

      <button
        onClick={calcular}
        disabled={cargando}
        className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-medium text-slate-200 disabled:opacity-50"
      >
        {cargando ? 'Calculando...' : 'Calcular resumen'}
      </button>

      {resumen && (
        <>
          <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Resumen {mes}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CARDS.map(({ label, v, pos }) => (
                <div key={label} className="bg-slate-700/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-sm font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{v}</p>
                </div>
              ))}
            </div>

            {resumen.snapshotUbicaciones.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Saldos al cierre
                </p>
                <div className="space-y-2">
                  {resumen.snapshotUbicaciones.map((u, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">{u.nombre}</span>
                      <span className={`font-medium ${u.saldo >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
                        {u.moneda === 'USD' ? fmtUSD(u.saldo) : fmtARS(u.saldo)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCerrar}
            disabled={cerrando}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold text-sm"
          >
            {cerrando ? 'Guardando...' : `${yaCerrado ? 'Actualizar' : 'Cerrar'} mes ${mes}`}
          </button>
        </>
      )}

      {cierres.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">
            Cierres anteriores
          </p>
          <div className="space-y-2">
            {cierres.map(c => (
              <div key={c.id} className="bg-slate-800 rounded-2xl px-4 py-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-slate-300">{c.mes}</span>
                  <span
                    className={`text-xs font-medium ${
                      Number(c.ahorro_neto_ars) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {fmtARS(c.ahorro_neto_ars)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                  <span>Gastos: {fmtARS(c.total_gastos_ars)}</span>
                  <span>Ingresos: {fmtARS(c.total_ingresos_ars)}</span>
                  {Number(c.ahorro_neto_usd) !== 0 && (
                    <span>USD: {fmtUSD(c.ahorro_neto_usd)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'rubros', label: 'Rubros', Component: RubrosTab },
  { id: 'medios', label: 'Medios de pago', Component: MediosPagoTab },
  { id: 'ubicaciones', label: 'Ubicaciones', Component: UbicacionesTab },
  { id: 'tipos', label: 'Tipos de ingreso', Component: TiposIngresoTab },
  { id: 'cierre', label: 'Cierre de mes', Component: CierreMesTab },
]

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('rubros')
  const { Component } = TABS.find(t => t.id === activeTab)

  return (
    <div className="flex flex-col bg-slate-900 min-h-full">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 flex-shrink-0">
        <button
          onClick={() => navigate('/mas')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-base font-semibold text-slate-100">Administrador</h1>
      </div>

      <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-slate-800 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4">
        <Component />
      </div>
    </div>
  )
}
