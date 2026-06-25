// Genera iconos PNG placeholder para la PWA usando solo Node.js built-ins.
import { writeFile, mkdir } from 'fs/promises'
import { promisify } from 'util'
import { deflate } from 'zlib'

const deflateAsync = promisify(deflate)

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function buildChunk(typeStr, data) {
  const type = Buffer.from(typeStr, 'ascii')
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([type, data])), 0)
  return Buffer.concat([len, type, data, crcBuf])
}

async function createSolidPNG(width, height, r, g, b) {
  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // RGB color type
  ihdr[10] = 0  // deflate
  ihdr[11] = 0  // adaptive filter
  ihdr[12] = 0  // no interlace

  const rowBytes = 1 + width * 3
  const raw = Buffer.allocUnsafe(rowBytes * height)
  for (let y = 0; y < height; y++) {
    const base = y * rowBytes
    raw[base] = 0
    for (let x = 0; x < width; x++) {
      const p = base + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }

  const compressed = await deflateAsync(raw, { level: 6 })

  return Buffer.concat([
    SIG,
    buildChunk('IHDR', ihdr),
    buildChunk('IDAT', compressed),
    buildChunk('IEND', Buffer.alloc(0)),
  ])
}

await mkdir('public/icons', { recursive: true })

// Emerald-600: #059669
const [r, g, b] = [5, 150, 105]

for (const [size, name] of [[192, 'icon-192'], [512, 'icon-512'], [180, 'apple-touch-icon']]) {
  const png = await createSolidPNG(size, size, r, g, b)
  await writeFile(`public/icons/${name}.png`, png)
  console.log(`✓ public/icons/${name}.png (${size}×${size})`)
}
