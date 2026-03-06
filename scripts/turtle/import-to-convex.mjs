import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const INPUT_PATH = resolve(process.cwd(), 'data/turtle/catalog.normalized.json')
const OUTPUT_DIR = resolve(process.cwd(), 'data/turtle')
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'catalog.import-payload.json')
const REPORT_PATH = resolve(OUTPUT_DIR, 'catalog.import-report.json')
const EXTRACTED_RECIPES_PATH = resolve(
  process.cwd(),
  'data/turtle/catalog.recipes.extracted.json',
)
const MANUAL_RECIPE_OVERRIDES_PATH = resolve(
  process.cwd(),
  'data/manual-overrides/recipes.json',
)
const PERSIST_CONVEX_FLAG = '--persist-convex'
const persistConvex = process.argv.includes(PERSIST_CONVEX_FLAG)
const PROD_FLAG = '--prod'
const targetProd = process.argv.includes(PROD_FLAG)
const CONVEX_IMPORT_BATCH_SIZE = 150

const LOCAL_SEED_CONSUMABLES = [
  {
    externalId: 'seed-consumable-grilled-squid',
    name: 'Grilled Squid',
    category: 'food',
    iconKey: 'inv_food_christmasfruitcake_01',
    iconPath: '/wow-icons/inv_food_christmasfruitcake_01.jpg',
    source: 'local-seed',
    sourceQuery: 'local-seed-data',
  },
]

const LOCAL_SEED_INGREDIENTS = [
  {
    externalId: 'seed-ingredient-winter-squid',
    name: 'Winter Squid',
    iconKey: 'inv_fishing_lostsole',
    iconPath: '/wow-icons/inv_fishing_lostsole.jpg',
    source: 'local-seed',
    sourceQuery: 'local-seed-data',
  },
]

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

function toLocalIconPath(iconKey) {
  return iconKey ? `/wow-icons/${iconKey}.jpg` : undefined
}

function isRecipeName(value) {
  return toNameKey(value).startsWith('recipe:')
}

function dedupeByName(records) {
  const seen = new Map()
  for (const record of records) {
    const key = toNameKey(record.name)
    if (!seen.has(key)) {
      seen.set(key, record)
    }
  }
  return [...seen.values()]
}

function mergeMissingByName(records, seedRecords) {
  const byName = new Map(
    records.map((record) => [toNameKey(record.name), record]),
  )
  let addedCount = 0

  for (const seedRecord of seedRecords) {
    const key = toNameKey(seedRecord.name)
    if (byName.has(key)) {
      continue
    }

    records.push(seedRecord)
    byName.set(key, seedRecord)
    addedCount += 1
  }

  return { records, addedCount }
}

function withAuditTimestamps(records, timestampMs) {
  return records.map((record) => ({
    ...record,
    createdAt: timestampMs,
    updatedAt: timestampMs,
  }))
}

