import { calculateRaidRequestFulfillment } from '#/domain/fulfillment'
import RecipeBreakdownTable from '#/components/consumables/RecipeBreakdownTable'
import IngredientSelect from '#/components/consumables/IngredientSelect'
import WowIcon from '#/components/WowIcon'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  IngredientSupply,
  RaidRequestItem,
  ReadyConsumableSupply,
} from '#/domain/types'
import {
  getCategoryIconCandidates,
  getConsumableIconCandidates,
  getProgressIconCandidates,
  getSupplyActivityIconCandidates,
} from '#/domain/wowIcons'

type Props = {
  item: RaidRequestItem
  ingredientSupplies: IngredientSupply[]
  readySupplies: ReadyConsumableSupply[]
  canSupply: boolean
  contributorNameDefault: string
  onSupplyIngredient: (
    item: RaidRequestItem,
    ingredientId: string,
    qty: number,
    contributorName: string,
  ) => void
  onSupplyReady: (
    item: RaidRequestItem,
    qty: number,
    contributorName: string,
  ) => void
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatTimestamp(value: number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export default function RaidRequestCard({
  item,
  ingredientSupplies,
  readySupplies,
  canSupply,
  contributorNameDefault,
  onSupplyIngredient,
  onSupplyReady,
}: Props) {
  const [selectedIngredientId, setSelectedIngredientId] = useState(
    item.consumable.recipe[0]?.ingredient.id ?? '',
  )
  const [ingredientQty, setIngredientQty] = useState('')
  const [readyQty, setReadyQty] = useState('')
  const [contributorName, setContributorName] = useState(contributorNameDefault)

  useEffect(() => {
    setContributorName(contributorNameDefault)
  }, [contributorNameDefault])

  const fulfillment = calculateRaidRequestFulfillment(
    item,
    ingredientSupplies,
    readySupplies,
  )
  const ingredientCompletionPct =
    fulfillment.requestedQty <= 0
      ? 0
      : Math.min(
          1,
          (fulfillment.remainingConsumableQty *
            fulfillment.ingredientCoveragePct) /
            fulfillment.requestedQty,
        )
  const readyContributionPct =
    fulfillment.requestedQty <= 0
      ? 0
      : Math.min(1, fulfillment.readyAppliedQty / fulfillment.requestedQty)

  const recentActivity = [
    ...ingredientSupplies.map((supply) => ({
      id: supply.id,
      suppliedAt: supply.suppliedAt,
      type: 'ingredient' as const,
      text: `${supply.contributorName} supplied ${supply.qty} ingredient units`,
    })),
    ...readySupplies.map((supply) => ({
      id: supply.id,
      suppliedAt: supply.suppliedAt,
      type: 'ready' as const,
      text: `${supply.contributorName} supplied ${supply.qty} ready consumables`,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.suppliedAt).getTime() - new Date(a.suppliedAt).getTime(),
    )
    .slice(0, 5)

  function submitIngredientSupply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const qty = Number(ingredientQty)
    if (!selectedIngredientId || !Number.isFinite(qty) || qty <= 0) {
      return
    }

    if (!canSupply) {
      return
    }

    onSupplyIngredient(item, selectedIngredientId, qty, contributorName)
    setIngredientQty('')
  }

  function submitReadySupply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const qty = Number(readyQty)
    if (!Number.isFinite(qty) || qty <= 0) {
      return
    }

    if (!canSupply) {
      return
    }

    onSupplyReady(item, qty, contributorName)
    setReadyQty('')
  }

  return (
    <article className="wow-panel rise-in overflow-visible rounded-lg p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="island-kicker mb-1 inline-flex items-center gap-1.5">
            <WowIcon
              alt={`${item.consumable.category} icon`}
              candidates={getCategoryIconCandidates(item.consumable.category)}
              className="h-4 w-4 rounded border border-[var(--wow-line)] object-cover"
            />
            {item.consumable.category}
          </p>
          <h3 className="m-0 inline-flex items-center gap-2 text-xl font-bold text-[var(--wow-ink)]">
            <WowIcon
              alt={item.consumable.name}
              candidates={getConsumableIconCandidates(item.consumable)}
              className="h-6 w-6 rounded border border-[var(--wow-line)] object-cover"
            />
            {item.consumable.name}
          </h3>
          <p className="m-0 mt-2 flex flex-wrap gap-1.5">
            <span
              className={`status-chip ${fulfillment.isComplete ? 'is-complete' : ''}`}
            >
              {fulfillment.isComplete ? 'Raid Ready' : 'In Progress'}
            </span>
            <span className="status-chip">Req {fulfillment.requestedQty}</span>
            <span className="status-chip">
              Ready {fulfillment.readySuppliedQty}
            </span>
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--wow-ink-soft)]">
            Requested: {fulfillment.requestedQty} | Ready supplied:{' '}
            {fulfillment.readySuppliedQty} (applied:{' '}
            {fulfillment.readyAppliedQty})
          </p>
          {item.note ? (
            <p className="m-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
              {item.note}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] px-3 py-2 text-right">
          <p className="m-0 text-xs uppercase tracking-[0.14em] text-[var(--wow-accent)]">
            Unified Progress
          </p>
          <p className="m-0 inline-flex items-center gap-2 text-lg font-bold text-[var(--wow-ink)]">
            <WowIcon
              alt="Completion status"
              candidates={getProgressIconCandidates(
                fulfillment.overallCompletionPct,
              )}
              className="h-5 w-5 rounded border border-[var(--wow-line)] object-cover"
            />
            {formatPercent(fulfillment.overallCompletionPct)}
          </p>
        </div>
      </div>

      <div className="progress-meter mb-4">
        <div
          className="progress-meter-fill"
          style={{ width: formatPercent(fulfillment.overallCompletionPct) }}
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <div className="section-shell px-3 py-2">
          <p className="m-0 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--wow-ink-soft)]">
            Ingredient Equivalent
          </p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--wow-ink)]">
            {formatPercent(ingredientCompletionPct)}
          </p>
        </div>
        <div className="section-shell px-3 py-2">
          <p className="m-0 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--wow-ink-soft)]">
            Ready Contribution
          </p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--wow-ink)]">
            {formatPercent(readyContributionPct)}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] p-3">
        <label className="mb-2 block text-xs font-semibold tracking-[0.08em] text-[var(--wow-ink-soft)] uppercase">
          Contributor
        </label>
        <input
          value={contributorName}
          onChange={(event) => setContributorName(event.target.value)}
          placeholder="Character name"
          className="wow-input w-full rounded-lg px-3 py-2 text-sm"
          disabled={!canSupply}
        />
      </div>

      <RecipeBreakdownTable bom={fulfillment.bom} />

      <div className="mt-4 grid gap-3 overflow-visible md:grid-cols-2">
        <form
          className="relative z-50 overflow-visible rounded-lg border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] p-3"
          onSubmit={submitIngredientSupply}
        >
          <p className="mb-2 text-sm font-semibold text-[var(--wow-ink)]">
            Supply Ingredients
          </p>
          <div className="flex flex-wrap gap-2">
            <IngredientSelect
              value={selectedIngredientId}
              ingredients={item.consumable.recipe}
              onChange={setSelectedIngredientId}
              disabled={!canSupply}
              className="min-w-44 flex-1"
            />
            <input
              value={ingredientQty}
              onChange={(event) => setIngredientQty(event.target.value)}
              type="number"
              min={1}
              step={1}
              placeholder="Qty"
              className="wow-input w-24 rounded-lg px-3 py-2 text-sm"
              disabled={!canSupply}
            />
            <button
              type="submit"
              className="wow-button rounded-lg px-3 py-2 text-sm font-semibold"
              disabled={!canSupply}
            >
              Add
            </button>
          </div>
        </form>

        <form
          className="relative z-50 overflow-visible rounded-lg border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] p-3"
          onSubmit={submitReadySupply}
        >
          <p className="mb-2 text-sm font-semibold text-[var(--wow-ink)]">
            Supply Ready Consumables
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={readyQty}
              onChange={(event) => setReadyQty(event.target.value)}
              type="number"
              min={1}
              step={1}
              placeholder="Qty"
              className="wow-input w-24 rounded-lg px-3 py-2 text-sm"
              disabled={!canSupply}
            />
            <button
              type="submit"
              className="wow-button-ready rounded-lg px-3 py-2 text-sm font-semibold"
              disabled={!canSupply}
            >
              Add
            </button>
          </div>
        </form>
      </div>
      {!canSupply ? (
        <p className="mt-3 text-sm text-[var(--wow-ink-soft)]">
          You are in read-only mode for supplies. Switch to a guild member to
          contribute.
        </p>
      ) : null}

      <div className="mt-4 rounded-lg border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] p-3">
        <p className="mb-2 text-sm font-semibold text-[var(--wow-ink)]">
          Recent Contribution Activity
        </p>
        {recentActivity.length === 0 ? (
          <div className="empty-state">
            <p className="m-0 text-sm text-[var(--wow-ink-soft)]">
              No supplies logged yet. First contribution sets the pace for this
              request.
            </p>
          </div>
        ) : (
          <ul className="m-0 list-none space-y-1 p-0 text-sm text-[var(--wow-ink-soft)]">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="inline-flex items-center gap-2">
                <WowIcon
                  alt={`${activity.type} activity`}
                  candidates={getSupplyActivityIconCandidates(activity.type)}
                  className="h-4 w-4 rounded border border-[var(--wow-line)] object-cover"
                />
                {activity.text} | {formatTimestamp(activity.suppliedAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
