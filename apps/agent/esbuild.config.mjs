import { build } from 'esbuild'
import { mkdirSync } from 'fs'

mkdirSync('dist-win', { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist-win/agent.cjs',
  sourcemap: false,
  // Не bundlим нативные аддоны (если появятся)
  external: [],
})

console.log('Bundle complete: dist-win/agent.cjs')
