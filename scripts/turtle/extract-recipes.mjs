import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const INPUT_PATH = resolve(process.cwd(), 'data/turtle/catalog.normalized.json')
const OUTPUT_DIR = resolve(process.cwd(), 'data/turtle')
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'catalog.recipes.extracted.json')
const ITEM_PAGE_CACHE_DIR = resolve(process.cwd(), 'data/turtle/raw/items')
const BASE_URL = 'https://database.turtlecraft.gg/'

const NO_FETCH_FLAG = '--no-fetch'
const REFRESH_FLAG = '--refresh'
const LIMIT_FLAG_PREFIX = '--limit='
const CONCURRENCY_FLAG_PREFIX = '--concurrency='

const noFetch = process.argv.includes(NO_FETCH_FLAG)
const refresh = process.argv.includes(REFRESH_FLAG)
const limit = parseNumericFlag(LIMIT_FLAG_PREFIX)
const concurrency = parseNumericFlag(CONCURRENCY_FLAG_PREFIX) ?? 4

const PROFESSION_BY_SKILL_ID = {
  129: 'first-aid',
  164: 'blacksmithing',
  165: 'leatherworking',
  171: 'alchemy',
  185: 'cooking',
  197: 'tailoring',
  202: 'engineering',
}

function parseNumericFlag(prefix) {
  const rawFlag = process.argv.find((entry) => entry.startsWith(prefix))
  if (!rawFlag) {
    return undefined
  }

  const parsed = Number(rawFlag.slice(prefix.length))
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }

  return Math.floor(parsed)
}

function toNameKey(value) {
  return value
    .trim()
    .replace(/^[0-9]+(?=[A-Za-z])/u, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function toDisplayName(value) {
  return value
    .trim()
    .replace(/^[0-9]+(?=[A-Za-z])/u, '')
    .replace(/\s+/g, ' ')
}

function normalizeIconKey(value) {
  if (!value || typeof value !== 'string') {
    return undefined
  }

  const cleaned = value
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.(?:blp|tga|jpg|jpeg|png|webp)$/iu, '')
    .toLowerCase()

  return cleaned && cleaned.length > 0 ? cleaned : undefined
}

function isRecipeName(value) {
  return toNameKey(value).startsWith('recipe:')
}

function normalizeCategory(entry) {
  if (entry.classs === 0 && entry.subclass === 3) {
    return 'potion'
  }
  if (entry.classs === 0 && entry.subclass === 2) {
    return 'elixir'
  }
  if (entry.classs === 0 && entry.subclass === 0) {
    return 'misc'
  }
  if (entry.classs === 7) {
    return 'reagent'
  }
  return 'unknown'
}

function isConsumableCandidate(entry) {
  if (entry.query?.startsWith('items=0.')) {
    return true
  }

  if (entry.classs === 0 && typeof entry.subclass === 'number') {
    return true
  }

  return false
}

function dedupeByExternalId(records) {
  const byExternalId = new Map()
  for (const record of records) {
    byExternalId.set(record.externalId, record)
  }
  return [...byExternalId.values()]
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms)
  })
}

function itemPageCachePath(externalId) {
  return resolve(ITEM_PAGE_CACHE_DIR, `item_${externalId}.raw.txt`)
}

async function readItemPageFromCache(externalId) {
  try {
    return await readFile(itemPageCachePath(externalId), 'utf8')
  } catch {
    return null
  }
}

