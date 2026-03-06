import {
  Link,
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { useConsumeState } from '#/components/ConsumeStateProvider'
import GuildFlowRail from '#/components/guild/GuildFlowRail'
import { isWorldBossTitle } from '#/domain/raidCatalog'

export const Route = createFileRoute('/guilds/$guildId')({
  component: GuildOverviewPage,
})

function GuildOverviewPage() {
  const consumeState = useConsumeState()
  const { guildId } = Route.useParams()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const guildBasePath = `/guilds/${guildId}`
  const isGuildOverviewIndex = pathname === guildBasePath

  if (!isGuildOverviewIndex) {
    return <Outlet />
  }

  const activeGuild = consumeState.getGuildById(guildId)

  const members = useMemo(() => {
    if (!activeGuild) {
      return []
    }

    return consumeState.guildMembers.filter(
      (member) => member.guildId === activeGuild.id,
    )
  }, [consumeState.guildMembers, activeGuild])

  const invites = activeGuild
    ? consumeState.getGuildInvites(activeGuild.id)
    : []
  const raidRequests = useMemo(() => {
    if (!activeGuild) {
      return []
    }

    return [...consumeState.getRaidRequests(activeGuild.id)]
      .filter((request) => !isWorldBossTitle(request.title))
      .sort((a, b) => a.raidDate.localeCompare(b.raidDate))
  }, [activeGuild, consumeState])

  const nextRaid = raidRequests.at(0)
  const pendingInvites = invites.filter((invite) => !invite.acceptedBy)

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
            The selected guild could not be found.
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
        <p className="island-kicker mb-2">Guild Overview</p>
        <h1 className="display-title m-0 text-4xl font-bold text-[var(--wow-ink)] sm:text-5xl">
          {activeGuild.name}
        </h1>
        <p className="mt-4 text-[var(--wow-ink-soft)]">
          {activeGuild.realm} | {activeGuild.faction}
        </p>
        <p className="m-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
          Browse raid demand as a member. Invite and request administration are
          now isolated in the management page.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="campaign-ribbon">Roster signal</span>
          <span className="campaign-ribbon">Request visibility</span>
          <span className="campaign-ribbon">Raid readiness</span>
        </div>

        <div className="mt-5">
          <GuildFlowRail guildId={activeGuild.id} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="wow-panel rounded-lg p-5">
          <p className="island-kicker mb-2">Members</p>
          <p className="m-0 text-3xl font-bold text-[var(--wow-ink)]">
            {members.length}
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--wow-ink-soft)]">
            Guild roster size
          </p>
        </article>
        <article className="wow-panel rounded-lg p-5">
          <p className="island-kicker mb-2">Raid Requests</p>
          <p className="m-0 text-3xl font-bold text-[var(--wow-ink)]">
            {raidRequests.length}
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--wow-ink-soft)]">
            Active request groups
          </p>
        </article>
        <article className="wow-panel rounded-lg p-5">
          <p className="island-kicker mb-2">Pending Invites</p>
          <p className="m-0 text-3xl font-bold text-[var(--wow-ink)]">
            {pendingInvites.length}
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--wow-ink-soft)]">
            Awaiting acceptance
          </p>
        </article>
        <article className="wow-panel rounded-lg p-5">
          <p className="island-kicker mb-2">Next Raid</p>
          <p className="m-0 text-lg font-semibold text-[var(--wow-ink)]">
            {nextRaid ? nextRaid.title : 'No raids planned'}
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--wow-ink-soft)]">
            {nextRaid
              ? new Date(nextRaid.raidDate).toLocaleDateString()
              : 'Create one in management'}
          </p>
        </article>
      </section>
    </main>
  )
}
