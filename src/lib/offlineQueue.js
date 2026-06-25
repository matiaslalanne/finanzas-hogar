const KEY = 'finanzas_offline_gastos'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function write(q) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

export function enqueue(gasto) {
  const q = read()
  q.push({ ...gasto, _id: crypto.randomUUID(), _at: new Date().toISOString() })
  write(q)
}

export function getQueue() {
  return read()
}

export function removeFromQueue(id) {
  write(read().filter(g => g._id !== id))
}

export function queueSize() {
  return read().length
}
