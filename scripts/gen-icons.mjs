/**
 * Generates all mobile app icon variants from icon.svg
 * Usage: node scripts/gen-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const assetsDir = path.join(root, 'apps/mobile/assets')

const svgBuf = readFileSync(path.join(assetsDir, 'icon.svg'))

// ── Monochrome variant: replace #6c63ff with white ──
const svgMono = Buffer.from(
  svgBuf.toString().replace(/#6c63ff/gi, '#ffffff')
)

// ── Android foreground: transparent bg (remove background rect) ──
const svgFg = Buffer.from(
  svgBuf
    .toString()
    // Remove the solid background rect (first rect, fill=#0f0f23)
    .replace(/<rect width="1024" height="1024" fill="#0f0f23"\/>/, '')
)

async function png(src, dest, size) {
  await sharp(src, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(dest)
  console.log(`✓ ${path.relative(root, dest)} (${size}x${size})`)
}

// Main app icon (iOS + Android launcher)
await png(svgBuf,  path.join(assetsDir, 'icon.png'),  1024)

// Android adaptive icon foreground (safe zone ~672px of 1024)
await png(svgFg,   path.join(assetsDir, 'android-icon-foreground.png'), 1024)

// Android monochrome (Android 13+)
await png(svgMono, path.join(assetsDir, 'android-icon-monochrome.png'), 1024)

// Splash icon (centred logo, same dark bg)
await png(svgBuf,  path.join(assetsDir, 'splash-icon.png'), 512)

// Web favicon
await png(svgBuf,  path.join(assetsDir, 'favicon.png'), 48)

console.log('\nDone! Remember to run `npx expo prebuild` to apply changes.')
