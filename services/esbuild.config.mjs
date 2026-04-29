import { build } from 'esbuild'
import { readdirSync, mkdirSync } from 'fs'
import { join } from 'path'

const external = [
  '@aws-sdk/*',
  '@smithy/*',
]

const baseConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  minify: true,
  sourcemap: true,
  external,
}

const handlerDirs = [
  { src: 'src/handlers/checks', out: 'dist/handlers/checks' },
  { src: 'src/handlers/api', out: 'dist/handlers/api' },
]

const singleHandlers = [
  { entry: 'src/handlers/orchestrator.ts', out: 'dist/handlers/orchestrator.js' },
]

async function buildAll() {
  for (const { entry, out } of singleHandlers) {
    await build({ ...baseConfig, entryPoints: [entry], outfile: out })
    console.log(`Built ${out}`)
  }

  for (const { src, out } of handlerDirs) {
    mkdirSync(out, { recursive: true })
    const files = readdirSync(src).filter(f => f.endsWith('.ts'))
    for (const file of files) {
      const name = file.replace('.ts', '')
      await build({
        ...baseConfig,
        entryPoints: [join(src, file)],
        outfile: join(out, `${name}.js`),
      })
      console.log(`Built ${join(out, name)}.js`)
    }
  }
}

buildAll().catch(err => { console.error(err); process.exit(1) })
