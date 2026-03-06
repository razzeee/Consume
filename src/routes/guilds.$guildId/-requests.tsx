import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useConsumeState } from '#/components/ConsumeStateProvider'
import GuildFlowRail from '#/components/guild/GuildFlowRail'
import RaidRequestCard from '#/components/raids/RaidRequestCard'
import WowIcon from '#/components/WowIcon'
import { canMemberSupply, roleLabel } from '#/domain/permissions'
import { isWorldBossTitle } from '#/domain/raidCatalog'
import { getRoleIconCandidates } from '#/domain/wowIcons'
import type { RaidRequestItem } from '#/domain/types'

export default function GuildRequestsPage({ guildId }: { guildId: string }) {
  const consumeState = useConsumeState()
  const activeGuild = consumeState.getGuildById(guildId)

  const members = useMemo(() => {
    if (!activeGuild) {
      return []
    }

    return consumeState.guildMembers.filter(
      (member) => member.guildId === activeGuild.id,
    )
  }, [activeGuild, consumeState.guildMembers])

  const firstMember = members.at(0)
  const [activeMemberId, setActiveMemberId] = useState(firstMember?.id ?? '')

  const activeMember = members.find((member) => member.id === activeMemberId)
  const activeRole = activeMember?.role
  const canWrite = consumeState.backend.canWrite
  const maySupply = canWrite && canMemberSupply(activeRole)

  const raidRequests = useMemo(() => {
    if (!activeGuild) {
      return []
    }

    return [...consumeState.getRaidRequests(activeGuild.id)]
      .filter((request) => !isWorldBossTitle(request.title))
      .sort((a, b) => a.raidDate.localeCompare(b.raidDate))
  }, [activeGuild, consumeState])

  function supplyIngredient(
    item: RaidRequestItem,
    ingredientId: string,
    qty: number,
    contributorName: string,
  ) {
    if (!activeGuild || !maySupply) {
      return
    }

    if (qty <= 0 || !ingredientId) {
      return
    }

    consumeState.addIngredientSupply(
      activeGuild.id,
      item.id,
      ingredientId,
      qty,
      contributorName.trim() || activeMember?.characterName || 'Guildmate',
    )
  }

  function supplyReady(
    item: RaidRequestItem,
    qty: number,
    contributorName: string,
  ) {
    if (!activeGuild || !maySupply) {
      return
    }

    if (qty <= 0) {
      return
    }

    consumeState.addReadySupply(
      activeGuild.id,
      item.id,
      item.consumable.id,
      qty,
      contributorName.trim() || activeMember?.characterName || 'Guildmate',
    )
  }

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
        <p className="island-kicker mb-2">Request Board</p>
        <h1 className="display-title m-0 text-4xl font-bold text-[var(--wow-ink)] sm:text-5xl">
          {activeGuild.name} Requests
        </h1>
        <p className="mt-3 text-[var(--wow-ink-soft)]">
          Submit ingredients or ready consumables while keeping full BOM
          visibility.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="campaign-ribbon">Ingredient ledger</span>
          <span className="campaign-ribbon">Ready-item credit</span>
          <span className="campaign-ribbon">Recent activity log</span>
        </div>

        <div className="mt-5">
          <GuildFlowRail guildId={activeGuild.id} />
        </div>

        <div className="mt-4 rounded-lg border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] p-4">
          <p className="island-kicker mb-2">Acting As</p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--wow-ink-soft)]">
                Character
              </label>
              <select
                value={activeMemberId}
                onChange={(event) => setActiveMemberId(event.target.value)}
                className="wow-input rounded-lg px-3 py-2 text-sm"
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.characterName} ({roleLabel(member.role)})
                  </option>
                ))}
              </select>
            </div>
            <p className="m-0 inline-flex items-center gap-2 text-sm text-[var(--wow-ink-soft)]">
              <WowIcon
                alt={`${roleLabel(activeRole)} icon`}
                candidates={getRoleIconCandidates(activeRole)}
                className="h-4 w-4 rounded border border-[var(--wow-line)] object-cover"
              />
              Current role:{' '}
              <span className="font-semibold text-[var(--wow-ink)]">
                {roleLabel(activeRole)}
              </span>
            </p>
          </div>
        </div>

        {!maySupply ? (
          <p className="mb-0 mt-4 text-sm text-[var(--wow-ink-soft)]">
            Sign in and select a guild member role to contribute supplies.
          </p>
        ) : null}
      </section>

      <section className="mt-8 space-y-8">
        {raidRequests.length === 0 ? (
          <article className="wow-panel empty-state">
            <p className="island-kicker mb-2">No Requests Available</p>
            <p className="m-0 text-sm text-[var(--wow-ink-soft)]">
              Officers can create raid requests in the Leadership step, then
              members can post supplies here.
            </p>
          </article>
        ) : null}

        {raidRequests.map((request) => (
          <div key={request.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 text-2xl font-bold text-[var(--wow-ink)]">
                {request.title}
              </h2>
              <p className="m-0 text-sm text-[var(--wow-ink-soft)]">
                Raid date: {new Date(request.raidDate).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-4">
              {request.items.map((item) => (
                <RaidRequestCard
                  key={item.id}
                  item={item}
                  ingredientSupplies={consumeState.getIngredientSupplies(
                    item.id,
                  )}
                  readySupplies={consumeState.getReadySupplies(item.id)}
                  canSupply={maySupply}
                  contributorNameDefault={
                    activeMember?.characterName ?? 'Guildmate'
                  }
                  onSupplyIngredient={supplyIngredient}
                  onSupplyReady={supplyReady}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
