import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const BASE_URL = 'https://database.turtlecraft.gg/'
const TRADE_GOOD_SUBCLASSES = Array.from({ length: 14 }, (_, index) =>
  String(index),
)

const ENDPOINTS = [
  'items=0.0',
  'items=0.1',
  'items=0.2',
  'items=0.3',
  'items=0.4',
  'items=0.5',
  'items=0.6',
  'items=0.7',
  'items=5.0',
  ...TRADE_GOOD_SUBCLASSES.map((subclass) => `items=7.${subclass}`),
  'objects=-3',
]
const OUTPUT_DIR = resolve(process.cwd(), 'data/turtle/raw')

function endpointToFileName(query) {
  return query.replace(/[^a-zA-Z0-9.-]+/g, '_')
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms)
  })
}

async function fetchEndpoint(query) {
  const url = `${BASE_URL}?${query}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'consume-ingest/0.1 (+https://github.com/razzeee/consume)',
      Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    },
  })

  const body = await response.text()

  return {
    url,
    status: response.status,
    statusText: response.statusText,
    fetchedAt: new Date().toISOString(),
    body,
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const manifest = []

  for (const query of ENDPOINTS) {
    const payload = await fetchEndpoint(query)
    const fileName = `${endpointToFileName(query)}.raw.txt`
    const outputPath = resolve(OUTPUT_DIR, fileName)

    await writeFile(outputPath, payload.body, 'utf8')

    manifest.push({
      query,
      url: payload.url,
      status: payload.status,
      statusText: payload.statusText,
      fetchedAt: payload.fetchedAt,
      fileName,
      bytes: Buffer.byteLength(payload.body, 'utf8'),
    })

    console.log(
      `[ingest:turtle:raw] ${query} -> ${fileName} (${payload.status})`,
    )

    // Keep requests polite and deterministic.
    await sleep(450)
  }

  const manifestPath = resolve(OUTPUT_DIR, 'manifest.json')
  await writeFile(manifestPath, JSON.stringify({ entries: manifest }, null, 2))

  console.log(`[ingest:turtle:raw] wrote manifest: ${manifestPath}`)
}

main().catch((error) => {
  console.error('[ingest:turtle:raw] failed:', error)
  process.exitCode = 1
})
