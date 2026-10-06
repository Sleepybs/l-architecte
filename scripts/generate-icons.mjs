// Génère les icônes PNG de l'appli (PWA) à partir de la tour du favicon, sans dépendance.
// Usage : node scripts/generate-icons.mjs
// Principe : on teste pour chaque pixel s'il est dans le polygone de la tour (avec
// sur-échantillonnage 4×4 pour lisser les bords), puis on encode le PNG avec zlib.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

// Contour de la tour, dans le repère 32×32 de public/favicon.svg.
const ROOK = [
  [8, 6],
  [11, 6],
  [11, 9],
  [14, 9],
  [14, 6],
  [18, 6],
  [18, 9],
  [21, 9],
  [21, 6],
  [24, 6],
  [24, 12],
  [21, 14],
  [21, 22],
  [24, 25],
  [24, 27],
  [8, 27],
  [8, 25],
  [11, 22],
  [11, 14],
  [8, 12],
]
const BG = [0x0f, 0x17, 0x2a] // ardoise foncée
const FG = [0xfb, 0xbf, 0x24] // ambre (couleur d'accent de l'app)

function inside(x, y) {
  let hit = false
  for (let i = 0, j = ROOK.length - 1; i < ROOK.length; j = i++) {
    const [xi, yi] = ROOK[i]
    const [xj, yj] = ROOK[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** scale : taille de la tour par rapport à l'icône (< 1 pour rester dans la zone sûre « maskable »). */
function render(size, scale) {
  const rows = []
  const S = 4
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3) // octet de filtre PNG (0) + RGB
    for (let px = 0; px < size; px++) {
      let cover = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          // Pixel → repère 32×32, tour centrée sur (16 ; 16,5).
          const x = ((px + (sx + 0.5) / S) / size - 0.5) * (32 / scale) + 16
          const y = ((py + (sy + 0.5) / S) / size - 0.5) * (32 / scale) + 16.5
          if (inside(x, y)) cover++
        }
      }
      const a = cover / (S * S)
      for (let c = 0; c < 3; c++) row[1 + px * 3 + c] = Math.round(BG[c] * (1 - a) + FG[c] * a)
    }
    rows.push(row)
  }
  return png(size, Buffer.concat(rows))
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // 8 bits par canal
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const icons = [
  ['public/icons/icon-192.png', 192, 0.9],
  ['public/icons/icon-512.png', 512, 0.9],
  ['public/icons/icon-maskable-512.png', 512, 0.7], // zone sûre : 80 % centraux
  ['public/icons/apple-touch-icon.png', 180, 0.85],
]
for (const [file, size, scale] of icons) {
  writeFileSync(file, render(size, scale))
  console.log(`${file} (${size}×${size})`)
}
