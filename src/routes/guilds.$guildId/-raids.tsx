import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useConsumeState } from '#/components/ConsumeStateProvider'
import GuildFlowRail from '#/components/guild/GuildFlowRail'
import { calculateRaidRequestFulfillment } from '#/domain/fulfillment'
import { combinedRaidCatalog, isWorldBossTitle } from '#/domain/raidCatalog'

type CatalogFilter = 'all' | 'raid'

export default function GuildRaidsPage({ guildId }: { guildId: string }) {
  const consumeState = useConsumeState()
  const activeGuild = consumeState.getGuildById(guildId)
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all')

  const raidRequests = useMemo(() => {
    if (!activeGuild) {
      return []
    }
    return [...consumeState.getRaidRequests(activeGuild.id)]
      .filter((request) => !isWorldBossTitle(request.title))
      .sort((a, b) => a.raidDate.localeCompare(b.raidDate))
  }, [activeGuild, consumeState])

  const visibleCatalog = useMemo(() => {
    const withoutFivePersonDungeons = combinedRaidCatalog.filter(
      (entry) =>
        !(entry.activityType === 'dungeon' && entry.maxPlayers === '5'),
    )

    if (catalogFilter === 'all') {
      return withoutFivePersonDungeons
    }
    return withoutFivePersonDungeons.filter(
      (entry) => entry.activityType === catalogFilter,
    )
  }, [catalogFilter])

  if (!activeGuild) {
    return (
      <main
        id="main-content"
        className="page-wrap route-enter px-4 pb-16 pt-10"
      >
        <section className="wow-panel rounded-lg p-6">
          <h1 className="m-0 text-3xl font-bold text-[var(--wow-ink)]">
            Guild not found
          </h1>
          <p className="mt-2 text-[var(--wow-ink-soft)]">
            The selected guild does not exist.
          </p>
          <Link
            to="/guilds"
            className="wow-link-button mt-4 inline-flex rounded-md px-4 py-2 text-sm font-semibold no-underline"
          >
            Back to Guilds
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main id="main-content" className="page-wrap route-enter px-4 pb-16 pt-10">
      <section className="wow-panel rise-in rounded-lg p-6 sm:p-10">
        <p className="island-kicker mb-2">Raid Calendar</p>
        <h1 className="display-title m-0 text-4xl font-bold text-[var(--wow-ink)] sm:text-5xl">
          {activeGuild.name} Raids
        </h1>
        <p className="mt-3 text-[var(--wow-ink-soft)]">
          Review requests by raid date, progress, and item completion.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="campaign-ribbon">Timeline view</span>
          <span className="campaign-ribbon">Progress averages</span>
          <span className="campaign-ribbon">Completion checks</span>
        </div>

        <div className="mt-5">
          <GuildFlowRail guildId={activeGuild.id} />
        </div>
      </section>

      <section className="mt-6 wow-panel rounded-lg p-5">
        <p className="island-kicker mb-2">Combined Activity Catalog</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ['all', 'All'],
              ['raid', 'Raids'],
            ] as const
          ).map(([value, label]) => {
            const active = catalogFilter === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCatalogFilter(value)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  active
                    ? 'wow-button-ready'
                    : 'wow-button text-[var(--wow-ink-soft)]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {visibleCatalog.map((entry) => (
            <div
              key={entry.id}
              className="rounded-md border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] px-3 py-2 text-sm"
            >
              <p className="m-0 font-semibold text-[var(--wow-ink)]">
                {entry.name}
              </p>
              <p className="m-0 text-[var(--wow-ink-soft)]">
                {entry.activityType} | {entry.maxPlayers} man | lvl{' '}
                {entry.levelBand}
                {entry.tierHint ? ` | ${entry.tierHint}` : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {raidRequests.length === 0 ? (
          <div className="wow-panel rounded-lg p-5 text-sm text-[var(--wow-ink-soft)]">
            No raid requests have been created yet.
          </div>
        ) : (
          raidRequests.map((request) => {
            const fulfillments = request.items.map((item) =>
              calculateRaidRequestFulfillment(
                item,
                consumeState.getIngredientSupplies(item.id),
                consumeState.getReadySupplies(item.id),
              ),
            )

            const averageCompletion =
              fulfillments.length === 0
                ? 0
                : fulfillments.reduce(
                    (sum, entry) => sum + entry.overallCompletionPct,
                    0,
                  ) / fulfillments.length

            const completeItems = fulfillments.filter(
              (entry) => entry.isComplete,
            )

            return (
              <article key={request.id} className="wow-panel rounded-lg p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-2xl font-bold text-[var(--wow-ink)]">
                      {request.title}
                    </h2>
                    <p className="m-0 mt-1 text-sm text-[var(--wow-ink-soft)]">
                      Raid Date:{' '}
                      {new Date(request.raidDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right text-sm text-[var(--wow-ink-soft)]">
                    <p className="m-0">
                      Items: <strong>{request.items.length}</strong>
                    </p>
                    <p className="m-0">
                      Complete: <strong>{completeItems.length}</strong>
                    </p>
                    <p className="m-0">
                      Avg Progress:{' '}
                      <strong>{Math.round(averageCompletion * 100)}%</strong>
                    </p>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}
