import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const NO_FETCH_FLAG = '--no-fetch'
const PERSIST_CONVEX_FLAG = '--persist-convex'
const noFetch = process.argv.includes(NO_FETCH_FLAG)
const persistConvex = process.argv.includes(PERSIST_CONVEX_FLAG)

const RAW_MANIFEST_PATH = resolve(
  process.cwd(),
  'data/turtle/raw/manifest.json',
)

function runNodeScript(scriptPath, args = []) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    })

    child.on('error', (error) => {
      rejectRun(error)
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolveRun(undefined)
        return
      }

      rejectRun(
        new Error(`${scriptPath} failed with exit code ${code ?? 'unknown'}`),
      )
    })
  })
}

async function ensureManifestExists() {
  try {
    await access(RAW_MANIFEST_PATH, constants.R_OK)
  } catch {
    throw new Error(
      `Cannot run ${NO_FETCH_FLAG} because raw manifest is missing at ${RAW_MANIFEST_PATH}. Run without ${NO_FETCH_FLAG} first.`,
    )
  }
}

async function main() {
  if (noFetch) {
    await ensureManifestExists()
    console.log(
      '[ingest:turtle] --no-fetch enabled: skipping raw download step',
    )
  } else {
    await runNodeScript('scripts/turtle/fetch-catalog.mjs')
  }

  if (persistConvex) {
    console.log(
      '[ingest:turtle] --persist-convex enabled: Convex upsert will run',
    )
  }

  await runNodeScript('scripts/turtle/normalize-catalog.mjs')
  await runNodeScript(
    'scripts/turtle/extract-recipes.mjs',
    noFetch ? [NO_FETCH_FLAG] : [],
  )
  await runNodeScript(
    'scripts/turtle/import-to-convex.mjs',
    persistConvex ? [PERSIST_CONVEX_FLAG] : [],
  )
}

main().catch((error) => {
  console.error('[ingest:turtle] failed:', error)
  process.exitCode = 1
})
