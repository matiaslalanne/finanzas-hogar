/**
 * Genera íconos PNG para la PWA con un diseño de casa (hogar + finanzas).
 * Sin dependencias externas — solo Node.js built-ins.
 *
 * Diseño (a 512×512):
 *  - Fondo: emerald #059669
 *  - Casa blanca con techo triangular, chimenea, cuerpo, puerta en arco, dos ventanas
 *  - Moneda dorada pequeña en la esquina inferior derecha del cuerpo
 */

import { writeFile, mkdir } from 'fs/promises'
import { promisify } from 'util'
import { deflate } from 'zlib'

const deflateAsync = promisify(deflate)

// ── CRC & PNG helpers ──────────────────────────────────────────────────────────

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
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(typeStr, data) {
  const type = Buffer.from(typeStr, 'ascii')
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([type, data])), 0)
  return Buffer.concat([len, type, data, crcBuf])
}

async function buildPNG(width, height, rawRGBA) {
  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Add filter byte (0 = None) per row
  const rowBytes = 1 + width * 4
  const raw = Buffer.allocUnsafe(rowBytes * height)
  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0
    rawRGBA.copy(raw, y * rowBytes + 1, y * width * 4, (y + 1) * width * 4)
  }

  const compressed = await deflateAsync(raw, { level: 6 })
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

// ── Icon drawing at 512×512 ────────────────────────────────────────────────────

const BASE = 512

// Colors [R, G, B, A]
const EMERALD   = [5, 150, 105, 255]   // #059669
const EMERALD_D = [3, 120, 84, 255]    // #037854 — coin shadow / darker detail
const WHITE     = [255, 255, 255, 255]
const GOLD      = [250, 189, 20, 255]  // coin color
const GOLD_D    = [200, 140, 10, 255]  // coin edge

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

function inRect(x, y, x1, y1, x2, y2) {
  return x >= x1 && x <= x2 && y >= y1 && y <= y2
}

function inCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2
}

function inArch(x, y, cx, y0, halfW, archR) {
  // Arch-topped rectangle: top is a semicircle of radius archR centered at (cx, y0+archR)
  if (x < cx - halfW || x > cx + halfW) return false
  if (y < y0) return false
  if (y < y0 + archR) return inCircle(x, y, cx, y0 + archR, archR)
  return true
}

function getPixel512(x, y) {
  const cx = 256

  // ── Roof triangle: apex (256,72), base (78,228)–(434,228)
  const inRoof = inTriangle(x, y, 256, 72, 78, 228, 434, 228)

  // ── Chimney: x[336,382], y[118,228]
  const inChimney = inRect(x, y, 336, 118, 382, 228)

  // ── Body: x[108,404], y[220,438]
  const inBody = inRect(x, y, 108, 220, 404, 438)

  // ── Door: arch, center 256, halfW=46, y0=316, bottom=438
  const inDoor = inArch(x, y, cx, 316, 46, 46) && y <= 438

  // ── Left window: x[142,222], y[256,326]
  const inWinL = inRect(x, y, 142, 256, 222, 326)

  // ── Right window: x[290,370], y[256,326]
  const inWinR = inRect(x, y, 290, 256, 370, 326)

  // ── Coin: circle center (360, 390), r=42
  const coinCX = 360, coinCY = 390, coinR = 42
  const inCoin = inCircle(x, y, coinCX, coinCY, coinR)
  const inCoinEdge = inCircle(x, y, coinCX, coinCY, coinR) && !inCircle(x, y, coinCX, coinCY, coinR - 5)
  const inCoinSymbol =
    // Vertical bar of $
    (inRect(x, y, coinCX - 2, coinCY - 20, coinCX + 2, coinCY + 20)) ||
    // Top arc of S (upper half)
    (inCircle(x, y, coinCX + 3, coinCY - 9, 12) && !inCircle(x, y, coinCX + 3, coinCY - 9, 7) && x >= coinCX - 7 && y <= coinCY - 3) ||
    // Bottom arc of S (lower half)
    (inCircle(x, y, coinCX - 3, coinCY + 9, 12) && !inCircle(x, y, coinCX - 3, coinCY + 9, 7) && x <= coinCX + 7 && y >= coinCY + 3)

  // ── Decision tree ─────────────────────────────────────────────────────────────
  const isHouse = (inRoof || inBody || inChimney) && !inDoor && !inWinL && !inWinR

  if (inCoin && !isHouse) {
    // Coin is on the body corner — only draw where NOT inside house white
    if (inCoinEdge) return GOLD_D
    if (inCoinSymbol) return GOLD_D
    return GOLD
  }

  if (isHouse) return WHITE
  return EMERALD
}

// ── Scale down from 512 to target size ────────────────────────────────────────

function drawIcon(size) {
  const pixels = Buffer.allocUnsafe(size * size * 4)
  const scale = BASE / size

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Sample center of the source pixel (box filter would be nicer but this is fine for icons)
      const sx = Math.floor((x + 0.5) * scale)
      const sy = Math.floor((y + 0.5) * scale)
      const [r, g, b, a] = getPixel512(sx, sy)
      const i = (y * size + x) * 4
      pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a
    }
  }
  return pixels
}

// ── Generate files ─────────────────────────────────────────────────────────────

await mkdir('public/icons', { recursive: true })

for (const [size, name] of [
  [512, 'icon-512'],
  [192, 'icon-192'],
  [180, 'apple-touch-icon'],
]) {
  const pixels = drawIcon(size)
  const png = await buildPNG(size, size, pixels)
  await writeFile(`public/icons/${name}.png`, png)
  console.log(`✓ public/icons/${name}.png  (${size}×${size})`)
}
