import { readdir, readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const GITLAB_PROJECT_ID = '74207331'
const GITLAB_API_BASE = `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}`
const GITLAB_TREE_PATH = 'public/wow-icons'
const PER_PAGE = 100
const ICON_DIR = resolve(process.cwd(), 'public/wow-icons')
const MANIFEST_PATH = resolve(ICON_DIR, 'sync-manifest.json')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'consume-wow-icon-verify/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`)
  }

  return response.json()
}

async function listRemoteTreeFileNames() {
  const names = []
  let page = 1

  for (;;) {
    const url = `${GITLAB_API_BASE}/repository/tree?path=${encodeURIComponent(
      GITLAB_TREE_PATH,
    )}&per_page=${PER_PAGE}&page=${page}`
    const pageEntries = await fetchJson(url)

    if (!Array.isArray(pageEntries) || pageEntries.length === 0) {
      break
    }

    names.push(
      ...pageEntries
        .filter((entry) => entry.type === 'blob')
        .map((entry) => String(entry.name)),
    )

    page += 1
  }

  return names
}

async function listLocalIconFileNames() {
  const entries = await readdir(ICON_DIR, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase()))
}

async function readManifest() {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function main() {
  const [remoteFileNames, localFileNames, manifest] = await Promise.all([
    listRemoteTreeFileNames(),
    listLocalIconFileNames(),
    readManifest(),
  ])

  const remoteSet = new Set(remoteFileNames)
  const localSet = new Set(localFileNames)

  const missingLocal = [...remoteSet].filter((name) => !localSet.has(name))
  const extraLocal = [...localSet].filter((name) => !remoteSet.has(name))

  if (missingLocal.length > 0 || extraLocal.length > 0) {
    console.error('[wow-icons:verify] verification failed')
    console.error(`- missing local files: ${missingLocal.length}`)
    console.error(`- extra local files: ${extraLocal.length}`)
    process.exitCode = 1
    return
  }

  console.log('[wow-icons:verify] local icon set matches remote tree')
  console.log(`[wow-icons:verify] files: ${remoteFileNames.length}`)
  if (manifest?.syncedAt) {
    console.log(`[wow-icons:verify] last sync: ${manifest.syncedAt}`)
  }
}

main().catch((error) => {
  console.error('[wow-icons:verify] failed:', error)
  process.exitCode = 1
})
