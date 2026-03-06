import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const RAW_DIR = resolve(process.cwd(), 'data/turtle/raw')
const OUTPUT_DIR = resolve(process.cwd(), 'data/turtle')
const MANIFEST_PATH = resolve(RAW_DIR, 'manifest.json')
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'catalog.normalized.json')

function parseStringField(source, fieldName) {
  const pattern = new RegExp(`${fieldName}\\s*:\\s*'((?:\\\\'|[^'])*)'`)
  const match = source.match(pattern)
  return match ? match[1].replace(/\\'/g, "'") : undefined
}

function parseNumberField(source, fieldName) {
  const pattern = new RegExp(`${fieldName}\\s*:\\s*(-?\\d+)`)
  const match = source.match(pattern)
  if (!match) {
    return undefined
  }

  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function parseObjectEntriesFromHtml(html) {
  const rawObjects = html.match(/\{[^{}]*\}/g) ?? []

  return rawObjects
    .map((rawObject) => {
      const id = parseNumberField(rawObject, 'id')
      const name = parseStringField(rawObject, 'name')
      const skill = parseNumberField(rawObject, 'skill')
      const type = parseNumberField(rawObject, 'type')
      const classs = parseNumberField(rawObject, 'classs')
      const subclass = parseNumberField(rawObject, 'subclass')
      const icon = parseStringField(rawObject, 'icon')

      if (id === undefined || !name) {
        return null
      }

      return {
        id,
        name,
        icon,
        skill,
        type,
        classs,
        subclass,
      }
    })
    .filter((entry) => entry !== null)
}

function parseIconMapFromHtml(html) {
  const iconById = new Map()
  const iconPattern = /_\[(\d+)\]\s*=\s*\{\s*icon\s*:\s*'((?:\\'|[^'])*)'\s*\}/g

  for (const match of html.matchAll(iconPattern)) {
    const id = Number(match[1])
    const icon = match[2]?.replace(/\\'/g, "'")

    if (!Number.isFinite(id) || !icon) {
      continue
    }

    iconById.set(id, icon)
  }

  return iconById
}

function dedupeById(entries) {
  const byId = new Map()
  for (const entry of entries) {
    byId.set(entry.id, entry)
  }
  return [...byId.values()]
}

function summarizeByName(entries) {
  const byName = new Map()
  for (const entry of entries) {
    const key = entry.name.toLowerCase()
    const current = byName.get(key)
    if (!current) {
      byName.set(key, {
        name: entry.name,
        ids: [entry.id],
        occurrences: 1,
      })
      continue
    }

    current.occurrences += 1
    if (!current.ids.includes(entry.id)) {
      current.ids.push(entry.id)
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

async function main() {
  const manifestRaw = await readFile(MANIFEST_PATH, 'utf8')
  const manifest = JSON.parse(manifestRaw)

  const pages = []
  const allEntries = []

  for (const entry of manifest.entries ?? []) {
    const rawPath = resolve(RAW_DIR, entry.fileName)
    const html = await readFile(rawPath, 'utf8')
    const iconById = parseIconMapFromHtml(html)
    const parsedForPage = parseObjectEntriesFromHtml(html).map((candidate) => ({
      ...candidate,
      icon: candidate.icon ?? iconById.get(candidate.id),
    }))

    const typedEntries = parsedForPage.map((candidate) => ({
      ...candidate,
      query: entry.query,
      fileName: entry.fileName,
      fetchedAt: entry.fetchedAt,
    }))

    pages.push({
      query: entry.query,
      fileName: entry.fileName,
      status: entry.status,
      bytes: entry.bytes,
      listviewBlocks: html.includes('new Listview(') ? 1 : 0,
      iconMappings: iconById.size,
      parsedEntries: typedEntries.length,
    })

    allEntries.push(...typedEntries)
  }

  const uniqueEntries = dedupeById(allEntries)
  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      manifestPath: 'data/turtle/raw/manifest.json',
      totalPages: pages.length,
    },
    pages,
    totals: {
      rawEntries: allEntries.length,
      uniqueEntries: uniqueEntries.length,
      uniqueNames: summarizeByName(uniqueEntries).length,
    },
    entries: uniqueEntries,
    names: summarizeByName(uniqueEntries),
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')

  console.log(
    `[ingest:turtle:normalize] wrote ${OUTPUT_PATH} with ${output.totals.uniqueEntries} unique entries`,
  )
}

main().catch((error) => {
  console.error('[ingest:turtle:normalize] failed:', error)
  process.exitCode = 1
})
