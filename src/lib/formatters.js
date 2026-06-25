// Convierte la tecla presionada al nuevo string de monto (separador decimal = coma)
export function handleMontoKey(current, key) {
  if (key === '⌫') {
    if (current.length <= 1) return '0'
    const next = current.slice(0, -1)
    return next === '' ? '0' : next
  }
  if (key === ',') {
    if (current.includes(',')) return current
    return current + ','
  }
  // Dígito
  if (current.includes(',')) {
    const dec = current.split(',')[1] ?? ''
    if (dec.length >= 2) return current
  }
  if (current === '0') return key === '0' ? '0' : key
  if (current.replace(',', '').length >= 10) return current
  return current + key
}

// Formatea el raw string para mostrar (agrega separadores de miles)
export function displayMonto(raw) {
  if (!raw || raw === '0') return '0'
  const [intPart, decPart] = raw.split(',')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart !== undefined ? `${formatted},${decPart}` : formatted
}

// Convierte el raw string a número para guardar en Supabase
export function parseMonto(raw) {
  if (!raw || raw === '0') return 0
  return parseFloat(raw.replace(',', '.')) || 0
}

// Fecha de hoy en YYYY-MM-DD (zona horaria local del dispositivo)
export function fechaHoy() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
