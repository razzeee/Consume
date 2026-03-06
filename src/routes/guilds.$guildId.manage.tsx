import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useConsumeState } from '#/components/ConsumeStateProvider'
import ConsumableSelect from '#/components/consumables/ConsumableSelect'
import GuildFlowRail from '#/components/guild/GuildFlowRail'
import GuildInvitePanel from '#/components/guild/GuildInvitePanel'
import RaidRequestCard from '#/components/raids/RaidRequestCard'
import WowIcon from '#/components/WowIcon'
import {
  canMemberSupply,
  canCreateRaidRequests,
  canManageInvites,
  roleLabel,
} from '#/domain/permissions'
import {
  combinedRaidTitleSuggestions,
  isWorldBossTitle,
} from '#/domain/raidCatalog'
import { buildRaidRequestFromDraft } from '#/domain/requestCreation'
import type { RaidRequestItem } from '#/domain/types'
import { getRoleIconCandidates } from '#/domain/wowIcons'

export const Route = createFileRoute('/guilds/$guildId/manage')({
  component: GuildManagementPage,
})

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function createInviteCode(guildName: string) {
  const normalized = guildName
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 6)
    .toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${normalized || 'GUILD'}-${random}`
}

function createDraftRequestItem(defaultConsumableId: string) {
  return {
    id: createLocalId('draft-item'),
    consumableId: defaultConsumableId,
    qty: '20',
    note: '',
  }
}

function GuildManagementPage() {
  const consumeState = useConsumeState()
  const { guildId } = Route.useParams()
  const activeGuild = consumeState.getGuildById(guildId)

  const defaultConsumableId = consumeState.consumableCatalog[0]?.id ?? ''

  const members = useMemo(() => {
    if (!activeGuild) {
      return []
    }

    return consumeState.guildMembers.filter(
      (member) => member.guildId === activeGuild.id,
    )
  }, [consumeState.guildMembers, activeGuild])

  const firstMember = members.at(0)
  const invites = activeGuild
    ? consumeState.getGuildInvites(activeGuild.id)
    : []
  const raidRequests = activeGuild
    ? consumeState
        .getRaidRequests(activeGuild.id)
        .filter((request) => !isWorldBossTitle(request.title))
        .sort((a, b) => a.raidDate.localeCompare(b.raidDate))
    : []

  const [inviteCreatorName, setInviteCreatorName] = useState(
    firstMember?.characterName ?? 'Guild Lead',
  )
  const [activeMemberId, setActiveMemberId] = useState(firstMember?.id ?? '')
  const [acceptCode, setAcceptCode] = useState('')
  const [acceptCharacterName, setAcceptCharacterName] = useState('')

  const [newRequestTitle, setNewRequestTitle] = useState(
    combinedRaidTitleSuggestions[0] ?? '',
  )
  const [newRequestDate, setNewRequestDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [newRequestItems, setNewRequestItems] = useState(() => [
    createDraftRequestItem(defaultConsumableId),
  ])
  const [newRequestErrors, setNewRequestErrors] = useState<string[]>([])

  useEffect(() => {
    if (!activeGuild) {
      return
    }

    setInviteCreatorName(firstMember?.characterName ?? 'Guild Lead')
    setActiveMemberId(firstMember?.id ?? '')
    setAcceptCode('')
    setAcceptCharacterName('')
    setNewRequestTitle(combinedRaidTitleSuggestions[0] ?? '')
    setNewRequestItems([createDraftRequestItem(defaultConsumableId)])
    setNewRequestErrors([])
  }, [
    activeGuild,
    firstMember?.characterName,
    firstMember?.id,
    defaultConsumableId,
  ])

  function addDraftRequestItem() {
    setNewRequestItems((current) => [
      ...current,
      createDraftRequestItem(defaultConsumableId),
    ])
  }

  function updateDraftRequestItem(
    draftId: string,
    field: 'consumableId' | 'qty' | 'note',
    value: string,
  ) {
    setNewRequestItems((current) =>
      current.map((item) =>
        item.id === draftId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }

  function removeDraftRequestItem(draftId: string) {
    setNewRequestItems((current) => {
      if (current.length <= 1) {
        return current
      }
      return current.filter((item) => item.id !== draftId)
    })
  }

  const activeMember = members.find((member) => member.id === activeMemberId)
  const activeRole = activeMember?.role
  const canWrite = consumeState.backend.canWrite
  const hasInviteRole = canManageInvites(activeRole)
  const hasCreateRole = canCreateRaidRequests(activeRole)
  const hasSupplyRole = canMemberSupply(activeRole)
  const mayManageInvites = canWrite && hasInviteRole
  const mayCreateRequests = canWrite && hasCreateRole
  const maySupply = canWrite && hasSupplyRole

  function createInvite() {
    if (!activeGuild || !mayManageInvites) {
      return
    }

    const createdBy = inviteCreatorName.trim() || 'Guild Lead'

    consumeState.createInvite(
      activeGuild.id,
      createdBy,
      createInviteCode(activeGuild.name),
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    )
  }

  function acceptInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeGuild || !canWrite) {
      return
    }

    const code = acceptCode.trim().toUpperCase()
    const characterName = acceptCharacterName.trim()

    if (!code || !characterName) {
      return
    }

    consumeState.acceptInvite(activeGuild.id, code, characterName)
    setAcceptCode('')
    setAcceptCharacterName('')
  }

  function createRaidRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeGuild || !mayCreateRequests) {
      return
    }

    const result = buildRaidRequestFromDraft({
      guildId: activeGuild.id,
      title: newRequestTitle,
      raidDate: newRequestDate,
      draftItems: newRequestItems.map((item) => ({
        consumableId: item.consumableId,
        qty: Number(item.qty),
        note: item.note,
      })),
      consumableCatalog: consumeState.consumableCatalog,
      idFactory: createLocalId,
    })

    if (!result.raidRequest) {
      setNewRequestErrors(result.errors)
      return
    }

    setNewRequestErrors([])
    consumeState.createRaidRequest(activeGuild.id, result.raidRequest)
    setNewRequestTitle(combinedRaidTitleSuggestions[0] ?? '')
    setNewRequestItems([createDraftRequestItem(defaultConsumableId)])
  }

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
        <p className="island-kicker mb-2">Guild Management</p>
        <h1 className="display-title m-0 text-4xl font-bold text-[var(--wow-ink)] sm:text-5xl">
          {activeGuild.name}
        </h1>
        <p className="mt-4 text-[var(--wow-ink-soft)]">
          {activeGuild.realm} | {activeGuild.faction} | Members:{' '}
          {members.length}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="campaign-ribbon">Invite operations</span>
          <span className="campaign-ribbon">Request drafting</span>
          <span className="campaign-ribbon">Contribution audit</span>
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
                onChange={(event) => {
                  const memberId = event.target.value
                  setActiveMemberId(memberId)
                  const member = members.find(
                    (candidate) => candidate.id === memberId,
                  )
                  setInviteCreatorName(member?.characterName ?? 'Guild Lead')
                }}
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

        <GuildInvitePanel
          invites={invites}
          inviteCreatorName={inviteCreatorName}
          onInviteCreatorNameChange={setInviteCreatorName}
          onCreateInvite={createInvite}
          acceptCode={acceptCode}
          onAcceptCodeChange={setAcceptCode}
          acceptCharacterName={acceptCharacterName}
          onAcceptCharacterNameChange={setAcceptCharacterName}
          onAcceptInvite={acceptInvite}
          canWrite={canWrite}
          hasInviteRole={hasInviteRole}
          mayManageInvites={mayManageInvites}
        />

        <form
          className="mt-5 rounded-lg border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] p-4"
          onSubmit={createRaidRequest}
        >
          <p className="island-kicker mb-2">Create Raid Consumable Request</p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <select
              value={newRequestTitle}
              onChange={(event) => setNewRequestTitle(event.target.value)}
              className="wow-input rounded-lg px-3 py-2 text-sm"
              disabled={
                !mayCreateRequests || combinedRaidTitleSuggestions.length === 0
              }
            >
              {combinedRaidTitleSuggestions.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
            <input
              value={newRequestDate}
              onChange={(event) => setNewRequestDate(event.target.value)}
              type="date"
              className="wow-input rounded-lg px-3 py-2 text-sm"
              disabled={!mayCreateRequests}
            />
            <button
              type="submit"
              className="wow-link-button rounded-lg px-4 py-2 text-sm font-semibold"
              disabled={!mayCreateRequests}
            >
              Create Request
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {newRequestItems.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-lg border border-[var(--wow-line)] p-3 md:grid-cols-[2fr_1fr_2fr_auto]"
              >
                <ConsumableSelect
                  value={item.consumableId}
                  consumables={consumeState.consumableCatalog}
                  onChange={(consumableId) =>
                    updateDraftRequestItem(
                      item.id,
                      'consumableId',
                      consumableId,
                    )
                  }
                  disabled={!mayCreateRequests}
                />
                <input
                  value={item.qty}
                  onChange={(event) =>
                    updateDraftRequestItem(item.id, 'qty', event.target.value)
                  }
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Qty"
                  className="wow-input rounded-lg px-3 py-2 text-sm"
                  disabled={!mayCreateRequests}
                />
                <input
                  value={item.note}
                  onChange={(event) =>
                    updateDraftRequestItem(item.id, 'note', event.target.value)
                  }
                  placeholder={`Line ${index + 1} note (optional)`}
                  className="wow-input rounded-lg px-3 py-2 text-sm"
                  disabled={!mayCreateRequests}
                />
                <button
                  type="button"
                  onClick={() => removeDraftRequestItem(item.id)}
                  className="wow-button rounded-lg px-3 py-2 text-sm font-semibold"
                  disabled={!mayCreateRequests || newRequestItems.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addDraftRequestItem}
              className="wow-button-ready rounded-lg px-4 py-2 text-sm font-semibold"
              disabled={!mayCreateRequests}
            >
              Add Consumable Line
            </button>
          </div>

          {newRequestErrors.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--wow-ink-soft)]">
              {newRequestErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}

          {!canWrite ? (
            <p className="mb-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
              Sign in to create raid requests.
            </p>
          ) : !hasCreateRole ? (
            <p className="mb-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
              Raid request creation requires officer or lead role.
            </p>
          ) : null}
        </form>
      </section>

      <section className="mt-6 wow-panel rounded-lg p-5">
        <p className="island-kicker mb-2">Upcoming Requests</p>
        {raidRequests.length === 0 ? (
          <p className="m-0 text-sm text-[var(--wow-ink-soft)]">
            No raid requests yet. Use the form above to create one.
          </p>
        ) : (
          <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-[var(--wow-ink-soft)]">
            {raidRequests.map((request) => (
              <li key={request.id}>
                {request.title} (
                {new Date(request.raidDate).toLocaleDateString()})
              </li>
            ))}
          </ul>
        )}
      </section>

      {!canWrite ? (
        <p className="mt-6 text-sm text-[var(--wow-ink-soft)]">
          Supply contributions are disabled while signed out.
        </p>
      ) : null}

      <section className="mt-8 space-y-8">
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
