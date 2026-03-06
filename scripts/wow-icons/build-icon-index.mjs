import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const ICON_DIR = resolve(process.cwd(), 'public/wow-icons')
const OUTPUT_PATH = resolve(ICON_DIR, 'icon-index.json')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function normalizeKey(fileName) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/\.(?:jpg|jpeg|png|webp)$/i, '')
}

async function main() {
  await mkdir(ICON_DIR, { recursive: true })

  const entries = await readdir(ICON_DIR, { withFileTypes: true })
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))

  const byKey = {}
  const collisions = []

  for (const fileName of files) {
    const key = normalizeKey(fileName)
    if (byKey[key] && byKey[key] !== fileName) {
      collisions.push({ key, first: byKey[key], second: fileName })
      continue
    }
    byKey[key] = fileName
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceDir: 'public/wow-icons',
    totals: {
      imageFiles: files.length,
      indexedKeys: Object.keys(byKey).length,
      collisions: collisions.length,
    },
    byKey,
    collisions,
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8')
  console.log(
    `[wow-icons:index] indexed ${files.length} files (${collisions.length} collisions)`,
  )
  console.log(`[wow-icons:index] wrote ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error('[wow-icons:index] failed:', error)
  process.exitCode = 1
})
