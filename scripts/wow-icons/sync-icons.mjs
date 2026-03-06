import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const GITLAB_PROJECT_ID = '74207331'
const GITLAB_RAW_BASE = 'https://gitlab.com/razzeee/gear-planner/-/raw/main'
const GITLAB_API_BASE = `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}`
const GITLAB_TREE_PATH = 'public/wow-icons'
const PER_PAGE = 100
const OUTPUT_DIR = resolve(process.cwd(), 'public/wow-icons')
const SYNC_MANIFEST_PATH = resolve(OUTPUT_DIR, 'sync-manifest.json')

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms)
  })
}

async function fetchWithRetry(url, init, attempts = 6) {
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init)
      if (response.ok) {
        return response
      }

      if (response.status !== 429 && response.status < 500) {
        return response
      }

      const retryAfterHeader = response.headers.get('retry-after')
      const retryAfterSeconds = retryAfterHeader
        ? Number(retryAfterHeader)
        : NaN
      const retryAfterMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Math.min(12000, 600 * attempt * attempt)
      await sleep(retryAfterMs)
    } catch (error) {
      lastError = error
      await sleep(Math.min(12000, 500 * attempt * attempt))
    }
  }

  if (lastError) {
    throw lastError
  }

  throw new Error(`Failed to fetch after retries: ${url}`)
}

function toRawFileUrl(path) {
  // Keep slashes intact while escaping any special characters per path segment.
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${GITLAB_RAW_BASE}/${encodedPath}`
}

async function fetchJson(url) {
  const response = await fetchWithRetry(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'consume-wow-icon-sync/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`)
  }

  return response.json()
}

async function listRemoteTreeBlobs() {
  const blobs = []
  let page = 1

  for (;;) {
    const url = `${GITLAB_API_BASE}/repository/tree?path=${encodeURIComponent(
      GITLAB_TREE_PATH,
    )}&per_page=${PER_PAGE}&page=${page}`
    const pageEntries = await fetchJson(url)

    if (!Array.isArray(pageEntries) || pageEntries.length === 0) {
      break
    }

    blobs.push(...pageEntries.filter((entry) => entry.type === 'blob'))
    page += 1
  }

  return blobs
}

async function downloadBlob(blob) {
  const filePath = resolve(OUTPUT_DIR, blob.name)

  try {
    const existing = await stat(filePath)
    if (existing.isFile() && existing.size > 0) {
      return {
        name: blob.name,
        bytes: 0,
        skipped: true,
      }
    }
  } catch {
    // File missing; continue with download.
  }

  const response = await fetchWithRetry(toRawFileUrl(blob.path), {
    headers: {
      Accept: '*/*',
      'User-Agent': 'consume-wow-icon-sync/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${blob.path}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  await writeFile(filePath, Buffer.from(arrayBuffer))

  return {
    name: blob.name,
    bytes: Number(
      response.headers.get('content-length') ?? arrayBuffer.byteLength,
    ),
    skipped: false,
  }
}

async function runWithConcurrency(items, worker, concurrency) {
  const queue = [...items]
  const results = []

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) {
        continue
      }
      const result = await worker(item)
      results.push(result)
    }
  })

  await Promise.all(workers)
  return results
}

function isGeneratedFile(fileName) {
  return fileName === 'icon-index.json' || fileName === 'sync-manifest.json'
}

async function removeStaleLocalFiles(remoteFileNames) {
  const currentEntries = await readdir(OUTPUT_DIR, { withFileTypes: true })
  const staleFiles = currentEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (fileName) =>
        !isGeneratedFile(fileName) && !remoteFileNames.has(fileName),
    )

  await Promise.all(
    staleFiles.map((fileName) =>
      rm(resolve(OUTPUT_DIR, fileName), { force: true }),
    ),
  )

  return staleFiles
}

async function getSyncManifest() {
  try {
    const raw = await readFile(SYNC_MANIFEST_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const previousManifest = await getSyncManifest()
  const remoteBlobs = await listRemoteTreeBlobs()
  const remoteFileNames = new Set(remoteBlobs.map((blob) => blob.name))

  const staleFiles = await removeStaleLocalFiles(remoteFileNames)
  const downloaded = await runWithConcurrency(remoteBlobs, downloadBlob, 4)
  const skippedFiles = downloaded.filter((file) => file.skipped).length

  const totalBytes = downloaded.reduce((sum, file) => sum + file.bytes, 0)
  const manifest = {
    syncedAt: new Date().toISOString(),
    source: {
      projectId: GITLAB_PROJECT_ID,
      treePath: GITLAB_TREE_PATH,
    },
    totals: {
      remoteFiles: remoteBlobs.length,
      downloadedFiles: downloaded.length - skippedFiles,
      skippedExistingFiles: skippedFiles,
      removedStaleFiles: staleFiles.length,
      totalDownloadedBytes: totalBytes,
    },
    staleFiles,
    previousSyncAt: previousManifest?.syncedAt,
  }

  await writeFile(SYNC_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8')

  console.log(
    `[wow-icons:sync] synced ${downloaded.length - skippedFiles} files to ${OUTPUT_DIR}`,
  )
  console.log(`[wow-icons:sync] skipped existing files: ${skippedFiles}`)
  console.log(`[wow-icons:sync] removed stale files: ${staleFiles.length}`)
  console.log(`[wow-icons:sync] wrote manifest: ${SYNC_MANIFEST_PATH}`)
}

main().catch((error) => {
  console.error('[wow-icons:sync] failed:', error)
  process.exitCode = 1
})