async function readJsonFileIfExists(path) {
  try {
    const raw = await readFile(path, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function normalizeManualRecipeRules(payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray(payload.rules)
  ) {
    return []
  }

  return payload.rules
    .filter((rule) => rule && typeof rule === 'object')
    .map((rule) => ({
      id: typeof rule.id === 'string' ? rule.id : undefined,
      consumableExternalId:
        typeof rule.consumableExternalId === 'string'
          ? rule.consumableExternalId
          : undefined,
      consumableName:
        typeof rule.consumableName === 'string'
          ? rule.consumableName
          : undefined,
      profession:
        typeof rule.profession === 'string' ? rule.profession : undefined,
      ingredients: Array.isArray(rule.ingredients)
        ? rule.ingredients
            .filter(
              (ingredient) => ingredient && typeof ingredient === 'object',
            )
            .map((ingredient) => ({
              ingredientExternalId:
                typeof ingredient.ingredientExternalId === 'string'
                  ? ingredient.ingredientExternalId
                  : typeof ingredient.externalId === 'string'
                    ? ingredient.externalId
                    : undefined,
              ingredientName:
                typeof ingredient.ingredientName === 'string'
                  ? ingredient.ingredientName
                  : typeof ingredient.name === 'string'
                    ? ingredient.name
                    : undefined,
              qtyPerConsumable:
                typeof ingredient.qtyPerConsumable === 'number'
                  ? ingredient.qtyPerConsumable
                  : typeof ingredient.qty === 'number'
                    ? ingredient.qty
                    : undefined,
            }))
        : [],
    }))
}

function buildRecipePayload(
  uniqueConsumables,
  uniqueIngredients,
  extractedRecipeMappings,
  manualRecipeRules,
  timestampMs,
) {
  const consumablesByExternalId = new Map(
    uniqueConsumables.map((entry) => [entry.externalId, entry]),
  )
  const consumablesByName = new Map(
    uniqueConsumables.map((entry) => [toNameKey(entry.name), entry]),
  )
  const ingredientsByExternalId = new Map(
    uniqueIngredients.map((entry) => [entry.externalId, entry]),
  )
  const ingredientsByName = new Map(
    uniqueIngredients.map((entry) => [toNameKey(entry.name), entry]),
  )

  const recipeByConsumableExternalId = new Map()
  const unresolvedRecipes = []

  function setRecipeForConsumable({
    consumable,
    profession,
    source,
    sourceQuery,
    ingredients,
    override,
  }) {
    const existing = recipeByConsumableExternalId.get(consumable.externalId)

    if (existing && !override) {
      if (existing.source === 'manual-override') {
        return
      }

      if (existing.ingredients.length >= ingredients.length) {
        return
      }
    }

    recipeByConsumableExternalId.set(consumable.externalId, {
      recipeExternalId: `recipe-${consumable.externalId}`,
      consumableExternalId: consumable.externalId,
      profession,
      source,
      sourceQuery,
      ingredients,
    })
  }

  for (const extractedRecipe of extractedRecipeMappings) {
    const consumableExternalId = String(
      extractedRecipe.consumableExternalId ?? '',
    )
    const matchedConsumable = consumablesByExternalId.get(consumableExternalId)

    if (!matchedConsumable) {
      unresolvedRecipes.push({
        source: extractedRecipe.source ?? 'turtle-created-by',
        reason: 'missing-consumable',
        consumableExternalId,
      })
      continue
    }

    const resolvedIngredients = []
    const missingIngredients = []

    for (const ingredient of extractedRecipe.ingredients ?? []) {
      const qtyPerConsumable = Number(ingredient.qtyPerConsumable)
      const ingredientExternalId =
        ingredient.ingredientExternalId !== undefined
          ? String(ingredient.ingredientExternalId)
          : undefined
      const ingredientName =
        typeof ingredient.ingredientName === 'string'
          ? ingredient.ingredientName
          : undefined

      const matchedIngredient = ingredientExternalId
        ? ingredientsByExternalId.get(ingredientExternalId)
        : ingredientName
          ? ingredientsByName.get(toNameKey(ingredientName))
          : undefined

      if (
        !matchedIngredient ||
        !Number.isFinite(qtyPerConsumable) ||
        qtyPerConsumable <= 0
      ) {
        missingIngredients.push({
          ingredientExternalId,
          ingredientName,
        })
        continue
      }

      resolvedIngredients.push({
        ingredient: matchedIngredient,
        qtyPerConsumable,
      })
    }

    if (resolvedIngredients.length === 0 || missingIngredients.length > 0) {
      unresolvedRecipes.push({
        source: extractedRecipe.source ?? 'turtle-created-by',
        reason:
          resolvedIngredients.length === 0
            ? 'no-resolved-ingredients'
            : 'partial-ingredient-resolution',
        consumableExternalId: matchedConsumable.externalId,
        consumableName: matchedConsumable.name,
        missingIngredients,
      })
      continue
    }

    setRecipeForConsumable({
      consumable: matchedConsumable,
      profession:
        typeof extractedRecipe.profession === 'string'
          ? extractedRecipe.profession
          : undefined,
      source:
        typeof extractedRecipe.source === 'string'
          ? extractedRecipe.source
          : 'turtle-created-by',
      sourceQuery:
        typeof extractedRecipe.sourceQuery === 'string'
          ? extractedRecipe.sourceQuery
          : `item=${matchedConsumable.externalId}`,
      ingredients: resolvedIngredients,
      override: false,
    })
  }

  for (const rule of manualRecipeRules) {
    const matchedConsumable = rule.consumableExternalId
      ? consumablesByExternalId.get(rule.consumableExternalId)
      : rule.consumableName
        ? consumablesByName.get(toNameKey(rule.consumableName))
        : undefined

    if (!matchedConsumable) {
      unresolvedRecipes.push({
        source: 'manual-override',
        reason: 'missing-consumable',
        ruleId: rule.id,
        consumableExternalId: rule.consumableExternalId,
        consumableName: rule.consumableName,
      })
      continue
    }

    const resolvedIngredients = []
    const missingIngredients = []

    for (const ingredient of rule.ingredients) {
      const qtyPerConsumable = Number(ingredient.qtyPerConsumable)

      const matchedIngredient = ingredient.ingredientExternalId
        ? ingredientsByExternalId.get(ingredient.ingredientExternalId)
        : ingredient.ingredientName
          ? ingredientsByName.get(toNameKey(ingredient.ingredientName))
          : undefined

      if (
        !matchedIngredient ||
        !Number.isFinite(qtyPerConsumable) ||
        qtyPerConsumable <= 0
      ) {
        missingIngredients.push({
          ingredientExternalId: ingredient.ingredientExternalId,
          ingredientName: ingredient.ingredientName,
        })
        continue
      }

      resolvedIngredients.push({
        ingredient: matchedIngredient,
        qtyPerConsumable,
      })
    }

    if (resolvedIngredients.length === 0 || missingIngredients.length > 0) {
      unresolvedRecipes.push({
        source: 'manual-override',
        reason:
          resolvedIngredients.length === 0
            ? 'no-resolved-ingredients'
            : 'partial-ingredient-resolution',
        ruleId: rule.id,
        consumableExternalId: matchedConsumable.externalId,
        consumableName: matchedConsumable.name,
        missingIngredients,
      })
      continue
    }

    setRecipeForConsumable({
      consumable: matchedConsumable,
      profession: rule.profession,
      source: 'manual-override',
      sourceQuery: `manual-rule:${rule.id ?? matchedConsumable.externalId}`,
      ingredients: resolvedIngredients,
      override: true,
    })
  }

  const recipes = []
  const recipeIngredients = []

  for (const recipe of recipeByConsumableExternalId.values()) {
    recipes.push({
      externalId: recipe.recipeExternalId,
      consumableExternalId: recipe.consumableExternalId,
      profession: recipe.profession,
      source: recipe.source,
      sourceQuery: recipe.sourceQuery,
      lastSyncedAt: timestampMs,
      createdAt: timestampMs,
      updatedAt: timestampMs,
    })

    for (const ingredient of recipe.ingredients) {
      recipeIngredients.push({
        recipeExternalId: recipe.recipeExternalId,
        ingredientExternalId: ingredient.ingredient.externalId,
        qtyPerConsumable: ingredient.qtyPerConsumable,
        createdAt: timestampMs,
        updatedAt: timestampMs,
      })
    }
  }

  return {
    recipes,
    recipeIngredients,
    unresolvedRecipes,
  }
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

function isIngredientCandidate(entry) {
  if (entry.query?.startsWith('items=0.')) {
    return true
  }

  if (entry.query === 'objects=-3') {
    return true
  }

  if (entry.query?.startsWith('items=5.')) {
    return true
  }

  if (entry.query?.startsWith('items=7.')) {
    return true
  }

  if (entry.classs === 5) {
    return true
  }

  if (entry.classs === 7) {
    return true
  }

  return false
}

function chunkArray(records, chunkSize) {
  const chunks = []

  for (let index = 0; index < records.length; index += chunkSize) {
    chunks.push(records.slice(index, index + chunkSize))
  }

  return chunks
}

function runConvexMutation(functionName, args) {
  return new Promise((resolveRun, rejectRun) => {
    const convexArgs = ['convex', 'run', functionName, JSON.stringify(args)]
    if (targetProd) {
      convexArgs.push('--prod')
    }
    const child = spawn('npx', convexArgs, {
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
        new Error(
          `convex run ${functionName} failed with exit code ${code ?? 'unknown'}`,
        ),
      )
    })
  })
}

async function persistCatalogToConvex(payload) {
  const consumableChunks = chunkArray(
    payload.consumables,
    CONVEX_IMPORT_BATCH_SIZE,
  )
  const ingredientChunks = chunkArray(
    payload.ingredients,
    CONVEX_IMPORT_BATCH_SIZE,
  )
  const recipeChunks = chunkArray(payload.recipes, CONVEX_IMPORT_BATCH_SIZE)

  console.log(
    `[ingest:turtle:import] persisting to Convex in batches of ${CONVEX_IMPORT_BATCH_SIZE}`,
  )

  for (const chunk of consumableChunks) {
    const entries = chunk.map((entry) => ({
      externalId: entry.externalId,
      name: entry.name,
      category: entry.category,
      iconKey: entry.iconKey,
      iconPath: entry.iconPath,
      source: entry.source,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }))

    await runConvexMutation('recipes:upsertConsumablesByExternalId', {
      entries,
    })
  }

  for (const chunk of ingredientChunks) {
    const entries = chunk.map((entry) => ({
      externalId: entry.externalId,
      name: entry.name,
      iconKey: entry.iconKey,
      iconPath: entry.iconPath,
      source: entry.source,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }))

    await runConvexMutation('recipes:upsertIngredientsByExternalId', {
      entries,
    })
  }

  for (const chunk of recipeChunks) {
    const entries = chunk.map((entry) => ({
      externalId: entry.externalId,
      consumableExternalId: entry.consumableExternalId,
      profession: entry.profession,
      source: entry.source,
      lastSyncedAt: entry.lastSyncedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }))

    await runConvexMutation('recipes:upsertRecipesByExternalId', {
      entries,
    })
  }

  const recipeIngredientEntriesByRecipeExternalId = new Map()
  for (const entry of payload.recipeIngredients) {
    const current =
      recipeIngredientEntriesByRecipeExternalId.get(entry.recipeExternalId) ??
      []
    current.push(entry)
    recipeIngredientEntriesByRecipeExternalId.set(
      entry.recipeExternalId,
      current,
    )
  }

  const recipeExternalIds = payload.recipes.map((recipe) => recipe.externalId)
  const recipeExternalIdChunks = chunkArray(
    recipeExternalIds,
    CONVEX_IMPORT_BATCH_SIZE,
  )

  for (const recipeExternalIdChunk of recipeExternalIdChunks) {
    const recipeIngredientEntries = []

    for (const recipeExternalId of recipeExternalIdChunk) {
      const entriesForRecipe =
        recipeIngredientEntriesByRecipeExternalId.get(recipeExternalId) ?? []
      recipeIngredientEntries.push(...entriesForRecipe)
    }

    await runConvexMutation(
      'recipes:replaceRecipeIngredientsByRecipeExternalId',
      {
        recipeExternalIds: recipeExternalIdChunk,
        entries: recipeIngredientEntries,
      },
    )
  }

  return {
    consumables: payload.consumables.length,
    ingredients: payload.ingredients.length,
    recipes: payload.recipes.length,
    recipeIngredients: payload.recipeIngredients.length,
    consumableBatches: consumableChunks.length,
    ingredientBatches: ingredientChunks.length,
    recipeBatches: recipeChunks.length,
    recipeIngredientBatches: recipeExternalIdChunks.length,
  }
}

async function main() {
  const generatedAtMs = Date.now()
  const generatedAtIso = new Date(generatedAtMs).toISOString()

  const sourceRaw = await readFile(INPUT_PATH, 'utf8')
  const source = JSON.parse(sourceRaw)
  const entries = source.entries ?? []
  const extractedRecipeCatalog = await readJsonFileIfExists(
    EXTRACTED_RECIPES_PATH,
  )
  const manualRecipeOverrideCatalog = await readJsonFileIfExists(
    MANUAL_RECIPE_OVERRIDES_PATH,
  )

  const extractedRecipeMappings = Array.isArray(extractedRecipeCatalog?.recipes)
    ? extractedRecipeCatalog.recipes
    : []
  const manualRecipeRules = normalizeManualRecipeRules(
    manualRecipeOverrideCatalog,
  )

  const consumables = entries
    .filter(
      (entry) => isConsumableCandidate(entry) && !isRecipeName(entry.name),
    )
    .map((entry) => ({
      externalId: String(entry.id),
      name: toDisplayName(entry.name),
      category: normalizeCategory(entry),
      iconKey: normalizeIconKey(entry.icon),
      iconPath: toLocalIconPath(normalizeIconKey(entry.icon)),
      source: 'turtle-db',
      sourceQuery: entry.query,
    }))

  const ingredients = entries
    .filter(
      (entry) => isIngredientCandidate(entry) && !isRecipeName(entry.name),
    )
    .map((entry) => ({
      externalId: String(entry.id),
      name: toDisplayName(entry.name),
      iconKey: normalizeIconKey(entry.icon),
      iconPath: toLocalIconPath(normalizeIconKey(entry.icon)),
      source: 'turtle-db',
      sourceQuery: entry.query,
    }))

  const uniqueConsumables = dedupeByName(consumables)
  const uniqueIngredients = dedupeByName(ingredients)
  const seededConsumables = mergeMissingByName(
    uniqueConsumables,
    LOCAL_SEED_CONSUMABLES,
  )
  const seededIngredients = mergeMissingByName(
    uniqueIngredients,
    LOCAL_SEED_INGREDIENTS,
  )
  const { recipes, recipeIngredients, unresolvedRecipes } = buildRecipePayload(
    seededConsumables.records,
    seededIngredients.records,
    extractedRecipeMappings,
    manualRecipeRules,
    generatedAtMs,
  )

  const consumablesWithTimestamps = withAuditTimestamps(
    seededConsumables.records,
    generatedAtMs,
  )
  const ingredientsWithTimestamps = withAuditTimestamps(
    seededIngredients.records,
    generatedAtMs,
  )

  const payload = {
    generatedAt: generatedAtIso,
    generatedAtMs,
    sourcePath: 'data/turtle/catalog.normalized.json',
    mode: persistConvex ? 'persist-convex' : 'dry-run',
    consumables: consumablesWithTimestamps,
    ingredients: ingredientsWithTimestamps,
    recipes,
    recipeIngredients,
  }

  const report = {
    generatedAt: payload.generatedAt,
    generatedAtMs,
    totals: {
      sourceEntries: entries.length,
      consumableCandidates: consumables.length,
      ingredientCandidates: ingredients.length,
      uniqueConsumables: seededConsumables.records.length,
      uniqueIngredients: seededIngredients.records.length,
      seededConsumablesAdded: seededConsumables.addedCount,
      seededIngredientsAdded: seededIngredients.addedCount,
      extractedRecipeCandidates: extractedRecipeMappings.length,
      manualRecipeRules: manualRecipeRules.length,
      recipesResolved: recipes.length,
      recipeIngredientsResolved: recipeIngredients.length,
      recipesUnresolved: unresolvedRecipes.length,
    },
    unresolvedRecipes,
    notes: [
      persistConvex
        ? 'Convex persistence requested: payload will be upserted into Convex tables.'
        : 'Dry-run mode: payload/report files generated only (no Convex mutations called).',
      extractedRecipeCatalog
        ? `Extracted recipe catalog loaded from ${EXTRACTED_RECIPES_PATH}.`
        : `No extracted recipe catalog found at ${EXTRACTED_RECIPES_PATH}; only manual overrides can contribute recipes.`,
      manualRecipeOverrideCatalog
        ? `Manual recipe overrides loaded from ${MANUAL_RECIPE_OVERRIDES_PATH}.`
        : `No manual recipe override file found at ${MANUAL_RECIPE_OVERRIDES_PATH}.`,
    ],
    persistence: {
      requested: persistConvex,
      completed: false,
    },
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8')
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')

  if (persistConvex) {
    const persistenceSummary = await persistCatalogToConvex(payload)
    report.persistence = {
      requested: true,
      completed: true,
      summary: persistenceSummary,
    }
    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  }

  console.log(`[ingest:turtle:import] wrote payload: ${OUTPUT_PATH}`)
  console.log(`[ingest:turtle:import] wrote report: ${REPORT_PATH}`)
  console.log(
    `[ingest:turtle:import] unique consumables=${uniqueConsumables.length}, unique ingredients=${uniqueIngredients.length}`,
  )

  if (persistConvex) {
    console.log('[ingest:turtle:import] Convex persistence complete')
  } else {
    console.log(
      `[ingest:turtle:import] run with ${PERSIST_CONVEX_FLAG} to upsert payload into Convex`,
    )
  }
}

main().catch((error) => {
  console.error('[ingest:turtle:import] failed:', error)
  process.exitCode = 1
})