async function fetchAndCacheItemPage(externalId) {
  const url = `${BASE_URL}?item=${externalId}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'consume-ingest/0.1 (+https://github.com/razzeee/consume)',
      Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    },
  })

  const body = await response.text()
  await writeFile(itemPageCachePath(externalId), body, 'utf8')

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body,
  }
}

function findMatchingDelimiter(source, startIndex, openChar, closeChar) {
  if (startIndex < 0 || source[startIndex] !== openChar) {
    return -1
  }

  let depth = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index]

    if (escaped) {
      escaped = false
      continue
    }

    if ((inSingleQuote || inDoubleQuote) && char === '\\') {
      escaped = true
      continue
    }

    if (inSingleQuote) {
      if (char === "'") {
        inSingleQuote = false
      }
      continue
    }

    if (inDoubleQuote) {
      if (char === '"') {
        inDoubleQuote = false
      }
      continue
    }

    if (char === "'") {
      inSingleQuote = true
      continue
    }

    if (char === '"') {
      inDoubleQuote = true
      continue
    }

    if (char === openChar) {
      depth += 1
      continue
    }

    if (char === closeChar) {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}

function extractCreatedByListviewBlock(html) {
  const marker = "id:'created-by'"
  const markerIndex = html.indexOf(marker)

  if (markerIndex < 0) {
    return null
  }

  const listviewStart = html.lastIndexOf('new Listview(', markerIndex)
  if (listviewStart < 0) {
    return null
  }

  const blockStart = html.indexOf('{', listviewStart)
  if (blockStart < 0) {
    return null
  }

  const blockEnd = findMatchingDelimiter(html, blockStart, '{', '}')
  if (blockEnd < 0) {
    return null
  }

  return html.slice(blockStart, blockEnd + 1)
}

function parseTopLevelObjectsFromArray(arraySource) {
  const objects = []
  let cursor = 0

  while (cursor < arraySource.length) {
    const objectStart = arraySource.indexOf('{', cursor)
    if (objectStart < 0) {
      break
    }

    const objectEnd = findMatchingDelimiter(arraySource, objectStart, '{', '}')
    if (objectEnd < 0) {
      break
    }

    objects.push(arraySource.slice(objectStart, objectEnd + 1))
    cursor = objectEnd + 1
  }

  return objects
}

function parseSpellRecipeFromListviewObject(objectSource) {
  const recipeIdMatch = objectSource.match(/\bid\s*:\s*(\d+)/u)
  const recipeId = recipeIdMatch ? Number(recipeIdMatch[1]) : undefined

  const skillKeyIndex = objectSource.indexOf('skill:')
  let skillId

  if (skillKeyIndex >= 0) {
    const skillArrayStart = objectSource.indexOf('[', skillKeyIndex)
    if (skillArrayStart >= 0) {
      const skillArrayEnd = findMatchingDelimiter(
        objectSource,
        skillArrayStart,
        '[',
        ']',
      )

      if (skillArrayEnd >= 0) {
        const skillArrayRaw = objectSource.slice(
          skillArrayStart + 1,
          skillArrayEnd,
        )
        const firstSkillMatch = skillArrayRaw.match(/\d+/u)
        if (firstSkillMatch) {
          skillId = Number(firstSkillMatch[0])
        }
      }
    }
  }

  const reagentsKeyIndex = objectSource.indexOf('reagents:')
  if (reagentsKeyIndex < 0) {
    return null
  }

  const reagentsArrayStart = objectSource.indexOf('[', reagentsKeyIndex)
  if (reagentsArrayStart < 0) {
    return null
  }

  const reagentsArrayEnd = findMatchingDelimiter(
    objectSource,
    reagentsArrayStart,
    '[',
    ']',
  )

  if (reagentsArrayEnd < 0) {
    return null
  }

  const reagentsArrayRaw = objectSource.slice(
    reagentsArrayStart + 1,
    reagentsArrayEnd,
  )

  const reagents = []
  for (const match of reagentsArrayRaw.matchAll(/\[(\d+)\s*,\s*(\d+)\]/gu)) {
    reagents.push({
      ingredientExternalId: match[1],
      qtyPerConsumable: Number(match[2]),
    })
  }

  if (reagents.length === 0) {
    return null
  }

  return {
    spellId: recipeId,
    skillId,
    profession: skillId ? PROFESSION_BY_SKILL_ID[skillId] : undefined,
    reagents,
  }
}

function extractCreatedByRecipesFromHtml(html) {
  const createdByBlock = extractCreatedByListviewBlock(html)

  if (!createdByBlock) {
    return []
  }

  const dataKeyIndex = createdByBlock.indexOf('data:')
  if (dataKeyIndex < 0) {
    return []
  }

  const dataArrayStart = createdByBlock.indexOf('[', dataKeyIndex)
  if (dataArrayStart < 0) {
    return []
  }

  const dataArrayEnd = findMatchingDelimiter(
    createdByBlock,
    dataArrayStart,
    '[',
    ']',
  )
  if (dataArrayEnd < 0) {
    return []
  }

  const dataArrayRaw = createdByBlock.slice(dataArrayStart + 1, dataArrayEnd)
  const recipeObjects = parseTopLevelObjectsFromArray(dataArrayRaw)

  return recipeObjects
    .map((recipeObject) => parseSpellRecipeFromListviewObject(recipeObject))
    .filter((entry) => entry !== null)
}

function choosePreferredRecipe(recipes) {
  if (recipes.length === 0) {
    return null
  }

  const scoreForRecipe = (recipe) => {
    const recognizedProfessionScore = recipe.profession ? 100 : 0
    const reagentCountScore = recipe.reagents.length
    return recognizedProfessionScore + reagentCountScore
  }

  const sorted = [...recipes].sort(
    (left, right) => scoreForRecipe(right) - scoreForRecipe(left),
  )

  return sorted[0]
}

async function mapWithConcurrency(records, worker, workerConcurrency) {
  const results = new Array(records.length)
  let cursor = 0

  async function runWorker() {
    while (true) {
      const currentIndex = cursor
      cursor += 1

      if (currentIndex >= records.length) {
        return
      }

      results[currentIndex] = await worker(records[currentIndex], currentIndex)
    }
  }

  const workers = Array.from({ length: Math.max(1, workerConcurrency) }, () =>
    runWorker(),
  )

  await Promise.all(workers)
  return results
}

async function main() {
  const sourceRaw = await readFile(INPUT_PATH, 'utf8')
  const source = JSON.parse(sourceRaw)
  const sourceEntries = source.entries ?? []

  const itemByExternalId = new Map(
    sourceEntries.map((entry) => [String(entry.id), toDisplayName(entry.name)]),
  )

  const consumableCandidates = sourceEntries
    .filter(
      (entry) => isConsumableCandidate(entry) && !isRecipeName(entry.name),
    )
    .map((entry) => ({
      externalId: String(entry.id),
      name: toDisplayName(entry.name),
      category: normalizeCategory(entry),
      iconKey: normalizeIconKey(entry.icon),
      sourceQuery: entry.query,
    }))

  const uniqueConsumables = dedupeByExternalId(consumableCandidates)
  const targetConsumables =
    typeof limit === 'number'
      ? uniqueConsumables.slice(0, limit)
      : uniqueConsumables

  await mkdir(OUTPUT_DIR, { recursive: true })
  await mkdir(ITEM_PAGE_CACHE_DIR, { recursive: true })

  const unresolved = []
  let fetchedPages = 0
  let cachedPages = 0
  let fetchErrors = 0

  const extracted = await mapWithConcurrency(
    targetConsumables,
    async (consumable) => {
      let html = await readItemPageFromCache(consumable.externalId)

      if (html && !refresh) {
        cachedPages += 1
      }

      if (!html || refresh) {
        if (noFetch) {
          unresolved.push({
            consumableExternalId: consumable.externalId,
            consumableName: consumable.name,
            reason: 'missing-cache-and-no-fetch',
          })
          return null
        }

        try {
          const fetchResult = await fetchAndCacheItemPage(consumable.externalId)
          html = fetchResult.body
          fetchedPages += 1

          if (!fetchResult.ok) {
            unresolved.push({
              consumableExternalId: consumable.externalId,
              consumableName: consumable.name,
              reason: `http-${fetchResult.status}`,
              statusText: fetchResult.statusText,
            })
            return null
          }

          // Keep requests polite and avoid tripping remote throttling.
          await sleep(120)
        } catch (error) {
          fetchErrors += 1
          unresolved.push({
            consumableExternalId: consumable.externalId,
            consumableName: consumable.name,
            reason: 'fetch-failed',
            message: String(error),
          })
          return null
        }
      }

      const createdByRecipes = extractCreatedByRecipesFromHtml(html)
      if (createdByRecipes.length === 0) {
        unresolved.push({
          consumableExternalId: consumable.externalId,
          consumableName: consumable.name,
          reason: 'no-created-by-recipe',
        })
        return null
      }

      const chosenRecipe = choosePreferredRecipe(createdByRecipes)
      if (!chosenRecipe) {
        unresolved.push({
          consumableExternalId: consumable.externalId,
          consumableName: consumable.name,
          reason: 'no-parseable-created-by-recipe',
        })
        return null
      }

      const missingIngredientExternalIds = chosenRecipe.reagents
        .filter(
          (reagent) => !itemByExternalId.has(reagent.ingredientExternalId),
        )
        .map((reagent) => reagent.ingredientExternalId)

      return {
        consumableExternalId: consumable.externalId,
        consumableName: consumable.name,
        category: consumable.category,
        source: 'turtle-created-by',
        sourceQuery: `item=${consumable.externalId}`,
        profession: chosenRecipe.profession,
        sourceSpellId: chosenRecipe.spellId
          ? String(chosenRecipe.spellId)
          : undefined,
        ingredients: chosenRecipe.reagents.map((reagent) => ({
          ingredientExternalId: reagent.ingredientExternalId,
          ingredientName:
            itemByExternalId.get(reagent.ingredientExternalId) ??
            `Unknown item ${reagent.ingredientExternalId}`,
          qtyPerConsumable: reagent.qtyPerConsumable,
        })),
        missingIngredientExternalIds,
      }
    },
    concurrency,
  )

  const recipes = extracted.filter((entry) => entry !== null)
  const recipesWithMissingIngredientLinks = recipes.filter(
    (recipe) => recipe.missingIngredientExternalIds.length > 0,
  )

  const output = {
    generatedAt: new Date().toISOString(),
    sourcePath: 'data/turtle/catalog.normalized.json',
    fetchMode: noFetch ? 'cache-only' : refresh ? 'refresh' : 'cache-first',
    totals: {
      sourceEntries: sourceEntries.length,
      consumableCandidates: uniqueConsumables.length,
      consumablesProcessed: targetConsumables.length,
      pagesFetched: fetchedPages,
      pagesFromCache: cachedPages,
      fetchErrors,
      recipesExtracted: recipes.length,
      recipesWithMissingIngredientLinks:
        recipesWithMissingIngredientLinks.length,
      unresolvedConsumables: unresolved.length,
    },
    unresolved,
    recipes,
    notes: [
      "Recipes are extracted from Turtle item pages via the 'created-by' spell Listview reagent data.",
      'Only one recipe is retained per consumable, preferring entries with known profession ids.',
      'Ingredient references are preserved by Turtle externalId for downstream import resolution.',
    ],
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')

  console.log(`[ingest:turtle:recipes] wrote ${OUTPUT_PATH}`)
  console.log(
    `[ingest:turtle:recipes] processed=${output.totals.consumablesProcessed}, extracted=${output.totals.recipesExtracted}, unresolved=${output.totals.unresolvedConsumables}`,
  )
}

main().catch((error) => {
  console.error('[ingest:turtle:recipes] failed:', error)
  process.exitCode = 1
})
